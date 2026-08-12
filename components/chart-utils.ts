export type Point = {
  x: number;
  y: number;
};

export type ScaleFn = (value: number) => number;

export const CHART = {
  width: 620,
  height: 430,
  margin: { top: 24, right: 24, bottom: 58, left: 72 },
} as const;

export type ChartDimensions = {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export function makeScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): ScaleFn {
  const domainSpan = domainMax - domainMin;
  const rangeSpan = rangeMax - rangeMin;

  return (value: number) => rangeMin + ((value - domainMin) / domainSpan) * rangeSpan;
}

export function getChartScales({
  xMax,
  yMax,
  equalRatio = false,
  chart = CHART,
}: {
  xMax: number;
  yMax: number;
  equalRatio?: boolean;
  chart?: ChartDimensions;
}): {
  plotWidth: number;
  plotHeight: number;
  xScale: ScaleFn;
  yScale: ScaleFn;
} {
  const availableWidth = chart.width - chart.margin.left - chart.margin.right;
  const availableHeight = chart.height - chart.margin.top - chart.margin.bottom;

  let plotWidth = availableWidth;
  let plotHeight = availableHeight;

  if (equalRatio) {
    const unitX = availableWidth / xMax;
    const unitY = availableHeight / yMax;
    const unit = Math.min(unitX, unitY);
    plotWidth = unit * xMax;
    plotHeight = unit * yMax;
  }

  return {
    plotWidth,
    plotHeight,
    xScale: makeScale(0, xMax, chart.margin.left, chart.margin.left + plotWidth),
    yScale: makeScale(
      0,
      yMax,
      chart.height - chart.margin.bottom,
      chart.height - chart.margin.bottom - plotHeight,
    ),
  };
}

export function linePointsToPath(points: Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function areaPointsToPath(points: Point[]): string {
  return `${linePointsToPath(points)} Z`;
}
