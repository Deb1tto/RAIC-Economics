import { CourseMap } from "../../components/platform/course-map";
import { macroCourse } from "../../lib/courses/macro.ts";

export default function MacroCourseMapPage() {
  return <CourseMap course={macroCourse} />;
}
