"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChartFrame } from "../../components/chart-frame";
import { CHART, getChartScales, linePointsToPath, round, type Point } from "../../components/chart-utils";
import {
  accentCurveClass,
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

type LessonStep = "yed" | "xed";
type GoodType = "normal" | "inferior";
type RelationType = "sub" | "comp";
type ElasticityType = "high" | "low" | "zero";
type MetricKey =
  | "yed-income"
  | "yed-quantity"
  | "yed-coef"
  | "yed-type"
  | "xed-price"
  | "xed-quantity"
  | "xed-coef"
  | "xed-type";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "yed",
    title: "步骤一：收入弹性分析",
    summary: "调收入，直接看正常品和劣质品的需求曲线向哪边平移。",
    description:
      "收入弹性看的是收入变动与需求量变动是否同向。YED 大于 0 是正常品，收入上升时需求增加；YED 小于 0 是劣质品，收入上升时需求反而减少。",
  },
  {
    id: "xed",
    title: "步骤二：交叉价格弹性",
    summary: "调 B 的价格，看 A 的需求如何跟着联动。",
    description:
      "交叉价格弹性看的是商品 A 的需求量对商品 B 价格变动的反应。XED 大于 0 是替代品，B 涨价会把消费者推向 A；XED 小于 0 是互补品，B 涨价会拖累 A 的销量。",
  },
];

const baseline = {
  step: "yed" as LessonStep,
  goodType: "normal" as GoodType,
  incomeChange: 0,
  relationType: "sub" as RelationType,
  elasticityType: "high" as ElasticityType,
  priceChangeB: 0,
};

const BASE_PRICE = 50;
const BASE_QUANTITY = 50;
const AXIS_MAX = 100;

function demandPoints(shift: number, xScale: (value: number) => number, yScale: (value: number) => number): Point[] {
  const c = 100 + shift;
  const points: Point[] = [];

  // P + Q = c
  // Box [0, 100] x [0, 100]

  // Intersection with P = 100 => Q = c - 100 = shift
  if (shift >= 0 && shift <= 100) {
    points.push({ x: xScale(shift), y: yScale(100) });
  } else if (shift < 0) {
    // Intersection with Q = 0 => P = c = 100 + shift
    points.push({ x: xScale(0), y: yScale(100 + shift) });
  }

  // Intersection with Q = 100 => P = c - 100 = shift
  if (shift >= 0 && shift <= 100) {
    points.push({ x: xScale(100), y: yScale(shift) });
  } else if (shift < 0) {
    // Intersection with P = 0 => Q = c = 100 + shift
    points.push({ x: xScale(100 + shift), y: yScale(0) });
  }

  return points;
}

function statusPill(kind: "neutral" | "good" | "warn", text: string) {
  const className =
    kind === "good"
      ? "bg-emerald-100 text-emerald-700"
      : kind === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-[rgba(31,42,55,0.08)] text-[var(--ink)]";

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

export default function OtherElasticitiesPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [goodType, setGoodType] = useState<GoodType>(baseline.goodType);
  const [incomeChange, setIncomeChange] = useState<number>(baseline.incomeChange);
  const [relationType, setRelationType] = useState<RelationType>(baseline.relationType);
  const [elasticityType, setElasticityType] = useState<ElasticityType>(baseline.elasticityType);
  const [priceChangeB, setPriceChangeB] = useState<number>(baseline.priceChangeB);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const { xScale, yScale } = getChartScales({ xMax: AXIS_MAX, yMax: AXIS_MAX });

  const getYedCoef = (type: GoodType, ela: ElasticityType) => {
    if (ela === "zero") return 0;
    const base = ela === "high" ? 1.2 : 0.4;
    return type === "normal" ? base : -base;
  };
  const yedQChangePct = incomeChange * getYedCoef(goodType, elasticityType);
  const yedQ2 = Math.max(0, Math.min(100, BASE_QUANTITY * (1 + yedQChangePct / 100)));
  const yedShift = yedQ2 - BASE_QUANTITY;
  const yedCoef = incomeChange === 0 ? 0 : yedQChangePct / incomeChange;

  let yedLabel = goodType === "normal" ? "正常品 (Normal Good)" : "劣质品 (Inferior Good)";
  if (elasticityType === "zero") yedLabel = "无关联 (Independent)";

  const getXedCoef = (rel: RelationType, ela: ElasticityType) => {
    if (ela === "zero") return 0;
    const base = ela === "high" ? 1.2 : 0.3;
    return rel === "sub" ? base : -base;
  };
  const xedQChangePct = priceChangeB * getXedCoef(relationType, elasticityType);
  const xedQ2 = Math.max(0, Math.min(100, BASE_QUANTITY * (1 + xedQChangePct / 100)));
  const xedShift = xedQ2 - BASE_QUANTITY;
  const xedCoef = priceChangeB === 0 ? 0 : xedQChangePct / priceChangeB;

  let xedLabel = relationType === "sub" ? "替代品 (Substitutes)" : "互补品 (Complements)";
  if (elasticityType === "zero") xedLabel = "无关联 (Independent)";

  const metrics =
    step === "yed" ? (
      <>
        <MetricCard
          metricKey="yed-income"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="收入变动百分比 %Δ Income"
          value={`${incomeChange >= 0 ? "+" : ""}${incomeChange.toFixed(0)}%`}
        />
        <MetricCard
          metricKey="yed-quantity"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求量变动百分比 %Δ Quantity"
          value={`${yedQChangePct >= 0 ? "+" : ""}${round(yedQChangePct, 2).toFixed(2)}%`}
        />
        <MetricCard
          metricKey="yed-coef"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="收入弹性系数 YED"
          value={round(yedCoef, 2).toFixed(2)}
          accentClassName={yedCoef >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="yed-type"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="商品属性判定"
          value={yedLabel}
        >
          <div className="mt-2">
            {statusPill(
              yedCoef > 0 ? "good" : yedCoef < 0 ? "warn" : "neutral",
              yedCoef > 0 ? "YED > 0" : yedCoef < 0 ? "YED < 0" : "YED = 0",
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="xed-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场 B 价格变动 %Δ P_B"
          value={`${priceChangeB >= 0 ? "+" : ""}${priceChangeB.toFixed(0)}%`}
        />
        <MetricCard
          metricKey="xed-quantity"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="商品 A 需求量变动 %Δ Q_A"
          value={`${xedQChangePct >= 0 ? "+" : ""}${round(xedQChangePct, 2).toFixed(2)}%`}
        />
        <MetricCard
          metricKey="xed-coef"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="交叉价格弹性系数 XED"
          value={round(xedCoef, 2).toFixed(2)}
          accentClassName={xedCoef >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="xed-type"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="关联关系判定"
          value={xedLabel}
        >
          <div className="mt-2">
            {statusPill(
              xedCoef > 0 ? "good" : xedCoef < 0 ? "warn" : "neutral",
              xedCoef > 0 ? "XED > 0" : xedCoef < 0 ? "XED < 0" : "XED = 0",
            )}
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
          href="/"
          className="inline-flex h-fit items-center rounded-full bg-[rgba(31,42,55,0.06)] px-4 py-3 text-sm font-semibold text-inherit no-underline transition hover:bg-[rgba(31,42,55,0.1)]"
        >
          ← 返回主页
        </Link>
        <div className="min-w-0">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Unit 2.5
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            交叉价格与收入弹性
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把收入变化和相关商品价格变化都转成可视化的需求平移，让正负号、方向和商品性质一眼对应起来。
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
          {step === "yed" ? (
            <>
              <div className={labelStackClass}>
                <span className="font-bold">商品性质</span>
                <div className="mt-1 flex flex-col gap-2.5">
                  {[
                    { value: "normal", label: "正常品 Normal Good" },
                    { value: "inferior", label: "劣质品 Inferior Good" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="goodType"
                        value={opt.value}
                        checked={goodType === opt.value}
                        onChange={(e) => setGoodType(e.target.value as GoodType)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className={labelStackClass}>
                <span className="font-bold">收入弹性 (YED 强度)</span>
                <div className="mt-1 flex flex-col gap-2.5">
                  {[
                    { value: "high", label: "弹性大 (High)" },
                    { value: "low", label: "弹性小 (Low)" },
                    { value: "zero", label: "弹性 0 (Zero)" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="yedElasticityType"
                        value={opt.value}
                        checked={elasticityType === opt.value}
                        onChange={(e) => setElasticityType(e.target.value as ElasticityType)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className={labelStackClass}>
                <span className="font-bold">消费者收入变动 %Δ Income</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="10"
                  value={incomeChange}
                  onChange={(event) => setIncomeChange(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">
                  {incomeChange > 0 ? `+${incomeChange}` : incomeChange}%
                </strong>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
                <div className="font-semibold text-[var(--ink)]">实时公式</div>
                <div className="mt-2">YED = %ΔQ / %ΔIncome</div>
                <div>
                  = {round(yedQChangePct, 2).toFixed(2)} / {incomeChange.toFixed(0)}
                  {incomeChange !== 0 ? ` = ${round(yedCoef, 2).toFixed(2)}` : ""}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={labelStackClass}>
                <span className="font-bold">商品 A 与 B 的关系</span>
                <div className="mt-1 flex flex-col gap-2.5">
                  {[
                    { value: "sub", label: "替代品 Substitutes" },
                    { value: "comp", label: "互补品 Complements" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="relationType"
                        value={opt.value}
                        checked={relationType === opt.value}
                        onChange={(e) => setRelationType(e.target.value as RelationType)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className={labelStackClass}>
                <span className="font-bold">交叉价格弹性 (XED 强度)</span>
                <div className="mt-1 flex flex-col gap-2.5">
                  {[
                    { value: "high", label: "弹性大 (High)" },
                    { value: "low", label: "弹性小 (Low)" },
                    { value: "zero", label: "弹性 0 (Zero)" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="elasticityType"
                        value={opt.value}
                        checked={elasticityType === opt.value}
                        onChange={(e) => setElasticityType(e.target.value as ElasticityType)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className={labelStackClass}>
                <span className="font-bold">市场 B 价格变动 %Δ Price of B</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="10"
                  value={priceChangeB}
                  onChange={(event) => setPriceChangeB(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{priceChangeB > 0 ? `+${priceChangeB}` : priceChangeB}%</strong>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
                <div className="font-semibold text-[var(--ink)]">实时公式</div>
                <div className="mt-2">XED = %ΔQ_A / %ΔP_B</div>
                <div>
                  = {round(xedQChangePct, 2).toFixed(2)} / {priceChangeB.toFixed(0)}
                  {priceChangeB !== 0 ? ` = ${round(xedCoef, 2).toFixed(2)}` : ""}
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "yed") {
                setGoodType(baseline.goodType);
                setElasticityType(baseline.elasticityType);
                setIncomeChange(baseline.incomeChange);
              } else {
                setRelationType(baseline.relationType);
                setElasticityType(baseline.elasticityType);
                setPriceChangeB(baseline.priceChangeB);
              }
            }}
            className={primaryButtonClass}
          >
            重置
          </button>
        </aside>

        <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
          <div className="mb-4">
            <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {step === "yed"
                ? "收入变动与需求平移 (YED)"
                : "市场 B 价格波动对商品 A 需求的影响"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {step === "yed"
                ? "设定商品性质并调整收入，观察需求曲线在固定价格线上的位移方向。"
                : "用画中画表示市场 B 的价格变化，同时观察主图里商品 A 的需求曲线如何联动平移。"}
            </p>
          </div>

          <div className={step === "xed" ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]" : ""}>
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className={chartSvgClass}
              aria-label="Other elasticities chart"
            >
              <ChartFrame
                xMax={AXIS_MAX}
                yMax={AXIS_MAX}
                xLabel={step === "yed" ? "需求量 (Quantity, Q)" : "商品 A 的需求量 (Quantity of A)"}
                yLabel={step === "yed" ? "价格 (Price, P)" : "商品 A 的价格 (Price of A)"}
              />

              <path
                d={linePointsToPath(demandPoints(0, xScale, yScale))}
                className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.38)]`}
              />
              <path
                d={linePointsToPath(
                  demandPoints(step === "yed" ? yedShift : xedShift, xScale, yScale),
                )}
                className={`${curveClass} ${accentCurveClass}`}
              />
              <line
                x1={xScale(0)}
                y1={yScale(BASE_PRICE)}
                x2={xScale(AXIS_MAX)}
                y2={yScale(BASE_PRICE)}
                className={`${gridLineClass} ${dashedClass}`}
              />
              <text x={xScale(0) - 10} y={yScale(BASE_PRICE) + 4} textAnchor="end" className={chartSmallLabelClass}>
                P_e
              </text>

              <line
                x1={xScale(BASE_QUANTITY)}
                y1={yScale(0)}
                x2={xScale(BASE_QUANTITY)}
                y2={yScale(BASE_PRICE)}
                className={`${gridLineClass} ${dashedClass}`}
              />
              <line
                x1={xScale(step === "yed" ? yedQ2 : xedQ2)}
                y1={yScale(0)}
                x2={xScale(step === "yed" ? yedQ2 : xedQ2)}
                y2={yScale(BASE_PRICE)}
                className={`${gridLineClass} ${dashedClass}`}
              />
              <text x={xScale(BASE_QUANTITY)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                Q1
              </text>
              <text
                x={xScale(step === "yed" ? yedQ2 : xedQ2)}
                y={yScale(0) + 22}
                textAnchor="middle"
                className={chartSmallLabelClass}
              >
                Q2
              </text>

              <line
                x1={xScale(BASE_QUANTITY)}
                y1={yScale(BASE_PRICE)}
                x2={xScale(step === "yed" ? yedQ2 : xedQ2)}
                y2={yScale(BASE_PRICE)}
                className={`${
                  (step === "yed" ? yedShift : xedShift) >= 0
                    ? "[stroke:#2f8f68] [stroke-width:6]"
                    : "[stroke:#c64861] [stroke-width:6]"
                }`}
              />
              <text
                x={(xScale(BASE_QUANTITY) + xScale(step === "yed" ? yedQ2 : xedQ2)) / 2}
                y={yScale(BASE_PRICE - 5)}
                textAnchor="middle"
                className={chartSmallLabelClass}
              >
                %ΔQ
              </text>

              {[0.24, 0.48, 0.72].map((ratio) => {
                const yVal = 80 - ratio * 26;
                const y = yScale(yVal);
                const shift = step === "yed" ? yedShift : xedShift;
                const startQ = 100 - yVal;
                const endQ = Math.max(0, Math.min(100, 100 - yVal + shift));
                const startX = xScale(startQ);
                const endX = xScale(endQ);
                if (Math.abs(startX - endX) < 1) return null;
                return (
                  <line
                    key={ratio}
                    x1={startX}
                    y1={y}
                    x2={endX}
                    y2={y}
                    className={`${
                      (hoveredMetric === "yed-type" ||
                        hoveredMetric === "xed-type" ||
                        hoveredMetric === "yed-coef" ||
                        hoveredMetric === "xed-coef")
                        ? shift >= 0
                          ? "[stroke:#2f8f68] [stroke-width:6]"
                          : "[stroke:#c64861] [stroke-width:6]"
                        : shift >= 0
                          ? "[stroke:rgba(76,183,171,0.65)] [stroke-width:4]"
                          : "[stroke:rgba(198,72,97,0.68)] [stroke-width:4]"
                    }`}
                  />
                );
              })}

              <text x={xScale(61)} y={yScale(40)} className={chartSmallLabelClass}>
                D1
              </text>
              <text
                x={xScale(Math.max(16, Math.min(88, 67 + (step === "yed" ? yedShift : xedShift))))}
                y={yScale(34)}
                textAnchor={(step === "yed" ? yedShift : xedShift) >= 0 ? "start" : "end"}
                dx={(step === "yed" ? yedShift : xedShift) >= 0 ? 12 : -12}
                className={chartLabelClass}
              >
                D2
              </text>
            </svg>

            {step === "xed" ? (
              <div className="rounded-[22px] border border-[var(--line)] bg-white/65 p-4">
                <div className="mb-3 text-sm font-semibold">市场 B 画中画</div>
                <svg viewBox="0 0 180 220" className="block h-auto w-full" aria-label="Market B mini chart">
                  <line x1="40" y1="180" x2="150" y2="180" className="[stroke:rgba(31,42,55,0.5)] [stroke-width:2]" />
                  <line x1="40" y1="180" x2="40" y2="30" className="[stroke:rgba(31,42,55,0.5)] [stroke-width:2]" />
                  <text x="18" y="110" transform="rotate(-90 18 110)" className="fill-[var(--ink)] text-[12px] font-semibold">
                    Price of B
                  </text>
                  <text x="95" y="202" textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-semibold">
                    Quantity of B
                  </text>
                  <circle
                    cx={95 - priceChangeB * 0.7}
                    cy={110 - priceChangeB}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <line
                    x1="95"
                    y1="110"
                    x2={95 - priceChangeB * 0.7}
                    y2={110 - priceChangeB}
                    className={`${
                      hoveredMetric === "xed-type"
                        ? "[stroke:var(--accent)] [stroke-width:5]"
                        : "[stroke:rgba(31,42,55,0.35)] [stroke-width:3]"
                    }`}
                  />
                  <text
                    x={95 - priceChangeB * 0.7}
                    y={110 - priceChangeB - 12}
                    textAnchor="middle"
                    className={chartSmallLabelClass}
                  >
                    P_B
                  </text>
                </svg>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
