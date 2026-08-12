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
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../../components/ui-classes";

type LessonStep = "distribution" | "policy";
type MetricKey =
  | "shares-bottom"
  | "shares-top"
  | "shares-multiple"
  | "lorenz-population"
  | "lorenz-ideal"
  | "lorenz-actual"
  | "lorenz-gap"
  | "lorenz-gini"
  | "policy-type"
  | "policy-bottom"
  | "policy-top"
  | "policy-effect";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "distribution",
    title: "步骤一：市场结果与洛伦兹曲线",
    summary: "在同一页里观察收入五等分份额，并把它转换成洛伦兹曲线。",
    description:
      "市场会按照个人拥有的生产要素、技能、教育和资本来分配收入。由于起点不同，初次分配往往并不平均，少数高收入群体会拿走更大的收入份额。洛伦兹曲线把这种收入差距映射为“累计人口占比”和“累计收入占比”的关系：45 度对角线代表绝对平等，真实曲线离对角线越远，不平等越严重。",
    chartTitle: "收入份额与洛伦兹曲线",
    chartSubtitle: "拖动不平等程度观察五等分收入份额变化，再用累计人口游标读取理想收入份额与实际收入份额的差距。",
  },
  {
    id: "policy",
    title: "步骤二：税收与再分配",
    summary: "选择是否使用累进税，再叠加政府补助，看政府如何缩小贫富差距。",
    description:
      "政府可以选择使用累进税，让高收入群体承担更高税率；也可以叠加政府补助，把资源重新分配给低收入群体。使用累进税时，税后洛伦兹曲线显示为蓝色；政府补助显示为绿色，补助力度为 0 时与蓝色税后线重合，力度为 100 时与灰色绝对平等线重合。",
    chartTitle: "政策干预对收入分配的改变",
    chartSubtitle: "灰线是绝对平等线，橙线是税前基准；蓝线表示可选累进税后的结果，绿线表示叠加政府补助后的结果。",
  },
];

const baseline = {
  step: "distribution" as LessonStep,
  inequalityLevel: 50,
  populationCursor: 50,
  useProgressiveTax: true,
  transferLevel: 35,
};

const barColors = ["#8ab4ff", "#67c9c0", "#f3bb6b", "#f0915e", "#d45f83"];
const LORENZ_CHART = {
  width: 560,
  height: 560,
  margin: { top: 34, right: 34, bottom: 76, left: 76 },
} as const;

function inequalityExponent(inequalityLevel: number): number {
  return 1 + (clamp(inequalityLevel, 0, 100) / 100) * 1.72;
}

function buildLorenzCumulativeFromExponent(exponent: number): number[] {
  const safeExponent = Math.max(1, exponent);
  return [0, 20, 40, 60, 80, 100].map((populationShare) => {
    if (populationShare === 0) {
      return 0;
    }
    return 100 * (populationShare / 100) ** safeExponent;
  });
}

function buildSharesFromCumulative(cumulative: number[]): number[] {
  return cumulative.slice(1).map((value, index) => value - cumulative[index]);
}

function buildPretaxCumulative(inequalityLevel: number): number[] {
  return buildLorenzCumulativeFromExponent(inequalityExponent(inequalityLevel));
}

function buildPolicyCumulative({
  pretaxExponent,
  useProgressiveTax,
  transferLevel,
}: {
  pretaxExponent: number;
  useProgressiveTax: boolean;
  transferLevel: number;
}): {
  taxBaseExponent: number;
  subsidyExponent: number;
  taxBaseCumulative: number[];
  subsidyCumulative: number[];
} {
  const taxBaseExponent = useProgressiveTax ? 1 + (pretaxExponent - 1) * 0.58 : pretaxExponent;
  const subsidyRatio = clamp(transferLevel, 0, 100) / 100;
  const subsidyExponent = 1 + (taxBaseExponent - 1) * (1 - subsidyRatio);

  return {
    taxBaseExponent,
    subsidyExponent,
    taxBaseCumulative: buildLorenzCumulativeFromExponent(taxBaseExponent),
    subsidyCumulative: buildLorenzCumulativeFromExponent(subsidyExponent),
  };
}

function lorenzValueAt(cumulative: number[], populationPercent: number): number {
  const clamped = clamp(populationPercent, 0, 100);
  if (clamped === 100) {
    return 100;
  }

  const segment = Math.min(4, Math.floor(clamped / 20));
  const segmentStartX = segment * 20;
  const segmentEndX = (segment + 1) * 20;
  const segmentStartY = cumulative[segment];
  const segmentEndY = cumulative[segment + 1];
  const ratio = (clamped - segmentStartX) / (segmentEndX - segmentStartX || 1);

  return segmentStartY + (segmentEndY - segmentStartY) * ratio;
}

function buildLorenzCurvePoints(
  exponent: number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const safeExponent = Math.max(1, exponent);
  return Array.from({ length: 51 }, (_, index) => {
    const populationShare = index * 2;
    const incomeShare = populationShare === 0 ? 0 : 100 * (populationShare / 100) ** safeExponent;

    return {
      x: xScale(populationShare),
      y: yScale(incomeShare),
    };
  });
}

function buildEqualityPoints(
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  return [0, 20, 40, 60, 80, 100].map((value) => ({
    x: xScale(value),
    y: yScale(value),
  }));
}

function buildLorenzArea(
  lorenzPoints: Point[],
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const top = [0, 20, 40, 60, 80, 100].map((value) => ({
    x: xScale(value),
    y: yScale(value),
  }));
  const bottom = [...lorenzPoints];

  return [...top, ...bottom.reverse()];
}

function lorenzGapArea(cumulative: number[]): number {
  let area = 0;
  for (let index = 0; index < 5; index += 1) {
    const x1 = index * 20;
    const x2 = (index + 1) * 20;
    const equality1 = x1;
    const equality2 = x2;
    const lorenz1 = cumulative[index];
    const lorenz2 = cumulative[index + 1];
    area += ((equality1 - lorenz1) + (equality2 - lorenz2)) * (x2 - x1) * 0.5;
  }
  return area;
}

function giniCoefficientFromExponent(exponent: number): number {
  const safeExponent = Math.max(1, exponent);
  const equalityTriangleArea = 0.5 * 100 * 100;
  const lorenzCurveArea = 10000 / (safeExponent + 1);

  return (equalityTriangleArea - lorenzCurveArea) / equalityTriangleArea;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${round(value, 2).toFixed(2)}%`;
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

export default function InequalityPovertyPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [inequalityLevel, setInequalityLevel] = useState<number>(baseline.inequalityLevel);
  const [populationCursor, setPopulationCursor] = useState<number>(baseline.populationCursor);
  const [useProgressiveTax, setUseProgressiveTax] = useState<boolean>(baseline.useProgressiveTax);
  const [transferLevel, setTransferLevel] = useState<number>(baseline.transferLevel);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];

  const pretaxExponent = inequalityExponent(inequalityLevel);
  const pretaxCumulative = buildPretaxCumulative(inequalityLevel);
  const pretaxShares = buildSharesFromCumulative(pretaxCumulative);
  const { taxBaseExponent, subsidyExponent, taxBaseCumulative, subsidyCumulative } = buildPolicyCumulative({
    pretaxExponent,
    useProgressiveTax,
    transferLevel,
  });
  const subsidyShares = buildSharesFromCumulative(subsidyCumulative);

  const bottomShare = pretaxShares[0];
  const topShare = pretaxShares[4];
  const concentrationMultiple = topShare / bottomShare;

  const lorenzCursor = clamp(populationCursor, 0, 100);
  const idealIncomeShare = lorenzCursor;
  const actualIncomeShare = lorenzValueAt(pretaxCumulative, lorenzCursor);
  const inequalityGap = idealIncomeShare - actualIncomeShare;
  const giniCoefficient = giniCoefficientFromExponent(pretaxExponent);

  const bottomChange = subsidyShares[0] - pretaxShares[0];
  const topChange = subsidyShares[4] - pretaxShares[4];
  const pretaxGapArea = lorenzGapArea(pretaxCumulative);
  const subsidyGapArea = lorenzGapArea(subsidyCumulative);
  const policyEffect =
    subsidyGapArea < pretaxGapArea ? "缩小贫富差距 (More Equal)" : "维持分配结构不变 (Neutral)";

  const lorenzScales = getChartScales({ xMax: 100, yMax: 100, equalRatio: true, chart: LORENZ_CHART });
  const equalityPoints = buildEqualityPoints(lorenzScales.xScale, lorenzScales.yScale);
  const lorenzPoints = buildLorenzCurvePoints(pretaxExponent, lorenzScales.xScale, lorenzScales.yScale);
  const lorenzArea = buildLorenzArea(lorenzPoints, lorenzScales.xScale, lorenzScales.yScale);
  const taxBasePoints = buildLorenzCurvePoints(taxBaseExponent, lorenzScales.xScale, lorenzScales.yScale);
  const subsidyPoints = buildLorenzCurvePoints(subsidyExponent, lorenzScales.xScale, lorenzScales.yScale);

  const barScales = getChartScales({ xMax: 5, yMax: 60 });
  const bandWidth = barScales.plotWidth / 5;
  const barWidth = bandWidth * 0.62;

  const q1X = CHART.margin.left + (bandWidth - barWidth) / 2;
  const q5X = CHART.margin.left + bandWidth * 4 + (bandWidth - barWidth) / 2 + barWidth;
  const q1Top = barScales.yScale(bottomShare);
  const q5Top = barScales.yScale(topShare);

  const taxCurveColor = "rgba(37,99,235,0.96)";
  const policyCurveColor = "rgba(22,163,74,0.96)";

  const policyStatus =
    policyEffect === "缩小贫富差距 (More Equal)"
      ? statusPill("good", "More Equal")
      : statusPill("warn", "Neutral");

  const metrics =
    step === "distribution" ? (
      <>
        <MetricCard
          metricKey="shares-bottom"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="底层 20% 人口收入份额"
          value={`${round(bottomShare, 2).toFixed(2)}%`}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="shares-top"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="顶层 20% 人口收入份额"
          value={`${round(topShare, 2).toFixed(2)}%`}
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="shares-multiple"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="财富集中度倍数"
          value={`${round(concentrationMultiple, 2).toFixed(2)}x`}
          accentClassName="text-amber-700"
        >
          <div className="mt-2">{statusPill(concentrationMultiple > 3 ? "loss" : "warn", "顶层 / 底层 对比")}</div>
        </MetricCard>
        <MetricCard
          metricKey="lorenz-population"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="累计人口 (游标位置)"
          value={`${round(lorenzCursor, 1).toFixed(1)}%`}
          accentClassName="text-slate-700"
        />
        <MetricCard
          metricKey="lorenz-ideal"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="理想应得收入比例"
          value={`${round(idealIncomeShare, 2).toFixed(2)}%`}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="lorenz-actual"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="实际拥有收入比例"
          value={`${round(actualIncomeShare, 2).toFixed(2)}%`}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="lorenz-gap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="不平等的缺口"
          value={`${round(inequalityGap, 2).toFixed(2)}%`}
          accentClassName="text-rose-700"
        >
          <div className="mt-2">{statusPill(inequalityGap > 20 ? "loss" : "warn", "理想 - 实际")}</div>
        </MetricCard>
        <MetricCard
          metricKey="lorenz-gini"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="基尼系数"
          value={round(giniCoefficient, 3).toFixed(3)}
          accentClassName="text-orange-700"
        >
          <div className="mt-2">{statusPill(giniCoefficient > 0.35 ? "loss" : "warn", "黄色面积 / 灰线三角形")}</div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="policy-type"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="政策类型判定"
          value={useProgressiveTax ? "使用累进税" : "未使用累进税"}
          accentClassName="text-slate-700"
        >
          <div className="mt-2">
            {useProgressiveTax
              ? statusPill("good", "蓝线为税后 Lorenz")
              : statusPill("warn", "蓝线关闭，仅保留税前基准")}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="policy-bottom"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="底层群体份额变动"
          value={formatSigned(bottomChange)}
          accentClassName={bottomChange >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="policy-top"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="顶层群体份额变动"
          value={formatSigned(topChange)}
          accentClassName={topChange <= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="policy-effect"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最终政策效果评价"
          value={policyEffect}
          accentClassName="text-[var(--ink)] text-lg"
        >
          <div className="mt-2">{policyStatus}</div>
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
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">Unit 6.5</div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            不平等与贫困
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从收入五等分到洛伦兹曲线，再到税收与转移支付，连起来理解 AP Micro 里“政府不只纠正效率问题，也会介入公平问题”的完整逻辑。
          </p>
        </div>
      </header>

      <section className={`${surfaceClass} mb-5 rounded-[24px] px-5 py-5 sm:px-6`}>
        <div className="grid gap-3 lg:grid-cols-2">
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
          {step === "distribution" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场不平等程度</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={inequalityLevel}
                  onChange={(event) => setInequalityLevel(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{inequalityLevel}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">累计人口游标</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={populationCursor}
                  onChange={(event) => setPopulationCursor(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{populationCursor}%</strong>
              </label>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">是否使用累进税</span>
                <span className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  <input
                    type="checkbox"
                    checked={useProgressiveTax}
                    onChange={(event) => setUseProgressiveTax(event.target.checked)}
                    className="h-5 w-5 accent-blue-600"
                  />
                  {useProgressiveTax ? "使用：显示蓝色税后线" : "不使用：不显示蓝色税后线"}
                </span>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">政府补助力度</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={transferLevel}
                  onChange={(event) => setTransferLevel(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{transferLevel}</strong>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "distribution") {
                setInequalityLevel(baseline.inequalityLevel);
                setPopulationCursor(baseline.populationCursor);
              } else {
                setUseProgressiveTax(baseline.useProgressiveTax);
                setTransferLevel(baseline.transferLevel);
              }
            }}
            className={primaryButtonClass}
          >
            重置
          </button>
        </aside>

        <section className={`${surfaceClass} rounded-[24px] p-5 sm:p-6`}>
          <div className="mb-4">
            <h2 className="text-3xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {activeStep.chartTitle}
            </h2>
            <p className="mt-2 max-w-4xl text-base leading-7 text-[var(--muted)]">{activeStep.chartSubtitle}</p>
          </div>

          {step === "distribution" ? (
            <div className="grid gap-4 2xl:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                {Array.from({ length: 7 }, (_, index) => index * 10).map((value) => (
                  <g key={`shares-grid-${value}`}>
                    <line
                      x1={CHART.margin.left}
                      y1={barScales.yScale(value)}
                      x2={CHART.width - CHART.margin.right}
                      y2={barScales.yScale(value)}
                      className={gridLineClass}
                    />
                    {value < 60 ? (
                      <text x={CHART.margin.left - 14} y={barScales.yScale(value) + 4} className={chartSmallLabelClass} textAnchor="end">
                        {value}
                      </text>
                    ) : null}
                  </g>
                ))}

                <line
                  x1={CHART.margin.left}
                  y1={CHART.height - CHART.margin.bottom}
                  x2={CHART.width - CHART.margin.right}
                  y2={CHART.height - CHART.margin.bottom}
                  className="stroke-[rgba(31,42,55,0.6)] [stroke-width:2]"
                />
                <line
                  x1={CHART.margin.left}
                  y1={CHART.height - CHART.margin.bottom}
                  x2={CHART.margin.left}
                  y2={CHART.margin.top}
                  className="stroke-[rgba(31,42,55,0.6)] [stroke-width:2]"
                />

                {pretaxShares.map((share, index) => {
                  const left = CHART.margin.left + bandWidth * index + (bandWidth - barWidth) / 2;
                  const top = barScales.yScale(share);
                  const highlighted =
                    (index === 0 && (hoveredMetric === "shares-bottom" || hoveredMetric === "shares-multiple")) ||
                    (index === 4 && (hoveredMetric === "shares-top" || hoveredMetric === "shares-multiple"));

                  return (
                    <g key={`bar-${index}`}>
                      <rect
                        x={left}
                        y={top}
                        width={barWidth}
                        height={CHART.height - CHART.margin.bottom - top}
                        rx="16"
                        fill={barColors[index]}
                        opacity={highlighted ? 1 : 0.85}
                        className={highlighted ? "animate-pulse" : ""}
                      />
                      <text x={left + barWidth / 2} y={top - 8} textAnchor="middle" className={chartSmallLabelClass}>
                        {round(share, 1).toFixed(1)}%
                      </text>
                      <text
                        x={left + barWidth / 2}
                        y={CHART.height - CHART.margin.bottom + 24}
                        textAnchor="middle"
                        className={chartSmallLabelClass}
                      >
                        {`Q${index + 1}`}
                      </text>
                    </g>
                  );
                })}

                {hoveredMetric === "shares-multiple" ? (
                  <>
                    <line
                      x1={q1X}
                      y1={q1Top}
                      x2={q5X}
                      y2={q5Top}
                      className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                    />
                    <text
                      x={(q1X + q5X) / 2}
                      y={(q1Top + q5Top) / 2 - 10}
                      textAnchor="middle"
                      className={chartLabelClass}
                    >
                      {`${round(concentrationMultiple, 2).toFixed(2)}x`}
                    </text>
                  </>
                ) : null}

                <rect
                  x={CHART.width - 214}
                  y={CHART.margin.top + 8}
                  width="190"
                  height="44"
                  rx="16"
                  fill="rgba(255,255,255,0.88)"
                  stroke="rgba(31,42,55,0.08)"
                />
                <text x={CHART.width - 198} y={CHART.margin.top + 27} className={chartLabelClass}>
                  100% = Q1 + Q2 + Q3 + Q4 + Q5
                </text>
                <text x={CHART.margin.left + barScales.plotWidth / 2} y={CHART.height - 16} textAnchor="middle" className={chartLabelClass}>
                  人口分组 (从最穷 20% 到最富 20%)
                </text>
                <text
                  x={24}
                  y={CHART.margin.top + barScales.plotHeight / 2}
                  textAnchor="middle"
                  className={chartLabelClass}
                  transform={`rotate(-90 24 ${CHART.margin.top + barScales.plotHeight / 2})`}
                >
                  占总收入的百分比 (%)
                </text>
                </svg>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <svg viewBox={`0 0 ${LORENZ_CHART.width} ${LORENZ_CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame
                    xMax={100}
                    yMax={100}
                    xLabel="累计人口百分比 (Cumulative % of Population)"
                    yLabel="累计收入百分比 (Cumulative % of Income)"
                    equalRatio
                    chart={LORENZ_CHART}
                  />

                  <path
                    d={areaPointsToPath(lorenzArea)}
                    fill="rgba(251,146,60,0.16)"
                    className={hoveredMetric === "lorenz-gap" || hoveredMetric === "lorenz-gini" ? "animate-pulse" : ""}
                  />

                  <path
                    d={linePointsToPath(equalityPoints)}
                    className={`${curveClass} ${
                      hoveredMetric === "lorenz-ideal" || hoveredMetric === "lorenz-gini" ? "stroke-[5]" : ""
                    }`}
                    stroke="rgba(148,163,184,0.95)"
                  />

                  <path
                    d={linePointsToPath(lorenzPoints)}
                    className={`${curveClass} ${
                      hoveredMetric === "lorenz-actual" || hoveredMetric === "lorenz-gap" || hoveredMetric === "lorenz-gini"
                        ? "stroke-[5]"
                        : ""
                    }`}
                    stroke="rgba(245,158,11,0.96)"
                  />

                  <line
                    x1={lorenzScales.xScale(lorenzCursor)}
                    y1={lorenzScales.yScale(0)}
                    x2={lorenzScales.xScale(lorenzCursor)}
                    y2={lorenzScales.yScale(idealIncomeShare)}
                    className={`${dashedClass} [stroke:#94a3b8] ${
                      hoveredMetric === "lorenz-population" || hoveredMetric === "lorenz-ideal" ? "[stroke-width:4]" : "[stroke-width:3]"
                    }`}
                  />
                  <line
                    x1={lorenzScales.xScale(lorenzCursor)}
                    y1={lorenzScales.yScale(actualIncomeShare)}
                    x2={lorenzScales.xScale(lorenzCursor)}
                    y2={lorenzScales.yScale(idealIncomeShare)}
                    className={`[stroke:#ef4444] ${hoveredMetric === "lorenz-gap" ? "[stroke-width:6]" : "[stroke-width:4]"}`}
                  />
                  <circle
                    cx={lorenzScales.xScale(lorenzCursor)}
                    cy={lorenzScales.yScale(idealIncomeShare)}
                    r="7"
                    fill="rgba(148,163,184,0.98)"
                    className={markerStrokeClass}
                  />
                  <circle
                    cx={lorenzScales.xScale(lorenzCursor)}
                    cy={lorenzScales.yScale(actualIncomeShare)}
                    r="7"
                    fill="rgba(245,158,11,0.96)"
                    className={markerStrokeClass}
                  />
                  <text x={lorenzScales.xScale(lorenzCursor) + 10} y={lorenzScales.yScale(idealIncomeShare) - 8} className={chartSmallLabelClass}>
                    理想
                  </text>
                  <text x={lorenzScales.xScale(lorenzCursor) + 10} y={lorenzScales.yScale(actualIncomeShare) + 18} className={chartSmallLabelClass}>
                    实际
                  </text>
                  <text x={lorenzScales.xScale(74)} y={lorenzScales.yScale(92)} className={chartLabelClass}>
                    Line of Perfect Equality
                  </text>
                  <text x={lorenzScales.xScale(58)} y={lorenzScales.yScale(42)} className={chartLabelClass}>
                    Lorenz Curve
                  </text>
                  <text x={lorenzScales.xScale(10)} y={lorenzScales.yScale(84)} className={chartLabelClass} fill="rgba(194,65,12,0.96)">
                    {`Gini = ${round(giniCoefficient, 3).toFixed(3)}`}
                  </text>
                </svg>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
              <svg viewBox={`0 0 ${LORENZ_CHART.width} ${LORENZ_CHART.height}`} className={chartSvgClass} role="img">
                <defs>
                  <marker
                    id="policy-arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={policyCurveColor} />
                  </marker>
                </defs>

                <ChartFrame
                  xMax={100}
                  yMax={100}
                  xLabel="累计人口百分比 (Cumulative % of Population)"
                  yLabel="累计收入百分比 (Cumulative % of Income)"
                  equalRatio
                  chart={LORENZ_CHART}
                />

                <path
                  d={linePointsToPath(equalityPoints)}
                  className={`${curveClass} ${hoveredMetric === "lorenz-ideal" ? "stroke-[5]" : ""}`}
                  stroke="rgba(148,163,184,0.95)"
                />

                <path
                  d={linePointsToPath(lorenzPoints)}
                  className={`${curveClass} ${
                    hoveredMetric === "lorenz-actual" || hoveredMetric === "lorenz-gap" ? "stroke-[5]" : ""
                  }`}
                  stroke="rgba(245,158,11,0.96)"
                />

                <>
                    <path
                      d={linePointsToPath(lorenzPoints)}
                      className={`${curveClass} ${dashedClass}`}
                      stroke="rgba(245,158,11,0.82)"
                    />
                    {useProgressiveTax ? (
                      <path
                        d={linePointsToPath(taxBasePoints)}
                        className={`${curveClass} ${hoveredMetric === "policy-type" ? "stroke-[5]" : ""}`}
                        stroke={taxCurveColor}
                      />
                    ) : null}
                    <path
                      d={linePointsToPath(subsidyPoints)}
                      className={`${curveClass} ${
                        hoveredMetric === "policy-type" || hoveredMetric === "policy-effect" ? "stroke-[5]" : ""
                      }`}
                      stroke={policyCurveColor}
                    />

                    {[20, 40, 60, 80].map((value) => {
                      const beforeY = lorenzValueAt(taxBaseCumulative, value);
                      const afterY = lorenzValueAt(subsidyCumulative, value);
                      const significant = Math.abs(afterY - beforeY) > 0.8;
                      if (!significant) {
                        return null;
                      }

                      return (
                        <line
                          key={`policy-arrow-${value}`}
                          x1={lorenzScales.xScale(value)}
                          y1={lorenzScales.yScale(beforeY)}
                          x2={lorenzScales.xScale(value)}
                          y2={lorenzScales.yScale(afterY)}
                          stroke={policyCurveColor}
                          strokeWidth={hoveredMetric === "policy-effect" ? 5 : 3}
                          markerEnd="url(#policy-arrow)"
                          opacity={hoveredMetric === "policy-effect" || hoveredMetric === "policy-type" ? 1 : 0.8}
                        />
                      );
                    })}

                    {(hoveredMetric === "policy-bottom" || hoveredMetric === "policy-type") && Math.abs(bottomChange) > 0.1 ? (
                      <>
                        <line
                          x1={lorenzScales.xScale(20)}
                          y1={lorenzScales.yScale(pretaxCumulative[1])}
                          x2={lorenzScales.xScale(20)}
                          y2={lorenzScales.yScale(subsidyCumulative[1])}
                          className="[stroke:#16a34a] [stroke-width:5]"
                        />
                        <circle
                          cx={lorenzScales.xScale(20)}
                          cy={lorenzScales.yScale(subsidyCumulative[1])}
                          r="7"
                          fill={policyCurveColor}
                          className={markerStrokeClass}
                        />
                      </>
                    ) : null}

                    {(hoveredMetric === "policy-top" || hoveredMetric === "policy-type") && Math.abs(topChange) > 0.1 ? (
                      <>
                        <line
                          x1={lorenzScales.xScale(80)}
                          y1={lorenzScales.yScale(pretaxCumulative[4])}
                          x2={lorenzScales.xScale(80)}
                          y2={lorenzScales.yScale(subsidyCumulative[4])}
                          className="[stroke:#e11d48] [stroke-width:5]"
                        />
                        <circle
                          cx={lorenzScales.xScale(80)}
                          cy={lorenzScales.yScale(subsidyCumulative[4])}
                          r="7"
                          fill={policyCurveColor}
                          className={markerStrokeClass}
                        />
                      </>
                    ) : null}

                    <text x={lorenzScales.xScale(60)} y={lorenzScales.yScale(34)} className={chartLabelClass}>
                      税前 Lorenz
                    </text>
                    {useProgressiveTax ? (
                      <text x={lorenzScales.xScale(48)} y={lorenzScales.yScale(57)} className={chartLabelClass} fill={taxCurveColor}>
                        蓝色：税后
                      </text>
                    ) : null}
                    <text x={lorenzScales.xScale(52)} y={lorenzScales.yScale(68)} className={chartLabelClass} fill={policyCurveColor}>
                      绿色：政府补助后
                    </text>
                </>
              </svg>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics}</div>
        </section>
      </main>
    </div>
  );
}
