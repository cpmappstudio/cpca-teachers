'use client'

import { useState, useEffect } from 'react'
import Calendar from './calendar/calendar'
import { CalendarEvent, Mode } from './calendar/calendar-types'
import { generateMockEvents } from '@/lib/mock-calendar-events'

export default function CalendarDemo() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [mode, setMode] = useState<Mode>('month')
  const [date, setDate] = useState<Date>(new Date())
  const [isMounted, setIsMounted] = useState(false)

  // Generate mock events only on the client to avoid hydration mismatch
  useEffect(() => {
    setEvents(generateMockEvents())
    setIsMounted(true)
  }, [])

  // Don't render until client-side to avoid hydration mismatch with random data
  if (!isMounted) {
    return null
  }

  return (
    <Calendar
      events={events}
      setEvents={setEvents}
      mode={mode}
      setMode={setMode}
      date={date}
      setDate={setDate}
    />
  )
}
