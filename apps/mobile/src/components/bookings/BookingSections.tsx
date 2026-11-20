import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Image } from 'expo-image'
import { BadgeCheck, Camera, Check, Copy, CreditCard, Image as ImageIcon, ImageUp, MonitorPlay, Printer, ShieldCheck, UsersRound, Wallet } from 'lucide-react-native'
import type { Booking, BookingShare, PlaySummary, PrintJobStatus, PrintOptions, ShareStatus } from '@greyboards/types'
import { Avatar } from '@/components/Avatar'
import { Standing } from '@/components/reputation/Badges'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Pill, type PillLook, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { payAndReport as pay } from '@/lib/checkout'
import { formatDay, formatDistance, formatMoment, formatMoney, formatWait } from '@/lib/format'
import { useLimits } from '@/lib/limits'
import { pickImage } from '@/lib/pick-image'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'
import { Summary } from './BookingBits'

/** Called after a change so the booking reloads. */
type OnChange = () => void

const isPaid = (booking: Booking) => ['paid', 'live', 'completed'].includes(booking.status)
const isLive = (booking: Booking) => booking.status === 'live' || booking.status === 'completed'

/** Seconds left on a hold, counting down. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    setLeft(seconds)

    const timer = setInterval(() => setLeft((current) => Math.max(0, current - 1)), 1000)

    return () => clearInterval(timer)
  }, [seconds])

  return left
}

/** Pay before the hold runs out, or let the dates go. */
export function PayOrCancel({ booking, onChange }: { booking: Booking; onChange: OnChange }) {
  const action = useAction()
  const left = useCountdown(booking.holdSecondsLeft ?? 0)

  return (
    <View style={styles.stack}>
      <Text variant="muted">{left > 0 ? `We're holding these dates for you for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}.` : 'Your hold expired. Book the dates again.'}</Text>
      <Button confirm={{ title: `Pay ${formatMoney(booking.amountMinor, booking.currency)}?`, action: "Pay" }} title={`Pay ${formatMoney(booking.amountMinor, booking.currency)}`} size="lg" loading={action.busy} disabled={left <= 0} onPress={() => action.run(() => pay(() => api.checkout(booking.id).send(), onChange))} />
      <Button confirm={{ title: "Cancel this booking?", message: "The dates go back to the board owner.", action: "Cancel booking", danger: true }} title="Cancel" variant="ghost" disabled={action.busy} onPress={() => action.run(async () => { const { message } = await api.cancelBooking(booking.id).send(); onChange(); return message ?? 'Booking cancelled. The dates are free again.' })} />
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </View>
  )
}

const SHARE_LOOKS: Record<ShareStatus, PillLook> = {
  open: { label: 'Open', background: colors.surface100, color: colors.ink500 },
  claimed: { label: 'Unpaid', background: colors.amber50, color: colors.held },
  paid: { label: 'Paid', background: colors.emerald50, color: colors.available },
  refunded: { label: 'Refunded', background: colors.surface100, color: colors.ink500 },
}

/** A shared booking's shares: who holds each, who paid, and invite links for the open ones. */
export function SharesSection({ booking, isOrganiser, onChange }: { booking: Booking; isOrganiser: boolean; onChange: OnChange }) {
  const action = useAction()
  const shares = booking.shares ?? []
  const mineDue = shares.filter((share) => share.mine && share.status === 'claimed')
  const due = mineDue.reduce((sum, share) => sum + share.amountMinor, 0)
  const unpaid = shares.filter((share) => !share.mine && (share.status === 'open' || share.status === 'claimed')).length
  const held = booking.status === 'held' && (booking.holdSecondsLeft ?? 0) > 0

  return (
    <View style={styles.stack}>
      <View style={styles.line}>
        <UsersRound size={16} color={colors.brand600} />
        <Text style={styles.strong}>Split {shares.length} ways</Text>
      </View>
      <View style={styles.list}>
        {shares.map((share) => (
          <ShareLine key={share.id} share={share} currency={booking.currency} />
        ))}
      </View>
      {held ? <Text variant="muted">The dates stay held for {formatWait(booking.holdSecondsLeft ?? 0)}. If a share is still unpaid then, the booking lapses and everyone who paid gets their money back.</Text> : null}
      {held && (booking.sharing?.auction || booking.sharing?.takeoverOpen) ? (
        <Callout tone="warning">
          {booking.sharing.auction
            ? `Someone is bidding on the whole board (${booking.sharing.auction.bidCount} ${booking.sharing.auction.bidCount === 1 ? 'bid' : 'bids'}). Pay all the shares before the winner pays to keep it. Otherwise, everyone gets a refund.`
            : 'Anyone can now bid on the whole board. Pay the remaining shares to keep it.'}
        </Callout>
      ) : null}
      {held && due > 0 ? <Button confirm={{ title: `Pay ${formatMoney(due, booking.currency)}?`, action: "Pay" }} title={`Pay ${mineDue.length > 1 ? 'my shares' : 'my share'}, ${formatMoney(due, booking.currency)}`} loading={action.busy} onPress={() => action.run(() => pay(() => api.checkout(booking.id).send(), onChange))} /> : null}
      {held && isOrganiser && unpaid > 0 ? (
        <Button confirm={{ title: unpaid === 1 ? "Cover the unpaid share?" : `Cover ${unpaid} unpaid shares?`, message: "You'll pay for them yourself.", action: "Cover them" }}
          title={`Cover the ${unpaid === 1 ? 'unpaid share' : `${unpaid} unpaid shares`}`}
          variant="secondary"
          disabled={action.busy}
          onPress={() => action.run(async () => { const { message } = await api.coverShares(booking.id).send(); onChange(); return message ?? 'You’re now covering the unpaid shares.' })}
        />
      ) : null}
      {held && isOrganiser ? <Button confirm={{ title: "Let this shared board go?", message: "The dates go back to the board owner.", action: "Let it go", danger: true }} title="Let it go" variant="ghost" disabled={action.busy} onPress={() => action.run(async () => { const { message } = await api.cancelBooking(booking.id).send(); onChange(); return message ?? 'Booking cancelled.' })} /> : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </View>
  )
}

function ShareLine({ share, currency }: { share: BookingShare; currency: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await Clipboard.setStringAsync(share.inviteUrl ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <View style={styles.listRow}>
      <View style={styles.flex}>
        <Text style={styles.strong}>
          {share.mine ? 'You' : (share.holder ?? `Share ${share.position}`)} · {formatMoney(share.amountMinor, currency)}
        </Text>
        <Pill {...SHARE_LOOKS[share.status]} />
      </View>
      {share.inviteUrl ? (
        <Pressable accessibilityRole="button" onPress={copy} style={styles.copy}>
          {copied ? <Check size={16} color={colors.brand700} /> : <Copy size={16} color={colors.brand700} />}
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy invite'}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Who gets what once the ad is up, for whoever looks after the board. */
export function Split({ booking }: { booking: Booking }) {
  const split = booking.split!
  const rows = [
    { label: `Owner (${split.ownerSharePercent}%)`, value: formatMoney(split.ownerAmountMinor, booking.currency) },
    ...(split.scoutAmountMinor ? [{ label: 'Scout', value: formatMoney(split.scoutAmountMinor, booking.currency) }] : []),
    ...(booking.printFeeMinor ? [{ label: booking.printedBy === 'owner' ? "Printing (owner)" : 'Printing (dispatcher)', value: formatMoney(booking.printFeeMinor, booking.currency) }] : []),
    { label: 'Greyboards', value: formatMoney(split.platformAmountMinor, booking.currency) },
  ]

  return (
    <View style={styles.stack}>
      <View style={styles.line}>
        <ShieldCheck size={16} color={colors.available} />
        <Text style={styles.strong}>{booking.releasedAt ? 'Released from escrow' : 'Paid once the ad is up'}</Text>
      </View>
      <Summary rows={rows} />
    </View>
  )
}

const ARTWORK_NOTES = {
  none: 'Upload your design. Match the board’s shape so nothing gets cut off.',
  submitted: 'We’re checking it fits the board.',
  approved: 'Approved! Local dispatchers will now send quotes to print and put it up.',
  rejected: 'Changes requested. Check the note and upload a new version.',
} as const

const SHARED_NOTES = {
  none: 'Each advertiser uploads their own design. Once everyone has, we combine them into one print.',
  submitted: 'All designs are in. We’re checking the print with the board’s owner.',
  approved: 'Approved! Local dispatchers will now send quotes to print and put it up.',
  rejected: 'Changes requested. Check the note and upload a new design.',
} as const

const JOB_LABELS: Record<PrintJobStatus, string> = {
  open: 'Waiting for a dispatcher',
  reserved: 'A dispatcher is confirming the date',
  confirmed: 'A dispatcher is on it',
  printed: 'Printed, going up soon',
  posted: 'Up on the board',
  cancelled: 'The board’s owner is handling it',
}

/** The artwork for a paid booking: the advertiser sends it, whoever looks after the board approves it or sends it back. */
export function ArtworkSection({ booking, isAdvertiser, onChange }: { booking: Booking; isAdvertiser: boolean; onChange: OnChange }) {
  const { maxImageMb } = useLimits()
  const action = useAction()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const artwork = booking.artwork!
  const job = booking.printJob
  const canUpload = isAdvertiser && !booking.shared && booking.status === 'paid' && artwork.status !== 'approved'
  const ownersPrint = booking.printedBy === 'owner' && booking.printFeeMinor > 0
  const intro = artwork.canReview
    ? 'Check the design fits the board before it’s printed.'
    : artwork.status === 'approved' && ownersPrint
      ? isAdvertiser
        ? 'Approved! The board’s owner will print it and put it up.'
        : 'Approved. Print it and put it up by the start date, then add the proof photos.'
      : (booking.shared ? SHARED_NOTES : ARTWORK_NOTES)[artwork.status]

  const upload = (shareId?: string) =>
    action.run(async () => {
      const asset = await pickImage({ source: 'library', maxMb: maxImageMb, why: 'send your artwork' })

      if (!asset) return

      if (shareId) {
        const { message } = await api.sendShareDesign(booking.id, shareId, uploadFile(asset)).send()

        onChange()

        return message ?? 'Design sent.'
      }

      await api.uploadArtwork(booking.id, uploadFile(asset)).send()
      onChange()

      return 'Design sent for review.'
    })

  const review = (decision: 'approve' | 'reject') =>
    action.run(async () => {
      await api.reviewArtwork(booking.id, { decision, note: decision === 'reject' ? note : undefined }).send()
      setRejecting(false)
      onChange()

      return decision === 'approve' ? 'Approved! Local dispatchers will send their quotes next.' : 'Changes requested.'
    })

  return (
    <Section title="Artwork">
      <View style={styles.line}>
        <ImageIcon size={18} color={colors.brand600} />
        <Text variant="muted" style={styles.flex}>
          {intro}
        </Text>
      </View>
      {artwork.url ? (
        <View style={styles.artwork}>
          <Image source={{ uri: artwork.url }} style={styles.artworkImage} contentFit="contain" transition={150} />
          {artwork.width && artwork.height ? <Text variant="small" style={styles.artworkSize}>{artwork.width} × {artwork.height} px</Text> : null}
        </View>
      ) : null}
      {artwork.status === 'rejected' && artwork.note ? <Callout tone="warning">Note: {artwork.note}</Callout> : null}

      {booking.shared && booking.shares ? (
        <View style={styles.designs}>
          {booking.shares
            .filter((share) => share.status === 'paid')
            .map((share) => (
              <View key={share.id} style={styles.design}>
                <View style={styles.designImage}>{share.designUrl ? <Image source={{ uri: share.designUrl }} style={StyleSheet.absoluteFill} contentFit="contain" /> : <ImageUp size={22} color={colors.surface300} />}</View>
                <Text variant="small">
                  {share.mine ? 'Yours' : (share.holder ?? `Share ${share.position}`)} · {share.designUrl ? 'sent' : 'waiting'}
                </Text>
                {share.mine && booking.status === 'paid' && artwork.status !== 'approved' ? <Button title={share.designUrl ? 'Change design' : 'Send design'} variant="secondary" loading={action.busy} onPress={() => upload(share.id)} /> : null}
              </View>
            ))}
        </View>
      ) : null}

      {canUpload ? <Button title={artwork.status === 'none' ? 'Upload artwork' : 'Upload a new version'} loading={action.busy} onPress={() => upload()} /> : null}

      {artwork.canReview && !rejecting ? (
        <View style={styles.row}>
          <Button confirm={{ title: "Approve this artwork for print?", message: "It goes to the printer as it is.", action: "Approve" }} title="Approve for print" loading={action.busy} onPress={() => review('approve')} style={styles.flex} />
          <Button title="Ask for changes" variant="ghost" disabled={action.busy} onPress={() => setRejecting(true)} />
        </View>
      ) : null}
      {rejecting ? (
        <View style={styles.stack}>
          <Field label="What should change?">
            <Input value={note} onChangeText={setNote} multiline maxLength={500} placeholder="The phone number is too small to read from the road." />
          </Field>
          <View style={styles.row}>
            <Button title="Send it back" variant="danger" loading={action.busy} disabled={!note.trim()} onPress={() => review('reject')} />
            <Button title="Cancel" variant="ghost" onPress={() => setRejecting(false)} />
          </View>
        </View>
      ) : null}

      {job ? (
        <View style={styles.job}>
          <Printer size={18} color={colors.ink500} />
          <View style={styles.flex}>
            <Text style={styles.strong}>{job.status === 'open' && !job.priced ? 'Taking prices from dispatchers' : JOB_LABELS[job.status]}</Text>
            <Text variant="small">Due up by {formatDay(job.dueOn)}</Text>
          </View>
          {job.printPhotoUrl ? <Image source={{ uri: job.printPhotoUrl }} style={styles.printPhoto} contentFit="cover" /> : null}
        </View>
      ) : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

/** For the advertiser: the prices dispatchers sent to print the job, and dispatchers nearby to ask at their rate. */
export function PrintOffersSection({ bookingId, options, currency, onChange }: { bookingId: string; options: PrintOptions; currency: string; onChange: OnChange }) {
  const action = useAction()
  const [busyId, setBusyId] = useState<string | null>(null)
  const waiting = options.offers.filter((offer) => offer.status === 'requested').length
  const until = (moment: string, requested: boolean) => `${requested ? 'Answer by' : 'Open until'} ${formatMoment(moment)}`

  const run = (id: string, task: () => Promise<string>) => {
    setBusyId(id)
    action.run(task).finally(() => setBusyId(null))
  }

  return (
    <Section title="Choose who prints it" description="Local dispatchers will send you quotes, or you can ask one directly. Pick a quote and pay, and they’ll print and put up your ad.">
      <Text style={styles.strong}>Prices</Text>
      {options.offers.length ? (
        <View style={styles.list}>
          {options.offers.map((offer) => (
            <View key={offer.id} style={styles.listRow}>
              {offer.dispatcher ? <Avatar user={offer.dispatcher} size={36} /> : null}
              <View style={styles.flex}>
                <Text style={styles.strong}>
                  {offer.dispatcher?.name ?? 'A dispatcher'} · {formatMoney(offer.amountMinor, currency)}
                </Text>
                <Standing standing={offer.dispatcher?.standing} compact />
                {offer.note ? <Text variant="muted">{offer.note}</Text> : null}
                <Text variant="small">
                  {offer.kind === 'request' ? (offer.status === 'requested' ? 'You asked them directly. ' : 'They accepted your request. ') : ''}
                  {until(offer.expiresAt, offer.status === 'requested')}
                </Text>
                {offer.status === 'pending' ? (
                  <Button confirm={{ title: `Pay ${formatMoney(offer.amountMinor, currency)} for printing?`, action: "Pay" }} title={`Pay ${formatMoney(offer.amountMinor, currency)}`} loading={busyId === offer.id} disabled={action.busy} onPress={() => run(offer.id, () => pay(() => api.payPrintOffer(bookingId, offer.id).send(), onChange))} />
                ) : (
                  <Pill label="Waiting for a reply" background={colors.amber50} color={colors.held} />
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="muted">No quotes yet. Local dispatchers can see your job, or you can ask one below.</Text>
      )}

      {options.dispatchers.length ? (
        <>
          <Text style={styles.strong}>Ask a dispatcher</Text>
          <View style={styles.list}>
            {options.dispatchers.map((dispatcher) => (
              <View key={dispatcher.id} style={styles.listRow}>
                <Avatar user={dispatcher} size={36} />
                <View style={styles.flex}>
                  <Text style={styles.strong}>
                    {dispatcher.name} · {formatMoney(dispatcher.quoteMinor, currency)}
                  </Text>
                  <Standing standing={dispatcher.standing} compact />
                  <Text variant="small">
                    Based {formatDistance(dispatcher.distanceM)} away{dispatcher.note ? `. ${dispatcher.note}` : ''}
                  </Text>
                </View>
                <Button confirm={{ title: `Ask ${dispatcher.name}?`, message: "They'll get a request to print and put up your ad.", action: "Ask" }}
                  title={dispatcher.asked ? 'Asked' : 'Ask'}
                  variant="secondary"
                  loading={busyId === dispatcher.id}
                  disabled={action.busy || dispatcher.asked || waiting >= options.maxRequests}
                  onPress={() => run(dispatcher.id, async () => { const response = await api.requestDispatcher(bookingId, dispatcher.id).send(); onChange(); return response.message ?? 'Request sent. You can pay once they accept.' })}
                />
              </View>
            ))}
          </View>
          <Text variant="small">You can ask {options.maxRequests} at a time. Pay once they accept.</Text>
        </>
      ) : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

/** How often a digital booking's ad played: the total, and a bar for each recent day. */
export function PlaysSection({ plays }: { plays: PlaySummary }) {
  const busiest = Math.max(1, ...plays.days.map((day) => day.plays))
  const minutes = Math.round(plays.seconds / 60)

  return (
    <Section title="Plays">
      {plays.total === 0 ? (
        <View style={styles.line}>
          <MonitorPlay size={18} color={colors.brand600} />
          <Text variant="muted" style={styles.flex}>
            No plays yet. They’ll show here as your ad runs.
          </Text>
        </View>
      ) : (
        <>
          <Text variant="muted">
            <Text style={styles.big}>{plays.total.toLocaleString('en-NG')}</Text> plays, {minutes > 0 ? `${minutes.toLocaleString('en-NG')} minutes` : `${plays.seconds} seconds`} on screen
            {plays.lastPlayedAt ? `. Last at ${formatMoment(plays.lastPlayedAt)}` : ''}.
          </Text>
          <View style={styles.bars} accessibilityLabel="Plays each day">
            {plays.days.map((day) => (
              <View key={day.day} style={styles.barSlot}>
                <View style={[styles.bar, { height: `${Math.max(4, (day.plays / busiest) * 100)}%` }]} />
              </View>
            ))}
          </View>
        </>
      )}
    </Section>
  )
}

/** The advertiser cancels a paid booking, seeing first what they get back. */
export function CancelPaid({ booking, onChange }: { booking: Booking; onChange: OnChange }) {
  const quote = booking.cancellation!
  const action = useAction()
  const [sure, setSure] = useState(false)

  return (
    <Section title="Change of plans?">
      <Text variant="muted">
        {booking.shared
          ? `Cancel now and ${formatMoney(quote.refundMinor, booking.currency)} is refunded, split among everyone who paid.`
          : quote.full
            ? `Cancel now for a full refund of ${formatMoney(quote.refundMinor, booking.currency)}.`
            : `Since it’s close to the start date, you’ll get ${formatMoney(quote.refundMinor, booking.currency)} of your ${formatMoney(booking.amountMinor, booking.currency)} back. The rest goes to the owner.`}
      </Text>
      {sure ? (
        <View style={styles.stack}>
          <Button title={`Cancel and refund ${formatMoney(quote.refundMinor, booking.currency)}`} variant="danger" loading={action.busy} onPress={() => action.run(async () => { const { message } = await api.cancelBooking(booking.id).send(); onChange(); return message ?? 'Booking cancelled.' })} />
          <Button title="Keep the booking" variant="ghost" onPress={() => setSure(false)} />
        </View>
      ) : (
        <Button title="Cancel booking" variant="secondary" onPress={() => setSure(true)} />
      )}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

const REFUND_STATUS = { processing: 'Refund on the way', refunded: 'Refunded', failed: 'Refund failed, our team is on it' } as const

export function Refunds({ booking }: { booking: Booking }) {
  return (
    <Section title="Refunds">
      <Summary rows={booking.refunds!.map((refund) => ({ label: `${REFUND_STATUS[refund.status]}. ${refund.reason}`, value: formatMoney(refund.amountMinor, refund.currency) }))} />
    </Section>
  )
}

/** What happens between payment and everyone being paid. Each step lights up once the booking gets there. */
export function Steps({ booking }: { booking: Booking }) {
  const steps = [
    { label: 'Paid', detail: 'We hold your payment safely.', icon: CreditCard, done: isPaid(booking) },
    { label: 'Artwork approved', detail: 'The owner checks your design fits.', icon: ImageIcon, done: booking.artwork?.status === 'approved' || isLive(booking) },
    {
      label: 'Printed and posted',
      detail: booking.printedBy === 'owner' ? 'The board’s owner prints it and puts it up.' : 'A dispatcher prints it and puts it up.',
      icon: Printer,
      done: booking.printJob?.status === 'posted' || (!!booking.proof && booking.proof.status !== 'none') || isLive(booking),
    },
    { label: 'Proof accepted', detail: 'You get photos of your ad on the board.', icon: Camera, done: booking.proof?.status === 'accepted' || isLive(booking) },
    { label: 'Everyone paid', detail: 'Only then is the owner paid.', icon: Wallet, done: !!booking.releasedAt },
  ]

  return (
    <Section>
      {steps.map((step) => (
        <View key={step.label} style={styles.step}>
          <View style={[styles.stepIcon, step.done && styles.stepDone]}>{step.done ? <BadgeCheck size={16} color={colors.white} /> : <step.icon size={16} color={colors.ink500} />}</View>
          <View style={styles.flex}>
            <Text style={[styles.strong, !step.done && styles.dim]}>{step.label}</Text>
            <Text variant="small">{step.detail}</Text>
          </View>
        </View>
      ))}
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  strong: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink900 },
  dim: { color: colors.ink700 },
  list: { borderRadius: 16, backgroundColor: colors.canvas },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.surface100 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.white },
  copyText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.brand700 },
  artwork: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface100 },
  artworkImage: { width: '100%', height: 220 },
  artworkSize: { paddingHorizontal: 14, paddingVertical: 8 },
  designs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  design: { width: '47%', gap: 6 },
  designImage: { aspectRatio: 3 / 2, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface100, alignItems: 'center', justifyContent: 'center' },
  job: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface100 },
  printPhoto: { width: 72, height: 52, borderRadius: radius.md },
  big: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink900 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: colors.brand500 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface100 },
  stepDone: { backgroundColor: colors.brand500, boxShadow: '0 6px 14px rgba(131,59,75,0.3)' },
})
