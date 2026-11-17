import request from 'parasito'
import { app } from '../../src/core/bootstrap'

/** A one-pixel PNG, enough for an upload. */
export const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

/** Send the ID photo for the account with `token`. */
export const sendId = (token: string, fullName = 'Test Account Holder') => {
  const form = new FormData()

  form.append('documentType', 'nin')
  form.append('documentNumber', '12345678901')
  form.append('fullName', fullName)
  form.append('photo', new Blob([pixel], { type: 'image/png' }), 'id.png')

  return request(app).post('/api/account/identity').set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)
}

/** Add a bank account the fake gateway confirms, held by "Test Account Holder". */
export const addBank = (token: string) =>
  request(app)
    .put('/api/account/payout-account')
    .set({ Accept: 'application/json', Authorization: `Bearer ${token}` })
    .send({ bankCode: '058', accountNumber: '0123456789' })

/** Everything a scout or billposter sends before a reviewer can let them in. */
export const passChecks = async (token: string) => {
  await sendId(token)
  await addBank(token)
}
