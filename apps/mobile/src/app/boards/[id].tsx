import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CarFront, ChevronLeft, Compass, ExternalLink, FileSignature, Layers, Lightbulb, MapPin, Ruler, User } from 'lucide-react-native'
import type { BoardAgreement, BoardDetail, PublishedReview } from '@greyboards/types'
import { BoardCover, BoardStatusBadge, boardPlace, formatHeading, formatRate, formatSize } from '@/components/boards/BoardBits'
import { BoardStewards } from '@/components/reputation/RoleReputation'
import { BoardReviews, RatingLine } from '@/components/reviews/ReviewBits'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem, PlainProblem } from '@/lib/forms'
import { formatMoney } from '@/lib/format'
import { megabytes, useLimits } from '@/lib/limits'
import { currentSpot } from '@/lib/location'
import { useUser } from '@/lib/session'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius, shadows, surfaces } from '@/theme'

const REVIEW_NOTES: Record<BoardDetail['status'], string> = {
  pending: 'A reviewer checks the photos and location before it goes on the map.',
  listed: 'On the map. Advertisers can find and book it.',
  rejected: 'A reviewer didn’t list it. Fix what the note says and it goes back for review.',
  unlisted: 'Off the map for now. Advertisers can’t book it.',
}

const AGREEMENT_NOTES: Record<BoardAgreement['status'], string> = {
  sent: 'Texted to the owner. Waiting for them to sign.',
  signed: 'Signed. Bookings pay the owner their share.',
  declined: 'The owner declined. Talk to them, then send it again.',
  cancelled: 'Cancelled. Send a new one when you’re ready.',
  expired: 'The link ran out before they signed. Send it again.',
}

const HERO_HEIGHT = 280

/** A board's photos and details. Advertisers see what they'd book; whoever looks after it also sees its review, photos to add and the owner's agreement. */
export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useUser()
  const insets = useSafeAreaInsets()
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [reviews, setReviews] = useState<PublishedReview[]>([])
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .board(id)
      .send()
      .then(({ data }) => {
        setBoard(data)

        if (data.rating.count) {
          api
            .boardReviews(id, { per_page: 5 })
            .send()
            .then((result) => setReviews(result.data))
            .catch(() => undefined)
        }
      })
      .catch((error) => setProblem(FormProblem.from(error).message))
  }, [id])

  useFocusEffect(load)

  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/find'))} hitSlop={8} style={[styles.back, { top: insets.top + 8 }]}>
      <ChevronLeft size={24} color={colors.ink900} />
    </Pressable>
  )

  if (!board) {
    return (
      <View style={[styles.screen, styles.center]}>
        {back}
        {problem ? <Callout>{problem}</Callout> : <ActivityIndicator color={colors.brand600} />}
      </View>
    )
  }

  const manages = board.owner?.userId === user.id || board.taggedById === user.id

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Gallery board={board} manages={manages} />
        <View style={styles.sections}>
          <Facts board={board} manages={manages} />
          {manages ? <Manage board={board} onChange={load} /> : null}
          <BoardReviews reviews={reviews} summary={board.rating} />
        </View>
      </ScrollView>
      {back}
    </View>
  )
}

/** The board's photos, side by side, or a drawn board while it has none. */
function Gallery({ board, manages }: { board: BoardDetail; manages: boolean }) {
  const { width } = useWindowDimensions()
  const [shown, setShown] = useState(0)

  if (!board.photos.length) return <BoardCover board={board} style={[styles.hero, { width }]} />

  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setShown(Math.round(event.nativeEvent.contentOffset.x / width))}>
        {board.photos.map((photo) => (
          <View key={photo.id} style={[styles.hero, { width }]}>
            <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            {manages && photo.distanceM !== null ? <Text style={styles.distance}>Taken {photo.distanceM} m from the board</Text> : null}
          </View>
        ))}
      </ScrollView>
      {board.photos.length > 1 ? (
        <View style={styles.dots}>
          {board.photos.map((photo, index) => (
            <View key={photo.id} style={[styles.dot, index === shown && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** The name, place, price and what an advertiser gets. */
function Facts({ board, manages }: { board: BoardDetail; manages: boolean }) {
  const rate = formatRate(board.rate)
  const facts = [
    { icon: Ruler, label: `${board.kindLabel}, ${formatSize(board)}` },
    { icon: Layers, label: board.faces === 1 ? 'One face' : `${board.faces} faces` },
    board.facing || board.headingDeg !== null ? { icon: Compass, label: [board.headingDeg !== null ? formatHeading(board.headingDeg) : null, board.facing].filter(Boolean).join(', ') } : null,
    { icon: Lightbulb, label: board.lit ? 'Lit at night' : 'Not lit' },
    board.traffic ? { icon: CarFront, label: `About ${board.traffic.daily.toLocaleString('en-NG')} people pass a day${board.traffic.source === 'measured' ? ', counted' : ', estimated from the road'}` } : null,
  ].filter((fact) => fact !== null)

  const openMap = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${board.latitude},${board.longitude}`).catch(() => undefined)

  return (
    <View style={styles.panel}>
      {manages ? <BoardStatusBadge status={board.status} /> : null}
      <Text style={styles.name}>{board.name}</Text>
      <Pressable accessibilityRole="link" onPress={openMap} style={styles.place}>
        <MapPin size={16} color={colors.ink500} />
        <Text variant="muted" style={styles.flex}>
          {boardPlace(board)}
        </Text>
        <ExternalLink size={14} color={colors.ink500} />
      </Pressable>
      {rate ? (
        <View>
          <Text style={styles.rate}>{rate}</Text>
          {board.loop ? (
            <Text variant="muted">
              Per slot, {board.loop.slots} slots of {board.loop.seconds}s in the loop
            </Text>
          ) : null}
          {board.costPerThousandMinor != null && board.rate ? <Text variant="muted">About {formatMoney(board.costPerThousandMinor, board.rate.currency)} for every 1,000 people passing</Text> : null}
        </View>
      ) : manages ? (
        <Text variant="muted">No rate yet. Add one to take bookings.</Text>
      ) : null}
      <RatingLine rating={board.rating} />
      <BoardStewards stewards={board.stewards} />
      <View style={styles.facts}>
        {facts.map((fact) => (
          <View key={fact.label} style={styles.fact}>
            <fact.icon size={16} color={colors.ink500} />
            <Text style={[styles.factText, styles.flex]}>{fact.label}</Text>
          </View>
        ))}
      </View>
      {board.description ? <Text style={styles.description}>{board.description}</Text> : null}
    </View>
  )
}

/** For whoever looks after the board: its review, more photos, and the owner's agreement. */
function Manage({ board, onChange }: { board: BoardDetail; onChange: () => void }) {
  const { maxImageMb } = useLimits()
  const photo = useAction()
  const agreement = useAction()
  const scouted = !!board.owner && board.owner.userId !== board.taggedById

  const addPhoto = () =>
    photo.run(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow the camera for Greyboards in your phone settings to photograph the board.')

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is larger than ${maxImageMb} MB.`)

      const where = await currentSpot().catch(() => null)

      await api.account.addBoardPhoto(board.id, uploadFile(asset), { ...(where ?? {}), takenAt: new Date().toISOString() }).send()
      onChange()

      return where ? 'Photo added.' : 'Photo added without a location.'
    })

  const sendAgreement = () =>
    agreement.run(async () => {
      const { data } = await api.account.sendAgreement(board.id).send()

      onChange()

      return `Sent to ${data.ownerName ?? 'the owner'} by SMS.`
    })

  return (
    <>
      <Section title="Review">
        <Text variant="muted">{REVIEW_NOTES[board.status]}</Text>
        {board.reviewNote ? <Callout>{board.reviewNote}</Callout> : null}
        <Button title={photo.busy ? 'Uploading…' : 'Add a photo'} variant="secondary" loading={photo.busy} disabled={board.photos.length >= 12} onPress={addPhoto} />
        {photo.problem.message ? <Callout>{photo.problem.message}</Callout> : null}
      </Section>

      {board.owner ? (
        <Section title="Owner">
          <View style={styles.fact}>
            <User size={16} color={colors.ink500} />
            <Text style={[styles.factText, styles.flex]}>
              {board.owner.name}
              {board.owner.phone ? ` · ${board.owner.phone}` : ''}
            </Text>
          </View>
          {scouted ? (
            <>
              <View style={styles.agreement}>
                <FileSignature size={18} color={colors.brand600} />
                <Text variant="muted" style={styles.flex}>
                  {board.agreement ? AGREEMENT_NOTES[board.agreement.status] : 'The owner signs an agreement by SMS before the board can be booked.'}
                </Text>
              </View>
              {board.agreement?.status !== 'signed' ? (
                <Button
                  title={agreement.busy ? 'Sending…' : board.agreement ? 'Text it again' : 'Text the owner the agreement'}
                  loading={agreement.busy}
                  disabled={!!board.agreement?.resendInSeconds}
                  onPress={sendAgreement}
                />
              ) : null}
              {board.agreement?.resendInSeconds ? <Text variant="small">You can text it again in {Math.ceil(board.agreement.resendInSeconds / 60)} min.</Text> : null}
              {agreement.problem.message ? <Callout>{agreement.problem.message}</Callout> : null}
            </>
          ) : null}
        </Section>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  flex: { flex: 1 },
  back: { position: 'absolute', left: 14, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)', boxShadow: shadows.card },
  hero: { height: HERO_HEIGHT, aspectRatio: undefined, borderRadius: 0, backgroundColor: colors.ink900 },
  distance: { position: 'absolute', bottom: 28, left: 14, fontSize: 12, fontFamily: fonts.semibold, color: colors.ink900, backgroundColor: 'rgba(255,255,255,0.88)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, overflow: 'hidden' },
  dots: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { width: 18, backgroundColor: colors.white },
  sections: { gap: 16, paddingHorizontal: 16, marginTop: -22 },
  panel: { ...surfaces.panel, padding: 20, gap: 12, boxShadow: shadows.raised },
  name: { fontFamily: fonts.displayHeavy, fontSize: 27, lineHeight: 32, letterSpacing: -0.8, color: colors.ink900 },
  place: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rate: { fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 30, color: colors.ink900 },
  facts: { gap: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factText: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  description: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface100, fontSize: 14, lineHeight: 21, color: colors.ink700 },
  agreement: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
})
