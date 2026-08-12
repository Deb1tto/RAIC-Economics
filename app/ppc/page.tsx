"use client";

import Link from "next/link";
import { useState, type PointerEvent, type ReactNode } from "react";

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
  rangeClass,
  surfaceClass,
} from "../../components/ui-classes";
import { ButtonGroup } from "../../components/button-group";

type LessonStep = "efficiency" | "cost" | "growth";
type CurveLaw = "increasing" | "constant";
type GrowthBias = "all" | "consumer" | "capital";
type MetricKey =
  | "efficiency-x"
  | "efficiency-y"
  | "efficiency-state"
  | "cost-dx"
  | "cost-dy"
  | "cost-moc"
  | "growth-xmax"
  | "growth-ymax";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "efficiency",
    title: "步骤一：边界与效率",
    summary: "先判断点在界内、界上还是界外分别意味着什么。",
    description:
      "PPC 代表在资源和技术既定时，社会能生产出的最大组合。曲线上的点是充分利用资源后的产出，曲线内是无效率或失业，曲线外则是当前稀缺条件下不可达的目标。",
  },
  {
    id: "cost",
    title: "步骤二：机会成本分析",
    summary: "让当前点沿曲线移动，直接看到得到 X 必须放弃 Y。",
    description:
      "沿着 PPC 移动代表资源重新分配。若资源专门化程度高，PPC 会向外凸出，边际机会成本递增；若资源完全可替代，PPC 则接近直线，机会成本保持不变。",
  },
  {
    id: "growth",
    title: "步骤三：经济增长",
    summary: "把注意力从曲线上的移动，切换到整条边界本身的外移或内缩。",
    description:
      "经济增长不是沿着原 PPC 走，而是让整条 PPC 向外推移。更多资源或技术进步会扩大生产潜能；若技术突破只偏向一种产品，则会出现非平行移动。",
  },
];

const baseline = {
  step: "efficiency" as LessonStep,
  efficiencyX: 42,
  utilizationRate: 100,
  curveLaw: "increasing" as CurveLaw,
  costPointA: 35,
  costPointB: 50,
  growthScale: 100,
  growthBias: "all" as GrowthBias,
};

const PPC_BASE = 100;
const PPC_VIEW_MAX = 160;
const COST_DELTA_X = 15;

function ppcY(
  law: CurveLaw,
  x: number,
  xIntercept: number = PPC_BASE,
  yIntercept: number = PPC_BASE,
): number {
  const safeX = clamp(x, 0, xIntercept);
  if (law === "constant") {
    return yIntercept * (1 - safeX / xIntercept);
  }

  return yIntercept * Math.sqrt(Math.max(0, 1 - (safeX / xIntercept) ** 2));
}

function ppcXAtY(
  law: CurveLaw,
  y: number,
  xIntercept: number = PPC_BASE,
  yIntercept: number = PPC_BASE,
): number {
  const safeY = clamp(y, 0, yIntercept);
  if (law === "constant") {
    return xIntercept * (1 - safeY / yIntercept);
  }

  return xIntercept * Math.sqrt(Math.max(0, 1 - (safeY / yIntercept) ** 2));
}

function buildCurvePoints(
  law: CurveLaw,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
  xIntercept: number = PPC_BASE,
  yIntercept: number = PPC_BASE,
): Point[] {
  const points: Point[] = [];
  const step = xIntercept / 50;
  for (let x = 0; x <= xIntercept; x += step) {
    points.push({ x: xScale(x), y: yScale(ppcY(law, x, xIntercept, yIntercept)) });
  }
  points.push({ x: xScale(xIntercept), y: yScale(0) });
  return points;
}

function buildInteriorArea(
  law: CurveLaw,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
  xIntercept: number = PPC_BASE,
  yIntercept: number = PPC_BASE,
): Point[] {
  const curve = buildCurvePoints(law, xScale, yScale, xIntercept, yIntercept);
  return [
    { x: xScale(0), y: yScale(0) },
    { x: xScale(xIntercept), y: yScale(0) },
    ...curve.toReversed(),
    { x: xScale(0), y: yScale(0) },
  ];
}

function buildGapArea(
  law: CurveLaw,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
  nextXIntercept: number,
  nextYIntercept: number,
): Point[] {
  const baseCurve = buildCurvePoints(law, xScale, yScale, PPC_BASE, PPC_BASE);
  const nextCurve = buildCurvePoints(law, xScale, yScale, nextXIntercept, nextYIntercept);
  return [...baseCurve, ...nextCurve.toReversed()];
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

export default function PpcPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [efficiencyX, setEfficiencyX] = useState<number>(baseline.efficiencyX);
  const [utilizationRate, setUtilizationRate] = useState<number>(baseline.utilizationRate);
  const [curveLaw, setCurveLaw] = useState<CurveLaw>(baseline.curveLaw);
  const [costPointA, setCostPointA] = useState<number>(baseline.costPointA);
  const costPointB = clamp(costPointA + COST_DELTA_X, 0, PPC_BASE);
  const [growthScale, setGrowthScale] = useState<number>(baseline.growthScale);
  const [growthBias, setGrowthBias] = useState<GrowthBias>(baseline.growthBias);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<boolean>(false);
  const [dragNotice, setDragNotice] = useState<string>("");

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const { xScale, yScale } = getChartScales({ xMax: PPC_VIEW_MAX, yMax: PPC_VIEW_MAX });

  const efficiencyFrontierY = ppcY("increasing", efficiencyX);
  const efficiencyPointY = (efficiencyFrontierY * utilizationRate) / 100;
  const efficiencyState =
    utilizationRate >= 100 ? "有效率 Productive Efficiency" : "无效率 / 资源未充分利用";
  const efficiencyInefficientX = ppcXAtY("increasing", efficiencyPointY);

  const pointAY = ppcY(curveLaw, costPointA);
  const pointBY = ppcY(curveLaw, costPointB);
  const deltaX = costPointB - costPointA;
  const deltaY = pointBY - pointAY;
  const sacrificedCapital = Math.max(0, pointAY - pointBY);
  const marginalOpportunityCost = deltaX === 0 ? 0 : Math.abs((pointAY - pointBY) / deltaX);

  const growthFactor = growthScale / 100;
  const nextXIntercept =
    growthBias === "capital" ? PPC_BASE : round(PPC_BASE * growthFactor, 2);
  const nextYIntercept =
    growthBias === "consumer" ? PPC_BASE : round(PPC_BASE * growthFactor, 2);
  const growthArea = buildGapArea("increasing", xScale, yScale, nextXIntercept, nextYIntercept);

  const chartTitle = activeStep.title;
  const chartSubtitle =
    step === "efficiency"
      ? "拖动利用率滑块或直接拖点，观察生产点与边界的关系。"
      : step === "cost"
        ? "切换曲线形状并移动目标点，观察消费品增加时资本品牺牲了多少。"
        : "保留基准 PPC，再改变资源或技术水平，观察整条边界如何整体移动。";

  const efficiencyCurve = buildCurvePoints("increasing", xScale, yScale);
  const efficiencyInterior = buildInteriorArea("increasing", xScale, yScale);
  const costCurve = buildCurvePoints(curveLaw, xScale, yScale);
  const baseGrowthCurve = buildCurvePoints("increasing", xScale, yScale);
  const nextGrowthCurve = buildCurvePoints(
    "increasing",
    xScale,
    yScale,
    nextXIntercept,
    nextYIntercept,
  );

  const growthArrows = [0.22, 0.4, 0.58, 0.76].map((ratio) => {
    const baseX = PPC_BASE * ratio;
    const nextX = nextXIntercept * ratio;
    return {
      x1: xScale(baseX),
      y1: yScale(ppcY("increasing", baseX, PPC_BASE, PPC_BASE)),
      x2: xScale(nextX),
      y2: yScale(ppcY("increasing", nextX, nextXIntercept, nextYIntercept)),
    };
  });

  const metrics =
    step === "efficiency" ? (
      <>
        <MetricCard
          metricKey="efficiency-x"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费品实际产量 Consumer Goods"
          value={round(efficiencyX, 1).toFixed(1)}
        />
        <MetricCard
          metricKey="efficiency-y"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="资本品实际产量 Capital Goods"
          value={round(efficiencyPointY, 1).toFixed(1)}
        />
        <MetricCard
          metricKey="efficiency-state"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前经济状态"
          value={efficiencyState}
          accentClassName={utilizationRate >= 100 ? "text-emerald-700" : "text-amber-700"}
        >
          <div className="mt-2">
            {statusPill(
              utilizationRate >= 100 ? "good" : "warn",
              utilizationRate >= 100 ? "充分就业 / 有效率" : "失业 / 无效率",
            )}
          </div>
        </MetricCard>
      </>
    ) : step === "cost" ? (
      <>
        <MetricCard
          metricKey="cost-dx"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="增加的消费品 +ΔX"
          value={`${deltaX >= 0 ? "+" : ""}${round(deltaX, 1).toFixed(1)}`}
          accentClassName={deltaX !== 0 ? "text-emerald-700" : ""}
        />
        <MetricCard
          metricKey="cost-dy"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="牺牲的资本品 -ΔY"
          value={`-${round(sacrificedCapital, 1).toFixed(1)}`}
          accentClassName={sacrificedCapital > 0 ? "text-rose-700" : ""}
        />
        <MetricCard
          metricKey="cost-moc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际机会成本 ΔY / ΔX"
          value={round(marginalOpportunityCost, 2).toFixed(2)}
        >
          <div className="mt-2">
            {statusPill(
              curveLaw === "increasing" ? "warn" : "neutral",
              curveLaw === "increasing" ? "递增机会成本" : "机会成本不变",
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="growth-xmax"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费品最大产能 X 截距"
          value={round(nextXIntercept, 1).toFixed(1) + "%"}
          accentClassName={nextXIntercept > PPC_BASE ? "text-emerald-700" : nextXIntercept < PPC_BASE ? "text-amber-700" : ""}
        />
        <MetricCard
          metricKey="growth-ymax"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="资本品最大产能 Y 截距"
          value={round(nextYIntercept, 1).toFixed(1) + "%"}
          accentClassName={nextYIntercept > PPC_BASE ? "text-emerald-700" : nextYIntercept < PPC_BASE ? "text-amber-700" : ""}
        />
      </>
    );

  function syncEfficiencyFromPointer(event: PointerEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * CHART.width;
    const relativeY = ((event.clientY - rect.top) / rect.height) * CHART.height;
    const plotWidth = CHART.width - CHART.margin.left - CHART.margin.right;
    const plotHeight = CHART.height - CHART.margin.top - CHART.margin.bottom;
    const rawX = ((relativeX - CHART.margin.left) / plotWidth) * PPC_VIEW_MAX;
    const rawY = ((CHART.height - CHART.margin.bottom - relativeY) / plotHeight) * PPC_VIEW_MAX;
    const nextX = clamp(rawX, 0, PPC_BASE);
    const frontier = ppcY("increasing", nextX);
    const floor = frontier * 0.5;
    const attemptedY = clamp(rawY, floor, PPC_VIEW_MAX);

    setEfficiencyX(round(nextX, 1));
    if (attemptedY > frontier) {
      setUtilizationRate(100);
      setDragNotice("资源稀缺，当前不可达");
      return;
    }

    const nextUtilization = frontier === 0 ? 100 : clamp((attemptedY / frontier) * 100, 50, 100);
    setUtilizationRate(round(nextUtilization, 0));
    setDragNotice("");
  }

  function syncCostFromPointer(event: PointerEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * CHART.width;
    const plotWidth = CHART.width - CHART.margin.left - CHART.margin.right;
    const rawX = ((relativeX - CHART.margin.left) / plotWidth) * PPC_VIEW_MAX;
    const nextA = clamp(rawX, 0, PPC_BASE - COST_DELTA_X);
    setCostPointA(round(nextA, 1));
  }

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
            Unit 1.3
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            生产可能性曲线与机会成本
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            用同一张 PPC 图把稀缺性、效率、权衡、机会成本与经济增长串成一个连续的教学过程。
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
                  setDragNotice("");
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
          {step === "efficiency" ? (
            <label className={labelStackClass}>
              <span className="font-bold">资源利用率</span>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={utilizationRate}
                onChange={(event) => setUtilizationRate(Number(event.target.value))}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{utilizationRate}%</strong>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                当利用率低于 100% 时，点会落入曲线内部；回到 100% 时，点重新吸附到边界上。你也可以直接拖拽图里的点。
              </p>
            </label>
          ) : step === "cost" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">成本法则（资源替代性）</span>
                <ButtonGroup<CurveLaw>
                  value={curveLaw}
                  onChange={(next) => {
                    setCurveLaw(next);
                    setCostPointA(baseline.costPointA);
                  }}
                  options={[
                { value: "increasing", label: "机会成本递增" },
                { value: "constant", label: "机会成本不变" },
              ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">消费品生产点 A</span>
                <input
                  type="range"
                  min="0"
                  max={PPC_BASE - COST_DELTA_X}
                  step="1"
                  value={costPointA}
                  onChange={(event) => {
                    setCostPointA(Number(event.target.value));
                  }}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">X的数量：{costPointA}</strong>
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  拖动 A 点，B 点将保持固定距离跟随，观察两者之间的机会成本。
                </p>
              </label>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">资源的数量和质量（技术）和原来的比例</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={growthScale}
                  onChange={(event) => setGrowthScale(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{growthScale}%</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">技术进步偏向</span>
                <ButtonGroup<GrowthBias>
                  value={growthBias}
                  onChange={(next) => setGrowthBias(next as GrowthBias)}
                  options={[
                { value: "all", label: "全面增长" },
                { value: "consumer", label: "仅消费品技术突破" },
                { value: "capital", label: "仅资本品技术突破" },
              ]}
                />
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  保留一条基准曲线 `PPC₁`，再根据增长方式生成新的 `PPC₂`。
                </p>
              </label>
            </>
          )}


        </aside>

        <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
          <div className="mb-4">
            <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {chartTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{chartSubtitle}</p>
          </div>

          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className={chartSvgClass}
            aria-label="Production possibilities curve chart"
            onPointerDown={(event) => {
              if (step !== "efficiency" && step !== "cost") return;
              setDraggingPoint(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              if (step === "efficiency") syncEfficiencyFromPointer(event);
              if (step === "cost") syncCostFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (!draggingPoint) return;
              if (step === "efficiency") syncEfficiencyFromPointer(event);
              if (step === "cost") syncCostFromPointer(event);
            }}
            onPointerUp={(event) => {
              if (!draggingPoint) return;
              setDraggingPoint(false);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerLeave={() => {
              setDraggingPoint(false);
            }}
          >
            <defs>
              <marker
                id="ppc-arrow-green"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2f8f68" />
              </marker>
              <marker
                id="ppc-arrow-red"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#c64861" />
              </marker>
              <marker
                id="ppc-arrow-neutral"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(31,42,55,0.55)" />
              </marker>
            </defs>

            <ChartFrame
              xMax={PPC_VIEW_MAX}
              yMax={PPC_VIEW_MAX}
              xLabel="消费品数量 (Consumer Goods, X)"
              yLabel="资本品数量 (Capital Goods, Y)"
            />

            {step === "efficiency" ? (
              <>
                <path d={areaPointsToPath(efficiencyInterior)} className="fill-[rgba(31,42,55,0.08)]" />
                <path d={linePointsToPath(efficiencyCurve)} className={`${curveClass} ${accentCurveClass}`} />
                <circle
                  cx={xScale(efficiencyX)}
                  cy={yScale(efficiencyPointY)}
                  r="8"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />
                <text x={xScale(efficiencyX) + 10} y={yScale(efficiencyPointY) - 12} className={chartSmallLabelClass}>
                  M
                </text>
                <text x={xScale(58)} y={yScale(ppcY("increasing", 58) + 8)} className={chartLabelClass}>
                  PPC
                </text>
                <text x={xScale(78)} y={yScale(113)} className={chartSmallLabelClass}>
                  Unattainable
                </text>
                <text x={xScale(18)} y={yScale(28)} className={chartSmallLabelClass}>
                  Inefficient / Unemployment
                </text>

                {hoveredMetric === "efficiency-x" || hoveredMetric === "efficiency-y" ? (
                  <>
                    <line
                      x1={xScale(efficiencyX)}
                      y1={yScale(0)}
                      x2={xScale(efficiencyX)}
                      y2={yScale(efficiencyPointY)}
                      className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
                    />
                    <line
                      x1={xScale(0)}
                      y1={yScale(efficiencyPointY)}
                      x2={xScale(efficiencyX)}
                      y2={yScale(efficiencyPointY)}
                      className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
                    />
                    <g transform={`translate(${xScale(efficiencyX)}, ${yScale(0) + 14})`}>
                      <rect x="-18" y="-10" width="36" height="18" rx="4" className="fill-[var(--accent)]" />
                      <text textAnchor="middle" y="3" className="fill-white text-[10px] font-bold">
                        {round(efficiencyX, 1).toFixed(1)}
                      </text>
                    </g>
                    <g transform={`translate(${xScale(0) - 14}, ${yScale(efficiencyPointY)})`}>
                      <rect x="-38" y="-9" width="38" height="18" rx="4" className="fill-[var(--accent)]" />
                      <text textAnchor="middle" x="-19" y="4" className="fill-white text-[10px] font-bold">
                        {round(efficiencyPointY, 1).toFixed(1)}
                      </text>
                    </g>
                  </>
                ) : null}

                {hoveredMetric === "efficiency-state" && utilizationRate < 100 ? (
                  <>
                    <line
                      x1={xScale(efficiencyX)}
                      y1={yScale(efficiencyPointY)}
                      x2={xScale(efficiencyX)}
                      y2={yScale(efficiencyFrontierY)}
                      className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
                    />
                    <line
                      x1={xScale(efficiencyX)}
                      y1={yScale(efficiencyPointY)}
                      x2={xScale(efficiencyInefficientX)}
                      y2={yScale(efficiencyPointY)}
                      className="[stroke:#c64861] [stroke-width:4] [stroke-dasharray:8_6]"
                    />
                  </>
                ) : null}

                {dragNotice ? (
                  <text
                    x={xScale(Math.min(efficiencyX + 10, 86))}
                    y={yScale(Math.min(efficiencyFrontierY + 18, 150))}
                    className="fill-[var(--accent)] text-[12px] font-semibold"
                  >
                    {dragNotice}
                  </text>
                ) : null}
              </>
            ) : step === "cost" ? (
              <>
                <path d={linePointsToPath(costCurve)} className={`${curveClass} ${accentCurveClass}`} />
                <circle
                  cx={xScale(costPointA)}
                  cy={yScale(pointAY)}
                  r="7"
                  className={`${markerStrokeClass} fill-[rgba(31,42,55,0.72)]`}
                />
                <circle
                  cx={xScale(costPointB)}
                  cy={yScale(pointBY)}
                  r="8"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />
                <text x={xScale(costPointA) - 12} y={yScale(pointAY) - 10} className={chartSmallLabelClass}>
                  A
                </text>
                <text x={xScale(costPointB) + 8} y={yScale(pointBY) - 10} className={chartSmallLabelClass}>
                  B
                </text>

                <line
                  x1={xScale(costPointA)}
                  y1={yScale(pointAY)}
                  x2={xScale(costPointB)}
                  y2={yScale(pointAY)}
                  className="[stroke:#2f8f68] [stroke-width:2]"
                  markerEnd="url(#ppc-arrow-green)"
                />
                <line
                  x1={xScale(costPointB)}
                  y1={yScale(pointAY)}
                  x2={xScale(costPointB)}
                  y2={yScale(pointBY)}
                  className="[stroke:#c64861] [stroke-width:2]"
                  markerEnd="url(#ppc-arrow-red)"
                />

                <text
                  x={(xScale(costPointA) + xScale(costPointB)) / 2}
                  y={yScale(pointAY) - 12}
                  textAnchor="middle"
                  className="fill-[#2f8f68] text-[12px] font-semibold"
                >
                  +ΔX
                </text>
                <text
                  x={xScale(costPointB) + 16}
                  y={(yScale(pointAY) + yScale(pointBY)) / 2}
                  className="fill-[#c64861] text-[12px] font-semibold"
                >
                  Opportunity Cost
                </text>

                {hoveredMetric === "cost-dx" ? (
                  <line
                    x1={xScale(costPointA)}
                    y1={yScale(pointAY)}
                    x2={xScale(costPointB)}
                    y2={yScale(pointAY)}
                    className="[stroke:#2f8f68] [stroke-width:6]"
                  />
                ) : null}

                {hoveredMetric === "cost-dy" || hoveredMetric === "cost-moc" ? (
                  <line
                    x1={xScale(costPointB)}
                    y1={yScale(pointAY)}
                    x2={xScale(costPointB)}
                    y2={yScale(pointBY)}
                    className="[stroke:#c64861] [stroke-width:6] [stroke-dasharray:8_6]"
                  />
                ) : null}
              </>
            ) : (
              <>
                {(hoveredMetric === "growth-xmax" || hoveredMetric === "growth-ymax") && growthScale !== 100 ? (
                  <path
                    d={areaPointsToPath(growthArea)}
                    className="fill-[rgba(76,183,171,0.16)]"
                  />
                ) : null}

                <path
                  d={linePointsToPath(baseGrowthCurve)}
                  className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.38)]`}
                />
                <path
                  d={linePointsToPath(nextGrowthCurve)}
                  className={`${curveClass} [stroke:#2f8f68]`}
                />
                <text x={xScale(56)} y={yScale(ppcY("increasing", 56) + 8)} className={chartSmallLabelClass}>
                  PPC₁
                </text>
                <text
                  x={xScale(Math.min(nextXIntercept * 0.64, 100))}
                  y={yScale(ppcY("increasing", Math.min(nextXIntercept * 0.64, nextXIntercept), nextXIntercept, nextYIntercept) + 8)}
                  className="fill-[#2f8f68] text-[12px] font-semibold"
                >
                  PPC₂
                </text>

                {growthArrows.map((arrow, index) => (
                  <line
                    key={index}
                    x1={arrow.x1}
                    y1={arrow.y1}
                    x2={arrow.x2}
                    y2={arrow.y2}
                    className="[stroke:rgba(31,42,55,0.36)] [stroke-width:1.5]"
                    markerEnd="url(#ppc-arrow-neutral)"
                  />
                ))}

                <text x={xScale(PPC_BASE)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                  X₁
                </text>
                <text x={xScale(0) - 10} y={yScale(PPC_BASE) + 4} textAnchor="end" className={chartSmallLabelClass}>
                  Y₁
                </text>
                <text x={xScale(nextXIntercept)} y={yScale(0) + 22} textAnchor="middle" className="fill-[#2f8f68] text-[12px] font-semibold">
                  X₂
                </text>
                <text x={xScale(0) - 10} y={yScale(nextYIntercept) + 4} textAnchor="end" className="fill-[#2f8f68] text-[12px] font-semibold">
                  Y₂
                </text>
              </>
            )}
          </svg>

          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
