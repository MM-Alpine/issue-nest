---
paths:
  - "frontend/**"
---

# Frontend rules (React 19 + Vite + TanStack Query + Tailwind)

Loaded when working under `frontend/`. UI/UX: [docs/03](../../docs/03-ui-ux-design.md).
Flow: [docs/04](../../docs/04-application-flow.md).

## Data & state (◆)
- **Server state** lives in **TanStack Query 5** over the thin `api/client.ts` fetch wrapper
  (bearer header, envelope → `ApiError`, global `401` → clear token + redirect to `/login`).
  Loading/error/empty come from Query state — do not hand-roll them.
- **Client state** is only auth (React Context in `features/auth`). No Redux/Zustand.
- **Filter/sort/pagination state lives in the URL** (`useSearchParams`), which is also the Query
  cache key — a filtered list is shareable and reload-safe.
- Hand-written types in `types/api.ts` mirror the API; no codegen.

## Security (◆)
- The UI **hides** maintainer-only controls for usability, but this is **never** a security control —
  the server enforces everything. Never assume the client can gate access.
- Token in `localStorage` under one key (documented XSS trade-off). No secrets in the bundle beyond
  `VITE_API_URL`.

## Conventions
- Forms: controlled components + Zod; map `error.details` onto inline field errors. No react-hook-form.
- Styling: Tailwind 4 utilities; small in-house component set (`components/`), no component library.
- Routing: React Router 7 declarative. `/login`,`/signup` public; `/projects`,`/projects/:id`,
  `/issues/:id` protected via `ProtectedRoute`; `*` → NotFound.
- Every data view shows the four states (loading, empty, error, data). Every mutation gives feedback
  (toast). Accessibility: labelled inputs, focus rings, ARIA on modal/drawer/toast, colour never the
  sole signal. Usable at 360px.

## Scope
- Build only the pages/features in docs/03 + docs/01 §6. **No frontend test suite** (out of scope),
  no dark mode, no i18n, no extra libraries. Under time pressure follow docs/06 §4 cut order.

## Commands
`npm install` · `npm run dev` (Vite → :5173) · `npm run build` · `npm run preview`.
