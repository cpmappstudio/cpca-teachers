import { useCalendarContext } from '../calendar-context'
import CalendarBodyWeek from './week/calendar-body-week'
import CalendarBodyMonth from './month/calendar-body-month'

export default function CalendarBody() {
  const { mode } = useCalendarContext()

  return (
    <>
      {mode === 'week' && <CalendarBodyWeek />}
      {mode === 'month' && <CalendarBodyMonth />}
    </>
  )
}
