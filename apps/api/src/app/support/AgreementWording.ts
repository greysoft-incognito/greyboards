import { Settings } from './Settings'

/** What an owner reads on the agreement page, as it was when the agreement was sent. */
export interface AgreementTerms {
  headline: string
  shareLine: string
  terms: string[]
}

/** The values the wording's placeholders are filled with. */
export interface AgreementValues {
  owner: string | null
  scout: string | null
  board: string
  share: number
  rate: { amountMinor: number; currency: string; period: string } | null
}

const TERM_KEYS = ['term_1', 'term_2', 'term_3', 'term_4', 'term_5']

/**
 * The owner agreement's wording, from the admin settings. Placeholders such as {scout} and
 * {share} are filled in for one agreement; unknown ones are left as typed.
 */
export class AgreementWording {
  static async terms(values: AgreementValues): Promise<AgreementTerms> {
    const fill = (template: string) => AgreementWording.fill(template, values)
    const terms = await Promise.all(TERM_KEYS.map(async (key) => fill(String((await Settings.get(`agreements.${key}`)) ?? '')).trim()))

    return {
      headline: fill(String(await Settings.get('agreements.headline'))),
      shareLine: fill(String(await Settings.get('agreements.share_line'))),
      terms: terms.filter(Boolean),
    }
  }

  /** The text with the signing link. The link goes at the end when the wording leaves it out. */
  static async sms(values: AgreementValues, link: string): Promise<string> {
    const template = String(await Settings.get('agreements.sms_text'))
    const body = AgreementWording.fill(template.includes('{link}') ? template : `${template.trim()} {link}`, values, { link })
    const greeting = values.owner ? `Hello ${values.owner.split(/\s+/)[0]}, ` : 'Hello, '

    return `${greeting}${body}`
  }

  static fill(template: string, values: AgreementValues, extra: Record<string, string> = {}): string {
    const filled: Record<string, string> = {
      owner: values.owner ?? 'the owner',
      scout: values.scout ?? 'The scout',
      board: values.board,
      share: String(values.share),
      rate: values.rate ? AgreementWording.rate(values.rate) : 'the agreed rate',
      ...extra,
    }

    return template.replace(/\{(\w+)\}/g, (match, key: string) => filled[key] ?? match)
  }

  private static rate(rate: NonNullable<AgreementValues['rate']>): string {
    const amount = (rate.amountMinor / 100).toLocaleString('en', { maximumFractionDigits: 2 })

    return `${rate.currency.toUpperCase() === 'NGN' ? '₦' : `${rate.currency.toUpperCase()} `}${amount} a ${rate.period}`
  }
}
