import { useEffect, useState } from 'react'
import type { AccountRoleDefinition } from '@greyboards/types'
import { api } from './api'

/** The marketplace roles anyone can take, from the public `/account-roles`. Empty until loaded. */
export function useRoleDefinitions() {
  const [definitions, setDefinitions] = useState<AccountRoleDefinition[]>([])

  useEffect(() => {
    api
      .accountRoles()
      .send()
      .then(({ data }) => setDefinitions(data))
      .catch(() => undefined)
  }, [])

  return definitions
}
