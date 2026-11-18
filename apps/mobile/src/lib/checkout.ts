import * as WebBrowser from 'expo-web-browser'
import type { Payment } from '@greyboards/types'
import { api } from './api'
import { PlainProblem } from './forms'

export type PaymentOutcome = 'paid' | 'failed' | 'pending'

/**
 * Opens the provider's checkout in the in-app browser, then checks the payment once the
 * payer closes it or the provider sends them back. A payment with no page to visit is checked at once.
 */
export async function payInBrowser(payment: Payment): Promise<PaymentOutcome> {
  if (payment.checkoutUrl) await WebBrowser.openBrowserAsync(payment.checkoutUrl, { dismissButtonStyle: 'done' })

  return verify(payment.reference)
}

/** Where a payment stands with the provider. */
export async function verify(reference: string): Promise<PaymentOutcome> {
  try {
    const { data } = await api.verifyPayment(reference).send()

    return data.status === 'complete' ? 'paid' : data.status === 'rejected' ? 'failed' : 'pending'
  } catch {
    return 'pending'
  }
}

/** What to tell the payer once they're back. */
export const OUTCOME_MESSAGES: Record<PaymentOutcome, string> = {
  paid: 'Payment received.',
  failed: "The payment didn't go through, so nothing was charged.",
  pending: "Your payment is still being confirmed. We'll update the booking once it is.",
}

/** Starts a payment, pays it in the browser, then calls `onDone`. Returns the message to show, or throws when it failed. */
export async function payAndReport(start: () => Promise<{ data: Payment }>, onDone: () => void) {
  const { data } = await start()
  const outcome = await payInBrowser(data)

  onDone()

  if (outcome === 'failed') throw new PlainProblem("Your payment didn’t go through and you weren’t charged. Try again while we hold your dates.")

  return outcome === 'paid' ? OUTCOME_MESSAGES.paid : 'Your payment is still being confirmed. Pull down to refresh in a moment.'
}
