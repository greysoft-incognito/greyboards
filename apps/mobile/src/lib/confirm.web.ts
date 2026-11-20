import type { Confirmation } from './confirm'

export type { Confirmation }

/** Asks before an action, with the browser's dialog in the web preview. */
export async function ask({ title, message }: Confirmation) {
  return window.confirm(message ? `${title}\n\n${message}` : title)
}

/** Asks before something that can't be undone, with the browser's dialog in the web preview. */
export async function confirm(title: string, message: string, action: string) {
  return ask({ title, message, action, danger: true })
}
