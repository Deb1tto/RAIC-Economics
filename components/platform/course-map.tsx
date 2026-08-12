"use client";

import Link from "next/link";
import { useState } from "react";

import type { CourseSummary } from "../../lib/courses/types.ts";
import { getLabHref } from "../../lib/courses/routes.ts";
import { surfaceClass } from "../ui-classes";

type CourseMapProps = {
  course: CourseSummary;
  defaultOpenUnitIds?: readonly string[];
};

export function CourseMap({
  course,
  defaultOpenUnitIds = ["unit-1", "unit-2"],
}: CourseMapProps) {
  const [openUnits, setOpenUnits] = useState(() => new Set(defaultOpenUnitIds));
  const totalLabs = course.units.reduce((sum, unit) => sum + unit.labs.length, 0);

  return (
    <div className="mx-auto w-[min(1280px,calc(100vw-20px))] py-3 sm:w-[min(1280px,calc(100vw-32px))] sm:py-6">
      <header
        className={`${surfaceClass} relative mb-6 overflow-hidden rounded-[36px] px-6 py-8 sm:px-10 sm:py-10`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,150,78,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(79,117,176,0.16),transparent_34%)]" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              {course.eyebrow}
            </span>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-emerald-700">
              Aligned with AP Curriculum
            </span>
          </div>

          <h1 className="mb-4 max-w-5xl text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-6xl">
            {course.title}
          </h1>

          <p className="max-w-4xl text-lg leading-8 text-[var(--muted)]">
            {course.description}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[24px] border border-white/70 bg-white/70 p-5 backdrop-blur-[10px]">
              <div className="mb-3 text-sm font-semibold text-[var(--muted)]">AP 备考概览</div>
              <div className="mb-3 flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                  {course.units.length} 大核心 Unit
                </span>
                <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                  {totalLabs} 个图形实验
                </span>
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                  覆盖 100% 核心图形考点
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[rgba(31,42,55,0.08)]">
                <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,#d07f46,#e5b16b,#7dbcb0,#8f85df)]" />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/70 p-5 backdrop-blur-[10px]">
              <div className="mb-2 text-sm font-semibold text-[var(--muted)]">首页使用方式</div>
              <p className="m-0 text-sm leading-7 text-[var(--muted)]">
                默认展开 Unit 1 和 Unit 2，便于从基础概念与供需模型开始进入。其余 Unit 可按教学进度或考前复习需求逐个展开。
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">Curriculum Navigation</div>
              <h2 className="mt-2 text-3xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                按 AP 官方 Unit 浏览全部实验
              </h2>
            </div>
            <div className="hidden rounded-full bg-[rgba(31,42,55,0.08)] px-4 py-2 text-sm font-semibold text-[var(--muted)] lg:inline-flex">
              点击 Unit 标题栏展开或收起模块
            </div>
          </div>

          <div className="grid gap-4">
            {course.units.map((unit) => {
              const open = openUnits.has(unit.id);

              return (
                <section
                  key={unit.id}
                  className={`${surfaceClass} overflow-hidden rounded-[30px] border ${unit.border}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenUnits((current) => {
                        const next = new Set(current);
                        if (next.has(unit.id)) {
                          next.delete(unit.id);
                        } else {
                          next.add(unit.id);
                        }
                        return next;
                      })
                    }
                    className={`w-full bg-gradient-to-r ${unit.accent} px-5 py-5 text-left text-white transition hover:brightness-[1.03] sm:px-6`}
                    title="点击展开该单元模块"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-xs font-semibold tracking-[0.08em]">
                            {unit.code}
                          </span>
                          <span className="inline-flex rounded-full bg-white/18 px-3 py-1 text-xs font-semibold">
                            {unit.weighting}
                          </span>
                        </div>
                        <h3 className="text-2xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-3xl">
                          {unit.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/86">{unit.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-3 self-start lg:self-center">
                        <span className="inline-flex rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold">
                          {unit.labs.length} 个实验
                        </span>
                        <span className="text-2xl font-semibold">{open ? "−" : "+"}</span>
                      </div>
                    </div>
                  </button>

                  {open ? (
                    <div className={`p-4 sm:p-5 ${unit.accentSoft}`}>
                      <div className="grid gap-4 md:grid-cols-2">
                        {unit.labs.map((lab) => (
                          <Link
                            key={lab.slug}
                            href={getLabHref(course.id, lab.slug)}
                            className={`flex min-h-[190px] flex-col rounded-[24px] border bg-white/82 p-5 no-underline shadow-[0_16px_28px_rgba(31,42,55,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_34px_rgba(31,42,55,0.12)] ${unit.border}`}
                          >
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-[0.06em] ${unit.accentSoft} ${unit.text}`}>
                              {lab.topics.join(" / ")}
                            </span>
                            <h4 className="mt-4 text-2xl tracking-[0.01em] text-[var(--ink)] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                              {lab.title}
                            </h4>
                            <p className="mt-3 text-base leading-7 text-[var(--muted)]">{lab.description}</p>
                            <div className={`mt-auto pt-4 text-sm font-semibold ${unit.text}`}>进入实验</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className={`${surfaceClass} rounded-[28px] p-5`}>
            <div className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">Unit Snapshot</div>
            <div className="grid gap-3">
              {course.units.map((unit) => (
                <button
                  key={`jump-${unit.id}`}
                  type="button"
                  onClick={() =>
                    setOpenUnits((current) => {
                      const next = new Set(current);
                      next.add(unit.id);
                      return next;
                    })
                  }
                  className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition hover:bg-white/75 ${unit.border} ${unit.accentSoft}`}
                >
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${unit.text}`}>{unit.code}</span>
                    <span className="block text-xs leading-5 text-[var(--muted)]">{unit.weighting}</span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--muted)]">{unit.labs.length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="mt-6 grid gap-4 lg:grid-cols-3">
        {course.notes.map((note) => (
          <article key={note.title} className={`${surfaceClass} rounded-[24px] p-6`}>
            <h3 className="mb-2 text-2xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {note.title}
            </h3>
            <p className="m-0 leading-7 text-[var(--muted)]">{note.description}</p>
          </article>
        ))}
      </footer>
    </div>
  );
}
