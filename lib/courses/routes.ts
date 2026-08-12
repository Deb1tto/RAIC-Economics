import type { CourseId } from "./types.ts";

export function getLabHref(courseId: CourseId, slug: string): string {
  return `/${courseId}/${slug}`;
}

export function getCourseIdFromPathname(pathname: string): CourseId | null {
  if (pathname === "/micro" || pathname.startsWith("/micro/")) return "micro";
  if (pathname === "/macro" || pathname.startsWith("/macro/")) return "macro";
  return null;
}
