import { Platform } from 'react-native'
import * as Device from 'expo-device'

const DEVICE_TYPES: Partial<Record<Device.DeviceType, string>> = {
  [Device.DeviceType.PHONE]: 'mobile',
  [Device.DeviceType.TABLET]: 'tablet',
  [Device.DeviceType.DESKTOP]: 'desktop',
}

/**
 * This device, in the `X-Device-Agent` header Arkstack reads to name sessions
 * (e.g. "Pixel 9" in Settings → Devices). Non-ASCII is escaped so it stays a valid header.
 */
export const deviceAgent = JSON.stringify({
  deviceName: Device.deviceName,
  manufacturer: Device.manufacturer,
  model: Device.modelName,
  platform: Platform.OS,
  os: Device.osName,
  osVersion: Device.osVersion,
  deviceType: (Device.deviceType && DEVICE_TYPES[Device.deviceType]) ?? 'unknown',
}).replace(/[\u007f-￿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)

/** The device's country, from its locale such as "en-NG", for the `X-Country` header. */
export function deviceCountry(): string | null {
  const region = Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/).find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part))

  return region ?? null
}
