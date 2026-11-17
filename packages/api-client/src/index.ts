import { createGreyboardsAlova, type GreyboardsClientOptions } from './client'
import { createEndpoints } from './endpoints'

export * from './client'
export * from './endpoints'

/** Create an alova instance plus typed endpoints in one call. */
export function createGreyboardsClient(options: GreyboardsClientOptions) {
  const alova = createGreyboardsAlova(options)
  return { alova, api: createEndpoints(alova) }
}

export type GreyboardsClient = ReturnType<typeof createGreyboardsClient>
