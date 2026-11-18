import * as ImagePicker from 'expo-image-picker'
import { PlainProblem } from './forms'
import { megabytes } from './limits'

/**
 * Takes a photo with the camera or picks one from the library, asking for permission first.
 * Resolves to null when the person backs out; throws a PlainProblem when it can't be used.
 */
export async function pickImage({ source, maxMb, why }: { source: 'camera' | 'library'; maxMb: number; why: string }) {
  const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) throw new PlainProblem(`Allow ${source === 'camera' ? 'the camera' : 'photos'} for Greyboards in your phone settings to ${why}.`)

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)

  if (result.canceled) return null

  const asset = result.assets[0]!

  if (asset.fileSize && asset.fileSize > megabytes(maxMb)) throw new PlainProblem(`That image is larger than ${maxMb} MB.`)

  return asset
}
