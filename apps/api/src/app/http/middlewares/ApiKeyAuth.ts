import type { NextFunction, Request, Response } from 'express'
import type { ApiAbility } from '@app/models/ApiKey'
import { ApiKeys } from '@app/services/ApiKeys'

/**
 * Signs a public API request in with its API key, in place of the `auth` middleware, when the
 * key may do `ability`. The account then acts as if signed in, so the usual checks still apply.
 */
export const apiKey = (ability: ApiAbility) => (req: Request, _res: Response, next: NextFunction) => {
  ApiKeys.authenticate(req.headers.authorization, ability)
    .then(({ user, key }) => {
      ;(req as any).user = user
      ;(req as any).apiKey = key
      next()
    })
    .catch(next)
}
