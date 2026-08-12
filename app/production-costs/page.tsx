"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ChartFrame } from "../../components/chart-frame";
import {
  CHART,
  getChartScales,
  linePointsToPath,
  round,
  type Point,
} from "../../components/chart-utils";
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
import { ButtonGroup } from "../../components/button-group";

type LessonStep = "production" | "short-run" | "long-run";
type CostView = MetricKey[];
type PlantSize = "small" | "medium" | "large";
type MetricKey =
  | "prod-tp"
  | "prod-mp"
  | "prod-ap"
  | "cost-mc"
  | "cost-atc"
  | "cost-avc"
  | "cost-afc"
  | "long-optimal"
  | "long-stage";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "production",
    title: "步骤一：生产函数与产量",
    summary: "先看固定投入下增加劳动力，TP、MP、AP 如何彼此联动。",
    description:
      "在短期内，资本等投入固定，劳动力是可变投入。随着劳动增加，总产量先加速上升后减速上升；边际产量先升后降，并最终走向零甚至负值，这就是边际收益递减。",
  },
  {
    id: "short-run",
    title: "步骤二：短期生产成本",
    summary: "把物理产量关系转化成 MC、ATC、AVC、AFC 这组成本曲线。",
    description:
      "边际收益递减会把边际成本推成 U 型。平均总成本、平均可变成本与平均固定成本共同构成短期成本曲线簇，而 MC 必须从 ATC 和 AVC 的最低点穿过。",
  },
  {
    id: "long-run",
    title: "步骤三：长期生产成本",
    summary: "把时间拉长，让企业可以换工厂规模，再看 LRATC 是怎么形成的。",
    description:
      "长期里没有固定投入，企业可以在不同工厂规模之间做选择。多条 SRATC 的最低可达点连成了 LRATC，不同区间分别对应规模经济、规模收益不变和规模不经济。",
  },
];

const baseline = {
  step: "production" as LessonStep,
  labor: 0,
  output: 8,
  costView: ["cost-mc"] as CostView,
  plantSize: "medium" as PlantSize,
};

function totalProduct(l: number): number {
  return -1 * l ** 3 + 12 * l ** 2 + 8 * l;
}

function marginalProduct(l: number): number {
  return -3 * l ** 2 + 24 * l + 8;
}

function averageProduct(l: number): number {
  if (l === 0) return 0;
  return totalProduct(l) / l;
}

function afc(q: number): number {
  return 36 / q;
}

function avc(q: number): number {
  return 8 + q ** 2 / 12 - q;
}

function atc(q: number): number {
  return avc(q) + afc(q);
}

function mc(q: number): number {
  return 8 + q ** 2 / 4 - 2 * q;
}

type PlantCurve = {
  id: PlantSize | "micro" | "constant-a" | "constant-b" | "constant-c" | "mega";
  center: number;
  base: number;
  label: string;
  labelOffset?: number;
  minQ: number;
  maxQ: number;
};

const plantCurves: PlantCurve[] = [
  { id: "micro", center: 4, base: 18, label: "SRATC 1", minQ: 0.8, maxQ: 7.2 },
  { id: "small", center: 8, base: 15, label: "SRATC 2", minQ: 4.8, maxQ: 10.6 },
  { id: "constant-a", center: 9.5, base: 12.5, label: "SRATC 3", labelOffset: -0.2, minQ: 7.2, maxQ: 12.2 },
  { id: "constant-b", center: 11, base: 12.5, label: "SRATC 4", labelOffset: 0.15, minQ: 8.6, maxQ: 13.8 },
  { id: "medium", center: 12.5, base: 12.5, label: "SRATC 5", minQ: 10, maxQ: 15 },
  { id: "constant-c", center: 14, base: 12.5, label: "SRATC 6", labelOffset: 0.25, minQ: 11.8, maxQ: 16.4 },
  { id: "large", center: 16, base: 14, label: "SRATC 7", minQ: 13.2, maxQ: 19.2 },
  { id: "mega", center: 20, base: 17, label: "SRATC 8", minQ: 16.8, maxQ: 23.2 },
];

function shortRunPlantCost(q: number, curve: PlantCurve): number {
  return curve.base + (q - curve.center) ** 2 / 8;
}

const lrAtcFlatStart = 9.5;
const lrAtcFlatEnd = 14;

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

function buildCurve(
  max: number,
  step: number,
  fn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const points: Point[] = [];
  for (let value = 0; value <= max; value += step) {
    const yVal = fn(value);
    if (Number.isFinite(yVal)) {
      points.push({ x: xScale(value), y: yScale(yVal) });
    }
  }
  return points;
}

export default function ProductionCostsPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [labor, setLabor] = useState<number>(baseline.labor);
  const [output, setOutput] = useState<number>(baseline.output);
  const [costView, setCostView] = useState<CostView>(baseline.costView);
  const [plantSize, setPlantSize] = useState<PlantSize>(baseline.plantSize);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [showTangent, setShowTangent] = useState(false);
  const [showRay, setShowRay] = useState(false);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];

  const tp = totalProduct(labor);
  const mp = marginalProduct(labor);
  const ap = averageProduct(labor);

  const currentMC = mc(output);
  const currentATC = atc(output);
  const currentAVC = avc(output);
  const currentAFC = afc(output);
  const costAdvice =
    currentMC < currentATC
      ? "拉低均分 (Pulling Down)"
      : currentMC > currentATC
        ? "拉高均分 (Pulling Up)"
        : "正好等于均分";

  const selectedPlant = plantCurves.find((curve) => curve.id === plantSize)!;
  const optimalAverageCost = selectedPlant.base;
  const returnsStage =
    plantSize === "small"
      ? "规模经济"
      : plantSize === "medium"
        ? "规模收益不变"
        : "规模不经济";

  const tpScales = getChartScales({ xMax: 10, yMax: 360 });
  const mpScales = getChartScales({ xMax: 10, yMax: 120 });
  const costScales = getChartScales({ xMax: 18, yMax: 40 });
  const longScales = getChartScales({ xMax: 24, yMax: 28 });

  const tpCurve = buildCurve(10, 0.2, totalProduct, tpScales.xScale, tpScales.yScale);
  const mpCurve = buildCurve(10, 0.2, marginalProduct, mpScales.xScale, mpScales.yScale);
  const apCurve = buildCurve(10, 0.2, averageProduct, mpScales.xScale, mpScales.yScale);

  const mcCurve = buildCurve(18, 0.2, mc, costScales.xScale, costScales.yScale);
  const atcCurve = buildCurve(18, 0.2, atc, costScales.xScale, costScales.yScale);
  const avcCurve = buildCurve(18, 0.2, avc, costScales.xScale, costScales.yScale);
  const afcCurve = buildCurve(18, 0.2, afc, costScales.xScale, costScales.yScale);

  const srCurves = useMemo(
    () =>
      plantCurves.map((curve) => ({
        ...curve,
        points: buildCurve(curve.maxQ, 0.2, (q) => shortRunPlantCost(q, curve), longScales.xScale, longScales.yScale).filter(
          (point) => point.x >= longScales.xScale(curve.minQ),
        ),
      })),
    [longScales.xScale, longScales.yScale],
  );

  const metrics =
    step === "production" ? (
      <>
        <MetricCard
          metricKey="prod-tp"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总产量 TP"
          value={round(tp, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="prod-mp"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际产量 MP"
          value={round(mp, 2).toFixed(2)}
          accentClassName={mp >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="prod-ap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均产量 AP"
          value={round(ap, 2).toFixed(2)}
        />
      </>
    ) : step === "short-run" ? (
      <>
        <MetricCard
          metricKey="cost-mc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际成本 MC"
          value={round(currentMC, 2).toFixed(2)}
          accentClassName="text-rose-700"
        >
          <div className="mt-2">
            {statusPill(
              currentMC < currentATC ? "good" : currentMC > currentATC ? "warn" : "neutral",
              costAdvice,
            )}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="cost-atc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均总成本 ATC"
          value={round(currentATC, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="cost-avc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均可变成本 AVC"
          value={round(currentAVC, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="cost-afc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均固定成本 AFC"
          value={round(currentAFC, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
      </>
    ) : (
      <>
        <MetricCard
          metricKey="long-optimal"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前最优平均成本"
          value={round(optimalAverageCost, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="long-stage"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="规模收益阶段判定"
          value={returnsStage}
        >
          <div className="mt-2">
            {statusPill(
              plantSize === "medium" ? "neutral" : plantSize === "small" ? "good" : "warn",
              plantSize === "small" ? "LRATC 下降段" : plantSize === "medium" ? "LRATC 平坦段" : "LRATC 上升段",
            )}
          </div>
        </MetricCard>
      </>
    );

  const tangentSlope = mp;
  const tangentDx = 0.9;
  const tangentStartX = Math.max(0, labor - tangentDx);
  const tangentEndX = Math.min(10, labor + tangentDx);
  const tangentYAt = (x: number) => tp + tangentSlope * (x - labor);

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
            Unit 3.1 / 3.2 / 3.3
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            生产函数与成本曲线
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把生产函数、短期成本和长期规模选择串成一条连续逻辑线，让七条核心曲线不再靠死记硬背。
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
          {step === "production" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">劳动力投入 (Variable Input)</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={labor}
                  onChange={(event) => setLabor(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(labor, 1).toFixed(1)}</strong>
              </label>

              <div className="mb-6 flex flex-col gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showTangent}
                    onChange={(e) => setShowTangent(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--ink)]">显示切线 (Slope = MP)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showRay}
                    onChange={(e) => setShowRay(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--ink)]">显示连线 (Slope = AP)</span>
                </label>
              </div>
            </>
          ) : step === "short-run" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">产量目标 (Output)</span>
                <input
                  type="range"
                  min="1"
                  max="18"
                  step="0.1"
                  value={output}
                  onChange={(event) => setOutput(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(output, 1).toFixed(1)}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">曲线高亮选择</span>
                <div className="flex flex-col gap-2">
                  <ButtonGroup<MetricKey, true>
                    value={costView}
                    multiple
                    onChange={(next) => setCostView(next)}
                    options={[
                      { value: "cost-atc", label: "ATC (平均总成本)" },
                      { value: "cost-avc", label: "AVC (平均可变成本)" },
                      { value: "cost-mc", label: "MC (边际成本)" },
                    ]}
                  />
                  <ButtonGroup<MetricKey, true>
                    value={costView}
                    multiple
                    onChange={(next) => setCostView(next)}
                    options={[{ value: "cost-afc", label: "AFC (平均固定成本)" }]}
                  />
                </div>
              </label>
            </>
          ) : (
            <label className={labelStackClass}>
              <span className="font-bold">工厂规模 (Plant Size)</span>
              <ButtonGroup<PlantSize>
                value={plantSize}
                onChange={(next) => setPlantSize(next as PlantSize)}
                className="!grid grid-cols-3"
                options={[
                  { value: "small", label: "小规模 (Small)" },
                  { value: "medium", label: "中规模 (Medium)" },
                  { value: "large", label: "大规模 (Large)" },
                ]}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "production") {
                setLabor(baseline.labor);
                setShowTangent(false);
                setShowRay(false);
              } else if (step === "short-run") {
                setOutput(baseline.output);
                setCostView(baseline.costView);
              } else {
                setPlantSize(baseline.plantSize);
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
              {step === "production"
                ? "产量与边际收益递减法则"
                : step === "short-run"
                  ? "短期成本曲线簇"
                  : "长期平均总成本 (LRATC) 与规模经济"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {step === "production"
                ? "上图看 TP，下图看 MP/AP，用同一条垂直定位线把三者串起来。"
                : step === "short-run"
                  ? "观察 MC 怎样从 ATC 和 AVC 的最低点穿过，并理解 ATC = AVC + AFC。"
                  : "切换不同工厂规模，观察哪条 SRATC 被点亮，以及它在 LRATC 的哪个阶段。"}
            </p>
          </div>

          {step === "production" ? (
            <div className="mx-auto grid max-w-[500px] gap-4">
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} aria-label="Total product chart">
                <ChartFrame
                  xMax={10}
                  yMax={360}
                  xLabel="劳动力数量 (Units of Labour)"
                  yLabel="总产量 TP"
                />
                <path d={linePointsToPath(tpCurve)} className={`${curveClass} ${accentCurveClass}`} />
                <line x1={tpScales.xScale(4)} y1={tpScales.yScale(0)} x2={tpScales.xScale(4)} y2={tpScales.yScale(360)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={tpScales.xScale(6)} y1={tpScales.yScale(0)} x2={tpScales.xScale(6)} y2={tpScales.yScale(360)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={tpScales.xScale(8.3)} y1={tpScales.yScale(0)} x2={tpScales.xScale(8.3)} y2={tpScales.yScale(360)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={tpScales.xScale(labor)} y1={tpScales.yScale(0)} x2={tpScales.xScale(labor)} y2={tpScales.yScale(360)} className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]" />
                <circle cx={tpScales.xScale(labor)} cy={tpScales.yScale(tp)} r="8" className={`${markerStrokeClass} ${pointMarkerClass}`} />
                <text x={tpScales.xScale(6.4)} y={tpScales.yScale(totalProduct(6.4) + 12)} className={chartLabelClass}>
                  TP
                </text>
                {hoveredMetric === "prod-mp" || showTangent ? (
                  <line
                    x1={tpScales.xScale(tangentStartX)}
                    y1={tpScales.yScale(tangentYAt(tangentStartX))}
                    x2={tpScales.xScale(tangentEndX)}
                    y2={tpScales.yScale(tangentYAt(tangentEndX))}
                    className="[stroke:#2f8f68] [stroke-width:4]"
                  />
                ) : null}
                {showRay ? (
                  <line
                    x1={tpScales.xScale(0)}
                    y1={tpScales.yScale(0)}
                    x2={tpScales.xScale(labor)}
                    y2={tpScales.yScale(tp)}
                    className="[stroke:#3c82d6] [stroke-width:4] [stroke-dasharray:4_4]"
                  />
                ) : null}
              </svg>

              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} aria-label="Marginal and average product chart">
                <ChartFrame
                  xMax={10}
                  yMax={120}
                  xLabel="劳动力数量 (Units of Labour)"
                  yLabel="MP / AP"
                />
                <path d={linePointsToPath(mpCurve)} className={`${curveClass} [stroke:#2f8f68]`} />
                <path d={linePointsToPath(apCurve)} className={`${curveClass} [stroke:#3c82d6]`} />
                <line x1={mpScales.xScale(4)} y1={mpScales.yScale(0)} x2={mpScales.xScale(4)} y2={mpScales.yScale(120)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={mpScales.xScale(6)} y1={mpScales.yScale(0)} x2={mpScales.xScale(6)} y2={mpScales.yScale(120)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={mpScales.xScale(8.3)} y1={mpScales.yScale(0)} x2={mpScales.xScale(8.3)} y2={mpScales.yScale(120)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={mpScales.xScale(labor)} y1={mpScales.yScale(0)} x2={mpScales.xScale(labor)} y2={mpScales.yScale(120)} className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]" />
                <circle cx={mpScales.xScale(labor)} cy={mpScales.yScale(Math.max(0, mp))} r="7" className={`${markerStrokeClass} fill-[#2f8f68]`} />
                <circle cx={mpScales.xScale(labor)} cy={mpScales.yScale(Math.max(0, ap))} r="7" className={`${markerStrokeClass} fill-[#3c82d6]`} />
                <text x={mpScales.xScale(3.2)} y={mpScales.yScale(marginalProduct(3.2) + 8)} className={chartLabelClass}>
                  MP
                </text>
                <text x={mpScales.xScale(6.8)} y={mpScales.yScale(averageProduct(6.8) + 8)} className={chartLabelClass}>
                  AP
                </text>
              </svg>
            </div>
          ) : step === "short-run" ? (
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} aria-label="Short-run cost chart">
              <ChartFrame xMax={18} yMax={40} xLabel="产量 (Quantity of Output)" yLabel="单位成本 (Cost, $)" />

              <path
                d={linePointsToPath(mcCurve)}
                className={`${curveClass} [stroke:#c64861] transition-opacity`}
                style={{ opacity: costView.includes("cost-mc") ? 1 : 0.2 }}
              />
              <path
                d={linePointsToPath(atcCurve)}
                className={`${curveClass} [stroke:#2f8f68] transition-opacity`}
                style={{ opacity: costView.includes("cost-atc") ? 1 : 0.2 }}
              />
              <path
                d={linePointsToPath(avcCurve)}
                className={`${curveClass} [stroke:#3c82d6] transition-opacity`}
                style={{ opacity: costView.includes("cost-avc") ? 1 : 0.2 }}
              />
              <path
                d={linePointsToPath(afcCurve)}
                className={`${curveClass} [stroke:#8960c4] transition-opacity`}
                style={{ opacity: costView.includes("cost-afc") ? 1 : 0.2 }}
              />

              <line x1={costScales.xScale(output)} y1={costScales.yScale(0)} x2={costScales.xScale(output)} y2={costScales.yScale(40)} className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]" />

              <circle
                cx={costScales.xScale(output)}
                cy={costScales.yScale(currentMC)}
                r="7"
                className={`${markerStrokeClass} fill-[#c64861] transition-opacity`}
                style={{ opacity: costView.includes("cost-mc") ? 1 : 0.2 }}
              />
              <circle
                cx={costScales.xScale(output)}
                cy={costScales.yScale(currentATC)}
                r="7"
                className={`${markerStrokeClass} fill-[#2f8f68] transition-opacity`}
                style={{ opacity: costView.includes("cost-atc") ? 1 : 0.2 }}
              />
              <circle
                cx={costScales.xScale(output)}
                cy={costScales.yScale(currentAVC)}
                r="7"
                className={`${markerStrokeClass} fill-[#3c82d6] transition-opacity`}
                style={{ opacity: costView.includes("cost-avc") ? 1 : 0.2 }}
              />
              <circle
                cx={costScales.xScale(output)}
                cy={costScales.yScale(currentAFC)}
                r="7"
                className={`${markerStrokeClass} fill-[#8960c4] transition-opacity`}
                style={{ opacity: costView.includes("cost-afc") ? 1 : 0.2 }}
              />

              <text
                x={costScales.xScale(14)}
                y={costScales.yScale(mc(14) + 3)}
                className={`${chartLabelClass} transition-opacity`}
                style={{ opacity: costView.includes("cost-mc") ? 1 : 0.2 }}
              >
                MC
              </text>
              <text
                x={costScales.xScale(13)}
                y={costScales.yScale(atc(13) + 2)}
                className={`${chartLabelClass} transition-opacity`}
                style={{ opacity: costView.includes("cost-atc") ? 1 : 0.2 }}
              >
                ATC
              </text>
              <text
                x={costScales.xScale(12)}
                y={costScales.yScale(avc(12) - 2)}
                className={`${chartLabelClass} transition-opacity`}
                style={{ opacity: costView.includes("cost-avc") ? 1 : 0.2 }}
              >
                AVC
              </text>
              <text
                x={costScales.xScale(11)}
                y={costScales.yScale(afc(11) - 2)}
                className={`${chartLabelClass} transition-opacity`}
                style={{ opacity: costView.includes("cost-afc") ? 1 : 0.2 }}
              >
                AFC
              </text>

              {hoveredMetric === "cost-afc" ? (
                <>
                  <path d={linePointsToPath(afcCurve)} className={`${curveClass} [stroke:#8960c4] [stroke-width:5]`} />
                  <line
                    x1={costScales.xScale(output)}
                    y1={costScales.yScale(currentATC)}
                    x2={costScales.xScale(output)}
                    y2={costScales.yScale(currentAVC)}
                    className="[stroke:#8960c4] [stroke-width:6]"
                  />
                </>
              ) : null}
            </svg>
          ) : (
            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} aria-label="Long-run cost chart">
              <ChartFrame xMax={24} yMax={28} xLabel="产量 (Quantity of Output)" yLabel="平均成本 (Average Cost, $)" />

              <rect
                x={longScales.xScale(0)}
                y={longScales.yScale(28)}
                width={longScales.xScale(lrAtcFlatStart) - longScales.xScale(0)}
                height={longScales.yScale(0) - longScales.yScale(28)}
                className="fill-[rgba(47,143,104,0.18)]"
              />
              <rect
                x={longScales.xScale(lrAtcFlatStart)}
                y={longScales.yScale(28)}
                width={longScales.xScale(lrAtcFlatEnd) - longScales.xScale(lrAtcFlatStart)}
                height={longScales.yScale(0) - longScales.yScale(28)}
                className="fill-[rgba(232,154,45,0.22)]"
              />
              <rect
                x={longScales.xScale(lrAtcFlatEnd)}
                y={longScales.yScale(28)}
                width={longScales.xScale(24) - longScales.xScale(lrAtcFlatEnd)}
                height={longScales.yScale(0) - longScales.yScale(28)}
                className="fill-[rgba(198,72,97,0.18)]"
              />
              <line
                x1={longScales.xScale(lrAtcFlatStart)}
                y1={longScales.yScale(0)}
                x2={longScales.xScale(lrAtcFlatStart)}
                y2={longScales.yScale(28)}
                className="[stroke:rgba(31,42,55,0.16)] [stroke-width:2]"
              />
              <line
                x1={longScales.xScale(lrAtcFlatEnd)}
                y1={longScales.yScale(0)}
                x2={longScales.xScale(lrAtcFlatEnd)}
                y2={longScales.yScale(28)}
                className="[stroke:rgba(31,42,55,0.16)] [stroke-width:2]"
              />

              {srCurves.map((curve) => (
                <path
                  key={curve.id}
                  d={linePointsToPath(curve.points)}
                  className={`${curveClass} ${
                    curve.id === plantSize
                      ? "[stroke:#2f8f68]"
                      : "[stroke:rgba(31,42,55,0.28)]"
                  } ${curve.id === plantSize ? "" : dashedClass}`}
                />
              ))}
              {srCurves.map((curve) => (
                <text
                  key={`label-${curve.id}`}
                  x={longScales.xScale(curve.center + 0.5)}
                  y={longScales.yScale(curve.base + 2.3 + (curve.labelOffset ?? 0))}
                  className={chartSmallLabelClass}
                >
                  {curve.label}
                </text>
              ))}

              <text x={longScales.xScale(2.5)} y={longScales.yScale(7.2)} className={chartSmallLabelClass}>
                <tspan x={longScales.xScale(2.5)} dy="0">Economies</tspan>
                <tspan x={longScales.xScale(2.5)} dy="1.25em">of scale</tspan>
              </text>
              <text x={longScales.xScale(10.2)} y={longScales.yScale(7.2)} className={chartSmallLabelClass}>
                <tspan x={longScales.xScale(10.2)} dy="0">Constant</tspan>
                <tspan x={longScales.xScale(10.2)} dy="1.25em">economies of scale</tspan>
              </text>
              <text x={longScales.xScale(16.2)} y={longScales.yScale(7.2)} className={chartSmallLabelClass}>
                <tspan x={longScales.xScale(16.2)} dy="0">Diseconomies</tspan>
                <tspan x={longScales.xScale(16.2)} dy="1.25em">of scale</tspan>
              </text>
            </svg>
          )}

          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
