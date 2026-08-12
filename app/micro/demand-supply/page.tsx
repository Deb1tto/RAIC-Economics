"use client";

import Link from "next/link";
import { useMemo, useState, useRef, type PointerEvent, type ReactNode } from "react";

import { ChartFrame } from "../../../components/chart-frame";
import {
  CHART,
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
  supplyCurveClass,
  demandCurveClass,
} from "../../../components/ui-classes";
import { ButtonGroup } from "../../../components/button-group";

type LessonStep = "movement" | "combined";
type ShiftMarket = "demand" | "supply";
type DemandDeterminant = "normal-good" | "inferior-good" | "substitute" | "complement";
type SupplyDeterminant = "input-cost" | "technology";
type MetricKey =
  | "demand-price"
  | "demand-quantity"
  | "supply-quantity"
  | "shift-q1"
  | "shift-q2"
  | "shift-delta"
  | "shift-conclusion";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "movement",
    title: "步骤一：需求量与供给量的变动",
    summary: "滑动价格观察需求量和供给量的变化。",
    description: "在这个步骤中，你可以通过滑动价格滑块来观察需求量（Qd）和供给量（Qs）如何随价格变化而沿着曲线移动。",
  },
  {
    id: "combined",
    title: "步骤二：需求与供给的综合变动",
    summary: "同时观察价格变动带来的点移动，以及决定因素带来的线平移。",
    description:
      "需求曲线和供给曲线分别受不同因素影响。现在你可以同时调整价格和非价格决定因素。滑动价格观察‘沿线移动’（需求量/供给量变动），调整因素观察‘整线平移’（需求/供给变动）。",
  },
];

const baseline = {
  step: "movement" as LessonStep,
  price: 50,
  shiftMarket: "demand" as ShiftMarket,
  demandDeterminant: "normal-good" as DemandDeterminant,
  supplyDeterminant: "input-cost" as SupplyDeterminant,
  shiftStrength: 50,
};

const AXIS_MAX = 100;
const FIXED_SHIFT_PRICE = 50;

function demandQuantity(price: number, shift = 0): number {
  return 100 + shift - price;
}

function supplyQuantity(price: number, shift = 0): number {
  return price + shift;
}

function clampAxis(value: number): number {
  return Math.max(0, Math.min(AXIS_MAX, value));
}

function demandPoints(shift = 0): Point[] {
  const minPrice = Math.max(0, shift);
  const maxPrice = Math.min(AXIS_MAX, AXIS_MAX + shift);

  return [
    { x: demandQuantity(minPrice, shift), y: minPrice },
    { x: demandQuantity(maxPrice, shift), y: maxPrice },
  ];
}

function supplyPoints(shift = 0): Point[] {
  const minPrice = Math.max(0, -shift);
  const maxPrice = Math.min(AXIS_MAX, AXIS_MAX - shift);

  return [
    { x: supplyQuantity(minPrice, shift), y: minPrice },
    { x: supplyQuantity(maxPrice, shift), y: maxPrice },
  ];
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

export default function DemandSupplyPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [priceValue, setPriceValue] = useState<number>(baseline.price);
  const [shiftMarket, setShiftMarket] = useState<ShiftMarket>(baseline.shiftMarket);
  const [demandDeterminant, setDemandDeterminant] = useState<DemandDeterminant>(
    baseline.demandDeterminant,
  );
  const [supplyDeterminant, setSupplyDeterminant] = useState<SupplyDeterminant>(
    baseline.supplyDeterminant,
  );
  const [shiftStrength, setShiftStrength] = useState<number>(baseline.shiftStrength);
  const [showCurves, setShowCurves] = useState<string[]>(["demand", "supply"]);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyPointerPosition = (e: PointerEvent) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const CTM = svg.getScreenCTM();
    if (!CTM) return;
    const loc = pt.matrixTransform(CTM.inverse());

    const availableWidth = CHART.width - CHART.margin.left - CHART.margin.right;
    const availableHeight = CHART.height - CHART.margin.top - CHART.margin.bottom;

    const xValue = clampAxis(((loc.x - CHART.margin.left) / availableWidth) * AXIS_MAX);
    const yValue = clampAxis(
      ((CHART.height - CHART.margin.bottom - loc.y) / availableHeight) * AXIS_MAX,
    );

    setPriceValue(Math.max(10, Math.min(90, Math.round(yValue))));
  };

  const handlePointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointerPosition(e);
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    applyPointerPosition(e);
  };

  const activeStep = lessonSteps.find((s) => s.id === step) || lessonSteps[0];
  const { xScale, yScale } = getChartScales({ xMax: AXIS_MAX, yMax: AXIS_MAX });

  const shiftDelta = useMemo(() => {
    if (step === "movement") return 0;
    const normalized = (shiftStrength - 50) / 50;
    if (shiftMarket === "demand") {
      if (demandDeterminant === "inferior-good" || demandDeterminant === "complement") {
        return -normalized * 24;
      }
      return normalized * 24;
    }

    if (supplyDeterminant === "input-cost") {
      return -normalized * 24;
    }
    return normalized * 24;
  }, [shiftStrength, shiftMarket, demandDeterminant, supplyDeterminant]);

  const currentDemandQ = demandQuantity(priceValue, shiftMarket === "demand" ? shiftDelta : 0);
  const currentSupplyQ = supplyQuantity(priceValue, shiftMarket === "supply" ? shiftDelta : 0);

  const baseQ =
    shiftMarket === "demand"
      ? demandQuantity(priceValue)
      : supplyQuantity(priceValue);
  const shiftedQ =
    shiftMarket === "demand"
      ? demandQuantity(priceValue, shiftDelta)
      : supplyQuantity(priceValue, shiftDelta);
  const deltaQ = shiftedQ - baseQ;
  const shiftDirection = deltaQ > 0 ? "increase" : deltaQ < 0 ? "decrease" : "none";
  const conclusion =
    shiftMarket === "demand"
      ? shiftDirection === "increase"
        ? "需求增加 Increase in Demand"
        : shiftDirection === "decrease"
          ? "需求减少 Decrease in Demand"
          : "需求不变 No Change in Demand"
      : shiftDirection === "increase"
        ? "供给增加 Increase in Supply"
        : shiftDirection === "decrease"
          ? "供给减少 Decrease in Supply"
          : "供给不变 No Change in Supply";

  const banner = conclusion;

  const bannerKind =
    shiftDirection === "none"
      ? "neutral"
      : shiftDirection === "increase"
        ? "good"
        : "warn";

  const maxX = useMemo(() => {
    const dVisible = step !== "movement" || showCurves.includes("demand");
    const sVisible = step !== "movement" || showCurves.includes("supply");
    if (dVisible && sVisible) return Math.max(currentDemandQ, currentSupplyQ);
    if (dVisible) return currentDemandQ;
    if (sVisible) return currentSupplyQ;
    return 0;
  }, [step, showCurves, currentDemandQ, currentSupplyQ]);

  const metrics = (
    <>
      <MetricCard
        metricKey="demand-price"
        hoveredMetric={hoveredMetric}
        setHoveredMetric={setHoveredMetric}
        label="当前价格 P"
        value={round(priceValue, 1).toFixed(1)}
      />
      {(step !== "movement" || showCurves.includes("demand")) && (
        <MetricCard
          metricKey="demand-quantity"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求量 Qd"
          value={round(currentDemandQ, 1).toFixed(1)}
        />
      )}
      {(step !== "movement" || showCurves.includes("supply")) && (
        <MetricCard
          metricKey="supply-quantity"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="供给量 Qs"
          value={round(currentSupplyQ, 1).toFixed(1)}
        />
      )}
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
            Unit 2.1 / 2.2
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            需求与供给模型
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            先分别看需求与供给对自身价格的反应，再用决定因素变化把“沿着曲线移动”和“整条曲线平移”彻底分开。
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
                  setStep(item.id);
                  if (item.id === "movement") {
                    setShowCurves(["demand", "supply"]);
                  }
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
        {step === "combined" && <div className="mt-3">{statusPill(bannerKind, banner)}</div>}
      </section>

      <main className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${surfaceClass} rounded-[24px] p-6`}>
          {step === "movement" && (
            <div className={labelStackClass}>
              <span className="font-bold">显示曲线</span>
              <ButtonGroup<string, true>
                multiple
                value={showCurves}
                onChange={(next) => setShowCurves(next)}
                options={[
                  { value: "demand", label: "显示需求曲线" },
                  { value: "supply", label: "显示供给曲线" },
                ]}
              />
            </div>
          )}
          <label className={labelStackClass}>
            <span className="font-bold">商品价格 Price</span>
            <input
              type="range"
              min="10"
              max="90"
              step="1"
              value={priceValue}
              onChange={(event) => setPriceValue(Number(event.target.value))}
              className={rangeClass}
            />
              <strong className="text-[var(--accent)]">{priceValue}</strong>
              <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                拖动价格滑块时，需求量和供给量会分别沿着各自的曲线移动。
              </p>
            </label>

            {step === "combined" && (
              <>
                <label className={labelStackClass}>
                  <span className="font-bold">目标曲线</span>
                  <ButtonGroup<ShiftMarket>
                    value={shiftMarket}
                    onChange={(next) => {
                      const market = next as ShiftMarket;
                      setShiftMarket(market);
                      if (market === "demand") {
                        setDemandDeterminant("normal-good");
                      } else {
                        setSupplyDeterminant("input-cost");
                      }
                    }}
                    options={[
                      { value: "demand", label: "需求曲线" },
                      { value: "supply", label: "供给曲线" },
                    ]}
                  />
                </label>

                <label className={labelStackClass}>
                  <span className="font-bold">外部决定因素</span>
                  <ButtonGroup<DemandDeterminant | SupplyDeterminant>
                    value={shiftMarket === "demand" ? demandDeterminant : supplyDeterminant}
                    onChange={(next) => {
                      if (shiftMarket === "demand") {
                        setDemandDeterminant(next as DemandDeterminant);
                      } else {
                        setSupplyDeterminant(next as SupplyDeterminant);
                      }
                    }}
                    options={[
                      { value: "normal-good", label: "收入 (正常品)", disabled: shiftMarket !== "demand" },
                      {
                        value: "inferior-good",
                        label: "收入 (劣等品)",
                        disabled: shiftMarket !== "demand",
                      },
                      {
                        value: "substitute",
                        label: "相关价格 (替代品)",
                        disabled: shiftMarket !== "demand",
                      },
                      {
                        value: "complement",
                        label: "相关价格 (互补品)",
                        disabled: shiftMarket !== "demand",
                      },
                      { value: "input-cost", label: "投入成本", disabled: shiftMarket !== "supply" },
                      { value: "technology", label: "生产技术", disabled: shiftMarket !== "supply" },
                    ]}
                  />
                </label>

                <label className={labelStackClass}>
                  <span className="font-bold">因素变化幅度</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={shiftStrength}
                    onChange={(event) => setShiftStrength(Number(event.target.value))}
                    className={rangeClass}
                  />
                  <strong className="text-[var(--accent)]">{shiftStrength}</strong>
                  <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                    调整非价格决定因素，观察整条曲线如何平移。
                  </p>
                </label>
              </>
            )}

            <button
              type="button"
            onClick={() => {
              setHoveredMetric(null);
              setStep(baseline.step);
              setShiftStrength(baseline.shiftStrength);
              setPriceValue(baseline.price);
              setShowCurves(["demand", "supply"]);
            }}
              className={primaryButtonClass}
            >
              重置
            </button>
          </aside>

          <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
            <div className="mb-4">
              <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                {activeStep.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {activeStep.summary}
              </p>
            </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className={`${chartSvgClass} touch-none`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            aria-label="Demand and supply chart"
          >
            <ChartFrame
              xMax={AXIS_MAX}
              yMax={AXIS_MAX}
              xLabel="数量 (Quantity, Q)"
              yLabel="价格 (Price, P)"
            />

            {/* Demand Curve(s) */}
            {(step !== "movement" || showCurves.includes("demand")) && (
              <>
                <path
                  d={linePointsToPath(
                    demandPoints().map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                  )}
                  className={`${curveClass} ${demandCurveClass} ${shiftMarket === "demand" && shiftDelta !== 0 ? dashedClass + " opacity-50" : ""}`}
                />
                {shiftMarket === "demand" && shiftDelta !== 0 && (
                  <path
                    d={linePointsToPath(
                      demandPoints(shiftDelta).map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                    )}
                    className={`${curveClass} ${demandCurveClass} ${accentCurveClass}`}
                  />
                )}
              </>
            )}

            {/* Supply Curve(s) */}
            {(step !== "movement" || showCurves.includes("supply")) && (
              <>
                <path
                  d={linePointsToPath(
                    supplyPoints().map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                  )}
                  className={`${curveClass} ${supplyCurveClass} ${shiftMarket === "supply" && shiftDelta !== 0 ? dashedClass + " opacity-50" : ""}`}
                />
                {shiftMarket === "supply" && shiftDelta !== 0 && (
                  <path
                    d={linePointsToPath(
                      supplyPoints(shiftDelta).map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                    )}
                    className={`${curveClass} ${supplyCurveClass} ${accentCurveClass}`}
                  />
                )}
              </>
            )}

            {(step !== "movement" || showCurves.includes("demand")) && (
              <path
                d={linePointsToPath(
                  demandPoints(shiftMarket === "demand" ? shiftDelta : 0).map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                )}
                stroke="transparent"
                strokeWidth="28"
                fill="none"
                onPointerDown={handlePointerDown}
                className="cursor-ns-resize"
              />
            )}
            {(step !== "movement" || showCurves.includes("supply")) && (
              <path
                d={linePointsToPath(
                  supplyPoints(shiftMarket === "supply" ? shiftDelta : 0).map((point) => ({ x: xScale(point.x), y: yScale(point.y) })),
                )}
                stroke="transparent"
                strokeWidth="28"
                fill="none"
                onPointerDown={handlePointerDown}
                className="cursor-ns-resize"
              />
            )}

            {(step !== "movement" || showCurves.includes("demand")) && (
              <>
                <circle
                  cx={xScale(currentDemandQ)}
                  cy={yScale(priceValue)}
                  r="10"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />
                <text x={xScale(currentDemandQ) + 12} y={yScale(priceValue) - 12} className={chartSmallLabelClass}>
                  A
                </text>
              </>
            )}
            {(step !== "movement" || showCurves.includes("supply")) && (
              <>
                <circle
                  cx={xScale(currentSupplyQ)}
                  cy={yScale(priceValue)}
                  r="10"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />
                <text x={xScale(currentSupplyQ) + 12} y={yScale(priceValue) - 12} className={chartSmallLabelClass}>
                  B
                </text>
              </>
            )}

            <line
              x1={xScale(0)}
              y1={yScale(priceValue)}
              x2={xScale(maxX)}
              y2={yScale(priceValue)}
              className={`${gridLineClass} ${dashedClass}`}
            />
            {(step !== "movement" || showCurves.includes("demand")) && (
              <line
                x1={xScale(currentDemandQ)}
                y1={yScale(0)}
                x2={xScale(currentDemandQ)}
                y2={yScale(priceValue)}
                className={`${gridLineClass} ${dashedClass}`}
              />
            )}
            {(step !== "movement" || showCurves.includes("supply")) && (
              <line
                x1={xScale(currentSupplyQ)}
                y1={yScale(0)}
                x2={xScale(currentSupplyQ)}
                y2={yScale(priceValue)}
                className={`${gridLineClass} ${dashedClass}`}
              />
            )}

            {(step !== "movement" || showCurves.includes("demand")) && (
              <text x={xScale(85)} y={yScale(demandQuantity(85, shiftMarket === "demand" ? shiftDelta : 0))} className={chartLabelClass}>
                D
              </text>
            )}
            {(step !== "movement" || showCurves.includes("supply")) && (
              <text x={xScale(85)} y={yScale(supplyQuantity(85, shiftMarket === "supply" ? shiftDelta : 0))} className={chartLabelClass}>
                S
              </text>
            )}

            {hoveredMetric === "demand-price" ? (
              <line
                x1={xScale(0)}
                y1={yScale(priceValue)}
                x2={xScale(maxX)}
                y2={yScale(priceValue)}
                className="[stroke:var(--accent)] [stroke-width:5] [stroke-dasharray:8_6]"
              />
            ) : null}

            {hoveredMetric === "demand-quantity" ? (
              <line
                x1={xScale(currentDemandQ)}
                y1={yScale(0)}
                x2={xScale(currentDemandQ)}
                y2={yScale(priceValue)}
                className="[stroke:var(--accent)] [stroke-width:5] [stroke-dasharray:8_6]"
              />
            ) : null}

            {hoveredMetric === "supply-quantity" ? (
              <line
                x1={xScale(currentSupplyQ)}
                y1={yScale(0)}
                x2={xScale(currentSupplyQ)}
                y2={yScale(priceValue)}
                className="[stroke:var(--accent)] [stroke-width:5] [stroke-dasharray:8_6]"
              />
            ) : null}
          </svg>

          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
