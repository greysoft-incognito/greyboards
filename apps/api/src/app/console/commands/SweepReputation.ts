import { Command } from '@h3ravel/musket'
import { Reputation } from '@app/services/Reputation'

/** What the schedule runs: gives the proven badge to roles that reached the milestones, and takes it from roles that fell below. */
export class SweepReputationCommand extends Command {
  signature = 'reputation:sweep'

  description = 'Give or take the proven badge by the reputation milestones'

  async handle() {
    const { proven, revoked } = await Reputation.sweep()

    this.success(`Proved ${proven} ${proven === 1 ? 'role' : 'roles'} and took the badge from ${revoked}.`)
  }
}
