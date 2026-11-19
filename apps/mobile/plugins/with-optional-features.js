const { withAndroidManifest } = require('expo/config-plugins')

/**
 * Declares the hardware features Android would otherwise imply as required (portrait from the
 * locked orientation, camera from the camera permission, GPS from location) as optional, so
 * Google Play does not hide the app from devices without them.
 */
const OPTIONAL_FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
]

module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest
    const features = (manifest['uses-feature'] ?? []).filter((feature) => !OPTIONAL_FEATURES.includes(feature.$['android:name']))

    manifest['uses-feature'] = [...features, ...OPTIONAL_FEATURES.map((name) => ({ $: { 'android:name': name, 'android:required': 'false' } }))]

    return config
  })
}
