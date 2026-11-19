import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { BadgeCheck, CalendarClock, Camera, FileSignature, type LucideIcon, Palette, Printer, UserRoundSearch } from 'lucide-react-native'
import type { ProspectStage, Task, TaskKind } from '@greyboards/types'
import { Text } from '@/components/ui'
import { formatDay } from '@/lib/format'
import { colors, fonts, radius } from '@/theme'

export const STAGES: { value: ProspectStage; label: string; background: string; color: string }[] = [
  { value: 'prospect', label: 'Spotted', background: colors.surface100, color: colors.ink700 },
  { value: 'contacted', label: 'Contacted', background: '#e0f2fe', color: '#075985' },
  { value: 'signed', label: 'Signed', background: '#ede9fe', color: '#5b21b6' },
  { value: 'captured', label: 'Captured', background: '#fef3c7', color: '#92400e' },
  { value: 'verified', label: 'Verified', background: '#d1fae5', color: '#065f46' },
  { value: 'earning', label: 'Earning', background: colors.brand100, color: colors.brand800 },
  { value: 'lost', label: 'Let go', background: colors.surface100, color: colors.ink500 },
]

/** The stages a scout sets by hand; the rest follow the board. */
export const MANUAL_STAGES: ProspectStage[] = ['prospect', 'contacted', 'signed', 'lost']

export function StageBadge({ stage }: { stage: ProspectStage }) {
  const look = STAGES.find((entry) => entry.value === stage)!

  return <Text style={[styles.badge, { backgroundColor: look.background, color: look.color }]}>{look.label}</Text>
}

const TASK_ICONS: Record<TaskKind, LucideIcon> = {
  artwork: Palette,
  install: Printer,
  proof: Camera,
  agreement: FileSignature,
  follow_up: UserRoundSearch,
}

function openTask(task: Task) {
  if (task.bookingId) return router.push({ pathname: '/bookings/[id]', params: { id: task.bookingId } })
  if (task.boardId) return router.push({ pathname: '/boards/[id]', params: { id: task.boardId } })

  router.push('/boards/pipeline')
}

/** What needs doing on boards the account looks after and in its pipeline, soonest first. */
export function TaskList({ tasks, limit }: { tasks: Task[]; limit?: number }) {
  const shown = limit ? tasks.slice(0, limit) : tasks

  if (!tasks.length) {
    return (
      <View style={styles.done}>
        <BadgeCheck size={16} color={colors.available} />
        <Text variant="muted">Nothing to do right now.</Text>
      </View>
    )
  }

  return (
    <View>
      {shown.map((task, index) => {
        const Icon = TASK_ICONS[task.kind]

        return (
          <Pressable
            key={`${task.kind}-${task.bookingId ?? task.boardId ?? task.prospectId}-${index}`}
            accessibilityRole="link"
            onPress={() => openTask(task)}
            style={({ pressed }) => [styles.task, index > 0 && styles.divided, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Icon size={16} color={colors.brand700} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{task.title}</Text>
              <Text variant="small">{task.detail}</Text>
            </View>
            {task.dueOn ? (
              <View style={styles.due}>
                <CalendarClock size={13} color={colors.ink500} />
                <Text style={styles.dueText}>{formatDay(task.dueOn)}</Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
      {limit && tasks.length > limit ? <Text variant="small" style={styles.more}>And {tasks.length - limit} more.</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: { alignSelf: 'flex-start', fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, overflow: 'hidden' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: radius.lg },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface200 },
  pressed: { backgroundColor: colors.surface100 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink900 },
  due: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  dueText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.ink500 },
  more: { paddingTop: 10, paddingHorizontal: 4 },
})
