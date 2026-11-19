import { ImageFile } from './ImageFile'
import { ValidationRule, regex } from 'kanun'

/** A record id. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const UUID = regex(UUID_PATTERN)

/** A username: lower case letters, numbers and underscores, 3 to 30 long. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

export class Username extends ValidationRule {
  validate(attribute: string, value: any, fail: (message: string) => any): void {
    if (!USERNAME_PATTERN.test(String(value))) fail(`The ${attribute} must be 3 to 30 lowercase letters, numbers or underscores.`)
  }
}

/** An upload whose bytes are an accepted image format, no larger than ImageFile.MAX_PIXELS. */
export class ImageUpload extends ValidationRule {
  validate(attribute: string, value: any, fail: (message: string) => any): void {
    const image = ImageFile.read(value?.buffer)

    if (!image) return fail(`The ${attribute} must be a JPEG, PNG, WebP, GIF, AVIF or HEIC image.`)
    if (image.pixels > ImageFile.MAX_PIXELS) fail(`The ${attribute} must not be larger than ${ImageFile.MAX_PIXELS / 1_000_000} megapixels.`)
  }
}

/** Validation rules for an image upload of at most `maxKilobytes`. */
export const imageFile = (maxKilobytes: number) => ['required', 'file', `max:${maxKilobytes}`, new ImageUpload()]
