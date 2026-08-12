"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChartFrame } from "../../components/chart-frame";
import {
  CHART,
  areaPointsToPath,
  clamp,
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

type LessonStep = "revenue" | "profit" | "dwl";
type CostStructure = "profit" | "loss";
type MarketComparison = "monopoly-only" | "show-social";
type MetricKey =
  | "revenue-price"
  | "revenue-mr"
  | "revenue-loss"
  | "revenue-change"
  | "profit-qm"
  | "profit-pm"
  | "profit-atc"
  | "profit-value"
  | "dwl-qc"
  | "dwl-gap"
  | "dwl-markup"
  | "dwl-area";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "revenue",
    title: "步骤一：向下倾斜的需求与边际收益",
    summary: "先拆开 D 和 MR，理解为什么垄断者的 MR 永远低于价格。",
    description:
      "垄断者要想多卖一件商品，就必须把所有商品的售价一起降下来。所以每多卖一件带来的边际收益，不只是新卖出那件的价格，还要扣掉原来所有销量被迫降价造成的损失。这就是 MR 曲线被压在需求曲线下方的原因。",
    chartTitle: "价格制定者：需求曲线与边际收益曲线",
    chartSubtitle: "拖动销量滑块，观察当前价格、边际收益和降价损失如何同时变化。",
  },
  {
    id: "profit",
    title: "步骤二：垄断厂商的利润最大化",
    summary: "用 MR=MC 找产量，再回到需求曲线找价格和利润矩形。",
    description:
      "垄断者和完全竞争企业一样，也会用 MR=MC 决定产量。但价格不再等于边际收益，而是必须从这个产量向上找到需求曲线上的价格。只要价格高于平均总成本，垄断者就有经济利润；反之也可能亏损。",
    chartTitle: "垄断者的定价法则与利润矩形",
    chartSubtitle: "记住黄金路径：先在下方找 MR=MC 定数量，再向上碰到需求曲线定价格。",
  },
  {
    id: "dwl",
    title: "步骤三：分配无效率与无谓损失",
    summary: "最后对比社会最优基准，观察垄断如何限制产量并制造 DWL。",
    description:
      "垄断者会故意把产量压在社会最优数量之下，以维持更高价格。这样虽然企业利润更大，但一部分原本可以发生的互利交易被阻断了。只要垄断价格高于边际成本，市场就没有实现分配效率。",
    chartTitle: "市场失灵：垄断造成的福利损失",
    chartSubtitle: "比较垄断均衡和社会最优基准，观察 Q_m < Q_c、P_m > MC 与红色 DWL 三角形。",
  },
];

const baseline = {
  step: "revenue" as LessonStep,
  revenueQuantity: 1,
  firmQuantity: 10,
  costStructure: "profit" as CostStructure,
  marketComparison: "monopoly-only" as MarketComparison,
};

const X_MAX = 32;
const Y_MAX = 22;
const DEMAND_INTERCEPT = 20;
const DEMAND_SLOPE = 0.45;

function demandPrice(quantity: number): number {
  return DEMAND_INTERCEPT - DEMAND_SLOPE * quantity;
}

function marginalRevenue(quantity: number): number {
  return DEMAND_INTERCEPT - 2 * DEMAND_SLOPE * quantity;
}

function marginalCost(quantity: number): number {
  return 4 + 0.16 * quantity;
}

function averageTotalCost(quantity: number, structure: CostStructure): number {
  const base = structure === "profit" ? 8 : 14;
  return base + 30 / quantity + 0.05 * quantity;
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

function areaBetweenHorizontalAndCurve(
  start: number,
  end: number,
  step: number,
  lineValue: number,
  curveFn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] | null {
  if (end - start <= 0.02) {
    return null;
  }

  const top: Point[] = [];
  const bottom: Point[] = [];

  for (let value = start; value <= end; value += step) {
    const curveValue = curveFn(value);
    top.push({ x: xScale(value), y: yScale(Math.max(lineValue, curveValue)) });
    bottom.push({ x: xScale(value), y: yScale(Math.min(lineValue, curveValue)) });
  }

  const endCurveValue = curveFn(end);
  top.push({ x: xScale(end), y: yScale(Math.max(lineValue, endCurveValue)) });
  bottom.push({ x: xScale(end), y: yScale(Math.min(lineValue, endCurveValue)) });

  return [...top, ...bottom.reverse()];
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

export default function MonopolyPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [revenueQuantity, setRevenueQuantity] = useState<number>(baseline.revenueQuantity);
  const [previousRevenueQuantity, setPreviousRevenueQuantity] = useState<number>(baseline.revenueQuantity);
  const [firmQuantity, setFirmQuantity] = useState<number>(baseline.firmQuantity);
  const [costStructure, setCostStructure] = useState<CostStructure>(baseline.costStructure);
  const [marketComparison, setMarketComparison] = useState<MarketComparison>(baseline.marketComparison);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const scales = getChartScales({ xMax: X_MAX, yMax: Y_MAX });

  const demandCurve = buildCurve(X_MAX, 0.2, demandPrice, scales.xScale, scales.yScale);
  const mrCurve = buildCurve(X_MAX, 0.2, marginalRevenue, scales.xScale, scales.yScale);
  const mcCurve = buildCurve(X_MAX, 0.2, marginalCost, scales.xScale, scales.yScale);
  const atcCurve = buildCurve(X_MAX, 0.2, (value) => averageTotalCost(Math.max(value, 1), costStructure), scales.xScale, scales.yScale);

  const currentRevenueQ = clamp(revenueQuantity, 1, X_MAX);
  const currentPrice = demandPrice(currentRevenueQ);
  const currentMR = marginalRevenue(currentRevenueQ);
  const priceDropLoss = DEMAND_SLOPE * currentRevenueQ;
  const previousQ = Math.max(0, currentRevenueQ - 1);
  const previousPrice = demandPrice(previousQ);
  const priceLossArea =
    previousQ > 0
      ? rectangleArea(previousQ, currentRevenueQ, previousPrice, currentPrice, scales.xScale, scales.yScale)
      : null;
  const previousTargetQ = clamp(previousRevenueQuantity, 1, X_MAX);
  const previousTargetPrice = demandPrice(previousTargetQ);
  const currentRevenue = currentPrice * currentRevenueQ;
  const previousRevenue = previousTargetPrice * previousTargetQ;
  const revenueChange = currentRevenue - previousRevenue;
  const currentRevenueArea = rectangleArea(0, currentRevenueQ, currentPrice, 0, scales.xScale, scales.yScale);
  const comparisonOverlapQ = Math.min(currentRevenueQ, previousTargetQ);
  const revenueOverlapChangeArea =
    Math.abs(currentPrice - previousTargetPrice) > 0.02 && comparisonOverlapQ > 0
      ? rectangleArea(
          0,
          comparisonOverlapQ,
          Math.max(currentPrice, previousTargetPrice),
          Math.min(currentPrice, previousTargetPrice),
          scales.xScale,
          scales.yScale,
        )
      : null;
  const revenueQuantityChangeArea =
    Math.abs(currentRevenueQ - previousTargetQ) > 0.02
      ? rectangleArea(
          Math.min(currentRevenueQ, previousTargetQ),
          Math.max(currentRevenueQ, previousTargetQ),
          currentRevenueQ > previousTargetQ ? currentPrice : previousTargetPrice,
          0,
          scales.xScale,
          scales.yScale,
        )
      : null;
  const overlapRevenueChange = (currentPrice - previousTargetPrice) * comparisonOverlapQ;
  const quantityRevenueChange =
    currentRevenueQ > previousTargetQ
      ? currentPrice * (currentRevenueQ - previousTargetQ)
      : -previousTargetPrice * (previousTargetQ - currentRevenueQ);

  const monopolyQ = (DEMAND_INTERCEPT - 4) / (2 * DEMAND_SLOPE + 0.16);
  const monopolyPrice = demandPrice(monopolyQ);
  const monopolyMC = marginalCost(monopolyQ);
  const currentFirmQ = clamp(firmQuantity, 0, X_MAX);
  const currentFirmPrice = demandPrice(currentFirmQ);
  const currentFirmMR = marginalRevenue(currentFirmQ);
  const currentFirmATC = currentFirmQ > 0 ? averageTotalCost(currentFirmQ, costStructure) : 0;
  const currentProfit = currentFirmQ > 0 ? (currentFirmPrice - currentFirmATC) * currentFirmQ : 0;
  const currentProfitArea =
    currentFirmQ > 0
      ? rectangleArea(
          0,
          currentFirmQ,
          Math.max(currentFirmPrice, currentFirmATC),
          Math.min(currentFirmPrice, currentFirmATC),
          scales.xScale,
          scales.yScale,
        )
      : null;
  const foundOptimal = Math.abs(currentFirmQ - monopolyQ) <= 0.45;

  const socialQ = (DEMAND_INTERCEPT - 4) / (DEMAND_SLOPE + 0.16);
  const socialPrice = demandPrice(socialQ);
  const outputGap = socialQ - monopolyQ;
  const monopolyMarkup = monopolyPrice - monopolyMC;
  const dwl = 0.5 * monopolyMarkup * outputGap;
  const dwlArea = areaBetweenCurves(monopolyQ, socialQ, 0.1, demandPrice, marginalCost, scales.xScale, scales.yScale);
  const monopolyTransferArea = rectangleArea(0, monopolyQ, monopolyPrice, monopolyMC, scales.xScale, scales.yScale);
  const alertX = clamp(scales.xScale((monopolyQ + socialQ) / 2), CHART.margin.left + 85, CHART.width - CHART.margin.right - 85);

  const metrics =
    step === "revenue" ? (
      <>
        <MetricCard
          metricKey="revenue-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前价格 P"
          value={round(currentPrice, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="revenue-mr"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际收益 MR"
          value={round(currentMR, 2).toFixed(2)}
          accentClassName={currentMR >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="revenue-loss"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="降价造成的总损失"
          value={round(priceDropLoss, 2).toFixed(2)}
          accentClassName="text-amber-700"
        >
          <div className="mt-2">{statusPill("warn", "MR = 新价格 - 降价损失")}</div>
        </MetricCard>
        <MetricCard
          metricKey="revenue-change"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="收入面积变化"
          value={`${revenueChange >= 0 ? "+" : ""}${round(revenueChange, 2).toFixed(2)}`}
          accentClassName={revenueChange >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(revenueChange >= 0 ? "good" : "loss", `当前收入 ${round(currentRevenue, 2).toFixed(2)}`)}
          </div>
        </MetricCard>
      </>
    ) : step === "profit" ? (
      <>
        <MetricCard
          metricKey="profit-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最优产量 Q_m"
          value={round(monopolyQ, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="profit-pm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="垄断价格 P_m"
          value={round(monopolyPrice, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="profit-atc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前单位平均成本 ATC"
          value={round(currentFirmATC, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="profit-value"
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
    ) : (
      <>
        <MetricCard
          metricKey="dwl-qc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="社会最优产量 Q_c"
          value={round(socialQ, 2).toFixed(2)}
          accentClassName="text-teal-700"
        />
        <MetricCard
          metricKey="dwl-gap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="产量缺口 Output Shortfall"
          value={round(outputGap, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="dwl-markup"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="垄断价格加成 P_m - MC"
          value={round(monopolyMarkup, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="dwl-area"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失面积 DWL"
          value={round(dwl, 2).toFixed(2)}
          accentClassName="text-rose-700"
        >
          <div className="mt-2">{statusPill("loss", "Allocatively Inefficient")}</div>
        </MetricCard>
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
            Unit 4.1 / 4.2
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            垄断与不完全竞争
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把垄断市场里最关键的三件事连起来看：为什么 MR 低于价格，怎样用 MR=MC 找到垄断价格，以及这种市场权力如何制造无谓损失。
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
          {step === "revenue" ? (
            <label className={labelStackClass}>
              <span className="font-bold">目标销量 Quantity</span>
              <input
                type="range"
                min="1"
                max={X_MAX}
                step="0.1"
                value={revenueQuantity}
                onChange={(event) => {
                  setPreviousRevenueQuantity(revenueQuantity);
                  setRevenueQuantity(Number(event.target.value));
                }}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{round(revenueQuantity, 1).toFixed(1)}</strong>
            </label>
          ) : step === "profit" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">试探性产量 Firm&apos;s Quantity</span>
                <input
                  type="range"
                  min="0"
                  max={X_MAX}
                  step="0.1"
                  value={firmQuantity}
                  onChange={(event) => setFirmQuantity(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(firmQuantity, 1).toFixed(1)}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">成本结构 Cost Structure</span>
                <ButtonGroup<CostStructure>
                  value={costStructure}
                  onChange={(next) => setCostStructure(next as CostStructure)}
                  options={[
                { value: "profit", label: "获得经济利润" },
                { value: "loss", label: "遭遇经济亏损" },
              ]}
                />
              </label>
            </>
          ) : (
            <label className={labelStackClass}>
              <span className="font-bold">市场结构对比</span>
              <ButtonGroup<MarketComparison>
                value={marketComparison}
                onChange={(next) => setMarketComparison(next as MarketComparison)}
                options={[
                { value: "monopoly-only", label: "仅显示垄断均衡" },
                { value: "show-social", label: "显示社会最优基准" },
              ]}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "revenue") {
                setPreviousRevenueQuantity(baseline.revenueQuantity);
                setRevenueQuantity(baseline.revenueQuantity);
              } else if (step === "profit") {
                setFirmQuantity(baseline.firmQuantity);
                setCostStructure(baseline.costStructure);
              } else {
                setMarketComparison(baseline.marketComparison);
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
            {step === "profit" && foundOptimal ? (
              <div className="inline-flex animate-pulse rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                找到 MR = MC 了
              </div>
            ) : null}
          </div>

          {step === "dwl" && hoveredMetric === "dwl-area" ? (
            <div className="mb-4 inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
              Allocatively Inefficient! (P &gt; MC)
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
              <ChartFrame xMax={X_MAX} yMax={Y_MAX} xLabel="产量 (Quantity, Q)" yLabel="价格与成本 (Price / Cost)" />

              {step === "revenue" && priceLossArea ? (
                <path
                  d={areaPointsToPath(priceLossArea)}
                  fill="rgba(245,158,11,0.18)"
                  className={hoveredMetric === "revenue-loss" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "revenue" ? (
                <path
                  d={areaPointsToPath(currentRevenueArea)}
                  fill="rgba(59,130,246,0.08)"
                  stroke="rgba(59,130,246,0.2)"
                  strokeWidth="1.5"
                  className={hoveredMetric === "revenue-price" || hoveredMetric === "revenue-change" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "revenue" && revenueOverlapChangeArea ? (
                <path
                  d={areaPointsToPath(revenueOverlapChangeArea)}
                  fill={overlapRevenueChange >= 0 ? "rgba(16,185,129,0.34)" : "rgba(244,63,94,0.3)"}
                  className={hoveredMetric === "revenue-change" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "revenue" && revenueQuantityChangeArea ? (
                <path
                  d={areaPointsToPath(revenueQuantityChangeArea)}
                  fill={quantityRevenueChange >= 0 ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.34)"}
                  className={hoveredMetric === "revenue-change" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "profit" && currentProfitArea ? (
                <path
                  d={areaPointsToPath(currentProfitArea)}
                  fill={currentProfit >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.16)"}
                  className={hoveredMetric === "profit-value" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "dwl" ? (
                <>
                  <path
                    d={areaPointsToPath(monopolyTransferArea)}
                    fill="rgba(245,158,11,0.12)"
                  />
                  {marketComparison === "show-social" ? (
                    <path
                      d={areaPointsToPath(dwlArea)}
                      fill="rgba(239,68,68,0.2)"
                      className={hoveredMetric === "dwl-area" ? "animate-pulse" : ""}
                    />
                  ) : null}
                </>
              ) : null}

              <path
                d={linePointsToPath(demandCurve)}
                className={`${curveClass} ${hoveredMetric === "profit-pm" ? "stroke-[5]" : ""}`}
                stroke="rgba(59,130,246,0.94)"
              />
              <path
                d={linePointsToPath(mrCurve)}
                className={`${curveClass} ${hoveredMetric === "revenue-mr" ? "stroke-[5]" : ""}`}
                stroke="rgba(191,91,44,0.94)"
              />
              <path
                d={linePointsToPath(mcCurve)}
                className={`${curveClass} ${hoveredMetric === "dwl-markup" ? "stroke-[5]" : ""}`}
                stroke="rgba(15,118,110,0.94)"
              />
              {step === "profit" ? (
                <path
                  d={linePointsToPath(atcCurve)}
                  className={`${curveClass} ${hoveredMetric === "profit-atc" ? "stroke-[5]" : ""}`}
                  stroke="rgba(99,102,241,0.92)"
                />
              ) : null}

              {step === "revenue" ? (
                <>
                  <line
                    x1={scales.xScale(currentRevenueQ)}
                    y1={CHART.margin.top}
                    x2={scales.xScale(currentRevenueQ)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={scales.xScale(currentRevenueQ)}
                    cy={scales.yScale(currentPrice)}
                    r="7"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <circle
                    cx={scales.xScale(currentRevenueQ)}
                    cy={scales.yScale(currentMR)}
                    r="7"
                    fill="rgba(191,91,44,0.94)"
                    className={markerStrokeClass}
                  />
                  <text x={scales.xScale(currentRevenueQ) + 10} y={scales.yScale(currentPrice) - 10} className={chartSmallLabelClass}>
                    P = {round(currentPrice, 2)}
                  </text>
                  <text x={scales.xScale(currentRevenueQ) + 10} y={scales.yScale(currentMR) + 18} className={chartSmallLabelClass}>
                    MR = {round(currentMR, 2)}
                  </text>
                  <rect
                    x={CHART.width - CHART.margin.right - 206}
                    y={28}
                    width="206"
                    height="62"
                    rx="16"
                    fill="rgba(255,255,255,0.84)"
                    stroke="rgba(31,42,55,0.12)"
                  />
                  <rect x={CHART.width - CHART.margin.right - 190} y={43} width="16" height="10" rx="3" fill="rgba(16,185,129,0.42)" />
                  <text x={CHART.width - CHART.margin.right - 168} y={52} className={chartSmallLabelClass}>
                    增加的收入面积
                  </text>
                  <rect x={CHART.width - CHART.margin.right - 190} y={67} width="16" height="10" rx="3" fill="rgba(244,63,94,0.36)" />
                  <text x={CHART.width - CHART.margin.right - 168} y={76} className={chartSmallLabelClass}>
                    减少的收入面积
                  </text>
                </>
              ) : null}

              {step === "profit" ? (
                <>
                  <line
                    x1={scales.xScale(currentFirmQ)}
                    y1={CHART.margin.top}
                    x2={scales.xScale(currentFirmQ)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  {foundOptimal ? (
                    <>
                      <line
                        x1={scales.xScale(monopolyQ)}
                        y1={scales.yScale(monopolyMC)}
                        x2={scales.xScale(monopolyQ)}
                        y2={scales.yScale(monopolyPrice)}
                        className={`${hoveredMetric === "profit-pm" ? "[stroke-width:6]" : "[stroke-width:4]"} ${dashedClass} [stroke:#f59e0b]`}
                      />
                      <line
                        x1={scales.xScale(0)}
                        y1={scales.yScale(monopolyPrice)}
                        x2={scales.xScale(monopolyQ)}
                        y2={scales.yScale(monopolyPrice)}
                        className={`${dashedClass} [stroke:#3b82f6] [stroke-width:4]`}
                      />
                      <circle
                        cx={scales.xScale(monopolyQ)}
                        cy={scales.yScale(monopolyMC)}
                        r="8"
                        fill="rgba(245,158,11,0.92)"
                        className={markerStrokeClass}
                      />
                    </>
                  ) : null}
                  <text x={scales.xScale(monopolyQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    Q_m
                  </text>
                  <text x={scales.xScale(18)} y={scales.yScale(demandPrice(18) + 1.1)} className={chartLabelClass}>
                    D
                  </text>
                  <text x={scales.xScale(16)} y={scales.yScale(marginalRevenue(16) - 1.2)} className={chartLabelClass}>
                    MR
                  </text>
                  <text x={scales.xScale(28)} y={scales.yScale(marginalCost(28) + 0.8)} className={chartLabelClass}>
                    MC
                  </text>
                  <text x={scales.xScale(20)} y={scales.yScale(averageTotalCost(20, costStructure) + 0.8)} className={chartLabelClass}>
                    ATC
                  </text>
                </>
              ) : null}

              {step === "dwl" ? (
                <>
                  <line
                    x1={scales.xScale(monopolyQ)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(monopolyQ)}
                    y2={scales.yScale(monopolyPrice)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(monopolyPrice)}
                    x2={scales.xScale(monopolyQ)}
                    y2={scales.yScale(monopolyPrice)}
                    className={`${dashedClass} [stroke:#3b82f6] [stroke-width:4]`}
                  />
                  {marketComparison === "show-social" ? (
                    <>
                      <line
                        x1={scales.xScale(socialQ)}
                        y1={scales.yScale(0)}
                        x2={scales.xScale(socialQ)}
                        y2={scales.yScale(socialPrice)}
                        className={`${gridLineClass} ${dashedClass}`}
                      />
                      <circle
                        cx={scales.xScale(socialQ)}
                        cy={scales.yScale(socialPrice)}
                        r="8"
                        fill="rgba(15,118,110,0.92)"
                        className={markerStrokeClass}
                      />
                      <text x={scales.xScale(socialQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-teal-700 text-[12px] font-semibold">
                        Q_c
                      </text>
                    </>
                  ) : null}
                  <text x={scales.xScale(monopolyQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    Q_m
                  </text>
                  <rect
                    x={alertX - 95}
                    y={28}
                    width="190"
                    height="34"
                    rx="17"
                    fill="rgba(239,68,68,0.12)"
                    stroke="rgba(239,68,68,0.32)"
                  />
                  <text x={alertX} y={50} textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-semibold">
                    P_m &gt; MC and Q_m &lt; Q_c
                  </text>
                  <text x={scales.xScale(18)} y={scales.yScale(demandPrice(18) + 1.1)} className={chartLabelClass}>
                    D
                  </text>
                  <text x={scales.xScale(16)} y={scales.yScale(marginalRevenue(16) - 1.2)} className={chartLabelClass}>
                    MR
                  </text>
                  <text x={scales.xScale(28)} y={scales.yScale(marginalCost(28) + 0.8)} className={chartLabelClass}>
                    MC
                  </text>
                </>
              ) : null}

              <text x={scales.xScale(7)} y={scales.yScale(demandPrice(7) + 1.2)} className={chartLabelClass}>
                D = AR
              </text>
            </svg>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics}</div>
        </section>
      </main>
    </div>
  );
}
