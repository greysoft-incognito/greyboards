import { abortIf } from '@arkstack/common'
import { DB } from 'arkormx'
import { AccountRole, type AccountRoleKind } from '@app/models/AccountRole'
import type { Booking } from '@app/models/Booking'
import { OwnerProfile } from '@app/models/OwnerProfile'
import { PostingProof } from '@app/models/PostingProof'
import { PrintJob } from '@app/models/PrintJob'
import type { ReputationAction } from '@app/models/ReputationEvent'
import { User } from '@app/models/User'
import { AccountMail } from '@app/notifications/AccountMail'
import { Settings } from '@app/support/Settings'

/** Roles checked per sweep batch. */
const BATCH = 100

/** Batches one sweep runs at most, so a run stays short. */
const MAX_BATCHES = 20

/** What earns or costs points, and for which roles. */
export interface ReputationRule {
  action: Exclude<ReputationAction, 'adjusted'>
  roles: AccountRoleKind[]
  label: string
  setting: string
  /** 1 adds the setting's points, -1 takes them away. */
  sign: 1 | -1
}

/** How a role looks to other people: its score and the badges it holds now. */
export interface RoleStanding {
  kind: AccountRoleKind
  score: number
  verified: boolean
  proven: boolean
}

/** How far a role is from the proven badge. */
export interface ProvenProgress {
  score: { have: number; need: number }
  actions: { have: number; need: number }
  days: { have: number; need: number }
}

/** A badge and what it means, so anyone who sees it can read why it is there. */
export interface BadgeDisclosure {
  key: 'verified' | 'proven'
  label: string
  summary: string
  description: string
}

/**
 * Reputation measures how far someone can be trusted in a role they hold. Points only come
 * from physical work Greyboards could check, and each role keeps its own score. The one
 * authority for scores and the proven badge; staff verification lives on AccountRole.
 */
export class Reputation {
  static readonly RULES: ReputationRule[] = [
    {
      action: 'posted',
      roles: ['dispatch', 'scout', 'owner'],
      label: 'Put up an ad, and the advertiser accepted the geotagged photos taken at the board',
      setting: 'reputation.points_posted',
      sign: 1,
    },
    { action: 'signed', roles: ['scout'], label: 'A board owner signed the agreement the scout sent, with a code texted to the owner', setting: 'reputation.points_signed', sign: 1 },
    { action: 'hosted', roles: ['owner', 'scout'], label: 'A campaign on a board they own or run went up and was checked', setting: 'reputation.points_hosted', sign: 1 },
    { action: 'campaign', roles: ['advertiser'], label: 'A paid campaign went up and was checked', setting: 'reputation.points_campaign', sign: 1 },
    { action: 'missed', roles: ['dispatch'], label: 'Lost a print job by missing its print or go-live date', setting: 'reputation.points_missed', sign: -1 },
  ]

  /** Credit everyone whose work a checked campaign proves: who put it up, the board's side, and the advertiser. */
  static async campaignChecked(booking: Booking): Promise<void> {
    const poster = await Reputation.posterOf(booking)
    const owner = booking.ownerProfileId ? await OwnerProfile.query().find(booking.ownerProfileId) : null

    if (poster) await Reputation.award(poster.userId, poster.kind, 'posted', booking.id)

    await Reputation.award(owner?.userId ?? null, 'owner', 'hosted', booking.id)
    await Reputation.award(booking.scoutId, 'scout', 'hosted', booking.id)
    await Reputation.award(booking.advertiserId, 'advertiser', 'campaign', booking.id)
  }

  /** Add or take the points `action` is worth from `userId`'s role of `kind`, once per subject. Returns whether anything changed. */
  static async award(userId: string | null, kind: AccountRoleKind, action: ReputationRule['action'], subjectId: string): Promise<boolean> {
    if (!userId || !(await Settings.get('reputation.enabled'))) return false

    const rule = Reputation.RULES.find((entry) => entry.action === action)!
    const role = await AccountRole.query().where({ userId, kind }).first()

    if (!role || !rule.roles.includes(kind)) return false

    const points = rule.sign * (await Settings.number(rule.setting))

    return Reputation.record(role, action, points, { subjectId, counts: rule.sign > 0 })
  }

  /** Staff correct a role's score, with a note saying why. */
  static async adjust(role: AccountRole, staff: User, points: number, note: string): Promise<void> {
    abortIf(staff.id === role.userId, 'You cannot change your own reputation.', 422)
    abortIf(!Number.isInteger(points) || points === 0, 'Give a whole number of points to add or take away.', 422)
    abortIf(!note.trim(), 'Say why the score is changing.', 422)

    await Reputation.record(role, 'adjusted', points, { note: note.trim(), createdById: staff.id, counts: false })
  }

  /** How `role` looks to others. Badges show only while the role is active. */
  static standingOf(role: AccountRole): RoleStanding {
    const active = role.isActive()

    return { kind: role.kind, score: Number(role.reputation ?? 0), verified: active && !!role.verifiedAt, proven: active && !!role.provenAt }
  }

  /** The standing of several people in one role, by user id, in one query. People without the role are left out. */
  static async standings(userIds: string[], kind: AccountRoleKind): Promise<Map<string, RoleStanding>> {
    const ids = [...new Set(userIds.filter(Boolean))]
    const roles = ids.length ? (await AccountRole.query().where({ kind }).whereIn('userId', ids).get()).all() : []

    return new Map(roles.map((role) => [role.userId, Reputation.standingOf(role)]))
  }

  static async standing(userId: string, kind: AccountRoleKind): Promise<RoleStanding | null> {
    return (await Reputation.standings([userId], kind)).get(userId) ?? null
  }

  static async progress(role: AccountRole): Promise<ProvenProgress> {
    const { score, actions, days } = await Reputation.milestones()

    return {
      score: { have: Number(role.reputation ?? 0), need: score },
      actions: { have: Number(role.reputationActions ?? 0), need: actions },
      days: { have: Math.floor((Date.now() - new Date(role.createdAt).getTime()) / 86_400_000), need: days },
    }
  }

  /** What each badge means and what earns points, with the numbers in use now. */
  static async disclosure(): Promise<{ badges: BadgeDisclosure[]; rules: { action: string; roles: AccountRoleKind[]; label: string; points: number }[] }> {
    const { score, actions, days } = await Reputation.milestones()
    const revokes = await Settings.get<boolean>('reputation.revoke_proven')
    const rules = await Promise.all(Reputation.RULES.map(async (rule) => ({ action: rule.action, roles: rule.roles, label: rule.label, points: rule.sign * (await Settings.number(rule.setting)) })))

    return {
      badges: [
        {
          key: 'verified',
          label: 'Verified by Greyboards',
          summary: 'Checked in person by Greyboards staff.',
          description:
            'Someone on the Greyboards team checked this person for this role by hand, for example by meeting them, visiting their boards or confirming their papers. Staff give and remove this badge. Points can’t earn it.',
        },
        {
          key: 'proven',
          label: 'Proven',
          summary: 'Earned through checked work on Greyboards.',
          description:
            `Given automatically when a role reaches ${score} reputation points from at least ${actions} checked actions, after ${days} ${days === 1 ? 'day' : 'days'} in the role. ` +
            'Points only come from physical work Greyboards could check, such as geotagged photos of an ad the advertiser accepted, or an agreement an owner signed with a texted code. ' +
            (revokes ? `The badge goes away if the score falls below ${score}.` : 'Once earned, it stays.') +
            ' Greyboards staff did not check this person by hand unless they also have the Verified badge.',
        },
      ],
      rules,
    }
  }

  /**
   * Give the proven badge to every active role that reached the milestones, and take it
   * from roles that fell below the score when that is on. For the schedule, in batches.
   */
  static async sweep(): Promise<{ proven: number; revoked: number }> {
    const { score, actions, days } = await Reputation.milestones()
    let proven = 0
    let revoked = 0

    if (await Settings.get('reputation.revoke_proven')) {
      const rows = await DB.raw<{ id: string }>('update account_roles set proven_at = null where proven_at is not null and reputation < ? returning id', [score])

      revoked = rows.all().length
    }

    if (!(await Settings.get('reputation.enabled'))) return { proven, revoked }

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const due = await Reputation.reachedMilestones(score, actions, days).limit(BATCH).get()

      for (const role of due.all()) if (await Reputation.prove(role)) proven++

      if (due.all().length < BATCH) break
    }

    return { proven, revoked }
  }

  /** Record one change and move the role's running totals. Returns false when the subject already counted for this action. */
  private static async record(role: AccountRole, action: ReputationAction, points: number, extra: { subjectId?: string; note?: string; createdById?: string; counts: boolean }): Promise<boolean> {
    const inserted = await DB.raw<{ id: string }>(
      `insert into reputation_events (id, account_role_id, user_id, kind, action, points, subject_id, note, created_by_id, "createdAt", "updatedAt")
       values (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
       on conflict do nothing returning id`,
      [role.id, role.userId, role.kind, action, points, extra.subjectId ?? null, extra.note ?? null, extra.createdById ?? null],
    )

    if (!inserted.all().length) return false

    const counted = extra.counts ? 1 : 0
    const rows = await DB.raw<{ reputation: number }>('update account_roles set reputation = reputation + ?, reputation_actions = reputation_actions + ? where id = ? returning reputation', [points, counted, role.id])

    role.reputation = Number(rows.all()[0]?.reputation ?? Number(role.reputation ?? 0) + points)
    role.reputationActions = Number(role.reputationActions ?? 0) + counted

    await Reputation.check(role)

    return true
  }

  /** Give or take the proven badge after a score change. */
  private static async check(role: AccountRole): Promise<void> {
    const { score, actions, days } = await Reputation.milestones()

    if (role.provenAt && role.reputation < score && (await Settings.get('reputation.revoke_proven'))) {
      await AccountRole.query().where({ id: role.id }).updateFrom({ provenAt: null })
      role.provenAt = null

      return
    }

    const fresh = await Reputation.reachedMilestones(score, actions, days).where({ id: role.id }).first()

    if (fresh && (await Reputation.prove(fresh))) role.provenAt = fresh.provenAt
  }

  /** Active roles without the badge that meet every milestone. */
  private static reachedMilestones(score: number, actions: number, days: number) {
    return AccountRole.query()
      .where({ status: AccountRole.ACTIVE })
      .whereNull('provenAt')
      .whereRaw('reputation >= ? and reputation_actions >= ?', [score, actions])
      .whereRaw('"createdAt" <= now() - make_interval(days => ?)', [days])
      .oldest('createdAt')
  }

  /** Mark `role` proven, once, and tell the account. */
  private static async prove(role: AccountRole): Promise<boolean> {
    const at = new Date()
    const claimed = await AccountRole.query().where({ id: role.id }).whereNull('provenAt').updateFrom({ provenAt: at })

    if (!claimed) return false

    role.provenAt = at

    const user = await User.query().find(role.userId)

    if (user) await AccountMail.badgeEarned(user, role)?.catch(() => undefined)

    return true
  }

  private static async milestones(): Promise<{ score: number; actions: number; days: number }> {
    return {
      score: await Settings.number('reputation.proven_score'),
      actions: await Settings.number('reputation.proven_actions'),
      days: await Settings.number('reputation.proven_days'),
    }
  }

  /** Who took the accepted proof photos, in the role they did it in: the dispatcher on the job, the board's scout, or its owner. */
  private static async posterOf(booking: Booking): Promise<{ userId: string; kind: AccountRoleKind } | null> {
    const proof = await PostingProof.query().where({ bookingId: booking.id }).whereNotNull('uploadedById').oldest('createdAt').first()
    const userId = proof?.uploadedById

    if (!userId) return null

    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    if (job?.dispatcherId === userId) return { userId, kind: 'dispatch' }
    if (booking.scoutId === userId) return { userId, kind: 'scout' }

    return { userId, kind: 'owner' }
  }
}
