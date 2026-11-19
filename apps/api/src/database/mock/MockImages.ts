import { StoredImage, type SavedImage } from '@app/support/StoredImage'

/** An advert drawn onto mock artwork and board photos. */
export interface MockAd {
  brand: string
  line: string
  colour: string
}

/**
 * Drawn stand-ins for the photos and designs people upload: board photos, artwork, proof of
 * posting and ID cards. Each is rendered from SVG and saved to the uploads disk like a real upload.
 */
export class MockImages {
  /** A street photo of a board, showing `ad` when one is up and an empty face otherwise. */
  async board(folder: string, name: string, ad: MockAd | null, seed: number): Promise<SavedImage> {
    const sky = MockImages.SKIES[seed % MockImages.SKIES.length]!
    const panel = ad ? this.adPanel(ad, 560, 280) : this.emptyPanel(560, 280)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#sky)"/>
        <circle cx="${180 + (seed % 5) * 170}" cy="130" r="46" fill="#fff6d8" opacity="0.8"/>
        <path d="M0 560 L200 520 L420 545 L640 510 L900 540 L1200 515 L1200 800 L0 800 Z" fill="#8a9a7b"/>
        <rect y="610" width="1200" height="190" fill="#46474b"/>
        <rect y="700" width="1200" height="8" fill="#e8e3d0" opacity="0.7"/>
        <rect x="560" y="420" width="28" height="200" fill="#58595d"/>
        <rect x="660" y="420" width="28" height="200" fill="#58595d"/>
        <g transform="translate(340 140)">
          <rect x="-14" y="-14" width="588" height="308" rx="6" fill="#2b2c30"/>
          ${panel}
        </g>
        <text x="40" y="770" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.85">${MockImages.escape(name)}</text>
      </svg>`

    return this.save(folder, svg)
  }

  /** The design an advertiser sends, in the board's shape. */
  async artwork(folder: string, ad: MockAd, ratio: number): Promise<SavedImage> {
    const width = 1500
    const height = Math.round(width / Math.min(Math.max(ratio, 0.5), 5))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${this.adPanel(ad, width, height)}</svg>`

    return this.save(folder, svg)
  }

  /** A sample ID card for a partner check, clearly marked as a sample. */
  async identity(folder: string, name: string, document: string): Promise<SavedImage> {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="630">
        <rect width="1000" height="630" rx="28" fill="#efe9dc"/>
        <rect x="40" y="40" width="250" height="300" rx="12" fill="#c4c5c9"/>
        <circle cx="165" cy="160" r="70" fill="#a3a4a8"/>
        <rect x="80" y="250" width="170" height="70" rx="35" fill="#a3a4a8"/>
        <text x="330" y="100" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#1e1f22">${MockImages.escape(document)}</text>
        <text x="330" y="170" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#46474b">${MockImages.escape(name)}</text>
        <text x="330" y="220" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#727376">No. 0000 0000 0000</text>
        <text x="500" y="520" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="700" fill="#833b4b" opacity="0.25" transform="rotate(-12 500 480)">SAMPLE</text>
      </svg>`

    return this.save(folder, svg)
  }

  private adPanel(ad: MockAd, width: number, height: number): string {
    const room = width * 0.84
    const brandSize = Math.round(Math.min(height * 0.28, room / (ad.brand.length * 0.62)))
    const lineSize = Math.round(Math.min(brandSize * 0.42, room / (ad.line.length * 0.52)))

    return `
      <rect width="${width}" height="${height}" fill="${ad.colour}"/>
      <circle cx="${width * 0.86}" cy="${height * 0.2}" r="${height * 0.5}" fill="#ffffff" opacity="0.12"/>
      <text x="${width * 0.07}" y="${height * 0.5}" font-family="Helvetica, Arial, sans-serif" font-size="${brandSize}" font-weight="700" fill="#ffffff">${MockImages.escape(ad.brand)}</text>
      <text x="${width * 0.07}" y="${height * 0.5 + lineSize * 1.8}" font-family="Helvetica, Arial, sans-serif" font-size="${lineSize}" fill="#ffffff" opacity="0.9">${MockImages.escape(ad.line)}</text>`
  }

  private emptyPanel(width: number, height: number): string {
    return `
      <rect width="${width}" height="${height}" fill="#ececee"/>
      <text x="${width / 2}" y="${height / 2 + 14}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#727376">Your ad here</text>`
  }

  private async save(folder: string, svg: string): Promise<SavedImage> {
    const sharp = await MockImages.sharp()
    const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer()

    return StoredImage.save(folder, { buffer, mimetype: 'image/jpeg' })
  }

  /** sharp, whether the console loads it as CommonJS or as an ES module. */
  private static async sharp(): Promise<typeof import('sharp')> {
    const loaded = (await import('sharp')) as unknown as typeof import('sharp') | { default: typeof import('sharp') }

    return typeof loaded === 'function' ? loaded : loaded.default
  }

  private static escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  private static readonly SKIES: [string, string][] = [
    ['#7fb3e0', '#dcebf7'],
    ['#f2b77a', '#fbe3c4'],
    ['#9cc5e8', '#eef5fb'],
    ['#c9a3c7', '#f6dfe6'],
  ]
}
