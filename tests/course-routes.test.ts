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

test("course detection does not accept prefix collisions", () => {
  assert.equal(getCourseIdFromPathname("/microeconomics"), null);
  assert.equal(getCourseIdFromPathname("/macroeconomics"), null);
});
