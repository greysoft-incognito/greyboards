import { Alert } from 'react-native'

/** What to ask before an action goes ahead. `danger` is for things that can't be taken back. */
export interface Confirmation {
  title: string
  message?: string
  action: string
  danger?: boolean
}

/** Asks before an action. Resolves true when the person goes ahead. */
export function ask({ title, message, action, danger = false }: Confirmation) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: danger ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  )
}

/** Asks before something that can't be undone. */
export function confirm(title: string, message: string, action: string) {
  return ask({ title, message, action, danger: true })
}
