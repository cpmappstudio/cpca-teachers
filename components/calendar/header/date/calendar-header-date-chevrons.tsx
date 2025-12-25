import { Button } from "@/components/ui/button";
import { useCalendarContext } from "../../calendar-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
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
      case "day":
        setDate(subDays(date, 1));
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
      case "day":
        setDate(addDays(date, 1));
        break;
    }
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
        <p className="text-lg font-semibold">{format(date, "MMMM yyyy")}</p>
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
