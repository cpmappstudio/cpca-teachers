import { useCalendarContext } from '../../calendar-context'
import CalendarHeaderDateChevrons from './calendar-header-date-chevrons'

export default function CalendarHeaderDate() {
  const { date } = useCalendarContext()
  return (
    <div className="flex items-center gap-2">
      <div>
        <CalendarHeaderDateChevrons />
      </div>
    </div>
  )
}
