"use client";

import Link from "next/link";
import { useState } from "react";

import { surfaceClass } from "../components/ui-classes";

type UnitModule = {
  href: string;
  topic: string;
  title: string;
  description: string;
};

type CurriculumUnit = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  weighting: string;
  accent: string;
  accentSoft: string;
  border: string;
  text: string;
  modules: UnitModule[];
};

type HomeNote = {
  title: string;
  description: string;
};

const curriculum: CurriculumUnit[] = [
  {
    id: "unit-1",
    code: "Unit 1",
    title: "Basic Economic Concepts",
    subtitle: "基础经济学概念",
    weighting: "AP 考试权重: 12–15%",
    accent: "from-[#6c5531] to-[#cfa66a]",
    accentSoft: "bg-[rgba(207,166,106,0.12)]",
    border: "border-[rgba(207,166,106,0.32)]",
    text: "text-[#7a5732]",
    modules: [
      {
        href: "/ppc",
        topic: "Unit 1.3",
        title: "生产可能性曲线",
        description: "PPC、效率、机会成本与经济增长。",
      },
      {
        href: "/trade",
        topic: "Unit 1.4",
        title: "比较优势与贸易",
        description: "绝对优势、比较优势、贸易条件与贸易红利。",
      },
      {
        href: "/marginal",
        topic: "Unit 1.5 / 1.6",
        title: "边际分析与消费者选择",
        description: "净收益、MB=MC、边际效用与预算分配。",
      },
    ],
  },
  {
    id: "unit-2",
    code: "Unit 2",
    title: "Supply and Demand",
    subtitle: "供给与需求",
    weighting: "AP 考试权重: 20–25%",
    accent: "from-[#1f6a5c] to-[#7cc7b7]",
    accentSoft: "bg-[rgba(76,183,171,0.12)]",
    border: "border-[rgba(76,183,171,0.28)]",
    text: "text-[#1f6a5c]",
    modules: [
      {
        href: "/demand-supply",
        topic: "Unit 2.1 / 2.2",
        title: "需求与供给",
        description: "需求法则、供给法则、沿线移动与整线平移。",
      },
      {
        href: "/elasticity",
        topic: "Unit 2.3 / 2.4",
        title: "价格弹性",
        description: "PED、PES、总收益测试与弹性决定因素。",
      },
      {
        href: "/other-elasticities",
        topic: "Unit 2.5",
        title: "交叉价格与收入弹性",
        description: "YED、XED、商品属性与相关商品关系。",
      },
      {
        href: "/sd",
        topic: "Unit 2.6 / 2.7 / 2.8",
        title: "市场均衡、失衡与政府干预",
        description: "均衡、剩余、短缺过剩、价格管制、税收补贴与 DWL。",
      },
    ],
  },
  {
    id: "unit-3",
    code: "Unit 3",
    title: "Production, Cost, and the Perfect Competition Model",
    subtitle: "生产、成本与完全竞争",
    weighting: "AP 考试权重: 22–25%",
    accent: "from-[#84511f] to-[#e1aa67]",
    accentSoft: "bg-[rgba(225,170,103,0.12)]",
    border: "border-[rgba(225,170,103,0.28)]",
    text: "text-[#84511f]",
    modules: [
      {
        href: "/production-costs",
        topic: "Unit 3.1 / 3.2 / 3.3",
        title: "生产函数与成本曲线",
        description: "TP、MP、AP、短期成本与长期规模经济。",
      },
      {
        href: "/profit-maximization",
        topic: "Unit 3.4 / 3.5",
        title: "利润类型与利润最大化",
        description: "会计利润、经济利润、正常利润与 MR=MC 法则。",
      },
      {
        href: "/perfect-competition",
        topic: "Unit 3.6 / 3.7",
        title: "完全竞争市场",
        description: "价格接受者、停业规则、长期进入退出与零经济利润。",
      },
    ],
  },
  {
    id: "unit-4",
    code: "Unit 4",
    title: "Imperfect Competition",
    subtitle: "不完全竞争",
    weighting: "AP 考试权重: 15–22%",
    accent: "from-[#7c3f1f] to-[#db9560]",
    accentSoft: "bg-[rgba(219,149,96,0.12)]",
    border: "border-[rgba(219,149,96,0.28)]",
    text: "text-[#7c3f1f]",
    modules: [
      {
        href: "/monopoly",
        topic: "Unit 4.1 / 4.2",
        title: "垄断市场",
        description: "MR 低于价格、垄断定价、利润矩形与无谓损失。",
      },
      {
        href: "/price-discrimination",
        topic: "Unit 4.3",
        title: "价格歧视",
        description: "分段定价、完全价格歧视、CS 归零与 DWL 消失。",
      },
      {
        href: "/monopolistic-competition",
        topic: "Unit 4.4",
        title: "垄断竞争",
        description: "短期像垄断、长期零利润、相切与过剩产能。",
      },
      {
        href: "/game-theory",
        topic: "Unit 4.5",
        title: "寡头与博弈论",
        description: "2x2 收益矩阵、占优策略、纳什均衡与共谋破裂。",
      },
    ],
  },
  {
    id: "unit-5",
    code: "Unit 5",
    title: "Factor Markets",
    subtitle: "要素市场",
    weighting: "AP 考试权重: 10–13%",
    accent: "from-[#4e6124] to-[#a7c764]",
    accentSoft: "bg-[rgba(167,199,100,0.14)]",
    border: "border-[rgba(167,199,100,0.28)]",
    text: "text-[#4e6124]",
    modules: [
      {
        href: "/factor-markets",
        topic: "Unit 5.1 / 5.2 / 5.3",
        title: "要素需求与供给",
        description: "MRP、MRC、最优雇佣与派生需求平移。",
      },
      {
        href: "/monopsony-labor",
        topic: "Unit 5.4",
        title: "买方垄断劳动力市场",
        description: "MFC、高于工资的成本、低工资低雇佣与 DWL。",
      },
    ],
  },
  {
    id: "unit-6",
    code: "Unit 6",
    title: "Market Failure and the Role of Government",
    subtitle: "市场失灵与政府角色",
    weighting: "AP 考试权重: 8–13%",
    accent: "from-[#4d3e86] to-[#9b8cf0]",
    accentSoft: "bg-[rgba(149,130,236,0.12)]",
    border: "border-[rgba(149,130,236,0.26)]",
    text: "text-[#5a4aa3]",
    modules: [
      {
        href: "/externalities",
        topic: "Unit 6.2",
        title: "外部性",
        description: "市场失灵、社会最优产量、皮古税、补贴与福利纠偏。",
      },
      {
        href: "/inequality-poverty",
        topic: "Unit 6.5",
        title: "不平等与贫困",
        description: "洛伦兹曲线、累进税、累退税、转移支付与再分配。",
      },
    ],
  },
];

const notes: HomeNote[] = [
  {
    title: "教学 UX 规则",
    description:
      "每个实验页都保持步骤区、操作区、图表区和数据项的固定结构，让学生总能知道自己改了什么，以及图上为什么会变。",
  },
  {
    title: "术语策略",
    description:
      "关键概念保持中英双语并贴合 AP 课堂语境，例如 Deadweight Loss、Allocative Efficiency、Nash Equilibrium 与 Derived Demand。",
  },
  {
    title: "使用方式",
    description:
      "推荐先让学生口头预测，再进入实验拖动变量验证。首页按 Unit 组织后，更适合配合学期进度或考前专题复习。",
  },
];

const defaultOpenUnits = new Set(["unit-1", "unit-2"]);

export default function HomePage() {
  const [openUnits, setOpenUnits] = useState<Set<string>>(defaultOpenUnits);

  const totalUnits = curriculum.length;
  const totalModules = curriculum.reduce((sum, unit) => sum + unit.modules.length, 0);

  return (
    <div className="mx-auto w-[min(1280px,calc(100vw-20px))] py-3 sm:w-[min(1280px,calc(100vw-32px))] sm:py-6">
      <header
        className={`${surfaceClass} relative mb-6 overflow-hidden rounded-[36px] px-6 py-8 sm:px-10 sm:py-10`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,150,78,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(79,117,176,0.16),transparent_34%)]" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              AP Microeconomics Visual Lab
            </span>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold tracking-[0.04em] text-emerald-700">
              Aligned with AP Curriculum
            </span>
          </div>

          <h1 className="mb-4 max-w-5xl text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-6xl">
            交互式经济学原理可视化平台
          </h1>

          <p className="max-w-4xl text-lg leading-8 text-[var(--muted)]">
            用严格贴合 AP 大纲的 Unit 导航，组织所有图形实验。让学生既能看到全局备考地图，也能快速进入某一个核心考点的可视化推演。
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[24px] border border-white/70 bg-white/70 p-5 backdrop-blur-[10px]">
              <div className="mb-3 text-sm font-semibold text-[var(--muted)]">AP 备考概览</div>
              <div className="mb-3 flex flex-wrap gap-3">
                <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                  6 大核心 Unit
                </span>
                <span className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                  {totalModules} 个图形实验
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
            {curriculum.map((unit) => {
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
                          {unit.modules.length} 个实验
                        </span>
                        <span className="text-2xl font-semibold">{open ? "−" : "+"}</span>
                      </div>
                    </div>
                  </button>

                  {open ? (
                    <div className={`p-4 sm:p-5 ${unit.accentSoft}`}>
                      <div className="grid gap-4 md:grid-cols-2">
                        {unit.modules.map((module) => (
                          <Link
                            key={module.href}
                            href={module.href}
                            className={`flex min-h-[190px] flex-col rounded-[24px] border bg-white/82 p-5 no-underline shadow-[0_16px_28px_rgba(31,42,55,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_34px_rgba(31,42,55,0.12)] ${unit.border}`}
                          >
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-[0.06em] ${unit.accentSoft} ${unit.text}`}>
                              {module.topic}
                            </span>
                            <h4 className="mt-4 text-2xl tracking-[0.01em] text-[var(--ink)] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                              {module.title}
                            </h4>
                            <p className="mt-3 text-base leading-7 text-[var(--muted)]">{module.description}</p>
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
              {curriculum.map((unit) => (
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
                  <span className="text-sm font-semibold text-[var(--muted)]">{unit.modules.length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="mt-6 grid gap-4 lg:grid-cols-3">
        {notes.map((note) => (
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
