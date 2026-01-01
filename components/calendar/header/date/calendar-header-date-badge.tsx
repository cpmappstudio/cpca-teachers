import { useCalendarContext } from '../../calendar-context'
import { isSameMonth, isSameWeek, startOfWeek, endOfWeek, startOfMonth, differenceInWeeks, format } from 'date-fns'

export default function CalendarHeaderDateBadge() {
  const { events, date, mode } = useCalendarContext()

  if (mode === 'week') {
    // Filter events for the current week
    const weekEvents = events.filter((event) =>
      isSameWeek(event.date, date, { weekStartsOn: 1 })
    )

    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
    const isSpanningMonths = !isSameMonth(weekStart, weekEnd)

    // Use today's date to determine which month's week number to show
    const today = new Date()
    const isTodayInThisWeek = isSameWeek(today, date, { weekStartsOn: 1 })
    
    // Reference date for week calculation:
    // If today is in this week, use today; otherwise use the date being viewed
    const referenceDate = isTodayInThisWeek ? today : date
    
    // Calculate which week of the month this is (1-based)
    const referenceMonthStart = startOfMonth(referenceDate)
    const weekOfMonth = differenceInWeeks(weekStart, startOfWeek(referenceMonthStart, { weekStartsOn: 1 })) + 1

    // Build the week label
    let weekLabel = `Week ${weekOfMonth}`
    if (isSpanningMonths) {
      // Show which month the week number refers to
      weekLabel = `Week ${weekOfMonth} of ${format(referenceDate, 'MMM')}`
    }

    return (
      <div className="flex items-center gap-1.5">
        <div className="whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-xs bg-muted text-muted-foreground">
          {weekLabel}
        </div>
        {weekEvents.length > 0 && (
          <div className="whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-xs bg-deep-koamaru text-white">
            {weekEvents.length} event{weekEvents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    )
  }

  // Default: month view
  const monthEvents = events.filter((event) => isSameMonth(event.date, date))

  if (!monthEvents.length) return null
  return (
    <div className="whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-xs bg-deep-koamaru text-white">
      {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
    </div>
  )
}
