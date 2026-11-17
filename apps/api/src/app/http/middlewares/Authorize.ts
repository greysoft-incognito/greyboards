import type { NextFunction, Request, Response } from 'express'
import type { AccountRoleKind } from '@app/models/AccountRole'
import type { PermissionName } from '@app/policies/Permission'
import { RequestException } from '@arkstack/common'
import type { User } from '@app/models/User'

/**
 * Lets a request through only when the signed-in user may make it: their admin role grants
 * one of the given permissions (`to`), or they hold one of the given marketplace roles and
 * it is active (`actingAs`). Goes after the `auth` middleware.
 */
export class Authorize {
  constructor(readonly check: (user: User) => Promise<boolean>) {}

  static to(...permissions: PermissionName[]) {
    return new Authorize(async (user) => {
      const granted = await user.permissions()

      return permissions.some((permission) => granted.includes(permission))
    }).middleware()
  }

  static actingAs(...kinds: AccountRoleKind[]) {
    return new Authorize(async (user) => {
      for (const kind of kinds) if (await user.actsAs(kind)) return true

      return false
    }).middleware()
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => this.handler(req, res, next).catch(next)
  }

  async handler(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user as User | undefined

    if (!user) return next(new RequestException('Unauthenticated.', 401))
    if (!(await this.check(user))) return next(new RequestException('You do not have access to this.', 403))

    next()
  }
}
