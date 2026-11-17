/** What a gateway needs to start a payment. `amount` is in major units, as providers expect. */
export interface PaymentRequest {
  reference: string
  amount: number
  currency: string
  email: string
  name: string
  title: string
  returnUrl: string
}

/** A gateway's answer about one payment. `final` is false while the payer can still finish it. */
export interface PaymentResult {
  paid: boolean
  final: boolean
  amount: number
  currency: string | null
  raw: Record<string, unknown>
}

/** A payment provider the checkout can send payers to. */
export interface PaymentGateway {
  readonly key: string
  enabled(): boolean
  /** Start a payment and return the page the payer completes it on. */
  initialize(request: PaymentRequest): Promise<{ url: string }>
  verify(reference: string): Promise<PaymentResult>
}

/** A bank money can be sent to. */
export interface Bank {
  code: string
  name: string
}

/** A transfer out to someone's bank account. `amount` is in major units. */
export interface TransferRequest {
  reference: string
  amount: number
  currency: string
  bankCode: string
  accountNumber: string
  narration: string
}

/** Where a transfer stands. `final` is false while the provider is still sending it. */
export interface TransferResult {
  paid: boolean
  final: boolean
  reason: string | null
  raw: Record<string, unknown>
}

/** A provider that can pay people out to their bank accounts. */
export interface PayoutGateway {
  readonly key: string
  enabled(): boolean
  banks(country: string): Promise<Bank[]>
  /** The name on an account, or null when the bank doesn't know it. */
  accountName(bankCode: string, accountNumber: string): Promise<string | null>
  transfer(request: TransferRequest): Promise<TransferResult>
  transferStatus(reference: string): Promise<TransferResult>
}

/** Where a refund stands. `id` is the provider's, for checking on it later. */
export interface RefundResult {
  id: string | null
  refunded: boolean
  final: boolean
  reason: string | null
  raw: Record<string, unknown>
}

/** A provider that can send part or all of a payment back. `amount` is in major units. */
export interface RefundGateway {
  readonly key: string
  refund(payment: { reference: string; response: Record<string, unknown> | null }, amount: number): Promise<RefundResult>
  refundStatus(id: string): Promise<RefundResult>
}
