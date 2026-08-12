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

test("all registered Lab paths are unique after course namespacing", () => {
  const paths = courses.flatMap((course) =>
    course.units.flatMap((unit) => unit.labs.map((lab) => `/${course.id}/${lab.slug}`)),
  );
  assert.equal(paths.length, 43);
  assert.equal(new Set(paths).size, 43);
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

test("registry integrity validator rejects course IDs outside the approved order", () => {
  assert.throws(
    () => validateCourseRegistry([courses[1], courses[0]]),
    /course IDs must be exactly micro, macro/,
  );
});

test("registry integrity validator rejects incorrect per-course Lab totals", () => {
  const invalid = structuredClone(courses) as unknown as Array<{
    units: Array<{ labs: Array<{ slug: string }> }>;
  }>;
  invalid[0].units[0].labs.pop();
  assert.throws(
    () => validateCourseRegistry(invalid as unknown as CourseSummary[]),
    /micro must contain 18 Labs; received 17/,
  );
});

test("registry integrity validator rejects an unapproved Macro Topic code", () => {
  const invalid = structuredClone(courses) as unknown as Array<{
    units: Array<{ labs: Array<{ topics: string[] }> }>;
  }>;
  invalid[1].units[0].labs[0].topics[0] = "9.9";
  assert.throws(
    () => validateCourseRegistry(invalid as unknown as CourseSummary[]),
    /Macro must map the approved 42 CED Topics exactly once/,
  );
});
