"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import {
  inputClass,
  labelStackClass,
  metricLabelClass,
  primaryButtonClass,
  surfaceClass,
} from "../../components/ui-classes";
import { ButtonGroup } from "../../components/button-group";

type LessonStep = "matrix" | "dominant" | "nash";
type ScenarioId = "pricing" | "advertising";
type Perspective = "A" | "B";
type OpponentMove = 0 | 1;
type SimulationMode = "nash" | "collusion" | "cheating";
type MetricKey =
  | "matrix-a-strategy"
  | "matrix-b-strategy"
  | "matrix-a-profit"
  | "matrix-b-profit"
  | "dominant-a"
  | "dominant-b"
  | "nash-state"
  | "joint-max"
  | "joint-nash";
type CellCoord = { row: 0 | 1; col: 0 | 1 };
type PayoffCell = { a: number; b: number };
type PayoffMatrix = [[PayoffCell, PayoffCell], [PayoffCell, PayoffCell]];
type Scenario = {
  id: ScenarioId;
  title: string;
  description: string;
  strategiesA: [string, string];
  strategiesB: [string, string];
  matrix: PayoffMatrix;
};

const lessonSteps: Array<{
  id: LessonStep;
  title: string;
  summary: string;
  description: string;
  chartTitle: string;
  chartSubtitle: string;
}> = [
  {
    id: "matrix",
    title: "步骤一：认识收益矩阵",
    summary: "先学会读 2x2 收益矩阵，分清谁的收益是谁的。",
    description:
      "寡头市场最重要的不是单条需求曲线，而是企业之间的相互依存。每个格子里前一个数字属于企业 A，后一个数字属于企业 B。先把这件事看熟，后面找策略时才不会把行玩家和列玩家混掉。",
    chartTitle: "寡头企业的收益矩阵",
    chartSubtitle: "点击任意格子读取当前策略组合，悬停时用颜色绑定企业 A 与企业 B 的收益位置。",
  },
  {
    id: "dominant",
    title: "步骤二：寻找占优策略",
    summary: "锁定对手的一种行动，只比较自己那一边的收益。",
    description:
      "找占优策略时，必须先假设对手已经选定了一种行动。然后只看自己的那两个收益，比较哪一个更大。如果无论对手怎么选，你都偏向同一个策略，那么这就是占优策略。",
    chartTitle: "最优反应与占优策略推导",
    chartSubtitle: "切换玩家视角和对手动作，观察遮罩如何屏蔽无关格子，并圈出当前最优反应。",
  },
  {
    id: "nash",
    title: "步骤三：纳什均衡与囚徒困境",
    summary: "把双方最优反应拼起来，找稳定解，再和共谋结果对比。",
    description:
      "纳什均衡不是联合利润最高，而是双方在给定对手选择时都不愿单方面改变的稳定状态。共谋往往能带来更高总利润，但只要单方背叛更有诱惑，合作就会变得很脆弱。",
    chartTitle: "纳什均衡与囚徒困境",
    chartSubtitle: "在同一张矩阵里同时对比纳什均衡、共谋格子，以及单方背叛带来的诱惑箭头。",
  },
];

const scenarios: Record<ScenarioId, Scenario> = {
  pricing: {
    id: "pricing",
    title: "定价博弈",
    description: "高价维持共谋利润，低价则可能抢走市场份额，典型地形成囚徒困境。",
    strategiesA: ["高价", "低价"],
    strategiesB: ["高价", "低价"],
    matrix: [
      [
        { a: 100, b: 100 },
        { a: 40, b: 140 },
      ],
      [
        { a: 140, b: 40 },
        { a: 70, b: 70 },
      ],
    ],
  },
  advertising: {
    id: "advertising",
    title: "广告博弈",
    description: "广告支出会重新分配市场份额，但也可能让双方一起承担更高成本。",
    strategiesA: ["做广告", "不做广告"],
    strategiesB: ["做广告", "不做广告"],
    matrix: [
      [
        { a: 70, b: 70 },
        { a: 55, b: 55 },
      ],
      [
        { a: 45, b: 45 },
        { a: 80, b: 80 },
      ],
    ],
  },
};

const baseline = {
  step: "matrix" as LessonStep,
  scenario: "pricing" as ScenarioId,
  perspective: "A" as Perspective,
  opponentMove: 0 as OpponentMove,
  simulationMode: "nash" as SimulationMode,
  selectedCell: { row: 0 as 0 | 1, col: 0 as 0 | 1 },
};

function bestResponses(matrix: PayoffMatrix) {
  const a: boolean[][] = [
    [false, false],
    [false, false],
  ];
  const b: boolean[][] = [
    [false, false],
    [false, false],
  ];

  for (let col = 0; col < 2; col += 1) {
    const top = matrix[0][col].a;
    const bottom = matrix[1][col].a;
    const max = Math.max(top, bottom);
    for (let row = 0; row < 2; row += 1) {
      if (matrix[row][col].a === max) a[row][col] = true;
    }
  }

  for (let row = 0; row < 2; row += 1) {
    const left = matrix[row][0].b;
    const right = matrix[row][1].b;
    const max = Math.max(left, right);
    for (let col = 0; col < 2; col += 1) {
      if (matrix[row][col].b === max) b[row][col] = true;
    }
  }

  return { a, b };
}

function dominantStrategy(
  matrix: PayoffMatrix,
  perspective: Perspective,
  labels: [string, string],
): string | null {
  if (perspective === "A") {
    const topWins =
      matrix[0][0].a >= matrix[1][0].a &&
      matrix[0][1].a >= matrix[1][1].a &&
      (matrix[0][0].a > matrix[1][0].a || matrix[0][1].a > matrix[1][1].a);
    const bottomWins =
      matrix[1][0].a >= matrix[0][0].a &&
      matrix[1][1].a >= matrix[0][1].a &&
      (matrix[1][0].a > matrix[0][0].a || matrix[1][1].a > matrix[0][1].a);
    if (topWins) return labels[0];
    if (bottomWins) return labels[1];
    return null;
  }

  const leftWins =
    matrix[0][0].b >= matrix[0][1].b &&
    matrix[1][0].b >= matrix[1][1].b &&
    (matrix[0][0].b > matrix[0][1].b || matrix[1][0].b > matrix[1][1].b);
  const rightWins =
    matrix[0][1].b >= matrix[0][0].b &&
    matrix[1][1].b >= matrix[1][0].b &&
    (matrix[0][1].b > matrix[0][0].b || matrix[1][1].b > matrix[1][0].b);
  if (leftWins) return labels[0];
  if (rightWins) return labels[1];
  return null;
}

function cellId(coord: CellCoord): string {
  return `${coord.row}-${coord.col}`;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

function getJointProfitCell(matrix: PayoffMatrix): CellCoord {
  let best: CellCoord = { row: 0, col: 0 };
  let bestValue = matrix[0][0].a + matrix[0][0].b;

  for (let row = 0 as 0 | 1; row < 2; row += 1 as 1) {
    for (let col = 0 as 0 | 1; col < 2; col += 1 as 1) {
      const total = matrix[row][col].a + matrix[row][col].b;
      if (total > bestValue) {
        best = { row, col };
        bestValue = total;
      }
    }
  }

  return best;
}

function getNashCells(matrix: PayoffMatrix): CellCoord[] {
  const responses = bestResponses(matrix);
  const cells: CellCoord[] = [];

  for (let row = 0 as 0 | 1; row < 2; row += 1 as 1) {
    for (let col = 0 as 0 | 1; col < 2; col += 1 as 1) {
      if (responses.a[row][col] && responses.b[row][col]) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

function getCheatingMove(matrix: PayoffMatrix, collusionCell: CellCoord): {
  from: CellCoord;
  to: CellCoord;
  cheater: Perspective;
  gain: number;
} | null {
  const rowShift: CellCoord = { row: collusionCell.row === 0 ? 1 : 0, col: collusionCell.col };
  const colShift: CellCoord = { row: collusionCell.row, col: collusionCell.col === 0 ? 1 : 0 };

  const current = matrix[collusionCell.row][collusionCell.col];
  const aGain = matrix[rowShift.row][rowShift.col].a - current.a;
  const bGain = matrix[colShift.row][colShift.col].b - current.b;

  if (aGain <= 0 && bGain <= 0) return null;

  if (aGain >= bGain) {
    return { from: collusionCell, to: rowShift, cheater: "A", gain: aGain };
  }

  return { from: collusionCell, to: colShift, cheater: "B", gain: bGain };
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

export default function GameTheoryPage() {
  const [step, setStep] = useState<LessonStep>(baseline.step);
  const [scenarioId, setScenarioId] = useState<ScenarioId>(baseline.scenario);
  const [perspective, setPerspective] = useState<Perspective>(baseline.perspective);
  const [opponentMove, setOpponentMove] = useState<OpponentMove>(baseline.opponentMove);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(baseline.simulationMode);
  const [selectedCell, setSelectedCell] = useState<CellCoord>(baseline.selectedCell);
  const [hoveredMetric, setHoveredMetric] = useState<MetricKey | null>(null);
  const [hoveredCell, setHoveredCell] = useState<CellCoord | null>(null);

  const activeStep = lessonSteps.find((item) => item.id === step) ?? lessonSteps[0];
  const scenario = scenarios[scenarioId];
  const matrix = scenario.matrix;
  const responses = useMemo(() => bestResponses(matrix), [matrix]);
  const aDominant = dominantStrategy(matrix, "A", scenario.strategiesA);
  const bDominant = dominantStrategy(matrix, "B", scenario.strategiesB);
  const nashCells = useMemo(() => getNashCells(matrix), [matrix]);
  const collusionCell = useMemo(() => getJointProfitCell(matrix), [matrix]);
  const cheatingMove = useMemo(() => getCheatingMove(matrix, collusionCell), [matrix, collusionCell]);

  const currentCell = matrix[selectedCell.row][selectedCell.col];
  const jointMaxProfit = matrix[collusionCell.row][collusionCell.col].a + matrix[collusionCell.row][collusionCell.col].b;
  const nashJointProfit =
    nashCells.length > 0
      ? Math.max(...nashCells.map((cell) => matrix[cell.row][cell.col].a + matrix[cell.row][cell.col].b))
      : 0;

  const comparedCells =
    perspective === "A"
      ? ([{ row: 0, col: opponentMove }, { row: 1, col: opponentMove }] as CellCoord[])
      : ([{ row: opponentMove, col: 0 }, { row: opponentMove, col: 1 }] as CellCoord[]);

  const bestInCompared = comparedCells.filter((cell) =>
    perspective === "A"
      ? responses.a[cell.row][cell.col]
      : responses.b[cell.row][cell.col],
  );

  const dominantMessage =
    perspective === "A"
      ? aDominant
        ? `发现占优策略：企业 A 不管 B 怎么选，都偏向 ${aDominant}。`
        : "企业 A 在这个情境下没有占优策略，必须看 B 的具体动作。"
      : bDominant
        ? `发现占优策略：企业 B 不管 A 怎么选，都偏向 ${bDominant}。`
        : "企业 B 在这个情境下没有占优策略，必须看 A 的具体动作。";

  const metrics =
    step === "matrix" ? (
      <>
        <MetricCard
          metricKey="matrix-a-strategy"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="A 当前所选策略"
          value={scenario.strategiesA[selectedCell.row]}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="matrix-b-strategy"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="B 当前所选策略"
          value={scenario.strategiesB[selectedCell.col]}
          accentClassName="text-orange-700"
        />
        <MetricCard
          metricKey="matrix-a-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业 A 的利润"
          value={currentCell.a.toString()}
          accentClassName="text-sky-700"
        />
        <MetricCard
          metricKey="matrix-b-profit"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业 B 的利润"
          value={currentCell.b.toString()}
          accentClassName="text-orange-700"
        />
      </>
    ) : step === "dominant" ? (
      <>
        <MetricCard
          metricKey="dominant-a"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业 A 的占优策略"
          value={aDominant ?? "无占优策略"}
          accentClassName={aDominant ? "text-sky-700" : "text-amber-700"}
        />
        <MetricCard
          metricKey="dominant-b"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="企业 B 的占优策略"
          value={bDominant ?? "无占优策略"}
          accentClassName={bDominant ? "text-orange-700" : "text-amber-700"}
        >
          <div className="mt-2">
            {statusPill(aDominant || bDominant ? "good" : "warn", aDominant || bDominant ? "存在占优策略" : "需要看最佳反应")}
          </div>
        </MetricCard>
      </>
    ) : (
      <>
        <MetricCard
          metricKey="nash-state"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="纳什均衡状态"
          value={
            nashCells.length > 0
              ? nashCells
                  .map((cell) => `${scenario.strategiesA[cell.row]} / ${scenario.strategiesB[cell.col]}`)
                  .join(" ; ")
              : "无稳定解"
          }
          accentClassName="text-rose-700"
        />
        <MetricCard
          metricKey="joint-max"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="联合最大利润"
          value={jointMaxProfit.toString()}
          accentClassName="text-emerald-700"
        />
        <MetricCard
          metricKey="joint-nash"
          hoveredMetric={hoveredMetric}
          setHoveredMetric={setHoveredMetric}
          label="纳什均衡下的联合利润"
          value={nashJointProfit.toString()}
          accentClassName="text-amber-700"
        >
          <div className="mt-2">
            {statusPill(
              jointMaxProfit > nashJointProfit ? "warn" : "good",
              jointMaxProfit > nashJointProfit ? "个体理性压低集体利润" : "稳定解同时也是最优解",
            )}
          </div>
        </MetricCard>
      </>
    );

  const cellCenters: Record<string, { x: number; y: number }> = {
    "0-0": { x: 275, y: 147 },
    "0-1": { x: 565, y: 147 },
    "1-0": { x: 275, y: 299 },
    "1-1": { x: 565, y: 299 },
  };

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
            Unit 4.5
          </div>
          <h1 className="mb-3 text-4xl leading-none tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] sm:text-5xl">
            寡头垄断与博弈论
          </h1>
          <p className="max-w-4xl text-base leading-7 text-[var(--muted)]">
            从读懂收益矩阵开始，逐步推导占优策略与纳什均衡，再回到共谋与背叛这条最典型的寡头逻辑链。
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
                  setHoveredCell(null);
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
          <label className={labelStackClass}>
            <span className="font-bold">经典博弈场景</span>
            <ButtonGroup<ScenarioId>
              value={scenarioId}
              onChange={(next) => {
                setHoveredMetric(null);
                setHoveredCell(null);
                setScenarioId(next);
                setSelectedCell({ row: 0, col: 0 });
              }}
              options={[
                { value: "pricing", label: "定价博弈 (高价 / 低价)" },
                { value: "advertising", label: "广告博弈 (做广告 / 不做广告)" },
              ]}
            />
          </label>

          {step === "dominant" ? (
            <>
              <label className={labelStackClass}>
                <span className="font-bold">视角切换</span>
                <ButtonGroup<Perspective>
                  value={perspective}
                  onChange={setPerspective}
                  options={[
                    { value: "A", label: "分析企业 A" },
                    { value: "B", label: "分析企业 B" },
                  ]}
                />
              </label>

              <label className={labelStackClass}>
                <span className="font-bold">假设对手行动</span>
                <ButtonGroup<OpponentMove>
                  value={opponentMove}
                  onChange={setOpponentMove}
                  options={[
                    { value: 0, label: "假设对手选策略一" },
                    { value: 1, label: "假设对手选策略二" },
                  ]}
                />
              </label>
            </>
          ) : null}

          {step === "nash" ? (
            <label className={labelStackClass}>
              <span className="font-bold">策略状态模拟</span>
              <ButtonGroup<SimulationMode>
                value={simulationMode}
                onChange={setSimulationMode}
                options={[
                  { value: "nash", label: "寻找纳什均衡" },
                  { value: "collusion", label: "达成共谋" },
                  { value: "cheating", label: "单方背叛" },
                ]}
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setHoveredMetric(null);
              setHoveredCell(null);
              if (step === "matrix") {
                setSelectedCell(baseline.selectedCell);
              } else if (step === "dominant") {
                setPerspective(baseline.perspective);
                setOpponentMove(baseline.opponentMove);
              } else {
                setSimulationMode(baseline.simulationMode);
              }
            }}
            className={primaryButtonClass}
          >
            重置
          </button>
        </aside>

        <section className={`${surfaceClass} rounded-[24px] p-5 sm:p-6`}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-3xl tracking-[0.01em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                {activeStep.chartTitle}
              </h2>
              <p className="mt-2 max-w-4xl text-base leading-7 text-[var(--muted)]">{activeStep.chartSubtitle}</p>
            </div>
            <div className="inline-flex rounded-full bg-[rgba(31,42,55,0.08)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
              {scenario.title}：{scenario.description}
            </div>
          </div>

          {step === "dominant" ? (
            <div className="mb-4 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              {dominantMessage}
            </div>
          ) : null}

          {step === "nash" && simulationMode === "cheating" && cheatingMove ? (
            <div className="mb-4 inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
              {cheatingMove.cheater} 单方背叛可多赚 {cheatingMove.gain}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-3 sm:p-4">
            <div className="relative mx-auto w-full max-w-[760px] aspect-[760/392]">
              <svg viewBox="0 0 760 392" className="absolute inset-0 h-full w-full">
                {step === "nash" && simulationMode === "cheating" && cheatingMove ? (
                  <>
                    <path
                      d={`M ${cellCenters[cellId(cheatingMove.from)].x} ${cellCenters[cellId(cheatingMove.from)].y} Q 420 40 ${cellCenters[cellId(cheatingMove.to)].x} ${cellCenters[cellId(cheatingMove.to)].y}`}
                      fill="none"
                      stroke="rgba(239,68,68,0.9)"
                      strokeWidth="4"
                      strokeDasharray="10 8"
                      markerEnd="url(#cheat-arrow)"
                    />
                    <text
                      x={(cellCenters[cellId(cheatingMove.from)].x + cellCenters[cellId(cheatingMove.to)].x) / 2}
                      y="54"
                      textAnchor="middle"
                      className="fill-rose-700 text-[14px] font-semibold"
                    >
                      +{cheatingMove.gain}
                    </text>
                  </>
                ) : null}
                <defs>
                  <marker id="cheat-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="rgba(239,68,68,0.9)" />
                  </marker>
                </defs>
              </svg>

              <div className="absolute inset-0 grid grid-cols-[120px_repeat(2,minmax(0,1fr))] grid-rows-[82px_repeat(2,minmax(0,1fr))] gap-3">
                <div className="flex items-end justify-start whitespace-nowrap rounded-[20px] border border-[var(--line)] bg-white/80 p-4 text-xs font-semibold text-[var(--muted)]">
                  企业 A \ 企业 B
                </div>

                {scenario.strategiesB.map((label, colIndex) => {
                  const highlight =
                    hoveredCell?.col === colIndex ||
                    (hoveredMetric === "matrix-b-profit") ||
                    (hoveredMetric === "dominant-b" && bDominant === label);

                  return (
                    <div
                      key={label}
                      className={`flex items-center justify-center rounded-[20px] border border-[var(--line)] bg-white/80 p-4 text-lg font-semibold transition ${
                        highlight ? "text-orange-700 ring-2 ring-orange-200" : ""
                      }`}
                    >
                      {label}
                    </div>
                  );
                })}

                {scenario.strategiesA.map((rowLabel, rowIndex) => {
                  const rowHighlight =
                    hoveredCell?.row === rowIndex ||
                    (hoveredMetric === "matrix-a-profit") ||
                    (hoveredMetric === "dominant-a" && aDominant === rowLabel);

                  return (
                    <div key={rowLabel} className="contents">
                      <div
                        className={`flex items-center justify-center rounded-[20px] border border-[var(--line)] bg-white/80 p-4 text-lg font-semibold transition ${
                          rowHighlight ? "text-sky-700 ring-2 ring-sky-200" : ""
                        }`}
                      >
                        {rowLabel}
                      </div>

                      {(scenario.strategiesB as readonly string[]).map((_, colIndex) => {
                        const coord = { row: rowIndex as 0 | 1, col: colIndex as 0 | 1 };
                        const cell = matrix[rowIndex][colIndex];
                        const isSelected = sameCell(selectedCell, coord);
                        const isCompared = comparedCells.some((item) => sameCell(item, coord));
                        const isBestCompared = bestInCompared.some((item) => sameCell(item, coord));
                        const isNash = nashCells.some((item) => sameCell(item, coord));
                        const isCollusion = sameCell(collusionCell, coord);
                        const isCheatingTarget = cheatingMove ? sameCell(cheatingMove.to, coord) : false;
                        const dimmed =
                          step === "dominant" &&
                          !isCompared;

                        return (
                          <button
                            key={cellId(coord)}
                            type="button"
                            onClick={() => setSelectedCell(coord)}
                            onMouseEnter={() => setHoveredCell(coord)}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`relative flex flex-col items-center justify-center gap-3 rounded-[20px] border p-4 text-left transition ${
                              isSelected
                                ? "border-[var(--accent)] shadow-[0_16px_24px_rgba(191,91,44,0.12)]"
                                : "border-[var(--line)]"
                            } ${dimmed ? "bg-white/30 opacity-40" : "bg-white/80"} ${
                              step === "nash" && simulationMode === "nash" && isNash
                                ? "outline outline-[4px] outline-[rgba(239,68,68,0.32)]"
                                : ""
                            } ${
                              step === "nash" && simulationMode === "collusion" && isCollusion
                                ? "border-emerald-500 border-dashed"
                                : ""
                            } ${
                              step === "nash" && simulationMode === "cheating" && isCheatingTarget
                                ? "outline outline-[4px] outline-[rgba(239,68,68,0.24)]"
                                : ""
                            }`}
                          >
                            <div className="absolute right-3 top-3 text-[11px] font-semibold text-[var(--muted)]">
                              {rowLabel} / {scenario.strategiesB[colIndex]}
                            </div>

                            <div className="flex items-center gap-2 text-xl font-semibold">
                              <span
                                className={`inline-flex min-w-[30px] justify-end text-sky-700 ${
                                  hoveredMetric === "matrix-a-profit" ? "animate-pulse" : ""
                                }`}
                              >
                                {cell.a}
                              </span>
                              <span className="text-[var(--muted)]">,</span>
                              <span
                                className={`inline-flex min-w-[30px] justify-start text-orange-700 ${
                                  hoveredMetric === "matrix-b-profit" ? "animate-pulse" : ""
                                }`}
                              >
                                {cell.b}
                              </span>
                            </div>

                            {step === "dominant" && isBestCompared ? (
                              <div className="absolute inset-4 rounded-[16px] border-2 border-[var(--accent)]" />
                            ) : null}

                            {step === "nash" && simulationMode === "nash" && isNash ? (
                              <div className="absolute bottom-3 right-3 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                LOCK
                              </div>
                            ) : null}

                            {step === "nash" && simulationMode === "collusion" && isCollusion ? (
                              <div className="absolute bottom-3 right-3 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                CO-OP
                              </div>
                            ) : null}

                            {step === "nash" && simulationMode === "cheating" && isCheatingTarget ? (
                              <div className="absolute bottom-3 right-3 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                CHEAT
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`mt-5 grid gap-3 ${step === "matrix" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {metrics}
          </div>
        </section>
      </main>
    </div>
  );
}
