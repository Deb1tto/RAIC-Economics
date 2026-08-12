# RAIC-Economics Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the new public `RAIC-Economics` repository with a clean Micro baseline, namespaced Micro routes, the persistent Micro/Macro switcher, and a Macro course-map skeleton ready for six independent Unit migrations.

**Architecture:** Start a new Git history from the tracked files at Micro commit `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`. Keep all 18 Micro Lab implementations intact while moving their routes under `/micro`; place cross-course navigation in the root layout; extract only the completed Micro course-map shell into a shared component; register all 25 Macro Labs but keep Macro runtime implementation out of this foundation plan.

**Tech Stack:** Node.js 24.x, pnpm 10.32.1, Next.js 16.1.6 App Router, React 19.2.4, TypeScript 5.9.3, Tailwind CSS 4.2.1, Node's built-in test runner, GitHub CLI.

## Global Constraints

- The implementation target is a new sibling directory: `/Users/debitto/Documents/Projects/RAIC-Economics`.
- Create a new public GitHub repository named `RAIC-Economics`; do not inherit commits, branches, tags, remotes, `.git` data, or untracked files from either source repository.
- Micro source is pinned to `OpenPlaybook/visual-econ` commit `e80d1d4d5b89f1a4e70360171bf8ced705900ee0` on `sync/online-lesson-source`.
- Macro source is the tracked course application in `/Users/debitto/Documents/Projects/RAIC`; treat it as read-only.
- Micro is the product, curriculum, interaction, and visual baseline. Do not refactor its 18 Lab implementations during foundation work.
- Preserve Next.js 16, React 19, TypeScript, Tailwind 4, hand-authored SVG charts, and the current Micro visual language.
- The new routes are `/micro`, `/macro`, `/micro/<slug>`, and eventually `/macro/<slug>`; old unnamespaced routes are intentionally unsupported.
- `/` redirects to `/micro`; Units expand inside course-map pages and do not get individual routes.
- Put the Micro/Macro switcher on every page. Its buttons always navigate to `/micro` and `/macro`, not to an inferred equivalent Lab.
- Do not add a backend, authentication, database, quiz system, progress system, chart library, or compatibility redirects.
- The complete platform target is 6 Micro Units, 18 Micro Labs, 6 Macro Units, 25 Macro Labs, 43 total Lab URLs, and exact coverage of Macro's 42 Fall 2026 CED Topics.

## Plan Set and Delivery Boundaries

This specification spans seven independently reviewable deliveries. This file is the executable plan for delivery 1 only:

1. **Foundation (this plan):** repository creation, verified Micro import, platform configuration, course registry, `/micro` route migration, global switcher, shared course map, and `/macro` migration-notice routes.
2. **Macro Unit 1 plan:** Scarcity; PPC and Opportunity Cost; Comparative Advantage; Demand, Supply, and Equilibrium.
3. **Macro Unit 2 plan:** Measuring Output; Measuring Prices; Labor Market Indicators; Business Cycle.
4. **Macro Unit 3 plan:** AD Components; Multiplier Lab; AD-AS Equilibrium; Output Gaps; Fiscal Policy Simulator.
5. **Macro Unit 4 plan:** Money and Financial Assets; Banking and Money Expansion; Money Market; Monetary Policy; Loanable Funds.
6. **Macro Unit 5 plan:** Short-Run Policy Actions; Phillips Curve; Money Growth and Inflation; Deficits and Crowding Out; Economic Growth.
7. **Macro Unit 6 and release plan:** Balance of Payments; Foreign Exchange Market; 43-route regression, responsive and keyboard QA, and release deployment.

Each follow-on plan must leave Micro unchanged, replace that Unit's migration notices with working React/TypeScript Labs, add calculation tests before components, and finish with a buildable checkpoint.

## Target File Map

### Imported and retained

- `components/button-group.tsx`: existing Micro segmented controls.
- `components/chart-frame.tsx`: existing Micro SVG axes and grid primitive.
- `components/chart-utils.ts`: existing Micro chart scales, paths, clamp, and rounding helpers.
- `components/module-page.tsx`: existing shared Micro Lab shell; only its home link changes to `/micro`.
- `components/ui-classes.ts`: existing Micro design tokens expressed as Tailwind class strings.
- `app/micro/<slug>/page.tsx`: the 18 existing Micro Lab pages after route-only relocation.

### Created in this plan

- `components/platform/course-switcher.tsx`: persistent client-side Micro/Macro navigation.
- `components/platform/course-map.tsx`: the completed Micro accordion/card shell parameterized by a course record.
- `components/platform/macro-migration-notice.tsx`: explicit temporary page used only until each Macro Unit plan replaces it.
- `lib/courses/types.ts`: shared navigation-only course types.
- `lib/courses/micro.ts`: the 6-Unit, 18-Lab Micro course registry extracted from the completed homepage.
- `lib/courses/macro.ts`: the 6-Unit, 25-Lab Macro summary registry and 42 CED Topic mappings.
- `lib/courses/index.ts`: registry lookup and integrity validation.
- `lib/courses/routes.ts`: pure route helpers and active-course detection.
- `app/micro/page.tsx`: thin Micro course-map entry.
- `app/macro/page.tsx`: thin Macro course-map entry.
- `app/macro/[slug]/page.tsx`: validated Macro slug route, initially rendering the migration notice.
- `tests/course-registry.test.ts`: count, slug, path, and Macro Topic coverage tests.
- `tests/course-routes.test.ts`: route-helper tests.
- `tests/platform-config.test.mjs`: tests that remove online-courseware-only Next.js settings.
- `scripts/validate-route-files.mjs`: verifies 18 physical Micro pages and the two course map routes.
- `docs/migration/micro-baseline.md`: pinned source, initial commit, route list, and build evidence.
- `docs/superpowers/specs/2026-08-12-ap-economics-platform-merge-design.md`: approved design copied from the planning repository.
- `docs/superpowers/plans/2026-08-12-raic-economics-foundation.md`: this plan copied into the target repository.

### Modified in this plan

- `.gitignore`: ignores local planning artifacts in addition to existing build artifacts.
- `package.json`: project identity and repeatable check scripts.
- `pnpm-lock.yaml`: updated only if `pnpm install --lockfile-only` changes package metadata.
- `tsconfig.json`: permits explicit `.ts` imports used by native Node tests.
- `next.config.mjs`: removes the old embedded-course `basePath`, `assetPrefix`, static export, and ignored TypeScript errors.
- `app/layout.tsx`: new platform metadata and persistent course switcher.
- `app/page.tsx`: root redirect to `/micro`.
- `app/globals.css`: switcher spacing/focus helpers only if Tailwind utility classes cannot express them cleanly.

---

### Task 1: Create the clean repository and publish the verified Micro baseline

**Files:**
- Import: every tracked file from Micro commit `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`
- Create repository: `/Users/debitto/Documents/Projects/RAIC-Economics/.git`
- Remote: public GitHub repository `RAIC-Economics`

**Interfaces:**
- Consumes: the pinned public Micro commit and the authenticated GitHub account reported by `gh api user`.
- Produces: a clean `main` branch whose first commit is the unmodified tracked Micro snapshot and whose `origin` points to the new public repository.

- [ ] **Step 1: Run non-mutating preflight checks**

```bash
test ! -e /Users/debitto/Documents/Projects/RAIC-Economics
gh auth status
gh api user --jq .login
gh repo view "$(gh api user --jq .login)/RAIC-Economics"
```

Expected: the target local directory does not exist; GitHub authentication succeeds; the final command reports that the repository does not exist. If either target already exists, stop and ask the user instead of deleting or overwriting it.

- [ ] **Step 2: Download and inspect the pinned source archive in a temporary directory**

```bash
curl -L --fail --silent --show-error \
  "https://github.com/OpenPlaybook/visual-econ/archive/e80d1d4d5b89f1a4e70360171bf8ced705900ee0.tar.gz" \
  -o /private/tmp/raic-economics-micro-e80d1d4.tar.gz
tar -tzf /private/tmp/raic-economics-micro-e80d1d4.tar.gz | sed -n '1,20p'
```

Expected: the archive root is `visual-econ-e80d1d4d5b89f1a4e70360171bf8ced705900ee0/` and includes `app/`, `components/`, `package.json`, and `pnpm-lock.yaml`.

- [ ] **Step 3: Export tracked snapshot content without source Git history**

```bash
mkdir /Users/debitto/Documents/Projects/RAIC-Economics
tar -xzf /private/tmp/raic-economics-micro-e80d1d4.tar.gz \
  --strip-components=1 \
  -C /Users/debitto/Documents/Projects/RAIC-Economics
test ! -e /Users/debitto/Documents/Projects/RAIC-Economics/.git
```

Expected: application files exist and `.git` does not.

- [ ] **Step 4: Install exactly the locked Micro dependencies and verify the imported build**

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Run from `/Users/debitto/Documents/Projects/RAIC-Economics` with Node 24.x. Expected: install and the original Micro production build succeed before any source modification.

- [ ] **Step 5: Initialize clean history and create the baseline commit**

```bash
git init -b main
git add .
git diff --cached --check
git commit -m "Import completed AP Microeconomics visual lab"
git log --oneline --decorate -1
```

Expected: exactly one local commit exists; it contains the imported source snapshot and no source `.git` metadata.

- [ ] **Step 6: Create and push the public GitHub repository**

```bash
gh repo create RAIC-Economics \
  --public \
  --source /Users/debitto/Documents/Projects/RAIC-Economics \
  --remote origin \
  --push
git remote -v
gh repo view --json nameWithOwner,isPrivate,url,defaultBranchRef
```

Expected: `isPrivate` is `false`, `nameWithOwner` ends with `/RAIC-Economics`, `defaultBranchRef.name` is `main`, and `origin` matches the created repository.

### Task 2: Remove embedded-course configuration and add repeatable platform checks

**Files:**
- Create: `tests/platform-config.test.mjs`
- Create: `docs/migration/micro-baseline.md`
- Create: `docs/superpowers/specs/2026-08-12-ap-economics-platform-merge-design.md`
- Create: `docs/superpowers/plans/2026-08-12-raic-economics-foundation.md`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: the clean Micro baseline from Task 1 and the approved design/plan files in `/Users/debitto/Documents/Projects/RAIC/docs/superpowers/`.
- Produces: `pnpm test`, `pnpm check:types`, and `pnpm check`; a root-deployable Next.js configuration with TypeScript errors enforced.

- [ ] **Step 1: Write the failing platform configuration test**

Create `tests/platform-config.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config.mjs";

test("new site is not mounted under the old online-course base path", () => {
  assert.equal(nextConfig.basePath, undefined);
  assert.equal(nextConfig.assetPrefix, undefined);
});

test("production build checks TypeScript and uses the Next server runtime", () => {
  assert.notEqual(nextConfig.typescript?.ignoreBuildErrors, true);
  assert.equal(nextConfig.output, undefined);
  assert.equal(nextConfig.reactStrictMode, true);
});
```

- [ ] **Step 2: Run the test and verify the old Micro configuration fails**

Run:

```bash
node --test tests/platform-config.test.mjs
```

Expected: FAIL because `basePath`, `assetPrefix`, `output: "export"`, and `typescript.ignoreBuildErrors: true` are still present.

- [ ] **Step 3: Replace `next.config.mjs` with the deployable platform configuration**

```js
/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

This intentionally removes the source platform's `/api/ensemble/...` mounting path, static-export constraint, and ignored TypeScript errors.

- [ ] **Step 4: Add scripts and explicit TypeScript-test support**

Change the relevant `package.json` fields to:

```json
{
  "name": "raic-economics",
  "description": "Interactive AP Microeconomics and AP Macroeconomics visual labs.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test --experimental-strip-types tests/*.test.ts tests/*.test.mjs",
    "check:types": "tsc --noEmit",
    "check:routes": "node scripts/validate-route-files.mjs",
    "check": "pnpm test && pnpm check:types && pnpm check:routes && pnpm build"
  }
}
```

Keep all dependency versions unchanged. Add this compiler option inside `tsconfig.json`'s `compilerOptions`:

```json
"allowImportingTsExtensions": true
```

Append to `.gitignore`:

```gitignore
.superpowers/
```

- [ ] **Step 5: Record the source baseline and copy the approved planning artifacts**

Create `docs/migration/micro-baseline.md` with:

```markdown
# Micro Source Baseline

- Repository: `OpenPlaybook/visual-econ`
- Branch: `sync/online-lesson-source`
- Commit: `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`
- Imported history: none
- Baseline Labs: 18
- Baseline verification: `pnpm install --frozen-lockfile` and `pnpm build`

The first commit in this repository is an unmodified export of the tracked files at the pinned commit. Micro remains the product and interaction baseline while Macro is migrated into this repository.
```

Copy the approved design and this plan from the planning repository into their identical paths under `RAIC-Economics`. Do not copy `.superpowers/` browser-session artifacts.

- [ ] **Step 6: Run the focused test, type check, and build**

```bash
corepack pnpm test
corepack pnpm check:types
corepack pnpm build
git diff --check
```

Expected: all commands PASS. If `check:types` or `build` fails after `ignoreBuildErrors` is removed, stop this task and open a separate focused correction task for each reported file before committing; do not restore `ignoreBuildErrors` and do not combine type corrections with route migration.

- [ ] **Step 7: Commit and push the platform baseline hardening**

```bash
git add .gitignore package.json pnpm-lock.yaml tsconfig.json next.config.mjs \
  tests/platform-config.test.mjs docs/migration \
  docs/superpowers/specs docs/superpowers/plans
git commit -m "chore: prepare Micro baseline for standalone platform"
git push origin main
```

Expected: the public repository contains the verified baseline and its source/design records.

### Task 3: Introduce the typed two-course registry with integrity tests

**Files:**
- Create: `lib/courses/types.ts`
- Create: `lib/courses/micro.ts`
- Create: `lib/courses/macro.ts`
- Create: `lib/courses/index.ts`
- Create: `lib/courses/routes.ts`
- Create: `tests/course-registry.test.ts`
- Create: `tests/course-routes.test.ts`

**Interfaces:**
- Consumes: Micro's existing `curriculum` constant from the imported `app/page.tsx` and Macro summaries from `/Users/debitto/Documents/Projects/RAIC/src/data/units/`.
- Produces: `CourseId`, `LabSummary`, `UnitSummary`, `CourseSummary`, `courses`, `getCourse`, `getLabHref`, `getCourseIdFromPathname`, and `validateCourseRegistry`.

- [ ] **Step 1: Write failing registry and route tests**

Create `tests/course-registry.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  courses,
  validateCourseRegistry,
  type CourseSummary,
} from "../lib/courses/index.ts";

const microSlugs = [
  "ppc", "trade", "marginal", "demand-supply", "elasticity",
  "other-elasticities", "sd", "production-costs", "profit-maximization",
  "perfect-competition", "monopoly", "price-discrimination",
  "monopolistic-competition", "game-theory", "factor-markets",
  "monopsony-labor", "externalities", "inequality-poverty",
];

const macroSlugs = [
  "scarcity-choice", "ppc-opportunity-cost", "comparative-advantage",
  "market-fundamentals", "measuring-output", "measuring-prices",
  "labor-market", "business-cycle", "ad-components", "multiplier-lab",
  "adas-equilibrium", "output-gaps", "fiscal-policy",
  "money-financial-assets", "banking-money-expansion", "money-market",
  "monetary-policy", "loanable-funds", "short-run-policy-actions",
  "phillips-curve", "money-growth-inflation", "deficits-crowding-out",
  "economic-growth", "balance-of-payments", "foreign-exchange",
];

test("registry contains the approved course, Unit, and Lab counts", () => {
  assert.equal(courses.length, 2);
  assert.deepEqual(courses.map((course) => course.units.length), [6, 6]);
  assert.deepEqual(
    courses.map((course) => course.units.flatMap((unit) => unit.labs).length),
    [18, 25],
  );
  assert.equal(courses.flatMap((course) => course.units.flatMap((unit) => unit.labs)).length, 43);
});

test("registry exposes the approved stable slug sets", () => {
  assert.deepEqual(courses[0].units.flatMap((unit) => unit.labs.map((lab) => lab.slug)), microSlugs);
  assert.deepEqual(courses[1].units.flatMap((unit) => unit.labs.map((lab) => lab.slug)), macroSlugs);
});

test("Macro covers all 42 CED Topics exactly once", () => {
  const topics = courses[1].units.flatMap((unit) => unit.labs.flatMap((lab) => lab.topics));
  assert.equal(topics.length, 42);
  assert.equal(new Set(topics).size, 42);
});

test("registry integrity validator accepts the checked-in data", () => {
  assert.doesNotThrow(() => validateCourseRegistry(courses));
});

test("registry integrity validator rejects duplicate slugs", () => {
  const invalid = structuredClone(courses) as unknown as Array<{
    units: Array<{ labs: Array<{ slug: string }> }>;
  }>;
  invalid[0].units[0].labs[1].slug = invalid[0].units[0].labs[0].slug;
  assert.throws(
    () => validateCourseRegistry(invalid as unknown as CourseSummary[]),
    /duplicate Lab slugs/,
  );
});

test("registry integrity validator rejects empty Units", () => {
  const invalid = structuredClone(courses) as unknown as Array<{
    units: Array<{ labs: Array<{ slug: string }> }>;
  }>;
  invalid[0].units[0].labs = [];
  assert.throws(
    () => validateCourseRegistry(invalid as unknown as CourseSummary[]),
    /empty Unit/,
  );
});
```

Create `tests/course-routes.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { getCourseIdFromPathname, getLabHref } from "../lib/courses/routes.ts";

test("Lab hrefs are always course namespaced", () => {
  assert.equal(getLabHref("micro", "ppc"), "/micro/ppc");
  assert.equal(getLabHref("macro", "foreign-exchange"), "/macro/foreign-exchange");
});

test("active course is derived from maps and Lab paths", () => {
  assert.equal(getCourseIdFromPathname("/micro"), "micro");
  assert.equal(getCourseIdFromPathname("/micro/ppc"), "micro");
  assert.equal(getCourseIdFromPathname("/macro"), "macro");
  assert.equal(getCourseIdFromPathname("/macro/money-market"), "macro");
  assert.equal(getCourseIdFromPathname("/"), null);
});
```

- [ ] **Step 2: Run tests and verify missing modules fail**

```bash
pnpm test
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/courses/index.ts` or `routes.ts`.

- [ ] **Step 3: Define the navigation-only types and route helpers**

Create `lib/courses/types.ts`:

```ts
export type CourseId = "micro" | "macro";

export type LabSummary = {
  slug: string;
  topics: readonly string[];
  title: string;
  description: string;
};

export type UnitSummary = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  weighting: string;
  accent: string;
  accentSoft: string;
  border: string;
  text: string;
  labs: readonly LabSummary[];
};

export type CourseNote = {
  title: string;
  description: string;
};

export type CourseSummary = {
  id: CourseId;
  eyebrow: string;
  title: string;
  description: string;
  units: readonly UnitSummary[];
  notes: readonly CourseNote[];
};
```

Create `lib/courses/routes.ts`:

```ts
import type { CourseId } from "./types.ts";

export function getLabHref(courseId: CourseId, slug: string): string {
  return `/${courseId}/${slug}`;
}

export function getCourseIdFromPathname(pathname: string): CourseId | null {
  if (pathname === "/micro" || pathname.startsWith("/micro/")) return "micro";
  if (pathname === "/macro" || pathname.startsWith("/macro/")) return "macro";
  return null;
}
```

- [ ] **Step 4: Extract the complete Micro registry without rewriting its content**

Create `lib/courses/micro.ts`. Move the existing six Unit objects and three `notes` objects from `app/page.tsx` into an exported `microCourse satisfies CourseSummary` value. Use this wrapper around those moved objects:

```ts
import type { CourseSummary } from "./types.ts";

export const microCourse = {
  id: "micro",
  eyebrow: "AP Microeconomics Visual Lab",
  title: "AP 微观经济学课程地图",
  description: "用严格贴合 AP 大纲的 Unit 导航，组织所有图形实验。让学生既能看到全局备考地图，也能快速进入某一个核心考点的可视化推演。",
  units,
  notes,
} satisfies CourseSummary;
```

Define `const units = [...]` immediately above the export by moving the six existing `curriculum` entries. For each Unit object, rename `modules` to `labs`. For each module, replace its concrete `href` with the last path segment as `slug` (for example, `href: "/ppc"` becomes `slug: "ppc"`) and wrap its concrete `topic` value as the single item in `topics` (for example, `topic: "Unit 1.3"` becomes `topics: ["Unit 1.3"]`). Define `const notes = [...]` by moving the three existing note objects without changing their strings. Keep every title, subtitle, weighting, accent class, description, and Unit order unchanged. The exact ordered slug list is asserted in Step 1, so omissions and reordering fail the test.

- [ ] **Step 5: Create the complete Macro summary registry from the tracked source**

Create `lib/courses/macro.ts` with `macroCourse satisfies CourseSummary`. Copy Unit titles, subtitles, weights, Lab titles, descriptions, and Topic arrays from `/Users/debitto/Documents/Projects/RAIC/src/data/units/unit-1.js` through `unit-6.js`. Use the existing six Micro Unit accent class sets in order so Macro follows the completed visual system. Use these exact Lab IDs as slugs and these exact per-Unit counts:

```ts
import type { CourseSummary } from "./types.ts";

export const macroCourse = {
  id: "macro",
  eyebrow: "AP Macroeconomics Visual Lab",
  title: "AP 宏观经济学课程地图",
  description: "按 AP Macroeconomics 六个 Unit 浏览互动实验，并通过图形、公式与政策因果链理解宏观模型。",
  units: [
    // Unit 1: scarcity-choice, ppc-opportunity-cost,
    // comparative-advantage, market-fundamentals
    // Unit 2: measuring-output, measuring-prices, labor-market, business-cycle
    // Unit 3: ad-components, multiplier-lab, adas-equilibrium,
    // output-gaps, fiscal-policy
    // Unit 4: money-financial-assets, banking-money-expansion,
    // money-market, monetary-policy, loanable-funds
    // Unit 5: short-run-policy-actions, phillips-curve,
    // money-growth-inflation, deficits-crowding-out, economic-growth
    // Unit 6: balance-of-payments, foreign-exchange
  ],
  notes: [
    {
      title: "教学 UX 规则",
      description: "先预测，再操作控件或图形验证；反馈使用 AP 课程语言解释变量与曲线的因果关系。",
    },
    {
      title: "课程完整性",
      description: "6 Units、25 Labs 覆盖 Fall 2026 CED 的全部 42 Topics。",
    },
    {
      title: "迁移状态",
      description: "Macro Labs 按 Unit 保真迁移；尚未迁移的独立地址会明确显示迁移状态。",
    },
  ],
} satisfies CourseSummary;
```

The comments above are an ordered construction checklist, not runtime data. Replace them with the copied Unit and Lab objects in the same step; do not leave comment-only Unit entries in the finished file. For each Macro `topic` string, store one atomic CED code per array item: ranges in the source such as `"1.4-1.6"` become `["1.4", "1.5", "1.6"]`. This normalization is what makes the asserted Topic length and uniqueness equal 42.

- [ ] **Step 6: Add registry lookup and fail-fast integrity validation**

Create `lib/courses/index.ts`:

```ts
import { macroCourse } from "./macro.ts";
import { microCourse } from "./micro.ts";
import type { CourseId, CourseSummary } from "./types.ts";

export const courses = [microCourse, macroCourse] as const;

export function getCourse(courseId: CourseId): CourseSummary {
  const course = courses.find((candidate) => candidate.id === courseId);
  if (!course) throw new Error(`Unknown course: ${courseId}`);
  return course;
}

export function validateCourseRegistry(registry: readonly CourseSummary[]): void {
  if (registry.length !== 2) throw new Error(`Expected 2 courses, received ${registry.length}`);

  for (const course of registry) {
    if (course.units.length !== 6) {
      throw new Error(`${course.id} must contain 6 Units; received ${course.units.length}`);
    }
    const slugs = course.units.flatMap((unit) => unit.labs.map((lab) => lab.slug));
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
    if (duplicateSlugs.length > 0) {
      throw new Error(`${course.id} has duplicate Lab slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);
    }
    if (course.units.some((unit) => unit.labs.length === 0)) {
      throw new Error(`${course.id} contains an empty Unit`);
    }
  }

  const macro = registry.find((course) => course.id === "macro");
  if (!macro) throw new Error("Registry is missing the Macro course");
  const macroTopics = macro.units.flatMap((unit) => unit.labs.flatMap((lab) => lab.topics));
  if (macroTopics.length !== 42 || new Set(macroTopics).size !== 42) {
    throw new Error("Macro must map all 42 CED Topics exactly once");
  }
}

validateCourseRegistry(courses);

export type { CourseId, CourseNote, CourseSummary, LabSummary, UnitSummary } from "./types.ts";
```

- [ ] **Step 7: Run registry tests and type checking**

```bash
pnpm test
pnpm check:types
git diff --check
```

Expected: all tests PASS with counts `[6, 6]`, Labs `[18, 25]`, total `43`, and Macro Topic count/uniqueness `42`.

- [ ] **Step 8: Commit the course domain**

```bash
git add lib/courses tests/course-registry.test.ts tests/course-routes.test.ts
git commit -m "feat: add typed Micro and Macro course registry"
```

### Task 4: Move all completed Micro pages under `/micro` without behavioral refactoring

**Files:**
- Create: `app/micro/page.tsx` by moving `app/page.tsx`
- Move: all 18 `app/<micro-slug>/page.tsx` files to `app/micro/<micro-slug>/page.tsx`
- Create: `app/page.tsx`
- Modify: `components/module-page.tsx`
- Modify: all 18 moved Micro Lab pages only for relative imports and home hrefs
- Create: `scripts/validate-route-files.mjs`

**Interfaces:**
- Consumes: the exact 18 Micro slugs asserted by Task 3.
- Produces: `/micro`, 18 `/micro/<slug>` pages, and a root redirect to `/micro`; old `/<slug>` page files no longer exist.

- [ ] **Step 1: Write the failing physical-route validator**

Create `scripts/validate-route-files.mjs`:

```js
import { access } from "node:fs/promises";

const microSlugs = [
  "ppc", "trade", "marginal", "demand-supply", "elasticity",
  "other-elasticities", "sd", "production-costs", "profit-maximization",
  "perfect-competition", "monopoly", "price-discrimination",
  "monopolistic-competition", "game-theory", "factor-markets",
  "monopsony-labor", "externalities", "inequality-poverty",
];

const requiredFiles = [
  "app/page.tsx",
  "app/micro/page.tsx",
  "app/macro/page.tsx",
  "app/macro/[slug]/page.tsx",
  ...microSlugs.map((slug) => `app/micro/${slug}/page.tsx`),
];

for (const file of requiredFiles) await access(file);

for (const slug of microSlugs) {
  try {
    await access(`app/${slug}/page.tsx`);
    throw new Error(`Old unnamespaced Micro route still exists: /${slug}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Old unnamespaced")) throw error;
  }
}

console.log(`Validated ${requiredFiles.length} route entry files.`);
```

- [ ] **Step 2: Run the route check and verify it fails before the move**

```bash
pnpm check:routes
```

Expected: FAIL because `app/micro/page.tsx` and Macro route entries do not exist yet.

- [ ] **Step 3: Move the Micro course map and 18 Lab directories**

Use `git mv` for the homepage and each of these directories:

```bash
mkdir -p app/micro
git mv app/page.tsx app/micro/page.tsx
git mv app/ppc app/micro/ppc
git mv app/trade app/micro/trade
git mv app/marginal app/micro/marginal
git mv app/demand-supply app/micro/demand-supply
git mv app/elasticity app/micro/elasticity
git mv app/other-elasticities app/micro/other-elasticities
git mv app/sd app/micro/sd
git mv app/production-costs app/micro/production-costs
git mv app/profit-maximization app/micro/profit-maximization
git mv app/perfect-competition app/micro/perfect-competition
git mv app/monopoly app/micro/monopoly
git mv app/price-discrimination app/micro/price-discrimination
git mv app/monopolistic-competition app/micro/monopolistic-competition
git mv app/game-theory app/micro/game-theory
git mv app/factor-markets app/micro/factor-markets
git mv app/monopsony-labor app/micro/monopsony-labor
git mv app/externalities app/micro/externalities
git mv app/inequality-poverty app/micro/inequality-poverty
```

- [ ] **Step 4: Adjust only path-sensitive imports and home links**

In `app/micro/page.tsx`, change imports from `../components/...` to `../../components/...`; Task 6 then relocates this route's rendering body into the shared shell.

In every `app/micro/<slug>/page.tsx`, change imports from `../../components/...` to `../../../components/...`.

Change every Micro `Link` whose sole purpose is returning home from `href="/"` to `href="/micro"`, including `components/module-page.tsx`. Do not change state, formulas, JSX chart geometry, copy, control defaults, pointer handlers, or class strings.

- [ ] **Step 5: Add the root redirect**

Create `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/micro");
}
```

- [ ] **Step 6: Temporarily add Macro route entry files so the validator can reach the intended next failure**

Create `app/macro/page.tsx`:

```tsx
export default function MacroCourseMapPage() {
  return null;
}
```

Create `app/macro/[slug]/page.tsx`:

```tsx
export default function MacroLabPage() {
  return null;
}
```

These two minimal entries are replaced with functional implementations in Task 7; they exist here only to make the route move independently buildable.

- [ ] **Step 7: Verify the route-only move**

```bash
pnpm check:routes
pnpm check:types
pnpm build
git diff --check
```

Expected: all commands PASS. The Next build route report contains `/`, `/micro`, and all 18 `/micro/<slug>` routes. It contains no unnamespaced Micro Lab route.

- [ ] **Step 8: Commit the namespace migration**

```bash
git add app components/module-page.tsx scripts/validate-route-files.mjs
git commit -m "refactor: namespace completed Micro labs"
```

### Task 5: Add the global course switcher in the root layout

**Files:**
- Create: `components/platform/course-switcher.tsx`
- Modify: `app/layout.tsx`
- Modify: `tests/course-routes.test.ts`

**Interfaces:**
- Consumes: `getCourseIdFromPathname(pathname): CourseId | null` from Task 3.
- Produces: `CourseSwitcher(): JSX.Element`, visible on `/micro`, `/macro`, and every Lab page.

- [ ] **Step 1: Add failing route-state edge cases**

Append to `tests/course-routes.test.ts`:

```ts
test("course detection does not accept prefix collisions", () => {
  assert.equal(getCourseIdFromPathname("/microeconomics"), null);
  assert.equal(getCourseIdFromPathname("/macroeconomics"), null);
});
```

- [ ] **Step 2: Run the focused route test**

```bash
node --test --experimental-strip-types tests/course-routes.test.ts
```

Expected: PASS with the Task 3 implementation; the exact-segment logic rejects both collisions.

- [ ] **Step 3: Create the accessible client-side switcher**

Create `components/platform/course-switcher.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getCourseIdFromPathname } from "../../lib/courses/routes.ts";

const options = [
  { id: "micro" as const, href: "/micro", label: "Microeconomics" },
  { id: "macro" as const, href: "/macro", label: "Macroeconomics" },
];

export function CourseSwitcher() {
  const activeCourse = getCourseIdFromPathname(usePathname());

  return (
    <nav
      aria-label="AP Economics course switcher"
      className="sticky top-3 z-50 mx-auto mt-3 flex w-fit gap-1 rounded-full border border-white/70 bg-white/88 p-1 shadow-[0_12px_30px_rgba(31,42,55,0.12)] backdrop-blur"
    >
      {options.map((option) => {
        const active = activeCourse === option.id;
        return (
          <Link
            key={option.id}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={active
              ? "rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white no-underline"
              : "rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] no-underline transition hover:bg-[rgba(31,42,55,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Mount the switcher once for the entire application**

In `app/layout.tsx`, import `CourseSwitcher`, change metadata to:

```ts
export const metadata: Metadata = {
  title: "RAIC Economics Visual Lab",
  description: "AP Microeconomics and AP Macroeconomics interactive visual labs.",
};
```

Render `<CourseSwitcher />` immediately before `{children}` inside `<body>`. Do not wrap individual Micro pages or edit their internal layouts.

- [ ] **Step 5: Verify navigation shell safety**

```bash
pnpm test
pnpm check:types
pnpm build
git diff --check
```

Expected: all commands PASS; the switcher is included by the root layout and no Micro Lab implementation file changes in this task.

- [ ] **Step 6: Commit the global navigation**

```bash
git add app/layout.tsx components/platform/course-switcher.tsx tests/course-routes.test.ts
git commit -m "feat: add persistent Micro and Macro switcher"
```

### Task 6: Extract the completed Micro course-map shell without visual redesign

**Files:**
- Create: `components/platform/course-map.tsx`
- Modify: `app/micro/page.tsx`
- Modify: `lib/courses/micro.ts`

**Interfaces:**
- Consumes: `CourseSummary`, `getLabHref(course.id, lab.slug)`, and the existing homepage JSX/styles.
- Produces: `CourseMap({ course, defaultOpenUnitIds }): JSX.Element`, reused by `/micro` and `/macro`.

- [ ] **Step 1: Relocate the completed homepage renderer into a parameterized client component**

Move `app/micro/page.tsx` to `components/platform/course-map.tsx` with `git mv`. Preserve its complete `HomePage` return tree, including the header, Unit gradients, accordion buttons, Unit snapshot, notes, responsive classes, and animation behavior. Replace its top-level imports, local type declarations, data constants, and function signature with the imports and declarations below; then keep the moved return tree as the body of `CourseMap`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import type { CourseSummary } from "../../lib/courses/types.ts";
import { getLabHref } from "../../lib/courses/routes.ts";
import { surfaceClass } from "../ui-classes";

type CourseMapProps = {
  course: CourseSummary;
  defaultOpenUnitIds?: readonly string[];
};

export function CourseMap({
  course,
  defaultOpenUnitIds = ["unit-1", "unit-2"],
}: CourseMapProps) {
  const [openUnits, setOpenUnits] = useState(() => new Set(defaultOpenUnitIds));
  const totalLabs = course.units.reduce((sum, unit) => sum + unit.labs.length, 0);
}
```

Insert the unchanged `return (...)` statement from the moved `HomePage` immediately after `totalLabs`. Apply these exact substitutions throughout that moved tree:

- `curriculum` → `course.units`
- `notes` → `course.notes`
- `unit.modules` → `unit.labs`
- `module.topic` → `lab.topics.join(" / ")`
- `module.href` → `getLabHref(course.id, lab.slug)`
- fixed Micro eyebrow/title/description → `course.eyebrow`, `course.title`, `course.description`
- fixed total module count → `totalLabs`

Do not change any surface, spacing, color, typography, accordion, card, or responsive class unless the parameter substitution requires it.

- [ ] **Step 2: Make the Micro page a thin registry-backed route**

Replace `app/micro/page.tsx` with:

```tsx
import { CourseMap } from "../../components/platform/course-map";
import { microCourse } from "../../lib/courses/micro.ts";

export default function MicroCourseMapPage() {
  return <CourseMap course={microCourse} />;
}
```

- [ ] **Step 3: Confirm no navigation data remains duplicated in the route**

```bash
rg -n "const curriculum|const notes|href: \"/ppc\"" app/micro/page.tsx components/platform/course-map.tsx
```

Expected: no matches. Course content lives in `lib/courses/micro.ts`; rendering lives in `CourseMap`.

- [ ] **Step 4: Build and manually compare the Micro map**

```bash
pnpm test
pnpm check:types
pnpm build
pnpm dev
```

Open `/micro` and compare it with the Micro source baseline. Verify all six Unit headings, Unit 1/2 default expansion, 18 Lab cards, Unit snapshot, notes, and mobile/desktop layout. Click at least `/micro/ppc`, `/micro/perfect-competition`, and `/micro/inequality-poverty`, then return to `/micro`.

- [ ] **Step 5: Commit the shared course-map shell**

```bash
git add components/platform/course-map.tsx app/micro/page.tsx lib/courses/micro.ts
git commit -m "refactor: extract registry-backed course map"
```

### Task 7: Add the Macro course map and 25 validated shareable migration routes

**Files:**
- Create: `components/platform/macro-migration-notice.tsx`
- Modify: `app/macro/page.tsx`
- Modify: `app/macro/[slug]/page.tsx`
- Modify: `scripts/validate-route-files.mjs`

**Interfaces:**
- Consumes: `macroCourse`, `CourseMap`, and the 25 registered Macro slugs.
- Produces: `/macro` with six expandable Units and `/macro/<slug>` for every registered Lab; unknown slugs call `notFound()`.

- [ ] **Step 1: Add a failing route-parameter test to the registry suite**

Append to `tests/course-registry.test.ts`:

```ts
test("all registered Lab paths are unique after course namespacing", () => {
  const paths = courses.flatMap((course) =>
    course.units.flatMap((unit) => unit.labs.map((lab) => `/${course.id}/${lab.slug}`)),
  );
  assert.equal(paths.length, 43);
  assert.equal(new Set(paths).size, 43);
});
```

Run `pnpm test`. Expected: PASS; this protects the dynamic Macro route before rendering is added.

- [ ] **Step 2: Render the shared course map at `/macro`**

Replace `app/macro/page.tsx` with:

```tsx
import { CourseMap } from "../../components/platform/course-map";
import { macroCourse } from "../../lib/courses/macro.ts";

export default function MacroCourseMapPage() {
  return <CourseMap course={macroCourse} />;
}
```

- [ ] **Step 3: Create the explicit temporary migration notice**

Create `components/platform/macro-migration-notice.tsx`:

```tsx
import Link from "next/link";

import type { LabSummary, UnitSummary } from "../../lib/courses/types.ts";
import { surfaceClass } from "../ui-classes";

type MacroMigrationNoticeProps = {
  lab: LabSummary;
  unit: UnitSummary;
};

export function MacroMigrationNotice({ lab, unit }: MacroMigrationNoticeProps) {
  return (
    <main className="mx-auto w-[min(960px,calc(100vw-20px))] py-6 sm:w-[min(960px,calc(100vw-32px))]">
      <section className={`${surfaceClass} rounded-[28px] px-6 py-8 sm:px-10`}>
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
          {unit.code} · {lab.topics.join(" / ")}
        </span>
        <h1 className="mt-3 text-4xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
          {lab.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{lab.description}</p>
        <p className="mt-6 rounded-[18px] bg-[rgba(31,42,55,0.06)] p-4 text-sm leading-6 text-[var(--muted)]">
          此 Lab 的独立分享地址已经建立，互动内容将在对应 Macro Unit 迁移批次中上线。
        </p>
        <Link className="mt-6 inline-flex rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white no-underline" href="/macro">
          ← 返回 Macroeconomics
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Validate slugs and statically enumerate all Macro pages**

Replace `app/macro/[slug]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";

import { MacroMigrationNotice } from "../../../components/platform/macro-migration-notice";
import { macroCourse } from "../../../lib/courses/macro.ts";

const entries = macroCourse.units.flatMap((unit) =>
  unit.labs.map((lab) => ({ lab, unit })),
);

export function generateStaticParams() {
  return entries.map(({ lab }) => ({ slug: lab.slug }));
}

export default async function MacroLabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = entries.find(({ lab }) => lab.slug === slug);
  if (!entry) notFound();
  return <MacroMigrationNotice lab={entry.lab} unit={entry.unit} />;
}
```

- [ ] **Step 5: Expand route validation to account for generated Macro routes**

In `scripts/validate-route-files.mjs`, import `macroCourse` using native type stripping is unavailable to `.mjs`; instead add the exact 25-slug array already asserted in `tests/course-registry.test.ts`, assert its length is 25 and uniqueness is 25, and keep the physical check for `app/macro/[slug]/page.tsx`. The registry tests remain the authoritative content check; this script remains the filesystem check.

- [ ] **Step 6: Verify course maps, 43 public paths, and 404 behavior**

```bash
pnpm check
pnpm start
```

Against the built server, verify:

```bash
curl -I http://localhost:3000/
curl -I http://localhost:3000/micro
curl -I http://localhost:3000/micro/ppc
curl -I http://localhost:3000/macro
curl -I http://localhost:3000/macro/scarcity-choice
curl -I http://localhost:3000/macro/foreign-exchange
curl -I http://localhost:3000/macro/not-a-lab
```

Expected: `/` redirects to `/micro`; the two course maps and registered sample Labs return success; the unknown Macro slug returns 404. The Next build output statically enumerates 25 Macro slug params.

- [ ] **Step 7: Visually verify the shared navigation contract**

Open `/micro`, `/macro`, `/micro/ppc`, and `/macro/scarcity-choice` at desktop and mobile widths. Verify the switcher is visible on all four pages, its active state follows the route, Macro shows six Units and 25 Lab cards, Unit 1 and 2 default open, and clicking the opposite course always returns to that course map.

- [ ] **Step 8: Commit the Macro skeleton**

```bash
git add app/macro components/platform/macro-migration-notice.tsx \
  scripts/validate-route-files.mjs tests/course-registry.test.ts
git commit -m "feat: add Macro course map and shareable lab routes"
```

### Task 8: Run the foundation release gate and push the checkpoint

**Files:**
- Modify: `docs/migration/micro-baseline.md`
- Create: `README.md`

**Interfaces:**
- Consumes: every foundation deliverable from Tasks 1-7.
- Produces: a public, documented, reproducibly verified foundation checkpoint ready for the Macro Unit 1 plan.

- [ ] **Step 1: Document current behavior and migration status**

Update `README.md` to state:

- The project is the combined RAIC AP Economics visual platform.
- `/micro` contains the completed 6-Unit, 18-Lab Micro course.
- `/macro` contains the 6-Unit, 25-route Macro course map; interactive Labs migrate Unit by Unit.
- Node 24.x and pnpm 10.32.1 are required.
- Local commands are `pnpm install --frozen-lockfile`, `pnpm dev`, and `pnpm check`.
- Old unnamespaced Micro URLs are unsupported.

Append the actual baseline and final foundation `pnpm build` results, date, and commit IDs to `docs/migration/micro-baseline.md`.

- [ ] **Step 2: Run the complete automated release gate from a clean dependency state**

```bash
git status --short
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

Expected: install uses the lockfile without mutation; tests, type checking, route validation, and production build all PASS; only intended documentation changes remain unstaged.

- [ ] **Step 3: Review the change scope against the protected Micro baseline**

```bash
BASELINE_COMMIT="$(git rev-list --max-parents=0 HEAD)"
git diff --stat "$BASELINE_COMMIT"..HEAD
git diff --name-status "$BASELINE_COMMIT"..HEAD
git log --oneline --decorate --reverse
```

Expected: Micro Lab page changes are limited to route relocation, relative imports, and home links. There are no formula, SVG geometry, default-value, event-handler, or instructional-copy changes inside Micro Labs.

- [ ] **Step 4: Commit documentation and push all foundation commits**

```bash
git add README.md docs/migration/micro-baseline.md
git commit -m "docs: record RAIC Economics foundation checkpoint"
git push origin main
gh repo view --web
```

Expected: the public repository shows the foundation commits on `main` and the working tree is clean.

- [ ] **Step 5: Record the handoff to the next independent plan**

The next planning activity is `docs/superpowers/plans/YYYY-MM-DD-raic-economics-macro-unit-1.md`. It must begin with tests for Unit 1's pure calculations, replace the four Unit 1 migration notices, and leave the remaining 21 Macro slugs on the explicit migration notice.

## Plan Self-Review

- **Spec coverage:** This foundation plan covers clean-history creation, public GitHub publication, Micro source preservation, Next.js configuration cleanup, `/` redirect, `/micro` route migration, global switcher, shared course map, full course registry, 42-Topic integrity, 25 Macro shareable routes, 404 behavior, and build/type/route checks. The six Macro implementation deliveries and final release QA are explicitly separated into the six follow-on plans listed above.
- **Completeness scan:** Every intermediate screen and failure behavior is specified. The Macro migration notice is a deliberate, fully specified intermediate product state and is removed Unit by Unit by named follow-on plans.
- **Type consistency:** The plan consistently uses `CourseId`, `CourseSummary`, `UnitSummary`, `LabSummary`, `getLabHref`, `getCourseIdFromPathname`, `microCourse`, `macroCourse`, `courses`, and `validateCourseRegistry` with the signatures defined in Task 3.
