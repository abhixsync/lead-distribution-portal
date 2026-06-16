import type { AxiosInstance } from 'axios'

/**
 * In-memory mock of the HubSpot CRM API.
 *
 * Enabled by setting `HUBSPOT_MOCK=true`. It implements just the subset of
 * endpoints the sync pipeline uses (contact/company search + create + update +
 * association) so leads can flow PENDING → SYNCED end-to-end WITHOUT a real
 * HubSpot account or any OAuth token. Useful for local development and demos.
 *
 * State lives in module-scope Maps, so it survives for the life of the server
 * process (or a single serverless instance). Restarting the dev server clears it.
 *
 * Dedup mirrors the real integration: contacts are keyed by email, companies by
 * (lower-cased) name — so re-submitting the same email/company returns the same
 * mock ID instead of creating a duplicate, exactly like the production path.
 */

interface MockObject {
  id: string
  properties: Record<string, unknown>
  createdAt: string
  updatedAt: string
  archived: boolean
}

const contactsByEmail = new Map<string, MockObject>()
const companiesByName = new Map<string, MockObject>()
const associations: Array<{ contactId: string; companyId: string }> = []

let seq = 1000
function nextId(prefix: string): string {
  seq += 1
  return `mock-${prefix}-${seq}`
}

function makeObject(properties: Record<string, unknown>, prefix: string): MockObject {
  return {
    id: nextId(prefix),
    properties,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    archived: false,
  }
}

/** Wrap a payload in the minimal axios-response shape the callers read (`.data`). */
function response<T>(data: T) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handlePost(url: string, body: any) {
  if (url.endsWith('/contacts/search')) {
    const email = body?.filterGroups?.[0]?.filters?.[0]?.value as string | undefined
    const found = email ? contactsByEmail.get(email) : undefined
    return response(found ? { total: 1, results: [found] } : { total: 0, results: [] })
  }

  if (url.endsWith('/companies/search')) {
    const name = body?.filterGroups?.[0]?.filters?.[0]?.value as string | undefined
    const found = name ? companiesByName.get(name.toLowerCase()) : undefined
    return response(found ? { total: 1, results: [found] } : { total: 0, results: [] })
  }

  if (url.endsWith('/objects/contacts')) {
    const props = (body?.properties ?? {}) as Record<string, unknown>
    const record = makeObject(props, 'contact')
    if (typeof props.email === 'string') contactsByEmail.set(props.email, record)
    return response(record)
  }

  if (url.endsWith('/objects/companies')) {
    const props = (body?.properties ?? {}) as Record<string, unknown>
    const record = makeObject(props, 'company')
    if (typeof props.name === 'string') companiesByName.set(props.name.toLowerCase(), record)
    return response(record)
  }

  throw new Error(`[HubSpot mock] Unhandled POST ${url}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handlePatch(url: string, body: any) {
  // Update an existing contact/company. Just echo it back.
  const id = url.split('/').pop()
  return response({ id, properties: body?.properties ?? {} })
}

function handlePut(url: string) {
  // Contact↔Company association. Record it and return success.
  const match = url.match(/contacts\/([^/]+)\/associations\/companies\/([^/]+)\//)
  if (match) associations.push({ contactId: match[1], companyId: match[2] })
  return response({})
}

/**
 * Returns an object shaped like the slice of AxiosInstance the HubSpot helpers
 * call. Cast to AxiosInstance at the call site — only post/patch/put/get are used.
 */
export function createMockHubSpotClient(): AxiosInstance {
  const client = {
    post: (url: string, body?: unknown) => handlePost(url, body),
    patch: (url: string, body?: unknown) => handlePatch(url, body),
    put: (url: string) => handlePut(url),
    get: () => response({}),
  }
  return client as unknown as AxiosInstance
}
