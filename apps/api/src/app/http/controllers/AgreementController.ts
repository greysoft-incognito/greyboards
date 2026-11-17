import { AgreementOfferResource } from '@app/http/resources/AgreementOfferResource'
import { BoardAgreement } from '@app/models/BoardAgreement'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'

/** Board owners read and sign their agreement from the link in their SMS. No account needed. */
export default class AgreementController extends BaseController {
  async show() {
    const agreement = await BoardAgreement.fromToken(String(this.params.token))

    return new AgreementOfferResource(agreement).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async sendCode() {
    const agreement = await BoardAgreement.fromToken(String(this.params.token))

    await agreement.sendCode()

    return new GenericResource({ sent: true }).additional({ status: 'success', message: 'We’ve texted you a code.', code: 200 })
  }

  async sign() {
    const agreement = await BoardAgreement.fromToken(String(this.params.token))
    const data = await this.validate({
      name: 'required|string|min:2|max:120',
      code: 'required|digits:6',
    })

    await agreement.sign(String(data.code), String(data.name), {
      ip: this.ctx.req.ip,
      userAgent: this.ctx.req.headers['user-agent'],
    })

    return new AgreementOfferResource(agreement).additional({ status: 'success', message: 'Signed. Thank you.', code: 200 })
  }

  async decline() {
    const agreement = await BoardAgreement.fromToken(String(this.params.token))

    await agreement.decline()

    return new AgreementOfferResource(agreement).additional({ status: 'success', message: 'You declined. We won’t list your board.', code: 200 })
  }
}
