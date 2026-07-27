# 03 — UI/UX Design

Text-level design specification. No high-fidelity mockups: the assignment values a "responsive,
tidy UI", and implementation time is better spent on behaviour than on pixel comps.

---

## 1. Design principles

1. **The issue list is the product.** It gets the most design attention; everything else supports it.
2. **Three screens, one path.** `Projects → Project Issues → Issue Details`. No nested tabs, no
   sub-navigation, always a visible way back.
3. **Every data view has four states** — loading, empty, error, content. None is skipped.
4. **Never a dead click.** Buttons show a spinner and disable while a mutation is in flight;
   every mutation ends in a toast or an inline error.
5. **Permissions are invisible, not disabled.** A member does not see greyed-out maintainer
   controls; the controls simply aren't rendered. (The server still enforces it.)
6. **Colour is never the only signal.** Status and priority always pair colour with text.
7. **Boring on purpose.** One neutral palette, one accent, two font sizes for body text.

## 2. Visual language

**Typography** — system UI stack (`ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
sans-serif`). No web font download.

| Role | Size / weight | Use |
|------|---------------|-----|
| Page title | 24px / 600 | Project name, issue title |
| Section title | 16px / 600 | "Issues", "Comments", "Members" |
| Body | 14px / 400 | Default everywhere |
| Meta | 12px / 400, `slate-500` | Timestamps, counts, helper text |
| Mono | 12px | Project key, ids |

Line height 1.5 body, 1.25 headings. Max content width 1280px, centred.

**Spacing** — 4px base scale, only `4 / 8 / 12 / 16 / 24 / 32 / 48`. Card padding 16px (24px
desktop), form field gap 16px, section gap 32px.

**Colour** — Tailwind palette, light theme only.

| Token | Value | Use |
|-------|-------|-----|
| Surface | `white` | Cards, modals, table rows |
| App background | `slate-50` | Page canvas |
| Border | `slate-200` | Dividers, inputs, cards |
| Text primary | `slate-900` | Headings, body |
| Text muted | `slate-500` | Meta |
| Accent | `indigo-600` (hover `indigo-700`) | Primary buttons, links, focus ring |
| Danger | `red-600` | Destructive actions, error text |
| Success | `emerald-600` | Success toasts |

**Radii & elevation** — `rounded-md` (6px) controls, `rounded-lg` (8px) cards/modals.
`shadow-sm` cards, `shadow-lg` modals and toasts. Borders do most of the separation work.

## 3. Status and priority indicators

Pill badges, `12px / 500`, `rounded-full`, `px-2 py-0.5`, always with a text label.

| Status | Colours | Label |
|--------|---------|-------|
| `OPEN` | `bg-slate-100 text-slate-700 border-slate-200` | Open |
| `IN_PROGRESS` | `bg-blue-50 text-blue-700 border-blue-200` | In progress |
| `RESOLVED` | `bg-emerald-50 text-emerald-700 border-emerald-200` | Resolved |
| `CLOSED` | `bg-slate-100 text-slate-500 border-slate-200` | Closed |

Priority uses a coloured dot **plus** the word, so it reads without colour:

| Priority | Dot | Label |
|----------|-----|-------|
| `LOW` | `slate-400` | Low |
| `MEDIUM` | `amber-500` | Medium |
| `HIGH` | `orange-500` | High |
| `CRITICAL` | `red-600` | Critical |

## 4. Navigation and shell

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🐞 IssueHub          Projects                     Asha Kumar  [Log out]│  ← 56px, sticky
└────────────────────────────────────────────────────────────────────────┘
```

Wordmark = inline bug SVG + the text "IssueHub" (`600` weight, accent-coloured "Issue", slate
"Hub"); links to `/projects`. On mobile the user's name collapses to initials in a circle.

Breadcrumbs appear only where depth exists:

- `/projects` → no breadcrumb
- `/projects/:id` → `Projects / WEB`
- `/issues/:id` → `Projects / WEB / #a1b2c3d`

Auth pages use a separate centred layout with no header.

## 5. Page layouts (text wireframes)

### 5.1 Login (`/login`)

```
                  ┌──────────────────────────────┐
                  │        🐞 IssueHub           │
                  │   Track bugs, not paperwork  │
                  │                              │
                  │  Email                       │
                  │  ┌────────────────────────┐  │
                  │  └────────────────────────┘  │
                  │  Password                    │
                  │  ┌────────────────────────┐  │
                  │  └────────────────────────┘  │
                  │  ⚠ Invalid email or password │  ← inline alert, only on 401
                  │  ┌────────────────────────┐  │
                  │  │      Log in            │  │  ← full width, spinner while pending
                  │  └────────────────────────┘  │
                  │  No account? Sign up         │
                  └──────────────────────────────┘
```

400px card, vertically centred. Email autofocused. Enter submits. `401` renders one alert above
the button — never a toast, since the error belongs to the form.

### 5.2 Signup (`/signup`)

Same card with Name / Email / Password (+ helper "At least 8 characters"). Duplicate email (`409`)
renders inline under the email field: "That email is already registered. Log in instead?" On
success the user is logged in immediately and lands on `/projects`.

### 5.3 Projects (`/projects`)

```
Projects                                            [ + New project ]

┌──────────────────────────┐  ┌──────────────────────────┐
│ WEB                      │  │ API                      │  ← key, mono, muted
│ Website Redesign         │  │ Public API               │  ← name, 16/600
│ Marketing site rebuild   │  │ v2 rollout               │  ← description, 2-line clamp
│ Maintainer · 12 issues   │  │ Member · 8 issues        │  ← role chip + count
└──────────────────────────┘  └──────────────────────────┘
```

Responsive grid: 1 col < 640px, 2 cols ≥ 640px, 3 cols ≥ 1024px. Whole card is one link.

- **Loading** — 3 skeleton cards.
- **Empty** — centred icon, "No projects yet", "Create a project to start tracking issues.",
  primary button.
- **Error** — centred card, "Couldn't load projects", `Try again` button.

**Create project modal** — Name (required), Key (required, auto-uppercased, helper "2–10 letters
or digits, e.g. WEB"), Description (optional textarea). `409` → inline error on the key field:
"That key is already taken."

### 5.4 Project detail / issues (`/projects/:projectId`)

```
Projects / WEB
Website Redesign                                    [ Members ] [ + New issue ]
WEB · 3 members
────────────────────────────────────────────────────────────────────────────
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search title…    Status ▾   Priority ▾   Assignee ▾   Sort: Newest ▾  │
│                                                          Clear filters   │
└──────────────────────────────────────────────────────────────────────────┘
24 issues

┌──────────────────────────────────────────────────────────────────────────┐
│ Title                              Status       Priority  Assignee  Age  │
├──────────────────────────────────────────────────────────────────────────┤
│ Login button unresponsive on iOS   [In progress] ● High    AK       2d   │
│ Footer links 404                   [Open]        ● Low     —        5d   │
└──────────────────────────────────────────────────────────────────────────┘
                                        ‹ Prev   Page 1 of 2   Next ›
```

- Filter bar is sticky under the header on desktop; on mobile it collapses into a search field
  plus a `Filters` button that opens a bottom sheet.
- Search is debounced 300ms and writes to the URL query string.
- `Sort` is one select combining field + direction: Newest, Oldest, Priority (high→low),
  Priority (low→high), Status.
- Changing any filter resets `page` to 1.
- Rows: full-row click target, `hover:bg-slate-50`, title truncated with a `title` tooltip.
- Below 768px each row becomes a stacked card (title, then badges, then assignee + age).
- Pagination shows `Page X of Y` and disables at the ends; it is hidden when `totalPages ≤ 1`.

States: skeleton table (5 rows) while loading · "No issues yet" + New issue when the project is
genuinely empty · "No issues match your filters" + `Clear filters` when filters are active (a
different empty state on purpose) · error card with retry.

**Members panel** (right-side drawer, `Members` button):

```
┌────────────────────────────────┐
│ Members                     ✕  │
│                                │
│ Asha Kumar   asha@x.com  MAINT │
│ Ravi Menon   ravi@x.com  MEMBER│
│ ──────────────────────────────  │
│ Add a member          (maintainers only)
│ Email  ┌──────────────────────┐│
│ Role   ( ) Member (•) Maintainer
│        [ Add member ]          │
└────────────────────────────────┘
```

Members see the list only, with a muted note: "Only maintainers can add members." `404` → inline
"No user with that email. They need to sign up first." `409` → "Already a member of this project."

**New / edit issue modal** — Title (required, counter at 200), Description (textarea, optional),
Priority (select, default Medium), Assignee (select of project members with "Unassigned",
**rendered only for maintainers**). Buttons: `Cancel` (ghost) and `Create issue` / `Save changes`
(primary, spinner while pending). Escape and backdrop click close it; a dirty form asks for
confirmation. Focus is trapped and returns to the trigger on close.

### 5.5 Issue detail (`/issues/:issueId`)

```
Projects / WEB / #a1b2c3d

Login button unresponsive on iOS                          [ Edit ] [ Delete ]
[In progress]  ● High
────────────────────────────────────────────────────────────────────────────
┌───────────────────────────────────────┐  ┌──────────────────────────────┐
│ Description                            │  │ Status    [In progress ▾]   │  ← maintainer
│ Tapping Log in on iOS Safari does      │  │ Priority  ● High            │
│ nothing. Console shows…                │  │ Assignee  [Asha Kumar  ▾]   │  ← maintainer
│                                        │  │ Reporter  Ravi Menon        │
│ Comments · 2                           │  │ Created   22 Jul 2026 10:14 │
│ ┌────────────────────────────────────┐ │  │ Updated   23 Jul 2026 09:02 │
│ │ Ravi Menon · 2 days ago            │ │  └──────────────────────────────┘
│ │ Reproduced on iOS 17.4.            │ │
│ ├────────────────────────────────────┤ │
│ │ Asha Kumar · 1 day ago             │ │
│ │ Fix is in review.                  │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ Write a comment…                   │ │
│ └────────────────────────────────────┘ │
│                    [ Comment ]         │
└───────────────────────────────────────┘
```

Two columns ≥ 1024px (content + 280px metadata sidebar); single column below, with metadata
moved **above** the description so status/priority/assignee are visible without scrolling.

- For members, sidebar Status/Assignee render as plain text instead of selects.
- `Edit` shows for maintainers and for the reporter; `Delete` only for maintainers.
- Delete opens a confirm modal ("Delete this issue? This can't be undone." / red `Delete`), then
  navigates back to the project with a success toast.
- Status change is a select that fires immediately (no Save) → sidebar badge and page header both
  update, plus a toast "Status updated to In progress".
- Comments are oldest-first. Composer: textarea, `Comment` disabled until non-empty, cleared and
  list appended on success. Author avatar is a 28px initials circle.
- Empty comments state: "No comments yet. Start the conversation."

### 5.6 Not found / no access

One page for `404` and for "not a member": "We couldn't find that page — it may have been deleted,
or you may not have access." + `Back to projects`. Deliberately ambiguous, matching the API's
`404`-for-non-members rule.

## 6. Forms and controls

**Field anatomy** — `<label>` (13px/500, always present, `htmlFor` bound) → control → helper text
or error (12px, error in `red-600`). Errors replace helper text; they never both show.

**Inputs** — 38px tall, `px-3`, `border-slate-300`, `rounded-md`; focus
`ring-2 ring-indigo-500 ring-offset-1`; error `border-red-500`; disabled `bg-slate-50` + muted
text. Selects are native `<select>` — free keyboard support and correct mobile behaviour.

**Buttons** — 38px (`h-9`), `px-4`, `rounded-md`, `text-sm font-medium`:

| Variant | Style | Use |
|---------|-------|-----|
| Primary | `bg-indigo-600 text-white hover:bg-indigo-700` | One per view: submit, create |
| Secondary | `bg-white border-slate-300 hover:bg-slate-50` | Cancel, Members |
| Ghost | `text-slate-600 hover:bg-slate-100` | Tertiary/inline |
| Danger | `bg-red-600 text-white hover:bg-red-700` | Delete confirmation |

All buttons: `disabled:opacity-50 disabled:cursor-not-allowed`, and while pending they show a
16px spinner **left of unchanged label text** so width doesn't jump.

**Validation timing** — validate on blur and on submit, never on every keystroke. Clear a field's
error as soon as the user edits it. On submit failure, focus the first invalid field. Server field
errors from `error.details` map onto the same inline slots.

**Feedback split**

| Situation | Where |
|-----------|-------|
| Field-level validation | Inline under the field |
| Failed form submit (409/422/401) | Inline, at the field when attributable, else an alert above the submit button |
| Successful create/update/delete | Toast, top-right, 3s auto-dismiss |
| Failed list load | Inline error card with `Try again` |
| Unexpected 500 | Error toast: "Something went wrong. Please try again." |
| 401 mid-session | Silent redirect to `/login` with a toast: "Your session expired." |

## 7. Loading, empty and error states

| Surface | Loading | Empty | Error |
|---------|---------|-------|-------|
| Projects grid | 3 skeleton cards | Icon + "No projects yet" + CTA | Card + `Try again` |
| Issue table | 5 skeleton rows | "No issues yet" / "No issues match your filters" + `Clear filters` | Card + `Try again` |
| Issue detail | Skeleton header + body block | n/a | Full-page not-found card |
| Comments | 2 skeleton comments | "No comments yet." | Inline error + `Try again` |
| Members drawer | 3 skeleton rows | n/a (never empty) | Inline error |
| Mutations | Button spinner | n/a | Inline or toast |

Skeletons are `bg-slate-200 animate-pulse` blocks at the real content's dimensions, so nothing
shifts when data arrives.

## 8. Responsive behaviour

| Breakpoint | Layout |
|------------|--------|
| < 640px (mobile) | Single column. Issue rows become cards. Filters behind a `Filters` sheet. Modals become full-screen sheets. Issue metadata above description. 16px page gutters |
| 640–1023px (tablet) | 2-col project grid. Issue table shows Title / Status / Priority; assignee and age move into the title cell. Filters inline, wrapped to two lines |
| ≥ 1024px (desktop) | 3-col project grid. Full issue table. Two-column issue detail. Filter bar on one line. Max width 1280px |

Verified at 360 / 768 / 1280px. No horizontal scroll at any width. Touch targets ≥ 40px on mobile.

## 9. Accessibility

- Every input has a real `<label>`; icon-only buttons carry `aria-label`.
- Focus is never removed — a visible `ring-2` on all interactive elements.
- Modal/drawer: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the title, focus trap,
  Escape closes, focus returns to the trigger, background scroll locked.
- Toasts render in an `aria-live="polite"` `role="status"` region; error toasts use `role="alert"`.
- Async regions use `aria-busy` while loading.
- Full flows are keyboard-operable: Tab order follows DOM order, Enter submits forms, native
  selects handle their own keyboard interaction.
- Text contrast ≥ 4.5:1 (badge text uses the `700` shade on a `50/100` background).
- Skip-to-content link before the header.
- Semantic HTML: `<table>` for the issue list, `<nav>` for breadcrumbs, `<main>` per page, one
  `<h1>` per page.

## 10. Micro-animations

Implemented **only after all features and tests are green.** Every duration ≤ 200ms, all
respecting `prefers-reduced-motion: reduce` (which disables transforms and keeps opacity only).

| Element | Animation |
|---------|-----------|
| Button pending | 16px rotating spinner fades in (150ms) |
| Modal | Backdrop fade 150ms; panel `opacity 0→1, scale .97→1` 150ms ease-out; reverse 100ms on close |
| Drawer | `translateX(100% → 0)` 200ms ease-out |
| Toast | Slide in from right + fade 150ms; fade out 100ms |
| Select / hover / focus | 100ms colour transition |
| Status change | Badge flashes to its new colour with a 300ms background fade |
| Skeletons | Tailwind `animate-pulse` |
| Row hover | Instant background change (no transition — feels laggy otherwise) |

Not used: page transitions, layout animation, parallax, staggered list entrances, spring physics.

## 11. Branding

- Wordmark: inline bug SVG (~14 path commands) + "IssueHub" text. Header left, and at the top of
  the auth card. Nothing else.
- Favicon: the same SVG glyph.
- No logo files, no illustration set, no custom typeface. Time budget: under 15 minutes total.
