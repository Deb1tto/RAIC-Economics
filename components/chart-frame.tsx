import { CHART, getChartScales, round, type ChartDimensions } from "./chart-utils";
import {
  axisClass,
  chartLabelClass,
  chartSmallLabelClass,
  gridLineClass,
} from "./ui-classes";

type ChartFrameProps = {
  xMax: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  gridLines?: number;
  equalRatio?: boolean;
  customTicks?: number[];
  chart?: ChartDimensions;
};

export function ChartFrame({
  xMax,
  yMax,
  xLabel,
  yLabel,
  gridLines = 5,
  equalRatio = false,
  customTicks,
  chart = CHART,
}: ChartFrameProps) {
  const { plotWidth, plotHeight, xScale, yScale } = getChartScales({
    xMax,
    yMax,
    equalRatio,
    chart,
  });

  const xTicks = customTicks || Array.from({ length: gridLines + 1 }, (_, i) => (xMax / gridLines) * i);
  const yTicks = customTicks || Array.from({ length: gridLines + 1 }, (_, i) => (yMax / gridLines) * i);

  return (
    <>
      {xTicks.map((xValue, index) => {
        const yValue = yTicks[index];
        if (yValue === undefined) return null;

        return (
          <g key={`grid-${index}`}>
            <line
              x1={xScale(xValue)}
              y1={yScale(yMax)}
              x2={xScale(xValue)}
              y2={yScale(0)}
              className={gridLineClass}
            />
            <line
              x1={xScale(0)}
              y1={yScale(yValue)}
              x2={xScale(xMax)}
              y2={yScale(yValue)}
              className={gridLineClass}
            />
            {xValue < xMax ? (
              <text
                x={xScale(xValue)}
                y={yScale(0) + 22}
                className={chartSmallLabelClass}
                textAnchor="middle"
              >
                {round(xValue, 0)}
              </text>
            ) : null}
            {yValue < yMax ? (
              <text
                x={xScale(0) - 14}
                y={yScale(yValue) + 4}
                className={chartSmallLabelClass}
                textAnchor="end"
              >
                {round(yValue, 0)}
              </text>
            ) : null}
          </g>
        );
      })}

      <line
        x1={xScale(0)}
        y1={yScale(0)}
        x2={xScale(xMax)}
        y2={yScale(0)}
        className={axisClass}
      />
      <line
        x1={xScale(0)}
        y1={yScale(0)}
        x2={xScale(0)}
        y2={yScale(yMax)}
        className={axisClass}
      />
      <text
        x={xScale(0) + plotWidth / 2}
        y={yScale(0) + 42}
        className={chartLabelClass}
        textAnchor="middle"
      >
        {xLabel}
      </text>
      <text
        x={xScale(0) - 48}
        y={yScale(yMax) + plotHeight / 2}
        className={chartLabelClass}
        textAnchor="middle"
        transform={`rotate(-90 ${xScale(0) - 48} ${yScale(yMax) + plotHeight / 2})`}
      >
        {yLabel}
      </text>
    </>
  );
}
