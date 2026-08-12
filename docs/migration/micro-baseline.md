# Micro Source Baseline

- Repository: `OpenPlaybook/visual-econ`
- Branch: `sync/online-lesson-source`
- Commit: `e80d1d4d5b89f1a4e70360171bf8ced705900ee0`
- Imported history: none
- Baseline Labs: 18
- Baseline verification: `pnpm install --frozen-lockfile` and `pnpm build`

The first commit in this repository is an unmodified export of the tracked files at the pinned commit. Micro remains the product and interaction baseline while Macro is migrated into this repository.

## Build record

- **2026-08-12 — Micro baseline:** `pnpm install --frozen-lockfile` completed without lockfile mutation and `pnpm build` passed on `0fb3d5191db47daebea05317a39266034cf0a95d` (`Import completed AP Microeconomics visual lab`). Next.js 16.1.6 generated 21 static routes. pnpm reported that `sharp@0.34.5` build scripts were ignored; the production build still passed.
- **2026-08-12 — Foundation application:** the complete release-gate `pnpm check` passed on `7e016f63b7d906c0fc5d804d376d6e3b35e3fdd2` (`feat: add Macro course map and shareable lab routes`), before the documentation-only checkpoint. It passed all 16 tests, `tsc --noEmit`, route validation for 22 route-entry files, and the final Next.js 16.1.6 production build, which generated 48 static pages including all 25 Macro paths and 18 Micro Lab paths. The test runner emitted `[MODULE_TYPELESS_PACKAGE_JSON]` warnings for `tests/course-registry.test.ts` and `tests/course-routes.test.ts`, and the preceding frozen install reported ignored `sharp@0.34.5` build scripts; neither warning prevented the check from passing.
