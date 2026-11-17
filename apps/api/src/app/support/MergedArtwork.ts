import { Storage } from '@arkstack/filesystem'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { ImageFile } from './ImageFile'
import type { SavedImage } from './StoredImage'

/** `columns` puts designs side by side, `rows` one above another. */
export type MergeLayout = 'columns' | 'rows'

/** The merged print's long side, in pixels. */
const LONG_SIDE = 3000

/**
 * The print for a shared booking: every advertiser's design in an equal panel, in share
 * order, on one image the shape of the board. Each design is fitted whole inside its panel
 * on white, so nothing anyone sent is cropped.
 */
export class MergedArtwork {
  static async make(folder: string, designs: { disk: string; path: string }[], boardRatio: number, layout: MergeLayout): Promise<SavedImage> {
    const ratio = Number.isFinite(boardRatio) && boardRatio > 0 ? boardRatio : 3
    const width = ratio >= 1 ? LONG_SIDE : Math.round(LONG_SIDE * ratio)
    const height = ratio >= 1 ? Math.round(LONG_SIDE / ratio) : LONG_SIDE
    const count = designs.length
    const panel = layout === 'rows' ? { width, height: Math.floor(height / count) } : { width: Math.floor(width / count), height }

    const tiles = await Promise.all(
      designs.map(async (design, index) => ({
        input: await sharp(Buffer.from(await Storage.disk(design.disk as never).getBytes(design.path)))
          .rotate()
          .resize(panel.width, panel.height, { fit: 'contain', background: '#ffffff' })
          .toBuffer(),
        left: layout === 'rows' ? 0 : index * panel.width,
        top: layout === 'rows' ? index * panel.height : 0,
      })),
    )

    const bytes = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
      .composite(tiles)
      .jpeg({ quality: 92 })
      .toBuffer()
    const disk = ImageFile.disk()
    const path = `${folder}/${randomUUID()}.jpg`

    await Storage.disk(disk as never).put(path, new Uint8Array(bytes))

    return { path, disk, width, height }
  }
}
