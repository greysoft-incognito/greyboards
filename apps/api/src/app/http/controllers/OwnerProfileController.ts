import { OwnerProfile } from '@app/models/OwnerProfile'
import { OwnerProfileCollection } from '@app/http/resources/OwnerProfileCollection'
import { OwnerProfileResource } from '@app/http/resources/OwnerProfileResource'
import { OwnerSuggestionCollection } from '@app/http/resources/OwnerSuggestionCollection'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { perPage } from '@arkstack/common'
import { regex } from 'kanun'

const PHONE = regex(/^\+?[0-9 ()-]{7,20}$/)

/**
 * Owner profiles: suggestions while tagging, the profiles an account manages, and
 * claiming the profile a scout made, by proving its phone number.
 */
export default class OwnerProfileController extends BaseController {
  /** Owners whose name or number matches what was typed, with the most boards first. */
  async suggest() {
    const filters = await this.validateQuery({ search: 'required|string|min:2|max:60' })
    const owners = await OwnerProfile.scope('matching', String(filters.search).trim())
      .withCount('boards')
      .orderByRaw('(select count(*) from boards where boards.owner_profile_id = owner_profiles.id)', [], 'desc')
      .orderByRaw('lower(name)', [], 'asc')
      .limit(OwnerProfile.SUGGESTIONS)
      .get()

    return new OwnerSuggestionCollection(owners.all()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async index() {
    const profiles = await OwnerProfile.query()
      .where({ userId: this.user.id })
      .oldest('createdAt')
      .paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new OwnerProfileCollection(profiles).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Add an owner the account manages, such as an agency's client. */
  async create() {
    const data = await this.validate({ name: 'required|string|min:2|max:120' })
    const profile = await OwnerProfile.query().create({ name: String(data.name).trim(), userId: this.user.id, createdById: this.user.id, claimedAt: new Date() })

    return new OwnerProfileResource(profile).additional({ status: 'success', message: 'Owner added', code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const profile = await OwnerProfile.managedBy(this.user, String(this.params.profile))
    const data = await this.validate({ name: 'required|string|min:2|max:120' })

    await profile.update({ name: String(data.name).trim() })

    return new OwnerProfileResource(profile).additional({ status: 'success', message: 'Saved', code: 200 })
  }

  /** Text a code to the number on an unclaimed profile. */
  async startClaim() {
    const data = await this.validate({ phone: ['required', 'string', PHONE] })

    await OwnerProfile.startClaim(String(data.phone))

    return new GenericResource({ sent: true }).additional({ status: 'success', message: 'We’ve texted a code to that number.', code: 200 })
  }

  async finishClaim() {
    const data = await this.validate({ phone: ['required', 'string', PHONE], code: 'required|digits:6' })
    const profile = await OwnerProfile.finishClaim(this.user, String(data.phone), String(data.code))

    return new OwnerProfileResource(profile).additional({ status: 'success', message: `You now manage ${profile.name}’s boards.`, code: 200 })
  }
}
