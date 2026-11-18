import type { PrintOffer } from '@app/models/PrintOffer'
import { Collection } from './Collection'
import { PrintOfferResource } from './PrintOfferResource'

export class PrintOfferCollection extends Collection {
  collects = PrintOfferResource

  private job = false

  withJob(): this {
    this.job = true

    return this
  }

  data() {
    return (this.items() as PrintOffer[]).map((offer) => (this.job ? new PrintOfferResource(offer).withJob() : new PrintOfferResource(offer)).data()) as never
  }
}
