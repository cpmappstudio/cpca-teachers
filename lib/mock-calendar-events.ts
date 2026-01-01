import { CalendarEvent } from '@/components/calendar/calendar-types'
import { addDays, startOfMonth } from 'date-fns'
import { colorOptions } from '@/components/calendar/calendar-tailwind-classes'

const STANDARD_CODES = [
  'ELA.12.R.3.2',
  'MATH.9.A.1.1',
  'SCI.10.B.2.3',
  'SS.11.C.4.1',
  'ELA.10.W.2.1',
  'MATH.11.G.3.2',
  'SCI.9.P.1.4',
  'SS.12.E.2.3',
  'ELA.9.L.1.2',
  'MATH.10.S.2.1',
]

const COURSES = [
  { id: 'course1', name: 'English Language Arts' },
  { id: 'course2', name: 'Mathematics' },
  { id: 'course3', name: 'Science' },
]

const LESSONS_BY_COURSE: Record<string, string[]> = {
  'course1': ['lesson1-1', 'lesson1-2', 'lesson1-3'],
  'course2': ['lesson2-1', 'lesson2-2', 'lesson2-3', 'lesson2-4'],
  'course3': ['lesson3-1', 'lesson3-2', 'lesson3-3'],
}

const GRADES = ['9', '10', '11', '12']

const OBJECTIVES = [
  'Students will analyze and interpret complex texts.',
  'Students will solve quadratic equations using multiple methods.',
  'Students will conduct laboratory experiments safely.',
  'Students will evaluate historical primary sources.',
  'Students will write argumentative essays with supporting evidence.',
]

// Extract color values from colorOptions
const EVENT_COLORS = colorOptions.map((color) => color.value)

function getRandomTime(date: Date): Date {
  const hours = Math.floor(Math.random() * 14) + 8 // 8 AM to 10 PM
  const minutes = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
  return new Date(date.setHours(hours, minutes, 0, 0))
}

function generateEventDuration(): number {
  const durations = [30, 60, 90, 120] // in minutes
  return durations[Math.floor(Math.random() * durations.length)]
}

function getRandomStandards(): string[] {
  const count = Math.floor(Math.random() * 3) + 1 // 1 to 3 standards
  const shuffled = [...STANDARD_CODES].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function getRandomGrades(): string[] {
  const count = Math.floor(Math.random() * 2) + 1 // 1 to 2 grades
  const shuffled = [...GRADES].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

export function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const startDate = startOfMonth(new Date())

  // Generate 120 events over 3 months
  for (let i = 0; i < 120; i++) {
    // Random date between start and end
    const daysToAdd = Math.floor(Math.random() * 90) // 90 days = ~3 months
    const eventDate = addDays(startDate, daysToAdd)

    const startTime = getRandomTime(eventDate)

    // Select random course and corresponding lesson
    const course = COURSES[Math.floor(Math.random() * COURSES.length)]
    const courseLessons = LESSONS_BY_COURSE[course.id]
    const lesson = courseLessons[Math.floor(Math.random() * courseLessons.length)]

    events.push({
      id: `event-${i + 1}`,
      color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
      date: startTime,
      course: course.id,
      grades: getRandomGrades(),
      standards: getRandomStandards(),
      objectives: OBJECTIVES[Math.floor(Math.random() * OBJECTIVES.length)],
      additionalInfo: Math.random() > 0.5 ? 'Additional notes for this event.' : undefined,
      lesson: lesson,
    })
  }

  // Sort events by date
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}
