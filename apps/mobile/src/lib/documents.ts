import { Linking } from 'react-native'
import { router } from 'expo-router'
import { BUILT_IN_DOCUMENTS } from '@greyboards/types'
import { webUrl } from './links'

const BUILT_IN: string[] = Object.values(BUILT_IN_DOCUMENTS)

/**
 * Opens a link from a page. Pages and policies open in the app; other paths
 * open on the web app, and full addresses in the browser.
 */
export function openDocumentLink(href: string) {
  const path = href.replace(/[?#].*$/, '')
  const [first, second] = path.split('/').filter(Boolean)

  if (!href.startsWith('/')) return Linking.openURL(href).catch(() => undefined)
  if (BUILT_IN.includes(first)) return router.push({ pathname: '/pages/[slug]', params: { slug: first } })
  if (first === 'pages' && second) return router.push({ pathname: '/pages/[slug]', params: { slug: second } })

  return Linking.openURL(webUrl(href)).catch(() => undefined)
}
