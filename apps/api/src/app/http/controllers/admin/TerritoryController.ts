import { Territory } from '@app/models/Territory'
import { User } from '@app/models/User'
import { TerritoryCollection } from '@app/http/resources/TerritoryCollection'
import { BaseController } from '../BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

const rules = (creating: boolean) => ({
  name: `${creating ? 'required' : 'sometimes'}|string|min:2|max:120`,
  latitude: `${creating ? 'required' : 'sometimes'}|numeric|min:-90|max:90`,
  longitude: `${creating ? 'required' : 'sometimes'}|numeric|min:-180|max:180`,
  radiusM: `${creating ? 'required' : 'sometimes'}|integer|min:100|max:100000`,
  scoutEmail: 'nullable|email',
})

/** Territories staff give scouts, so two don't chase the same owner. */
export default class TerritoryController extends BaseController {
  async index() {
    const territories = await Territory.query().oldest('name').paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new TerritoryCollection(territories).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async store() {
    const data = await this.validate(rules(true))
    const territory = await Territory.query().create({
      name: String(data.name).trim(),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusM: Number(data.radiusM),
      scoutId: await this.scoutId(data.scoutEmail),
    })

    return this.respond(territory, 'Territory added.', 201)
  }

  async update() {
    const territory = await this.territory()
    const data = await this.validate(rules(false))

    await territory.update({
      ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
      ...(data.latitude !== undefined ? { latitude: Number(data.latitude) } : {}),
      ...(data.longitude !== undefined ? { longitude: Number(data.longitude) } : {}),
      ...(data.radiusM !== undefined ? { radiusM: Number(data.radiusM) } : {}),
      ...('scoutEmail' in data ? { scoutId: await this.scoutId(data.scoutEmail) } : {}),
    })

    return this.respond(territory, 'Territory saved.', 200)
  }

  async destroy() {
    await (await this.territory()).delete()

    return new GenericResource({}).additional({ status: 'success', message: 'Territory removed.', code: 200 })
  }

  /** The active scout with this email, or null to leave the territory open. */
  private async scoutId(email: unknown): Promise<string | null> {
    if (!email) return null

    const scout = await User.query().where({ email: String(email).trim().toLowerCase() }).first()

    if (!scout || !(await scout.actsAs('scout'))) throw new RequestException('No active scout has that email.', 422)

    return scout.id
  }

  private async respond(territory: Territory, message: string, code: number) {
    const names = await TerritoryCollection.names([territory])

    return new GenericResource(TerritoryCollection.present(territory, names.get(territory.scoutId ?? '') ?? null))
      .additional({ status: 'success', message, code })
      .response()
      .setStatusCode(code)
  }

  private async territory(): Promise<Territory> {
    const territory = await Territory.query().find(String(this.params.territory))

    if (!territory) throw new RequestException('Territory not found.', 404)

    return territory
  }
}
