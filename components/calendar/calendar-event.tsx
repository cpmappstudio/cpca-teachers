import { CalendarEvent as CalendarEventType } from "@/components/calendar/calendar-types";
import { useCalendarContext } from "@/components/calendar/calendar-context";
import { format, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";

interface EventPosition {
  left: string;
  width: string;
  top: string;
  height: string;
}

function getOverlappingEvents(
  currentEvent: CalendarEventType,
  events: CalendarEventType[],
): CalendarEventType[] {
  return events.filter((event) => {
    if (event.id === currentEvent.id) return false;
    return isSameDay(currentEvent.date, event.date);
  });
}

function calculateEventPosition(
  event: CalendarEventType,
  allEvents: CalendarEventType[],
): EventPosition {
  const overlappingEvents = getOverlappingEvents(event, allEvents);
  const group = [event, ...overlappingEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const position = group.indexOf(event);
  const width = `${100 / (overlappingEvents.length + 1)}%`;
  const left = `${(position * 100) / (overlappingEvents.length + 1)}%`;

  // Since events don't have start/end times, position them at a fixed location
  // Use 8am as default position and 1 hour as default height
  const startHour = 8;
  const startMinutes = 0;
  const duration = 60; // 1 hour default

  const topPosition = startHour * 128 + (startMinutes / 60) * 128;
  const height = (duration / 60) * 128;

  return {
    left,
    width,
    top: `${topPosition}px`,
    height: `${height}px`,
  };
}

export default function CalendarEvent({
  event,
  month = false,
  className,
}: {
  event: CalendarEventType;
  month?: boolean;
  className?: string;
}) {
  const { events, setSelectedEvent, setManageEventDialogOpen, date } =
    useCalendarContext();
  const style = month ? {} : calculateEventPosition(event, events);

  // Generate a unique key that includes the current month to prevent animation conflicts
  const isEventInCurrentMonth = isSameMonth(event.date, date);
  const animationKey = `${event.id}-${
    isEventInCurrentMonth ? "current" : "adjacent"
  }`;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          className={cn(
            `rounded-md cursor-pointer transition-all duration-300 bg-${event.color}-500/10 hover:bg-${event.color}-500/20 border border-${event.color}-500`,
            month ? "px-2 py-1" : "px-3 py-1.5 absolute",
            className,
          )}
          style={style}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(event);
            setManageEventDialogOpen(true);
          }}
          initial={{
            opacity: 0,
            y: -3,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.98,
            transition: {
              duration: 0.15,
              ease: "easeOut",
            },
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
            opacity: {
              duration: 0.2,
              ease: "linear",
            },
            layout: {
              duration: 0.2,
              ease: "easeOut",
            },
          }}
          layoutId={`event-${animationKey}-${month ? "month" : "day"}`}
        >
          <div
            className={cn(
              `flex w-full text-${event.color}-500`,
              month ? "flex-row items-center gap-1.5" : "flex-col gap-0.5",
            )}
          >
            {event.course && (
              <p className={cn("font-bold truncate", month ? "text-xs" : "text-xs")}>
                {event.course}
              </p>
            )}
            {event.lesson && !month && (
              <p className="truncate text-sm font-medium">
                {event.lesson.match(/^(Q\d+\s*-\s*)?(Lesson\s*\d+|L\d+)/i)?.[0] || event.lesson.split('.')[0]}
              </p>
            )}
            {event.groupCode && (
              <p className={cn("truncate", month ? "text-xs opacity-70" : "text-sm font-medium")}>
                {month ? `(${event.groupCode})` : event.groupCode}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
