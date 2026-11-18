import { ScreenPlayer, type PlayInput } from '@app/services/ScreenPlayer'
import { Day } from '@app/support/Day'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'

/**
 * For the software that runs a digital screen. It signs in with the board's player token in
 * `Authorization: Bearer gbp_…`, not a person's account.
 */
export default class PlayerController extends BaseController {
  /** What plays today, or on `day`: each booking's slots, hours and artwork. */
  async schedule() {
    const board = await ScreenPlayer.boardFor(this.ctx.req.headers.authorization)
    const query = await this.validateQuery({ day: 'nullable|date' })

    return new GenericResource(await ScreenPlayer.schedule(board, query.day ? Day.of(String(query.day)) : Day.today())).additional({
      status: 'success',
      message: 'OK',
      code: 200,
    })
  }

  /** Report plays: `{ plays: [{ bookingId, playedAt, durationMs }] }`. */
  async plays() {
    const board = await ScreenPlayer.boardFor(this.ctx.req.headers.authorization)
    const data = await this.validate({
      plays: 'required|array|min:1',
      'plays.*.bookingId': 'required|string|max:64',
      'plays.*.playedAt': 'required|date',
      'plays.*.durationMs': 'required|integer|min:0|max:3600000',
    })
    const result = await ScreenPlayer.record(board, data.plays as PlayInput[])

    return new GenericResource(result).additional({ status: 'success', message: `${result.accepted} plays logged`, code: 200 })
  }
}
