import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

/** pnpm's own npm_config_* settings make npm warn on every npx call, so the CLI runs directly without them. */
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key)))

/** Runs an `ark` console command for a test and returns what it printed. */
export const ark = (...args: string[]) => execFileSync(join(process.cwd(), 'node_modules/.bin/ark'), args, { cwd: process.cwd(), encoding: 'utf8', env })
