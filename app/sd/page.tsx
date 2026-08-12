"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChartFrame } from "../../components/chart-frame";
import {
  CHART,
  areaPointsToPath,
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
  consumerAreaClass,
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
  producerAreaClass,
  rangeClass,
  surfaceClass,
  supplyCurveClass,
} from "../../components/ui-classes";

type LessonStep = "equilibrium" | "adjustment" | "policy";
type ShockType =
  | "none"
  | "demand-increase"
  | "demand-decrease"
  | "supply-increase"
  | "supply-decrease";
type PolicyType = "free" | "ceiling" | "floor" | "tax" | "subsidy";
type MetricKey =
  | "eq-pe"
  | "eq-qe"
  | "eq-cs"
  | "eq-ps"
  | "eq-total"
  | "adj-qd"
  | "adj-qs"
  | "adj-gap"
  | "adj-actual"
  | "policy-pc"
  | "policy-pp"
  | "policy-gov"
  | "policy-dwl";

type SurplusConfig = {
  cs: boolean;
  ps: boolean;
  total: boolean;
};

type Equilibrium = {
  q: number;
  p: number;
};

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
}> = [
  {
    id: "equilibrium",
    title: "步骤一：市场均衡与剩余",
    summary: "先建立自由市场均衡下的价格、数量与总剩余基准。",
    description:
      "在完全竞争市场中，供给与需求交点决定均衡价格和数量。此时消费者剩余与生产者剩余之和最大化，市场实现配置效率，没有福利被浪费。",
  },
  {
    id: "adjustment",
    title: "步骤二：市场失衡与调整",
    summary: "再看价格偏离均衡或曲线平移时，短缺、过剩和新均衡是怎样形成的。",
    description:
      "价格不在均衡点时，需求量和供给量会出现差距，实际交易量只能由较短的一边决定。同时，需求或供给自身平移会改变均衡位置，价格机制会把市场带往新的交点。",
  },
  {
    id: "policy",
    title: "步骤三：政府干预与扭曲",
    summary: "最后引入价格管制、税收和补贴，观察福利如何被重新切分并出现 DWL。",
    description:
      "政府政策会改变买卖双方的激励，使实际交易量偏离自由市场均衡。只要交易量离开原均衡点，就会出现无谓损失，税收和补贴还会额外创造政府收支区域。",
  },
];

const baseline = {
  step: "equilibrium" as LessonStep,
  surplusConfig: { cs: true, ps: true, total: true } as SurplusConfig,
  trialPrice: 50,
  shockType: "none" as ShockType,
  policyTypes: ["free"] as PolicyType[],
  policyLevel: 0,
};

const AXIS_MAX = 100;
const BASE_DEMAND_INTERCEPT = 100;
const BASE_SUPPLY_INTERCEPT = 0;
const SHIFT_SIZE = 20;

function demandPrice(q: number, intercept: number): number {
  return intercept - q;
}

function supplyPrice(q: number, intercept: number): number {
  return q + intercept;
}

function demandQuantity(price: number, intercept: number): number {
  return Math.max(0, Math.min(AXIS_MAX, intercept - price));
}

function supplyQuantity(price: number, intercept: number): number {
  return Math.max(0, Math.min(AXIS_MAX, price - intercept));
}

function solveEquilibrium(demandIntercept: number, supplyIntercept: number): Equilibrium {
  const q = (demandIntercept - supplyIntercept) / 2;
  return { q, p: q + supplyIntercept };
}

function trapezoidArea(base: number, heightA: number, heightB: number): number {
  return 0.5 * Math.max(base, 0) * Math.max(heightA + heightB, 0);
}

function consumerSurplus(quantity: number, price: number, demandIntercept: number): number {
  return trapezoidArea(
    quantity,
    Math.max(demandIntercept - price, 0),
    Math.max(demandPrice(quantity, demandIntercept) - price, 0),
  );
}

function producerSurplus(quantity: number, price: number, supplyIntercept: number): number {
  return trapezoidArea(
    quantity,
    Math.max(price - supplyIntercept, 0),
    Math.max(price - supplyPrice(quantity, supplyIntercept), 0),
  );
}

function buildLinePoints(
  fn: (q: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const points: Point[] = [];
  for (let q = 0; q <= AXIS_MAX; q += 0.5) {
    const p = fn(q);
    if (p >= 0 && p <= AXIS_MAX) {
      points.push({ x: xScale(q), y: yScale(p) });
    }
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

export default function SupplyDemandInterventionPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [surplusConfig, setSurplusConfig] = useState<SurplusConfig>({
    cs: true,
    ps: true,
    total: true,
  });
  const [tradeQ, setTradeQ] = useState<number>(50);
  const [tradeP, setTradeP] = useState<number>(50);
  const [baseEqQ] = useState<number>(50);
  const [baseEqP] = useState<number>(50);

  const [trialPrice, setTrialPrice] = useState<number>(baseline.trialPrice);
  const [shockType, setShockType] = useState<ShockType>(baseline.shockType);
  const [policyTypes, setPolicyTypes] = useState<PolicyType[]>(baseline.policyTypes);
  const [policyLevel, setPolicyLevel] = useState<number>(baseline.policyLevel);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const primaryPolicy = policyTypes.find((t) => t !== "free") || "free";

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const { xScale, yScale: rawYScale } = getChartScales({ xMax: AXIS_MAX, yMax: AXIS_MAX });
  const yScale = (val: number) => rawYScale(Math.max(0, Math.min(AXIS_MAX, val)));

  const currentDemandIntercept = baseEqP + baseEqQ;
  const currentSupplyIntercept = baseEqP - baseEqQ;

  const baseEq = { q: baseEqQ, p: baseEqP };
  const eqCS = consumerSurplus(tradeQ, tradeP, currentDemandIntercept);
  const eqPS = producerSurplus(tradeQ, tradeP, currentSupplyIntercept);

  const demandShock =
    shockType === "demand-increase" ? SHIFT_SIZE : shockType === "demand-decrease" ? -SHIFT_SIZE : 0;
  const supplyShock =
    shockType === "supply-increase" ? -SHIFT_SIZE : shockType === "supply-decrease" ? SHIFT_SIZE : 0;
  const activeDemandIntercept = currentDemandIntercept + demandShock;
  const activeSupplyIntercept = currentSupplyIntercept + supplyShock;
  const activeEq = solveEquilibrium(activeDemandIntercept, activeSupplyIntercept);

  const qd = demandQuantity(trialPrice, activeDemandIntercept);
  const qs = supplyQuantity(trialPrice, activeSupplyIntercept);
  const actualTradeQ = Math.min(qd, qs);
  const actualGap = Math.abs(qd - qs);
  const gapLabel =
    qd > qs ? "短缺 Shortage" : qs > qd ? "过剩 Surplus" : "市场出清";
  const adjCS = consumerSurplus(actualTradeQ, trialPrice, activeDemandIntercept);
  const adjPS = producerSurplus(actualTradeQ, trialPrice, activeSupplyIntercept);

  const controlDemandAtActual = demandPrice(actualTradeQ, activeDemandIntercept);
  const controlSupplyAtActual = supplyPrice(actualTradeQ, activeSupplyIntercept);
  const adjustmentDwl =
    actualTradeQ === activeEq.q
      ? 0
      : 0.5 * Math.abs(activeEq.q - actualTradeQ) * Math.abs(controlDemandAtActual - controlSupplyAtActual);

  let policyPc = baseEq.p;
  let policyPp = baseEq.p;
  let policyQ = baseEq.q;
  let govValue = 0;
  let policyDwl = 0;
  let legalPrice = policyLevel;
  let shiftedSupplyIntercept = currentSupplyIntercept;

  const hasCeiling = policyTypes.includes("ceiling");
  const hasFloor = policyTypes.includes("floor");
  const hasTax = policyTypes.includes("tax");
  const hasSubsidy = policyTypes.includes("subsidy");

  if (hasTax) shiftedSupplyIntercept += policyLevel / 5;
  if (hasSubsidy) shiftedSupplyIntercept -= policyLevel / 5;

  const newEq = solveEquilibrium(currentDemandIntercept, shiftedSupplyIntercept);
  policyQ = newEq.q;
  policyPc = newEq.p;
  policyPp = newEq.p;

  if (hasCeiling) {
    legalPrice = Math.min(policyLevel, newEq.p);
    policyQ = supplyQuantity(legalPrice, shiftedSupplyIntercept);
    policyPc = legalPrice;
    policyPp = policyPc - (hasTax ? policyLevel / 5 : 0) + (hasSubsidy ? policyLevel / 5 : 0);
  } else if (hasFloor) {
    legalPrice = Math.max(policyLevel, newEq.p);
    policyQ = demandQuantity(legalPrice, currentDemandIntercept);
    policyPc = legalPrice;
    policyPp = policyPc - (hasTax ? policyLevel / 5 : 0) + (hasSubsidy ? policyLevel / 5 : 0);
  } else {
    if (hasTax) policyPp -= policyLevel / 5;
    if (hasSubsidy) policyPp += policyLevel / 5;
  }

  if (hasTax) govValue += (policyLevel / 5) * policyQ;
  if (hasSubsidy) govValue -= (policyLevel / 5) * policyQ;

  policyDwl =
    0.5 *
    Math.abs(baseEq.q - policyQ) *
    Math.abs(demandPrice(policyQ, currentDemandIntercept) - supplyPrice(policyQ, currentSupplyIntercept));

  const metrics =
    step === "equilibrium" ? (
      <>
        <MetricCard
          metricKey="eq-pe"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="均衡价格 P_e"
          value={round(baseEq.p, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="eq-qe"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="均衡数量 Q_e"
          value={round(baseEq.q, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="eq-cs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者剩余 CS"
          value={round(eqCS, 2).toFixed(2)}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="eq-ps"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="生产者剩余 PS"
          value={round(eqPS, 2).toFixed(2)}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="eq-total"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="总剩余 Total"
          value={round(eqCS + eqPS, 2).toFixed(2)}
          accentClassName="text-amber-700"
        />
      </>
    ) : step === "adjustment" ? (
      <>
        <MetricCard
          metricKey="adj-qd"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="需求量 Q_d"
          value={round(qd, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="adj-qs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="供给量 Q_s"
          value={round(qs, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="adj-gap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场缺口"
          value={round(actualGap, 2).toFixed(2)}
          accentClassName={actualGap > 0 ? "text-rose-700" : "text-emerald-700"}
        >
          <div className="mt-2">{statusPill(actualGap > 0 ? "warn" : "good", gapLabel)}</div>
        </MetricCard>
        <MetricCard
          metricKey="adj-actual"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="实际交易量"
          value={round(actualTradeQ, 2).toFixed(2)}
        />
      </>
    ) : (
      <>
        <MetricCard
          metricKey="policy-pc"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="买方支付价格 P_c"
          value={round(policyPc, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="policy-pp"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="卖方净收价格 P_p"
          value={round(policyPp, 2).toFixed(2)}
        />
        <MetricCard
          metricKey="policy-gov"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="政府总收入/支出"
          value={round(govValue, 2).toFixed(2)}
          accentClassName={govValue > 0 ? "text-amber-700" : ""}
        />
        <MetricCard
          metricKey="policy-dwl"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失 DWL"
          value={round(policyDwl, 2).toFixed(2)}
          accentClassName={policyDwl > 0 ? "text-rose-700" : ""}
        />
      </>
    );

  const baseDemandLine = buildLinePoints((q) => demandPrice(q, BASE_DEMAND_INTERCEPT), xScale, yScale);
  const baseSupplyLine = buildLinePoints((q) => supplyPrice(q, BASE_SUPPLY_INTERCEPT), xScale, yScale);
  const activeDemandLine = buildLinePoints((q) => demandPrice(q, activeDemandIntercept), xScale, yScale);
  const activeSupplyLine = buildLinePoints((q) => supplyPrice(q, activeSupplyIntercept), xScale, yScale);
  const shiftedSupplyLine = buildLinePoints((q) => supplyPrice(q, shiftedSupplyIntercept), xScale, yScale);

  const csArea: Point[] = [
    { x: xScale(0), y: yScale(currentDemandIntercept) },
    { x: xScale(tradeQ), y: yScale(demandPrice(tradeQ, currentDemandIntercept)) },
    { x: xScale(tradeQ), y: yScale(tradeP) },
    { x: xScale(0), y: yScale(tradeP) },
  ];
  const psArea: Point[] = [
    { x: xScale(0), y: yScale(tradeP) },
    { x: xScale(tradeQ), y: yScale(tradeP) },
    { x: xScale(tradeQ), y: yScale(supplyPrice(tradeQ, currentSupplyIntercept)) },
    { x: xScale(0), y: yScale(currentSupplyIntercept) },
  ];
  const totalArea: Point[] = [
    { x: xScale(0), y: yScale(currentDemandIntercept) },
    { x: xScale(tradeQ), y: yScale(demandPrice(tradeQ, currentDemandIntercept)) },
    { x: xScale(tradeQ), y: yScale(supplyPrice(tradeQ, currentSupplyIntercept)) },
    { x: xScale(0), y: yScale(currentSupplyIntercept) },
  ];
  const adjTradeArea: Point[] = [
    { x: xScale(0), y: yScale(trialPrice) },
    { x: xScale(actualTradeQ), y: yScale(trialPrice) },
    { x: xScale(actualTradeQ), y: yScale(controlSupplyAtActual) },
    { x: xScale(0), y: yScale(activeSupplyIntercept) },
  ];
  const policyGovArea: Point[] = [
    { x: xScale(0), y: yScale(policyPc) },
    { x: xScale(policyQ), y: yScale(policyPc) },
    { x: xScale(policyQ), y: yScale(policyPp) },
    { x: xScale(0), y: yScale(policyPp) },
  ];

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
            Unit 2.6 / 2.7 / 2.8
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            市场均衡、失衡与政府干预
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从自由市场的均衡与剩余出发，再看失衡如何形成，最后分析政府管制、税收与补贴如何切分福利并制造无谓损失。
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
          {step === "equilibrium" ? (
            <>
              <div className={labelStackClass}>
                <span className="font-bold">剩余面积展示</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={surplusConfig.cs}
                      onChange={(e) => setSurplusConfig({ ...surplusConfig, cs: e.target.checked })}
                    />
                    消费者剩余 (CS)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={surplusConfig.ps}
                      onChange={(e) => setSurplusConfig({ ...surplusConfig, ps: e.target.checked })}
                    />
                    生产者剩余 (PS)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={surplusConfig.total}
                      onChange={(e) => setSurplusConfig({ ...surplusConfig, total: e.target.checked })}
                    />
                    总剩余 (Total Surplus)
                  </label>
                </div>
              </div>

              <label className={labelStackClass}>
                <span className="font-bold">交易量 (Trade Quantity)</span>
                <input
                  type="range"
                  min="0"
                  max={baseEqQ}
                  step="1"
                  value={tradeQ}
                  onChange={(event) => setTradeQ(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{tradeQ}</strong>
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">交易价格 (Trade Price)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={tradeP}
                  onChange={(event) => setTradeP(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{tradeP}</strong>
              </label>
            </>
          ) : step === "adjustment" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">试探性市场价格</span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={trialPrice}
                  onChange={(event) => setTrialPrice(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{trialPrice}</strong>
              </label>

              <div className={labelStackClass}>
                <span className="font-bold">外部冲击模拟</span>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "none", label: "无变动" },
                    { value: "demand-increase", label: "需求增加" },
                    { value: "demand-decrease", label: "需求减少" },
                    { value: "supply-increase", label: "供给增加" },
                    { value: "supply-decrease", label: "供给减少" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="shockType"
                        value={opt.value}
                        checked={shockType === opt.value}
                        onChange={(e) => setShockType(e.target.value as ShockType)}
                        className="accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={labelStackClass}>
                <span className="font-bold">政府干预政策</span>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "free", label: "自由市场" },
                    { value: "ceiling", label: "有效价格上限" },
                    { value: "floor", label: "有效价格下限" },
                    { value: "tax", label: "单位税" },
                    { value: "subsidy", label: "单位补贴" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="policyType"
                        value={opt.value}
                        checked={primaryPolicy === opt.value}
                        onChange={(e) => {
                          const val = e.target.value as PolicyType;
                          setPolicyTypes([val]);
                          if (val === "free") {
                            setPolicyLevel(0);
                          } else if (val === "ceiling") {
                            setPolicyLevel(50);
                          } else if (val === "floor") {
                            setPolicyLevel(50);
                          }
                        }}
                        className="accent-[var(--accent)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className={labelStackClass}>
                <span className="font-bold">政策干预力度</span>
                <input
                  type="range"
                  disabled={primaryPolicy === "free"}
                  min={primaryPolicy === "ceiling" ? "10" : primaryPolicy === "floor" ? "50" : "0"}
                  max={primaryPolicy === "ceiling" ? "50" : primaryPolicy === "floor" ? "90" : "100"}
                  step="1"
                  value={primaryPolicy === "free" ? 0 : (primaryPolicy === "ceiling" ? 60 - policyLevel : policyLevel)}
                  onChange={(event) => {
                    const val = Number(event.target.value);
                    setPolicyLevel(primaryPolicy === "ceiling" ? 60 - val : val);
                  }}
                  className={`${rangeClass} ${primaryPolicy === "free" ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                <strong className="text-[var(--accent)]">
                  {primaryPolicy === "free"
                    ? "-"
                    : (primaryPolicy === "tax" || primaryPolicy === "subsidy"
                        ? `${round(policyLevel / 5, 1)} / unit`
                        : `价格 ${policyLevel}`)}
                </strong>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              if (step === "equilibrium") {
                setSurplusConfig({ cs: true, ps: true, total: true });
                setTradeQ(50);
                setTradeP(50);
              } else if (step === "adjustment") {
                setTrialPrice(baseline.trialPrice);
              } else {
                if (primaryPolicy === "ceiling" || primaryPolicy === "floor") {
                  setPolicyLevel(50);
                } else {
                  setPolicyLevel(0);
                }
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
              {step === "equilibrium"
                ? "完全竞争市场均衡与总剩余"
                : step === "adjustment"
                  ? "市场失衡与缺口 (Shortage & Surplus)"
                  : "政府干预与无谓损失 (DWL)"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {step === "equilibrium"
                ? "观察自由市场出清时，买卖双方如何把整个福利三角形完整分掉。"
                : step === "adjustment"
                  ? "调整市场价格并施加外部冲击，观察短缺、过剩与新旧均衡如何同时出现。"
                  : "切换价格管制、税收和补贴，观察交易量、政府收支与 DWL 如何被重新切开。"}
            </p>
          </div>

          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className={chartSvgClass}
            aria-label="Market equilibrium and government intervention chart"
          >
            <defs>
              <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(31,42,55,0.4)" strokeWidth="3" />
              </pattern>
            </defs>
            <ChartFrame xMax={AXIS_MAX} yMax={AXIS_MAX} xLabel="数量 (Quantity, Q)" yLabel="价格 (Price, P)" />

            {step === "equilibrium" ? (
              <>
                {surplusConfig.total && (
                  <path d={areaPointsToPath(totalArea)} fill="url(#hatch)" stroke="rgba(31,42,55,0.1)" />
                )}
                {surplusConfig.cs && (
                  <path d={areaPointsToPath(csArea)} className={consumerAreaClass} />
                )}
                {surplusConfig.ps && (
                  <path d={areaPointsToPath(psArea)} className={producerAreaClass} />
                )}

                <path d={linePointsToPath(activeDemandLine)} className={`${curveClass} ${demandCurveClass}`} />
                <text x={xScale(95)} y={yScale(demandPrice(95, currentDemandIntercept)) - 10} className={chartLabelClass}>D</text>
                <path d={linePointsToPath(activeSupplyLine)} className={`${curveClass} ${supplyCurveClass}`} />
                <text x={xScale(95)} y={yScale(supplyPrice(95, currentSupplyIntercept)) - 10} className={chartLabelClass}>S</text>

                <circle
                  cx={xScale(baseEq.q)}
                  cy={yScale(baseEq.p)}
                  r="7"
                  className={`${markerStrokeClass} ${pointMarkerClass}`}
                />

                <line x1={xScale(baseEq.q)} y1={yScale(0)} x2={xScale(baseEq.q)} y2={yScale(baseEq.p)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={xScale(0)} y1={yScale(baseEq.p)} x2={xScale(baseEq.q)} y2={yScale(baseEq.p)} className={`${gridLineClass} ${dashedClass}`} />
                <text x={xScale(baseEq.q) + 8} y={yScale(baseEq.p) - 10} className={chartSmallLabelClass}>
                  E
                </text>
                <text x={xScale(baseEq.q)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                  Q_e
                </text>
                <text x={xScale(0) - 10} y={yScale(baseEq.p) + 4} textAnchor="end" className={chartSmallLabelClass}>
                  P_e
                </text>

                {tradeQ < baseEq.q && (
                  <>
                    <line x1={xScale(tradeQ)} y1={yScale(0)} x2={xScale(tradeQ)} y2={yScale(tradeP)} className={`${gridLineClass} ${dashedClass} [stroke:var(--accent)]`} />
                    <text x={xScale(tradeQ)} y={yScale(0) + 40} textAnchor="middle" className={`${chartSmallLabelClass} fill-[var(--accent)]`}>
                      Q_trade
                    </text>
                  </>
                )}

                {tradeP !== baseEq.p && (
                  <>
                    <line x1={xScale(0)} y1={yScale(tradeP)} x2={xScale(tradeQ)} y2={yScale(tradeP)} className={`${gridLineClass} ${dashedClass} [stroke:var(--accent)]`} />
                    <text x={xScale(0) - 10} y={yScale(tradeP) + 4} textAnchor="end" className={`${chartSmallLabelClass} fill-[var(--accent)]`}>
                      P_trade
                    </text>
                    <text x={xScale(95)} y={yScale(tradeP) - 8} textAnchor="end" className={chartLabelClass}>
                      {tradeP < baseEq.p ? "Pceilling" : tradeP > baseEq.p ? "Pfloor" : ""}
                    </text>
                  </>
                )}

                {hoveredMetric === "eq-cs" ? (
                  <path
                    d={areaPointsToPath(csArea)}
                    className="fill-[rgba(76,183,171,0.34)] stroke-[var(--accent-2)] [stroke-width:2]"
                  />
                ) : null}

                {hoveredMetric === "eq-ps" ? (
                  <path
                    d={areaPointsToPath(psArea)}
                    className="fill-[rgba(93,164,216,0.26)] stroke-[#3c82d6] [stroke-width:2]"
                  />
                ) : null}

                {hoveredMetric === "eq-total" ? (
                  <path
                    d={areaPointsToPath(totalArea)}
                    className="fill-[rgba(234,187,68,0.26)] stroke-[rgba(234,187,68,0.8)] [stroke-width:2]"
                  />
                ) : null}
              </>
            ) : step === "adjustment" ? (
              <>
                {shockType !== "none" ? (
                  <>
                    <path d={linePointsToPath(baseDemandLine)} className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.34)]`} />
                    <text x={xScale(95)} y={yScale(demandPrice(95, BASE_DEMAND_INTERCEPT)) - 10} className={chartLabelClass}>D</text>
                    <path d={linePointsToPath(baseSupplyLine)} className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.34)]`} />
                    <text x={xScale(95)} y={yScale(supplyPrice(95, BASE_SUPPLY_INTERCEPT)) - 10} className={chartLabelClass}>S</text>
                  </>
                ) : null}
                <path d={linePointsToPath(activeDemandLine)} className={`${curveClass} ${demandCurveClass}`} />
                <text x={xScale(95)} y={yScale(demandPrice(95, activeDemandIntercept)) - 10} className={chartLabelClass}>D</text>
                <path d={linePointsToPath(activeSupplyLine)} className={`${curveClass} ${supplyCurveClass}`} />
                <text x={xScale(95)} y={yScale(supplyPrice(95, activeSupplyIntercept)) - 10} className={chartLabelClass}>S</text>
                <circle cx={xScale(activeEq.q)} cy={yScale(activeEq.p)} r="7" className={`${markerStrokeClass} ${pointMarkerClass}`} />
                <text x={xScale(activeEq.q) + 8} y={yScale(activeEq.p) - 10} className={chartSmallLabelClass}>
                  {shockType === "none" ? "E" : "E1"}
                </text>
                {shockType !== "none" ? (
                  <>
                    <circle cx={xScale(baseEq.q)} cy={yScale(baseEq.p)} r="6" className={`${markerStrokeClass} fill-[rgba(31,42,55,0.7)]`} />
                    <text x={xScale(baseEq.q) + 8} y={yScale(baseEq.p) + 16} className={chartSmallLabelClass}>
                      E0
                    </text>
                  </>
                ) : null}

                <line x1={xScale(0)} y1={yScale(trialPrice)} x2={xScale(AXIS_MAX)} y2={yScale(trialPrice)} className="[stroke:var(--accent)] [stroke-width:3]" />
                <text x={xScale(0) - 10} y={yScale(trialPrice) + 4} textAnchor="end" className={chartSmallLabelClass}>
                  P1
                </text>
                <text x={xScale(95)} y={yScale(trialPrice) - 8} textAnchor="end" className={chartLabelClass}>
                  {trialPrice < activeEq.p ? "Pceilling" : trialPrice > activeEq.p ? "Pfloor" : ""}
                </text>
                <line x1={xScale(qd)} y1={yScale(0)} x2={xScale(qd)} y2={yScale(trialPrice)} className={`${gridLineClass} ${dashedClass}`} />
                <line x1={xScale(qs)} y1={yScale(0)} x2={xScale(qs)} y2={yScale(trialPrice)} className={`${gridLineClass} ${dashedClass}`} />
                <text x={xScale(qd)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                  Q_d
                </text>
                <text x={xScale(qs)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                  Q_s
                </text>
                <line
                  x1={xScale(Math.min(qd, qs))}
                  y1={yScale(trialPrice)}
                  x2={xScale(Math.max(qd, qs))}
                  y2={yScale(trialPrice)}
                  className={`${
                    hoveredMetric === "adj-gap"
                      ? "[stroke:#c64861] [stroke-width:7]"
                      : "[stroke:#c64861] [stroke-width:5]"
                  }`}
                />
                <text
                  x={(xScale(qd) + xScale(qs)) / 2}
                  y={yScale(trialPrice) - 10}
                  textAnchor="middle"
                  className={chartSmallLabelClass}
                >
                  {gapLabel}
                </text>
                <line x1={xScale(actualTradeQ)} y1={yScale(0)} x2={xScale(actualTradeQ)} y2={yScale(trialPrice)} className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]" />
                <text x={xScale(actualTradeQ)} y={yScale(0) + 40} textAnchor="middle" className={chartSmallLabelClass}>
                  Q_actual
                </text>

                {hoveredMetric === "adj-actual" ? (
                  <path d={areaPointsToPath(adjTradeArea)} className="fill-[rgba(76,183,171,0.18)]" />
                ) : null}
              </>
            ) : (
              <>
                <path d={linePointsToPath(baseDemandLine)} className={`${curveClass} ${demandCurveClass}`} />
                <text x={xScale(95)} y={yScale(demandPrice(95, currentDemandIntercept)) - 10} className={chartLabelClass}>D</text>
                <path
                  d={linePointsToPath(hasTax || hasSubsidy ? shiftedSupplyLine : activeSupplyLine)}
                  className={`${curveClass} ${
                    hasTax || hasSubsidy ? accentCurveClass : supplyCurveClass
                  } ${hasTax || hasSubsidy ? dashedClass : ""}`}
                />
                {hasTax && (
                  <text x={xScale(95)} y={yScale(supplyPrice(95, shiftedSupplyIntercept)) - 10} className={chartLabelClass}>Stax</text>
                )}
                {hasSubsidy && (
                  <text x={xScale(95)} y={yScale(supplyPrice(95, shiftedSupplyIntercept)) - 10} className={chartLabelClass}>Ssubsidy</text>
                )}
                {!(hasTax || hasSubsidy) && (
                  <text x={xScale(95)} y={yScale(supplyPrice(95, activeSupplyIntercept)) - 10} className={chartLabelClass}>S</text>
                )}
                {hasTax || hasSubsidy ? (
                  <>
                    <path
                      d={linePointsToPath(activeSupplyLine)}
                      className={`${curveClass} ${dashedClass} [stroke:rgba(31,42,55,0.34)]`}
                    />
                    <text x={xScale(95)} y={yScale(supplyPrice(95, activeSupplyIntercept)) - 10} className={chartLabelClass}>S</text>
                  </>
                ) : null}
                <circle cx={xScale(baseEq.q)} cy={yScale(baseEq.p)} r="6" className={`${markerStrokeClass} fill-[rgba(31,42,55,0.72)]`} />
                <text x={xScale(baseEq.q) + 8} y={yScale(baseEq.p) + 16} className={chartSmallLabelClass}>
                  E
                </text>

                {hasCeiling || hasFloor ? (
                  <>
                    <line
                      x1={xScale(0)}
                      y1={yScale(legalPrice)}
                      x2={xScale(AXIS_MAX)}
                      y2={yScale(legalPrice)}
                      className="[stroke:var(--accent)] [stroke-width:3]"
                    />
                    <text x={xScale(95)} y={yScale(legalPrice) - 8} textAnchor="end" className={chartLabelClass}>
                      {hasCeiling ? "Pceilling" : "Pfloor"}
                    </text>
                    <line
                      x1={xScale(policyQ)}
                      y1={yScale(0)}
                      x2={xScale(policyQ)}
                      y2={yScale(legalPrice)}
                      className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
                    />
                    <text x={xScale(policyQ)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                      Q_actual
                    </text>
                  </>
                ) : hasTax || hasSubsidy ? (
                  <>
                    <line x1={xScale(policyQ)} y1={yScale(0)} x2={xScale(policyQ)} y2={yScale(policyPc)} className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]" />
                    <text x={xScale(policyQ)} y={yScale(0) + 22} textAnchor="middle" className={chartSmallLabelClass}>
                      Q_actual
                    </text>
                    <line x1={xScale(0)} y1={yScale(policyPc)} x2={xScale(policyQ)} y2={yScale(policyPc)} className={`${gridLineClass} ${dashedClass}`} />
                    <line x1={xScale(0)} y1={yScale(policyPp)} x2={xScale(policyQ)} y2={yScale(policyPp)} className={`${gridLineClass} ${dashedClass}`} />
                    <text x={xScale(0) - 10} y={yScale(policyPc) + 4} textAnchor="end" className={chartSmallLabelClass}>
                      P_c
                    </text>
                    <text x={xScale(0) - 10} y={yScale(policyPp) + 4} textAnchor="end" className={chartSmallLabelClass}>
                      P_p
                    </text>
                    <path
                      d={areaPointsToPath(policyGovArea)}
                      className={`${
                        hoveredMetric === "policy-gov"
                          ? "fill-[rgba(234,187,68,0.34)] stroke-[rgba(210,153,18,0.8)] [stroke-width:2]"
                          : "fill-[rgba(234,187,68,0.22)]"
                      }`}
                    />
                    <text x={xScale(policyQ / 2)} y={yScale((policyPc + policyPp) / 2)} textAnchor="middle" className={chartSmallLabelClass}>
                      Govt
                    </text>
                  </>
                ) : null}

                {policyDwl > 0 ? (
                  <path
                    d={areaPointsToPath(
                      hasSubsidy
                        ? [
                            {
                              x: xScale(baseEq.q),
                              y: yScale(demandPrice(baseEq.q, currentDemandIntercept)),
                            },
                            {
                              x: xScale(policyQ),
                              y: yScale(demandPrice(policyQ, currentDemandIntercept)),
                            },
                            { x: xScale(policyQ), y: yScale(policyPp) },
                          ]
                        : [
                            {
                              x: xScale(policyQ),
                              y: yScale(demandPrice(policyQ, currentDemandIntercept)),
                            },
                            {
                              x: xScale(policyQ),
                              y: yScale(
                                hasTax ? policyPp : supplyPrice(policyQ, currentSupplyIntercept),
                              ),
                            },
                            { x: xScale(baseEq.q), y: yScale(baseEq.p) },
                          ],
                    )}
                    className={`${
                      hoveredMetric === "policy-dwl"
                        ? "fill-[rgba(198,72,97,0.34)] stroke-[rgba(198,72,97,0.85)] [stroke-width:2]"
                        : "fill-[rgba(198,72,97,0.24)]"
                    }`}
                  />
                ) : null}
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
