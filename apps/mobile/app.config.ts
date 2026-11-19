import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Lets EAS_PROJECT_ID and EAS_OWNER override the EAS project in app.json, APP_VERSION and
 * APP_BUILD_NUMBER set the version name and build number of release builds, and adds universal links (iOS) and
 * app links (Android) for the web app's address, so the reset-password and verify-email links in
 * emails, and the payment provider's return link, open the app when EXPO_PUBLIC_WEB_URL is an https address.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID
  const owner = process.env.EAS_OWNER ?? config.owner
  const buildNumber = Number(process.env.APP_BUILD_NUMBER) || undefined
  const base = {
    ...config,
    owner,
    version: process.env.APP_VERSION || config.version,
    android: { ...config.android, versionCode: buildNumber ?? config.android?.versionCode },
    ios: { ...config.ios, buildNumber: buildNumber ? String(buildNumber) : config.ios?.buildNumber },
    extra: projectId ? { ...config.extra, eas: { ...config.extra?.eas, projectId } } : config.extra,
  } as ExpoConfig
  const web = process.env.EXPO_PUBLIC_WEB_URL ? new URL(process.env.EXPO_PUBLIC_WEB_URL) : null

  if (web?.protocol !== 'https:') return base

  const host = web.host

  return {
    ...base,
    ios: { ...base.ios, associatedDomains: [`applinks:${host}`] },
    android: {
      ...base.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: ['/reset-password', '/verify-email', '/checkout/complete', '/shares'].map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  }
}
