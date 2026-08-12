# RAIC Economics

RAIC Economics is a combined AP Economics visual-learning platform. It preserves the completed AP Microeconomics course as the product baseline while AP Macroeconomics is migrated into the same application, one Unit at a time.

- [`/micro`](/micro) contains the completed six-Unit, 18-Lab Microeconomics course.
- [`/macro`](/macro) contains the six-Unit, 25-route Macroeconomics course map. Its interactive Labs are being migrated Unit by Unit; an unmigrated Lab shows an explicit migration notice at its permanent shareable address.

## Local development

Use Node.js 24.x and pnpm 10.32.1.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

`pnpm check` runs the automated tests, TypeScript check, route validation, and production build.

## URL policy

Micro and Macro Labs use namespaced URLs. The old unnamespaced Micro URLs (for example, `/ppc`) are intentionally unsupported; use `/micro/ppc` instead. Macro Lab URLs remain stable while their interactive implementations are migrated.

## Next handoff

The next plan is `docs/superpowers/plans/YYYY-MM-DD-raic-economics-macro-unit-1.md`. It must start with Unit 1 pure-calculation tests, replace the four Unit 1 migration notices, and leave the other 21 Macro slugs on the explicit migration notice.
