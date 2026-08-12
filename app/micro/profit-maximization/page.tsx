"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ButtonGroup } from "../../../components/button-group";
import { ChartFrame } from "../../../components/chart-frame";
import {
  CHART,
  areaPointsToPath,
  clamp,
  getChartScales,
  linePointsToPath,
  round,
  type Point,
} from "../../../components/chart-utils";
import {
  chartLabelClass,
  chartSmallLabelClass,
  chartSvgClass,
  curveClass,
  dashedClass,
  gridLineClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../../components/ui-classes";

type LessonStep = "profit-types" | "total-profit" | "mr-mc";
type ProfitAnnotation = "accounting-profit" | "economic-profit";
type MetricKey =
  | "types-accounting"
  | "types-economic"
  | "types-status"
  | "total-tr"
  | "total-tc"
  | "total-mc"
  | "total-profit"
  | "marginal-mr"
  | "marginal-mc"
  | "marginal-profit"
  | "marginal-action";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "profit-types",
    title: "步骤一：会计与经济利润",
    summary: "把隐性成本加进来，重新定义真正的利润。",
    description:
      "会计利润只扣除了显性成本，但经济利润还要扣除隐性成本。只要总收入刚好覆盖显性成本和隐性成本，企业就拿到了正常利润，足以继续留在行业里。",
    chartTitle: "两种利润计算视角的对比",
    chartSubtitle: "调整收入与成本，观察经济利润何时变成零，并理解正常利润为何不是“没赚钱”。",
  },
  {
    id: "total-profit",
    title: "步骤二：总量视角的利润",
    summary: "在 TR 和 TC 的垂直差距里找到总利润最大的产量。",
    description:
      "最大的总收入并不等于最大的总利润。真正重要的是总收益曲线和总成本曲线之间的垂直距离，它在哪个数量上最大，利润就在哪个数量上最大。",
    chartTitle: "总利润最大化的几何位置",
    chartSubtitle: "拖动产量游标，观察 TR 与 TC 的垂直距离如何先扩大后缩小。",
  },
  {
    id: "mr-mc",
    title: "步骤三：MR = MC 黄金法则",
    summary: "把总量问题转成边际问题，锁定利润最大化点 Q*。",
    description:
      "只要边际收益大于边际成本，多生产一单位就会继续增加总利润；一旦边际收益小于边际成本，再生产就会反过来吃掉利润。企业会在 MR = MC 的地方停下来。",
    chartTitle: "边际收益与边际成本决策",
    chartSubtitle: "观察交点左边为何该扩产，交点右边为何该减产，以及 Q* 为什么就是利润最大化点。",
  },
];

const baseline = {
  step: "profit-types" as LessonStep,
  explicitCost: 40,
  implicitCost: 30,
  totalRevenue: 80,
  quantity: 0,
  showTotalCostTangent: false,
  profitAnnotations: ["accounting-profit", "economic-profit"] as ProfitAnnotation[],
};

const MAX_Q = 18;
const MR_LEVEL = 12;
const Q_STAR = 10;

function totalRevenueAt(quantity: number): number {
  return MR_LEVEL * quantity;
}

function totalCostAt(quantity: number): number {
  return 18 + 2 * quantity + 0.5 * quantity * quantity;
}

function marginalCostAt(quantity: number): number {
  return 2 + quantity;
}

function buildCurve(
  max: number,
  step: number,
  fn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const points: Point[] = [];
  for (let value = 0; value <= max; value += step) {
    points.push({ x: xScale(value), y: yScale(fn(value)) });
  }

  if (points[points.length - 1]?.x !== xScale(max)) {
    points.push({ x: xScale(max), y: yScale(fn(max)) });
  }

  return points;
}

function areaBetweenCurves(
  start: number,
  end: number,
  step: number,
  topFn: (value: number) => number,
  bottomFn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const top: Point[] = [];
  const bottom: Point[] = [];

  for (let value = start; value <= end; value += step) {
    top.push({ x: xScale(value), y: yScale(topFn(value)) });
    bottom.push({ x: xScale(value), y: yScale(bottomFn(value)) });
  }

  top.push({ x: xScale(end), y: yScale(topFn(end)) });
  bottom.push({ x: xScale(end), y: yScale(bottomFn(end)) });

  return [...top, ...bottom.reverse()];
}

function rectFromValues(
  center: number,
  width: number,
  bottom: number,
  top: number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) {
  const left = xScale(center - width / 2);
  const right = xScale(center + width / 2);
  const y = yScale(top);
  const height = yScale(bottom) - yScale(top);

  return { x: left, y, width: right - left, height };
}

function statusPill(kind: "good" | "warn" | "loss", text: string) {
  const className =
    kind === "good"
      ? "bg-emerald-100 text-emerald-700"
      : kind === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}

function MetricCard({
  metricKey,
  hoveredMetric,
  setHoveredMetric,
  label,
  value,
  accentClassName,
  children,
}: {
  metricKey: MetricKey;
  hoveredMetric: MetricKey | null;
  setHoveredMetric: (value: MetricKey | null) => void;
  label: string;
  value: string;
  accentClassName?: string;
  children?: ReactNode;
}) {
  const active = hoveredMetric === metricKey;

  return (
    <div
      className={`rounded-2xl border bg-white/70 p-4 transition ${
        active
          ? "border-[var(--accent)] shadow-[0_14px_30px_rgba(191,91,44,0.16)]"
          : "border-[var(--line)]"
      }`}
      onMouseEnter={() => setHoveredMetric(metricKey)}
      onMouseLeave={() => setHoveredMetric(null)}
    >
      <span className={metricLabelClass}>{label}</span>
      <strong className={`text-xl ${accentClassName ?? ""}`}>{value}</strong>
      {children}
    </div>
  );
}

export default function ProfitMaximizationPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [explicitCost, setExplicitCost] = useState<number>(baseline.explicitCost);
  const [implicitCost, setImplicitCost] = useState<number>(baseline.implicitCost);
  const [totalRevenue, setTotalRevenue] = useState<number>(baseline.totalRevenue);
  const [quantity, setQuantity] = useState<number>(baseline.quantity);
  const [showTotalCostTangent, setShowTotalCostTangent] = useState<boolean>(baseline.showTotalCostTangent);
  const [profitAnnotations, setProfitAnnotations] = useState<ProfitAnnotation[]>(baseline.profitAnnotations);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];

  const accountingProfit = totalRevenue - explicitCost;
  const economicProfit = totalRevenue - explicitCost - implicitCost;
  const normalProfit = economicProfit === 0;
  const economicState =
    economicProfit > 0 ? "获利丰厚 Economic Profit" : normalProfit ? "正常利润 Normal Profit" : "经济亏损 Economic Loss";
  const typeChartYMax =
    Math.max(120, totalRevenue, explicitCost + implicitCost, explicitCost + Math.max(accountingProfit, 0)) + 25;

  const typeScales = getChartScales({
    xMax: 4,
    yMax: typeChartYMax,
  });

  const trBar = rectFromValues(0.8, 0.55, 0, totalRevenue, typeScales.xScale, typeScales.yScale);
  const explicitAccountingBar = rectFromValues(
    2,
    0.55,
    0,
    Math.min(explicitCost, totalRevenue),
    typeScales.xScale,
    typeScales.yScale,
  );
  const accountingProfitBar =
    accountingProfit > 0
      ? rectFromValues(2, 0.55, explicitCost, totalRevenue, typeScales.xScale, typeScales.yScale)
      : null;
  const accountingLossBar =
    accountingProfit < 0
      ? rectFromValues(2, 0.55, totalRevenue, explicitCost, typeScales.xScale, typeScales.yScale)
      : null;
  const uncoveredExplicitEconomicBar =
    totalRevenue < explicitCost
      ? rectFromValues(3.2, 0.55, totalRevenue, explicitCost, typeScales.xScale, typeScales.yScale)
      : null;
  const explicitEconomicBar = rectFromValues(
    3.2,
    0.55,
    0,
    Math.min(explicitCost, totalRevenue),
    typeScales.xScale,
    typeScales.yScale,
  );
  const implicitEconomicBar =
    totalRevenue > explicitCost
      ? rectFromValues(
          3.2,
          0.55,
          explicitCost,
          Math.min(explicitCost + implicitCost, totalRevenue),
          typeScales.xScale,
          typeScales.yScale,
        )
      : null;
  const uncoveredImplicitEconomicBar =
    totalRevenue < explicitCost + implicitCost && implicitCost > 0
      ? rectFromValues(
          3.2,
          0.55,
          Math.max(totalRevenue, explicitCost),
          explicitCost + implicitCost,
          typeScales.xScale,
          typeScales.yScale,
        )
      : null;
  const economicProfitBar =
    economicProfit > 0
      ? rectFromValues(
          3.2,
          0.55,
          explicitCost + implicitCost,
          totalRevenue,
          typeScales.xScale,
          typeScales.yScale,
        )
      : null;
  const economicLossBar =
    economicProfit < 0
      ? rectFromValues(
          3.2,
          0.55,
          totalRevenue,
          explicitCost + implicitCost,
          typeScales.xScale,
          typeScales.yScale,
        )
      : null;
  const showAccountingProfitAnnotation =
    profitAnnotations.includes("accounting-profit") && accountingProfitBar !== null;
  const showEconomicProfitAnnotation =
    profitAnnotations.includes("economic-profit") && economicProfitBar !== null;
  const accountingProfitAnnotationY = accountingProfitBar ? accountingProfitBar.y - 14 : 0;

  const currentTR = totalRevenueAt(quantity);
  const currentTC = totalCostAt(quantity);
  const currentProfit = currentTR - currentTC;
  const totalScales = getChartScales({ xMax: MAX_Q, yMax: 240 });
  const trCurve = buildCurve(MAX_Q, 0.2, totalRevenueAt, totalScales.xScale, totalScales.yScale);
  const tcCurve = buildCurve(MAX_Q, 0.2, totalCostAt, totalScales.xScale, totalScales.yScale);
  const profitBandStart = Math.max(0, quantity - 0.28);
  const profitBandEnd = Math.min(MAX_Q, quantity + 0.28);
  const totalProfitBand =
    profitBandEnd > profitBandStart
      ? areaBetweenCurves(
          profitBandStart,
          profitBandEnd,
          0.04,
          currentProfit >= 0 ? totalRevenueAt : totalCostAt,
          currentProfit >= 0 ? totalCostAt : totalRevenueAt,
          totalScales.xScale,
          totalScales.yScale,
        )
      : null;
  const currentMC = marginalCostAt(quantity);
  const totalProfitMidY = (totalScales.yScale(currentTR) + totalScales.yScale(currentTC)) / 2;
  const totalTangentY = (q: number) => currentTC + currentMC * (q - quantity);
  const totalTangentQAtZero = quantity - currentTC / currentMC;
  const totalTangentQAtMax = quantity + (240 - currentTC) / currentMC;
  const totalTangentStartQ = clamp(Math.min(totalTangentQAtZero, totalTangentQAtMax), 0, MAX_Q);
  const totalTangentEndQ = clamp(Math.max(totalTangentQAtZero, totalTangentQAtMax), 0, MAX_Q);
  const totalTangentLine = [
    {
      x: totalScales.xScale(totalTangentStartQ),
      y: totalScales.yScale(totalTangentY(totalTangentStartQ)),
    },
    {
      x: totalScales.xScale(totalTangentEndQ),
      y: totalScales.yScale(totalTangentY(totalTangentEndQ)),
    },
  ];
  const totalTangentLabelX = clamp(
    totalScales.xScale(quantity) + 86,
    CHART.margin.left + 78,
    CHART.width - CHART.margin.right - 78,
  );
  const totalTangentLabelY = clamp(
    totalScales.yScale(currentTC) - 28,
    CHART.margin.top + 12,
    CHART.height - CHART.margin.bottom - 12,
  );
  const marginalProfit = MR_LEVEL - currentMC;
  const action =
    Math.abs(quantity - Q_STAR) <= 0.2
      ? "保持不变 Profit Maximized"
      : quantity < Q_STAR
        ? "增加产量 Increase Q"
        : "减少产量 Decrease Q";
  const actionTone =
    action === "保持不变 Profit Maximized" ? "good" : action.startsWith("增加") ? "warn" : "loss";

  const marginalScales = getChartScales({ xMax: MAX_Q, yMax: 22 });
  const mrCurve = [
    { x: marginalScales.xScale(0), y: marginalScales.yScale(MR_LEVEL) },
    { x: marginalScales.xScale(MAX_Q), y: marginalScales.yScale(MR_LEVEL) },
  ];
  const mcCurve = buildCurve(MAX_Q, 0.2, marginalCostAt, marginalScales.xScale, marginalScales.yScale);
  const accumulatedGainArea =
    quantity > 0
      ? areaBetweenCurves(
          0,
          Math.min(quantity, Q_STAR),
          0.1,
          () => MR_LEVEL,
          marginalCostAt,
          marginalScales.xScale,
          marginalScales.yScale,
        )
      : null;
  const futureGainArea =
    quantity < Q_STAR
      ? areaBetweenCurves(
          quantity,
          Q_STAR,
          0.1,
          () => MR_LEVEL,
          marginalCostAt,
          marginalScales.xScale,
          marginalScales.yScale,
        )
      : null;
  const lossArea =
    quantity > Q_STAR
      ? areaBetweenCurves(
          Q_STAR,
          quantity,
          0.1,
          marginalCostAt,
          () => MR_LEVEL,
          marginalScales.xScale,
          marginalScales.yScale,
        )
      : null;
  const promptText =
    quantity < Q_STAR - 0.2
      ? "Produce More"
      : quantity > Q_STAR + 0.2
        ? "Produce Less"
        : "Profit Maximized!";
  const promptX = clamp(marginalScales.xScale(quantity), CHART.margin.left + 74, CHART.width - CHART.margin.right - 74);

  const metrics =
    step === "profit-types" ? (
      <>
        <MetricCard
          metricKey="types-accounting"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="会计利润 Accounting Profit"
          value={round(accountingProfit, 0).toFixed(0)}
          accentClassName={accountingProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="types-economic"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="经济利润 Economic Profit"
          value={round(economicProfit, 0).toFixed(0)}
          accentClassName={economicProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="types-status"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业经营状态"
          value={economicState}
          accentClassName={
            economicProfit > 0
              ? "text-emerald-700"
              : normalProfit
                ? "text-amber-700"
                : "text-rose-700"
          }
        >
          <div className="mt-2">
            {economicProfit > 0
              ? statusPill("good", "收入覆盖了全部机会成本")
              : normalProfit
                ? statusPill("warn", "正常利润：机会成本刚好被覆盖")
                : statusPill("loss", "经济亏损：隐性成本未被覆盖")}
          </div>
          {normalProfit ? (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Hover 这一项时，图里的隐性成本会高亮，提醒学生“零经济利润”并不等于白干。
            </p>
          ) : null}
        </MetricCard>
      </>
    ) : step === "total-profit" ? (
      <>
        <MetricCard
          metricKey="total-tr"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前总收益 TR"
          value={round(currentTR, 1).toFixed(1)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="total-tc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前总成本 TC"
          value={round(currentTC, 1).toFixed(1)}
          accentClassName="text-orange-700"
        />
        {showTotalCostTangent ? (
          <MetricCard
            metricKey="total-mc"
            hoveredMetric={hoveredMetric}
            setHoveredMetric={setHoveredMetric}
            label="TC 切线斜率 MC"
            value={round(currentMC, 1).toFixed(1)}
            accentClassName="text-violet-700"
          />
        ) : null}
        <MetricCard
          metricKey="total-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前总利润 Total Profit"
          value={round(currentProfit, 1).toFixed(1)}
          accentClassName={currentProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {currentProfit >= 0
              ? statusPill("good", "TR 高于 TC")
              : statusPill("loss", "TC 暂时高于 TR")}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="marginal-mr"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际收益 MR"
          value={round(MR_LEVEL, 1).toFixed(1)}
          accentClassName="text-teal-700"
        />
        <MetricCard
          metricKey="marginal-mc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际成本 MC"
          value={round(currentMC, 1).toFixed(1)}
          accentClassName="text-orange-700"
        />
        <MetricCard
          metricKey="marginal-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际利润 MR - MC"
          value={round(marginalProfit, 1).toFixed(1)}
          accentClassName={marginalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="marginal-action"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="行动建议 Action"
          value={action}
          accentClassName={
            action === "保持不变 Profit Maximized"
              ? "text-emerald-700"
              : action.startsWith("增加")
                ? "text-amber-700"
                : "text-rose-700"
          }
        >
          <div className="mt-2">
            {statusPill(actionTone, promptText)}
          </div>
        </MetricCard>
      </>
    );

  return (
    <div className="mx-auto w-[min(1240px,calc(100vw-20px))] px-0 py-3 sm:w-[min(1240px,calc(100vw-32px))] sm:py-6">
      <header
        className={`${surfaceClass} mb-5 flex flex-col gap-5 rounded-[28px] px-5 py-5 sm:px-8 sm:py-7 lg:flex-row lg:items-start`}
      >
        <Link
          href="/micro"
          className="inline-flex h-fit items-center rounded-full bg-[rgba(31,42,55,0.06)] px-4 py-3 text-sm font-semibold text-inherit no-underline transition hover:bg-[rgba(31,42,55,0.1)]"
        >
          ← 返回主页
        </Link>
        <div className="min-w-0">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Unit 3.4 / 3.5
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            利润类型与利润最大化规则
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从会计利润与经济利润的区别出发，过渡到总收益和总成本的几何比较，最后用 MR = MC 的边际法则锁定利润最大化点。
          </p>
        </div>
      </header>

      <section className={`${surfaceClass} mb-5 rounded-[24px] px-5 py-5 sm:px-6`}>
        <div className="grid gap-3 lg:grid-cols-3">
          {lessonSteps.map((item) => {
            const active = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setHoveredMetric(null);
                  setStep(item.id);
                }}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[rgba(191,91,44,0.12)]"
                    : "border-[var(--line)] bg-white/65 hover:bg-white/80"
                }`}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{activeStep.description}</p>
      </section>

      <main className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${surfaceClass} rounded-[24px] p-6`}>
          {step === "profit-types" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">显性成本 Explicit Costs</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={explicitCost}
                  onChange={(event) => setExplicitCost(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{explicitCost}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">隐性成本 Implicit Costs</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={implicitCost}
                  onChange={(event) => setImplicitCost(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{implicitCost}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">销售总收入 Total Revenue</span>
                <input
                  type="range"
                  min="0"
                  max="140"
                  step="1"
                  value={totalRevenue}
                  onChange={(event) => setTotalRevenue(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{totalRevenue}</strong>
              </label>

              <div className={labelStackClass}>
                <span className="font-bold">利润区域标注 Profit Labels</span>
                <ButtonGroup<ProfitAnnotation, true>
                  multiple
                  value={profitAnnotations}
                  onChange={setProfitAnnotations}
                  options={[
                    { value: "accounting-profit", label: "Accounting Profit" },
                    { value: "economic-profit", label: "Economic Profit" },
                  ]}
                />
              </div>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">生产数量 Quantity</span>
                <input
                  type="range"
                  min="0"
                  max={MAX_Q}
                  step="0.1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(quantity, 1).toFixed(1)}</strong>
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  {step === "total-profit"
                    ? "这根滑块会推动总收益图里的垂直游标，帮助学生直接比较当前的 TR、TC 和利润差。"
                    : "这里沿用同一个产量坐标，把第二步的几何直觉翻译成边际视角下的 MR = MC 决策。"}
                </p>
              </label>

              {step === "total-profit" ? (
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <span className="text-sm font-bold">显示 TC 切线</span>
                  <input
                    type="checkbox"
                    checked={showTotalCostTangent}
                    onChange={(event) => setShowTotalCostTangent(event.target.checked)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                </label>
              ) : null}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "profit-types") {
                setExplicitCost(baseline.explicitCost);
                setImplicitCost(baseline.implicitCost);
                setTotalRevenue(baseline.totalRevenue);
                setProfitAnnotations(baseline.profitAnnotations);
              } else {
                setQuantity(baseline.quantity);
                setShowTotalCostTangent(baseline.showTotalCostTangent);
              }
            }}
            className={primaryButtonClass}
          >
            重置
          </button>
        </aside>

        <section className={`${surfaceClass} rounded-[24px] p-5 sm:p-6`}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-3xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                {activeStep.chartTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--muted)]">{activeStep.chartSubtitle}</p>
            </div>
            {step === "profit-types" && normalProfit ? (
              <div className="inline-flex animate-pulse rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                Normal Profit: 经济利润 = 0
              </div>
            ) : null}
          </div>

          {step === "mr-mc" ? (
            <div
              className={`mb-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                action === "保持不变 Profit Maximized"
                  ? "bg-emerald-100 text-emerald-700"
                  : action.startsWith("增加")
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {promptText}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            {step === "profit-types" ? (
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                <ChartFrame
                  xMax={4}
                  yMax={typeChartYMax}
                  xLabel="账本视角 (Accounting vs. Economic)"
                  yLabel="金额 (Dollars)"
                />

                <rect {...trBar} rx="18" fill="rgba(239,163,77,0.78)" />

                <rect {...explicitAccountingBar} rx="18" fill="rgba(97,67,51,0.78)" />
                {accountingProfitBar ? (
                  <rect
                    {...accountingProfitBar}
                    rx="18"
                    fill="rgba(50,168,122,0.8)"
                    className={hoveredMetric === "types-accounting" ? "animate-pulse" : ""}
                  />
                ) : null}
                {accountingLossBar ? (
                  <rect
                    {...accountingLossBar}
                    rx="18"
                    fill="rgba(97,67,51,0.08)"
                    stroke="rgba(97,67,51,0.92)"
                    strokeWidth="4"
                    strokeDasharray="10 7"
                    className={hoveredMetric === "types-accounting" ? "animate-pulse" : ""}
                  />
                ) : null}

                <rect {...explicitEconomicBar} rx="18" fill="rgba(97,67,51,0.78)" />
                {uncoveredExplicitEconomicBar ? (
                  <rect
                    {...uncoveredExplicitEconomicBar}
                    rx="18"
                    fill="rgba(97,67,51,0.08)"
                    stroke="rgba(97,67,51,0.92)"
                    strokeWidth="4"
                    strokeDasharray="10 7"
                    className={hoveredMetric === "types-economic" ? "animate-pulse" : ""}
                  />
                ) : null}
                {implicitEconomicBar ? (
                  <rect
                    {...implicitEconomicBar}
                    rx="18"
                    fill="rgba(78,132,203,0.72)"
                    className={hoveredMetric === "types-status" ? "animate-pulse" : ""}
                  />
                ) : null}
                {uncoveredImplicitEconomicBar ? (
                  <rect
                    {...uncoveredImplicitEconomicBar}
                    rx="18"
                    fill="rgba(78,132,203,0.08)"
                    stroke="rgba(37,99,235,0.95)"
                    strokeWidth="4"
                    strokeDasharray="10 7"
                    className={hoveredMetric === "types-economic" || hoveredMetric === "types-status" ? "animate-pulse" : ""}
                  />
                ) : null}
                {economicProfitBar ? (
                  <rect
                    {...economicProfitBar}
                    rx="18"
                    fill="rgba(91,78,203,0.78)"
                    className={hoveredMetric === "types-economic" ? "animate-pulse" : ""}
                  />
                ) : null}
                {showAccountingProfitAnnotation && accountingProfitBar ? (
                  <text
                    x={typeScales.xScale(2)}
                    y={accountingProfitAnnotationY}
                    textAnchor="middle"
                    dominantBaseline="text-after-edge"
                    className="fill-emerald-700 text-[12px] font-semibold"
                  >
                    Accounting Profit
                  </text>
                ) : null}
                {showEconomicProfitAnnotation && economicProfitBar ? (
                  <text
                    x={typeScales.xScale(3.2)}
                    y={
                      economicProfitBar.height >= 34
                        ? economicProfitBar.y + economicProfitBar.height / 2 + 4
                        : economicProfitBar.y - 8
                    }
                    textAnchor="middle"
                    className={
                      economicProfitBar.height >= 34
                        ? "fill-white text-[12px] font-semibold"
                        : "fill-indigo-700 text-[12px] font-semibold"
                    }
                  >
                    Economic Profit
                  </text>
                ) : null}

                <text x={typeScales.xScale(0.8)} y={CHART.height - 18} textAnchor="middle" className={chartLabelClass}>
                  TR
                </text>
                <text x={typeScales.xScale(2)} y={CHART.height - 18} textAnchor="middle" className={chartLabelClass}>
                  Accounting
                </text>
                <text x={typeScales.xScale(3.2)} y={CHART.height - 18} textAnchor="middle" className={chartLabelClass}>
                  Economic
                </text>

                <text
                  x={typeScales.xScale(0.8)}
                  y={trBar.y - 10}
                  textAnchor="middle"
                  className={chartSmallLabelClass}
                >
                  Revenue
                </text>
                <text
                  x={typeScales.xScale(2)}
                  y={explicitAccountingBar.y + explicitAccountingBar.height / 2 + 4}
                  textAnchor="middle"
                  className="fill-white text-[12px] font-semibold"
                >
                  Explicit Cost
                </text>
                <text
                  x={typeScales.xScale(3.2)}
                  y={explicitEconomicBar.y + explicitEconomicBar.height / 2 + 4}
                  textAnchor="middle"
                  className="fill-white text-[12px] font-semibold"
                >
                  Explicit
                </text>
                {implicitEconomicBar ? (
                  <text
                    x={typeScales.xScale(3.2)}
                    y={implicitEconomicBar.y + implicitEconomicBar.height / 2 + 4}
                    textAnchor="middle"
                    className="fill-white text-[12px] font-semibold"
                  >
                    Implicit
                  </text>
                ) : null}
                {normalProfit ? (
                  <text
                    x={typeScales.xScale(3.2)}
                    y={typeScales.yScale(explicitCost + implicitCost) - 10}
                    textAnchor="middle"
                    className="fill-amber-700 text-[12px] font-semibold"
                  >
                    Normal Profit
                  </text>
                ) : null}
                {economicLossBar ? (
                  <text
                    x={typeScales.xScale(3.2)}
                    y={economicLossBar.y - 8}
                    textAnchor="middle"
                    className="fill-rose-700 text-[12px] font-semibold"
                  >
                    Economic Loss
                  </text>
                ) : null}
              </svg>
            ) : step === "total-profit" ? (
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                <ChartFrame xMax={MAX_Q} yMax={240} xLabel="生产数量 (Quantity, Q)" yLabel="总金额 (Total Dollars)" />

                {totalProfitBand ? (
                  <path
                    d={areaPointsToPath(totalProfitBand)}
                    fill={currentProfit >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.16)"}
                    className={hoveredMetric === "total-profit" ? "animate-pulse" : ""}
                  />
                ) : null}

                <path
                  d={linePointsToPath(trCurve)}
                  className={`${curveClass} ${hoveredMetric === "total-tr" ? "stroke-[5]" : ""}`}
                  stroke="rgba(56,189,248,0.94)"
                />
                <path
                  d={linePointsToPath(tcCurve)}
                  className={`${curveClass} ${hoveredMetric === "total-tc" || hoveredMetric === "total-mc" ? "stroke-[5]" : ""}`}
                  stroke="rgba(249,115,22,0.92)"
                />

                {showTotalCostTangent ? (
                  <>
                    <line
                      x1={totalTangentLine[0].x}
                      y1={totalTangentLine[0].y}
                      x2={totalTangentLine[1].x}
                      y2={totalTangentLine[1].y}
                      stroke="rgba(124,58,237,0.9)"
                      strokeWidth={hoveredMetric === "total-mc" ? 5 : 3}
                      strokeDasharray="9 7"
                      strokeLinecap="round"
                      className={hoveredMetric === "total-mc" ? "animate-pulse" : ""}
                    />
                    <circle
                      cx={totalScales.xScale(quantity)}
                      cy={totalScales.yScale(currentTC)}
                      r="8"
                      fill="rgba(124,58,237,0.9)"
                      className={markerStrokeClass}
                    />
                    <text
                      x={totalTangentLabelX}
                      y={totalTangentLabelY}
                      textAnchor="middle"
                      className="fill-violet-700 text-[12px] font-semibold"
                    >
                      Slope = MC = {round(currentMC, 1).toFixed(1)}
                    </text>
                  </>
                ) : null}

                <line
                  x1={totalScales.xScale(quantity)}
                  y1={CHART.margin.top}
                  x2={totalScales.xScale(quantity)}
                  y2={CHART.height - CHART.margin.bottom}
                  className={`${gridLineClass} ${dashedClass}`}
                />
                <line
                  x1={totalScales.xScale(quantity)}
                  y1={totalScales.yScale(currentTR)}
                  x2={totalScales.xScale(quantity)}
                  y2={totalScales.yScale(currentTC)}
                  stroke={currentProfit >= 0 ? "rgba(34,197,94,0.92)" : "rgba(239,68,68,0.92)"}
                  strokeWidth={hoveredMetric === "total-profit" ? 7 : 5}
                  strokeLinecap="round"
                  className={hoveredMetric === "total-profit" ? "animate-pulse" : ""}
                />
                <circle
                  cx={totalScales.xScale(quantity)}
                  cy={totalScales.yScale(currentTR)}
                  r="6"
                  className={pointMarkerClass}
                />
                <circle
                  cx={totalScales.xScale(quantity)}
                  cy={totalScales.yScale(currentTC)}
                  r="6"
                  fill="rgba(249,115,22,0.92)"
                  className={markerStrokeClass}
                />

                <text x={totalScales.xScale(MAX_Q - 2)} y={totalScales.yScale(totalRevenueAt(MAX_Q - 2)) - 10} className={chartLabelClass}>
                  TR
                </text>
                <text x={totalScales.xScale(MAX_Q - 2)} y={totalScales.yScale(totalCostAt(MAX_Q - 2)) + 24} className={chartLabelClass}>
                  TC
                </text>
                <text
                  x={totalScales.xScale(quantity) + 12}
                  y={totalProfitMidY}
                  className={chartSmallLabelClass}
                >
                  Total Profit = {round(currentProfit, 1).toFixed(1)}
                </text>
              </svg>
            ) : (
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                <ChartFrame xMax={MAX_Q} yMax={22} xLabel="生产数量 (Quantity, Q)" yLabel="边际金额 (Marginal Dollars)" />

                {accumulatedGainArea ? (
                  <path
                    d={areaPointsToPath(accumulatedGainArea)}
                    fill="rgba(34,197,94,0.2)"
                    className={hoveredMetric === "marginal-profit" && marginalProfit >= 0 ? "animate-pulse" : ""}
                  />
                ) : null}
                {futureGainArea ? (
                  <path
                    d={areaPointsToPath(futureGainArea)}
                    fill="rgba(34,197,94,0.1)"
                    stroke="rgba(34,197,94,0.36)"
                    strokeDasharray="7 7"
                  />
                ) : null}
                {lossArea ? (
                  <path
                    d={areaPointsToPath(lossArea)}
                    fill="rgba(239,68,68,0.18)"
                    className={hoveredMetric === "marginal-profit" && marginalProfit < 0 ? "animate-pulse" : ""}
                  />
                ) : null}

                <path
                  d={linePointsToPath(mrCurve)}
                  className={`${curveClass} ${hoveredMetric === "marginal-mr" ? "stroke-[5]" : ""}`}
                  stroke="rgba(13,148,136,0.95)"
                />
                <path
                  d={linePointsToPath(mcCurve)}
                  className={`${curveClass} ${hoveredMetric === "marginal-mc" ? "stroke-[5]" : ""}`}
                  stroke="rgba(249,115,22,0.94)"
                />

                <line
                  x1={marginalScales.xScale(quantity)}
                  y1={CHART.margin.top}
                  x2={marginalScales.xScale(quantity)}
                  y2={CHART.height - CHART.margin.bottom}
                  className={`${gridLineClass} ${dashedClass}`}
                />
                <line
                  x1={marginalScales.xScale(Q_STAR)}
                  y1={marginalScales.yScale(0)}
                  x2={marginalScales.xScale(Q_STAR)}
                  y2={marginalScales.yScale(MR_LEVEL)}
                  stroke="rgba(191,91,44,0.6)"
                  strokeDasharray="7 7"
                />
                <circle
                  cx={marginalScales.xScale(Q_STAR)}
                  cy={marginalScales.yScale(MR_LEVEL)}
                  r="10"
                  fill="rgba(245,158,11,0.9)"
                  className={markerStrokeClass}
                />
                <circle
                  cx={marginalScales.xScale(quantity)}
                  cy={marginalScales.yScale(currentMC)}
                  r="6"
                  fill="rgba(249,115,22,0.96)"
                  className={markerStrokeClass}
                />

                <text
                  x={marginalScales.xScale(MAX_Q - 2.1)}
                  y={marginalScales.yScale(MR_LEVEL) - 10}
                  className={chartLabelClass}
                >
                  MR
                </text>
                <text
                  x={marginalScales.xScale(MAX_Q - 2.3)}
                  y={marginalScales.yScale(marginalCostAt(MAX_Q - 2.3)) + 22}
                  className={chartLabelClass}
                >
                  MC
                </text>
                <text
                  x={marginalScales.xScale(Q_STAR)}
                  y={marginalScales.yScale(MR_LEVEL) - 18}
                  textAnchor="middle"
                  className="fill-amber-700 text-[12px] font-semibold"
                >
                  Q*
                </text>

                <rect
                  x={promptX - 68}
                  y={30}
                  width="136"
                  height="34"
                  rx="17"
                  fill={
                    action === "保持不变 Profit Maximized"
                      ? "rgba(34,197,94,0.16)"
                      : action.startsWith("增加")
                        ? "rgba(245,158,11,0.16)"
                        : "rgba(239,68,68,0.16)"
                  }
                  stroke={
                    action === "保持不变 Profit Maximized"
                      ? "rgba(34,197,94,0.4)"
                      : action.startsWith("增加")
                        ? "rgba(245,158,11,0.4)"
                        : "rgba(239,68,68,0.4)"
                  }
                />
                <text x={promptX} y={52} textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-semibold">
                  {promptText}
                </text>

                {hoveredMetric === "marginal-profit" && marginalProfit < 0 && lossArea ? (
                  <text
                    x={marginalScales.xScale((Q_STAR + quantity) / 2)}
                    y={marginalScales.yScale((MR_LEVEL + currentMC) / 2)}
                    textAnchor="middle"
                    className="fill-rose-700 text-[42px] font-bold"
                  >
                    X
                  </text>
                ) : null}
              </svg>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics}</div>
        </section>
      </main>
    </div>
  );
}
