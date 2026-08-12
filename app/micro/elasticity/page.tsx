"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";

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
  demandCurveClass,
  gridLineClass,
  inputClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
  supplyCurveClass,
} from "../../../components/ui-classes";

type LessonStep = "ped" | "determinants" | "pes";
type SubstituteMode = "none" | "some" | "many";
type TimeMode = "immediate" | "short" | "long";
type MetricKey =
  | "ped-pct-p"
  | "ped-pct-q"
  | "ped-coef"
  | "ped-tr"
  | "det-loss"
  | "det-tr"
  | "pes-coef"
  | "pes-delta";

interface Factor {
  id: string;
  text: string;
  correctCategory: "large" | "small";
}

const PED_FACTORS: Factor[] = [
  { id: "p1", text: "替代品丰富", correctCategory: "large" },
  { id: "p2", text: "替代品匮乏", correctCategory: "small" },
  { id: "p3", text: "奢侈品", correctCategory: "large" },
  { id: "p4", text: "必需品", correctCategory: "small" },
  { id: "p5", text: "支出占收入比重大", correctCategory: "large" },
  { id: "p6", text: "支出占收入比重小", correctCategory: "small" },
  { id: "p7", text: "时间跨度长", correctCategory: "large" },
  { id: "p8", text: "时间跨度短", correctCategory: "small" },
];

const PES_FACTORS: Factor[] = [
  { id: "s1", text: "生产调整时间充足", correctCategory: "large" },
  { id: "s2", text: "生产调整时间仓促", correctCategory: "small" },
  { id: "s3", text: "产能拥有大量富余", correctCategory: "large" },
  { id: "s4", text: "生产达到产能极限", correctCategory: "small" },
  { id: "s5", text: "投入要素流转容易", correctCategory: "large" },
  { id: "s6", text: "投入要素流转困难", correctCategory: "small" },
  { id: "s7", text: "产品易于长期储存", correctCategory: "large" },
  { id: "s8", text: "产品极易腐烂变质", correctCategory: "small" },
];

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "ped",
    title: "步骤一：需求弹性与总收益",
    summary: "沿线性需求曲线滑动，看弹性与总收益矩形如何一起变化。",
    description:
      "在线性需求曲线上，斜率不变，但弹性会从上端的富有弹性一路下降到下端的缺乏弹性。总收益矩形会先变大、在中点达到最大、再变小。",
  },
  {
    id: "determinants",
    title: "步骤二：需求弹性的影响因素",
    summary: "识别哪些因素让需求变得更富有弹性或缺乏弹性。",
    description:
      "PED 的大小取决于消费者寻找替代品的难易程度。请将下列因素放入正确的分类中，观察它们如何影响需求的价格弹性。",
  },
  {
    id: "pes",
    title: "步骤三：供给弹性的影响因素",
    summary: "识别哪些因素让供给变得更富有弹性或缺乏弹性。",
    description:
      "PES 的大小取决于生产者调整产量和规模的灵活性。请将下列因素放入正确的分类中，观察它们如何影响供给的价格弹性。",
  },
];

const baseline = {
  step: "ped" as LessonStep,
  pedPrice: 80,
  pedPrevPrice: 80,
  substituteMode: "some" as SubstituteMode,
  trialPriceIncrease: 0,
  timeMode: "short" as TimeMode,
  pesPrice: 50,
};

const AXIS_MAX = 100;
const BASE_PRICE = 50;
const BASE_Q = 50;

function demandLinePoints(
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  return [
    { x: xScale(0), y: yScale(100) },
    { x: xScale(100), y: yScale(0) },
  ];
}

function qFromDemandPrice(price: number): number {
  return 100 - price;
}

function midpointPercentChange(newValue: number, oldValue: number): number {
  const midpoint = (newValue + oldValue) / 2;
  if (midpoint === 0) return 0;
  return ((newValue - oldValue) / midpoint) * 100;
}

function trFor(price: number, quantity: number): number {
  return price * quantity;
}

function determinantResponse(mode: SubstituteMode): number {
  if (mode === "none") return 0.35;
  if (mode === "some") return 1;
  return 2.4;
}

function rotatedDemandPoint(price: number, mode: SubstituteMode): number {
  const response = determinantResponse(mode);
  const quantity = BASE_Q + response * (BASE_PRICE - price);
  return Math.max(0, Math.min(100, quantity));
}

function determinantCurvePoints(
  mode: SubstituteMode,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const points: Point[] = [];
  for (let price = 0; price <= 100; price += 2) {
    points.push({ x: xScale(rotatedDemandPoint(price, mode)), y: yScale(price) });
  }
  return points;
}

function supplyResponse(mode: TimeMode): number {
  if (mode === "immediate") return 0;
  if (mode === "short") return 1;
  return 2.2;
}

function qFromSupplyPrice(price: number, mode: TimeMode): number {
  return BASE_Q + supplyResponse(mode) * (price - BASE_PRICE);
}

function supplyCurvePoints(
  mode: TimeMode,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const response = supplyResponse(mode);
  if (response === 0) {
    return [
      { x: xScale(BASE_Q), y: yScale(0) },
      { x: xScale(BASE_Q), y: yScale(100) },
    ];
  }

  const points: Point[] = [];
  for (let price = 0; price <= 100; price += 2) {
    const q = Math.max(0, Math.min(100, qFromSupplyPrice(price, mode)));
    points.push({ x: xScale(q), y: yScale(price) });
  }
  return points;
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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

export default function ElasticityPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [pedPrice, setPedPrice] = useState<number>(baseline.pedPrice);
  const [pedPrevPrice, setPedPrevPrice] = useState<number>(baseline.pedPrevPrice);
  const [substituteMode, setSubstituteMode] = useState<SubstituteMode>(baseline.substituteMode);
  const [trialPriceIncrease, setTrialPriceIncrease] = useState<number>(baseline.trialPriceIncrease);
  const [timeMode, setTimeMode] = useState<TimeMode>(baseline.timeMode);
  const [pesPrice, setPesPrice] = useState<number>(baseline.pesPrice);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [pedAssignments, setPedAssignments] = useState<Record<string, "large" | "small">>({});
  const [pesAssignments, setPesAssignments] = useState<Record<string, "large" | "small">>({});
  const [displayFactors, setDisplayFactors] = useState<Factor[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (step === "determinants") {
      setDisplayFactors([...PED_FACTORS]);
    } else if (step === "pes") {
      setDisplayFactors([...PES_FACTORS]);
    }
    setFeedback(null);
  }, [step]);

  const handleShuffle = () => {
    setFeedback(null);
    setDisplayFactors((prev) => shuffle(prev));
  };

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const { xScale, yScale } = getChartScales({ xMax: AXIS_MAX, yMax: AXIS_MAX });

  const pedQ = qFromDemandPrice(pedPrice);
  const pedTR = trFor(pedPrice, pedQ);
  const pedElasticity = pedQ === 0 ? 99 : pedPrice / pedQ;
  const pctDeltaP = midpointPercentChange(pedPrice, pedPrevPrice);
  const pctDeltaQ = midpointPercentChange(pedQ, qFromDemandPrice(pedPrevPrice));
  const midpointQ = 50;
  const midpointP = 50;

  const determinantNewPrice = BASE_PRICE + trialPriceIncrease;
  const determinantBaseQ = BASE_Q;
  const determinantNewQ = rotatedDemandPoint(determinantNewPrice, substituteMode);
  const determinantPercentLoss = midpointPercentChange(determinantNewQ, determinantBaseQ);
  const determinantBaseTR = trFor(BASE_PRICE, determinantBaseQ);
  const determinantNewTR = trFor(determinantNewPrice, determinantNewQ);
  const determinantRevenueLoss = determinantBaseTR - determinantNewTR;

  const pesCurrentQ = Math.max(0, Math.min(100, qFromSupplyPrice(pesPrice, timeMode)));
  const pesDeltaQ = round(pesCurrentQ - BASE_Q, 2);
  const pesElasticity =
    timeMode === "immediate" || pesCurrentQ === 0 ? 0 : supplyResponse(timeMode) * (pesPrice / pesCurrentQ);

  const handleAssign = (factorId: string, category: "large" | "small") => {
    const factors = step === "determinants" ? PED_FACTORS : PES_FACTORS;
    const factor = factors.find((f) => f.id === factorId);

    if (factor && factor.correctCategory !== category) {
      setFeedback(`“${factor.text}”放置位置不对哦，请再思考一下！`);
      return;
    }

    setFeedback(null);
    if (step === "determinants") {
      setPedAssignments((prev) => ({ ...prev, [factorId]: category }));
    } else {
      setPesAssignments((prev) => ({ ...prev, [factorId]: category }));
    }
  };

  const handleRemove = (factorId: string) => {
    setFeedback(null);
    if (step === "determinants") {
      setPedAssignments((prev) => {
        const next = { ...prev };
        delete next[factorId];
        return next;
      });
    } else {
      setPesAssignments((prev) => {
        const next = { ...prev };
        delete next[factorId];
        return next;
      });
    }
  };

  const currentFactors = displayFactors;
  const currentAssignments = step === "determinants" ? pedAssignments : pesAssignments;

  const metrics =
    step === "ped" ? (
      <>
        <MetricCard
          metricKey="ped-pct-p"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="价格变动百分比 %ΔP"
          value={`${pctDeltaP >= 0 ? "+" : ""}${round(pctDeltaP, 2).toFixed(2)}%`}
        />
        <MetricCard
          metricKey="ped-pct-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求量变动百分比 %ΔQd"
          value={`${pctDeltaQ >= 0 ? "+" : ""}${round(pctDeltaQ, 2).toFixed(2)}%`}
        />
        <MetricCard
          metricKey="ped-coef"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求价格弹性系数 PED"
          value={round(Math.abs(pedElasticity), 2).toFixed(2)}
          accentClassName={
            pedElasticity > 1 ? "text-sky-700" : pedElasticity < 1 ? "text-rose-700" : "text-emerald-700"
          }
        >
          <div className="mt-2">
            {statusPill(
              pedElasticity > 1 ? "neutral" : pedElasticity < 1 ? "warn" : "good",
              pedElasticity > 1 ? "富有弹性" : pedElasticity < 1 ? "缺乏弹性" : "单位弹性",
            )}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="ped-tr"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前总收益 TR"
          value={round(pedTR, 0).toFixed(0)}
          accentClassName="text-emerald-700"
        />
      </>
    ) : step === "determinants" ? (
      <>
        <MetricCard
          metricKey="det-loss"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="销量损失比率 %ΔQd"
          value={`${round(determinantPercentLoss, 2).toFixed(2)}%`}
          accentClassName={Math.abs(determinantPercentLoss) > 20 ? "text-rose-700" : ""}
        />
        <MetricCard
          metricKey="det-tr"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="预估总收益流失量"
          value={`${determinantRevenueLoss >= 0 ? "+" : ""}${round(determinantRevenueLoss, 0).toFixed(0)}`}
          accentClassName={determinantRevenueLoss >= 0 ? "text-rose-700" : "text-emerald-700"}
        >
          <div className="mt-2">
            {statusPill(
              determinantRevenueLoss >= 0 ? "warn" : "good",
              determinantRevenueLoss >= 0 ? "涨价伤害收入" : "涨价反而增加收入",
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="pes-coef"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="供给价格弹性系数 PES"
          value={round(pesElasticity, 2).toFixed(2)}
          accentClassName={pesElasticity > 1 ? "text-emerald-700" : ""}
        >
          <div className="mt-2">
            {statusPill(
              timeMode === "immediate" ? "warn" : pesElasticity > 1 ? "good" : "neutral",
              timeMode === "immediate" ? "极短期完全无弹性" : pesElasticity > 1 ? "长期高弹性" : "短期反应有限",
            )}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="pes-delta"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="供给响应量 ΔQs"
          value={`${pesDeltaQ >= 0 ? "+" : ""}${round(pesDeltaQ, 2).toFixed(2)}`}
        />
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
            Unit 2.3 / 2.4
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            价格弹性：需求与供给
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从线性需求曲线上的 PED 与总收益测试出发，再看真实世界里替代品和时间如何改变需求与供给的弹性。
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
          {step === "ped" ? (
            <label className={labelStackClass}>
              <span className="font-bold">商品价格 Price</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pedPrice}
                onChange={(event) => {
                  setPedPrevPrice(pedPrice);
                  setPedPrice(Number(event.target.value));
                }}
                className={rangeClass}
              />
              <strong className="text-[var(--accent)]">{pedPrice}</strong>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                当前点会沿着同一条线性需求曲线滑动。总收益矩形会先扩大，在中点达到最大，再随着继续降价而缩小。
              </p>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-[rgba(191,91,44,0.05)] p-4 text-sm leading-6 text-[var(--accent)]">
                <h4 className="mb-1 font-bold">交互说明：</h4>
                请从右侧的因素池中点击对应的分类按钮（大 / 小），将影响因素放入表格。
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              setFeedback(null);
              if (step === "ped") {
                setPedPrice(baseline.pedPrice);
                setPedPrevPrice(baseline.pedPrevPrice);
              } else if (step === "determinants") {
                setPedAssignments({});
                setDisplayFactors([...PED_FACTORS]);
              } else {
                setPesAssignments({});
                setDisplayFactors([...PES_FACTORS]);
              }
            }}
            className={primaryButtonClass}
          >
            重置当前步骤
          </button>
        </aside>

        <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
          {step === "ped" ? (
            <>
              <div className="mb-4">
                <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                  线性需求曲线上的弹性演变
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  拖动价格滑块，观察 PED 与总收益矩形面积如何一起变化。
                </p>
              </div>

              <svg
                viewBox={`0 0 ${CHART.width} ${CHART.height}`}
                className={chartSvgClass}
                aria-label="Elasticity chart"
              >
                <ChartFrame
                  xMax={AXIS_MAX}
                  yMax={AXIS_MAX}
                  xLabel="需求量 (Quantity, Qd)"
                  yLabel="价格 (Price, P)"
                />

                <>
                  <path
                    d={linePointsToPath(demandLinePoints(xScale, yScale))}
                    className={`${curveClass} ${demandCurveClass}`}
                  />
                  <rect
                    x={xScale(0)}
                    y={yScale(pedPrice)}
                    width={xScale(pedQ) - xScale(0)}
                    height={yScale(0) - yScale(pedPrice)}
                    className={`${
                      hoveredMetric === "ped-tr"
                        ? "fill-[rgba(76,183,171,0.32)]"
                        : "fill-[rgba(76,183,171,0.16)]"
                    }`}
                  />
                  <circle
                    cx={xScale(pedQ)}
                    cy={yScale(pedPrice)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text x={xScale(pedQ) + 8} y={yScale(pedPrice) - 10} className={chartSmallLabelClass}>
                    M
                  </text>
                  <line
                    x1={xScale(midpointQ)}
                    y1={yScale(0)}
                    x2={xScale(midpointQ)}
                    y2={yScale(midpointP)}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <line
                    x1={xScale(0)}
                    y1={yScale(midpointP)}
                    x2={xScale(midpointQ)}
                    y2={yScale(midpointP)}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <text x={xScale(midpointQ) + 8} y={yScale(midpointP) - 10} className={chartSmallLabelClass}>
                    PED = 1
                  </text>
                  <text
                    x={xScale(pedQ / 2)}
                    y={yScale(pedPrice / 2)}
                    textAnchor="middle"
                    className="fill-[var(--accent-2)] text-[16px] font-bold"
                  >
                    TR = {round(pedTR, 0)}
                  </text>

                  {hoveredMetric === "ped-coef" ? (
                    <>
                      <line
                        x1={xScale(qFromDemandPrice(pedPrevPrice))}
                        y1={yScale(0)}
                        x2={xScale(pedQ)}
                        y2={yScale(0)}
                        className="[stroke:#2f8f68] [stroke-width:5]"
                      />
                      <line
                        x1={xScale(0)}
                        y1={yScale(pedPrevPrice)}
                        x2={xScale(0)}
                        y2={yScale(pedPrice)}
                        className="[stroke:#c64861] [stroke-width:5]"
                      />
                    </>
                  ) : null}
                </>
              </svg>

              <div className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="mb-2">
                <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                  {step === "determinants" ? "需求弹性影响因素分类" : "供给弹性影响因素分类"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  请识别哪些情况会导致更富有弹性（大）或更缺乏弹性（小）。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/30 p-5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const factorId = e.dataTransfer.getData("factorId");
                    if (factorId) handleAssign(factorId, "large");
                  }}
                >
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-sky-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[10px] text-white">
                      ↑
                    </span>
                    {step === "determinants" ? "PED 大" : "PES 大"} (Elastic)
                  </h3>
                  <div className="flex min-h-[120px] flex-wrap gap-2 content-start">
                    {currentFactors
                      .filter((f) => currentAssignments[f.id] === "large")
                      .map((f) => (
                        <div
                          key={f.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("factorId", f.id)}
                          className="group relative cursor-grab active:cursor-grabbing rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm"
                        >
                          {f.text}
                          <button
                            onClick={() => handleRemove(f.id)}
                            className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm group-hover:flex"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/30 p-5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const factorId = e.dataTransfer.getData("factorId");
                    if (factorId) handleAssign(factorId, "small");
                  }}
                >
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-rose-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-[10px] text-white">
                      ↓
                    </span>
                    {step === "determinants" ? "PED 小" : "PES 小"} (Inelastic)
                  </h3>
                  <div className="flex min-h-[120px] flex-wrap gap-2 content-start">
                    {currentFactors
                      .filter((f) => currentAssignments[f.id] === "small")
                      .map((f) => (
                        <div
                          key={f.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("factorId", f.id)}
                          className="group relative cursor-grab active:cursor-grabbing rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm shadow-sm"
                        >
                          {f.text}
                          <button
                            onClick={() => handleRemove(f.id)}
                            className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm group-hover:flex"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                {feedback && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 border border-rose-100 animate-in fade-in slide-in-from-top-1">
                    <span>⚠️</span> {feedback}
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    待分类的影响因素：
                  </h4>
                  <button
                    onClick={handleShuffle}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition hover:opacity-80"
                  >
                    <span>🔀</span> 打乱顺序
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {currentFactors
                    .filter((f) => !currentAssignments[f.id])
                    .map((f) => (
                      <div
                        key={f.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("factorId", f.id)}
                        className="flex cursor-grab active:cursor-grabbing overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm transition hover:shadow-md"
                      >
                        <div className="px-4 py-3 text-sm font-medium">{f.text}</div>
                        <button
                          onClick={() => handleAssign(f.id, "large")}
                          className="border-l border-[var(--line)] bg-sky-50 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100"
                        >
                          大
                        </button>
                        <button
                          onClick={() => handleAssign(f.id, "small")}
                          className="border-l border-[var(--line)] bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          小
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {Object.keys(currentAssignments).length === currentFactors.length && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <h4 className="mb-2 flex items-center gap-2 font-bold text-emerald-800">✨ 分类完成！</h4>
                  <p className="text-sm leading-6 text-emerald-700">
                    太棒了，你已经正确完成了所有分类！在经济学逻辑下，弹性的大小取决于替代难易度和生产调整的灵活性。
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
