"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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

type LessonStep = "advantage" | "trade";
type DataType = "output" | "input";
type MetricKey =
  | "advantage-abs-x"
  | "advantage-abs-y"
  | "advantage-comp-x"
  | "advantage-comp-y"
  | "terms-rate"
  | "terms-exporter"
  | "terms-importer"
  | "gains-a-consumption"
  | "gains-b-consumption"
  | "gains-a-net"
  | "gains-b-net";

type Country = {
  id: "A" | "B";
  name: string;
  outputMaxX: number;
  outputMaxY: number;
  inputPerX: number;
  inputPerY: number;
  accentLine: string;
  accentFill: string;
};

const countries: Country[] = [
  {
    id: "A",
    name: "A国",
    outputMaxX: 120,
    outputMaxY: 120,
    inputPerX: 2,
    inputPerY: 2,
    accentLine: "stroke-[var(--accent)]",
    accentFill: "fill-[rgba(191,91,44,0.16)]",
  },
  {
    id: "B",
    name: "B国",
    outputMaxX: 80,
    outputMaxY: 240,
    inputPerX: 3,
    inputPerY: 1,
    accentLine: "stroke-[var(--accent-2)]",
    accentFill: "fill-[rgba(76,183,171,0.18)]",
  },
];

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "advantage",
    title: "步骤一：发现比较优势",
    summary: "先比较生产能力和机会成本，决定谁更该生产哪种商品。",
    description:
      "绝对优势看谁能生产更多，比较优势看谁放弃得更少。即使一国在两种商品上都更高效，只要机会成本不同，贸易和专业化就仍然有意义。",
  },
  {
    id: "trade",
    title: "步骤二：调整贸易条件与交换量",
    summary: "设定贸易条件并观察其带来的贸易红利。",
    description:
      "贸易条件落在两国成本之间时双方互利。通过调整交换量，可以观察消费点如何冲出各自原有的 PPC 边界。",
  },
];

const baseline = {
  step: "advantage" as LessonStep,
  dataType: "output" as DataType,
  autarkyShare: 50,
  termsOfTrade: 1,
  tradeVolume: 0,
};

const PPC_MAX = 260;

function opportunityCostOfX(country: Country, dataType: DataType): number {
  return dataType === "output"
    ? country.outputMaxY / country.outputMaxX
    : country.inputPerX / country.inputPerY;
}

function ppcLine(country: Country, xScale: (value: number) => number, yScale: (value: number) => number): Point[] {
  return [
    { x: xScale(0), y: yScale(country.outputMaxY) },
    { x: xScale(country.outputMaxX), y: yScale(0) },
  ];
}

function autarkyPoint(country: Country, share: number) {
  const ratio = share / 100;
  return {
    x: country.outputMaxX * ratio,
    y: country.outputMaxY * (1 - ratio),
  };
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

function CountryPpcChart({
  title,
  country,
  point,
  hovered,
  highlightXPoint,
  highlightYPoint,
  highlightXCost,
  highlightYCost,
  extraPoint,
  cpcLine,
  gainArrows,
}: {
  title: string;
  country: Country;
  point?: { x: number; y: number; label: string; glow?: boolean };
  hovered?: boolean;
  highlightXPoint?: boolean;
  highlightYPoint?: boolean;
  highlightXCost?: boolean;
  highlightYCost?: boolean;
  extraPoint?: { x: number; y: number; label: string; glow?: boolean };
  cpcLine?: Array<{ x: number; y: number }>;
  gainArrows?: {
    autarky: { x: number; y: number };
    consumption: { x: number; y: number };
  };
}) {
  const { xScale, yScale } = getChartScales({ xMax: PPC_MAX, yMax: PPC_MAX, equalRatio: true });
  const frontier = ppcLine(country, xScale, yScale);
  const basePoint = point
    ? { x: xScale(point.x), y: yScale(point.y), label: point.label, glow: point.glow }
    : null;
  const secondPoint = extraPoint
    ? { x: xScale(extraPoint.x), y: yScale(extraPoint.y), label: extraPoint.label, glow: extraPoint.glow }
    : null;
  const ocX = country.outputMaxY / country.outputMaxX;
  const ocY = country.outputMaxX / country.outputMaxY;

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/65 p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} aria-label={`${country.name} PPC chart`}>
        <defs>
          <marker id="arrow-green" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="#2f8f68" />
          </marker>
          <marker id="arrow-red" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="#c64861" />
          </marker>
        </defs>
        <ChartFrame
          xMax={PPC_MAX}
          yMax={PPC_MAX}
          xLabel="商品 X 数量 (Good X)"
          yLabel="商品 Y 数量 (Good Y)"
          equalRatio={true}
          customTicks={[50, 100, 150, 200, 250]}
        />

        <path
          d={linePointsToPath(frontier)}
          className={`${curveClass} ${country.accentLine} ${hovered ? "[stroke-width:5]" : ""}`}
        />
        <text
          x={xScale(country.outputMaxX * 0.6)}
          y={yScale(country.outputMaxY * 0.38)}
          className={chartLabelClass}
        >
          {country.name} PPC
        </text>

        {highlightXPoint ? (
          <circle
            cx={xScale(country.outputMaxX)}
            cy={yScale(0)}
            r="10"
            className={`${markerStrokeClass} fill-[var(--accent)] animate-pulse`}
          />
        ) : null}

        {highlightYPoint ? (
          <circle
            cx={xScale(0)}
            cy={yScale(country.outputMaxY)}
            r="10"
            className={`${markerStrokeClass} fill-[var(--accent)] animate-pulse`}
          />
        ) : null}

        {highlightXCost ? (
          <>
            <line
              x1={xScale(0)}
              y1={yScale(country.outputMaxY)}
              x2={xScale(40)}
              y2={yScale(country.outputMaxY)}
              className="[stroke:#2f8f68] [stroke-width:4]"
              markerEnd="url(#arrow-green)"
            />
            <line
              x1={xScale(40)}
              y1={yScale(country.outputMaxY)}
              x2={xScale(40)}
              y2={yScale(country.outputMaxY - 40 * ocX)}
              className="[stroke:#c64861] [stroke-width:4]"
              markerEnd="url(#arrow-red)"
            />
            <text x={xScale(45)} y={yScale(country.outputMaxY + 6)} className="fill-[#2f8f68] text-[12px] font-semibold">
              增加 40X
            </text>
            <text x={xScale(45)} y={yScale(country.outputMaxY - 20 * ocX)} className="fill-[#c64861] text-[12px] font-semibold">
              减少 {round(40 * ocX, 2)}Y
            </text>
          </>
        ) : null}

        {highlightYCost ? (
          <>
            <line
              x1={xScale(country.outputMaxX)}
              y1={yScale(0)}
              x2={xScale(country.outputMaxX)}
              y2={yScale(40)}
              className="[stroke:#2f8f68] [stroke-width:4]"
              markerEnd="url(#arrow-green)"
            />
            <line
              x1={xScale(country.outputMaxX)}
              y1={yScale(40)}
              x2={xScale(country.outputMaxX - 40 * ocY)}
              y2={yScale(40)}
              className="[stroke:#c64861] [stroke-width:4]"
              markerEnd="url(#arrow-red)"
            />
            <text x={xScale(country.outputMaxX - 75)} y={yScale(45)} className="fill-[#2f8f68] text-[12px] font-semibold">
              增加 40Y
            </text>
            <text x={xScale(country.outputMaxX - 90)} y={yScale(35)} className="fill-[#c64861] text-[12px] font-semibold">
              减少 {round(40 * ocY, 2)}X
            </text>
          </>
        ) : null}

        {cpcLine ? (
          <path
            d={linePointsToPath(
              cpcLine.map((item) => ({ x: xScale(item.x), y: yScale(item.y) })),
            )}
            className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.5)]`}
          />
        ) : null}

        {basePoint ? (
          <>
            <circle
              cx={basePoint.x}
              cy={basePoint.y}
              r={basePoint.glow ? "10" : "8"}
              className={`${markerStrokeClass} ${pointMarkerClass}`}
            />
            <text x={basePoint.x + 8} y={basePoint.y - 10} className={chartSmallLabelClass}>
              {basePoint.label}
            </text>
          </>
        ) : null}

        {secondPoint ? (
          <>
            <circle
              cx={secondPoint.x}
              cy={secondPoint.y}
              r={secondPoint.glow ? "10" : "7"}
              className={`${markerStrokeClass} fill-[rgba(76,183,171,0.86)]`}
            />
            <text x={secondPoint.x + 8} y={secondPoint.y - 10} className={chartSmallLabelClass}>
              {secondPoint.label}
            </text>
          </>
        ) : null}

        {gainArrows ? (
          <>
            <line
              x1={xScale(gainArrows.autarky.x)}
              y1={yScale(gainArrows.autarky.y)}
              x2={xScale(gainArrows.consumption.x)}
              y2={yScale(gainArrows.autarky.y)}
              className="[stroke:#2f8f68] [stroke-width:4]"
            />
            <line
              x1={xScale(gainArrows.consumption.x)}
              y1={yScale(gainArrows.autarky.y)}
              x2={xScale(gainArrows.consumption.x)}
              y2={yScale(gainArrows.consumption.y)}
              className="[stroke:#2f8f68] [stroke-width:4]"
            />
          </>
        ) : null}
      </svg>
    </div>
  );
}

export default function TradePage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [dataType, setDataType] = useState<DataType>(baseline.dataType);
  const [autarkyShare, setAutarkyShare] = useState<number>(baseline.autarkyShare);
  const [termsOfTrade, setTermsOfTrade] = useState<number>(baseline.termsOfTrade);
  const [tradeVolume, setTradeVolume] = useState<number>(baseline.tradeVolume);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const isAbsXHovered = hoveredMetric === "advantage-abs-x";
  const isAbsYHovered = hoveredMetric === "advantage-abs-y";
  const isAbsHovered = isAbsXHovered || isAbsYHovered;

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const countryA = countries[0];
  const countryB = countries[1];

  const aCostX = opportunityCostOfX(countryA, dataType);
  const bCostX = opportunityCostOfX(countryB, dataType);
  const lowerBound = Math.min(aCostX, bCostX);
  const upperBound = Math.max(aCostX, bCostX);
  const mutuallyBeneficial = termsOfTrade > lowerBound && termsOfTrade < upperBound;
  const exporterGain = round(termsOfTrade - aCostX, 2);
  const importerSaving = round(bCostX - termsOfTrade, 2);

  const autarkyA = autarkyPoint(countryA, autarkyShare);
  const autarkyB = autarkyPoint(countryB, autarkyShare);

  const maxTradeVolume = Math.max(0, Math.min(countryA.outputMaxX, countryB.outputMaxY / Math.max(termsOfTrade, 0.01)));
  const safeTradeVolume = clamp(tradeVolume, 0, round(maxTradeVolume, 1));
  const aConsumption = {
    x: countryA.outputMaxX - safeTradeVolume,
    y: termsOfTrade * safeTradeVolume,
  };
  const bConsumption = {
    x: safeTradeVolume,
    y: countryB.outputMaxY - termsOfTrade * safeTradeVolume,
  };

  const aNetGain = round(
    aConsumption.y - countryA.outputMaxY * (1 - aConsumption.x / countryA.outputMaxX),
    1,
  );
  const bNetGain = round(
    bConsumption.x - countryB.outputMaxX * (1 - bConsumption.y / countryB.outputMaxY),
    1,
  );

  const rangeMin = Math.max(0, lowerBound - 0.6);
  const rangeMax = upperBound + 0.6;
  const rangeScales = getChartScales({ xMax: round(rangeMax - rangeMin, 2), yMax: 1 });
  const normalizeRange = (value: number) => value - rangeMin;
  const indicatorX = rangeScales.xScale(normalizeRange(termsOfTrade));
  const aBoundX = rangeScales.xScale(normalizeRange(lowerBound));
  const bBoundX = rangeScales.xScale(normalizeRange(upperBound));

  const metrics =
    step === "advantage" ? (
      <>
        <div className="col-span-full grid gap-3 sm:grid-cols-2">
          <MetricCard
            metricKey="advantage-abs-x"
            hoveredMetric={hoveredMetric}
            setHoveredMetric={setHoveredMetric}
            label="生产 X 的绝对优势"
            value={countryA.outputMaxX > countryB.outputMaxX ? "A国" : "B国"}
          />
          <MetricCard
            metricKey="advantage-abs-y"
            hoveredMetric={hoveredMetric}
            setHoveredMetric={setHoveredMetric}
            label="生产 Y 的绝对优势"
            value={countryA.outputMaxY > countryB.outputMaxY ? "A国" : "B国"}
          />
        </div>
        <div className="col-span-full grid gap-3 sm:grid-cols-2">
          <MetricCard
            metricKey="advantage-comp-x"
            hoveredMetric={hoveredMetric}
            setHoveredMetric={setHoveredMetric}
            label="生产 X 的相对优势"
            value={aCostX < bCostX ? "A国" : "B国"}
            accentClassName="text-emerald-700"
          >
            <p className="mt-1 text-xs text-[var(--muted)]">
              机会成本更低 (仅需 {round(Math.min(aCostX, bCostX), 2)}Y)
            </p>
          </MetricCard>
          <MetricCard
            metricKey="advantage-comp-y"
            hoveredMetric={hoveredMetric}
            setHoveredMetric={setHoveredMetric}
            label="生产 Y 的相对优势"
            value={1 / aCostX < 1 / bCostX ? "A国" : "B国"}
            accentClassName="text-emerald-700"
          >
            <p className="mt-1 text-xs text-[var(--muted)]">
              机会成本更低 (仅需 {round(Math.min(1 / aCostX, 1 / bCostX), 2)}X)
            </p>
          </MetricCard>
        </div>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="terms-rate"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="设定的贸易条件"
          value={`1X = ${round(termsOfTrade, 2)}Y`}
        >
          <div className="mt-2">
            {statusPill(
              mutuallyBeneficial ? "good" : "warn",
              mutuallyBeneficial ? "双方互利" : "超出互利区间",
            )}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="gains-a-net"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="A国贸易后可消费量增加 Gains"
          value={`${aNetGain >= 0 ? "+" : ""}${aNetGain} Y`}
          accentClassName={aNetGain >= 0 ? "text-emerald-700" : "text-amber-700"}
        />
        <MetricCard
          metricKey="gains-b-net"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="B国贸易后可消费量增加 Gains"
          value={`${bNetGain >= 0 ? "+" : ""}${bNetGain} X`}
          accentClassName={bNetGain >= 0 ? "text-emerald-700" : "text-amber-700"}
        />
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
            Unit 1.4
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            比较优势与国际贸易
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            先比较机会成本，再谈互利的贸易条件，最后让两国的消费点真正冲出各自原有的生产可能性边界。
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
          {step === "advantage" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">题目数据类型</span>
                <ButtonGroup<DataType>
                  value={dataType}
                  onChange={(next) => setDataType(next as DataType)}
                  options={[
                { value: "output", label: "产出型 Output" },
                { value: "input", label: "投入型 Input" },
              ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">自给自足生产点</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={autarkyShare}
                  onChange={(event) => setAutarkyShare(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{autarkyShare}%</strong>
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">资源用于生产X的百分比</p>
              </label>

              <div
                className={`rounded-2xl border transition-colors p-4 text-sm leading-6 text-[var(--muted)] ${
                  isAbsHovered
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--line)] bg-white/60"
                }`}
              >
                <div className="font-semibold text-[var(--ink)]">当前题型数据</div>
                {dataType === "output" ? (
                  <div className="mt-2">
                    <div>
                      A国：最多可产 <span className={isAbsXHovered ? "font-bold text-[var(--accent)]" : ""}>120X</span> 或{" "}
                      <span className={isAbsYHovered ? "font-bold text-[var(--accent)]" : ""}>120Y</span>
                    </div>
                    <div>
                      B国：最多可产 <span className={isAbsXHovered ? "font-bold text-[var(--accent)]" : ""}>80X</span> 或{" "}
                      <span className={isAbsYHovered ? "font-bold text-[var(--accent)]" : ""}>240Y</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div>
                      A国：1X 需 <span className={isAbsXHovered ? "font-bold text-[var(--accent)]" : ""}>2</span>{" "}
                      小时，1Y 需 <span className={isAbsYHovered ? "font-bold text-[var(--accent)]" : ""}>2</span>{" "}
                      小时
                    </div>
                    <div>
                      B国：1X 需 <span className={isAbsXHovered ? "font-bold text-[var(--accent)]" : ""}>3</span>{" "}
                      小时，1Y 需 <span className={isAbsYHovered ? "font-bold text-[var(--accent)]" : ""}>1</span>{" "}
                      小时
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">设定贸易条件 Terms of Trade</span>
                <input
                  type="range"
                  min={rangeMin}
                  max={rangeMax}
                  step="0.01"
                  value={termsOfTrade}
                  onChange={(event) => setTermsOfTrade(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(termsOfTrade, 2)} Y / 1X</strong>
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  互利区间是 `({round(lowerBound, 2)}, {round(upperBound, 2)})`。
                </p>
              </label>

              <label className={labelStackClass + " mt-6"}>
                <span className="font-bold">贸易交换量 Trade Volume</span>
                <input
                  type="range"
                  min="0"
                  max={round(maxTradeVolume, 1)}
                  step="0.1"
                  value={safeTradeVolume}
                  onChange={(event) => setTradeVolume(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(safeTradeVolume, 1)} 单位 X</strong>
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  A 国出口 X，B 国按当前贸易条件拿出 Y 来交换。
                </p>
              </label>
            </>
          )}
        </aside>

        <section className={`${surfaceClass} min-w-0 rounded-[24px] p-4 sm:p-5`}>
          <div className="mb-4">
            <h2 className="text-2xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {step === "advantage"
                ? "生产可能性边界 (A国 vs B国)"
                : "贸易条件与贸易红利"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {step === "advantage"
                ? "比较两国的 PPC 斜率。斜率差异代表机会成本不同，也正是比较优势的来源。"
                : "调整贸易条件和交换量，看贸易后消费点如何突破原来自给自足时的国内边界。"}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CountryPpcChart
              title="A国"
              country={countryA}
              point={
                step === "advantage"
                  ? {
                      x: autarkyA.x,
                      y: autarkyA.y,
                      label: "自给自足点",
                      glow: false,
                    }
                  : {
                      x: countryA.outputMaxX,
                      y: 0,
                      label: "专门化生产点",
                      glow: hoveredMetric === "gains-a-consumption" || hoveredMetric === "gains-a-net",
                    }
              }
              hovered={
                hoveredMetric === "advantage-abs-x" ||
                hoveredMetric === "advantage-abs-y" ||
                hoveredMetric === "advantage-comp-x" ||
                hoveredMetric === "advantage-comp-y"
              }
              highlightXPoint={hoveredMetric === "advantage-abs-x"}
              highlightYPoint={hoveredMetric === "advantage-abs-y"}
              highlightXCost={hoveredMetric === "advantage-comp-x"}
              highlightYCost={hoveredMetric === "advantage-comp-y"}
              extraPoint={
                step === "trade"
                  ? {
                      x: aConsumption.x,
                      y: aConsumption.y,
                      label: "消费点",
                      glow: hoveredMetric === "gains-a-consumption" || hoveredMetric === "gains-a-net",
                    }
                  : undefined
              }
              cpcLine={
                step === "trade"
                  ? [
                      { x: countryA.outputMaxX, y: 0 },
                      { x: 0, y: termsOfTrade * countryA.outputMaxX },
                    ]
                  : undefined
              }
              gainArrows={
                step === "trade" && hoveredMetric === "gains-a-net"
                  ? {
                      autarky: {
                        x: aConsumption.x,
                        y: countryA.outputMaxY * (1 - aConsumption.x / countryA.outputMaxX),
                      },
                      consumption: aConsumption,
                    }
                  : undefined
              }
            />

            <CountryPpcChart
              title="B国"
              country={countryB}
              point={
                step === "advantage"
                  ? {
                      x: autarkyB.x,
                      y: autarkyB.y,
                      label: "自给自足点",
                      glow: false,
                    }
                  : {
                      x: 0,
                      y: countryB.outputMaxY,
                      label: "专门化生产点",
                      glow: hoveredMetric === "gains-b-consumption" || hoveredMetric === "gains-b-net",
                    }
              }
              hovered={
                hoveredMetric === "advantage-abs-x" ||
                hoveredMetric === "advantage-abs-y" ||
                hoveredMetric === "advantage-comp-x" ||
                hoveredMetric === "advantage-comp-y"
              }
              highlightXPoint={hoveredMetric === "advantage-abs-x"}
              highlightYPoint={hoveredMetric === "advantage-abs-y"}
              highlightXCost={hoveredMetric === "advantage-comp-x"}
              highlightYCost={hoveredMetric === "advantage-comp-y"}
              extraPoint={
                step === "trade"
                  ? {
                      x: bConsumption.x,
                      y: bConsumption.y,
                      label: "消费点",
                      glow: hoveredMetric === "gains-b-consumption" || hoveredMetric === "gains-b-net",
                    }
                  : undefined
              }
              cpcLine={
                step === "trade"
                  ? [
                      { x: 0, y: countryB.outputMaxY },
                      { x: countryB.outputMaxY / Math.max(termsOfTrade, 0.01), y: 0 },
                    ]
                  : undefined
              }
              gainArrows={
                step === "trade" && hoveredMetric === "gains-b-net"
                  ? {
                      autarky: {
                        x: countryB.outputMaxX * (1 - bConsumption.y / countryB.outputMaxY),
                        y: bConsumption.y,
                      },
                      consumption: bConsumption,
                    }
                  : undefined
              }
            />
          </div>

          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
