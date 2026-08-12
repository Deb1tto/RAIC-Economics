import type { CourseSummary } from "./types.ts";

const units = [
  {
    id: "unit-1", code: "Unit 1", title: "Basic Economic Concepts", subtitle: "基础经济学概念", weighting: "AP 考试权重: 12–15%",
    accent: "from-[#6c5531] to-[#cfa66a]", accentSoft: "bg-[rgba(207,166,106,0.12)]", border: "border-[rgba(207,166,106,0.32)]", text: "text-[#7a5732]",
    labs: [
      { slug: "ppc", topics: ["Unit 1.3"], title: "生产可能性曲线", description: "PPC、效率、机会成本与经济增长。" },
      { slug: "trade", topics: ["Unit 1.4"], title: "比较优势与贸易", description: "绝对优势、比较优势、贸易条件与贸易红利。" },
      { slug: "marginal", topics: ["Unit 1.5 / 1.6"], title: "边际分析与消费者选择", description: "净收益、MB=MC、边际效用与预算分配。" },
    ],
  },
  {
    id: "unit-2", code: "Unit 2", title: "Supply and Demand", subtitle: "供给与需求", weighting: "AP 考试权重: 20–25%",
    accent: "from-[#1f6a5c] to-[#7cc7b7]", accentSoft: "bg-[rgba(76,183,171,0.12)]", border: "border-[rgba(76,183,171,0.28)]", text: "text-[#1f6a5c]",
    labs: [
      { slug: "demand-supply", topics: ["Unit 2.1 / 2.2"], title: "需求与供给", description: "需求法则、供给法则、沿线移动与整线平移。" },
      { slug: "elasticity", topics: ["Unit 2.3 / 2.4"], title: "价格弹性", description: "PED、PES、总收益测试与弹性决定因素。" },
      { slug: "other-elasticities", topics: ["Unit 2.5"], title: "交叉价格与收入弹性", description: "YED、XED、商品属性与相关商品关系。" },
      { slug: "sd", topics: ["Unit 2.6 / 2.7 / 2.8"], title: "市场均衡、失衡与政府干预", description: "均衡、剩余、短缺过剩、价格管制、税收补贴与 DWL。" },
    ],
  },
  {
    id: "unit-3", code: "Unit 3", title: "Production, Cost, and the Perfect Competition Model", subtitle: "生产、成本与完全竞争", weighting: "AP 考试权重: 22–25%",
    accent: "from-[#84511f] to-[#e1aa67]", accentSoft: "bg-[rgba(225,170,103,0.12)]", border: "border-[rgba(225,170,103,0.28)]", text: "text-[#84511f]",
    labs: [
      { slug: "production-costs", topics: ["Unit 3.1 / 3.2 / 3.3"], title: "生产函数与成本曲线", description: "TP、MP、AP、短期成本与长期规模经济。" },
      { slug: "profit-maximization", topics: ["Unit 3.4 / 3.5"], title: "利润类型与利润最大化", description: "会计利润、经济利润、正常利润与 MR=MC 法则。" },
      { slug: "perfect-competition", topics: ["Unit 3.6 / 3.7"], title: "完全竞争市场", description: "价格接受者、停业规则、长期进入退出与零经济利润。" },
    ],
  },
  {
    id: "unit-4", code: "Unit 4", title: "Imperfect Competition", subtitle: "不完全竞争", weighting: "AP 考试权重: 15–22%",
    accent: "from-[#7c3f1f] to-[#db9560]", accentSoft: "bg-[rgba(219,149,96,0.12)]", border: "border-[rgba(219,149,96,0.28)]", text: "text-[#7c3f1f]",
    labs: [
      { slug: "monopoly", topics: ["Unit 4.1 / 4.2"], title: "垄断市场", description: "MR 低于价格、垄断定价、利润矩形与无谓损失。" },
      { slug: "price-discrimination", topics: ["Unit 4.3"], title: "价格歧视", description: "分段定价、完全价格歧视、CS 归零与 DWL 消失。" },
      { slug: "monopolistic-competition", topics: ["Unit 4.4"], title: "垄断竞争", description: "短期像垄断、长期零利润、相切与过剩产能。" },
      { slug: "game-theory", topics: ["Unit 4.5"], title: "寡头与博弈论", description: "2x2 收益矩阵、占优策略、纳什均衡与共谋破裂。" },
    ],
  },
  {
    id: "unit-5", code: "Unit 5", title: "Factor Markets", subtitle: "要素市场", weighting: "AP 考试权重: 10–13%",
    accent: "from-[#4e6124] to-[#a7c764]", accentSoft: "bg-[rgba(167,199,100,0.14)]", border: "border-[rgba(167,199,100,0.28)]", text: "text-[#4e6124]",
    labs: [
      { slug: "factor-markets", topics: ["Unit 5.1 / 5.2 / 5.3"], title: "要素需求与供给", description: "MRP、MRC、最优雇佣与派生需求平移。" },
      { slug: "monopsony-labor", topics: ["Unit 5.4"], title: "买方垄断劳动力市场", description: "MFC、高于工资的成本、低工资低雇佣与 DWL。" },
    ],
  },
  {
    id: "unit-6", code: "Unit 6", title: "Market Failure and the Role of Government", subtitle: "市场失灵与政府角色", weighting: "AP 考试权重: 8–13%",
    accent: "from-[#4d3e86] to-[#9b8cf0]", accentSoft: "bg-[rgba(149,130,236,0.12)]", border: "border-[rgba(149,130,236,0.26)]", text: "text-[#5a4aa3]",
    labs: [
      { slug: "externalities", topics: ["Unit 6.2"], title: "外部性", description: "市场失灵、社会最优产量、皮古税、补贴与福利纠偏。" },
      { slug: "inequality-poverty", topics: ["Unit 6.5"], title: "不平等与贫困", description: "洛伦兹曲线、累进税、累退税、转移支付与再分配。" },
    ],
  },
];

const notes = [
  { title: "教学 UX 规则", description: "每个实验页都保持步骤区、操作区、图表区和数据项的固定结构，让学生总能知道自己改了什么，以及图上为什么会变。" },
  { title: "术语策略", description: "关键概念保持中英双语并贴合 AP 课堂语境，例如 Deadweight Loss、Allocative Efficiency、Nash Equilibrium 与 Derived Demand。" },
  { title: "使用方式", description: "推荐先让学生口头预测，再进入实验拖动变量验证。首页按 Unit 组织后，更适合配合学期进度或考前专题复习。" },
];

export const microCourse = {
  id: "micro",
  eyebrow: "AP Microeconomics Visual Lab",
  title: "AP 微观经济学课程地图",
  description: "用严格贴合 AP 大纲的 Unit 导航，组织所有图形实验。让学生既能看到全局备考地图，也能快速进入某一个核心考点的可视化推演。",
  units,
  notes,
} satisfies CourseSummary;
