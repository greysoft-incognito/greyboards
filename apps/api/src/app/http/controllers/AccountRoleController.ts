import { AccountRole, type AccountRoleKind } from '@app/models/AccountRole'
import { AccountRoleCollection } from '@app/http/resources/AccountRoleCollection'
import { AccountRoleResource } from '@app/http/resources/AccountRoleResource'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { assertFound } from '@arkstack/common'
import { IdentityCheck, type IdentityDocument } from '@app/models/IdentityCheck'
import { PartnerChecks } from '@app/services/PartnerChecks'
import { Settings } from '@app/support/Settings'
import { imageFile } from '@app/support/rules'

/** The marketplace roles the signed-in account holds, and taking on or giving up one. */
export default class AccountRoleController extends BaseController {
  /** What each role is for. Works signed out, for sign-up forms. */
  async definitions() {
    return new GenericResource(AccountRole.DEFINITIONS).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async index() {
    const roles = (await this.user.accountRoles().getResults()).all()

    return new AccountRoleCollection(roles).additional({ status: 'success', message: 'OK', code: 200, definitions: AccountRole.DEFINITIONS })
  }

  async create() {
    const data = await this.validate({ kind: `required|in:${AccountRole.kinds().join(',')}` })
    const role = await AccountRole.take(this.user, data.kind as AccountRoleKind)
    const message = role.isActive() ? `You can work as ${role.named()} now` : `Thanks. We'll review your ${role.label()} application.`

    return new AccountRoleResource(role).additional({ status: 'success', message, code: 200 })
  }

  async destroy() {
    const role = await this.user.accountRoles().where({ kind: String(this.params.kind) as AccountRoleKind }).first()

    assertFound(role, 'You do not hold this role.', 404)

    await role.drop()

    return new GenericResource({ kind: role.kind }).additional({ status: 'success', message: `You no longer work as ${role.named()}`, code: 200 })
  }

  /** What the account has shown for the scout and billposter checks, and the IDs it can send. */
  async checks() {
    return new GenericResource(await PartnerChecks.summary(this.user, false)).additional({
      status: 'success',
      message: 'OK',
      code: 200,
      documents: IdentityCheck.DOCUMENTS,
    })
  }

  /** Send a photo of a government ID for review. A new one replaces the last. */
  async submitIdentity() {
    const data = await this.validate({
      documentType: `required|in:${IdentityCheck.types().join(',')}`,
      documentNumber: 'required|string|min:5|max:30',
      fullName: 'required|string|min:3|max:120',
      photo: imageFile((await Settings.number('uploads.max_image_mb')) * 1024),
    })

    await IdentityCheck.submit(this.user, { documentType: data.documentType as IdentityDocument, documentNumber: String(data.documentNumber), fullName: String(data.fullName) }, data.photo)

    return new GenericResource(await PartnerChecks.summary(this.user, false))
      .additional({ status: 'success', message: 'ID sent. We’ll check it with your application.', code: 201 })
      .response()
      .setStatusCode(201)
  }
}
