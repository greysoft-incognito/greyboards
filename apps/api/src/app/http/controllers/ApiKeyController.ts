import { ApiKey } from '@app/models/ApiKey'
import { ApiKeys } from '@app/services/ApiKeys'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'

const present = (key: ApiKey) => ({
  id: key.id,
  name: key.name,
  prefix: key.prefix,
  abilities: key.abilities,
  lastUsedAt: key.lastUsedAt,
  createdAt: key.createdAt,
})

/** An account's keys for the public API. A new key shows once. */
export default class ApiKeyController extends BaseController {
  async index() {
    const keys = await ApiKey.query().where({ userId: this.user.id }).whereNull('revokedAt').latest('createdAt').get()

    return new GenericResource(keys.all().map(present)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async store() {
    const data = await this.validate({
      name: 'required|string|min:2|max:60',
      abilities: 'nullable|array',
      'abilities.*': `in:${ApiKey.ABILITIES.join(',')}`,
    })
    const { key, token } = await ApiKeys.create(this.user, String(data.name), (data.abilities ?? ['read']) as ApiKey['abilities'])

    return new GenericResource({ ...present(key), token })
      .additional({ status: 'success', message: 'Copy the key now. It won’t show again.', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async destroy() {
    const key = await ApiKeys.revoke(this.user, String(this.params.key))

    return new GenericResource({ id: key.id }).additional({ status: 'success', message: 'Key removed', code: 200 })
  }
}
