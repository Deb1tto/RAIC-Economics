"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

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
  equilibriumPointClass,
  externalityAreaClass,
  gridLineClass,
  inputClass,
  labelStackClass,
  markerStrokeClass,
  metricLabelClass,
  primaryButtonClass,
  producerAreaClass,
  rangeClass,
  socialPointClass,
  surfaceClass,
  supplyCurveClass,
  consumerAreaClass,
} from "../../../components/ui-classes";
import { ButtonGroup } from "../../../components/button-group";

type LessonStep = "market" | "failure" | "policy";
type Scenario =
  | "negative-production"
  | "positive-production"
  | "negative-consumption"
  | "positive-consumption";
type Domain = "production" | "consumption";
type Sign = "negative" | "positive";
type PolicyKind = "tax" | "subsidy";
type Equilibrium = {
  q: number;
  p: number;
};
type MetricKey =
  | "market-qm"
  | "market-pm"
  | "market-cs"
  | "market-ps"
  | "failure-qm"
  | "failure-qs"
  | "failure-gap"
  | "failure-dwl"
  | "policy-level"
  | "policy-qm"
  | "policy-dwl"
  | "policy-government"
  | "policy-consumer-price"
  | "policy-firm-price";

type ScenarioMeta = {
  label: string;
  domain: Domain;
  sign: Sign;
  policyKind: PolicyKind;
  externalityLabel: string;
  distortionLabel: string;
};

const lessonSteps: Array<{ id: LessonStep; title: string; summary: string }> = [
  {
    id: "market",
    title: "步骤一：自由市场",
    summary: "先建立 MPB 与 MPC 决定私人市场均衡的基础模型。",
  },
  {
    id: "failure",
    title: "步骤二：市场失灵",
    summary: "引入外部性，让学生看见 Q_M 与 Q_S 的偏离和 DWL。",
  },
  {
    id: "policy",
    title: "步骤三：政府干预",
    summary: "通过税收或补贴把私人激励重新推回社会最优。",
  },
];

const scenarioMeta: Record<Scenario, ScenarioMeta> = {
  "negative-production": {
    label: "负的生产外部性 Negative Production",
    domain: "production",
    sign: "negative",
    policyKind: "tax",
    externalityLabel: "外部边际成本",
    distortionLabel: "过度生产",
  },
  "positive-production": {
    label: "正的生产外部性 Positive Production",
    domain: "production",
    sign: "positive",
    policyKind: "subsidy",
    externalityLabel: "外部边际收益",
    distortionLabel: "生产不足",
  },
  "negative-consumption": {
    label: "负的消费外部性 Negative Consumption",
    domain: "consumption",
    sign: "negative",
    policyKind: "tax",
    externalityLabel: "外部边际成本",
    distortionLabel: "过度消费",
  },
  "positive-consumption": {
    label: "正的消费外部性 Positive Consumption",
    domain: "consumption",
    sign: "positive",
    policyKind: "subsidy",
    externalityLabel: "外部边际收益",
    distortionLabel: "消费不足",
  },
};

const baseline = {
  step: "market" as LessonStep,
  scenario: "negative-production" as Scenario,
  gap: 10,
  policy: 0,
};

const params = {
  demandIntercept: 84,
  demandSlope: 0.9,
  supplyIntercept: 12,
  supplySlope: 0.75,
} as const;

function lineDown(intercept: number, slope: number, q: number): number {
  return intercept - slope * q;
}

function lineUp(intercept: number, slope: number, q: number): number {
  return intercept + slope * q;
}

function solve(
  interceptDown: number,
  slopeDown: number,
  interceptUp: number,
  slopeUp: number,
): Equilibrium {
  const q = (interceptDown - interceptUp) / (slopeDown + slopeUp);
  const p = interceptDown - slopeDown * q;
  return { q, p };
}

function triangleArea(base: number, height: number): number {
  return 0.5 * Math.max(base, 0) * Math.max(height, 0);
}

function buildLinePoints(
  fn: (q: number) => number,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): Point[] {
  const points: Point[] = [];
  for (let q = 0; q <= 100; q += 2) {
    points.push({ x: xScale(q), y: yScale(fn(q)) });
  }
  return points;
}

function statusPill(ok: boolean, text: string) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
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

export default function ExternalitiesPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [scenario, setScenario] = useState<Scenario>(baseline.scenario);
  const [gap, setGap] = useState<number>(baseline.gap);
  const [policy, setPolicy] = useState<number>(baseline.policy);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);

  const meta = scenarioMeta[scenario];
  const showExternality = step !== "market";
  const showPolicy = step === "policy";

  const mpbIntercept = params.demandIntercept;
  const mpcIntercept = params.supplyIntercept;
  const msbIntercept =
    showExternality && meta.domain === "consumption"
      ? mpbIntercept + (meta.sign === "positive" ? gap : -gap)
      : mpbIntercept;
  const mscIntercept =
    showExternality && meta.domain === "production"
      ? mpcIntercept + (meta.sign === "negative" ? gap : -gap)
      : mpcIntercept;

  const adjustedMpcIntercept = showPolicy ? mpcIntercept - policy : mpcIntercept;

  const marketEq = solve(mpbIntercept, params.demandSlope, mpcIntercept, params.supplySlope);
  const socialEq = solve(msbIntercept, params.demandSlope, mscIntercept, params.supplySlope);
  const currentEq = showPolicy
    ? solve(mpbIntercept, params.demandSlope, adjustedMpcIntercept, params.supplySlope)
    : marketEq;

  const currentSocialBenefit = lineDown(msbIntercept, params.demandSlope, currentEq.q);
  const currentSocialCost = lineUp(mscIntercept, params.supplySlope, currentEq.q);
  const dwl =
    showExternality
      ? triangleArea(
          Math.abs(socialEq.q - currentEq.q),
          Math.abs(currentSocialBenefit - currentSocialCost),
        )
      : 0;

  const cs =
    step === "market"
      ? triangleArea(marketEq.q, mpbIntercept - marketEq.p)
      : 0;
  const ps =
    step === "market"
      ? triangleArea(marketEq.q, marketEq.p - mpcIntercept)
      : 0;

  const policyMagnitude = Math.abs(policy);
  const recommendedPolicySign = meta.policyKind === "tax" ? -1 : 1;
  const policyMatchesDirection =
    !showPolicy || policy === 0 ? false : Math.sign(policy) === recommendedPolicySign;
  const isPerfectCorrection =
    showExternality && showPolicy && Math.abs(currentEq.q - socialEq.q) < 0.35;

  let consumersPay = currentEq.p;
  let firmsReceive = currentEq.p;
  let governmentValue = 0;
  let governmentLabel = "政府收支";

  if (showPolicy && policy !== 0) {
    governmentValue = policyMagnitude * currentEq.q;
    if (policy < 0) {
      consumersPay = currentEq.p;
      firmsReceive = currentEq.p - policyMagnitude;
      governmentLabel = "政府税收收入";
    } else {
      consumersPay = currentEq.p;
      firmsReceive = currentEq.p + policyMagnitude;
      governmentLabel = "政府补贴支出";
    }
  }

  const { xScale, yScale } = getChartScales({ xMax: 100, yMax: 100 });
  const mpbLine = buildLinePoints(
    (q) => lineDown(mpbIntercept, params.demandSlope, q),
    xScale,
    yScale,
  );
  const mpcLine = buildLinePoints(
    (q) => lineUp(mpcIntercept, params.supplySlope, q),
    xScale,
    yScale,
  );
  const msbLine = buildLinePoints(
    (q) => lineDown(msbIntercept, params.demandSlope, q),
    xScale,
    yScale,
  );
  const mscLine = buildLinePoints(
    (q) => lineUp(mscIntercept, params.supplySlope, q),
    xScale,
    yScale,
  );
  const adjustedPrivateLine = buildLinePoints(
    (q) => lineUp(adjustedMpcIntercept, params.supplySlope, q),
    xScale,
    yScale,
  );

  const marketX = xScale(marketEq.q);
  const marketY = yScale(marketEq.p);
  const socialX = xScale(socialEq.q);
  const socialY = yScale(socialEq.p);
  const currentX = xScale(currentEq.q);
  const currentY = yScale(currentEq.p);

  const dwlArea: Point[] = [
    { x: currentX, y: yScale(currentSocialBenefit) },
    { x: currentX, y: yScale(currentSocialCost) },
    { x: socialX, y: socialY },
  ];

  const governmentArea: Point[] =
    showPolicy && policy !== 0
      ? [
          { x: xScale(0), y: yScale(consumersPay) },
          { x: currentX, y: yScale(consumersPay) },
          { x: currentX, y: yScale(firmsReceive) },
          { x: xScale(0), y: yScale(firmsReceive) },
        ]
      : [];

  const feedback =
    step === "market"
      ? "在没有外部性的情况下，私人边际收益 MPB 与私人边际成本 MPC 的交点就是市场均衡。此时 Q_M 对应的资源配置没有效率损失，CS 与 PS 的和最大。"
      : step === "failure"
        ? `现在我们引入了 ${meta.label}。市场仍然只根据 MPB 与 MPC 决策，所以产量停在 Q_M；但社会真正有效率的位置在 MSB = MSC 的 Q_S。两者之间的三角形就是 DWL。`
        : `现在进入政府干预阶段。双向滑块向左表示单位税，向右表示单位补贴。对于当前情境，正确方向是${meta.policyKind === "tax" ? "向左征税" : "向右补贴"}。当政策力度刚好等于 ${meta.externalityLabel} 时，Q_M' 会回到 Q_S，DWL 消失。`;
  const chartTitle =
    step === "market"
      ? "私人市场均衡图"
      : step === "failure"
        ? "外部性导致的市场失灵"
        : "政府干预纠偏过程";
  const chartSubtitle =
    step === "market"
      ? "先读懂 MPB 与 MPC 如何共同决定价格和数量。"
      : step === "failure"
        ? `${meta.label} 让私人均衡偏离社会最优，DWL 开始出现。`
        : `拖动政策力度，观察 ${meta.policyKind === "tax" ? "税收" : "补贴"} 如何把数量拉回 Q_S。`;

  const metrics =
    step === "market" ? (
      <>
        <MetricCard
          metricKey="market-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场产量 Q_M"
          value={round(marketEq.q).toFixed(2)}
        />
        <MetricCard
          metricKey="market-pm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="市场价格 P_M"
          value={round(marketEq.p).toFixed(2)}
        />
        <MetricCard
          metricKey="market-cs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者私人剩余 CS"
          value={round(cs).toFixed(2)}
        />
        <MetricCard
          metricKey="market-ps"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="生产者私人剩余 PS"
          value={round(ps).toFixed(2)}
        />
      </>
    ) : step === "failure" ? (
      <>
        <MetricCard
          metricKey="failure-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="私人市场数量 Q_M"
          value={round(marketEq.q).toFixed(2)}
        />
        <MetricCard
          metricKey="failure-qs"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="社会最优数量 Q_S"
          value={round(socialEq.q).toFixed(2)}
        >
          <div className="mt-2">{statusPill(false, "Q_M ≠ Q_S")}</div>
        </MetricCard>
        <MetricCard
          metricKey="failure-gap"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label={meta.externalityLabel}
          value={gap.toFixed(2)}
        />
        <MetricCard
          metricKey="failure-dwl"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="无谓损失 DWL"
          value={round(dwl).toFixed(2)}
          accentClassName="text-rose-700"
        />
      </>
    ) : (
      <>
        <MetricCard
          metricKey="policy-level"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label={`政策数值: ${policy < 0 ? "单位税" : policy > 0 ? "单位补贴" : "无干预"}`}
          value={policyMagnitude.toFixed(2)}
        />
        <MetricCard
          metricKey="policy-qm"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="干预后市场数量 Q_M'"
          value={round(currentEq.q).toFixed(2)}
        >
          <div className="mt-2">
            {statusPill(isPerfectCorrection, isPerfectCorrection ? "Q_M' = Q_S" : "Q_M' ≠ Q_S")}
          </div>
        </MetricCard>
        <MetricCard
          metricKey="policy-dwl"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="实时 DWL"
          value={round(dwl).toFixed(2)}
          accentClassName={isPerfectCorrection ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          metricKey="policy-government"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label={governmentLabel}
          value={round(governmentValue).toFixed(2)}
        />
        <MetricCard
          metricKey="policy-consumer-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="消费者实际支付价格"
          value={round(consumersPay).toFixed(2)}
        />
        <MetricCard
          metricKey="policy-firm-price"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="厂商收到的净价格"
          value={round(firmsReceive).toFixed(2)}
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
            Unit 6.2
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            外部性与政府干预
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            把教材中的逻辑拆成三步：先看私人市场均衡，再引入外部性形成市场失灵，最后用税收或补贴纠偏。
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
                  if (item.id !== "policy") {
                    setPolicy(0);
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

        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{feedback}</p>
      </section>

      <main className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${surfaceClass} rounded-[24px] p-6`}>
          {step !== "market" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">外部性类型</span>
                <ButtonGroup<Scenario>
                  value={scenario}
                  onChange={(next) => {
                    setHoveredMetric(null);
                    setScenario(next);
                    setPolicy(0);
                  }}
                  options={Object.entries(scenarioMeta).map(([value, item]) => ({
                    value: value as Scenario,
                    label: item.label,
                  }))}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">{scenarioMeta[scenario].externalityLabel}</span>
                <input
                  type="range"
                  min="4"
                  max="18"
                  step="1"
                  value={gap}
                  onChange={(event) => setGap(Number(event.target.value))}
                  className={rangeClass}
                />
                <strong className="text-[var(--accent)]">{gap}</strong>
              </label>
            </>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
              当前步骤不需要额外参数。
            </div>
          )}

          {step === "policy" ? (
            <label className={labelStackClass}>
              <span className="font-bold">政策力度（左税右补）</span>
              <input
                type="range"
                min="-18"
                max="18"
                step="1"
                value={policy}
                onChange={(event) => setPolicy(Number(event.target.value))}
                className={rangeClass}
              />
              <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                <span>Tax ←</span>
                <span>0</span>
                <span>→ Subsidy</span>
              </div>
              <strong className="text-[var(--accent)]">
                {policy < 0
                  ? `Tax ${Math.abs(policy)}`
                  : policy > 0
                    ? `Subsidy ${policy}`
                    : "No Policy"}
              </strong>
              <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-sm leading-6 text-[var(--muted)]">
                <p className="m-0">
                  正确方向: {meta.policyKind === "tax" ? "向左征税" : "向右补贴"}
                </p>
                <p className="mt-2 mb-0">
                  当前判定:{" "}
                  {policy === 0
                    ? "尚未干预"
                    : policyMatchesDirection
                      ? "方向正确，正在缩小 DWL"
                      : "方向相反，会放大失真"}
                </p>
              </div>
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              setScenario(baseline.scenario);
              setGap(baseline.gap);
              setPolicy(0);
            }}
            className={primaryButtonClass}
          >
            重置
          </button>
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
            aria-label="Externalities and government intervention chart"
          >
          <ChartFrame xMax={100} yMax={100} xLabel="Q (Quantity)" yLabel="P / Cost / Benefit" />

          <path d={linePointsToPath(mpbLine)} className={`${curveClass} ${demandCurveClass}`} />
          <path d={linePointsToPath(mpcLine)} className={`${curveClass} ${supplyCurveClass}`} />

          {showExternality && meta.domain === "consumption" ? (
            <path d={linePointsToPath(msbLine)} className={`${curveClass} ${accentCurveClass}`} />
          ) : null}
          {showExternality && meta.domain === "production" ? (
            <path d={linePointsToPath(mscLine)} className={`${curveClass} ${accentCurveClass}`} />
          ) : null}

          {showPolicy && policy !== 0 ? (
            <path
              d={linePointsToPath(adjustedPrivateLine)}
              className={`${curveClass} ${accentCurveClass} ${dashedClass}`}
            />
          ) : null}

          {step === "market" ? (
            <>
              <path
                d={areaPointsToPath([
                  { x: xScale(0), y: yScale(mpbIntercept) },
                  { x: marketX, y: marketY },
                  { x: xScale(0), y: marketY },
                ])}
                className={consumerAreaClass}
              />
              <path
                d={areaPointsToPath([
                  { x: xScale(0), y: marketY },
                  { x: marketX, y: marketY },
                  { x: xScale(0), y: yScale(mpcIntercept) },
                ])}
                className={producerAreaClass}
              />
            </>
          ) : null}

          {showExternality && dwl > 0.01 ? (
            <>
              <path d={areaPointsToPath(dwlArea)} className={externalityAreaClass} />
              <text
                x={socialX + 10}
                y={yScale((currentSocialBenefit + currentSocialCost) / 2)}
                className={chartSmallLabelClass}
              >
                DWL
              </text>
            </>
          ) : null}

          {showPolicy && policy !== 0 ? (
            <>
              <path
                d={areaPointsToPath(governmentArea)}
                className="fill-[rgba(31,110,107,0.18)]"
              />
              <text
                x={xScale(currentEq.q / 2)}
                y={yScale((consumersPay + firmsReceive) / 2)}
                textAnchor="middle"
                className={chartSmallLabelClass}
              >
                Govt
              </text>
            </>
          ) : null}

          <circle cx={marketX} cy={marketY} r="7" className={`${markerStrokeClass} ${equilibriumPointClass}`} />
          <line x1={marketX} y1={yScale(0)} x2={marketX} y2={marketY} className={`${gridLineClass} ${dashedClass}`} />
          <line x1={xScale(0)} y1={marketY} x2={marketX} y2={marketY} className={`${gridLineClass} ${dashedClass}`} />
          <text x={marketX + 8} y={marketY - 10} className={chartSmallLabelClass}>
            M
          </text>

          {showExternality ? (
            <>
              <circle cx={socialX} cy={socialY} r="7" className={`${markerStrokeClass} ${socialPointClass}`} />
              <line x1={socialX} y1={yScale(0)} x2={socialX} y2={socialY} className={`${gridLineClass} ${dashedClass}`} />
              <text x={socialX + 8} y={socialY - 10} className={chartSmallLabelClass}>
                S
              </text>
            </>
          ) : null}

          {showPolicy ? (
            <>
              <circle
                cx={currentX}
                cy={currentY}
                r="7"
                className={`${markerStrokeClass} ${accentCurveClass} fill-[var(--accent)]`}
              />
              <line x1={currentX} y1={yScale(0)} x2={currentX} y2={currentY} className={`${gridLineClass} ${dashedClass}`} />
              <text x={currentX + 8} y={currentY + 18} className={chartSmallLabelClass}>
                M&apos;
              </text>
            </>
          ) : null}

          <text x={xScale(8)} y={yScale(lineDown(mpbIntercept, params.demandSlope, 8) + 5)} className={chartLabelClass}>
            MPB
          </text>
          <text x={xScale(70)} y={yScale(lineUp(mpcIntercept, params.supplySlope, 70) - 6)} className={chartLabelClass}>
            MPC
          </text>

          {showExternality && meta.domain === "consumption" ? (
            <text
              x={xScale(8)}
              y={yScale(lineDown(msbIntercept, params.demandSlope, 8) - 10)}
              className={chartLabelClass}
            >
              MSB
            </text>
          ) : null}
          {showExternality && meta.domain === "production" ? (
            <text
              x={xScale(62)}
              y={yScale(lineUp(mscIntercept, params.supplySlope, 62) + 12)}
              className={chartLabelClass}
            >
              MSC
            </text>
          ) : null}
          {showPolicy && policy !== 0 ? (
            <text
              x={xScale(52)}
              y={yScale(lineUp(adjustedMpcIntercept, params.supplySlope, 52) - 10)}
              className={chartSmallLabelClass}
            >
              {policy < 0 ? "MPC + Tax" : "MPC - Subsidy"}
            </text>
          ) : null}

          {hoveredMetric === "market-qm" || hoveredMetric === "failure-qm" ? (
            <g className="pointer-events-none">
              <line
                x1={marketX}
                y1={yScale(0)}
                x2={marketX}
                y2={marketY}
                className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <circle cx={marketX} cy={marketY} r="9" className="fill-[var(--accent)] stroke-white [stroke-width:3]" />
            </g>
          ) : null}

          {hoveredMetric === "market-pm" ? (
            <g className="pointer-events-none">
              <line
                x1={xScale(0)}
                y1={marketY}
                x2={marketX}
                y2={marketY}
                className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <circle cx={marketX} cy={marketY} r="9" className="fill-[var(--accent)] stroke-white [stroke-width:3]" />
            </g>
          ) : null}

          {hoveredMetric === "market-cs" ? (
            <path
              d={areaPointsToPath([
                { x: xScale(0), y: yScale(mpbIntercept) },
                { x: marketX, y: marketY },
                { x: xScale(0), y: marketY },
              ])}
              className="pointer-events-none fill-[rgba(209,95,131,0.4)] stroke-[var(--accent-3)] [stroke-width:2]"
            />
          ) : null}

          {hoveredMetric === "market-ps" ? (
            <path
              d={areaPointsToPath([
                { x: xScale(0), y: marketY },
                { x: marketX, y: marketY },
                { x: xScale(0), y: yScale(mpcIntercept) },
              ])}
              className="pointer-events-none fill-[rgba(76,183,171,0.36)] stroke-[var(--accent-2)] [stroke-width:2]"
            />
          ) : null}

          {hoveredMetric === "failure-qs" ? (
            <g className="pointer-events-none">
              <line
                x1={socialX}
                y1={yScale(0)}
                x2={socialX}
                y2={socialY}
                className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <circle cx={socialX} cy={socialY} r="9" className="fill-[var(--accent)] stroke-white [stroke-width:3]" />
            </g>
          ) : null}

          {hoveredMetric === "failure-gap" ? (
            meta.domain === "production" ? (
              <g className="pointer-events-none">
                <path
                  d={linePointsToPath(mscLine)}
                  className="fill-none [stroke:var(--accent)] [stroke-width:6]"
                />
                <path
                  d={linePointsToPath(mpcLine)}
                  className="fill-none [stroke:var(--accent-2)] [stroke-width:5] opacity-80"
                />
              </g>
            ) : (
              <g className="pointer-events-none">
                <path
                  d={linePointsToPath(msbLine)}
                  className="fill-none [stroke:var(--accent)] [stroke-width:6]"
                />
                <path
                  d={linePointsToPath(mpbLine)}
                  className="fill-none [stroke:var(--accent-3)] [stroke-width:5] opacity-80"
                />
              </g>
            )
          ) : null}

          {hoveredMetric === "failure-dwl" || hoveredMetric === "policy-dwl" ? (
            <path
              d={areaPointsToPath(dwlArea)}
              className="pointer-events-none fill-[rgba(191,91,44,0.34)] stroke-[var(--accent)] [stroke-width:2]"
            />
          ) : null}

          {hoveredMetric === "policy-level" && showPolicy && policy !== 0 ? (
            <path
              d={linePointsToPath(adjustedPrivateLine)}
              className="pointer-events-none fill-none [stroke:var(--accent)] [stroke-width:6] [stroke-dasharray:10_8]"
            />
          ) : null}

          {hoveredMetric === "policy-qm" ? (
            <g className="pointer-events-none">
              <line
                x1={currentX}
                y1={yScale(0)}
                x2={currentX}
                y2={currentY}
                className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <circle cx={currentX} cy={currentY} r="9" className="fill-[var(--accent)] stroke-white [stroke-width:3]" />
            </g>
          ) : null}

          {hoveredMetric === "policy-government" && showPolicy && policy !== 0 ? (
            <path
              d={areaPointsToPath(governmentArea)}
              className="pointer-events-none fill-[rgba(31,110,107,0.34)] stroke-[var(--accent-2)] [stroke-width:2]"
            />
          ) : null}

          {hoveredMetric === "policy-consumer-price" && showPolicy ? (
            <g className="pointer-events-none">
              <line
                x1={xScale(0)}
                y1={yScale(consumersPay)}
                x2={currentX}
                y2={yScale(consumersPay)}
                className="[stroke:var(--accent)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <text x={xScale(1)} y={yScale(consumersPay) - 8} className={chartSmallLabelClass}>
                Consumers Pay
              </text>
            </g>
          ) : null}

          {hoveredMetric === "policy-firm-price" && showPolicy ? (
            <g className="pointer-events-none">
              <line
                x1={xScale(0)}
                y1={yScale(firmsReceive)}
                x2={currentX}
                y2={yScale(firmsReceive)}
                className="[stroke:var(--accent-2)] [stroke-width:4] [stroke-dasharray:8_6]"
              />
              <text x={xScale(1)} y={yScale(firmsReceive) - 8} className={chartSmallLabelClass}>
                Firms Receive
              </text>
            </g>
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
