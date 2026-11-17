type Api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as?: string | null) => PromiseLike<{ status: number; body: any }>

/**
 * Have dispatcher `who` take a print job. A job without a price gets their bid, which the
 * advertiser pays; one that went back at its paid price is reserved and confirmed.
 */
export const takeJob = async (api: Api, jobId: string, bookingId: string, who: string, amountMinor = 17_500_000, payer = 'advertiser') => {
  const job = (await api('get', `/print-jobs/${jobId}`, undefined, who)).body.data

  if (job?.priced) {
    await api('post', `/print-jobs/${jobId}/reserve`, undefined, who)
    await api('post', `/print-jobs/${jobId}/confirm`, undefined, who)

    return
  }

  const offer = (await api('post', `/print-jobs/${jobId}/offers`, { amountMinor }, who)).body.data
  const payment = (await api('post', `/bookings/${bookingId}/print-offers/${offer.id}/checkout`, undefined, payer)).body.data

  await api('post', `/payments/${payment.reference}/verify`, undefined, payer)
}
