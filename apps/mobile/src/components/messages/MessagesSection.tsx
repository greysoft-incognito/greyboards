import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { ImagePlus } from 'lucide-react-native'
import type { BookingMessage, MessageSide } from '@greyboards/types'
import { Avatar } from '@/components/Avatar'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

const SIDES: Record<MessageSide, string> = {
  advertiser: 'Advertiser',
  board: "Board owner",
  dispatch: 'Dispatch',
  staff: 'Greyboards',
}

/** "Tue 3 Feb, 14:05" in the phone's time. */
const sentAt = (moment: string) => new Date(moment).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/**
 * Messages about a booking with the advertiser and whoever looks after the board, so what's
 * agreed stays with the job. A photo can go with a message.
 */
export function MessagesSection({ bookingId }: { bookingId: string }) {
  const { maxImageMb } = useLimits()
  const [messages, setMessages] = useState<BookingMessage[]>([])
  const [body, setBody] = useState('')
  const send = useAction()

  const load = useCallback(() => {
    api
      .messages(bookingId)
      .send()
      .then(({ data }) => setMessages([...data].reverse()))
      .catch(() => undefined)
  }, [bookingId])

  useEffect(load, [load])

  const post = () =>
    send.run(async () => {
      await api.sendMessage(bookingId, body.trim()).send()
      setBody('')
      load()
    })

  const attach = () =>
    send.run(async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow photos for Greyboards in your phone settings to send one.')

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is over ${maxImageMb} MB.`)

      await api.sendMessage(bookingId, body.trim() || null, uploadFile(asset)).send()
      setBody('')
      load()
    })

  return (
    <Section title="Messages">
      <Text variant="muted">Agree details with the advertiser and the board's side here, so they stay with the job.</Text>
      {messages.length ? (
        <View style={styles.list}>
          {messages.map((message) => (
            <View key={message.id} style={[styles.row, message.mine && styles.mine]}>
              <Avatar user={{ name: message.author?.name ?? 'Greyboards', avatarUrl: message.author?.avatarUrl ?? null }} size={28} />
              <View style={[styles.bubbleColumn, message.mine && styles.right]}>
                <Text variant="small">
                  {message.mine ? 'You' : (message.author?.name ?? 'Greyboards')}
                  {message.author && !message.mine ? ` · ${SIDES[message.author.side]}` : ''} · {sentAt(message.createdAt)}
                </Text>
                {message.body ? <Text style={[styles.bubble, message.mine && styles.myBubble]}>{message.body}</Text> : null}
                {message.photo ? <Image source={{ uri: message.photo.url }} style={styles.photo} contentFit="cover" transition={150} /> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="small">No messages yet.</Text>
      )}
      <Input value={body} onChangeText={setBody} placeholder="Write a message" multiline maxLength={2000} accessibilityLabel="Message" />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Send a photo" onPress={attach} disabled={send.busy} style={styles.attach}>
          <ImagePlus size={20} color={colors.ink700} />
        </Pressable>
        <View style={styles.flex}>
          <Button title={send.busy ? 'Sending…' : 'Send'} loading={send.busy} onPress={() => post()} disabled={!body.trim()} />
        </View>
      </View>
      {send.problem.message ? <Callout>{send.problem.message}</Callout> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  mine: { flexDirection: 'row-reverse' },
  bubbleColumn: { maxWidth: '80%', gap: 4 },
  right: { alignItems: 'flex-end' },
  bubble: { backgroundColor: colors.surface100, color: colors.ink900, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, overflow: 'hidden' },
  myBubble: { backgroundColor: colors.brand600, color: '#ffffff' },
  photo: { width: 200, height: 140, borderRadius: radius.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attach: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface100 },
  flex: { flex: 1 },
})
