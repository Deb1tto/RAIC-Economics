# AP Economics Platform Merge Design

**Date:** 2026-08-12

**Status:** Approved design

**Target repository:** new standalone public GitHub repository named `RAIC-Economics`

**Micro source snapshot:** `OpenPlaybook/visual-econ`, branch `sync/online-lesson-source`, commit `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`

## 1. Objective

Merge the completed AP Microeconomics visual course and the current AP Macroeconomics prototype into one new AP Economics website.

The completed Micro site is the product, curriculum, visual, interaction, and technical baseline. The merge must preserve its Next.js architecture and existing Lab behavior. Macro is the migration target and must adapt to Micro rather than forcing Micro into the Macro prototype's static JavaScript architecture.

The first release is a fidelity migration, not a redesign. It delivers one application with two course maps, 12 Units, and 43 independently addressable Labs:

- Micro: 6 Units and 18 existing Labs.
- Macro: 6 Units and 25 existing Labs.
- Macro continues to cover all 42 Fall 2026 CED Topics exactly once at the Lab mapping layer.

## 2. Source-of-truth and repository strategy

Implementation takes place in a new directory and a new public GitHub repository named `RAIC-Economics`. Neither the Micro nor Macro Git history is copied. Both existing repositories are read-only sources during the migration.

The implementation workflow will:

1. Create an empty `RAIC-Economics` project directory and initialize a new Git repository with no inherited commits, branches, tags, or remotes.
2. Export only the tracked working-tree files from Micro commit `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`; do not copy Micro's `.git` directory or untracked files.
3. Verify the imported snapshot, then make it the first commit in `RAIC-Economics`. This commit is the clean Micro product baseline.
4. Create a new public GitHub repository named `RAIC-Economics` under the user's authenticated GitHub account, configure it as `origin`, and push the verified baseline commit.
5. Record a clean Micro build and interaction baseline before moving routes or adding shared components.
6. Preserve the Micro dependency stack: Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
7. Import Macro curriculum data, pure economic calculations, SVG behavior, and content from the current RAIC Macro working tree in recoverable migration batches. Do not copy its `.git` directory or unrelated local artifacts.
8. Publish the result as a new website. Old Micro and Macro URLs do not require redirects or compatibility routes.

Micro content and behavior are authoritative. Macro's course architecture and runtime CED coverage validation are authoritative only for Macro curriculum coverage.

## 3. User experience and routes

### 3.1 Course maps

The platform has one course-map interface shared by two independently addressable routes:

- `/micro`: AP Microeconomics course map.
- `/macro`: AP Macroeconomics course map.

The interface keeps the completed Micro homepage's Unit accordion pattern. Each course map displays six Units. Expanding a Unit reveals every Lab card in that Unit. Units do not receive separate pages or routes.

The root route `/` performs a server-side redirect to `/micro`. There is no third course-map homepage.

### 3.2 Global course switcher

A two-button Microeconomics/Macroeconomics switcher is present on both course maps and every Lab page.

- Selecting Microeconomics navigates to `/micro`.
- Selecting Macroeconomics navigates to `/macro`.
- Navigation uses Next.js client navigation, so it does not force a full document reload.
- On a Lab page, switching courses returns to the selected course map. It does not attempt to find an equivalent Lab in the other course.
- Browser history, direct navigation, refresh, bookmarking, and sharing must all preserve the selected route.

### 3.3 Lab routes

Every Lab has a stable, unique, namespaced URL:

```text
/micro/ppc
/micro/demand-supply
/macro/scarcity
/macro/ad-as-equilibrium
```

The exact slug set is derived from the Micro pages and approved Macro Lab identifiers during implementation. Once recorded in the course registry, a slug is a public interface and must not change without an explicit migration decision.

Old unnamespaced Micro routes such as `/ppc` and old Macro routes are intentionally unsupported. Unknown slugs render the normal Next.js 404 page; the platform does not guess or perform fuzzy redirects.

## 4. Architecture

### 4.1 Direction of dependency

The system has three boundaries:

1. **Micro course:** the stable product baseline. Its 18 Labs retain their local React state, calculation functions, event handlers, SVG interactions, and instructional organization.
2. **Shared platform:** the smallest useful shared surface: root layout, global course switcher, course-map shell, shared design tokens, stable chart primitives, and course metadata types.
3. **Macro course:** the migration target. Its 25 Labs become React/TypeScript pages while preserving content, formulas, calculations, SVG behavior, control behavior, and feedback.

The shared platform may be extracted from proven Micro patterns, but an abstraction is allowed only when it can serve both courses without changing observable Micro behavior. Macro-only concepts such as CED coverage validation, Macro step structures, and Macro store helpers remain inside the Macro feature boundary.

### 4.2 Target directory structure

```text
app/
├── layout.tsx
├── page.tsx                       # redirects to /micro
├── micro/
│   ├── page.tsx                   # Micro course map
│   ├── ppc/page.tsx
│   ├── demand-supply/page.tsx
│   └── ...                        # 18 Micro Lab routes total
└── macro/
    ├── page.tsx                   # Macro course map
    ├── scarcity/page.tsx
    ├── ad-as-equilibrium/page.tsx
    └── ...                        # 25 Macro Lab routes total

components/
├── platform/                      # course switcher, navigation, page shells
├── charts/                        # stable reusable SVG primitives
└── micro-existing/                # existing Micro components if relocation helps clarity

features/
└── macro/
    ├── data/
    │   └── units/                 # six Macro Unit definitions
    ├── core/                      # pure calculations and validation
    ├── components/                # Macro Lab visuals and controls
    └── hooks/                     # Macro React interaction/state adapters

lib/
└── courses/                       # course registry, summaries, route helpers
```

Directory names may be adjusted to match the imported Micro snapshot's conventions during planning, but the dependency boundaries above are mandatory.

### 4.3 Explicit exclusions

The first release will not:

- Create one universal renderer for all 43 Labs.
- Rewrite the 18 completed Micro Labs into a new data-driven engine.
- Make all Micro and Macro Lab internals structurally identical.
- Add a backend, login, database, quiz system, or learner progress service.
- Create Unit detail routes.
- Preserve old Micro or Macro URLs.
- Redesign every Lab while migrating it.

## 5. Course registry and data flow

### 5.1 Shared navigation contract

The shared platform consumes a deliberately small summary contract:

```ts
type CourseId = "micro" | "macro";

type CourseSummary = {
  id: CourseId;
  title: string;
  units: UnitSummary[];
};

type UnitSummary = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  weighting: string;
  labs: LabSummary[];
};

type LabSummary = {
  slug: string;
  topic: string;
  title: string;
  description: string;
};
```

This registry is the single source for course-map cards, Lab titles, Topic labels, and public Lab paths. Lab pages must not maintain a competing copy of navigation metadata.

The registry does not describe internal sliders, economics models, SVG paths, matching exercises, or feedback state. Those remain owned by each Lab or its course-specific feature modules.

### 5.2 Runtime state

- Micro Labs retain their existing `useState` and event behavior.
- Macro's current pure economic calculations move into typed, DOM-independent modules.
- Macro DOM listeners become React event handlers or focused hooks.
- Macro Lab state is local to the active Lab. The global course shell does not store instructional values such as price, output, curve shifts, selected matches, or drag state.
- Unit accordion state is local UI state on the course-map page and is not encoded into the URL.

### 5.3 Rendering boundary

The shared platform renders the course switcher, common navigation, course-map shell, and stable page surfaces. Each Lab renders its own controls, metrics, SVG visualization, feedback, and explanation using the completed Micro interaction language as the reference.

SVG charts remain hand authored. Existing Micro `ChartFrame`, chart utilities, and UI class helpers may become shared primitives when doing so requires no behavioral change. Macro calculations must be adapted to those primitives rather than introducing a charting library.

## 6. Migration sequence

Each phase must end in a buildable, reviewable commit or commit series.

### Phase 1: Protect the Micro baseline

- Create the empty `RAIC-Economics` directory and initialize a new Git repository.
- Export the tracked Micro files from the pinned commit without copying its Git history.
- Verify the imported snapshot and create the new repository's initial baseline commit.
- Create the public GitHub repository `RAIC-Economics` under the authenticated user account, add it as `origin`, and push the baseline branch.
- Capture the 18 Micro routes and key interaction checklist.
- Run and record the existing production build.
- Include local-only directories such as `.superpowers/` in the new repository's `.gitignore` when applicable.

### Phase 2: Add the shared platform shell

- Introduce the `/micro` namespace.
- Move the Micro course map and 18 Lab routes without changing observable Lab behavior.
- Add the global course switcher and `/` to `/micro` redirect.
- Establish shared course summary types and route validation.

This phase intentionally breaks old unnamespaced Micro URLs because compatibility was explicitly excluded.

### Phase 3: Add the Macro course skeleton

- Port Macro Unit and Lab summaries into the course registry.
- Add `/macro` with the same Unit accordion and Lab-card experience as Micro.
- Port Macro's 42-Topic coverage validation into a build-time check.
- Register all 25 Macro slugs before Lab implementation so missing pages can be tracked mechanically.

### Phase 4: Migrate Macro by Unit

Migrate Units 1 through 6 in order. Within each Unit:

1. Port pure calculations and add focused tests.
2. Port Lab content and defaults.
3. Convert controls and DOM interactions to React.
4. Port hand-authored SVGs and pointer behavior.
5. Verify feedback, explanation, keyboard, responsive, and direct-route behavior.
6. Complete the Unit checkpoint before starting the next Unit.

This sequencing limits the scope of regressions and makes each Unit independently reviewable and recoverable.

### Phase 5: Integration and release

- Run the complete route, build, curriculum, interaction, responsive, and accessibility checks.
- Confirm the global switcher on all course-map and Lab pages.
- Deploy as a new website only after Micro regression and all six Macro Unit checkpoints pass.

## 7. Error handling and integrity rules

- Duplicate Lab slugs within a course cause validation failure.
- Registry entries without corresponding pages, and pages without registry entries, cause validation failure.
- A Unit with no Labs or invalid course ownership causes validation failure.
- Macro Topic coverage fails unless all 42 official Topics are mapped exactly once at the Lab layer.
- Numeric controls clamp input to their declared range before economics or SVG calculations.
- Calculations must not emit `NaN` or `Infinity`; invalid calculated output fails a focused test and must render a safe fallback during development.
- Pointer interactions clamp chart coordinates to their plot boundaries.
- Unknown public paths use Next.js 404 behavior.
- A failed Macro Unit checkpoint blocks that Unit from being considered migrated, but does not require changes to completed Micro Labs.

## 8. Verification strategy

### 8.1 Static and build verification

- TypeScript type checking succeeds.
- The Next.js production build succeeds.
- The repository lint command succeeds once defined.
- Course registry validation reports exactly two courses, 12 Units, 18 Micro Labs, 25 Macro Labs, and 43 total unique namespaced Lab paths.
- Macro CED validation reports all 42 Topics exactly once.

### 8.2 Route verification

- `/` redirects to `/micro`.
- `/micro` and `/macro` render the correct course and activate the correct switcher button.
- Every one of the 43 Lab paths supports direct navigation and browser refresh.
- Every Lab card links to its registered route.
- Unknown Lab paths return 404.
- Browser back/forward behavior remains correct after course switching.

### 8.3 Micro regression verification

For each of the 18 Micro Labs, verify at least:

- The page title, Topic labels, default state, and major explanatory content remain present.
- Sliders, buttons, pointer interactions, metrics, and SVG output respond as before.
- The new course switcher does not reset or interfere with the Lab until navigation occurs.
- Desktop and mobile layouts do not regress from the recorded baseline.

### 8.4 Macro fidelity verification

For each of the 25 Macro Labs, compare the React migration with the current prototype:

- Default values and formulas match.
- Sliders update continuously and do not re-render the dragged input in a way that interrupts dragging.
- PPC and other pointer interactions remain continuous and clamped.
- Matching retains single-answer and explicit multiple-answer behavior.
- Feedback, explanation, steps, metrics, reset behavior, and same-course navigation match the source behavior.
- SVG curves, labels, equilibrium markers, and policy shifts express the same economics.

### 8.5 Accessibility and responsive verification

- Course buttons, Unit accordions, Lab cards, controls, and step navigation are keyboard reachable.
- Focus and active-course states are visible.
- Course-switcher labels are accessible and expose the active course.
- Interactive SVGs include accessible names and do not prevent page scrolling outside an active drag.
- Course maps and Lab pages are visually checked at representative mobile and desktop widths.

## 9. Definition of done

The first release is complete when:

1. One new Next.js website exposes `/micro` and `/macro` through a persistent global course switcher.
2. Each course map shows six expandable Units and every Unit reveals its complete Lab list.
3. All 43 Labs have stable new namespaced URLs and support direct sharing and refresh.
4. The 18 completed Micro Labs retain their observable behavior.
5. The 25 Macro Labs preserve the current prototype's content, calculations, core SVG visuals, controls, feedback, and interaction behavior in React/TypeScript.
6. Micro, Macro, registry, route, build, responsive, keyboard, and Macro CED coverage checks pass.
7. No excluded backend, authentication, quiz, progress, compatibility-route, Unit-page, or wholesale redesign work is included.

## 10. Planning handoff

After this revised design is reviewed and approved in writing, the next activity is a `superpowers:writing-plans` implementation plan. The plan must target a new sibling project named `RAIC-Economics`, name exact target files, test commands, checkpoints, and migration batches, and include the clean-history import and public GitHub repository creation procedure. The current RAIC Macro repository and the pinned Micro repository remain read-only sources; neither source repository is the implementation checkout.
