import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Micro route delegates its map renderer to the shared CourseMap", async () => {
  const [microRoute, courseMap] = await Promise.all([
    readFile(new URL("../app/micro/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/course-map.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(microRoute, /import \{ CourseMap \} from "\.\.\/\.\.\/components\/platform\/course-map"/);
  assert.match(microRoute, /return <CourseMap course=\{microCourse\} \/>;/);
  assert.doesNotMatch(microRoute, /const curriculum|const notes|href: "\/ppc"/);
  assert.match(courseMap, /export function CourseMap/);
  assert.match(courseMap, /getLabHref\(course\.id, lab\.slug\)/);
});
