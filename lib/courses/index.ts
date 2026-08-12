import { macroCourse } from "./macro.ts";
import { microCourse } from "./micro.ts";
import type { CourseId, CourseSummary } from "./types.ts";

export const courses = [microCourse, macroCourse] as const;

const approvedCourseIds = ["micro", "macro"] as const;
const approvedLabTotals = [18, 25] as const;
const approvedMacroTopics = new Set([
  ...Array.from({ length: 6 }, (_, index) => `1.${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `2.${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `3.${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `4.${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `5.${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `6.${index + 1}`),
]);

export function getCourse(courseId: CourseId): CourseSummary {
  const course = courses.find((candidate) => candidate.id === courseId);
  if (!course) throw new Error(`Unknown course: ${courseId}`);
  return course;
}

export function validateCourseRegistry(registry: readonly CourseSummary[]): void {
  if (registry.length !== 2) throw new Error(`Expected 2 courses, received ${registry.length}`);

  if (!registry.every((course, index) => course.id === approvedCourseIds[index])) {
    throw new Error("course IDs must be exactly micro, macro");
  }

  for (const [index, course] of registry.entries()) {
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
    if (slugs.length !== approvedLabTotals[index]) {
      throw new Error(`${course.id} must contain ${approvedLabTotals[index]} Labs; received ${slugs.length}`);
    }
  }

  const macro = registry.find((course) => course.id === "macro");
  if (!macro) throw new Error("Registry is missing the Macro course");
  const macroTopics = macro.units.flatMap((unit) => unit.labs.flatMap((lab) => lab.topics));
  if (
    macroTopics.length !== approvedMacroTopics.size
    || new Set(macroTopics).size !== approvedMacroTopics.size
    || macroTopics.some((topic) => !approvedMacroTopics.has(topic))
  ) {
    throw new Error("Macro must map the approved 42 CED Topics exactly once");
  }
}

validateCourseRegistry(courses);

export type { CourseId, CourseNote, CourseSummary, LabSummary, UnitSummary } from "./types.ts";
