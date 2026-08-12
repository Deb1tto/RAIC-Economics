"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChartFrame } from "../../../components/chart-frame";
import {
  CHART,
  areaPointsToPath,
  getChartScales,
  linePointsToPath,
  round,
  type Point,
} from "../../../components/chart-utils";
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
} from "../../../components/ui-classes";

type LessonStep = "total" | "marginal" | "consumer";
type MetricKey =
  | "total-tb"
  | "total-tc"
  | "total-net"
  | "marginal-mb"
  | "marginal-mc"
  | "marginal-advice"
  | "consumer-combo"
  | "consumer-x"
  | "consumer-y"
  | "consumer-tu";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "total",
    title: "步骤一：总量分析与净收益",
    summary: "先看总收益减总成本，找出净收益最大的行动量。",
    description:
      "理性的决策者不会只盯着总收益，而是比较总收益与总成本之间的差值。真正值得追求的是 Total Net Benefit，而不是把行动量无脑推到最大。",
  },
  {
    id: "marginal",
    title: "步骤二：边际分析与最优决策",
    summary: "再把总量问题改写成 MB 和 MC 的比较。",
    description:
      "只要边际收益大于边际成本，额外行动就还值得继续；一旦边际收益低于边际成本，再多做一单位就会拖累总净收益。最优停止点出现在 MB = MC 附近。",
  },
  {
    id: "consumer",
    title: "步骤三：消费者效用最大化",
    summary: "在固定预算里，把钱分给两种商品直到每元边际效用相等。",
    description:
      "消费者面临预算约束，不能把所有想买的东西都带走。效用最大化的关键不是平均开心，而是最后一元钱花在 X 和 Y 上带来的边际效用要相等。",
  },
];

const baseline = {
  step: "total" as LessonStep,
  decisionQuantity: 0,
  purchaseX: 0,
};

const MAX_Q = 10;
const BUDGET = 20;
const PRICE_X = 2;
const PRICE_Y = 4;
const MU_X = [0, 26, 22, 18, 14, 10, 6, 4, 2, 1, 0];
const MU_Y = [0, 44, 36, 28, 20, 12, 4];
const OPTIMAL_Q = 19 / 4.6;

function totalBenefit(q: number): number {
  return 22 * q - 1.5 * q * q;
}

function totalCost(q: number): number {
  return 3 * q + 0.8 * q * q;
}

function marginalBenefit(q: number): number {
  return 22 - 3 * q;
}

function marginalCost(q: number): number {
  return 3 + 1.6 * q;
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
  return points;
}

function areaUnderCurve(
  max: number,
  step: number,
  fn: (value: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const curve = buildCurve(max, step, fn, xScale, yScale);
  return [
    { x: xScale(0), y: yScale(0) },
    ...curve,
    { x: xScale(max), y: yScale(0) },
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

export default function MarginalPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [decisionQuantity, setDecisionQuantity] = useState<number>(baseline.decisionQuantity);
  const [purchaseX, setPurchaseX] = useState<number>(baseline.purchaseX);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const currentQ = decisionQuantity;
  const tb = totalBenefit(currentQ);
  const tc = totalCost(currentQ);
  const net = tb - tc;
  const mb = marginalBenefit(currentQ);
  const mc = marginalCost(currentQ);

  const advice =
    Math.abs(mb - mc) <= 0.6
      ? "最优状态 Optimal"
      : mb > mc
        ? "继续增加行动 Increase Q"
        : "减少行动 Decrease Q";

  const totalScales = getChartScales({ xMax: MAX_Q, yMax: 140 });
  const tbCurve = buildCurve(MAX_Q, 0.2, totalBenefit, totalScales.xScale, totalScales.yScale);
  const tcCurve = buildCurve(MAX_Q, 0.2, totalCost, totalScales.xScale, totalScales.yScale);
  const netPositive = Math.min(currentQ, OPTIMAL_Q);
  const positiveNetArea =
    netPositive > 0
      ? areaBetweenCurves(
          0,
          netPositive,
          0.2,
          totalBenefit,
          totalCost,
          totalScales.xScale,
          totalScales.yScale,
        )
      : null;
  const futureGainArea =
    advice === "继续增加行动 Increase Q"
      ? areaBetweenCurves(
          currentQ,
          OPTIMAL_Q,
          0.2,
          totalBenefit,
          totalCost,
          totalScales.xScale,
          totalScales.yScale,
        )
      : null;

  const marginalScales = getChartScales({ xMax: MAX_Q, yMax: 26 });
  const mbCurve = buildCurve(MAX_Q, 0.2, marginalBenefit, marginalScales.xScale, marginalScales.yScale);
  const mcCurve = buildCurve(MAX_Q, 0.2, marginalCost, marginalScales.xScale, marginalScales.yScale);
  const marginalGreenArea =
    netPositive > 0
      ? areaBetweenCurves(
          0,
          netPositive,
          0.2,
          marginalBenefit,
          marginalCost,
          marginalScales.xScale,
          marginalScales.yScale,
        )
      : null;
  const marginalLossArea =
    currentQ > OPTIMAL_Q
      ? areaBetweenCurves(
          OPTIMAL_Q,
          currentQ,
          0.2,
          marginalCost,
          marginalBenefit,
          marginalScales.xScale,
          marginalScales.yScale,
        )
      : null;

  const maxXUnits = BUDGET / PRICE_X;
  const quantityX = purchaseX;
  const quantityY = Math.floor((BUDGET - quantityX * PRICE_X) / PRICE_Y);
  const remainingBudget = BUDGET - quantityX * PRICE_X - quantityY * PRICE_Y;
  const muPerDollarX = (quantityX === 0 ? MU_X[1] : MU_X[quantityX]) / PRICE_X;
  const muPerDollarY = (quantityY === 0 ? MU_Y[1] : MU_Y[quantityY]) / PRICE_Y;
  const totalUtility =
    MU_X.slice(1, quantityX + 1).reduce((sum, value) => sum + value, 0) +
    MU_Y.slice(1, quantityY + 1).reduce((sum, value) => sum + value, 0);
  const utilityMaximized = Math.abs(muPerDollarX - muPerDollarY) < 0.01;
  const consumerYMax = Math.max(16, muPerDollarX, muPerDollarY) + 3;
  const consumerScales = getChartScales({ xMax: 4, yMax: consumerYMax });
  const xBarLeft = consumerScales.xScale(0.8);
  const xBarRight = consumerScales.xScale(1.7);
  const yBarLeft = consumerScales.xScale(2.3);
  const yBarRight = consumerScales.xScale(3.2);
  const xBarTop = consumerScales.yScale(muPerDollarX);
  const yBarTop = consumerScales.yScale(muPerDollarY);

  const metrics =
    step === "total" ? (
      <>
        <MetricCard
          metricKey="total-tb"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总收益 Total Benefit"
          value={round(tb, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="total-tc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总成本 Total Cost"
          value={round(tc, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="total-net"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总净收益 Net Benefit"
          value={round(net, 2).toFixed(2)}
          accentClassName={net >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
      </>
    ) : step === "marginal" ? (
      <>
        <MetricCard
          metricKey="marginal-mb"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际收益 MB"
          value={round(mb, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="marginal-mc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="边际成本 MC"
          value={round(mc, 2).toFixed(2)}
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="marginal-advice"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="决策建议 Decision Advice"
          value={advice}
          accentClassName={
            advice === "最优状态 Optimal"
              ? "text-emerald-700"
              : advice.startsWith("继续")
                ? "text-sky-700"
                : "text-rose-700"
          }
        >
          <div className="mt-2">
            {statusPill(
              advice === "最优状态 Optimal"
                ? "good"
                : advice.startsWith("继续")
                  ? "neutral"
                  : "warn",
              advice === "最优状态 Optimal"
                ? "达到最优"
                : advice.startsWith("继续")
                  ? "还有净收益可赚"
                  : "边际亏损",
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="consumer-combo"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前购买组合"
          value={`${quantityX} 个 X，${quantityY} 个 Y`}
        >
          <div className="mt-2">
            {statusPill(remainingBudget === 0 ? "good" : "neutral", `剩余预算 ${remainingBudget}`)}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="consumer-x"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="商品 X 的每元边际效用 MUx / Px"
          value={round(muPerDollarX, 2).toFixed(2)}
          accentClassName={muPerDollarX > muPerDollarY ? "text-emerald-700" : ""}
        />
        <MetricCard
          metricKey="consumer-y"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="商品 Y 的每元边际效用 MUy / Py"
          value={round(muPerDollarY, 2).toFixed(2)}
          accentClassName={muPerDollarY > muPerDollarX ? "text-emerald-700" : ""}
        />
        <MetricCard
          metricKey="consumer-tu"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="获得的总效用 Total Utility"
          value={round(totalUtility, 0).toFixed(0)}
          accentClassName={utilityMaximized ? "text-emerald-700" : ""}
        >
          <div className="mt-2">
            {statusPill(
              utilityMaximized ? "good" : "warn",
              utilityMaximized ? "Utility Maximized!" : "尚未达到效用最大化",
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
          href="/micro"
          className="inline-flex h-fit items-center rounded-full bg-[rgba(31,42,55,0.06)] px-4 py-3 text-sm font-semibold text-inherit no-underline transition hover:bg-[rgba(31,42,55,0.1)]"
        >
          ← 返回主页
        </Link>
        <div className="min-w-0">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Unit 1.5 / 1.6
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            边际分析与消费者选择
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            先看总量净收益，再把决策还原成 MB 与 MC 的比较，最后落到预算约束下的两商品消费者选择。
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
          {step === "consumer" ? (
            <label className={labelStackClass}>
              <span className="font-bold">商品 X 购买量</span>
              <input
                type="range"
                min="0"
                max={maxXUnits}
                step="1"
                value={purchaseX}
                onChange={(event) => setPurchaseX(Number(event.target.value))}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{purchaseX}</strong>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                预算固定为 {BUDGET} 元，系统会自动用剩余预算尽可能购买商品 Y。当前单价：X = {PRICE_X}，Y = {PRICE_Y}。
              </p>
            </label>
          ) : (
            <label className={labelStackClass}>
              <span className="font-bold">行动数量 Quantity</span>
              <input
                type="range"
                min="0"
                max={MAX_Q}
                step="0.1"
                value={decisionQuantity}
                onChange={(event) => setDecisionQuantity(Number(event.target.value))}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{round(decisionQuantity, 1).toFixed(1)}</strong>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                这个滑块会同时对应总量图和边际图。你可以对照看同一数量下，总净收益与 MB/MC 关系是如何彼此映射的。
              </p>
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "consumer") {
                setPurchaseX(baseline.purchaseX);
              } else {
                setDecisionQuantity(baseline.decisionQuantity);
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
              {step === "total"
                ? "总收益与总成本曲线"
                : step === "marginal"
                  ? "边际收益与边际成本曲线"
                  : "每元边际效用比价法则 (Bang for the Buck)"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {step === "total"
                ? "拖动数量滑块，观察 TB 与 TC 之间的垂直距离何时达到最大。"
                : step === "marginal"
                  ? "把同一个决策问题换成 MB 与 MC 的图形语言，并找到最优停止点。"
                  : "调整 X 的购买量，让花在两种商品上的最后一元钱带来的边际效用相等。"}
            </p>
          </div>

          {step === "consumer" ? (
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className={chartSvgClass}
              aria-label="Marginal utility per dollar bar chart"
            >
              <line
                x1={CHART.margin.left}
                y1={CHART.height - CHART.margin.bottom}
                x2={CHART.width - CHART.margin.right}
                y2={CHART.height - CHART.margin.bottom}
                className="[stroke:rgba(31,42,55,0.6)] [stroke-width:2]"
              />
              <line
                x1={CHART.margin.left}
                y1={CHART.height - CHART.margin.bottom}
                x2={CHART.margin.left}
                y2={CHART.margin.top}
                className="[stroke:rgba(31,42,55,0.6)] [stroke-width:2]"
              />

              <rect
                x={xBarLeft}
                y={xBarTop}
                width={xBarRight - xBarLeft}
                height={consumerScales.yScale(0) - xBarTop}
                className="fill-[rgba(191,91,44,0.2)] stroke-[var(--accent)] [stroke-width:2]"
              />
              <rect
                x={yBarLeft}
                y={yBarTop}
                width={yBarRight - yBarLeft}
                height={consumerScales.yScale(0) - yBarTop}
                className="fill-[rgba(76,183,171,0.22)] stroke-[var(--accent-2)] [stroke-width:2]"
              />

              <text x={(xBarLeft + xBarRight) / 2} y={CHART.height - CHART.margin.bottom + 24} textAnchor="middle" className={chartLabelClass}>
                商品 X
              </text>
              <text x={(yBarLeft + yBarRight) / 2} y={CHART.height - CHART.margin.bottom + 24} textAnchor="middle" className={chartLabelClass}>
                商品 Y
              </text>
              <text x={24} y={CHART.margin.top + 120} textAnchor="middle" transform={`rotate(-90 24 ${CHART.margin.top + 120})`} className={chartLabelClass}>
                每元边际效用 MU / P
              </text>

              <text x={(xBarLeft + xBarRight) / 2} y={xBarTop - 12} textAnchor="middle" className={chartSmallLabelClass}>
                {round(muPerDollarX, 2)}
              </text>
              <text x={(yBarLeft + yBarRight) / 2} y={yBarTop - 12} textAnchor="middle" className={chartSmallLabelClass}>
                {round(muPerDollarY, 2)}
              </text>

              {utilityMaximized ? (
                <g>
                  <rect
                    x={CHART.margin.left + 40}
                    y={CHART.margin.top + 6}
                    width={CHART.width - CHART.margin.left - CHART.margin.right - 80}
                    height="42"
                    rx="20"
                    className="fill-[rgba(76,183,171,0.18)] stroke-[rgba(76,183,171,0.45)] [stroke-width:2]"
                  />
                  <text
                    x={CHART.width / 2}
                    y={CHART.margin.top + 33}
                    textAnchor="middle"
                    className="fill-[var(--accent-2)] text-[15px] font-bold"
                  >
                    Utility Maximized!
                  </text>
                </g>
              ) : null}

              {hoveredMetric === "consumer-x" && muPerDollarX > muPerDollarY ? (
                <>
                  <line
                    x1={(xBarLeft + xBarRight) / 2}
                    y1={xBarTop - 36}
                    x2={(xBarLeft + xBarRight) / 2}
                    y2={xBarTop - 8}
                    className="[stroke:#2f8f68] [stroke-width:4]"
                  />
                  <text x={(xBarLeft + xBarRight) / 2} y={xBarTop - 44} textAnchor="middle" className="fill-[#2f8f68] text-[13px] font-semibold">
                    Buy More X!
                  </text>
                </>
              ) : null}

              {hoveredMetric === "consumer-y" && muPerDollarY > muPerDollarX ? (
                <>
                  <line
                    x1={(yBarLeft + yBarRight) / 2}
                    y1={yBarTop - 36}
                    x2={(yBarLeft + yBarRight) / 2}
                    y2={yBarTop - 8}
                    className="[stroke:#2f8f68] [stroke-width:4]"
                  />
                  <text x={(yBarLeft + yBarRight) / 2} y={yBarTop - 44} textAnchor="middle" className="fill-[#2f8f68] text-[13px] font-semibold">
                    Buy More Y!
                  </text>
                </>
              ) : null}
            </svg>
          ) : (
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className={chartSvgClass}
              aria-label="Marginal analysis chart"
            >
              <ChartFrame
                xMax={MAX_Q}
                yMax={step === "total" ? 140 : 26}
                xLabel="行动数量 (Quantity)"
                yLabel={step === "total" ? "总价值 (Total Value)" : "边际价值 (Marginal Value)"}
              />

              {step === "total" ? (
                <>
                  {positiveNetArea ? (
                    <path d={areaPointsToPath(positiveNetArea)} className="fill-[rgba(76,183,171,0.16)]" />
                  ) : null}
                  <path d={linePointsToPath(tbCurve)} className={`${curveClass} [stroke:#3c82d6]`} />
                  <path d={linePointsToPath(tcCurve)} className={`${curveClass} [stroke:#c64861]`} />
                  <line
                    x1={totalScales.xScale(currentQ)}
                    y1={totalScales.yScale(0)}
                    x2={totalScales.xScale(currentQ)}
                    y2={totalScales.yScale(Math.max(tb, tc))}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <line
                    x1={totalScales.xScale(currentQ)}
                    y1={totalScales.yScale(tc)}
                    x2={totalScales.xScale(currentQ)}
                    y2={totalScales.yScale(tb)}
                    className={`${net >= 0 ? "[stroke:#2f8f68]" : "[stroke:#c64861]"} [stroke-width:6]`}
                  />
                  <circle
                    cx={totalScales.xScale(currentQ)}
                    cy={totalScales.yScale(tb)}
                    r="7"
                    className={`${markerStrokeClass} fill-[#3c82d6]`}
                  />
                  <circle
                    cx={totalScales.xScale(currentQ)}
                    cy={totalScales.yScale(tc)}
                    r="7"
                    className={`${markerStrokeClass} fill-[#c64861]`}
                  />
                  <text x={totalScales.xScale(6.7)} y={totalScales.yScale(totalBenefit(6.7) + 10)} className={chartLabelClass}>
                    TB
                  </text>
                  <text x={totalScales.xScale(6.8)} y={totalScales.yScale(totalCost(6.8) - 8)} className={chartLabelClass}>
                    TC
                  </text>

                  {futureGainArea && hoveredMetric === "marginal-advice" ? (
                    <path d={areaPointsToPath(futureGainArea)} className="fill-[rgba(76,183,171,0.28)]" />
                  ) : null}

                  {hoveredMetric === "total-net" ? (
                    <line
                      x1={totalScales.xScale(currentQ)}
                      y1={totalScales.yScale(tc)}
                      x2={totalScales.xScale(currentQ)}
                      y2={totalScales.yScale(tb)}
                      className="[stroke:var(--accent)] [stroke-width:8] [stroke-dasharray:8_6]"
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {marginalGreenArea ? (
                    <path d={areaPointsToPath(marginalGreenArea)} className="fill-[rgba(76,183,171,0.18)]" />
                  ) : null}
                  {marginalLossArea ? (
                    <path d={areaPointsToPath(marginalLossArea)} className="fill-[rgba(198,72,97,0.22)]" />
                  ) : null}
                  <path d={linePointsToPath(mbCurve)} className={`${curveClass} [stroke:#3c82d6]`} />
                  <path d={linePointsToPath(mcCurve)} className={`${curveClass} [stroke:#c64861]`} />
                  <line
                    x1={marginalScales.xScale(currentQ)}
                    y1={marginalScales.yScale(0)}
                    x2={marginalScales.xScale(currentQ)}
                    y2={marginalScales.yScale(Math.max(mb, mc))}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={marginalScales.xScale(currentQ)}
                    cy={marginalScales.yScale(mb)}
                    r="7"
                    className={`${markerStrokeClass} fill-[#3c82d6]`}
                  />
                  <circle
                    cx={marginalScales.xScale(currentQ)}
                    cy={marginalScales.yScale(mc)}
                    r="7"
                    className={`${markerStrokeClass} fill-[#c64861]`}
                  />
                  <text x={marginalScales.xScale(1.5)} y={marginalScales.yScale(marginalBenefit(1.5) + 2)} className={chartLabelClass}>
                    MB
                  </text>
                  <text x={marginalScales.xScale(6.5)} y={marginalScales.yScale(marginalCost(6.5) - 2)} className={chartLabelClass}>
                    MC
                  </text>
                  <line
                    x1={marginalScales.xScale(OPTIMAL_Q)}
                    y1={marginalScales.yScale(0)}
                    x2={marginalScales.xScale(OPTIMAL_Q)}
                    y2={marginalScales.yScale(marginalBenefit(OPTIMAL_Q))}
                    className="[stroke:var(--accent)] [stroke-width:3] [stroke-dasharray:8_6]"
                  />

                  {advice.startsWith("继续") ? (
                    <text x={marginalScales.xScale(currentQ + 0.8)} y={marginalScales.yScale(Math.max(mb, mc) + 2)} className="fill-[#2f8f68] text-[14px] font-semibold">
                      Continue +
                    </text>
                  ) : null}
                  {advice === "最优状态 Optimal" ? (
                    <circle
                      cx={marginalScales.xScale(OPTIMAL_Q)}
                      cy={marginalScales.yScale(marginalBenefit(OPTIMAL_Q))}
                      r="12"
                      className="fill-[rgba(76,183,171,0.18)] stroke-[var(--accent-2)] [stroke-width:3]"
                    />
                  ) : null}
                  {advice.startsWith("减少") ? (
                    <text x={marginalScales.xScale(currentQ - 1.6)} y={marginalScales.yScale(Math.max(mb, mc) + 2)} className="fill-[#c64861] text-[14px] font-semibold">
                      Loss!
                    </text>
                  ) : null}

                  {hoveredMetric === "marginal-advice" && advice.startsWith("继续") && futureGainArea ? (
                    <path d={areaPointsToPath(futureGainArea)} className="fill-[rgba(76,183,171,0.34)]" />
                  ) : null}
                </>
              )}
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
