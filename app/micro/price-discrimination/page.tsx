"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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
  inputClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../../components/ui-classes";
import { ButtonGroup } from "../../../components/button-group";

type LessonStep = "baseline" | "segmented" | "perfect";
type SegmentMode = "two" | "three";
type PerfectMode = "off" | "on";
type PerfectWelfareOverlay = "cs" | "ps" | "welfare";
type MetricKey =
  | "base-qm"
  | "base-cs"
  | "base-profit"
  | "base-dwl"
  | "seg-cs"
  | "seg-profit"
  | "seg-dwl"
  | "perfect-q"
  | "perfect-cs"
  | "perfect-ps"
  | "perfect-welfare";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "baseline",
    title: "步骤一：为什么 MR=MC 时经济利润不是最大的？",
    summary: "先校准统一定价基准：MR=MC 定产量，利润还要回到需求曲线和 ATC 计算。",
    description:
      "如果拖动价格时看到经济利润没有在 MR=MC 附近最大，通常是因为还停在试探价格，或把 MR=MC 当成了直接比较利润高度的规则。MR=MC 只是在边际上锁定最优产量；总经济利润仍然按 (P-ATC)×Q 计算，其中 P 要从需求曲线读出。",
    chartTitle: "MR=MC 与经济利润校准",
    chartSubtitle: "拖动统一价格线，对比当前产量和 MR=MC 产量；绿色矩形才是总经济利润。",
  },
  {
    id: "segmented",
    title: "步骤二：分段价格歧视",
    summary: "增加价格阶梯，观察利润如何一步步吞掉 CS 和 DWL。",
    description:
      "企业如果能把消费者按价格敏感度分组，并且防止转卖，就可以对不同群体收取不同价格。这样利润不仅会向上吃掉原本属于消费者的剩余，还会向右吃掉一部分原本会变成 DWL 的交易。",
    chartTitle: "分段定价榨取更多剩余",
    chartSubtitle: "切换 2 段或 3 段价格阶梯，看利润多边形如何向上和向右扩张。",
  },
  {
    id: "perfect",
    title: "步骤三：完全价格歧视下的福利分配",
    summary: "改看消费者剩余、生产者剩余与社会总福利。",
    description:
      "在完全价格歧视下，企业能对每一个单位都收取消费者的最高愿付价格。于是多卖一单位不再需要给前面所有单位降价，MR 曲线会直接与 D 曲线重合。图中只比较消费者剩余、生产者剩余与社会总福利。",
    chartTitle: "完全价格歧视下的福利阴影",
    chartSubtitle: "打开 Perfect Price Discrimination，观察 MR 曲线旋转到需求曲线上，以及福利如何在消费者和生产者之间重新分配。",
  },
];

const baseline = {
  step: "baseline" as LessonStep,
  singlePrice: 67,
  segmentMode: "two" as SegmentMode,
  perfectMode: "on" as PerfectMode,
  perfectWelfareOverlays: ["cs", "ps", "welfare"] as PerfectWelfareOverlay[],
};

const X_MAX = 36;
const Y_MAX = 110;
const DEMAND_INTERCEPT = 100;
const DEMAND_SLOPE = 2.5;

function demandPrice(quantity: number): number {
  return DEMAND_INTERCEPT - DEMAND_SLOPE * quantity;
}

function quantityFromPrice(price: number): number {
  return clamp((DEMAND_INTERCEPT - price) / DEMAND_SLOPE, 0, X_MAX);
}

function marginalRevenue(quantity: number): number {
  return DEMAND_INTERCEPT - 2 * DEMAND_SLOPE * quantity;
}

function marginalCost(quantity: number): number {
  return 20 + quantity;
}

function averageTotalCost(quantity: number): number {
  return 20 + 200 / quantity + 0.5 * quantity;
}

function totalSurplus(quantity: number): number {
  return (DEMAND_INTERCEPT - 20) * quantity - 0.5 * (DEMAND_SLOPE + 1) * quantity * quantity;
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

export default function PriceDiscriminationPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [singlePrice, setSinglePrice] = useState<number>(baseline.singlePrice);
  const [segmentMode, setSegmentMode] = useState<SegmentMode>(baseline.segmentMode);
  const [perfectMode, setPerfectMode] = useState<PerfectMode>(baseline.perfectMode);
  const [perfectWelfareOverlays, setPerfectWelfareOverlays] = useState<PerfectWelfareOverlay[]>(
    baseline.perfectWelfareOverlays,
  );
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const scales = getChartScales({ xMax: X_MAX, yMax: Y_MAX });

  const demandCurve = buildCurve(X_MAX, 0.2, demandPrice, scales.xScale, scales.yScale);
  const mrCurve = buildCurve(X_MAX, 0.2, marginalRevenue, scales.xScale, scales.yScale);
  const mcCurve = buildCurve(X_MAX, 0.2, marginalCost, scales.xScale, scales.yScale);
  const atcCurve = buildCurve(X_MAX, 0.2, (value) => averageTotalCost(Math.max(value, 1)), scales.xScale, scales.yScale);

  const monopolyQ = (DEMAND_INTERCEPT - 20) / (2 * DEMAND_SLOPE + 1);
  const monopolyP = demandPrice(monopolyQ);
  const socialQ = (DEMAND_INTERCEPT - 20) / (DEMAND_SLOPE + 1);

  const baselinePrice = clamp(singlePrice, 40, 90);
  const baselineQ = quantityFromPrice(baselinePrice);
  const baselineATC = baselineQ > 0 ? averageTotalCost(Math.max(baselineQ, 1)) : 0;
  const baselineProfit = baselineQ > 0 ? (baselinePrice - baselineATC) * baselineQ : 0;
  const baselineCS = 0.5 * (DEMAND_INTERCEPT - baselinePrice) * baselineQ;
  const baselineDwlHeight = Math.max(0, demandPrice(baselineQ) - marginalCost(baselineQ));
  const baselineDWL = 0.5 * baselineDwlHeight * Math.max(0, socialQ - baselineQ);
  const baselineMarginalGap = marginalRevenue(baselineQ) - marginalCost(baselineQ);
  const monopolyATC = averageTotalCost(monopolyQ);
  const monopolyProfit = (monopolyP - monopolyATC) * monopolyQ;

  const baselineProfitArea =
    baselineQ > 0
      ? rectangleArea(
          0,
          baselineQ,
          Math.max(baselinePrice, baselineATC),
          Math.min(baselinePrice, baselineATC),
          scales.xScale,
          scales.yScale,
        )
      : null;
  const baselineCsArea =
    baselineQ > 0 ? areaBetweenCurves(0, baselineQ, 0.1, demandPrice, () => baselinePrice, scales.xScale, scales.yScale) : null;
  const baselineDwlArea =
    baselineQ < socialQ
      ? areaBetweenCurves(baselineQ, socialQ, 0.1, demandPrice, marginalCost, scales.xScale, scales.yScale)
      : null;

  const segmentEnds = segmentMode === "two" ? [10, 18] : [7, 14, 20];
  const segmentedFinalQ = segmentEnds[segmentEnds.length - 1];
  const segmentedATC = averageTotalCost(segmentedFinalQ);
  const segmentedPrices = segmentEnds.map((end) => demandPrice(end));
  const segmentedProfitAreas = segmentEnds.map((end, index) => {
    const start = index === 0 ? 0 : segmentEnds[index - 1];
    return rectangleArea(start, end, segmentedPrices[index], segmentedATC, scales.xScale, scales.yScale);
  });
  const segmentedCsAreas = segmentEnds.map((end, index) => {
    const start = index === 0 ? 0 : segmentEnds[index - 1];
    return areaBetweenCurves(start, end, 0.1, demandPrice, () => segmentedPrices[index], scales.xScale, scales.yScale);
  });
  const segmentedDwlArea = areaBetweenCurves(segmentedFinalQ, socialQ, 0.1, demandPrice, marginalCost, scales.xScale, scales.yScale);

  const segmentedProfit = segmentEnds.reduce((sum, end, index) => {
    const start = index === 0 ? 0 : segmentEnds[index - 1];
    return sum + (segmentedPrices[index] - segmentedATC) * (end - start);
  }, 0);
  const segmentedCs = segmentEnds.reduce((sum, end, index) => {
    const start = index === 0 ? 0 : segmentEnds[index - 1];
    const width = end - start;
    const topLeft = demandPrice(start);
    return sum + 0.5 * (topLeft - segmentedPrices[index]) * width;
  }, 0);
  const segmentedDWLHeight = Math.max(0, demandPrice(segmentedFinalQ) - marginalCost(segmentedFinalQ));
  const segmentedDWL = 0.5 * segmentedDWLHeight * Math.max(0, socialQ - segmentedFinalQ);

  const perfectOn = perfectMode === "on";
  const perfectQ = perfectOn ? socialQ : monopolyQ;
  const perfectCS = perfectOn ? 0 : 0.5 * (DEMAND_INTERCEPT - monopolyP) * monopolyQ;
  const perfectPS = perfectOn ? totalSurplus(socialQ) : (monopolyP - 20) * monopolyQ - 0.5 * monopolyQ * monopolyQ;
  const perfectWelfare = perfectCS + perfectPS;
  const perfectWelfareArea = areaBetweenCurves(0, perfectQ, 0.1, demandPrice, marginalCost, scales.xScale, scales.yScale);
  const perfectPsArea = perfectOn
    ? areaBetweenCurves(0, socialQ, 0.1, demandPrice, marginalCost, scales.xScale, scales.yScale)
    : areaBetweenCurves(0, monopolyQ, 0.1, () => monopolyP, marginalCost, scales.xScale, scales.yScale);
  const perfectCsArea = perfectOn ? null : areaBetweenCurves(0, monopolyQ, 0.1, demandPrice, () => monopolyP, scales.xScale, scales.yScale);
  const showPerfectCS = perfectWelfareOverlays.includes("cs");
  const showPerfectPS = perfectWelfareOverlays.includes("ps");
  const showPerfectWelfare = perfectWelfareOverlays.includes("welfare");
  const warningX = clamp(scales.xScale((monopolyQ + socialQ) / 2), CHART.margin.left + 120, CHART.width - CHART.margin.right - 120);

  const metrics =
    step === "baseline" ? (
      <>
        <MetricCard
          metricKey="base-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="垄断产量 Q_m"
          value={round(baselineQ, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="base-cs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者剩余 CS"
          value={round(baselineCS, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="base-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总经济利润 Total Profit"
          value={round(baselineProfit, 2).toFixed(2)}
          accentClassName={baselineProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="base-dwl"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失 DWL"
          value={round(baselineDWL, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
      </>
    ) : step === "segmented" ? (
      <>
        <MetricCard
          metricKey="seg-cs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者剩余 CS"
          value={round(segmentedCs, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="seg-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总经济利润 Total Profit"
          value={round(segmentedProfit, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        >
          <div className="mt-2">{statusPill("good", "阶梯利润不断扩张")}</div>
        </MetricCard>
        <MetricCard
          metricKey="seg-dwl"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失 DWL"
          value={round(segmentedDWL, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
      </>
    ) : (
      <>
        <MetricCard
          metricKey="perfect-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最优产量"
          value={round(perfectQ, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="perfect-cs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者剩余 CS"
          value={round(perfectCS, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="perfect-ps"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="生产者剩余 PS"
          value={round(perfectPS, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="perfect-welfare"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="社会总福利 Total Welfare"
          value={round(perfectWelfare, 2).toFixed(2)}
          accentClassName="text-stone-700"
        >
          <div className="mt-2">
            {statusPill(perfectOn ? "good" : "warn", perfectOn ? "社会总福利最大" : "仍低于社会最优")}
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
            Unit 4.3
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            垄断与价格歧视
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从统一定价出发，看分段定价如何改变消费者剩余与福利损失，再把价格歧视推到极限，观察 `MR = D` 下的福利重新分配。
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
          {step === "baseline" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">试探性统一价格</span>
                <input
                  type="range"
                  min="40"
                  max="90"
                  step="1"
                  value={singlePrice}
                  onChange={(event) => setSinglePrice(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{singlePrice}</strong>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
                <div className="mb-2 font-bold text-[var(--ink)]">判断顺序</div>
                <p>
                  先用 MR=MC 找 Q，再向上读需求曲线得到 P，最后用 (P-ATC)×Q 算总经济利润。当前试探点的 MR-MC =
                  <strong className="mx-1 text-[var(--accent)]">{round(baselineMarginalGap, 2).toFixed(2)}</strong>，
                  MR=MC 处利润约为
                  <strong className="mx-1 text-emerald-700">{round(monopolyProfit, 2).toFixed(2)}</strong>。
                </p>
              </div>
            </>
          ) : step === "segmented" ? (
            <label className={labelStackClass}>
              <span className="font-bold">价格阶梯数量</span>
              <ButtonGroup<SegmentMode>
                value={segmentMode}
                onChange={(next) => setSegmentMode(next as SegmentMode)}
                options={[
                { value: "two", label: "2个价格组 (如成人/学生)" },
                { value: "three", label: "3个价格组" },
              ]}
              />
            </label>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">开启完全杀熟</span>
                <ButtonGroup<PerfectMode>
                  value={perfectMode}
                  onChange={(next) => setPerfectMode(next as PerfectMode)}
                  options={[
                    { value: "off", label: "关闭" },
                    { value: "on", label: "开启" },
                  ]}
                />
              </label>

              <div className={labelStackClass}>
                <span className="font-bold">福利面积展示</span>
                <ButtonGroup<PerfectWelfareOverlay, true>
                  multiple
                  value={perfectWelfareOverlays}
                  onChange={(next) => setPerfectWelfareOverlays(next as PerfectWelfareOverlay[])}
                  options={[
                    { value: "cs", label: "消费者剩余（红色）" },
                    { value: "ps", label: "生产者剩余（绿色）" },
                    { value: "welfare", label: "社会总福利（阴影线）" },
                  ]}
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "baseline") {
                setSinglePrice(baseline.singlePrice);
              } else if (step === "segmented") {
                setSegmentMode(baseline.segmentMode);
              } else {
                setPerfectMode(baseline.perfectMode);
                setPerfectWelfareOverlays(baseline.perfectWelfareOverlays);
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
            {step === "perfect" && perfectOn ? (
              <div className="inline-flex animate-pulse rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                MR = D, CS = 0, Total Welfare 最大
              </div>
            ) : null}
          </div>

          {step === "perfect" && hoveredMetric === "perfect-welfare" ? (
            <div className="mb-4 inline-flex rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
              阴影线表示消费者剩余与生产者剩余合计
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
              <defs>
                <pattern
                  id="perfect-welfare-hatch"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(31,42,55,0.48)" strokeWidth="2" />
                </pattern>
              </defs>
              <ChartFrame xMax={X_MAX} yMax={Y_MAX} xLabel="产量 (Quantity, Q)" yLabel="价格与成本 (Price / Cost)" />

              {step === "baseline" && baselineCsArea ? (
                <path
                  d={areaPointsToPath(baselineCsArea)}
                  fill="rgba(59,130,246,0.18)"
                  className={hoveredMetric === "base-cs" ? "animate-pulse" : ""}
                />
              ) : null}
              {step === "baseline" && baselineProfitArea ? (
                <path
                  d={areaPointsToPath(baselineProfitArea)}
                  fill={baselineProfit >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.16)"}
                  className={hoveredMetric === "base-profit" ? "animate-pulse" : ""}
                />
              ) : null}
              {step === "baseline" && baselineDwlArea ? (
                <path
                  d={areaPointsToPath(baselineDwlArea)}
                  fill="rgba(239,68,68,0.18)"
                  className={hoveredMetric === "base-dwl" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "segmented"
                ? segmentedCsAreas.map((area, index) => (
                    <path
                      key={`seg-cs-${index}`}
                      d={areaPointsToPath(area)}
                      fill="rgba(59,130,246,0.14)"
                      className={hoveredMetric === "seg-cs" ? "animate-pulse" : ""}
                    />
                  ))
                : null}
              {step === "segmented"
                ? segmentedProfitAreas.map((area, index) => (
                    <path
                      key={`seg-profit-${index}`}
                      d={areaPointsToPath(area)}
                      fill="rgba(34,197,94,0.18)"
                      className={hoveredMetric === "seg-profit" ? "animate-pulse" : ""}
                    />
                  ))
                : null}
              {step === "segmented" ? (
                <path
                  d={areaPointsToPath(segmentedDwlArea)}
                  fill="rgba(239,68,68,0.18)"
                  className={hoveredMetric === "seg-dwl" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "perfect" && showPerfectPS && perfectPsArea ? (
                <path
                  d={areaPointsToPath(perfectPsArea)}
                  fill="rgba(34,197,94,0.16)"
                  className={hoveredMetric === "perfect-ps" ? "animate-pulse" : ""}
                />
              ) : null}
              {step === "perfect" && showPerfectCS && perfectCsArea ? (
                <path
                  d={areaPointsToPath(perfectCsArea)}
                  fill="rgba(239,68,68,0.16)"
                  className={hoveredMetric === "perfect-cs" ? "animate-pulse" : ""}
                />
              ) : null}
              {step === "perfect" && showPerfectWelfare ? (
                <path
                  d={areaPointsToPath(perfectWelfareArea)}
                  fill="url(#perfect-welfare-hatch)"
                  stroke="rgba(31,42,55,0.18)"
                  className={hoveredMetric === "perfect-welfare" ? "animate-pulse" : ""}
                />
              ) : null}

              <path
                d={linePointsToPath(demandCurve)}
                className={`${curveClass} ${step === "perfect" && perfectOn ? "stroke-[5]" : ""}`}
                stroke={step === "perfect" ? "rgba(239,68,68,0.94)" : "rgba(59,130,246,0.94)"}
              />
              {step !== "perfect" || !perfectOn ? (
                <path
                  d={linePointsToPath(mrCurve)}
                  className={`${curveClass} ${step === "baseline" ? "" : dashedClass}`}
                  stroke="rgba(191,91,44,0.94)"
                />
              ) : (
                <path
                  d={linePointsToPath(mrCurve)}
                  className={`${curveClass} ${dashedClass}`}
                  stroke="rgba(191,91,44,0.24)"
                />
              )}
              <path d={linePointsToPath(mcCurve)} className={`${curveClass} [stroke:#0f766e]`} />
              {step !== "perfect" ? <path d={linePointsToPath(atcCurve)} className={`${curveClass} [stroke:#6366f1]`} /> : null}

              {step === "baseline" ? (
                <>
                  <line
                    x1={scales.xScale(monopolyQ)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(monopolyQ)}
                    y2={scales.yScale(monopolyP)}
                    className={`${dashedClass} [stroke:#16a34a] [stroke-width:3]`}
                  />
                  <circle
                    cx={scales.xScale(monopolyQ)}
                    cy={scales.yScale(marginalCost(monopolyQ))}
                    r="7"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text
                    x={scales.xScale(monopolyQ) + 10}
                    y={scales.yScale(marginalCost(monopolyQ)) + 4}
                    className="fill-emerald-700 text-[12px] font-semibold"
                  >
                    MR=MC
                  </text>
                  <text
                    x={scales.xScale(monopolyQ)}
                    y={scales.yScale(0) + 36}
                    textAnchor="middle"
                    className="fill-emerald-700 text-[12px] font-semibold"
                  >
                    Q*
                  </text>
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(baselinePrice)}
                    x2={scales.xScale(baselineQ)}
                    y2={scales.yScale(baselinePrice)}
                    className={`${hoveredMetric === "base-qm" ? "[stroke-width:6]" : "[stroke-width:4]"} ${dashedClass} [stroke:#3b82f6]`}
                  />
                  <line
                    x1={scales.xScale(baselineQ)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(baselineQ)}
                    y2={scales.yScale(baselinePrice)}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <text x={scales.xScale(baselineQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    Q
                  </text>
                </>
              ) : null}

              {step === "segmented"
                ? segmentEnds.map((end, index) => {
                    const start = index === 0 ? 0 : segmentEnds[index - 1];
                    return (
                      <g key={`seg-step-${end}`}>
                        <line
                          x1={scales.xScale(start)}
                          y1={scales.yScale(segmentedPrices[index])}
                          x2={scales.xScale(end)}
                          y2={scales.yScale(segmentedPrices[index])}
                          className={`${hoveredMetric === "seg-profit" ? "[stroke-width:6]" : "[stroke-width:4]"} [stroke:#16a34a]`}
                        />
                        {index > 0 ? (
                          <line
                            x1={scales.xScale(start)}
                            y1={scales.yScale(segmentedPrices[index - 1])}
                            x2={scales.xScale(start)}
                            y2={scales.yScale(segmentedPrices[index])}
                            className="[stroke:#16a34a] [stroke-width:4]"
                          />
                        ) : null}
                        <text
                          x={scales.xScale((start + end) / 2)}
                          y={scales.yScale(segmentedPrices[index]) - 8}
                          textAnchor="middle"
                          className="fill-emerald-700 text-[12px] font-semibold"
                        >
                          P{index + 1}
                        </text>
                      </g>
                    );
                  })
                : null}

              {step === "perfect" ? (
                <>
                  <line
                    x1={scales.xScale(perfectQ)}
                    y1={scales.yScale(0)}
                    x2={scales.xScale(perfectQ)}
                    y2={scales.yScale(demandPrice(perfectQ))}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={scales.xScale(perfectQ)}
                    cy={scales.yScale(demandPrice(perfectQ))}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text x={scales.xScale(perfectQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    {perfectOn ? "Q_c" : "Q_m"}
                  </text>
                  {perfectOn ? (
                    <>
                      <text x={scales.xScale(12)} y={scales.yScale(demandPrice(12) + 2)} className="fill-rose-700 text-[13px] font-semibold">
                        MR = D
                      </text>
                      <rect
                        x={warningX - 110}
                        y={28}
                        width="220"
                        height="34"
                        rx="17"
                        fill="rgba(34,197,94,0.12)"
                        stroke="rgba(34,197,94,0.34)"
                      />
                      <text x={warningX} y={50} textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-semibold">
                        P_last = MC and Total Welfare is maximized
                      </text>
                    </>
                  ) : null}
                </>
              ) : null}

              <text
                x={scales.xScale(10)}
                y={scales.yScale(demandPrice(10) + 2)}
                className={step === "perfect" ? "fill-rose-700 text-[13px] font-semibold" : chartLabelClass}
              >
                D
              </text>
              <text x={scales.xScale(13)} y={scales.yScale(marginalRevenue(13) - 4)} className={chartLabelClass}>
                MR
              </text>
              <text x={scales.xScale(26)} y={scales.yScale(marginalCost(26) + 2)} className={chartLabelClass}>
                MC
              </text>
              {step !== "perfect" ? (
                <text x={scales.xScale(21)} y={scales.yScale(averageTotalCost(21) + 2)} className={chartLabelClass}>
                  ATC
                </text>
              ) : null}
            </svg>
          </div>

          <div className={`mt-5 grid gap-3 ${step === "perfect" ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {metrics}
          </div>
        </section>
      </main>
    </div>
  );
}
