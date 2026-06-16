# Lead Distribution Portal

A production-quality full-stack lead capture and CRM synchronization system.

## Architecture

Deployed serverless (Vercel). The dashboard stays current by polling the REST
API; HubSpot sync runs in the background via `after()` with a Vercel Cron job as
a durable recovery net.

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client                          │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  Public Lead Form   │  │  Admin Dashboard (/dashboard)│  │
│  │       (/)           │  │  Stats + Live Table + HubSpot│  │
│  └──────────┬──────────┘  └──────────────┬──────────────┘  │
│             │ POST /api/leads     polls   │ GET /api/leads   │
│             │                     (~5s)   │     /api/stats   │
└─────────────┼─────────────────────────────┼─────────────────┘
              │                             │
┌─────────────▼─────────────────────────────▼─────────────────┐
│              Next.js App Router (serverless)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  API Routes                                          │    │
│  │  ├── POST /api/leads  (public) ── after() ─┐        │    │
│  │  ├── GET  /api/leads  (admin)              │        │    │
│  │  ├── GET  /api/stats  (admin)              ▼        │    │
│  │  ├── POST /api/auth/login        syncLeadToHubSpot()│    │
│  │  ├── GET  /api/cron/sync (cron) ──┘ (atomic claim)  │    │
│  │  └── /api/hubspot/*   (OAuth + manual sync)         │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
    ┌─────────────┐  ┌──────────┐   ┌──────────────┐
    │  PostgreSQL │  │  Prisma  │   │  HubSpot API │
    │  (Database) │  │   ORM    │   │  (CRM Sync)  │
    └─────────────┘  └──────────┘   └──────────────┘
```

### ER Diagram

```mermaid
erDiagram
    Lead {
        String id PK
        String firstName
        String lastName
        String email UK
        String companyName
        BudgetRange budgetRange
        LeadStatus status
        String hubspotContactId
        String hubspotCompanyId
        HubSpotSyncStatus hubspotStatus
        String hubspotError
        Int syncAttempts
        DateTime createdAt
        DateTime updatedAt
    }
    Settings {
        String id PK
        String hubspotAccessToken
        String hubspotRefreshToken
        DateTime hubspotTokenExpiry
        Boolean hubspotConnected
        DateTime lastSyncAt
        DateTime updatedAt
    }
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Polling (not WebSockets) | Serverless has no persistent process to host Socket.IO; the dashboard polls `/api/leads` + `/api/stats` every ~5s |
| `after()` for inline sync | Returns 201 immediately, then runs the HubSpot sync in the background while the function stays alive |
| Vercel Cron recovery job | `/api/cron/sync` re-syncs PENDING/FAILED and re-claims leads orphaned in PROCESSING — the durable safety net if `after()` is killed |
| Atomic claim (`updateMany`) | Flips a lead to PROCESSING only if claimable; makes concurrent triggers (inline + cron + manual) idempotent — no duplicate syncs |
| OAuth `state` parameter | Single-use value in an httpOnly cookie, verified on callback — prevents CSRF / auth-code injection |
| Middleware fails closed | Missing `JWT_SECRET` denies all protected requests rather than verifying against a fallback secret |
| Prisma `globalThis` cache | Prevents connection-pool exhaustion from Next.js hot-reload |
| `jose` for JWT | Next.js middleware runs on Edge Runtime — no Node.js `crypto` module available |
| Zod schema shared client+server | Single validation rule source, no duplication |
| Exponential backoff (3 retries) | Handles transient HubSpot API failures gracefully |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### 1. Clone and install

```bash
git clone <repo>
cd z1tech-assessment
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/leadportal
ADMIN_PASSWORD=your-admin-password
JWT_SECRET=at-least-32-chars-random-string
CRON_SECRET=random-string-protecting-the-cron-endpoint
NEXT_PUBLIC_APP_URL=http://localhost:3000

# HubSpot — fill in after creating a developer app (see below)
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/callback
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

App is now running at **http://localhost:3000**

- **Public form:** http://localhost:3000
- **Admin dashboard:** http://localhost:3000/dashboard/login

---

## HubSpot Setup

### Step 1: Create a HubSpot Developer App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com)
2. Create a new app
3. Under **Auth**, add a redirect URL: `http://localhost:3000/api/hubspot/callback`
4. Under **Scopes**, add:
   - `crm.objects.contacts.write`
   - `crm.objects.contacts.read`
   - `crm.objects.companies.write`
   - `crm.objects.companies.read`
   - `crm.objects.associations.write`
5. Copy **Client ID** and **Client Secret** into your `.env`

### Step 2: Create the `annual_budget` custom property

1. In your HubSpot portal: **Settings → Properties → Contacts**
2. Click **Create property**
3. Set:
   - **Label:** Annual Budget
   - **Internal name:** `annual_budget`
   - **Field type:** Single-line text
4. Save

> This property is required for lead budget data to sync to HubSpot contacts.

### Step 3: Connect via OAuth

1. Log into the admin dashboard
2. In the **HubSpot CRM** widget, click **Connect HubSpot**
3. Authorize the app in HubSpot
4. You'll be redirected back to the dashboard with a success message
5. Click **Test Connection** to verify everything works

### OAuth Flow

```
Dashboard → POST /api/hubspot/connect → generates state (httpOnly cookie) → returns authUrl
Browser redirects to HubSpot OAuth
User grants access
HubSpot redirects to GET /api/hubspot/callback?code=...&state=...
Server verifies state against the cookie (CSRF guard), then exchanges code for tokens
Tokens stored in Settings DB row
Redirect to /dashboard?hubspot_connected=true
```

---

## API Documentation

### Public Endpoints (no auth required)

#### `POST /api/leads`

Create a new lead and trigger async HubSpot sync.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@acmecorp.com",
  "companyName": "Acme Corp",
  "budgetRange": "UNDER_10K"
}
```
`budgetRange` values: `UNDER_10K` | `BETWEEN_10K_50K` | `GREATER_50K`

**Responses:**
- `201` — Lead created
- `409` — Email already submitted
- `422` — Validation error (blocked email domain, missing fields)

---

### Admin Endpoints (JWT cookie required)

#### `POST /api/auth/login`
```json
{ "password": "your-admin-password" }
```
Sets `admin-token` httpOnly cookie on success.

#### `POST /api/auth/logout`
Clears the auth cookie.

#### `GET /api/leads`
Returns all leads ordered by creation date.

Query params: `?status=PENDING|PROCESSING|SYNCED|FAILED`, `?limit=100`, `?offset=0`

#### `GET /api/stats`
```json
{
  "total": 42,
  "synced": 35,
  "failed": 3,
  "pending": 3,
  "processing": 1,
  "pipeline": 1245000
}
```
`pipeline` = sum of budget midpoints (UNDER_10K=5000, BETWEEN_10K_50K=30000, GREATER_50K=75000)

#### `POST /api/hubspot/connect`
Returns `{ authUrl: "https://app.hubspot.com/oauth/authorize?..." }`

#### `GET /api/hubspot/callback`
Handles OAuth redirect from HubSpot. Verifies the `state` param against the
httpOnly cookie set by `/connect` (CSRF guard), then exchanges code for tokens.

#### `GET /api/hubspot/status`
```json
{
  "status": "connected",
  "connected": true,
  "hasAccessToken": true,
  "tokenExpiry": "2026-06-09T10:00:00.000Z",
  "tokenExpired": false,
  "lastSyncAt": "2026-06-08T09:00:00.000Z"
}
```

#### `POST /api/hubspot/test`
Tests token validity and verifies `annual_budget` property exists.

#### `POST /api/hubspot/sync`
Manually triggers sync for all leads needing it (`PENDING`, `FAILED`, or
orphaned `PROCESSING`). Responds immediately with `{ triggered }`; the syncs run
in the background and the dashboard reflects them on its next poll.

---

### Cron Endpoint (CRON_SECRET required)

#### `GET /api/cron/sync`

Durable recovery job triggered by Vercel Cron (see `vercel.json`). Re-syncs every
lead that still needs it — including leads stuck in `PROCESSING` because their
inline `after()` sync was killed mid-flight. Authenticated via
`Authorization: Bearer <CRON_SECRET>` (Vercel sends this automatically). Each
sync re-claims atomically, so overlapping runs are safe.

> **Self-hosting note:** outside Vercel, nothing triggers this automatically —
> schedule an external cron (or container sidecar) to `GET /api/cron/sync` with
> the bearer secret.

---

## Database Commands

```bash
# Create/apply migrations (development)
npm run db:migrate

# Apply existing migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (GUI)
npm run db:studio

# Push schema changes without migration (prototyping only)
npm run db:push

# Regenerate Prisma client after schema changes
npm run db:generate
```

---

## Docker Deployment

### Prerequisites

- Docker 24+
- Docker Compose v2

### Setup

1. Copy and edit the environment file:

```bash
cp .env.example .env
# Edit .env with production values
```

Minimum required values:
```env
POSTGRES_PASSWORD=strong-random-password
ADMIN_PASSWORD=strong-admin-password
JWT_SECRET=32-char-minimum-random-string
NEXT_PUBLIC_APP_URL=https://your-domain.com
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
HUBSPOT_REDIRECT_URI=https://your-domain.com/api/hubspot/callback
```

2. Build and start:

```bash
docker compose up --build -d
```

3. Check logs:

```bash
docker compose logs -f app
```

4. The app runs migrations automatically on startup via:
   ```
   npx prisma migrate deploy && node server.js
   ```
   (`server.js` is Next.js's generated standalone server.)

### Services

| Service | Port | Description |
|---|---|---|
| `app` | 3000 | Next.js (standalone) |
| `postgres` | 5432 | PostgreSQL 17 |

### Stopping

```bash
docker compose down          # Stop containers
docker compose down -v       # Stop and delete database volume
```

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

| File | What's Tested |
|---|---|
| `tests/unit/validations.test.ts` | Email domain blocking, required fields, budget ranges |
| `tests/unit/stats.test.ts` | Pipeline value calculation per budget range |
| `tests/unit/hubspot-sync.test.ts` | Retry logic, backoff, FAILED/SYNCED status transitions |
| `tests/integration/leads-api.test.ts` | POST 201/422/409, GET with pagination, P2002 race condition |
| `tests/components/LeadForm.test.tsx` | Form rendering, blocked email, success/error states |
| `tests/components/StatsCards.test.tsx` | Stats display, loading state, pipeline formatting |
| `tests/components/LeadsTable.test.tsx` | Row rendering, badge colors, empty state, error state |
| `tests/components/HubSpotWidget.test.tsx` | Connection states, button enable/disable, connect flow |

---

## Project Structure

```
z1tech-assessment/
├── vercel.json                  # Vercel Cron schedule for /api/cron/sync
├── prisma/
│   ├── schema.prisma            # Lead + Settings models
│   └── migrations/              # SQL migration files
├── src/
│   ├── middleware.ts            # Edge JWT auth guard (fails closed)
│   ├── types/                   # Shared TypeScript types
│   ├── lib/
│   │   ├── prisma.ts            # PrismaClient singleton
│   │   ├── stats.ts             # Pipeline calculator
│   │   ├── auth/jwt.ts          # signJWT / verifyJWT (jose)
│   │   ├── validations/         # Zod schemas (shared client+server)
│   │   └── hubspot/             # OAuth, contacts, companies, sync (atomic claim)
│   ├── app/
│   │   ├── page.tsx             # Public lead form
│   │   ├── dashboard/           # Admin dashboard pages
│   │   └── api/                 # All API route handlers (incl. cron/sync)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── lead-form/           # Public form component
│   │   ├── auth/                # Login form
│   │   └── dashboard/           # Stats, table, HubSpot widget
│   └── hooks/                   # useLeads, useStats, useHubSpotStatus (polling)
├── tests/                       # Unit, integration, component tests
├── Dockerfile                   # Multi-stage production build
└── docker-compose.yml           # App + PostgreSQL services
```

---

## Live Updates & Durable Sync

The dashboard polls `/api/leads` and `/api/stats` every ~5 seconds, so widgets
stay current without a page refresh (no WebSocket — serverless has no persistent
process to host one).

Sync lifecycle:

```
Lead submitted → POST /api/leads
  → lead created in DB (status: PENDING), 201 returned immediately
  → after() schedules syncLeadToHubSpot() in the background

syncLeadToHubSpot(leadId):
  → ATOMIC CLAIM: updateMany flips PENDING/FAILED/stale-PROCESSING → PROCESSING
      (claim affects 0 rows → another worker owns it → return; this is the
       idempotency guard that makes inline + cron + manual triggers safe)
  → attempt HubSpot contact + company creation
  → on success: status SYNCED, store HubSpot IDs, stamp Settings.lastSyncAt
  → on failure: retry with exponential backoff (1s, 2s)
  → after 3 failures: status FAILED, store the error message

Recovery (durable safety net):
  → Vercel Cron hits GET /api/cron/sync every minute
  → re-syncs PENDING/FAILED and re-claims leads orphaned in PROCESSING
     (e.g. a serverless function killed mid-sync) — guarantees leads
     eventually reach HubSpot even if the inline after() didn't finish
```
