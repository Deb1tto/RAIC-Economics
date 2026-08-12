import { access, readFile } from "node:fs/promises";

const microSlugs = [
  "ppc", "trade", "marginal", "demand-supply", "elasticity",
  "other-elasticities", "sd", "production-costs", "profit-maximization",
  "perfect-competition", "monopoly", "price-discrimination",
  "monopolistic-competition", "game-theory", "factor-markets",
  "monopsony-labor", "externalities", "inequality-poverty",
];

const requiredFiles = [
  "app/page.tsx",
  "app/micro/page.tsx",
  "app/macro/page.tsx",
  "app/macro/[slug]/page.tsx",
  ...microSlugs.map((slug) => `app/micro/${slug}/page.tsx`),
];

for (const file of requiredFiles) await access(file);

for (const slug of microSlugs) {
  try {
    await access(`app/${slug}/page.tsx`);
    throw new Error(`Old unnamespaced Micro route still exists: /${slug}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Old unnamespaced")) throw error;
  }
}

const microCourseMap = await readFile("app/micro/page.tsx", "utf8");
for (const slug of microSlugs) {
  const oldHref = `href: "/${slug}"`;
  if (microCourseMap.includes(oldHref)) {
    throw new Error(`Old unnamespaced Micro course-map link still exists: /${slug}`);
  }
}

console.log(`Validated ${requiredFiles.length} route entry files.`);
