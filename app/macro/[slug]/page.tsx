import { notFound } from "next/navigation";

import { MacroMigrationNotice } from "../../../components/platform/macro-migration-notice";
import { macroCourse } from "../../../lib/courses/macro.ts";

const entries = macroCourse.units.flatMap((unit) =>
  unit.labs.map((lab) => ({ lab, unit })),
);

export function generateStaticParams() {
  return entries.map(({ lab }) => ({ slug: lab.slug }));
}

export default async function MacroLabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = entries.find(({ lab }) => lab.slug === slug);
  if (!entry) notFound();
  return <MacroMigrationNotice lab={entry.lab} unit={entry.unit} />;
}
