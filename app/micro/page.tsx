import { CourseMap } from "../../components/platform/course-map";
import { microCourse } from "../../lib/courses/micro.ts";

export default function MicroCourseMapPage() {
  return <CourseMap course={microCourse} />;
}
