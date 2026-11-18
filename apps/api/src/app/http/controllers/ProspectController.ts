import { Prospect, type ProspectStage } from '@app/models/Prospect'
import { ProspectCollection } from '@app/http/resources/ProspectCollection'
import { ProspectResource } from '@app/http/resources/ProspectResource'
import { TerritoryCollection } from '@app/http/resources/TerritoryCollection'
import { Territory } from '@app/models/Territory'
import { Pipeline, type ProspectInput } from '@app/services/Pipeline'
import { Tasks } from '@app/services/Tasks'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

const STAGES = `in:${Prospect.STAGES.join(',')}`

const rules = (creating: boolean) => ({
  name: `${creating ? 'required' : 'sometimes'}|string|min:2|max:120`,
  latitude: `${creating ? 'required' : 'sometimes'}|numeric|min:-90|max:90`,
  longitude: `${creating ? 'required' : 'sometimes'}|numeric|min:-180|max:180`,
  address: 'nullable|string|max:191',
  ownerName: 'nullable|string|max:120',
  ownerPhone: 'nullable|string|min:7|max:20',
  notes: 'nullable|string|max:2000',
  stage: `nullable|in:${Prospect.MANUAL.join(',')}`,
})

/** The scout's pipeline, their territories, and the task list for anyone who looks after boards. */
export default class ProspectController extends BaseController {
  /** The scout's prospects, newest activity first, with how many sit at each stage. */
  async index() {
    const filters = await this.validateQuery({ stage: `nullable|${STAGES}` })
    const prospects = await Pipeline.of(this.user, (filters.stage as ProspectStage) || null).paginate(perPage(this.query, { perPage: 30, maxPerPage: 100 }))

    return new ProspectCollection(prospects).additional({ counts: await Pipeline.counts(this.user), status: 'success', message: 'OK', code: 200 })
  }

  async store() {
    const data = await this.validate(rules(true))
    const prospect = await Pipeline.create(this.user, this.input(data) as never)

    return new ProspectResource(await this.fresh(prospect.id)).additional({ status: 'success', message: 'Added to your pipeline.', code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const prospect = await this.mine()
    const data = await this.validate(rules(false))

    await Pipeline.update(prospect, this.user, this.input(data))

    return new ProspectResource(await this.fresh(prospect.id)).additional({ status: 'success', message: 'Saved.', code: 200 })
  }

  /** Link the board the scout tagged for it. */
  async link() {
    const prospect = await this.mine()
    const data = await this.validate({ boardId: 'required|string' })

    await Pipeline.link(prospect, this.user, String(data.boardId))

    return new ProspectResource(await this.fresh(prospect.id)).additional({ status: 'success', message: 'Board linked. Its stage follows the board now.', code: 200 })
  }

  async destroy() {
    await (await this.mine()).delete()

    return new GenericResource({}).additional({ status: 'success', message: 'Removed from your pipeline.', code: 200 })
  }

  /** The territories staff gave the scout. */
  async territories() {
    const territories = (await Territory.query().where({ scoutId: this.user.id }).oldest('name').limit(100).get()).all()
    const names = await TerritoryCollection.names(territories)

    return new GenericResource(territories.map((territory) => TerritoryCollection.present(territory, names.get(this.user.id) ?? null))).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** What needs doing on the boards the account looks after and in its pipeline. */
  async tasks() {
    return new GenericResource(await Tasks.for(this.user)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  private input(data: Record<string, unknown>): ProspectInput {
    const text = (key: string) => (key in data ? (data[key] === null || data[key] === undefined ? null : String(data[key])) : undefined)

    return {
      name: data.name === undefined ? undefined : String(data.name),
      latitude: data.latitude === undefined ? undefined : Number(data.latitude),
      longitude: data.longitude === undefined ? undefined : Number(data.longitude),
      address: text('address'),
      ownerName: text('ownerName'),
      ownerPhone: text('ownerPhone'),
      notes: text('notes'),
      stage: (data.stage as ProspectStage | undefined) || undefined,
    }
  }

  private async fresh(id: string): Promise<Prospect> {
    return (await Pipeline.of(this.user).where({ id }).first())!
  }

  private async mine(): Promise<Prospect> {
    const prospect = await Prospect.query().where({ id: String(this.params.prospect), scoutId: this.user.id }).first()

    if (!prospect) throw new RequestException('Prospect not found.', 404)

    return prospect
  }
}
