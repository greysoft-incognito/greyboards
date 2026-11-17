import type { Bank, PaymentGateway, PaymentRequest, PaymentResult, PayoutGateway, RefundGateway, RefundResult, TransferRequest, TransferResult } from './PaymentGateway'
import { ValidationException } from 'kanun'
import { timingSafeEqual } from 'node:crypto'

/** Takes payments through Flutterwave's hosted checkout, refunds them, and pays people out by bank transfer. */
export class Flutterwave implements PaymentGateway, PayoutGateway, RefundGateway {
  readonly key = 'flutterwave'

  enabled(): boolean {
    return !!this.secret()
  }

  async initialize(request: PaymentRequest): Promise<{ url: string }> {
    const unreachable = { ok: false, body: { message: 'We could not reach Flutterwave. Please try again.' } as Record<string, unknown> }
    const response = await this.send('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: request.reference,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.returnUrl,
        customer: { email: request.email, name: request.name },
        customizations: { title: String(config('app.name')), description: request.title },
        meta: { app: String(config('payments.relay_app')) },
      }),
    }).catch(() => unreachable)
    const url = (response.body.data as { link?: string } | undefined)?.link

    if (!response.ok || !url) throw ValidationException.withMessages({ booking: Flutterwave.message(response.body) })

    return { url }
  }

  async verify(reference: string): Promise<PaymentResult> {
    const pending = (raw: Record<string, unknown>): PaymentResult => ({ paid: false, final: false, amount: 0, currency: null, raw })
    const response = await this.send(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`).catch((error: Error) => ({
      ok: false,
      body: { message: error.message } as Record<string, unknown>,
    }))

    // Nothing paid under this reference yet, e.g. the payer left the checkout open.
    if (!response.ok) return pending(response.body)

    const data = (response.body.data ?? {}) as Record<string, unknown>
    const status = String(data.status ?? '').toLowerCase()

    return {
      paid: status === 'successful' && (data.tx_ref ?? reference) === reference,
      final: status === 'successful' || status === 'failed',
      amount: Number(data.amount ?? 0),
      currency: data.currency ? String(data.currency).toUpperCase() : null,
      raw: data,
    }
  }

  async banks(country: string): Promise<Bank[]> {
    const response = await this.send(`/banks/${encodeURIComponent(country.toUpperCase())}`).catch(() => ({ ok: false, body: {} as Record<string, unknown> }))
    const rows = (response.ok ? (response.body.data ?? []) : []) as { code?: string; name?: string }[]

    return rows.filter((row) => row.code && row.name).map((row) => ({ code: String(row.code), name: String(row.name) }))
  }

  async accountName(bankCode: string, accountNumber: string): Promise<string | null> {
    const response = await this.send('/accounts/resolve', { method: 'POST', body: JSON.stringify({ account_bank: bankCode, account_number: accountNumber }) }).catch(() => null)
    const name = (response?.body.data as { account_name?: string } | undefined)?.account_name

    return response?.ok && name ? String(name) : null
  }

  async transfer(request: TransferRequest): Promise<TransferResult> {
    const response = await this.send('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        account_bank: request.bankCode,
        account_number: request.accountNumber,
        amount: request.amount,
        currency: request.currency,
        narration: request.narration,
        reference: request.reference,
        debit_currency: request.currency,
      }),
    }).catch((error: Error) => ({ ok: false, body: { message: error.message } as Record<string, unknown> }))

    // Queued transfers finish later; a refused one is final.
    if (!response.ok) return { paid: false, final: true, reason: Flutterwave.transferMessage(response.body), raw: response.body }

    return Flutterwave.transferResult((response.body.data ?? {}) as Record<string, unknown>)
  }

  async transferStatus(reference: string): Promise<TransferResult> {
    const response = await this.send(`/transfers?reference=${encodeURIComponent(reference)}`).catch(() => null)
    const data = ((response?.body.data ?? []) as Record<string, unknown>[])[0]

    if (!response?.ok || !data) return { paid: false, final: false, reason: null, raw: response?.body ?? {} }

    return Flutterwave.transferResult(data)
  }

  /** Refund part or all of a payment, by the transaction id its verification returned. */
  async refund(payment: { reference: string; response: Record<string, unknown> | null }, amount: number): Promise<RefundResult> {
    const transaction = payment.response?.id

    if (!transaction) return { id: null, refunded: false, final: true, reason: 'The payment has no Flutterwave transaction to refund.', raw: {} }

    const response = await this.send(`/transactions/${encodeURIComponent(String(transaction))}/refund`, { method: 'POST', body: JSON.stringify({ amount }) }).catch(
      (error: Error) => ({ ok: false, body: { message: error.message } as Record<string, unknown> }),
    )

    if (!response.ok) return { id: null, refunded: false, final: true, reason: String(response.body.message || 'Flutterwave could not refund this payment.'), raw: response.body }

    return Flutterwave.refundResult((response.body.data ?? {}) as Record<string, unknown>)
  }

  async refundStatus(id: string): Promise<RefundResult> {
    const response = await this.send(`/refunds/${encodeURIComponent(id)}`).catch(() => null)

    if (!response?.ok) return { id, refunded: false, final: false, reason: null, raw: response?.body ?? {} }

    return Flutterwave.refundResult((response.body.data ?? {}) as Record<string, unknown>)
  }

  private static refundResult(data: Record<string, unknown>): RefundResult {
    const status = String(data.status ?? '').toLowerCase()

    return {
      id: data.id ? String(data.id) : null,
      refunded: status === 'completed',
      final: status === 'completed' || status === 'failed',
      reason: status === 'failed' ? 'Flutterwave could not complete the refund.' : null,
      raw: data,
    }
  }

  private static transferResult(data: Record<string, unknown>): TransferResult {
    const status = String(data.status ?? '').toUpperCase()

    return {
      paid: status === 'SUCCESSFUL',
      final: status === 'SUCCESSFUL' || status === 'FAILED',
      reason: status === 'FAILED' ? String(data.complete_message || 'The transfer failed.') : null,
      raw: data,
    }
  }

  private static transferMessage(body: Record<string, unknown>): string {
    return String(body.message || 'Flutterwave could not send this transfer.')
  }

  /** Flutterwave signs webhooks by sending back the secret hash set in its dashboard. */
  validWebhook(hash: unknown): boolean {
    const secret = String(config('payments.flutterwave.webhook_hash') ?? '')

    if (!secret || typeof hash !== 'string' || hash.length !== secret.length) return false

    return timingSafeEqual(Buffer.from(hash), Buffer.from(secret))
  }

  private secret(): string {
    return String(config('payments.flutterwave.secret_key') ?? '')
  }

  private async send(path: string, init: RequestInit = {}): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    const response = await fetch(`${config('payments.flutterwave.api_url')}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secret()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })

    return { ok: response.ok, body: ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown> }
  }

  private static message(body: Record<string, unknown>): string {
    return String(body.message || 'Flutterwave could not start this payment. Please try again.')
  }
}
