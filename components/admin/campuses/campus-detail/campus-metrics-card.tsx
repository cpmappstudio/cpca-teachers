"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { Doc } from "@/convex/_generated/dataModel";
import type { CampusStatus } from "@/convex/types";

interface CampusMetricsCardProps {
    metrics?: Doc<"campuses">["metrics"];
    status: Doc<"campuses">["status"];
    lastUpdatedLabel: string;
    className?: string;
}

// Generate daily progress data for the last 14 days
function buildDailyProgress(metrics?: Doc<"campuses">["metrics"]) {
    // if metrics contains a dailyProgress series, use it; otherwise synthesize
    if ((metrics as any)?.dailyProgress && Array.isArray((metrics as any).dailyProgress)) return (metrics as any).dailyProgress

    // Create a 14-day synthetic series with real dates and dramatic mock values
    const today = new Date()

    // Mock dramatic values - some days with 0, others with various levels
    const mockValues = [
        15,  // 13 days ago - low start
        0,   // 12 days ago - no progress day
        5,   // 11 days ago - very low recovery
        25,  // 10 days ago - modest improvement
        0,   // 9 days ago - another bad day
        35,  // 8 days ago - recovery
        52,  // 7 days ago - good progress
        0,   // 6 days ago - weekend drop
        18,  // 5 days ago - slow restart
        45,  // 4 days ago - building up
        73,  // 3 days ago - strong day
        68,  // 2 days ago - maintaining
        82,  // yesterday - excellent
        74   // today - still good
    ]

    const arr = Array.from({ length: 14 }).map((_, i) => {
        const date = new Date(today)
        date.setDate(today.getDate() - (13 - i)) // Start from 13 days ago to today

        return {
            date: date.toISOString().split('T')[0], // YYYY-MM-DD format
            dayOfMonth: date.getDate(),
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            value: mockValues[i],
        }
    })
    return arr
}

export function CampusMetricsCard({ metrics, status, className }: CampusMetricsCardProps) {
    const daily = buildDailyProgress(metrics)

    const chartConfig = {
        progress: {
            label: "Progress",
        },
        value: {
            label: "Daily Progress",
            color: "var(--sidebar-accent)",
        },
    } satisfies ChartConfig

    return (
        <Card className={className}>
            <CardHeader >
                <CardTitle>Average progress (daily)</CardTitle>
                <CardDescription>Last 14 days</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <LineChart
                        accessibilityLayer
                        data={daily}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="dayOfMonth"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value: number) => {
                                return String(value)
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="w-[200px]"
                                    nameKey="progress"
                                    labelFormatter={(value: any, payload: any) => {
                                        if (payload && payload.length > 0) {
                                            const data = payload[0].payload
                                            return `${data.dayName} ${data.dayOfMonth}`
                                        }
                                        return `Day ${value}`
                                    }}
                                    formatter={(value: any) => [`${value}%`, "Average Progress"]}
                                />
                            }
                        />
                        <Line
                            dataKey="value"
                            type="monotone"
                            stroke="var(--sidebar-accent)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
