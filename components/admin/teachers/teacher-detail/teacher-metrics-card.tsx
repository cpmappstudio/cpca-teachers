"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { RadialBarChart, RadialBar, LabelList, ResponsiveContainer } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

interface TeacherMetricsCardProps {
    teacherId: string;
    className?: string;
}

// Types for better organization
interface CurriculumData {
    name: string;
    remainingPercent: number;
    remaining: number;
    total: number;
    fill: string;
}

type ContributionData = Record<string, number>;

// Data generation functions
function buildMockCurriculums(): CurriculumData[] {
    const mock = [
        { id: "c1", name: "Mathematics", totalLessons: 40, remaining: 8, color: "var(--chart-1)" },
        { id: "c2", name: "Physics", totalLessons: 32, remaining: 6, color: "var(--chart-2)" },
        { id: "c3", name: "History", totalLessons: 25, remaining: 2, color: "var(--chart-3)" },
        { id: "c4", name: "Art", totalLessons: 18, remaining: 9, color: "var(--chart-4)" },
    ]

    return mock.map((c) => ({
        name: c.name,
        remainingPercent: Math.round((c.remaining / Math.max(1, c.totalLessons)) * 100),
        remaining: c.remaining,
        total: c.totalLessons,
        fill: c.color,
    }))
}

function buildMockContributionData() {
    const today = new Date()
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    const data: Record<string, number> = {}

    // Initialize all days in the past year with 0 contributions
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        data[d.toISOString().split('T')[0]] = 0
    }

    // Add deterministic mock contributions (instead of random)
    const days = Object.keys(data).sort()
    days.forEach((day, index) => {
        // Use a deterministic pattern based on date to avoid hydration mismatch
        const dayNumber = new Date(day).getDate()
        const monthNumber = new Date(day).getMonth()

        // Create a pseudo-random pattern that's consistent between server and client
        const seed = (dayNumber * 7 + monthNumber * 3 + index) % 100

        // 30% chance of having some activity (deterministic)
        if (seed < 30) {
            data[day] = Math.floor((seed % 20)) + 1
        }
    })

    return data
}

function getColorIntensity(count: number): string {
    if (count === 0) return 'hsl(0, 0%, 90%)'       // Very dark gray for empty days
    if (count < 5) return 'hsl(142, 52%, 84%)'      // Light green
    if (count < 10) return 'hsl(142, 52%, 70%)'     // Medium green
    if (count < 15) return 'hsl(142, 52%, 56%)'     // Dark green
    return 'hsl(142, 52%, 42%)'                     // Darkest green
}

// Abstracted chart components
interface CurriculumRadialChartProps {
    data: CurriculumData[];
    config: ChartConfig;
}

function CurriculumRadialChart({ data, config }: CurriculumRadialChartProps) {
    return (
        <div className="space-y-2 lg:col-span-1 overflow-visible">
            <ChartContainer config={config} className="mx-auto aspect-square max-h-[215px] min-h-[180px] w-full overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        data={data}
                        startAngle={-90}
                        endAngle={270}
                        innerRadius="20%"
                        outerRadius="100%"
                        barSize={14}
                    >
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent nameKey="name" formatter={(value: number | string) => [`${value}%`, "Remaining"]} />}
                        />
                        <RadialBar dataKey="remainingPercent" background>
                            <LabelList
                                position="insideStart"
                                dataKey="name"
                                className="fill-white capitalize mix-blend-luminosity"
                                fontSize={11}
                            />
                        </RadialBar>
                    </RadialBarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    )
}

interface ContributionGridProps {
    data: ContributionData;
}

function ContributionGrid({ data }: ContributionGridProps) {
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)
    const weeks = []
    const days = Object.keys(data).sort()

    for (let i = 0; i < days.length; i += 7) {
        const week = days.slice(i, i + 7)
        weeks.push(
            <div key={i} className="flex flex-col gap-1 flex-shrink-0">
                {week.map(day => (
                    <div
                        key={day}
                        className="w-2.5 h-2.5 rounded-sm border border-border/20"
                        style={{ backgroundColor: getColorIntensity(data[day]) }}
                        title={`${data[day]} lessons completed on ${new Date(day).toLocaleDateString()}`}
                    />
                ))}
            </div>
        )
    }

    // Scroll to the right on mount
    React.useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
            if (viewport) {
                viewport.scrollLeft = viewport.scrollWidth
            }
        }
    }, [])

    return (
        <ScrollArea ref={scrollAreaRef} className="w-full">
            <div className="flex flex-row gap-1 w-max pr-4 mb-4 ">
                {weeks}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

function ContributionChart({ data }: ContributionGridProps) {
    return (
        <div className="space-y-2 lg:col-span-2 flex flex-col">
            <div className="p-4 bg-muted/30 rounded-lg flex-1 flex items-center justify-center">
                <ContributionGrid data={data} />
            </div>
        </div>
    )
}

export function TeacherMetricsCard({ className }: TeacherMetricsCardProps) {
    const curriculumData = buildMockCurriculums()
    const contributionData = buildMockContributionData()

    const chartConfig = {
        progress: { label: "Remaining" },
        remainingPercent: { label: "Lessons remaining", color: "var(--sidebar-accent)" },
    } satisfies ChartConfig

    return (
        <Card className={`${className} w-full h-full flex flex-col overflow-hidden`}>
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Teaching metrics</CardTitle>
                <CardDescription className="text-sm">Curriculum completion progress and daily teaching activity</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pt-0 pb-4 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    <CurriculumRadialChart data={curriculumData} config={chartConfig} />
                    <ContributionChart data={contributionData} />
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-xs md:text-sm px-4 md:px-6 pb-5 pt-0 border-t bg-muted/10">
                <div className="text-muted-foreground leading-relaxed">
                    Left: Percentages show lessons remaining per curriculum. Right: Daily teaching activity over the past year.
                </div>
            </CardFooter>
        </Card>
    )
}