"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ButtonGroup } from "../../components/button-group";
import { ChartFrame } from "../../components/chart-frame";
import {
  CHART,
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
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../components/ui-classes";

type LessonStep = "mrp" | "hiring";
type MrMode = "flat" | "downward";
type MetricKey =
  | "mrp-mp"
  | "mrp-price"
  | "mrp-value"
  | "hire-wage"
  | "hire-mrc"
  | "hire-q"
  | "hire-net";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "mrp",
    title: "步骤一：认识边际收益产品",
    summary: "先看每多雇一个工人，会给企业多赚多少钱。",
    description:
      "企业雇工不是因为“人多热闹”，而是因为最后一个工人还能带来额外收入。先画出边际产量 MP，再选择产品市场给企业的边际收益 MR：完全竞争时 MR 是平的，垄断或价格影响力下 MR 会向下倾斜。两者相乘得到 MRP = MR × MP。",
    chartTitle: "由 MP 与 MR 推导 MRP",
    chartSubtitle: "可显示或隐藏 MP 曲线，并在平坦 MR 与向下倾斜 MR 之间切换，观察 MRP = MR × MP 如何生成要素需求曲线。",
  },
  {
    id: "hiring",
    title: "步骤二：利润最大化雇佣",
    summary: "再把市场工资接进来，用 MRP = MRC 找最佳雇佣量。",
    description:
      "在完全竞争劳动力市场中，企业没有能力自己决定工资，只能接受市场给出的工资水平。这条工资线就是企业的 MRC。只要最后一个工人的 MRP 还高于工资，就值得继续雇佣；一旦低于工资，就该停下来。",
    chartTitle: "市场决定工资，企业决定雇佣量",
    chartSubtitle: "左图改变市场供给，右图的工资线同步移动；再用试探性雇佣量去验证 MRP = MRC。",
  },
];

const baseline = {
  step: "mrp" as LessonStep,
  workers: 1,
  showMp: true,
  mrMode: "flat" as MrMode,
  laborSupply: 50,
  trialLabor: 0,
};

const LABOR_MAX = 10;
const MARKET_X_MAX = 120;
const MARKET_Y_MAX = 22;
const FIRM_X_MAX = 10;
const HIRING_FIRM_Y_MAX = MARKET_Y_MAX * 5;

function marginalProduct(labor: number): number {
  return Math.max(2, 22 - 2 * labor);
}

function marginalRevenue(labor: number, mode: MrMode): number {
  if (mode === "flat") return 6;
  return Math.max(2, 9 - 0.7 * labor);
}

function marginalRevenueProduct(labor: number, mode: MrMode): number {
  return marginalProduct(labor) * marginalRevenue(labor, mode);
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

function laborDemandPrice(quantity: number): number {
  return 20 - 0.11 * quantity;
}

function laborSupplyPrice(quantity: number, interceptShift: number): number {
  return 4 + interceptShift + 0.08 * quantity;
}

function equilibriumLabor(interceptShift: number): number {
  return (16 - interceptShift) / 0.19;
}

function equilibriumWage(interceptShift: number): number {
  return laborDemandPrice(equilibriumLabor(interceptShift));
}

function baseFactorMpr(labor: number): number {
  return 96 - 7.6 * labor;
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

export default function FactorMarketsPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [workers, setWorkers] = useState<number>(baseline.workers);
  const [showMp, setShowMp] = useState<boolean>(baseline.showMp);
  const [mrMode, setMrMode] = useState<MrMode>(baseline.mrMode);
  const [laborSupply, setLaborSupply] = useState<number>(baseline.laborSupply);
  const [trialLabor, setTrialLabor] = useState<number>(baseline.trialLabor);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];

  const currentLabor = clamp(workers, 1, LABOR_MAX);
  const currentMp = marginalProduct(currentLabor);
  const currentMr = marginalRevenue(currentLabor, mrMode);
  const currentMrp = marginalRevenueProduct(currentLabor, mrMode);

  const mrpYMax = 170;
  const mrpScales = getChartScales({ xMax: LABOR_MAX, yMax: mrpYMax });
  const mpCurve = buildCurve(LABOR_MAX, 0.1, marginalProduct, mrpScales.xScale, mrpScales.yScale);
  const mrCurve = buildCurve(
    LABOR_MAX,
    0.1,
    (l) => marginalRevenue(l, mrMode),
    mrpScales.xScale,
    mrpScales.yScale,
  );
  const mrpCurve = buildCurve(
    LABOR_MAX,
    0.1,
    (l) => marginalRevenueProduct(l, mrMode),
    mrpScales.xScale,
    mrpScales.yScale,
  );

  const supplyShift = (laborSupply - 50) * 0.08;
  const marketQ = equilibriumLabor(supplyShift);
  const marketWage = equilibriumWage(supplyShift);
  const marketScales = getChartScales({ xMax: MARKET_X_MAX, yMax: MARKET_Y_MAX });
  const marketDemandCurve = buildCurve(
    MARKET_X_MAX,
    1,
    laborDemandPrice,
    marketScales.xScale,
    marketScales.yScale,
  );
  const marketSupplyCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (q) => laborSupplyPrice(q, supplyShift),
    marketScales.xScale,
    marketScales.yScale,
  );

  const trialWorkers = clamp(trialLabor, 0, FIRM_X_MAX);
  const hiringFirmScales = getChartScales({ xMax: FIRM_X_MAX, yMax: HIRING_FIRM_Y_MAX });
  const firmMrpCurve = buildCurve(
    FIRM_X_MAX,
    0.1,
    baseFactorMpr,
    hiringFirmScales.xScale,
    hiringFirmScales.yScale,
  );
  const trialMrp = baseFactorMpr(trialWorkers);
  const lastWorkerContribution = trialMrp - marketWage * 5;
  const optimalFirmLabor = clamp((96 - marketWage * 5) / 7.6, 0, FIRM_X_MAX);
  const hiringAdvice =
    Math.abs(lastWorkerContribution) < 2
      ? "达到最优雇佣点"
      : lastWorkerContribution > 0
        ? "继续雇佣"
        : "雇多了，应该减少";

  const metrics =
    step === "mrp" ? (
      <>
        <MetricCard
          metricKey="mrp-mp"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际产量 MP"
          value={round(currentMp, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="mrp-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际收益 MR"
          value={round(currentMr, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="mrp-value"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际收益产品 MRP"
          value={round(currentMrp, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
      </>
    ) : (
      <>
        <MetricCard
          metricKey="hire-wage"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场均衡工资 W_M"
          value={round(marketWage, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="hire-mrc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际资源成本 MRC"
          value={round(marketWage, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="hire-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业最优雇佣量 Q_F"
          value={round((96 - marketWage * 5) / 7.6, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="hire-net"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最后一个工人的净利润贡献"
          value={round(lastWorkerContribution, 2).toFixed(2)}
          accentClassName={lastWorkerContribution >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(
              Math.abs(lastWorkerContribution) < 2 ? "warn" : lastWorkerContribution > 0 ? "good" : "loss",
              hiringAdvice,
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
            Unit 5.1 / 5.2 / 5.3
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            要素市场与雇佣决策
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把产品市场里的边际分析搬到投入端，看企业如何根据工人的边际收益产品、市场工资和派生需求来决定最优雇佣量。
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
          {step === "mrp" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">劳动力雇佣量 Workers</span>
                <input
                  type="range"
                  min="1"
                  max={LABOR_MAX}
                  step="1"
                  value={workers}
                  onChange={(event) => setWorkers(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{workers}</strong>
              </label>

              <div className={labelStackClass}>
                <span className="font-bold">是否显示 MP 曲线</span>
                <ButtonGroup
                  value={showMp ? "show" : "hide"}
                  onChange={(value) => setShowMp(value === "show")}
                  options={[
                    { value: "show", label: "显示 MP" },
                    { value: "hide", label: "隐藏 MP" },
                  ]}
                />
              </div>

              <div className={labelStackClass}>
                <span className="font-bold">MR 曲线类型</span>
                <ButtonGroup<MrMode>
                  value={mrMode}
                  onChange={setMrMode}
                  options={[
                    { value: "flat", label: "平坦 MR" },
                    { value: "downward", label: "向下倾斜 MR" },
                  ]}
                />
              </div>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场劳动力供给</span>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="1"
                  value={laborSupply}
                  onChange={(event) => setLaborSupply(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{laborSupply}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">企业试探性雇佣量</span>
                <input
                  type="range"
                  min="0"
                  max={FIRM_X_MAX}
                  step="0.1"
                  value={trialLabor}
                  onChange={(event) => setTrialLabor(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(trialLabor, 1).toFixed(1)}</strong>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "mrp") {
                setWorkers(baseline.workers);
                setShowMp(baseline.showMp);
                setMrMode(baseline.mrMode);
              } else if (step === "hiring") {
                setLaborSupply(baseline.laborSupply);
                setTrialLabor(baseline.trialLabor);
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

          {step === "mrp" ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                <ChartFrame xMax={LABOR_MAX} yMax={mrpYMax} xLabel="劳动力数量 (L)" yLabel="MP / MR / MRP" />
                {showMp ? (
                  <path
                    d={linePointsToPath(mpCurve)}
                    className={`${curveClass} ${dashedClass} ${hoveredMetric === "mrp-mp" ? "stroke-[5]" : ""} [stroke:#2563eb]`}
                  />
                ) : null}
                <path
                  d={linePointsToPath(mrCurve)}
                  className={`${curveClass} ${mrMode === "flat" ? "" : dashedClass} ${hoveredMetric === "mrp-price" ? "stroke-[5]" : ""} [stroke:#f59e0b]`}
                />
                <path d={linePointsToPath(mrpCurve)} className={`${curveClass} [stroke:#2f8f68]`} />
                <line
                  x1={mrpScales.xScale(currentLabor)}
                  y1={CHART.margin.top}
                  x2={mrpScales.xScale(currentLabor)}
                  y2={CHART.height - CHART.margin.bottom}
                  className={`${gridLineClass} ${dashedClass}`}
                />
                <circle
                  cx={mrpScales.xScale(currentLabor)}
                  cy={mrpScales.yScale(currentMrp)}
                  r="8"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />
                {showMp ? (
                  <circle
                    cx={mrpScales.xScale(currentLabor)}
                    cy={mrpScales.yScale(currentMp)}
                    r="6"
                    className={`${markerStrokeClass} fill-sky-500`}
                  />
                ) : null}
                <circle
                  cx={mrpScales.xScale(currentLabor)}
                  cy={mrpScales.yScale(currentMr)}
                  r="6"
                  className={`${markerStrokeClass} fill-amber-500`}
                />
                <line
                  x1={mrpScales.xScale(currentLabor)}
                  y1={mrpScales.yScale(currentMr)}
                  x2={mrpScales.xScale(currentLabor)}
                  y2={mrpScales.yScale(currentMrp)}
                  className={`${hoveredMetric === "mrp-value" ? "[stroke-width:5]" : "[stroke-width:3]"} [stroke:rgba(34,197,94,0.22)]`}
                />
                {showMp ? (
                  <text x={mrpScales.xScale(7.6)} y={mrpScales.yScale(marginalProduct(7.6) + 9)} className="fill-sky-700 text-[12px] font-semibold">
                    MP
                  </text>
                ) : null}
                <text x={mrpScales.xScale(7.4)} y={mrpScales.yScale(marginalRevenue(7.4, mrMode) + 14)} className="fill-amber-700 text-[12px] font-semibold">
                  MR
                </text>
                <text x={mrpScales.xScale(7.3)} y={mrpScales.yScale(marginalRevenueProduct(7.3, mrMode) + 8)} className={chartLabelClass}>
                  MRP_L = D
                </text>
                <text x={mrpScales.xScale(currentLabor) + 36} y={mrpScales.yScale(currentMrp) - 10} className={chartSmallLabelClass}>
                  MRP
                </text>
                <text
                  x={mrpScales.xScale(currentLabor) + 18}
                  y={mrpScales.yScale(currentMrp) + 20}
                  className={chartSmallLabelClass}
                >
                  {round(currentMp, 1)} × {round(currentMr, 1)} = {round(currentMrp, 1)}
                </text>
              </svg>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--muted)]">市场图 Market</div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={MARKET_X_MAX} yMax={MARKET_Y_MAX} xLabel="市场总劳动力" yLabel="工资率" />
                  <path d={linePointsToPath(marketDemandCurve)} className={`${curveClass} [stroke:#3b82f6]`} />
                  <path d={linePointsToPath(marketSupplyCurve)} className={`${curveClass} [stroke:#f97316]`} />
                  <line
                    x1={marketScales.xScale(0)}
                    y1={marketScales.yScale(marketWage)}
                    x2={marketScales.xScale(marketQ)}
                    y2={marketScales.yScale(marketWage)}
                    className={`${hoveredMetric === "hire-wage" || hoveredMetric === "hire-mrc" ? "[stroke-width:6]" : "[stroke-width:4]"} ${dashedClass} [stroke:#0f766e]`}
                  />
                  <line
                    x1={marketScales.xScale(marketQ)}
                    y1={marketScales.yScale(marketWage)}
                    x2={CHART.width}
                    y2={marketScales.yScale(marketWage)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <line
                    x1={marketScales.xScale(marketQ)}
                    y1={marketScales.yScale(0)}
                    x2={marketScales.xScale(marketQ)}
                    y2={marketScales.yScale(marketWage)}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={marketScales.xScale(marketQ)}
                    cy={marketScales.yScale(marketWage)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text x={marketScales.xScale(18)} y={marketScales.yScale(laborDemandPrice(18) + 1.4)} className={chartLabelClass}>
                    D
                  </text>
                  <text x={marketScales.xScale(90)} y={marketScales.yScale(laborSupplyPrice(90, supplyShift) + 1.2)} className={chartLabelClass}>
                    S
                  </text>
                </svg>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--muted)]">
                  <span>企业图 Firm</span>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">MRC = Wage</span>
                </div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={FIRM_X_MAX} yMax={HIRING_FIRM_Y_MAX} xLabel="企业劳动力数量" yLabel="工资 / MRP" />
                  <path d={linePointsToPath(firmMrpCurve)} className={`${curveClass} [stroke:#2f8f68]`} />
                  <line
                    x1={0}
                    y1={hiringFirmScales.yScale(marketWage * 5)}
                    x2={hiringFirmScales.xScale(0)}
                    y2={hiringFirmScales.yScale(marketWage * 5)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <line
                    x1={hiringFirmScales.xScale(0)}
                    y1={hiringFirmScales.yScale(marketWage * 5)}
                    x2={hiringFirmScales.xScale(FIRM_X_MAX)}
                    y2={hiringFirmScales.yScale(marketWage * 5)}
                    className={`${hoveredMetric === "hire-wage" || hoveredMetric === "hire-mrc" ? "[stroke-width:6]" : "[stroke-width:4]"} [stroke:#3b82f6]`}
                  />
                  <line
                    x1={hiringFirmScales.xScale(trialWorkers)}
                    y1={CHART.margin.top}
                    x2={hiringFirmScales.xScale(trialWorkers)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <line
                    x1={hiringFirmScales.xScale(optimalFirmLabor)}
                    y1={hiringFirmScales.yScale(0)}
                    x2={hiringFirmScales.xScale(optimalFirmLabor)}
                    y2={hiringFirmScales.yScale(marketWage * 5)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <circle
                    cx={hiringFirmScales.xScale(trialWorkers)}
                    cy={hiringFirmScales.yScale(trialMrp)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text
                    x={hiringFirmScales.xScale(0) - 14}
                    y={hiringFirmScales.yScale(marketWage * 5) + 4}
                    textAnchor="end"
                    className="fill-amber-700 text-[12px] font-bold"
                  >
                    P
                  </text>
                  <text x={hiringFirmScales.xScale(6.5)} y={hiringFirmScales.yScale(baseFactorMpr(6.5) + 8)} className={chartLabelClass}>
                    MRP_L
                  </text>
                  <text x={hiringFirmScales.xScale(7.6)} y={hiringFirmScales.yScale(marketWage * 5) - 10} className={chartLabelClass}>
                    MRC = Wage
                  </text>
                </svg>
              </div>
            </div>
          )}

          <div className={`mt-5 grid gap-3 ${step === "mrp" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {metrics}
          </div>
        </section>
      </main>
    </div>
  );
}
