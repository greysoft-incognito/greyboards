import { Board } from '@app/models/Board'
import { Offer, type OfferStatus } from '@app/models/Offer'
import { BookingResource } from '@app/http/resources/BookingResource'
import { OfferCollection } from '@app/http/resources/OfferCollection'
import { OfferResource } from '@app/http/resources/OfferResource'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Day } from '@app/support/Day'
import { UUID } from '@app/support/rules'
import { BaseController } from './BaseController'
import { RequestException, perPage } from '@arkstack/common'
import type { QueryBuilder } from 'arkormx'

const STATUSES: OfferStatus[] = ['pending', 'countered', 'accepted', 'declined', 'withdrawn', 'expired']

/** Advertisers offer below a board's listed price; whoever looks after it accepts, declines or counters. */
export default class OfferController extends BaseController {
  async create() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const data = await this.validate({
      faceId: ['nullable', UUID],
      startsOn: 'required|date',
      periods: 'required|integer|min:1|max:52',
      amountMinor: 'required|integer|min:1',
      note: 'nullable|string|max:500',
    })

    if (!(await BoardPolicy.view(this.user, board))) throw new RequestException('Board not found.', 404)

    const face = await board.faceFor(data.faceId ? String(data.faceId) : null)
    const offer = await Offer.make(board, face, this.user, {
      startsOn: Day.of(String(data.startsOn)),
      periods: Number(data.periods),
      amountMinor: Number(data.amountMinor),
      note: data.note ? String(data.note) : null,
    })

    return new OfferResource(offer).for(this.user).onBoard(board).additional({ status: 'success', message: 'Offer sent.', code: 201 }).response().setStatusCode(201)
  }

  /** Offers the account made, newest first. */
  async index() {
    await Offer.expireDue()

    const query = Offer.scope('madeBy', this.user)

    return this.page(query, await this.validateQuery({ status: `nullable|in:${STATUSES.join(',')}` }))
  }

  /** Offers on boards the account tagged or owns, the ones waiting first. */
  async onMyBoards() {
    await Offer.expireDue()

    const query = Offer.scope('onBoardsOf', this.user).orderByRaw("case when status in ('pending', 'countered') then 0 else 1 end")

    return this.page(query, await this.validateQuery({ status: `nullable|in:${STATUSES.join(',')}` }))
  }

  async accept() {
    const offer = await this.offer()
    const booking = await offer.accept(this.user)
    const message = this.user.id === offer.advertiserId ? 'Counter accepted. Pay to book the dates.' : 'Offer accepted. The advertiser has been given time to pay.'

    return new BookingResource(booking).additional({ status: 'success', message, code: 200 })
  }

  async decline() {
    const offer = await this.offer()

    await offer.decline(this.user)

    return new OfferResource(offer).for(this.user).additional({ status: 'success', message: 'Offer declined.', code: 200 })
  }

  async counter() {
    const offer = await this.offer()
    const data = await this.validate({ amountMinor: 'required|integer|min:1' })

    await offer.counter(this.user, Number(data.amountMinor))

    return new OfferResource(offer).for(this.user).additional({ status: 'success', message: 'Counter sent.', code: 200 })
  }

  async withdraw() {
    const offer = await this.offer()

    await offer.withdraw(this.user)

    return new OfferResource(offer).for(this.user).additional({ status: 'success', message: 'Offer withdrawn.', code: 200 })
  }

  private async page(query: QueryBuilder<Offer>, filters: { status?: unknown }) {
    if (filters.status) query.where({ status: filters.status as OfferStatus })

    const offers = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new OfferCollection(offers).for(this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The offer in the address, if the account made it or looks after its board. */
  private async offer(): Promise<Offer> {
    const offer = await Offer.query().find(String(this.params.offer))
    const board = offer ? await Board.query().find(offer.boardId) : null
    const sees = !!offer && (offer.advertiserId === this.user.id || (!!board && (await BoardPolicy.manages(this.user, board))))

    if (!sees) throw new RequestException('Offer not found.', 404)

    return offer!
  }
}
