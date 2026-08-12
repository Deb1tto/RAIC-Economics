"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getCourseIdFromPathname } from "../../lib/courses/routes.ts";

const options = [
  { id: "micro" as const, href: "/micro", label: "Microeconomics" },
  { id: "macro" as const, href: "/macro", label: "Macroeconomics" },
];

export function CourseSwitcher() {
  const activeCourse = getCourseIdFromPathname(usePathname());

  return (
    <nav
      aria-label="AP Economics course switcher"
      className="sticky top-3 z-50 mx-auto mt-3 flex w-fit gap-1 rounded-full border border-white/70 bg-white/88 p-1 shadow-[0_12px_30px_rgba(31,42,55,0.12)] backdrop-blur"
    >
      {options.map((option) => {
        const active = activeCourse === option.id;
        return (
          <Link
            key={option.id}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={active
              ? "rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white no-underline"
              : "rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] no-underline transition hover:bg-[rgba(31,42,55,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
