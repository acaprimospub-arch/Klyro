---
type: community
cohesion: 0.23
members: 14
---

# Auth & Session

**Cohesion:** 0.23 - loosely connected
**Members:** 14 nodes

## Members
- [[POST()]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/planning/shifts/route.ts
- [[auth.ts]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[clearSessionCookie()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[getSecret()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[getSession()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[getSessionFromRequest()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[requireAuth()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[route.ts_5]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/admin/establishment/route.ts
- [[route.ts_4]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/auth/login/route.ts
- [[route.ts_2]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/auth/logout/route.ts
- [[route.ts_7]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/planning/shifts/route.ts
- [[setSessionCookie()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[signToken()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts
- [[verifyToken()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/auth.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Auth_&_Session
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Establishment Resolution]]
- 3 edges to [[_COMMUNITY_RBAC & Route Guards]]

## Top bridge nodes
- [[POST()]] - degree 10, connects to 2 communities
- [[requireAuth()]] - degree 6, connects to 2 communities
- [[getSessionFromRequest()]] - degree 4, connects to 1 community
- [[getSession()]] - degree 3, connects to 1 community