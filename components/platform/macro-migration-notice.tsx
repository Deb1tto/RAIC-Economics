import Link from "next/link";

import type { LabSummary, UnitSummary } from "../../lib/courses/types.ts";
import { surfaceClass } from "../ui-classes";

type MacroMigrationNoticeProps = {
  lab: LabSummary;
  unit: UnitSummary;
};

export function MacroMigrationNotice({ lab, unit }: MacroMigrationNoticeProps) {
  return (
    <main className="mx-auto w-[min(960px,calc(100vw-20px))] py-6 sm:w-[min(960px,calc(100vw-32px))]">
      <section className={`${surfaceClass} rounded-[28px] px-6 py-8 sm:px-10`}>
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
          {unit.code} · {lab.topics.join(" / ")}
        </span>
        <h1 className="mt-3 text-4xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
          {lab.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{lab.description}</p>
        <p className="mt-6 rounded-[18px] bg-[rgba(31,42,55,0.06)] p-4 text-sm leading-6 text-[var(--muted)]">
          此 Lab 的独立分享地址已经建立，互动内容将在对应 Macro Unit 迁移批次中上线。
        </p>
        <Link className="mt-6 inline-flex rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white no-underline" href="/macro">
          ← 返回 Macroeconomics
        </Link>
      </section>
    </main>
  );
}
