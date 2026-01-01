import { Button } from "@/components/ui/button";
import { useCalendarContext } from "../../calendar-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameYear,
} from "date-fns";
import CalendarHeaderDateBadge from "./calendar-header-date-badge";

export default function CalendarHeaderDateChevrons() {
  const { mode, date, setDate } = useCalendarContext();

  function handleDateBackward() {
    switch (mode) {
      case "month":
        setDate(subMonths(date, 1));
        break;
      case "week":
        setDate(subWeeks(date, 1));
        break;
    }
  }

  function handleDateForward() {
    switch (mode) {
      case "month":
        setDate(addMonths(date, 1));
        break;
      case "week":
        setDate(addWeeks(date, 1));
        break;
    }
  }

  // Get the date label based on mode
  function getDateLabel() {
    if (mode === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

      // Check if week spans two different months
      if (!isSameMonth(weekStart, weekEnd)) {
        // Check if it also spans two different years
        if (!isSameYear(weekStart, weekEnd)) {
          return `${format(weekStart, "MMM yyyy")} - ${format(weekEnd, "MMM yyyy")}`;
        }
        // Same year, different months
        return `${format(weekStart, "MMM")} - ${format(weekEnd, "MMM yyyy")}`;
      }
    }
    // Default: single month display
    return format(date, "MMMM yyyy");
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="h-7 w-7 p-1"
        onClick={handleDateBackward}
      >
        <ChevronLeft className="min-w-5 min-h-5" />
      </Button>
      <div className="flex items-center gap-1">
        <p className="text-lg font-semibold">{getDateLabel()}</p>
        <CalendarHeaderDateBadge />
      </div>

      <Button
        variant="outline"
        className="h-7 w-7 p-1"
        onClick={handleDateForward}
      >
        <ChevronRight className="min-w-5 min-h-5" />
      </Button>
    </div>
  );
}
