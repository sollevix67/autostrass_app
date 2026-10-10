import { deepEqual } from 'node:assert/strict'
import { toHttpError } from '../server/repositories/mapping.js'

const databaseUnavailable = { status: 503, code: 'DATABASE_UNAVAILABLE' }

for (const code of [
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EPIPE',
  'ER_CON_COUNT_ERROR',
  'ER_HOST_NOT_PRIVILEGED',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]) {
  deepEqual(toHttpError({ code }), databaseUnavailable, `${code} should be a 503`)
}

deepEqual(
  toHttpError({ code: 'DRIZZLE_QUERY_ERROR', cause: { code: 'ETIMEDOUT' } }),
  databaseUnavailable,
  'wrapped connection errors should be a 503',
)
deepEqual(toHttpError({ code: 'ER_DUP_ENTRY' }), { status: 409, code: 'ALREADY_EXISTS' })
deepEqual(toHttpError({ code: 'ER_NO_REFERENCED_ROW_2' }), { status: 422, code: 'UNKNOWN_REFERENCE' })
deepEqual(toHttpError(new Error('unexpected')), { status: 500, code: 'INTERNAL_ERROR' })

console.log('Database error mapping tests passed.')
