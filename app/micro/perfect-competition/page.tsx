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
  inputClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  pointMarkerClass,
  primaryButtonClass,
  rangeClass,
  surfaceClass,
} from "../../../components/ui-classes";
import { ButtonGroup } from "../../../components/button-group";

type LessonStep = "price-taker" | "shutdown" | "long-run";
type ShutdownView = "none" | "production-profit-loss" | "shutdown-loss";
type LongRunState = "profit" | "loss" | "equilibrium";
type MetricKey =
  | "step1-price"
  | "step1-qstar"
  | "step1-atc"
  | "step1-profit"
  | "step2-price"
  | "step2-avc"
  | "step2-shutdown"
  | "step2-operating"
  | "step3-trend"
  | "step3-market-q"
  | "step3-firm-q"
  | "step3-profit";

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "price-taker",
    title: "步骤一：价格接受者与短期利润",
    summary: "先用并排图建立 P=MR=AR=D 与 MR=MC 定产量。",
    description:
      "完全竞争企业没有能力自己定价。市场供需在左图决定价格，这个价格会直接变成右图企业面对的一条水平需求线。企业真正能控制的只有产量，而最优产量总是出现在 MR = MC 的地方。",
    chartTitle: "市场与企业的并排模型",
    chartSubtitle: "左图决定价格，右图接受价格；拖动需求和产量，观察利润矩形如何围绕 q* 变化。",
  },
  {
    id: "shutdown",
    title: "步骤二：选择生产时的利润和亏损",
    summary: "再比较 P、ATC 与 AVC，观察选择生产时的利润或亏损。",
    description:
      "短期里固定成本已经发生，是否生产要看价格能不能覆盖可变成本。选择生产时，P 高于 ATC 会形成绿色利润矩形，P 低于 ATC 会形成红色亏损矩形；即使价格低于 AVC，也可以看到生产会带来的亏损。",
    chartTitle: "选择生产时的利润和亏损",
    chartSubtitle: "调节价格，观察生产选择下的利润或亏损矩形，并用 AVC 判断是否应该停业。",
  },
  {
    id: "long-run",
    title: "步骤三：长期均衡与效率",
    summary: "最后看企业进入退出如何把经济利润推回到零。",
    description:
      "短期利润会吸引企业进入，短期亏损会迫使企业退出。行业供给因此左右移动，直到价格刚好落在企业平均总成本的最低点。长期均衡时，企业只赚正常利润，但市场同时实现分配效率和生产效率。",
    chartTitle: "从短期失衡到长期均衡",
    chartSubtitle: "选择行业初始状态，再推动长期时间，让供给移动、价格调整、利润矩形收缩到零。",
  },
];

const baseline = {
  step: "price-taker" as LessonStep,
  marketDemand: 70,
  firmQuantity: 14,
  marketPrice: 8,
  shutdownView: "production-profit-loss" as ShutdownView,
  longRunState: "profit" as LongRunState,
  longRunTime: 0,
};

const MARKET_X_MAX = 140;
const MARKET_Y_MAX = 20;
const FIRM_X_MAX = 20;
const FIRM_Y_MAX = 20;
const DEMAND_SLOPE = 0.25;
const SUPPLY_SLOPE = 0.06;
const STEP1_SUPPLY_INTERCEPT = 7.5;
const LONG_RUN_DEMAND_INTERCEPT = 34;
const LONG_RUN_EQ_SUPPLY_INTERCEPT = 3.635;
const TFC = 40;
const STEP2_MIN_MARKET_PRICE = 4.4;
const STEP1_PANEL_BORDER = 1;
const STEP1_PANEL_PADDING = 16;
const STEP1_PANEL_HEADER_HEIGHT = 28;
const STEP1_PANEL_HEADER_GAP = 8;
const PROFIT_FILL = "rgba(34,197,94,0.2)";
const PROFIT_STROKE = "rgba(22,163,74,0.88)";
const LOSS_FILL = "rgba(239,68,68,0.18)";
const LOSS_STROKE = "rgba(225,29,72,0.88)";
const PRICE_GUIDE_STROKE = "#facc15";

function demandInterceptFromSlider(value: number): number {
  return 24 + value * 0.2;
}

function demandPrice(quantity: number, intercept: number): number {
  return intercept - DEMAND_SLOPE * quantity;
}

function supplyPrice(quantity: number, intercept: number): number {
  return intercept + SUPPLY_SLOPE * quantity;
}

function equilibriumQuantity(demandIntercept: number, supplyIntercept: number): number {
  return (demandIntercept - supplyIntercept) / (DEMAND_SLOPE + SUPPLY_SLOPE);
}

function equilibriumPrice(demandIntercept: number, supplyIntercept: number): number {
  return demandPrice(equilibriumQuantity(demandIntercept, supplyIntercept), demandIntercept);
}

function avc(quantity: number): number {
  return 0.05 * quantity * quantity - quantity + 11;
}

function atc(quantity: number): number {
  return avc(quantity) + TFC / quantity;
}

function mc(quantity: number): number {
  return 0.15 * quantity * quantity - 2 * quantity + 11;
}

function optimalFirmQuantity(price: number): number {
  const discriminant = 0.6 * price - 2.6;
  if (discriminant <= 0) return 0;
  return (2 + Math.sqrt(discriminant)) / 0.3;
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
    const y = fn(value);
    if (Number.isFinite(y)) {
      points.push({ x: xScale(value), y: yScale(y) });
    }
  }

  const lastY = fn(max);
  if (points[points.length - 1]?.x !== xScale(max) && Number.isFinite(lastY)) {
    points.push({ x: xScale(max), y: yScale(lastY) });
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

function profitAreaFill(value: number): string {
  return value >= 0 ? PROFIT_FILL : LOSS_FILL;
}

function profitAreaStroke(value: number): string {
  return value >= 0 ? PROFIT_STROKE : LOSS_STROKE;
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

export default function PerfectCompetitionPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [marketDemand, setMarketDemand] = useState<number>(baseline.marketDemand);
  const [firmQuantity, setFirmQuantity] = useState<number>(baseline.firmQuantity);
  const [marketPriceControl, setMarketPriceControl] = useState<number>(baseline.marketPrice);
  const [shutdownView, setShutdownView] = useState<ShutdownView>(baseline.shutdownView);
  const [longRunState, setLongRunState] = useState<LongRunState>(baseline.longRunState);
  const [longRunTime, setLongRunTime] = useState<number>(baseline.longRunTime);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];

  const marketScales = getChartScales({ xMax: MARKET_X_MAX, yMax: MARKET_Y_MAX });
  const firmScales = getChartScales({ xMax: FIRM_X_MAX, yMax: FIRM_Y_MAX });

  const demandIntercept = demandInterceptFromSlider(marketDemand);
  const step1MarketQ = equilibriumQuantity(demandIntercept, STEP1_SUPPLY_INTERCEPT);
  const step1Price = equilibriumPrice(demandIntercept, STEP1_SUPPLY_INTERCEPT);
  const step1OptimalQ = optimalFirmQuantity(step1Price);
  const step1CurrentQ = clamp(firmQuantity, 0, FIRM_X_MAX);
  const step1CurrentATC = step1CurrentQ > 0 ? atc(step1CurrentQ) : 0;
  const step1Profit = step1CurrentQ > 0 ? (step1Price - step1CurrentATC) * step1CurrentQ : 0;

  const step1DemandCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (value) => demandPrice(value, demandIntercept),
    marketScales.xScale,
    marketScales.yScale,
  );
  const step1SupplyCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (value) => supplyPrice(value, STEP1_SUPPLY_INTERCEPT),
    marketScales.xScale,
    marketScales.yScale,
  );
  const mcCurve = buildCurve(FIRM_X_MAX, 0.2, mc, firmScales.xScale, firmScales.yScale);
  const atcCurve = buildCurve(FIRM_X_MAX, 0.2, atc, firmScales.xScale, firmScales.yScale);
  const avcCurve = buildCurve(FIRM_X_MAX, 0.2, avc, firmScales.xScale, firmScales.yScale);
  const step1ProfitArea =
    step1CurrentQ > 0
      ? rectangleArea(
          0,
          step1CurrentQ,
          Math.max(step1Price, step1CurrentATC),
          Math.min(step1Price, step1CurrentATC),
          firmScales.xScale,
          firmScales.yScale,
        )
      : null;
  const step1AlignedPriceTop =
    marketScales.yScale(step1Price) / CHART.height;
  const step1PanelTopChrome =
    STEP1_PANEL_BORDER + STEP1_PANEL_PADDING + STEP1_PANEL_HEADER_HEIGHT + STEP1_PANEL_HEADER_GAP;
  const step1PanelVerticalChrome = step1PanelTopChrome + STEP1_PANEL_PADDING + STEP1_PANEL_BORDER;
  const step1AlignedPriceTopStyle = `calc(${step1AlignedPriceTop * 100}% + ${
    step1PanelTopChrome - step1AlignedPriceTop * step1PanelVerticalChrome
  }px)`;

  const shutdownPrice = clamp(marketPriceControl, STEP2_MIN_MARKET_PRICE, 14);
  const breakEvenQ = 12.5;
  const breakEvenPrice = atc(breakEvenQ);
  const shutdownQMarker = 10;
  const shutdownPriceLevel = avc(shutdownQMarker);
  const step2Produces = shutdownPrice >= shutdownPriceLevel;
  const step2OptimalQ = optimalFirmQuantity(shutdownPrice);
  const step2ProductionQ = step2OptimalQ > 0 ? step2OptimalQ : shutdownQMarker;
  const step2AVC = avc(step2ProductionQ);
  const step2ATC = atc(step2ProductionQ);
  const shutdownLossAFC = step2ATC - step2AVC;
  const productionProfit = (shutdownPrice - step2ATC) * step2ProductionQ;
  const shutdownLoss = TFC;
  const step2Status =
    shutdownPrice >= breakEvenPrice
      ? "盈利 Profit"
      : shutdownPrice >= shutdownPriceLevel
        ? "亏损但继续生产 Loss Minimizing"
        : "停业 Shut Down";
  const step2PerspectiveArea =
    shutdownView === "production-profit-loss"
      ? rectangleArea(
          0,
          step2ProductionQ,
          Math.max(step2ATC, shutdownPrice),
          Math.min(step2ATC, shutdownPrice),
          firmScales.xScale,
          firmScales.yScale,
        )
      : shutdownView === "shutdown-loss"
        ? rectangleArea(
            0,
            step2ProductionQ,
            step2ATC,
            step2AVC,
            firmScales.xScale,
            firmScales.yScale,
          )
        : null;
  const step2PerspectiveFill =
    shutdownView === "production-profit-loss" ? profitAreaFill(productionProfit) : LOSS_FILL;
  const step2PerspectiveStroke =
    shutdownView === "production-profit-loss" ? profitAreaStroke(productionProfit) : LOSS_STROKE;

  const longRunStartIntercept =
    longRunState === "profit" ? 7.5 : longRunState === "loss" ? 2 : LONG_RUN_EQ_SUPPLY_INTERCEPT;
  const currentSupplyIntercept =
    longRunStartIntercept + (LONG_RUN_EQ_SUPPLY_INTERCEPT - longRunStartIntercept) * (longRunTime / 100);
  const longRunMarketQ = equilibriumQuantity(LONG_RUN_DEMAND_INTERCEPT, currentSupplyIntercept);
  const longRunPrice = equilibriumPrice(LONG_RUN_DEMAND_INTERCEPT, currentSupplyIntercept);
  const longRunFirmQ = optimalFirmQuantity(longRunPrice);
  const longRunATC = longRunFirmQ > 0 ? atc(longRunFirmQ) : 0;
  const isSteadyState = longRunState === "equilibrium" || longRunTime === 100;
  const longRunProfit = isSteadyState ? 0 : (longRunFirmQ > 0 ? (longRunPrice - longRunATC) * longRunFirmQ : 0);
  const trendText =
    longRunState === "equilibrium"
      ? "停止进出 No Entry/Exit"
      : longRunState === "profit"
        ? longRunTime < 100
          ? "正有企业涌入 Firms Entering"
          : "停止进出 No Entry/Exit"
        : longRunTime < 100
          ? "正有企业退出 Firms Exiting"
          : "停止进出 No Entry/Exit";
  const longRunCurrentSupplyCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (value) => supplyPrice(value, currentSupplyIntercept),
    marketScales.xScale,
    marketScales.yScale,
  );
  const longRunShadowSupplyCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (value) => supplyPrice(value, longRunStartIntercept),
    marketScales.xScale,
    marketScales.yScale,
  );
  const longRunDemandCurve = buildCurve(
    MARKET_X_MAX,
    1,
    (value) => demandPrice(value, LONG_RUN_DEMAND_INTERCEPT),
    marketScales.xScale,
    marketScales.yScale,
  );
  const longRunProfitArea =
    longRunFirmQ > 0 && Math.abs(longRunProfit) > 0.2
      ? rectangleArea(
          0,
          longRunFirmQ,
          Math.max(longRunPrice, longRunATC),
          Math.min(longRunPrice, longRunATC),
          firmScales.xScale,
          firmScales.yScale,
        )
      : null;
  const step3AlignedPriceTop =
    marketScales.yScale(longRunPrice) / CHART.height;
  const step3AlignedPriceTopStyle = `calc(${step3AlignedPriceTop * 100}% + ${
    step1PanelTopChrome - step3AlignedPriceTop * step1PanelVerticalChrome
  }px)`;

  const metrics =
    step === "price-taker" ? (
      <>
        <MetricCard
          metricKey="step1-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场均衡价格 P_e"
          value={round(step1Price, 2).toFixed(2)}
          accentClassName="text-teal-700"
        />
        <MetricCard
          metricKey="step1-qstar"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业最优产量 q*"
          value={round(step1OptimalQ, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
        <MetricCard
          metricKey="step1-atc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前 ATC"
          value={round(step1CurrentATC, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="step1-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="当前总经济利润"
          value={round(step1Profit, 2).toFixed(2)}
          accentClassName={step1Profit >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(step1Profit >= 0 ? "good" : "loss", step1Profit >= 0 ? "Profit" : "Loss")}
          </div>
        </MetricCard>
      </>
    ) : step === "shutdown" ? (
      <>
        <MetricCard
          metricKey="step2-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场价格 P"
          value={round(shutdownPrice, 2).toFixed(2)}
          accentClassName={step2Produces ? "text-amber-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(
              shutdownPrice >= breakEvenPrice ? "good" : shutdownPrice >= shutdownPriceLevel ? "warn" : "loss",
              step2Status,
            )}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="step2-avc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="平均可变成本 AVC"
          value={round(step2AVC, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="step2-shutdown"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="停业亏损 Loss if shut down"
          value={round(shutdownLoss, 2).toFixed(2)}
          accentClassName={!step2Produces ? "text-emerald-700" : ""}
        >
          <div className="mt-2 text-xs leading-5 text-[var(--muted)]">
            q* = {round(step2ProductionQ, 1).toFixed(1)} 时，AFC = ATC - AVC ={" "}
            {round(shutdownLossAFC, 2).toFixed(2)}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="step2-operating"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="选择生产时利润 / 亏损"
          value={round(productionProfit, 2).toFixed(2)}
          accentClassName={productionProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
        >
          <div className="mt-2">
            {statusPill(
              productionProfit >= 0 ? "good" : "loss",
              productionProfit >= 0 ? "Profit if producing" : "Loss if producing",
            )}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="step3-trend"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="行业企业数量趋势"
          value={trendText}
          accentClassName={
            trendText.includes("Entering")
              ? "text-emerald-700"
              : trendText.includes("Exiting")
                ? "text-rose-700"
                : "text-amber-700"
          }
        />
        <MetricCard
          metricKey="step3-market-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场总产量 Q_M"
          value={round(longRunMarketQ, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="step3-firm-q"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="单个企业产量 q"
          value={round(longRunFirmQ, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="step3-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业经济利润"
          value={round(longRunProfit, 2).toFixed(2)}
          accentClassName={
            Math.abs(longRunProfit) < 0.2
              ? "text-amber-700"
              : longRunProfit > 0
                ? "text-emerald-700"
                : "text-rose-700"
          }
        >
          <div className="mt-2">
            {Math.abs(longRunProfit) < 0.2
              ? statusPill("warn", "Normal Profit")
              : statusPill(longRunProfit > 0 ? "good" : "loss", longRunProfit > 0 ? "Economic Profit" : "Economic Loss")}
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
            Unit 3.6 / 3.7
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            完全竞争与企业决策
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把价格接受者、短期停业规则和长期进入退出放进一套连续的并排图里，让完全竞争从纸面图形变成一套会动的因果系统。
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
          {step === "price-taker" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场需求平移 Market Demand</span>
                <input
                  type="range"
                  min="40"
                  max="90"
                  step="1"
                  value={marketDemand}
                  onChange={(event) => setMarketDemand(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{marketDemand}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">企业目标产量 Firm q</span>
                <input
                  type="range"
                  min="0"
                  max={FIRM_X_MAX}
                  step="0.1"
                  value={firmQuantity}
                  onChange={(event) => setFirmQuantity(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(firmQuantity, 1).toFixed(1)}</strong>
              </label>
            </>
          ) : step === "shutdown" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场价格设定 Market Price</span>
                <input
                  type="range"
                  min={STEP2_MIN_MARKET_PRICE}
                  max="14"
                  step="0.1"
                  value={shutdownPrice}
                  onChange={(event) =>
                    setMarketPriceControl(clamp(Number(event.target.value), STEP2_MIN_MARKET_PRICE, 14))
                  }
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{round(shutdownPrice, 1).toFixed(1)}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">辅助计算透视</span>
                <ButtonGroup<ShutdownView>
                  value={shutdownView}
                  onChange={(next) => setShutdownView(next as ShutdownView)}
                  options={[
                    { value: "none", label: "无" },
                    { value: "production-profit-loss", label: "选择生产时的利润和亏损" },
                    { value: "shutdown-loss", label: "显示停业时的亏损" },
                  ]}
                />
              </label>
            </>
          ) : (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">市场初始状态</span>
                <ButtonGroup<LongRunState>
                  value={longRunState}
                  onChange={(next) => {
                    setLongRunState(next as LongRunState);
                    setLongRunTime(0);
                  }}
                  options={[
                { value: "profit", label: "行业存在经济利润" },
                { value: "loss", label: "行业存在经济亏损" },
                { value: "equilibrium", label: "长期均衡" },
              ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">长期时间推移 Long-run Adjustment</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={longRunTime}
                  onChange={(event) => setLongRunTime(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{longRunTime}%</strong>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "price-taker") {
                setMarketDemand(baseline.marketDemand);
                setFirmQuantity(baseline.firmQuantity);
              } else if (step === "shutdown") {
                setMarketPriceControl(baseline.marketPrice);
                setShutdownView(baseline.shutdownView);
              } else {
                setLongRunState(baseline.longRunState);
                setLongRunTime(baseline.longRunTime);
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

          {step === "price-taker" ? (
            <div className="relative grid gap-4 xl:grid-cols-2">
              <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
                <div
                  className="absolute left-[calc(50%_-_0.5rem)] right-[calc(50%_-_0.5rem)] border-t-4 border-dashed opacity-95"
                  style={{ top: step1AlignedPriceTopStyle, borderColor: PRICE_GUIDE_STROKE }}
                />
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 flex h-7 items-center text-sm font-semibold text-[var(--muted)]">市场图 Market</div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={MARKET_X_MAX} yMax={MARKET_Y_MAX} xLabel="市场总量 (Market Q)" yLabel="价格 (Price)" />
                  <path
                    d={linePointsToPath(step1DemandCurve)}
                    className={`${curveClass} ${hoveredMetric === "step1-price" ? "stroke-[5]" : ""}`}
                    stroke="rgba(59,130,246,0.94)"
                  />
                  <path
                    d={linePointsToPath(step1SupplyCurve)}
                    className={`${curveClass} ${hoveredMetric === "step1-profit" ? "stroke-[5]" : ""}`}
                    stroke="rgba(249,115,22,0.94)"
                  />
                  <line
                    x1={marketScales.xScale(0)}
                    y1={marketScales.yScale(step1Price)}
                    x2={marketScales.xScale(step1MarketQ)}
                    y2={marketScales.yScale(step1Price)}
                    className={`${dashedClass} [stroke:#0f766e] [stroke-width:4]`}
                  />
                  <line
                    x1={marketScales.xScale(step1MarketQ)}
                    y1={marketScales.yScale(step1Price)}
                    x2={marketScales.xScale(MARKET_X_MAX)}
                    y2={marketScales.yScale(step1Price)}
                    className={`${dashedClass} [stroke-width:4] opacity-95`}
                    stroke={PRICE_GUIDE_STROKE}
                  />
                  <line
                    x1={marketScales.xScale(step1MarketQ)}
                    y1={marketScales.yScale(0)}
                    x2={marketScales.xScale(step1MarketQ)}
                    y2={marketScales.yScale(step1Price)}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={marketScales.xScale(step1MarketQ)}
                    cy={marketScales.yScale(step1Price)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text x={marketScales.xScale(22)} y={marketScales.yScale(demandPrice(22, demandIntercept) + 1.8)} className={chartLabelClass}>
                    D
                  </text>
                  <text x={marketScales.xScale(118)} y={marketScales.yScale(supplyPrice(118, STEP1_SUPPLY_INTERCEPT) + 1.6)} className={chartLabelClass}>
                    S
                  </text>
                  <text x={marketScales.xScale(step1MarketQ) + 10} y={marketScales.yScale(step1Price) - 10} className={chartSmallLabelClass}>
                    P_e = {round(step1Price, 2)}
                  </text>
                </svg>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 flex h-7 items-center justify-between text-sm font-semibold text-[var(--muted)]">
                  <span>企业图 Firm</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">MR=D=AR=P</span>
                </div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={FIRM_X_MAX} yMax={FIRM_Y_MAX} xLabel="企业产量 (Firm q)" yLabel="价格与成本 (Price/Cost)" />

                  {step1ProfitArea ? (
                    <path
                      d={areaPointsToPath(step1ProfitArea)}
                      fill={profitAreaFill(step1Profit)}
                      stroke={profitAreaStroke(step1Profit)}
                      strokeWidth={hoveredMetric === "step1-profit" ? 3 : 2}
                      className={hoveredMetric === "step1-profit" ? "animate-pulse" : ""}
                    />
                  ) : null}

                  <path d={linePointsToPath(mcCurve)} className={`${curveClass} [stroke:#f97316]`} />
                  <path
                    d={linePointsToPath(atcCurve)}
                    className={`${curveClass} ${hoveredMetric === "step1-atc" ? "stroke-[5]" : ""}`}
                    stroke="rgba(99,102,241,0.92)"
                  />
                  <line
                    x1="0"
                    y1={firmScales.yScale(step1Price)}
                    x2={firmScales.xScale(0)}
                    y2={firmScales.yScale(step1Price)}
                    className={`${dashedClass} [stroke-width:4] opacity-95`}
                    stroke={PRICE_GUIDE_STROKE}
                  />
                  <line
                    x1={firmScales.xScale(0)}
                    y1={firmScales.yScale(step1Price)}
                    x2={firmScales.xScale(FIRM_X_MAX)}
                    y2={firmScales.yScale(step1Price)}
                    className={`${hoveredMetric === "step1-price" ? "[stroke-width:6]" : "[stroke-width:4]"} [stroke:#0f766e]`}
                  />
                  <line
                    x1={firmScales.xScale(step1OptimalQ)}
                    y1={firmScales.yScale(0)}
                    x2={firmScales.xScale(step1OptimalQ)}
                    y2={firmScales.yScale(step1Price)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <circle
                    cx={firmScales.xScale(step1OptimalQ)}
                    cy={firmScales.yScale(step1Price)}
                    r={hoveredMetric === "step1-qstar" ? "22" : "18"}
                    fill="rgba(245,158,11,0.18)"
                    stroke="rgba(245,158,11,0.82)"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <line
                    x1={firmScales.xScale(step1CurrentQ)}
                    y1={firmScales.yScale(0)}
                    x2={firmScales.xScale(step1CurrentQ)}
                    y2={firmScales.yScale(Math.max(step1Price, step1CurrentATC))}
                    className={`${gridLineClass} ${dashedClass}`}
                  />
                  <circle
                    cx={firmScales.xScale(step1OptimalQ)}
                    cy={firmScales.yScale(step1Price)}
                    r="10"
                    fill="rgba(245,158,11,0.92)"
                    className={markerStrokeClass}
                  />
                  <circle
                    cx={firmScales.xScale(step1CurrentQ)}
                    cy={firmScales.yScale(step1CurrentATC)}
                    r="7"
                    fill="rgba(99,102,241,0.92)"
                    className={markerStrokeClass}
                  />
                  <text x={firmScales.xScale(16)} y={firmScales.yScale(mc(16) + 0.8)} className={chartLabelClass}>
                    MC
                  </text>
                  <text x={firmScales.xScale(15)} y={firmScales.yScale(atc(15) + 1.2)} className={chartLabelClass}>
                    ATC
                  </text>
                  <text
                    x={firmScales.xScale(FIRM_X_MAX)}
                    y={firmScales.yScale(step1Price) - 10}
                    textAnchor="end"
                    className={chartLabelClass}
                  >
                    MR=D=AR=P
                  </text>
                  <text
                    x={firmScales.xScale(step1OptimalQ) + 12}
                    y={firmScales.yScale(step1Price) - 18}
                    className="fill-amber-700 text-[13px] font-bold"
                  >
                    MC = MR
                  </text>
                  <text x={firmScales.xScale(step1OptimalQ)} y={firmScales.yScale(0) + 18} textAnchor="middle" className="fill-amber-700 text-[12px] font-semibold">
                    q*
                  </text>
                </svg>
              </div>
            </div>
          ) : step === "shutdown" ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
              <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                <ChartFrame xMax={FIRM_X_MAX} yMax={FIRM_Y_MAX} xLabel="企业产量 (Firm q)" yLabel="价格与成本 (Price/Cost)" />

                {step2PerspectiveArea ? (
                  <path
                    d={areaPointsToPath(step2PerspectiveArea)}
                    fill={step2PerspectiveFill}
                    stroke={step2PerspectiveStroke}
                    strokeWidth={hoveredMetric === "step2-operating" || hoveredMetric === "step2-shutdown" ? 3 : 2}
                    className={
                      hoveredMetric === "step2-operating" || hoveredMetric === "step2-shutdown" ? "animate-pulse" : ""
                    }
                  />
                ) : null}

                <path d={linePointsToPath(mcCurve)} className={`${curveClass} [stroke:#f97316]`} />
                <path d={linePointsToPath(atcCurve)} className={`${curveClass} [stroke:#6366f1]`} />
                <path
                  d={linePointsToPath(avcCurve)}
                  className={`${curveClass} ${hoveredMetric === "step2-avc" ? "stroke-[5]" : ""}`}
                  stroke="rgba(59,130,246,0.94)"
                />

                <line
                  x1={firmScales.xScale(0)}
                  y1={firmScales.yScale(shutdownPrice)}
                  x2={firmScales.xScale(FIRM_X_MAX)}
                  y2={firmScales.yScale(shutdownPrice)}
                  className={`${hoveredMetric === "step2-price" ? "[stroke-width:6]" : "[stroke-width:4]"} [stroke:#0f766e]`}
                />
                <line
                  x1={firmScales.xScale(breakEvenQ)}
                  y1={firmScales.yScale(0)}
                  x2={firmScales.xScale(breakEvenQ)}
                  y2={firmScales.yScale(breakEvenPrice)}
                  className={`${gridLineClass} ${dashedClass}`}
                />
                <line
                  x1={firmScales.xScale(shutdownQMarker)}
                  y1={firmScales.yScale(0)}
                  x2={firmScales.xScale(shutdownQMarker)}
                  y2={firmScales.yScale(shutdownPriceLevel)}
                  className={`${gridLineClass} ${dashedClass}`}
                />
                <circle
                  cx={firmScales.xScale(step2ProductionQ)}
                  cy={firmScales.yScale(shutdownPrice)}
                  r={hoveredMetric === "step2-price" ? "22" : "18"}
                  fill="rgba(245,158,11,0.18)"
                  stroke="rgba(245,158,11,0.82)"
                  strokeWidth="2"
                  className="animate-pulse"
                />
                <circle
                  cx={firmScales.xScale(step2ProductionQ)}
                  cy={firmScales.yScale(shutdownPrice)}
                  r="10"
                  fill="rgba(245,158,11,0.92)"
                  className={markerStrokeClass}
                />

                {shutdownView === "shutdown-loss" ? (
                  <>
                    <line
                      x1={firmScales.xScale(step2ProductionQ)}
                      y1={firmScales.yScale(0)}
                      x2={firmScales.xScale(step2ProductionQ)}
                      y2={firmScales.yScale(step2ATC)}
                      className={`${dashedClass} [stroke:#475569] [stroke-width:3]`}
                    />
                    <line
                      x1={firmScales.xScale(step2ProductionQ)}
                      y1={firmScales.yScale(step2AVC)}
                      x2={firmScales.xScale(step2ProductionQ)}
                      y2={firmScales.yScale(step2ATC)}
                      className={`${hoveredMetric === "step2-shutdown" ? "[stroke-width:7]" : "[stroke-width:5]"} [stroke:#e11d48]`}
                    />
                    <circle
                      cx={firmScales.xScale(step2ProductionQ)}
                      cy={firmScales.yScale(step2ATC)}
                      r="7"
                      fill="rgba(99,102,241,0.92)"
                      className={markerStrokeClass}
                    />
                    <circle
                      cx={firmScales.xScale(step2ProductionQ)}
                      cy={firmScales.yScale(step2AVC)}
                      r="7"
                      fill="rgba(59,130,246,0.94)"
                      className={markerStrokeClass}
                    />
                    <text
                      x={firmScales.xScale(step2ProductionQ) + 10}
                      y={firmScales.yScale((step2ATC + step2AVC) / 2)}
                      className="fill-rose-700 text-[12px] font-semibold"
                    >
                      AFC = ATC - AVC
                    </text>
                  </>
                ) : (
                  <>
                    <line
                      x1={firmScales.xScale(step2ProductionQ)}
                      y1={firmScales.yScale(0)}
                      x2={firmScales.xScale(step2ProductionQ)}
                      y2={firmScales.yScale(Math.max(step2ATC, shutdownPrice))}
                      className={`${dashedClass} [stroke:#475569] [stroke-width:3]`}
                    />
                    <circle
                      cx={firmScales.xScale(step2ProductionQ)}
                      cy={firmScales.yScale(step2ATC)}
                      r="7"
                      fill="rgba(99,102,241,0.92)"
                      className={markerStrokeClass}
                    />
                  </>
                )}

                <text x={firmScales.xScale(15.7)} y={firmScales.yScale(mc(15.7) + 0.8)} className={chartLabelClass}>
                  MC
                </text>
                <text x={firmScales.xScale(14.5)} y={firmScales.yScale(atc(14.5) + 1.1)} className={chartLabelClass}>
                  ATC
                </text>
                <text x={firmScales.xScale(14)} y={firmScales.yScale(avc(14) - 0.8)} className={chartLabelClass}>
                  AVC
                </text>
                <text
                  x={firmScales.xScale(step2ProductionQ) + 12}
                  y={firmScales.yScale(shutdownPrice) - 18}
                  className="fill-amber-700 text-[13px] font-bold"
                >
                  MC = MR
                </text>
                <text x={firmScales.xScale(breakEvenQ)} y={firmScales.yScale(breakEvenPrice) - 10} textAnchor="middle" className="fill-indigo-700 text-[12px] font-semibold">
                  Break-even
                </text>
                <text x={firmScales.xScale(shutdownQMarker)} y={firmScales.yScale(shutdownPriceLevel) - 10} textAnchor="middle" className="fill-sky-700 text-[12px] font-semibold">
                  Shut-down
                </text>
              </svg>
            </div>
          ) : (
            <div className="relative grid gap-4 xl:grid-cols-2">
              <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
                <div
                  className="absolute left-[calc(50%_-_0.5rem)] right-[calc(50%_-_0.5rem)] border-t-4 border-dashed opacity-95"
                  style={{ top: step3AlignedPriceTopStyle, borderColor: PRICE_GUIDE_STROKE }}
                />
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 flex h-7 items-center justify-between text-sm font-semibold text-[var(--muted)]">
                  <span>市场图 Market</span>
                  <span className="rounded-full bg-[rgba(31,42,55,0.08)] px-3 py-1 text-xs text-[var(--ink)]">{trendText}</span>
                </div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={MARKET_X_MAX} yMax={MARKET_Y_MAX} xLabel="市场总量 (Market Q)" yLabel="价格 (Price)" />

                  <path d={linePointsToPath(longRunDemandCurve)} className={`${curveClass} [stroke:#3b82f6]`} />
                  <path
                    d={linePointsToPath(longRunShadowSupplyCurve)}
                    className={`${curveClass} ${dashedClass}`}
                    stroke="rgba(148,163,184,0.95)"
                  />
                  <path
                    d={linePointsToPath(longRunCurrentSupplyCurve)}
                    className={`${curveClass} ${hoveredMetric === "step3-trend" ? "stroke-[5]" : ""}`}
                    stroke="rgba(249,115,22,0.94)"
                  />
                  <line
                    x1={marketScales.xScale(0)}
                    y1={marketScales.yScale(longRunPrice)}
                    x2={marketScales.xScale(longRunMarketQ)}
                    y2={marketScales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke:#0f766e] [stroke-width:4]`}
                  />
                  <line
                    x1={marketScales.xScale(longRunMarketQ)}
                    y1={marketScales.yScale(longRunPrice)}
                    x2={marketScales.xScale(MARKET_X_MAX)}
                    y2={marketScales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke-width:4] opacity-95`}
                    stroke={PRICE_GUIDE_STROKE}
                  />
                  <circle
                    cx={marketScales.xScale(longRunMarketQ)}
                    cy={marketScales.yScale(longRunPrice)}
                    r="8"
                    className={`${markerStrokeClass} ${pointMarkerClass}`}
                  />
                  <text x={marketScales.xScale(26)} y={marketScales.yScale(demandPrice(26, LONG_RUN_DEMAND_INTERCEPT) + 1.4)} className={chartLabelClass}>
                    D
                  </text>
                  <text x={marketScales.xScale(118)} y={marketScales.yScale(supplyPrice(118, currentSupplyIntercept) + 1.3)} className={chartLabelClass}>
                    S₂
                  </text>
                  <text x={marketScales.xScale(118)} y={marketScales.yScale(supplyPrice(118, longRunStartIntercept) - 1.4)} className={chartSmallLabelClass}>
                    S₁
                  </text>
                </svg>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
                <div className="mb-2 flex h-7 items-center justify-between text-sm font-semibold text-[var(--muted)]">
                  <span>企业图 Firm</span>
                  {Math.abs(longRunProfit) < 0.2 ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                      Zero Economic Profit
                    </span>
                  ) : null}
                </div>
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className={chartSvgClass} role="img">
                  <ChartFrame xMax={FIRM_X_MAX} yMax={FIRM_Y_MAX} xLabel="企业产量 (Firm q)" yLabel="价格与成本 (Price/Cost)" />

                  {longRunProfitArea ? (
                    <path
                      d={areaPointsToPath(longRunProfitArea)}
                      fill={profitAreaFill(longRunProfit)}
                      stroke={profitAreaStroke(longRunProfit)}
                      strokeWidth={hoveredMetric === "step3-profit" ? 3 : 2}
                      className={hoveredMetric === "step3-profit" ? "animate-pulse" : ""}
                    />
                  ) : null}

                  <path d={linePointsToPath(mcCurve)} className={`${curveClass} [stroke:#f97316]`} />
                  <path d={linePointsToPath(atcCurve)} className={`${curveClass} [stroke:#6366f1]`} />
                  <line
                    x1="0"
                    y1={firmScales.yScale(longRunPrice)}
                    x2={firmScales.xScale(0)}
                    y2={firmScales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke-width:4] opacity-95`}
                    stroke={PRICE_GUIDE_STROKE}
                  />
                  <line
                    x1={firmScales.xScale(0)}
                    y1={firmScales.yScale(longRunPrice)}
                    x2={firmScales.xScale(FIRM_X_MAX)}
                    y2={firmScales.yScale(longRunPrice)}
                    className={`${hoveredMetric === "step3-profit" ? "[stroke-width:6]" : "[stroke-width:4]"} [stroke:#0f766e]`}
                  />
                  <line
                    x1={firmScales.xScale(longRunFirmQ)}
                    y1={firmScales.yScale(0)}
                    x2={firmScales.xScale(longRunFirmQ)}
                    y2={firmScales.yScale(longRunPrice)}
                    className={`${dashedClass} [stroke:#f59e0b] [stroke-width:4]`}
                  />
                  <circle
                    cx={firmScales.xScale(longRunFirmQ)}
                    cy={firmScales.yScale(longRunPrice)}
                    r={hoveredMetric === "step3-firm-q" ? "22" : "18"}
                    fill="rgba(245,158,11,0.18)"
                    stroke="rgba(245,158,11,0.82)"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <circle
                    cx={firmScales.xScale(longRunFirmQ)}
                    cy={firmScales.yScale(longRunPrice)}
                    r="10"
                    fill="rgba(245,158,11,0.92)"
                    className={markerStrokeClass}
                  />

                  <text x={firmScales.xScale(16)} y={firmScales.yScale(mc(16) + 0.8)} className={chartLabelClass}>
                    MC
                  </text>
                  <text x={firmScales.xScale(15)} y={firmScales.yScale(atc(15) + 1.1)} className={chartLabelClass}>
                    ATC
                  </text>
                  <text
                    x={firmScales.xScale(FIRM_X_MAX)}
                    y={firmScales.yScale(longRunPrice) + 18}
                    textAnchor="end"
                    className={chartLabelClass}
                  >
                    MR=D=AR=P
                  </text>
                  <text
                    x={firmScales.xScale(longRunFirmQ) + 12}
                    y={firmScales.yScale(longRunPrice) - 18}
                    className="fill-amber-700 text-[13px] font-bold"
                  >
                    MC = MR
                  </text>

                  {Math.abs(longRunProfit) < 0.2 ? (
                    <>
                      <line
                        x1={firmScales.xScale(longRunFirmQ)}
                        y1={firmScales.yScale(longRunPrice)}
                        x2={firmScales.xScale(FIRM_X_MAX - 0.5)}
                        y2={firmScales.yScale(longRunPrice) - 36}
                        className={`${dashedClass} [stroke:#b45309] [stroke-width:3]`}
                      />
                      <line
                        x1={firmScales.xScale(longRunFirmQ)}
                        y1={firmScales.yScale(longRunPrice)}
                        x2={firmScales.xScale(FIRM_X_MAX - 0.5)}
                        y2={firmScales.yScale(longRunPrice) - 4}
                        className={`${dashedClass} [stroke:#0f766e] [stroke-width:3]`}
                      />
                      <text x={firmScales.xScale(FIRM_X_MAX - 0.3)} y={firmScales.yScale(longRunPrice) - 42} textAnchor="end" className="fill-amber-700 text-[12px] font-semibold">
                        P = min ATC
                      </text>
                      <text x={firmScales.xScale(FIRM_X_MAX - 0.3)} y={firmScales.yScale(longRunPrice) - 10} textAnchor="end" className="fill-teal-700 text-[12px] font-semibold">
                        P = MC
                      </text>
                    </>
                  ) : null}

                  {Math.abs(longRunProfit) < 0.2 && hoveredMetric === "step3-profit" ? (
                    <text
                      x={firmScales.xScale(10)}
                      y={firmScales.yScale(15.9)}
                      textAnchor="middle"
                      className="fill-amber-700 text-[12px] font-semibold"
                    >
                      正常利润：机会成本已被补偿
                    </text>
                  ) : null}
                </svg>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{metrics}</div>
        </section>
      </main>
    </div>
  );
}
