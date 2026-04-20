# Graph Report - /Users/arthurcapri/klyro  (2026-04-20)

## Corpus Check
- Corpus is ~9,348 words - fits in a single context window. You may not need a graph.

## Summary
- 75 nodes · 73 edges · 24 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Session|Auth & Session]]
- [[_COMMUNITY_RBAC & Route Guards|RBAC & Route Guards]]
- [[_COMMUNITY_Establishment Resolution|Establishment Resolution]]
- [[_COMMUNITY_Planning Week Grid|Planning Week Grid]]
- [[_COMMUNITY_Task List UI|Task List UI]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_DB Migration|DB Migration]]
- [[_COMMUNITY_DB Seeding|DB Seeding]]
- [[_COMMUNITY_DB Client|DB Client]]
- [[_COMMUNITY_Planning Page|Planning Page]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Add Shift Modal|Add Shift Modal]]
- [[_COMMUNITY_Drizzle Config|Drizzle Config]]
- [[_COMMUNITY_DB Schema|DB Schema]]
- [[_COMMUNITY_DB Index|DB Index]]
- [[_COMMUNITY_Next.js Env|Next.js Env]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_App Shell Layout|App Shell Layout]]
- [[_COMMUNITY_Tasks Page|Tasks Page]]
- [[_COMMUNITY_App Shell Component|App Shell Component]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 11 edges
2. `POST()` - 10 edges
3. `requireAuth()` - 6 edges
4. `DELETE()` - 4 edges
5. `requireMinRole()` - 4 edges
6. `verifyToken()` - 4 edges
7. `getSessionFromRequest()` - 4 edges
8. `toDateKey()` - 3 edges
9. `navigateWeek()` - 3 edges
10. `getSecret()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `requireAuth()`  [INFERRED]
  /Users/arthurcapri/klyro/apps/backoffice/app/api/tasks/[id]/route.ts → /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- `GET()` --calls--> `requireAuth()`  [INFERRED]
  /Users/arthurcapri/klyro/apps/backoffice/app/api/users/route.ts → /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- `getEffectiveEstablishmentId()` --calls--> `GET()`  [INFERRED]
  /Users/arthurcapri/klyro/apps/backoffice/lib/establishment.ts → /Users/arthurcapri/klyro/apps/backoffice/app/api/users/route.ts
- `getEffectiveEidFromRequest()` --calls--> `GET()`  [INFERRED]
  /Users/arthurcapri/klyro/apps/backoffice/lib/establishment.ts → /Users/arthurcapri/klyro/apps/backoffice/app/api/users/route.ts
- `getSessionFromRequest()` --calls--> `GET()`  [INFERRED]
  /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts → /Users/arthurcapri/klyro/apps/backoffice/app/api/users/route.ts

## Communities

### Community 0 - "Auth & Session"
Cohesion: 0.23
Nodes (9): clearSessionCookie(), getSecret(), getSession(), getSessionFromRequest(), requireAuth(), setSessionCookie(), signToken(), verifyToken() (+1 more)

### Community 1 - "RBAC & Route Guards"
Cohesion: 0.24
Nodes (6): hasMinRole(), hasRole(), requireMinRole(), requireRole(), DELETE(), PATCH()

### Community 2 - "Establishment Resolution"
Cohesion: 0.24
Nodes (4): getEffectiveEidFromRequest(), getEffectiveEstablishmentId(), GET(), getMondayOfWeek()

### Community 3 - "Planning Week Grid"
Cohesion: 0.36
Nodes (4): addDays(), isToday(), navigateWeek(), toDateKey()

### Community 4 - "Task List UI"
Cohesion: 0.4
Nodes (0): 

### Community 5 - "Sidebar Navigation"
Cohesion: 0.67
Nodes (0): 

### Community 6 - "DB Migration"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "DB Seeding"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "DB Client"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Planning Page"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Add Shift Modal"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Drizzle Config"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "DB Schema"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "DB Index"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Next.js Env"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "App Shell Layout"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Tasks Page"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "App Shell Component"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `DB Migration`** (2 nodes): `main()`, `migrate.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Seeding`** (2 nodes): `main()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Client`** (2 nodes): `createDb()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Planning Page`** (2 nodes): `getMondayOfWeek()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (2 nodes): `fmtTime()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (2 nodes): `handleSubmit()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add Shift Modal`** (2 nodes): `handleSubmit()`, `AddShiftModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle Config`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Schema`** (1 nodes): `schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Env`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Shell Layout`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tasks Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Shell Component`** (1 nodes): `AppShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Auth & Session` to `RBAC & Route Guards`, `Establishment Resolution`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `GET()` connect `Establishment Resolution` to `Auth & Session`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Auth & Session` to `RBAC & Route Guards`, `Establishment Resolution`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `GET()` (e.g. with `requireAuth()` and `getEffectiveEstablishmentId()`) actually correct?**
  _`GET()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `POST()` (e.g. with `requireAuth()` and `requireMinRole()`) actually correct?**
  _`POST()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `requireAuth()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`requireAuth()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DELETE()` (e.g. with `requireAuth()` and `requireMinRole()`) actually correct?**
  _`DELETE()` has 2 INFERRED edges - model-reasoned connections that need verification._