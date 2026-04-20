---
type: community
cohesion: 0.24
members: 10
---

# RBAC & Route Guards

**Cohesion:** 0.24 - loosely connected
**Members:** 10 nodes

## Members
- [[DELETE()]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/planning/shifts/[id]/route.ts
- [[PATCH()]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/tasks/[id]/route.ts
- [[hasMinRole()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[hasRole()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[rbac.ts]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[requireEstablishmentAccess()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[requireMinRole()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[requireRole()]] - code - /Users/arthurcapri/klyro/apps/backoffice/lib/rbac.ts
- [[route.ts_8]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/planning/shifts/[id]/route.ts
- [[route.ts_1]] - code - /Users/arthurcapri/klyro/apps/backoffice/app/api/tasks/[id]/route.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/RBAC_&_Route_Guards
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Auth & Session]]

## Top bridge nodes
- [[requireMinRole()]] - degree 4, connects to 1 community
- [[DELETE()]] - degree 4, connects to 1 community
- [[PATCH()]] - degree 2, connects to 1 community