import { Command } from '@h3ravel/musket'
import { Payouts } from '@app/services/Payouts'

/** What the schedule runs: sends shares owed past the hold days to bank accounts and checks transfers on their way. */
export class SendPayoutsCommand extends Command {
  signature = 'payouts:send'

  description = 'Send money owed to bank accounts and check transfers still on their way'

  async handle() {
    const sent = await Payouts.send()
    const tracked = await Payouts.track()

    this.success(`Sent ${sent} ${sent === 1 ? 'payout' : 'payouts'} and checked ${tracked} on their way.`)
  }
}
