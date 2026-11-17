import { Notification } from '@arkstack/notifications'
import type { AccountRole } from '@app/models/AccountRole'
import type { User } from '@app/models/User'

/** The emails Greyboards sends about a user's account. */
export class AccountMail {
  static verifyEmail(user: User, link: string) {
    return AccountMail.send(
      user,
      'Confirm your email address',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>Confirm this is your email address for Greyboards.</p>
      ${AccountMail.button('Confirm email', link)}
      <p>The link works for 24 hours. If you didn't create an account, you can ignore this email.</p>`,
    )
  }

  static resetPassword(user: User, link: string, minutes: number) {
    return AccountMail.send(
      user,
      'Reset your password',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>Someone asked to reset the password for your Greyboards account.</p>
      ${AccountMail.button('Choose a new password', link)}
      <p>The link works for ${minutes} minutes. If it wasn't you, ignore this email and your password stays the same.</p>`,
    )
  }

  static passwordChanged(user: User) {
    return AccountMail.send(
      user,
      'Your password was changed',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The password for your Greyboards account was just changed and your other devices were signed out.</p>
      <p>If this wasn't you, reset your password straight away.</p>
      ${AccountMail.button('Reset password', `${config('app.frontend_url')}/forgot-password`)}`,
    )
  }

  static emailChanged(user: User, previous: string) {
    return AccountMail.send(
      previous,
      'Your email address was changed',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The email for your Greyboards account was changed from this address to ${AccountMail.escape(user.email)}.</p>
      <p>If this wasn't you, reply to this email so we can help you recover the account.</p>`,
    )
  }


  /** Tell an account what a reviewer decided about one of its marketplace roles. */
  static roleReviewed(user: User, accountRole: AccountRole) {
    const role = accountRole.named()
    const label = accountRole.label()
    const note = accountRole.note
    const outcomes = {
      active: { subject: `You're approved as ${role}`, text: `You can now work as ${role} on Greyboards.` },
      rejected: { subject: `Your ${label} application wasn't approved`, text: `We couldn't approve you as ${role} this time. You can apply again from settings.` },
      suspended: { subject: `Your ${label} role is suspended`, text: `You can't work as ${role} on Greyboards for now. Contact support if you think this is a mistake.` },
    }
    const outcome = outcomes[accountRole.status as keyof typeof outcomes]

    if (!outcome) return

    return AccountMail.send(
      user,
      outcome.subject,
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>${outcome.text}</p>
      ${note ? `<p>Our reviewer's note: ${AccountMail.escape(note)}</p>` : ''}
      ${AccountMail.button('Open Greyboards', `${config('app.frontend_url')}/settings/roles`)}`,
    )
  }

  /** Tell a billposter they lost a job by missing its date. */
  static printJobMissed(user: User, boardName: string, reason: string) {
    return AccountMail.send(
      user,
      'You lost a print job',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The job for "${AccountMail.escape(boardName)}" went back to other billposters because ${AccountMail.escape(reason)}.</p>
      <p>Missing several dates suspends your billposter role, so only take jobs you can deliver on time.</p>
      ${AccountMail.button('Find other jobs', `${config('app.frontend_url')}/jobs`)}`,
    )
  }

  /** Tell whoever looks after a board that its print job has no taker close to go-live. */
  static printJobUnclaimed(user: User, boardName: string, dueOn: string, link: string) {
    return AccountMail.send(
      user,
      'Nobody has taken a print job yet',
      `<p>Hi ${AccountMail.escape(user.name)},</p>
      <p>The ad booked on "${AccountMail.escape(boardName)}" goes live on ${dueOn}, and no billposter has taken the job to print and put it up.</p>
      <p>If you can arrange it yourself, open the booking to download the artwork, then add the proof photos once it's up.</p>
      ${AccountMail.button('Open the booking', link)}`,
    )
  }

  private static send(to: User | string, subject: string, message: string) {
    return Notification.mail()
      .prepare(to as never, { frontend_url: config('app.frontend_url') })
      .view('mails/default')
      .subject(subject)
      .send(message)
  }

  private static button(label: string, link: string) {
    return `<p><a href="${AccountMail.href(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#833b4b;color:#ffffff;font-weight:600;text-decoration:none">${label}</a></p>`
  }

  /** Percent-encodes the characters that would end the attribute, so the link needs no HTML entities. */
  private static href(link: string) {
    return link.replace(/["'<>]/g, (char) => encodeURIComponent(char))
  }

  private static escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
  }
}
