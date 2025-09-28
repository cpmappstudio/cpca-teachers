"use client"

import * as React from "react"
import {
    RadialBarChart,
    RadialBar,
    PolarRadiusAxis,
    Label,
    PolarGrid,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"

export interface RadialChartProps {
    value: number;
    label: string;
    fill?: string;
    className?: string;
    config: Record<string, { label: string; color?: string }>;
    showPercentage?: boolean;
}

export function RadialChart({
    value,
    label,
    fill = "var(--chart-1)",
    className = "w-full h-full",
    config,
    showPercentage = false
}: RadialChartProps) {
    const chartData = [{ value: value, fill: fill }];

    console.log("RadialChart rendering:", { value, label, fill, chartData }); // Debug

    return (
        <div className="w-full h-full flex items-center justify-center">
            <ChartContainer config={config} className={className}>
                <RadialBarChart
                    data={chartData}
                    startAngle={0}
                    endAngle={250}
                    innerRadius="35%"
                    outerRadius="80%"
                >
                    <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        className="first:fill-muted last:fill-background"
                        polarRadius={["60%", "40%"]}
                    />
                    <RadialBar dataKey="value" background cornerRadius={10} fill={fill} />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                        <Label
                            content={({ viewBox }: any) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                        <text
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >
                                            <tspan
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                className="fill-foreground text-2xl font-bold"
                                            >
                                                {value}{showPercentage ? '%' : ''}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 20}
                                                className="fill-muted-foreground text-sm"
                                            >
                                                {label}
                                            </tspan>
                                        </text>
                                    )
                                }
                            }}
                        />
                    </PolarRadiusAxis>
                </RadialBarChart>
            </ChartContainer>
        </div>
    );
}