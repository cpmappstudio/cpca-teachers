import { useCalendarContext } from '../../calendar-context'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
} from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarEvent from '../../calendar-event'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

export default function CalendarBodyMonth() {
  const { date, events, setDate, setMode } = useCalendarContext()
  const todayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get the first day of the month
  const monthStart = startOfMonth(date)
  // Get the last day of the month
  const monthEnd = endOfMonth(date)

  // Get the first Monday of the first week (may be in previous month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  // Get the last Sunday of the last week (may be in next month)
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Get all days between start and end
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const today = new Date()
  const isTodayInCurrentMonth = isSameMonth(today, date)

  // Filter events to only show those within the current month view
  const visibleEvents = events.filter(
    (event) =>
      isWithinInterval(event.date, {
        start: calendarStart,
        end: calendarEnd,
      })
  )

  // Auto-scroll to today on mobile when the component mounts or month changes
  useEffect(() => {
    if (isTodayInCurrentMonth && todayRef.current && containerRef.current) {
      // Small delay to ensure the DOM is fully rendered
      const timeoutId = setTimeout(() => {
        todayRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [isTodayInCurrentMonth, monthStart.toISOString()])

  return (
    <div className="flex flex-col flex-grow overflow-hidden">
      <div className="hidden md:grid grid-cols-7 border-border divide-x divide-border">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b border-border"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          ref={containerRef}
          key={monthStart.toISOString()}
          className="grid md:grid-cols-7 flex-grow overflow-y-auto relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          {calendarDays.map((day) => {
            const dayEvents = visibleEvents.filter((event) =>
              isSameDay(event.date, day)
            )
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, date)
            const hasEvents = dayEvents.length > 0

            return (
              <div
                key={day.toISOString()}
                ref={isToday ? todayRef : undefined}
                className={cn(
                  'relative flex flex-col border-b border-r p-2 cursor-pointer transition-all overflow-hidden',
                  // Desktop: always show aspect-video
                  'md:aspect-video',
                  // Mobile: compact for days without events, expanded for days with events
                  hasEvents ? 'min-h-[80px]' : 'py-2',
                  // Hide days from other months on mobile, muted on desktop
                  !isCurrentMonth && 'bg-muted/50 hidden md:flex',
                  // Highlight today
                  isToday && 'bg-deep-koamaru/5 md:bg-transparent'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDate(day)
                  setMode('week')
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full aspect-square',
                      isToday && 'bg-deep-koamaru text-white'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {/* Mobile: Show day name inline for compact view */}
                  <span className="text-xs text-muted-foreground md:hidden">
                    {format(day, 'EEE')}
                  </span>
                  {/* Mobile: Show event count badge for compact days */}
                  {!hasEvents && (
                    <span className="text-xs text-muted-foreground md:hidden ml-auto">
                      No events
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <div className={cn(
                    "flex flex-col mt-1 gap-1",
                    // Hide events section on mobile if no events (already shown badge above)
                    !hasEvents && "hidden md:flex"
                  )}>
                    {dayEvents.slice(0, 1).map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        className="relative h-auto shrink-0"
                        month
                      />
                    ))}
                    {dayEvents.length > 1 && (
                      <motion.div
                        key={`more-${day.toISOString()}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.2,
                        }}
                        className="text-xs text-muted-foreground shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDate(day)
                          setMode('week')
                        }}
                      >
                        +{dayEvents.length - 1} more
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
