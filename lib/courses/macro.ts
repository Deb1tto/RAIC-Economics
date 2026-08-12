import type { CourseSummary } from "./types.ts";

const accents = [
  ["from-[#6c5531] to-[#cfa66a]", "bg-[rgba(207,166,106,0.12)]", "border-[rgba(207,166,106,0.32)]", "text-[#7a5732]"],
  ["from-[#1f6a5c] to-[#7cc7b7]", "bg-[rgba(76,183,171,0.12)]", "border-[rgba(76,183,171,0.28)]", "text-[#1f6a5c]"],
  ["from-[#84511f] to-[#e1aa67]", "bg-[rgba(225,170,103,0.12)]", "border-[rgba(225,170,103,0.28)]", "text-[#84511f]"],
  ["from-[#7c3f1f] to-[#db9560]", "bg-[rgba(219,149,96,0.12)]", "border-[rgba(219,149,96,0.28)]", "text-[#7c3f1f]"],
  ["from-[#4e6124] to-[#a7c764]", "bg-[rgba(167,199,100,0.14)]", "border-[rgba(167,199,100,0.28)]", "text-[#4e6124]"],
  ["from-[#4d3e86] to-[#9b8cf0]", "bg-[rgba(149,130,236,0.12)]", "border-[rgba(149,130,236,0.26)]", "text-[#5a4aa3]"],
] as const;

export const macroCourse = {
  id: "macro",
  eyebrow: "AP Macroeconomics Visual Lab",
  title: "AP 宏观经济学课程地图",
  description: "按 AP Macroeconomics 六个 Unit 浏览互动实验，并通过图形、公式与政策因果链理解宏观模型。",
  units: [
    {
      id: "unit-1", code: "Unit 1", title: "Basic Economic Concepts", subtitle: "基础经济概念", weighting: "5%-10%",
      accent: accents[0][0], accentSoft: accents[0][1], border: accents[0][2], text: accents[0][3],
      labs: [
        { slug: "scarcity-choice", topics: ["1.1"], title: "Scarcity", description: "把例子拖到正确概念，区分稀缺性、选择和机会成本。" },
        { slug: "ppc-opportunity-cost", topics: ["1.2"], title: "PPC and Opportunity Cost", description: "拖动生产组合点，判断效率、不可达点、经济增长和机会成本。" },
        { slug: "comparative-advantage", topics: ["1.3"], title: "Comparative Advantage", description: "比较两个经济体的机会成本，判断专业化方向。" },
        { slug: "market-fundamentals", topics: ["1.4", "1.5", "1.6"], title: "Demand, Supply, and Equilibrium", description: "移动需求与供给曲线，分析均衡、短缺、剩余和均衡变化。" },
      ],
    },
    {
      id: "unit-2", code: "Unit 2", title: "Economic Indicators and the Business Cycle", subtitle: "宏观指标与商业周期", weighting: "12%-17%",
      accent: accents[1][0], accentSoft: accents[1][1], border: accents[1][2], text: accents[1][3],
      labs: [
        { slug: "measuring-output", topics: ["2.1", "2.2", "2.6"], title: "Measuring Output", description: "先判断是否计入 GDP，再分别处理名义与实际 GDP、deflator 和 GDP 的局限。" },
        { slug: "measuring-prices", topics: ["2.4", "2.5"], title: "Measuring Prices", description: "CPI market basket、Inflation Rate 与价格状态判断。" },
        { slug: "labor-market", topics: ["2.3"], title: "Labor Market Indicators", description: "Labor Force、Unemployment Rate 与 Labor Force Participation Rate。" },
        { slug: "business-cycle", topics: ["2.7"], title: "Business Cycle", description: "Expansion、Peak、Recession、Trough 与宏观政策反应。" },
      ],
    },
    {
      id: "unit-3", code: "Unit 3", title: "National Income and Price Determination", subtitle: "国民收入与价格决定", weighting: "17%-27%",
      accent: accents[2][0], accentSoft: accents[2][1], border: accents[2][2], text: accents[2][3],
      labs: [
        { slug: "ad-components", topics: ["3.1"], title: "AD Components", description: "调节消费、投资、政府支出和净出口，观察总需求变化。" },
        { slug: "multiplier-lab", topics: ["3.2"], title: "Multiplier Lab", description: "用 MPC 计算支出乘数和税收乘数，理解政策冲击大小。" },
        { slug: "adas-equilibrium", topics: ["3.3", "3.4", "3.5"], title: "AD-AS Equilibrium", description: "用 AD、SRAS 和 LRAS 分析产出、价格水平和缺口。" },
        { slug: "output-gaps", topics: ["3.6", "3.7"], title: "Output Gaps", description: "判断 recessionary gap 与 inflationary gap。" },
        { slug: "fiscal-policy", topics: ["3.8", "3.9"], title: "Fiscal Policy Simulator", description: "调节政府支出、税收和 MPC，观察乘数如何影响 AD。" },
      ],
    },
    {
      id: "unit-4", code: "Unit 4", title: "Financial Sector", subtitle: "金融部门", weighting: "18%-23%",
      accent: accents[3][0], accentSoft: accents[3][1], border: accents[3][2], text: accents[3][3],
      labs: [
        { slug: "money-financial-assets", topics: ["4.1", "4.2", "4.3"], title: "Money and Financial Assets", description: "区分金融资产、名义与实际利率，以及货币的三项职能。" },
        { slug: "banking-money-expansion", topics: ["4.4"], title: "Banking and Money Expansion", description: "用 T-account 和存款扩张链条分析银行如何扩张货币供给。" },
        { slug: "money-market", topics: ["4.5"], title: "Money Market", description: "用货币供给和货币需求解释名义利率变化。" },
        { slug: "monetary-policy", topics: ["4.6"], title: "Monetary Policy", description: "观察货币政策如何影响利率、投资、AD 和短期产出。" },
        { slug: "loanable-funds", topics: ["4.7"], title: "Loanable Funds", description: "用储蓄和投资需求分析实际利率。" },
      ],
    },
    {
      id: "unit-5", code: "Unit 5", title: "Long-Run Consequences of Stabilization Policies", subtitle: "稳定政策的长期影响", weighting: "20%-30%",
      accent: accents[4][0], accentSoft: accents[4][1], border: accents[4][2], text: accents[4][3],
      labs: [
        { slug: "short-run-policy-actions", topics: ["5.1"], title: "Short-Run Policy Actions", description: "比较扩张性与紧缩性财政、货币政策对 AD、产出、价格水平和失业的短期影响。" },
        { slug: "phillips-curve", topics: ["5.2"], title: "Phillips Curve", description: "观察短期通胀与失业的权衡，以及长期自然失业率。" },
        { slug: "money-growth-inflation", topics: ["5.3"], title: "Money Growth and Inflation", description: "观察货币增长在长期中如何影响价格水平和通胀。" },
        { slug: "deficits-crowding-out", topics: ["5.4", "5.5"], title: "Deficits and Crowding Out", description: "用可贷资金市场分析赤字、债务和挤出效应。" },
        { slug: "economic-growth", topics: ["5.6", "5.7"], title: "Economic Growth", description: "用 PPC 和 LRAS 外移表示长期增长。" },
      ],
    },
    {
      id: "unit-6", code: "Unit 6", title: "Open Economy: International Trade and Finance", subtitle: "开放经济", weighting: "10%-13%",
      accent: accents[5][0], accentSoft: accents[5][1], border: accents[5][2], text: accents[5][3],
      labs: [
        { slug: "balance-of-payments", topics: ["6.1"], title: "Balance of Payments", description: "分别调整经常账户和金融账户项目，检查国际收支是否平衡。" },
        { slug: "foreign-exchange", topics: ["6.2", "6.3", "6.4", "6.5", "6.6"], title: "Foreign Exchange Market", description: "先判断外汇冲击影响 Demand 还是 Supply，再移动曲线分析汇率。" },
      ],
    },
  ],
  notes: [
    { title: "教学 UX 规则", description: "先预测，再操作控件或图形验证；反馈使用 AP 课程语言解释变量与曲线的因果关系。" },
    { title: "课程完整性", description: "6 Units、25 Labs 覆盖 Fall 2026 CED 的全部 42 Topics。" },
    { title: "迁移状态", description: "Macro Labs 按 Unit 保真迁移；尚未迁移的独立地址会明确显示迁移状态。" },
  ],
} satisfies CourseSummary;
