"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

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
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../components/ui-classes";
import { ButtonGroup } from "../../components/button-group";

type LessonStep = "cost" | "decision" | "dwl";
type ProductivityShock = "low" | "base" | "high";
type ComparisonMode = "monopsony-only" | "show-competitive";
type MetricKey =
  | "cost-new-worker"
  | "cost-mfc"
  | "cost-old-workers"
  | "decision-qm"
  | "decision-wm"
  | "decision-mrp"
  | "decision-mfc"
  | "dwl-qc"
  | "dwl-wc"
  | "dwl-jobs"
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
    id: "cost",
    title: "步骤一：供给与边际要素成本",
    summary: "先看为什么买方垄断下 MFC 会被抬到供给曲线上方。",
    description:
      "当企业是劳动力市场唯一的大买家时，它想多招一个人就必须把工资抬高。而这次涨薪不只付给新来的那个人，还要补给前面所有已经在岗的工人，所以边际要素成本 MFC 会高于工资曲线 S。",
    chartTitle: "工资制定者：劳动供给与边际要素成本",
    chartSubtitle: "拖动 S 上的点或调整目标雇佣人数，观察新员工成本（蓝色）与老员工成本（黄色）如何共同推高 MFC。",
  },
  {
    id: "decision",
    title: "步骤二：利润最大化决策",
    summary: "再用 MFC = MRP 找雇佣人数，并向下到供给曲线找低工资。",
    description:
      "买方垄断企业还是会按边际原则做决策，只不过现在比较的是 MFC 和 MRP。先在 MFC = MRP 的交点上锁定最优雇佣量，再沿着这个人数向下找到供给曲线上的工资水平，这就是被压低后的买方垄断工资。",
    chartTitle: "买方垄断者的工资决策法则",
    chartSubtitle: "寻找 MFC = MRP 的交点来定人数，再向下找供给曲线上的工资。拖动试探人数，图中同步显示该人数下的 MRP、MFC 与决策建议。",
  },
  {
    id: "dwl",
    title: "步骤三：与完全竞争的对比及无谓损失",
    summary: "最后叠加竞争基准，比较低工资、少雇佣和 DWL。",
    description:
      "在完全竞争劳动力市场中，工资和雇佣量由 S = MRP 的交点决定；而买方垄断会故意限制雇佣、压低工资。两种市场结构之间的差距，就是买方垄断带来的剥削和社会福利损失。",
    chartTitle: "市场失灵：买方垄断造成的福利损失",
    chartSubtitle: "叠加完全竞争基准，观察 Q_m < Q_c、W_m < W_c，以及被扼杀的雇佣交易形成的红色 DWL。",
  },
];

const baseline = {
  step: "cost" as LessonStep,
  labor: 1,
  trialLabor: 0,
  productivityShock: "base" as ProductivityShock,
  comparisonMode: "monopsony-only" as ComparisonMode,
};

const X_MAX = 12;
const Y_MAX = 30;

function supplyWage(labor: number): number {
  return 8 + 0.9 * labor;
}

function marginalFactorCost(labor: number): number {
  const currentWage = supplyWage(labor);
  const previousWage = supplyWage(Math.max(0, labor - 1));
  const oldWorkerCount = Math.max(0, labor - 1);
  return currentWage + (currentWage - previousWage) * oldWorkerCount;
}

function mrpBase(labor: number): number {
  return 28 - 1.4 * labor;
}

function mrpWithShock(labor: number, shock: ProductivityShock): number {
  const shift = shock === "high" ? 4 : shock === "low" ? -4 : 0;
  return mrpBase(labor) + shift;
}

function buildCurve(
  max: number,
  step: number,
  fn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
  start = 0,
): Point[] {
  const points: Point[] = [];
  for (let value = start; value <= max; value += step) {
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

export default function MonopsonyLaborPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [labor, setLabor] = useState<number>(baseline.labor);
  const [trialLabor, setTrialLabor] = useState<number>(baseline.trialLabor);
  const [productivityShock, setProductivityShock] = useState<ProductivityShock>(baseline.productivityShock);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(baseline.comparisonMode);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [isDraggingSupplyPoint, setIsDraggingSupplyPoint] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const scales = getChartScales({ xMax: X_MAX, yMax: Y_MAX });

  const currentLabor = clamp(labor, 1, X_MAX);
  const currentWage = supplyWage(currentLabor);
  const currentMfc = marginalFactorCost(currentLabor);
  const previousWage = supplyWage(Math.max(0, currentLabor - 1));
  const raiseGap = currentWage - previousWage;
  const extraCost = raiseGap * Math.max(0, currentLabor - 1);
  const newWorkerCost = currentWage;
  const oldWorkerCost = extraCost;
  const oldWorkerRaiseArea =
    currentLabor > 1
      ? rectangleArea(0, currentLabor - 1, currentWage, previousWage, scales.xScale, scales.yScale)
      : null;

  function updateLaborFromPointer(event: PointerEvent<SVGSVGElement | SVGCircleElement>) {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CHART.width;
    const chartX = clamp(x, CHART.margin.left, CHART.width - CHART.margin.right);
    const nextLabor = Math.round(((chartX - CHART.margin.left) / scales.plotWidth) * X_MAX);
    setLabor(clamp(nextLabor, 1, X_MAX));
  }

  function startSupplyPointDrag(event: PointerEvent<SVGCircleElement>) {
    setIsDraggingSupplyPoint(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateLaborFromPointer(event);
  }

  const supplyCurve = buildCurve(X_MAX, 0.1, supplyWage, scales.xScale, scales.yScale, step === "cost" ? 1 : 0);
  const mfcCurve = buildCurve(X_MAX, 0.1, marginalFactorCost, scales.xScale, scales.yScale, step === "cost" ? 1 : 0);
  const mrpCurve = buildCurve(X_MAX, 0.1, (l) => mrpWithShock(l, productivityShock), scales.xScale, scales.yScale);

  const mfcInterceptQ = (20.9 + (productivityShock === "high" ? 4 : productivityShock === "low" ? -4 : 0)) / 3.2;
  const optimalQm = clamp(mfcInterceptQ, 0, X_MAX);
  const monopsonyWage = supplyWage(optimalQm);
  const optimalMrp = mrpWithShock(optimalQm, productivityShock);

  const trialQ = clamp(trialLabor, 0, X_MAX);
  const trialMfc = marginalFactorCost(trialQ);
  const trialMrp = mrpWithShock(trialQ, productivityShock);
  const hiringAdvice =
    Math.abs(trialMrp - trialMfc) < 0.6
      ? "到达最优点"
      : trialMrp > trialMfc
        ? "继续雇佣"
        : "应减少雇佣";
  const decisionLabelX = clamp(
    scales.xScale(trialQ) + (trialQ > 7 ? -220 : 18),
    CHART.margin.left + 8,
    CHART.width - CHART.margin.right - 210,
  );
  const decisionLabelY = clamp(
    scales.yScale(Math.max(trialMrp, trialMfc)) - 58,
    CHART.margin.top + 8,
    CHART.height - CHART.margin.bottom - 84,
  );
  const decisionAdviceFill =
    Math.abs(trialMrp - trialMfc) < 0.6
      ? "#b45309"
      : trialMrp > trialMfc
        ? "#047857"
        : "#be123c";

  const competitiveQ = clamp(
    (20 + (productivityShock === "high" ? 4 : productivityShock === "low" ? -4 : 0)) / 2.3,
    0,
    X_MAX,
  );
  const competitiveWage = supplyWage(competitiveQ);
  const lostJobs = competitiveQ - optimalQm;
  const dwl = 0.5 * (optimalMrp - monopsonyWage) * lostJobs;
  const dwlArea = areaBetweenCurves(optimalQm, competitiveQ, 0.1, (l) => mrpWithShock(l, productivityShock), supplyWage, scales.xScale, scales.yScale);

  const metrics =
    step === "cost" ? (
      <>
        <MetricCard
          metricKey="cost-new-worker"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="新员工成本"
          value={round(newWorkerCost, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="cost-old-workers"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="老员工成本"
          value={round(oldWorkerCost, 2).toFixed(2)}
          accentClassName="text-amber-700"
        >
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {currentLabor > 1 ? `${currentLabor - 1} 名老员工 × 涨薪 ${round(raiseGap, 2).toFixed(2)}` : "第一名员工没有老员工补涨薪"}
          </p>
        </MetricCard>
        <MetricCard
          metricKey="cost-mfc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际要素成本 MFC"
          value={round(currentMfc, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
      </>
    ) : step === "decision" ? (
      <>
        <MetricCard
          metricKey="decision-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="最优雇佣人数 Q_m"
          value={round(optimalQm, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="decision-wm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="垄断低工资 W_m"
          value={round(monopsonyWage, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="decision-mrp"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前 MRP"
          value={round(trialMrp, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="decision-mfc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前 MFC"
          value={round(trialMfc, 2).toFixed(2)}
          accentClassName="text-rose-700"
        >
          <div className="mt-2">
            {statusPill(
              Math.abs(trialMrp - trialMfc) < 0.6 ? "warn" : trialMrp > trialMfc ? "good" : "loss",
              hiringAdvice,
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="dwl-qc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="竞争性雇佣人数 Q_c"
          value={round(competitiveQ, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="dwl-wc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="竞争性市场工资 W_c"
          value={round(competitiveWage, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="dwl-jobs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="失去的就业岗位数"
          value={round(lostJobs, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="dwl-area"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失面积 DWL"
          value={round(dwl, 2).toFixed(2)}
          accentClassName="text-rose-700"
        >
          <div className="mt-2">{statusPill("loss", "资源错配")}</div>
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
            Unit 5.4
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            买方垄断劳动力市场
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            用卖方垄断的镜像逻辑理解买方垄断：边际要素成本被抬高到供给曲线上方，企业据此压低工资并限制雇佣，最终造成社会福利损失。
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
          {step === "cost" ? (
            <label className={labelStackClass}>
              <span className="font-bold">目标雇佣人数</span>
              <input
                type="range"
                min="1"
                max={X_MAX}
                step="1"
                value={labor}
                onChange={(event) => setLabor(Number(event.target.value))}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{labor}</strong>
            </label>
          ) : step === "decision" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">试探性雇佣人数</span>
                <input
                  type="range"
                  min="0"
                  max={X_MAX}
                  step="0.1"
                  value={trialLabor}
                  onChange={(event) => setTrialLabor(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(trialLabor, 1).toFixed(1)}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">劳动生产率冲击</span>
                <ButtonGroup<ProductivityShock>
                  value={productivityShock}
                  onChange={(next) => setProductivityShock(next as ProductivityShock)}
                  options={[
                { value: "low", label: "生产率下降" },
                { value: "base", label: "维持现状" },
                { value: "high", label: "生产率提升" },
              ]}
                />
              </label>
            </>
          ) : (
            <label className={labelStackClass}>
              <span className="font-bold">市场结构对比</span>
              <ButtonGroup<ComparisonMode>
                value={comparisonMode}
                onChange={(next) => setComparisonMode(next as ComparisonMode)}
                options={[
                { value: "monopsony-only", label: "仅显示买方垄断均衡" },
                { value: "show-competitive", label: "叠加显示完全竞争基准" },
              ]}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "cost") {
                setLabor(baseline.labor);
              } else if (step === "decision") {
                setTrialLabor(baseline.trialLabor);
                setProductivityShock(baseline.productivityShock);
              } else {
                setComparisonMode(baseline.comparisonMode);
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

          {step === "dwl" && hoveredMetric === "dwl-area" ? (
            <div className="mb-4 inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
              分配无效率：存在本可发生却被压制掉的雇佣交易
            </div>
          ) : null}

          <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className={chartSvgClass}
              role="img"
              onPointerMove={(event) => {
                if (step === "cost" && isDraggingSupplyPoint) {
                  updateLaborFromPointer(event);
                }
              }}
              onPointerUp={() => setIsDraggingSupplyPoint(false)}
              onPointerLeave={() => setIsDraggingSupplyPoint(false)}
            >
              <ChartFrame
                xMax={X_MAX}
                yMax={Y_MAX}
                xLabel="劳动力数量 (Q)"
                yLabel={step === "cost" ? "工资 / 成本" : "工资 / 成本 / 收益"}
              />

              {step === "cost" && oldWorkerRaiseArea ? (
                <path
                  d={areaPointsToPath(oldWorkerRaiseArea)}
                  fill="rgba(245,158,11,0.18)"
                  className={hoveredMetric === "cost-old-workers" ? "animate-pulse" : ""}
                />
              ) : null}

              {step === "cost" ? (
                <>
                  <path
                    d={areaPointsToPath(rectangleArea(
                      clamp(currentLabor - 0.36, 0, X_MAX),
                      clamp(currentLabor + 0.36, 0, X_MAX),
                      currentWage,
                      0,
                      scales.xScale,
                      scales.yScale,
                    ))}
                    fill="rgba(59,130,246,0.22)"
                    className={hoveredMetric === "cost-new-worker" ? "animate-pulse" : ""}
                  />
                  {oldWorkerRaiseArea ? (
                    <text
                      x={scales.xScale((currentLabor - 1) / 2)}
                      y={(scales.yScale(currentWage) + scales.yScale(previousWage)) / 2 + 4}
                      textAnchor="middle"
                      className="fill-amber-800 text-[12px] font-semibold"
                    >
                      老员工成本
                    </text>
                  ) : null}
                </>
              ) : null}

              {step === "dwl" && comparisonMode === "show-competitive" ? (
                <path
                  d={areaPointsToPath(dwlArea)}
                  fill="rgba(239,68,68,0.18)"
                  className={hoveredMetric === "dwl-area" ? "animate-pulse" : ""}
                />
              ) : null}

              <path
                d={linePointsToPath(supplyCurve)}
                className={`${curveClass} ${hoveredMetric === "decision-wm" ? "stroke-[5]" : ""}`}
                stroke="rgba(59,130,246,0.94)"
              />
              <path
                d={linePointsToPath(mfcCurve)}
                className={`${curveClass} ${hoveredMetric === "cost-mfc" || hoveredMetric === "decision-mfc" ? "stroke-[5]" : ""}`}
                stroke="rgba(239,68,68,0.92)"
              />
              {step !== "cost" ? (
                <path
                  d={linePointsToPath(mrpCurve)}
                  className={`${curveClass} ${hoveredMetric === "decision-mrp" ? "stroke-[5]" : ""}`}
                  stroke="rgba(15,118,110,0.94)"
                />
              ) : null}

              {step === "cost" ? (
                <>
                  <line
                    x1={scales.xScale(currentLabor)}
                    y1={CHART.margin.top}
                    x2={scales.xScale(currentLabor)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={scales.xScale(currentLabor)}
                    cy={scales.yScale(currentWage)}
                    r="9"
                    fill="rgba(59,130,246,0.94)"
                    className={`${markerStrokeClass} cursor-ew-resize`}
                    onPointerDown={startSupplyPointDrag}
                  />
                  <circle
                    cx={scales.xScale(currentLabor)}
                    cy={scales.yScale(currentMfc)}
                    r="7"
                    fill="rgba(239,68,68,0.92)"
                    className={markerStrokeClass}
                  />
                  <text
                    x={scales.xScale(currentLabor)}
                    y={scales.yScale(0) + 20}
                    textAnchor="middle"
                    className={chartSmallLabelClass}
                  >
                    新员工成本
                  </text>
                  <text x={scales.xScale(currentLabor) + 10} y={scales.yScale(currentMfc) + 18} className={chartSmallLabelClass}>
                    MFC
                  </text>
                </>
              ) : null}

              {step === "decision" ? (
                <>
                  <line
                    x1={scales.xScale(trialQ)}
                    y1={CHART.margin.top}
                    x2={scales.xScale(trialQ)}
                    y2={CHART.height - CHART.margin.bottom}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(trialMrp)}
                    x2={scales.xScale(trialQ)}
                    y2={scales.yScale(trialMrp)}
                    className={`${dashedClass} [stroke:#0f766e] [stroke-width:3]`}
                  />
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(trialMfc)}
                    x2={scales.xScale(trialQ)}
                    y2={scales.yScale(trialMfc)}
                    className={`${dashedClass} [stroke:#ef4444] [stroke-width:3]`}
                  />
                  <line
                    x1={scales.xScale(optimalQm)}
                    y1={scales.yScale(optimalMrp)}
                    x2={scales.xScale(optimalQm)}
                    y2={scales.yScale(monopsonyWage)}
                    className={`${hoveredMetric === "decision-wm" ? "[stroke-width:6]" : "[stroke-width:4]"} ${dashedClass} [stroke:#f59e0b]`}
                  />
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(monopsonyWage)}
                    x2={scales.xScale(optimalQm)}
                    y2={scales.yScale(monopsonyWage)}
                    className={`${dashedClass} [stroke:#3b82f6] [stroke-width:4]`}
                  />
                  <circle
                    cx={scales.xScale(optimalQm)}
                    cy={scales.yScale(optimalMrp)}
                    r="8"
                    fill="rgba(245,158,11,0.92)"
                    className={markerStrokeClass}
                  />
                  <circle
                    cx={scales.xScale(trialQ)}
                    cy={scales.yScale(trialMrp)}
                    r="7"
                    fill="rgba(15,118,110,0.94)"
                    className={markerStrokeClass}
                  />
                  <circle
                    cx={scales.xScale(trialQ)}
                    cy={scales.yScale(trialMfc)}
                    r="7"
                    fill="rgba(239,68,68,0.92)"
                    className={markerStrokeClass}
                  />
                  <g>
                    <rect
                      x={decisionLabelX}
                      y={decisionLabelY}
                      width="210"
                      height="84"
                      rx="14"
                      fill="rgba(255,255,255,0.92)"
                      stroke="rgba(223,213,199,0.95)"
                    />
                    <text x={decisionLabelX + 14} y={decisionLabelY + 24} className="fill-[var(--ink)] text-[13px] font-bold">
                      当前人数 Q = {round(trialQ, 1).toFixed(1)}
                    </text>
                    <text x={decisionLabelX + 14} y={decisionLabelY + 47} className="fill-teal-700 text-[12px] font-semibold">
                      MRP {round(trialMrp, 2).toFixed(2)}
                    </text>
                    <text x={decisionLabelX + 96} y={decisionLabelY + 47} className="fill-rose-700 text-[12px] font-semibold">
                      MFC {round(trialMfc, 2).toFixed(2)}
                    </text>
                    <text x={decisionLabelX + 14} y={decisionLabelY + 70} fill={decisionAdviceFill} className="text-[12px] font-bold">
                      {hiringAdvice}
                    </text>
                  </g>
                </>
              ) : null}

              {step === "dwl" ? (
                <>
                  <line
                    x1={scales.xScale(optimalQm)}
                    y1={scales.yScale(optimalMrp)}
                    x2={scales.xScale(optimalQm)}
                    y2={scales.yScale(monopsonyWage)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <line
                    x1={scales.xScale(0)}
                    y1={scales.yScale(monopsonyWage)}
                    x2={scales.xScale(optimalQm)}
                    y2={scales.yScale(monopsonyWage)}
                    className={`${dashedClass} [stroke:#3b82f6] [stroke-width:4]`}
                  />
                  <text x={scales.xScale(optimalQm)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    Q_m
                  </text>

                  {comparisonMode === "show-competitive" ? (
                    <>
                      <line
                        x1={scales.xScale(competitiveQ)}
                        y1={scales.yScale(0)}
                        x2={scales.xScale(competitiveQ)}
                        y2={scales.yScale(competitiveWage)}
                        className={`${gridLineClass} ${dashedClass}`}
                      />
                      <line
                        x1={scales.xScale(0)}
                        y1={scales.yScale(competitiveWage)}
                        x2={scales.xScale(competitiveQ)}
                        y2={scales.yScale(competitiveWage)}
                        className={`${dashedClass} [stroke:#0f766e] [stroke-width:4]`}
                      />
                      <circle
                        cx={scales.xScale(competitiveQ)}
                        cy={scales.yScale(competitiveWage)}
                        r="8"
                        fill="rgba(15,118,110,0.92)"
                        className={markerStrokeClass}
                      />
                      <text x={scales.xScale(competitiveQ)} y={scales.yScale(0) + 18} textAnchor="middle" className="fill-teal-700 text-[12px] font-semibold">
                        Q_c
                      </text>
                    </>
                  ) : null}
                </>
              ) : null}

              <text x={scales.xScale(7.8)} y={scales.yScale(supplyWage(7.8) + 1.2)} className={chartLabelClass}>
                S
              </text>
              <text x={scales.xScale(7.3)} y={scales.yScale(marginalFactorCost(7.3) + 1.2)} className={chartLabelClass}>
                MFC
              </text>
              {step !== "cost" ? (
                <text x={scales.xScale(7.8)} y={scales.yScale(mrpWithShock(7.8, productivityShock) - 1.6)} className={chartLabelClass}>
                  MRP
                </text>
              ) : null}
            </svg>
          </div>

          <div className={`mt-5 grid gap-3 ${step === "cost" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {metrics}
          </div>
        </section>
      </main>
    </div>
  );
}
