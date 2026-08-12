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
