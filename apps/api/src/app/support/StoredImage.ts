import { Storage } from '@arkstack/filesystem'
import { randomUUID } from 'node:crypto'
import type { UploadedFile } from '@app/models/User'
import { ImageFile } from './ImageFile'

/** An uploaded image saved under a folder, with where it went and its size. */
export interface SavedImage {
  path: string
  disk: string
  width: number
  height: number
}

/** Saves uploaded images to the uploads disk and signs links to them. */
export class StoredImage {
  static async save(folder: string, file: UploadedFile): Promise<SavedImage> {
    const image = ImageFile.read(file.buffer)!
    const disk = ImageFile.disk()
    const path = `${folder}/${randomUUID()}.${ImageFile.extension(image.mimeType)}`

    await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))

    return { path, disk, width: image.width, height: image.height }
  }

  static url(disk: string, path: string): Promise<string> {
    return Storage.disk(disk as never).getSignedUrl(path, { expiresIn: '6h' })
  }

  static async remove(disk: string | null, path: string | null): Promise<void> {
    if (!disk || !path) return

    await Storage.disk(disk as never)
      .delete(path)
      .catch(() => undefined)
  }
}
