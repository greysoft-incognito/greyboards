import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { Settings } from '@app/support/Settings'

/** Limits apps check before sending anything, so people hear about them early. */
export default class LimitsController extends BaseController {
  async show() {
    return new GenericResource({
      maxImageMb: await Settings.number('uploads.max_image_mb'),
      maxAvatarMb: await Settings.number('uploads.max_avatar_mb'),
      registrationOpen: Boolean(await Settings.get('accounts.registration_open')),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
