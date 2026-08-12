"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChartFrame } from "../../components/chart-frame";
import {
  CHART,
  areaPointsToPath,
  getChartScales,
  linePointsToPath,
  round,
  type Point,
} from "../../components/chart-utils";
import {
  chartLabelClass,
  chartSmallLabelClass,
  chartSvgClass,
  curveClass,
  dashedClass,
  gridLineClass,
  inputClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../components/ui-classes";
import { ButtonGroup } from "../../components/button-group";

type LessonStep = "short-run" | "long-run" | "efficiency";
type CostPosition = "profit" | "loss";
type MarketState = "profit" | "loss";
type AnalysisView = "equilibrium" | "productive" | "allocative";
type MetricKey =
  | "short-q"
  | "short-price"
  | "short-atc"
  | "short-profit"
  | "long-trend"
  | "long-demand"
  | "long-profit"
  | "eff-q-actual"
  | "eff-q-pe"
  | "eff-capacity"
  | "eff-gap";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "short-run",
    title: "步骤一：短期均衡与利润",
    summary: "先按垄断式图形找 MR=MC，再看短期利润或亏损。",
    description:
      "短期里的垄断竞争企业和垄断者很像：因为产品差异化，它面临向下倾斜的需求曲线，所以也要通过 MR=MC 来决定产量。不同之处在于，这种利润会立刻吸引模仿者进入行业。",
    chartTitle: "垄断竞争的短期图解",
    chartSubtitle: "切换成本位置并拖动产量，观察产品差异化企业如何按 MR=MC 决定短期盈亏。",
  },
  {
    id: "long-run",
    title: "步骤二：长期均衡与相切",
    summary: "让竞争者进入或退出，观察 D 和 MR 如何平移到与 ATC 相切。",
    description:
      "只要有超额利润，就会有新店分走原本属于你的顾客；只要有亏损，就会有旧店退出，让剩下企业重新分回需求。长期均衡的终点不是利润最大，而是需求曲线恰好与 ATC 曲线相切，经济利润归零。",
    chartTitle: "自由进出市场的长期效应",
    chartSubtitle: "推动长期时间，观察需求曲线和边际收益曲线同步左右平移，直到刚好与 ATC 相切。",
  },
  {
    id: "efficiency",
    title: "步骤三：过剩产能与无效率",
    summary: "在长期相切状态上叠加辅助线，拆出过剩产能与 P>MC。",
    description:
      "长期均衡时企业虽然没有经济利润，但并没有达到效率最大化。实际产量停在 ATC 最低点左侧，所以存在过剩产能；同时价格仍然高于边际成本，所以分配无效率依旧存在。",
    chartTitle: "长期均衡下的无效率",
    chartSubtitle: "切换辅助分析线，对比实际产量、最低成本产量与 allocative efficiency 基准。",
  },
];

const baseline = {
  step: "short-run" as LessonStep,
  costPosition: "profit" as CostPosition,
  quantity: 0,
  marketState: "profit" as MarketState,
  adjustment: 0,
  analysisView: "equilibrium" as AnalysisView,
};

const X_MAX = 30;
const Y_MAX = 30;
const DEMAND_SLOPE = 0.5;
const VARIABLE_COST = 4;
const COST_CURVATURE = 0.2;
const LONG_RUN_Q = 12;
const LONG_RUN_DEMAND_INTERCEPT = 20.8;
const DEMAND_PROFIT_START = 24;
const DEMAND_LOSS_START = 18.5;
const FIXED_COST = (COST_CURVATURE + DEMAND_SLOPE) * LONG_RUN_Q * LONG_RUN_Q;
const LONG_RUN_Q_PE = LONG_RUN_Q * Math.sqrt((COST_CURVATURE + DEMAND_SLOPE) / COST_CURVATURE);

function demandPrice(quantity: number, intercept: number): number {
  return intercept - DEMAND_SLOPE * quantity;
}

function marginalRevenue(quantity: number, intercept: number): number {
  return intercept - 2 * DEMAND_SLOPE * quantity;
}

function marginalCost(quantity: number): number {
  return VARIABLE_COST + 2 * COST_CURVATURE * quantity;
}

function baseAtc(quantity: number): number {
  return FIXED_COST / quantity + VARIABLE_COST + COST_CURVATURE * quantity;
}

function shortRunAtc(quantity: number, position: CostPosition): number {
  return baseAtc(quantity) + (position === "profit" ? -1.2 : 3.8);
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

function rectangleArea(
  left: number,
  right: number,
  top: number,
  bottom: number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) {
  return [
    { x: xScale(left), y: yScale(top) },
    { x: xScale(right), y: yScale(top) },
    { x: xScale(right), y: yScale(bottom) },
    { x: xScale(left), y: yScale(bottom) },
  ];
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

export default function MonopolisticCompetitionPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [costPosition, setCostPosition] = useState<CostPosition>(baseline.costPosition);
  const [quantity, setQuantity] = useState<number>(baseline.quantity);
  const [marketState, setMarketState] = useState<MarketState>(baseline.marketState);
  const [adjustment, setAdjustment] = useState<number>(baseline.adjustment);
  const [analysisView, setAnalysisView] = useState<AnalysisView>(baseline.analysisView);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const scales = getChartScales({ xMax: X_MAX, yMax: Y_MAX });

  const shortRunIntercept = DEMAND_PROFIT_START;
  const shortQStar = (shortRunIntercept - VARIABLE_COST) / (2 * DEMAND_SLOPE + 2 * COST_CURVATURE);
  const shortPrice = demandPrice(shortQStar, shortRunIntercept);
  const currentQ = Math.max(0, quantity);
  const currentPrice = currentQ > 0 ? demandPrice(currentQ, shortRunIntercept) : 0;
  const currentATC = currentQ > 0 ? shortRunAtc(currentQ, costPosition) : 0;
  const currentProfit = currentQ > 0 ? (currentPrice - currentATC) * currentQ : 0;
  const currentProfitArea =
    currentQ > 0
      ? rectangleArea(
          0,
          currentQ,
          Math.max(currentPrice, currentATC),
          Math.min(currentPrice, currentATC),
          scales.xScale,
          scales.yScale,
        )
      : null;

  const longRunStartIntercept = marketState === "profit" ? DEMAND_PROFIT_START : DEMAND_LOSS_START;
  const longRunIntercept =
    longRunStartIntercept +
    (LONG_RUN_DEMAND_INTERCEPT - longRunStartIntercept) * (adjustment / 100);
  const longRunQ = (longRunIntercept - VARIABLE_COST) / (2 * DEMAND_SLOPE + 2 * COST_CURVATURE);
  const longRunPrice = demandPrice(longRunQ, longRunIntercept);
  const longRunATC = baseAtc(longRunQ);
  const longRunProfit = (longRunPrice - longRunATC) * longRunQ;
  const trendText =
    adjustment >= 100
      ? "停止进出 (Stable)"
      : marketState === "profit"
        ? "正在增加 (Entering)"
        : "正在减少 (Exiting)";
  const tangentReached = adjustment >= 100;
  const efficientPrice = demandPrice(LONG_RUN_Q_PE, LONG_RUN_DEMAND_INTERCEPT);
  const allocativeQ = (LONG_RUN_DEMAND_INTERCEPT - VARIABLE_COST) / (DEMAND_SLOPE + 2 * COST_CURVATURE);
  const allocativePrice = demandPrice(allocativeQ, LONG_RUN_DEMAND_INTERCEPT);
  const excessCapacity = LONG_RUN_Q_PE - LONG_RUN_Q;
  const allocativeGap = longRunPrice - marginalCost(LONG_RUN_Q);
  const dwlArea = areaBetweenCurves(LONG_RUN_Q, allocativeQ, 0.1, (q) => demandPrice(q, LONG_RUN_DEMAND_INTERCEPT), marginalCost, scales.xScale, scales.yScale);

  const shortDemandCurve = buildCurve(X_MAX, 0.2, (value) => demandPrice(value, shortRunIntercept), scales.xScale, scales.yScale);
  const shortMrCurve = buildCurve(X_MAX, 0.2, (value) => marginalRevenue(value, shortRunIntercept), scales.xScale, scales.yScale);
  const shortMcCurve = buildCurve(X_MAX, 0.2, marginalCost, scales.xScale, scales.yScale);
  const shortAtcCurve = buildCurve(
    X_MAX,
    0.2,
    (value) => shortRunAtc(Math.max(value, 1), costPosition),
    scales.xScale,
    scales.yScale,
  );

  const longDemandCurve = buildCurve(X_MAX, 0.2, (value) => demandPrice(value, longRunIntercept), scales.xScale, scales.yScale);
  const longMrCurve = buildCurve(X_MAX, 0.2, (value) => marginalRevenue(value, longRunIntercept), scales.xScale, scales.yScale);
  const baseAtcCurve = buildCurve(X_MAX, 0.2, (value) => baseAtc(Math.max(value, 1)), scales.xScale, scales.yScale);
  const atcSegmentCurve = buildCurve(LONG_RUN_Q_PE, 0.2, (value) => baseAtc(Math.max(value, 1)), scales.xScale, scales.yScale)
    .filter((point) => point.x >= scales.xScale(LONG_RUN_Q) && point.x <= scales.xScale(LONG_RUN_Q_PE));

  const metrics =
    step === "short-run" ? (
      <>
        <MetricCard
          metricKey="short-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最优产量 Q_mc"
          value={round(shortQStar, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="short-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="定价 P_mc"
          value={round(shortPrice, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="short-atc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均总成本 ATC"
          value={round(currentATC, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="short-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="经济利润 / 亏损"
          value={round(currentProfit, 2).toFixed(2)}
          accentClassName={currentProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(currentProfit >= 0 ? "good" : "loss", currentProfit >= 0 ? "Profit" : "Loss")}
          </div>
        </MetricCard>
      </>
    ) : step === "long-run" ? (
      <>
        <MetricCard
          metricKey="long-trend"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="竞争对手数量趋势"
          value={trendText}
          accentClassName={
            trendText.includes("Entering")
              ? "text-emerald-700"
              : trendText.includes("Exiting")
                ? "text-rose-700"
                : "text-amber-700"
          }
        />
        <MetricCard
          metricKey="long-demand"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求曲线位置变动"
          value={round(longRunIntercept - longRunStartIntercept, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="long-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="经济利润 Economic Profit"
          value={round(longRunProfit, 2).toFixed(2)}
          accentClassName={Math.abs(longRunProfit) < 0.15 ? "text-amber-700" : longRunProfit > 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(Math.abs(longRunProfit) < 0.15 ? "warn" : longRunProfit > 0 ? "good" : "loss", Math.abs(longRunProfit) < 0.15 ? "Normal Profit" : longRunProfit > 0 ? "Profits Attract Entry" : "Losses Trigger Exit")}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="eff-q-actual"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="实际产量 Q_mc"
          value={round(LONG_RUN_Q, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="eff-q-pe"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最低成本产量 Q_pe"
          value={round(LONG_RUN_Q_PE, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="eff-capacity"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="过剩产能 Excess Capacity"
          value={round(excessCapacity, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="eff-gap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="定价与边际成本差 P - MC"
          value={round(allocativeGap, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
      </>
    );

  return (
    <div className="mx-auto w-[min(1240px,calc(100vw-20px))] px-0 py-3 sm:w-[min(1240px,calc(100vw-32px))] sm:py-6">
      <header
        className={`${surfaceClass} mb-5 flex flex-col gap-5 rounded-[28px] px-5 py-5 sm:px-8 sm:py-7 lg:flex-row lg:items-start`}
      >
        <Link
          href="/"
          className="inline-flex h-fit items-center rounded-full bg-[rgba(31,42,55,0.06)] px-4 py-3 text-sm font-semibold text-inherit no-underline transition hover:bg-[rgba(31,42,55,0.1)]"
        >
          ← 返回主页
        </Link>
        <div className="min-w-0">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Unit 4.4
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            垄断竞争与过剩产能
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把短期像垄断、长期像竞争、效率上却又不完美这三层逻辑连起来，看清垄断竞争为何长期零利润却依旧存在过剩产能。
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
          {step === "short-run" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">短期成本位置</span>
                <ButtonGroup<CostPosition>
                  value={costPosition}
                  onChange={(next) => setCostPosition(next as CostPosition)}
                  options={[
                { value: "profit", label: "获得经济利润" },
                { value: "loss", label: "遭遇经济亏损" },
              ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">产量决策 Quantity</span>
                <input
                  type="range"
                  min="0"
                  max={X_MAX}
                  step="0.1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(quantity, 1).toFixed(1)}</strong>
              </label>
            </>
          ) : step === "long-run" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场初始状态</span>
                <ButtonGroup<MarketState>
                  value={marketState}
                  onChange={(next) => setMarketState(next as MarketState)}
                  options={[
                { value: "profit", label: "行业存在利润 (吸引新店)" },
                { value: "loss", label: "行业存在亏损 (老店倒闭)" },
              ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">长期时间推移</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={adjustment}
                  onChange={(event) => setAdjustment(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{adjustment}%</strong>
              </label>
            </>
          ) : (
            <label className={labelStackClass}>
              <span className="font-bold">辅助分析线</span>
              <ButtonGroup<AnalysisView>
                value={analysisView}
                onChange={(next) => setAnalysisView(next as AnalysisView)}
                options={[
                { value: "equilibrium", label: "仅显示长期均衡" },
                { value: "productive", label: "叠加显示生产效率基准" },
                { value: "allocative", label: "叠加显示分配效率基准" },
              ]}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "short-run") {
                setCostPosition(baseline.costPosition);
                setQuantity(baseline.quantity);
              } else if (step === "long-run") {
                setMarketState(baseline.marketState);
                setAdjustment(baseline.adjustment);
              } else {
                setAnalysisView(baseline.analysisView);
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
              <p className="mt-2 max-w-4xl text-base leading-7 text-[var(--muted)]">{activeStep.chartSubtitle}</p>
            </div>
            {step === "long-run" && tangentReached ? (
              <div className="inline-flex animate-pulse rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                相切！零经济利润达成
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
              <ChartFrame xMax={X_MAX} yMax={Y_MAX} xLabel="企业产量 (Firm Q)" yLabel="价格与成本 (Price / Cost)" />

              {step === "short-run" && currentProfitArea ? (
                <path
                  d={areaPointsToPath(currentProfitArea)}
                  fill={currentProfit >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.16)"}
                  className={hoveredMetric === "short-profit" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "efficiency" && analysisView === "allocative" ? (
                <path
                  d={areaPointsToPath(dwlArea)}
                  fill="rgba(239,68,68,0.18)"
                  className={hoveredMetric === "eff-gap" ? "animate-pulse" : ""}
                />
              ) : null}

              <path
                d={linePointsToPath(step === "short-run" ? shortDemandCurve : step === "long-run" ? longDemandCurve : buildCurve(X_MAX, 0.2, (value) => demandPrice(value, LONG_RUN_DEMAND_INTERCEPT), scales.xScale, scales.yScale))}
                className={`${curveClass} [stroke:#3b82f6]`}
              />
              <path
                d={linePointsToPath(step === "short-run" ? shortMrCurve : step === "long-run" ? longMrCurve : buildCurve(X_MAX, 0.2, (value) => marginalRevenue(value, LONG_RUN_DEMAND_INTERCEPT), scales.xScale, scales.yScale))}
                className={`${curveClass} [stroke:#bf5b2c]`}
              />
              <path d={linePointsToPath(shortMcCurve)} className={`${curveClass} [stroke:#0f766e]`} />
              <path
                d={linePointsToPath(step === "short-run" ? shortAtcCurve : baseAtcCurve)}
                className={`${curveClass} [stroke:#6366f1]`}
              />

              {step === "short-run" ? (
                <>
                  <line
                    x1={scales.xScale(currentQ)}
                    y1={CHART.margin.top}
                    x2={scales.xScale(currentQ)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={scales.xScale(currentQ)}
                    cy={scales.yScale(currentPrice)}
                    r="7"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <circle
                    cx={scales.xScale(currentQ)}
                    cy={scales.yScale(currentATC)}
                    r="7"
                    fill="rgba(99,102,241,0.92)"
                    className={markerStrokeClass}
                  />
                  <line
                    x1={scales.xScale(shortQStar)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(shortQStar)}
                    y2={scales.yScale(shortPrice)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <line
                    x1={scales.xScale(shortQStar)}
                    y1={scales.yScale(marginalCost(shortQStar))}
                    x2={scales.xScale(shortQStar)}
                    y2={scales.yScale(shortPrice)}
                    className={`${dashedClass} [stroke:#3b82f6] [stroke-width:4]`}
                  />
                  <text x={scales.xScale(shortQStar)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    Q_mc
                  </text>
                </>
              ) : null}

              {step === "long-run" ? (
                <>
                  <line
                    x1={scales.xScale(longRunQ)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(longRunQ)}
                    y2={scales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <circle
                    cx={scales.xScale(longRunQ)}
                    cy={scales.yScale(longRunPrice)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  {tangentReached ? (
                    <circle
                      cx={scales.xScale(LONG_RUN_Q)}
                      cy={scales.yScale(baseAtc(LONG_RUN_Q))}
                      r="12"
                      fill="rgba(245,158,11,0.12)"
                      stroke="rgba(245,158,11,0.6)"
                      strokeWidth="4"
                      className={hoveredMetric === "long-profit" ? "animate-pulse" : ""}
                    />
                  ) : null}
                  <text x={scales.xScale(longRunQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    q
                  </text>
                </>
              ) : null}

              {step === "efficiency" ? (
                <>
                  <line
                    x1={scales.xScale(LONG_RUN_Q)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(LONG_RUN_Q)}
                    y2={scales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <circle
                    cx={scales.xScale(LONG_RUN_Q)}
                    cy={scales.yScale(longRunPrice)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />

                  {analysisView === "productive" ? (
                    <>
                      <line
                        x1={scales.xScale(LONG_RUN_Q_PE)}
                        y1={scales.yScale(0)}
                        x2={scales.xScale(LONG_RUN_Q_PE)}
                        y2={scales.yScale(efficientPrice)}
                        className={`${gridLineClass} ${dashedClass}`}
                      />
                      <line
                        x1={scales.xScale(LONG_RUN_Q)}
                        y1={CHART.height - CHART.margin.bottom - 12}
                        x2={scales.xScale(LONG_RUN_Q_PE)}
                        y2={CHART.height - CHART.margin.bottom - 12}
                        stroke="rgba(239,68,68,0.9)"
                        strokeWidth="4"
                        markerStart="url(#arrow-start)"
                        markerEnd="url(#arrow-end)"
                        className={hoveredMetric === "eff-capacity" ? "animate-pulse" : ""}
                      />
                      {atcSegmentCurve.length > 1 ? (
                        <path
                          d={linePointsToPath(atcSegmentCurve)}
                          className={`${curveClass} ${hoveredMetric === "eff-capacity" ? "stroke-[5]" : ""}`}
                          stroke="rgba(239,68,68,0.85)"
                        />
                      ) : null}
                      <text x={(scales.xScale(LONG_RUN_Q) + scales.xScale(LONG_RUN_Q_PE)) / 2} y={CHART.height - CHART.margin.bottom - 18} textAnchor="middle" className="fill-rose-700 text-[12px] font-semibold">
                        Excess Capacity
                      </text>
                    </>
                  ) : null}

                  {analysisView === "allocative" ? (
                    <>
                      <line
                        x1={scales.xScale(allocativeQ)}
                        y1={scales.yScale(0)}
                        x2={scales.xScale(allocativeQ)}
                        y2={scales.yScale(allocativePrice)}
                        className={`${gridLineClass} ${dashedClass}`}
                      />
                      <circle
                        cx={scales.xScale(allocativeQ)}
                        cy={scales.yScale(allocativePrice)}
                        r="8"
                        fill="rgba(15,118,110,0.92)"
                        className={markerStrokeClass}
                      />
                    </>
                  ) : null}
                </>
              ) : null}

              <defs>
                <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="rgba(239,68,68,0.9)" />
                </marker>
                <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
                  <path d="M8,0 L0,4 L8,8 z" fill="rgba(239,68,68,0.9)" />
                </marker>
              </defs>

              <text x={scales.xScale(7)} y={scales.yScale((step === "long-run" ? demandPrice(7, longRunIntercept) : step === "efficiency" ? demandPrice(7, LONG_RUN_DEMAND_INTERCEPT) : demandPrice(7, shortRunIntercept)) + 1.6)} className={chartLabelClass}>
                D
              </text>
              <text x={scales.xScale(9)} y={scales.yScale((step === "long-run" ? marginalRevenue(9, longRunIntercept) : step === "efficiency" ? marginalRevenue(9, LONG_RUN_DEMAND_INTERCEPT) : marginalRevenue(9, shortRunIntercept)) - 1.8)} className={chartLabelClass}>
                MR
              </text>
              <text x={scales.xScale(22)} y={scales.yScale(marginalCost(22) + 1.2)} className={chartLabelClass}>
                MC
              </text>
              <text x={scales.xScale(20)} y={scales.yScale(baseAtc(20) + 1.4)} className={chartLabelClass}>
                ATC
              </text>
            </svg>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics}</div>
        </section>
      </main>
    </div>
  );
}
