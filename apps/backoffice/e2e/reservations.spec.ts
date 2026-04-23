/**
 * Reservation API e2e tests.
 *
 * Authenticates by minting a Director JWT directly (no browser, no login round-trip).
 * All test reservations are created on 2099-12-25 and cleaned up in afterAll.
 *
 * Overlap semantics: [start, end) — adjacent slots (end1 == start2) are allowed.
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { SignJWT } from 'jose'

// ── Constants ────────────────────────────────────────────────────────────────

// Establishment that exists in the dev DB (first seeded establishment)
const EID = '655f35db-7cbe-4fb1-907b-4be03f4a8c41'

// Same secret used by the app
const SECRET = new TextEncoder().encode('klyro-super-secret-jwt-2025-arthur-capri')

// Far-future date so no "past date" errors and no clash with production data
const TEST_DATE = '2099-12-25'

// ── Shared state ─────────────────────────────────────────────────────────────

let api: APIRequestContext
let authCookie: string
const createdIds: string[] = []

// ── Helpers ──────────────────────────────────────────────────────────────────

/** ISO timestamp for a given HH:MM on the test date (UTC). */
function at(hhmm: string) {
  return `${TEST_DATE}T${hhmm}:00.000Z`
}

/** POST /api/reservations and track the ID for cleanup. */
async function createReservation(
  startHHMM: string,
  durationMin = 120,
  extra: Record<string, unknown> = {}
) {
  const res = await api.post('/api/reservations', {
    headers: { Cookie: authCookie },
    data: {
      customerName: 'Test Client',
      partySize: 2,
      reservedAt: at(startHHMM),
      durationMin,
      ...extra,
    },
  })
  if (res.ok()) {
    const body = (await res.json()) as { reservation: { id: string } }
    createdIds.push(body.reservation.id)
    return { res, id: body.reservation.id }
  }
  return { res, id: null }
}

/** PATCH /api/reservations/:id */
async function patchReservation(id: string, data: Record<string, unknown>) {
  return api.patch(`/api/reservations/${id}`, {
    headers: { Cookie: authCookie },
    data,
  })
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

test.beforeAll(async ({ playwright }) => {
  // Mint a Director JWT so requirePermission always passes without DB lookup
  const token = await new SignJWT({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'e2e@staffizi.test',
    role: 'DIRECTOR',
    establishmentId: EID,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET)

  authCookie = `staffizi_session=${token}`
  api = await playwright.request.newContext({ baseURL: 'http://localhost:3001' })
})

test.afterAll(async () => {
  // Delete all reservations created during the test run
  await Promise.allSettled(
    createdIds.map((id) =>
      api.delete(`/api/reservations/${id}`, { headers: { Cookie: authCookie } })
    )
  )
  await api.dispose()
})

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('1. Double booking prevention', () => {
  test('refuses an overlapping reservation (409)', async () => {
    // Slot 12:00–14:00 (2h)
    const { id: firstId } = await createReservation('12:00', 120)
    expect(firstId).not.toBeNull()

    // Slot 12:30–14:30 — overlaps by 90 min → must be rejected
    const { res } = await createReservation('12:30', 120)
    expect(res.status()).toBe(409)

    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('allows a reservation in an adjacent slot (200)', async () => {
    // 14:00–16:00 is adjacent to the 12:00–14:00 created above — must succeed
    const { res } = await createReservation('14:00', 120)
    expect(res.status()).toBe(201)
  })
})

test.describe('2. Status state machine', () => {
  // Each sub-test creates its own reservation on a distinct non-overlapping slot

  test('PENDING → CONFIRMED is allowed', async () => {
    const { id } = await createReservation('07:00', 15)
    expect(id).not.toBeNull()

    const res = await patchReservation(id!, { status: 'CONFIRMED' })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { reservation: { status: string } }
    expect(body.reservation.status).toBe('CONFIRMED')
  })

  test('PENDING → CANCELLED is allowed', async () => {
    const { id } = await createReservation('07:15', 15)
    expect(id).not.toBeNull()

    const res = await patchReservation(id!, { status: 'CANCELLED' })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { reservation: { status: string } }
    expect(body.reservation.status).toBe('CANCELLED')
  })

  test('CONFIRMED → COMPLETED is allowed', async () => {
    const { id } = await createReservation('07:30', 15)
    expect(id).not.toBeNull()

    await patchReservation(id!, { status: 'CONFIRMED' })
    const res = await patchReservation(id!, { status: 'COMPLETED' })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { reservation: { status: string } }
    expect(body.reservation.status).toBe('COMPLETED')
  })

  test('CONFIRMED → CANCELLED is allowed', async () => {
    const { id } = await createReservation('07:45', 15)
    expect(id).not.toBeNull()

    await patchReservation(id!, { status: 'CONFIRMED' })
    const res = await patchReservation(id!, { status: 'CANCELLED' })
    expect(res.status()).toBe(200)
  })

  test('COMPLETED → PENDING is refused (422)', async () => {
    const { id } = await createReservation('08:00', 15)
    expect(id).not.toBeNull()

    await patchReservation(id!, { status: 'CONFIRMED' })
    await patchReservation(id!, { status: 'COMPLETED' })

    const res = await patchReservation(id!, { status: 'PENDING' })
    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('CANCELLED → CONFIRMED is refused (422)', async () => {
    const { id } = await createReservation('08:15', 15)
    expect(id).not.toBeNull()

    await patchReservation(id!, { status: 'CANCELLED' })

    const res = await patchReservation(id!, { status: 'CONFIRMED' })
    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

test.describe('3. Past-date guard', () => {
  test('refuses a reservation set to yesterday (422)', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const pastISO = yesterday.toISOString()

    const res = await api.post('/api/reservations', {
      headers: { Cookie: authCookie },
      data: {
        customerName: 'Test Client',
        partySize: 2,
        reservedAt: pastISO,
        durationMin: 120,
      },
    })

    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('refuses a reservation more than 5 min in the past (422)', async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60_000).toISOString()

    const res = await api.post('/api/reservations', {
      headers: { Cookie: authCookie },
      data: {
        customerName: 'Test Client',
        partySize: 2,
        reservedAt: sixMinAgo,
        durationMin: 120,
      },
    })

    expect(res.status()).toBe(422)
  })
})

test.describe('4. Overlap on reschedule', () => {
  test('refuses rescheduling into an occupied slot (409)', async () => {
    // resa1: 20:00–22:00 (far from other test slots)
    const { id: id1 } = await createReservation('20:00', 120)
    expect(id1).not.toBeNull()

    // resa2: 22:00–00:00 (adjacent to resa1 — must succeed)
    const { id: id2, res: res2 } = await createReservation('22:00', 120)
    expect(res2.status()).toBe(201)
    expect(id2).not.toBeNull()

    // Reschedule resa2 to 20:30 — overlaps with resa1 (20:00–22:00) → 409
    const res = await patchReservation(id2!, {
      reservedAt: at('20:30'),
      durationMin: 120,
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('allows rescheduling to a non-conflicting slot (200)', async () => {
    // resa3: 18:00–19:00 (before the 20:00 block, no conflict)
    const { id: id3 } = await createReservation('18:00', 60)
    expect(id3).not.toBeNull()

    // Reschedule resa3 to 17:00 — no conflict → 200
    const res = await patchReservation(id3!, {
      reservedAt: at('17:00'),
      durationMin: 60,
    })
    expect(res.status()).toBe(200)
  })
})
