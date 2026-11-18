import { Money, currencies } from '@toneflix/money'
import type { CurrencyCode } from '@toneflix/money/types'
import type { ID } from './models'

const KNOWN = new Set(currencies.map((currency) => currency.code as string))

/** An amount in minor units in its currency, through @toneflix/money, such as "₦1,200,000". */
export function formatMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase()

  if (!KNOWN.has(code)) return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amountMinor / 100)

  return Money.whole(Math.round(amountMinor / 100), code as CurrencyCode)
}

/** A short amount for map pins and filters, such as "₦850K". */
export function formatCompactMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase()

  if (!KNOWN.has(code)) return new Intl.NumberFormat('en', { style: 'currency', currency: code, notation: 'compact', maximumFractionDigits: 1 }).format(amountMinor / 100)

  return Money.compact(amountMinor / 100, code as CurrencyCode)
}

/** The symbol people write before an amount, such as "₦" or "KSh", or the code when there's none. */
export function currencySymbol(currency: string): string {
  const code = currency.toUpperCase()

  return currencies.find((entry) => entry.code === code)?.symbol ?? code
}

/** Every currency in use, by ISO code and English name, A to Z. Kept here because not every app runtime has Intl.DisplayNames. */
const CURRENCIES = [
  'AFN:Afghan Afghani|ALL:Albanian Lek|DZD:Algerian Dinar|AOA:Angolan Kwanza|ARS:Argentine Peso|AMD:Armenian Dram|AWG:Aruban Florin|AUD:Australian Dollar',
  'AZN:Azerbaijani Manat|BSD:Bahamian Dollar|BHD:Bahraini Dinar|BDT:Bangladeshi Taka|BBD:Barbadian Dollar|BYN:Belarusian Ruble|BZD:Belize Dollar',
  'BMD:Bermudan Dollar|BTN:Bhutanese Ngultrum|BOB:Bolivian Boliviano|BAM:Bosnia-Herzegovina Convertible Mark|BWP:Botswanan Pula|BRL:Brazilian Real',
  'GBP:British Pound|BND:Brunei Dollar|BGN:Bulgarian Lev|BIF:Burundian Franc|KHR:Cambodian Riel|CAD:Canadian Dollar|CVE:Cape Verdean Escudo',
  'XCG:Caribbean guilder|KYD:Cayman Islands Dollar|XAF:Central African CFA Franc|XPF:CFP Franc|CLP:Chilean Peso|CNY:Chinese Yuan|COP:Colombian Peso',
  'KMF:Comorian Franc|CDF:Congolese Franc|CRC:Costa Rican Colón|CUC:Cuban Convertible Peso|CUP:Cuban Peso|CZK:Czech Koruna|DKK:Danish Krone',
  'DJF:Djiboutian Franc|DOP:Dominican Peso|XCD:East Caribbean Dollar|EGP:Egyptian Pound|ERN:Eritrean Nakfa|ETB:Ethiopian Birr|EUR:Euro',
  'FKP:Falkland Islands Pound|FJD:Fijian Dollar|GMD:Gambian Dalasi|GEL:Georgian Lari|GHS:Ghanaian Cedi|GIP:Gibraltar Pound|GTQ:Guatemalan Quetzal',
  'GNF:Guinean Franc|GYD:Guyanaese Dollar|HTG:Haitian Gourde|HNL:Honduran Lempira|HKD:Hong Kong Dollar|HUF:Hungarian Forint|ISK:Icelandic Króna',
  'INR:Indian Rupee|IDR:Indonesian Rupiah|IRR:Iranian Rial|IQD:Iraqi Dinar|ILS:Israeli New Shekel|JMD:Jamaican Dollar|JPY:Japanese Yen',
  'JOD:Jordanian Dinar|KZT:Kazakhstani Tenge|KES:Kenyan Shilling|KWD:Kuwaiti Dinar|KGS:Kyrgyz Som|LAK:Laotian Kip|LBP:Lebanese Pound|LSL:Lesotho Loti',
  'LRD:Liberian Dollar|LYD:Libyan Dinar|MOP:Macanese Pataca|MKD:Macedonian Denar|MGA:Malagasy Ariary|MWK:Malawian Kwacha|MYR:Malaysian Ringgit',
  'MVR:Maldivian Rufiyaa|MRU:Mauritanian Ouguiya|MUR:Mauritian Rupee|MXN:Mexican Peso|MDL:Moldovan Leu|MNT:Mongolian Tugrik|MAD:Moroccan Dirham',
  'MZN:Mozambican Metical|MMK:Myanmar Kyat|NAD:Namibian Dollar|NPR:Nepalese Rupee|ANG:Netherlands Antillean Guilder|TWD:New Taiwan Dollar',
  'NZD:New Zealand Dollar|NIO:Nicaraguan Córdoba|NGN:Nigerian Naira|KPW:North Korean Won|NOK:Norwegian Krone|OMR:Omani Rial|PKR:Pakistani Rupee',
  'PAB:Panamanian Balboa|PGK:Papua New Guinean Kina|PYG:Paraguayan Guarani|PEN:Peruvian Sol|PHP:Philippine Peso|PLN:Polish Zloty|QAR:Qatari Riyal',
  'RON:Romanian Leu|RUB:Russian Ruble|RWF:Rwandan Franc|WST:Samoan Tala|STN:São Tomé & Príncipe Dobra|SAR:Saudi Riyal|RSD:Serbian Dinar',
  'SCR:Seychellois Rupee|SLE:Sierra Leonean Leone|SGD:Singapore Dollar|SBD:Solomon Islands Dollar|SOS:Somali Shilling|ZAR:South African Rand',
  'KRW:South Korean Won|SSP:South Sudanese Pound|LKR:Sri Lankan Rupee|SHP:St. Helena Pound|SDG:Sudanese Pound|SRD:Surinamese Dollar|SZL:Swazi Lilangeni',
  'SEK:Swedish Krona|CHF:Swiss Franc|SYP:Syrian Pound|TJS:Tajikistani Somoni|TZS:Tanzanian Shilling|THB:Thai Baht|TOP:Tongan Paʻanga',
  'TTD:Trinidad & Tobago Dollar|TND:Tunisian Dinar|TRY:Turkish Lira|TMT:Turkmenistani Manat|UGX:Ugandan Shilling|UAH:Ukrainian Hryvnia',
  'AED:United Arab Emirates Dirham|UYU:Uruguayan Peso|USD:US Dollar|UZS:Uzbekistani Som|VUV:Vanuatu Vatu|VES:Venezuelan Bolívar|VND:Vietnamese Dong',
  'XOF:West African CFA Franc|YER:Yemeni Rial|ZMW:Zambian Kwacha|ZWG:Zimbabwean Gold',
].join('|')
  .split('|')
  .map((entry) => {
    const [value, name] = entry.split(':') as [string, string]

    return { value, label: `${name} (${value})` }
  })

/** Every currency in use, by name, for picking one. */
export function currencyOptions(): { value: string; label: string }[] {
  return CURRENCIES
}

/** The currency things are priced in for a country, and the default for everywhere else. */
export interface CurrencyInfo {
  country: string | null
  currency: string
  default: string
  /** The currency of each country in an active payment region. Every other country uses `default`. */
  regions: Record<string, string>
}

/** A group of countries that prices and pays in its own currency, through its own provider when set. */
export interface PaymentRegion {
  id: ID
  name: string
  countries: string[]
  currency: string
  /** Null uses the default provider. */
  provider: string | null
  /** One unit of the default currency in this currency. Null uses the live rate plus `rateMarkup`. */
  exchangeRate: number | null
  rateMarkup: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentRegionInput = Partial<Pick<PaymentRegion, 'name' | 'countries' | 'currency' | 'provider' | 'exchangeRate' | 'rateMarkup' | 'active'>>

/** A payment provider admins can pick for a region. */
export interface PaymentProviderOption {
  value: string
  label: string
}
