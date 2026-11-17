import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { BadgeCheck, UserPlus, X } from 'lucide-react-native'
import type { BoardOwnerChoice, OwnerSuggestion } from '@greyboards/types'
import { Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { colors, fonts, radius } from '@/theme'

/**
 * Who owns a board a scout tags. Typing a name suggests owners already on Greyboards;
 * picking one sends its profile, and anyone else is a new owner, sent with their phone
 * number so we can text them the agreement.
 */
export function OwnerPicker({ onChange, errors = {} }: { onChange: (choice: BoardOwnerChoice) => void; errors?: Record<string, string> }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [picked, setPicked] = useState<OwnerSuggestion | null>(null)
  const [suggestions, setSuggestions] = useState<OwnerSuggestion[]>([])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const type = (value: string) => {
    setName(value)
    onChange({ ownerName: value.trim() || null, ownerPhone: phone.trim() || null })
    clearTimeout(timer.current)

    if (value.trim().length < 2) return setSuggestions([])

    timer.current = setTimeout(() => {
      api
        .ownerSuggestions(value.trim())
        .send()
        .then(({ data }) => setSuggestions(data))
        .catch(() => setSuggestions([]))
    }, 250)
  }

  const typePhone = (value: string) => {
    setPhone(value)
    onChange({ ownerName: name.trim() || null, ownerPhone: value.trim() || null })
  }

  const pick = (owner: OwnerSuggestion | null) => {
    setPicked(owner)
    setSuggestions([])
    onChange(owner ? { ownerProfileId: owner.id } : { ownerName: name.trim() || null, ownerPhone: phone.trim() || null })
  }

  if (picked) {
    return (
      <View style={styles.picked}>
        <View style={styles.initials}>
          <Text style={styles.initialsText}>{initials(picked.name)}</Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text variant="label" numberOfLines={1}>
              {picked.name}
            </Text>
            {picked.claimed ? <BadgeCheck size={16} color={colors.brand600} /> : null}
          </View>
          <Text variant="small">
            {picked.phone ?? 'No phone'} · {picked.boards === 1 ? '1 board' : `${picked.boards} boards`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Pick another owner" hitSlop={8} onPress={() => pick(null)}>
          <X size={20} color={colors.ink500} />
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.box}>
      <Field label="Owner's name" error={errors.ownerName ?? errors.ownerProfileId} hint="Owners already on Greyboards show as you type.">
        <Input value={name} onChangeText={type} autoCapitalize="words" autoComplete="off" maxLength={120} placeholder="Mr Adeyemi" />
      </Field>
      {suggestions.length ? (
        <View style={styles.list}>
          {suggestions.map((owner) => (
            <Pressable key={owner.id} accessibilityRole="button" onPress={() => pick(owner)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <View style={styles.initials}>
                <Text style={styles.initialsText}>{initials(owner.name)}</Text>
              </View>
              <View style={styles.flex}>
                <Text variant="label" numberOfLines={1}>
                  {owner.name}
                </Text>
                <Text variant="small">
                  {owner.phone ?? 'No phone'} · {owner.boards === 1 ? '1 board' : `${owner.boards} boards`}
                </Text>
              </View>
            </Pressable>
          ))}
          <View style={[styles.option, styles.newOwner]}>
            <UserPlus size={18} color={colors.ink500} />
            <Text variant="small" style={styles.flex}>
              Not listed? Add their phone below and we'll set them up.
            </Text>
          </View>
        </View>
      ) : null}
      <Field label="Owner's phone" error={errors.ownerPhone} hint="We text the owner the agreement to sign.">
        <Input value={phone} onChangeText={typePhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" maxLength={20} placeholder="0803 123 4567" />
      </Field>
    </View>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.brand500, backgroundColor: colors.brand50 },
  list: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface200, overflow: 'hidden', marginTop: -4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white },
  pressed: { backgroundColor: colors.brand50 },
  newOwner: { backgroundColor: colors.canvas },
  initials: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand100, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brand700 },
})
