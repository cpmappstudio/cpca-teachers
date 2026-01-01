import { useCalendarContext } from '../../calendar-context'
import { startOfWeek, addDays, isSameDay, format, isToday as isDateToday } from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarEvent from '../../calendar-event'
import { AnimatePresence, motion } from 'framer-motion'

export default function CalendarBodyWeek() {
  const { date, events, setDate } = useCalendarContext()

  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex flex-col flex-grow overflow-hidden">
      {/* Week header with day names */}
      <div className="hidden md:grid grid-cols-7 border-border divide-x divide-border">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b border-border"
          >
            {format(day, 'EEE')}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={weekStart.toISOString()}
          className="grid md:grid-cols-7 flex-grow overflow-y-auto relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          {weekDays.map((day) => {
            const dayEvents = events.filter((event) =>
              isSameDay(event.date, day)
            )
            const isToday = isDateToday(day)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative flex flex-col border-b border-r p-3 min-h-[200px] md:min-h-0 md:flex-1 cursor-pointer hover:bg-muted/30 transition-colors'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDate(day)
                }}
              >
                {/* Day header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      'text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full',
                      isToday && 'bg-deep-koamaru text-white'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <span className="text-xs text-muted-foreground md:hidden">
                    {format(day, 'EEEE')}
                  </span>
                </div>

                {/* Events list */}
                <AnimatePresence mode="wait">
                  <div className="flex flex-col gap-1.5 flex-grow overflow-y-auto">
                    {dayEvents.map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        className="relative h-auto"
                        month
                      />
                    ))}
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
