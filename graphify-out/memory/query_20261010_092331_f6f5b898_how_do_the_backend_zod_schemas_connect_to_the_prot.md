---
type: "path_query"
date: "2026-10-10T09:23:31.032407+00:00"
question: "How do the backend Zod schemas connect to the protected CRUD and document routes?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["schemas.ts", "zod", "resourceRoutes.ts", "crudRoutes()", "documentRoutes()", "requireRole()", "parseBody()"]
---

# Q: How do the backend Zod schemas connect to the protected CRUD and document routes?

## Answer

Graph traversal found the undirected 2-hop path schemas.ts --imports_from--> zod <--imports_from-- crud.ts, and the same path to documentRoutes.ts. Directed path from schemas.ts to those route modules was not present because import edges point from importing modules to their dependencies. The broader route wiring is explicit: resourceRoutes.ts imports schemas.ts at L23, crud.ts at L18, and documentRoutes.ts at L20. createApiRouter() calls crudRoutes() at resourceRoutes.ts L111 and documentRoutes() at L272. crudRoutes() calls requireRole() at crud.ts L161 and parseBody() at L194; documentRoutes() calls handler() at L108, requireId() at L120, requireRole() at L133, and parseBody() at L137. Thus the graph shows the shared Zod dependency and a route-composition hub in resourceRoutes.ts, not a direct schema-to-handler call. All cited edges are EXTRACTED.

## Outcome

- Signal: useful

## Source Nodes

- schemas.ts
- zod
- resourceRoutes.ts
- crudRoutes()
- documentRoutes()
- requireRole()
- parseBody()