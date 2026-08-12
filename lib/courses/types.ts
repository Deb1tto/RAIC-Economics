export type CourseId = "micro" | "macro";

export type LabSummary = {
  slug: string;
  topics: readonly string[];
  title: string;
  description: string;
};

export type UnitSummary = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  weighting: string;
  accent: string;
  accentSoft: string;
  border: string;
  text: string;
  labs: readonly LabSummary[];
};

export type CourseNote = {
  title: string;
  description: string;
};

export type CourseSummary = {
  id: CourseId;
  eyebrow: string;
  title: string;
  description: string;
  units: readonly UnitSummary[];
  notes: readonly CourseNote[];
};
