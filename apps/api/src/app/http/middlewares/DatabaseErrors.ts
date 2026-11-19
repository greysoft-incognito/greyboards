import type { NextFunction, Request, Response } from 'express'
import { RequestException } from '@arkstack/common'

/**
 * Turns database errors caused by the request itself into client errors, so an id
 * that can't exist reads as not found instead of a server error that shows the query's message.
 */
export class DatabaseErrors {
  /** Postgres codes for a value that doesn't fit its column type, such as a malformed uuid or date. */
  static readonly INVALID_INPUT = ['22P02', '22007', '22008']

  handler() {
    return (error: unknown, _req: Request, _res: Response, next: NextFunction) => next(DatabaseErrors.isInvalidInput(error) ? new RequestException('Not found.', 404) : error)
  }

  /** The query failed on a value the request sent. The ORM keeps the driver's error as `cause`. */
  static isInvalidInput(error: unknown): boolean {
    const failure = error as { code?: unknown; cause?: { code?: unknown } } | null

    return [failure?.cause?.code, failure?.code].some((code) => DatabaseErrors.INVALID_INPUT.includes(String(code)))
  }
}
