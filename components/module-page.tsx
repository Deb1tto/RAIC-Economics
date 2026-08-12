import type { ReactNode } from "react";

import Link from "next/link";

import { surfaceClass } from "./ui-classes";

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  controls: ReactNode;
  metrics: ReactNode;
  visual: ReactNode;
  feedback: string;
};

export function ModulePage({
  eyebrow,
  title,
  description,
  controls,
  metrics,
  visual,
  feedback,
}: ModulePageProps) {
  return (
    <div className="mx-auto w-[min(1240px,calc(100vw-20px))] px-0 py-3 sm:w-[min(1240px,calc(100vw-32px))] sm:py-6">
      <header className={`${surfaceClass} mb-5 flex flex-col gap-5 rounded-[28px] px-5 py-5 sm:px-8 sm:py-7 lg:flex-row lg:items-start`}>
        <Link
          href="/"
          className="inline-flex h-fit items-center rounded-full bg-[rgba(31,42,55,0.06)] px-4 py-3 text-sm font-semibold text-inherit no-underline transition hover:bg-[rgba(31,42,55,0.1)]"
        >
          ← 返回主页
        </Link>
        <div className="min-w-0">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">{description}</p>
        </div>
      </header>

      <main className="grid gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <aside className={`${surfaceClass} rounded-[24px] p-6`}>{controls}</aside>
        <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics}</div>
          {visual}
        </section>
      </main>

      <section className={`${surfaceClass} mt-5 rounded-[24px] px-6 py-5`}>
        <h2 className="mb-2 text-2xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
          So What?
        </h2>
        <p className="m-0 text-base leading-7 text-[var(--muted)]">{feedback}</p>
      </section>
    </div>
  );
}
