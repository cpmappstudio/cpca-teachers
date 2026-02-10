"use client";

import { PDF, rgb } from "@libpdf/core";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import type { CalendarEvent } from "@/components/calendar/calendar-types";

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyPdfOptions {
  events: CalendarEvent[];
  currentDate: Date;
  teacherName?: string;
  courseName?: string;
  campusName?: string;
  schoolYear?: string;
}

interface Fonts {
  regular: ReturnType<ReturnType<typeof PDF.create>["embedFont"]>;
  bold: ReturnType<ReturnType<typeof PDF.create>["embedFont"]>;
}

interface EventPageDistribution {
  page: number;
  events: CalendarEvent[];
}

interface PaginationInfo {
  totalPages: number;
  eventDistribution: Map<string, EventPageDistribution[]>;
}

// ============================================================================
// CONSTANTS - Layout based on LP.September.22-26-2025.pdf analysis
// ============================================================================

const PAGE = {
  width: 792, // US Letter Landscape
  height: 612,
  margin: {
    top: 50,
    bottom: 40,
    left: 40,
    right: 40,
  },
} as const;

const COLORS = {
  headerText: rgb(0, 0, 0),
  text: rgb(0.1, 0.1, 0.1),
  lightText: rgb(0.3, 0.3, 0.3),
  border: rgb(0.7, 0.7, 0.7),
  headerBg: rgb(254, 191, 0),
  cardBg: rgb(0.98, 0.98, 0.98),
  columnBg: rgb(195 / 255, 213 / 255, 224 / 255), // Light blue background for day columns
} as const;

const FONTS = {
  title: 16,
  subtitle: 12,
  header: 11,
  label: 9,
  body: 8,
  small: 7,
} as const;

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate a PDF document matching the LP.September.22-26-2025.pdf format
 * 
 * Layout:
 * - Page 1: Header + Standards/Objectives/Lesson# per day
 * - Page 2: Additional Information per day (if available)
 */
export async function generateWeeklyCalendarPdf(
  events: CalendarEvent[],
  currentDate: Date,
  teacherName?: string
): Promise<Uint8Array> {
  // Use options interface for cleaner API
  const options: WeeklyPdfOptions = {
    events,
    currentDate,
    teacherName,
  };

  return generateWeeklyCalendarPdfWithOptions(options);
}

export async function generateWeeklyCalendarPdfWithOptions(
  options: WeeklyPdfOptions
): Promise<Uint8Array> {
  const { events, currentDate, teacherName, courseName, campusName, schoolYear } = options;

  // Create PDF document
  const pdf = PDF.create();
  pdf.setTitle(`Weekly Lesson Plans - ${format(currentDate, "MMMM d, yyyy")}`);
  pdf.setCreator("CPCA Teachers");

  // Load Times New Roman fonts and logo
  const [regularFontBytes, boldFontBytes, logoBytes] = await Promise.all([
    fetch('/fonts/times.ttf').then(r => r.arrayBuffer()),
    fetch('/fonts/times-bold.ttf').then(r => r.arrayBuffer()),
    fetch('/cpca.png').then(r => r.arrayBuffer()),
  ]);

  const fonts: Fonts = {
    regular: pdf.embedFont(new Uint8Array(regularFontBytes)),
    bold: pdf.embedFont(new Uint8Array(boldFontBytes)),
  };

  const logo = pdf.embedPng(new Uint8Array(logoBytes));

  // Calculate week boundaries (Monday to Friday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Group events by day (Mon-Fri only)
  const eventsByDay = groupEventsByDay(events, weekDays);

  // Derive course name from events if not provided
  const derivedCourseName = courseName || deriveCourseName(events);

  // Calculate dynamic pagination based on actual event heights
  const paginationInfo = calculatePagination(eventsByDay, weekDays);

  // Generate pages based on calculated pagination
  for (let pageIndex = 0; pageIndex < paginationInfo.totalPages; pageIndex++) {
    const page = pdf.addPage({ size: "letter", orientation: "landscape" });
    drawWeeklyPage(page, {
      weekDays,
      eventsByDay,
      teacherName,
      courseName: derivedCourseName,
      campusName,
      schoolYear,
      fonts,
      logo,
      pageIndex,
      totalPages: paginationInfo.totalPages,
      paginationInfo,
    });
  }

  return await pdf.save();
}

// Calculate how events should be distributed across pages
function calculatePagination(
  eventsByDay: Map<string, CalendarEvent[]>,
  weekDays: Date[]
): PaginationInfo {
  const firstPageAvailableHeight = 400; // ~400pts after header on first page
  const continuationPageAvailableHeight = 450; // ~450pts on continuation pages
  const cardMargin = 8;
  
  let maxPagesNeeded = 1;
  const eventDistribution = new Map<string, EventPageDistribution[]>();

  weekDays.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(dayKey) || [];
    
    if (dayEvents.length === 0) {
      eventDistribution.set(dayKey, []);
      return;
    }

    const distribution: EventPageDistribution[] = [];
    let currentPage = 0;
    let currentPageHeight = firstPageAvailableHeight;
    let eventsOnCurrentPage: CalendarEvent[] = [];

    dayEvents.forEach((event, index) => {
      const eventHeight = calculateEventCardHeight(event);
      const totalHeight = eventHeight + cardMargin;

      // Check if event fits on current page
      if (currentPageHeight >= totalHeight || eventsOnCurrentPage.length === 0) {
        // Fits on current page
        eventsOnCurrentPage.push(event);
        currentPageHeight -= totalHeight;
      } else {
        // Need new page
        distribution.push({
          page: currentPage,
          events: [...eventsOnCurrentPage],
        });
        
        currentPage++;
        currentPageHeight = continuationPageAvailableHeight;
        eventsOnCurrentPage = [event];
        currentPageHeight -= totalHeight;
      }
    });

    // Add remaining events
    if (eventsOnCurrentPage.length > 0) {
      distribution.push({
        page: currentPage,
        events: eventsOnCurrentPage,
      });
    }

    eventDistribution.set(dayKey, distribution);
    maxPagesNeeded = Math.max(maxPagesNeeded, currentPage + 1);
  });

  return {
    totalPages: maxPagesNeeded,
    eventDistribution,
  };
}

// Calculate the height needed for a single event card
function calculateEventCardHeight(event: CalendarEvent): number {
  const padding = 6;
  const lineHeight = 10;
  let height = padding * 2; // top + bottom padding

  // Group section
  if (event.groupCode) {
    height += 12; // Label
    height += lineHeight; // Group code value
  }
  height += 8; // Section spacing

  // Standards section
  if (event.standards && event.standards.length > 0) {
    height += 12; // Label
    height += Math.min(event.standards.length, 3) * lineHeight;
  } else {
    height += 12 + lineHeight; // Label + "N/A"
  }
  height += 8; // Section spacing

  // Objectives section
  height += 12; // Label
  if (event.objectives) {
    const objectiveLines = wrapText(event.objectives, 22);
    height += Math.min(objectiveLines.length, 8) * lineHeight;
  } else {
    height += lineHeight; // "N/A"
  }
  height += 8; // Section spacing

  // Lesson section
  height += 12; // Label
  if (event.lesson) {
    const lessonLines = wrapText(event.lesson, 22);
    height += Math.min(lessonLines.length, 6) * lineHeight;
  } else {
    height += lineHeight; // "N/A"
  }

  // Additional Info section
  if (event.additionalInfo) {
    height += 8; // Section spacing
    height += 12; // Label
    const additionalLines = wrapText(event.additionalInfo, 22);
    height += Math.min(additionalLines.length, 8) * lineHeight;
  }

  return height;
}

// ============================================================================
// DRAW WEEKLY PAGE (Multi-page support)
// ============================================================================

interface WeeklyPageOptions {
  weekDays: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  teacherName?: string;
  courseName?: string;
  campusName?: string;
  schoolYear?: string;
  fonts: Fonts;
  logo: ReturnType<ReturnType<typeof PDF.create>["embedPng"]>;
  pageIndex: number;
  totalPages: number;
  paginationInfo: PaginationInfo;
}

function drawWeeklyPage(
  page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>,
  options: WeeklyPageOptions
) {
  const { weekDays, eventsByDay, teacherName, courseName, campusName, schoolYear, fonts, logo, pageIndex, totalPages, paginationInfo } = options;

  let y = PAGE.height - PAGE.margin.top;

  // === HEADER SECTION (CENTERED) - Only on first page ===
  if (pageIndex === 0) {
    // Logo + text block - centered
    const logoWidth = 60;
    const logoHeight = 60;
    const logoTextGap = 15;
    
    // Calculate approximate text width for centering
    const estimatedTextWidth = 170;
    const totalHeaderWidth = logoWidth + logoTextGap + estimatedTextWidth;
    
    // Center the entire block
    const blockStartX = (PAGE.width - totalHeaderWidth) / 2;
    const logoX = blockStartX;
    const textStartX = blockStartX + logoWidth + logoTextGap;
    
    // Draw logo
    page.drawImage(logo, {
      x: logoX,
      y: y - logoHeight + 10,
      width: logoWidth,
      height: logoHeight,
    });

    // Campus Name
    if (campusName) {
      page.drawText(campusName, {
        x: textStartX,
        y: y - 8,
        size: FONTS.subtitle,
        color: COLORS.headerText,
        font: fonts.bold,
      });
    }

    // Title: "Weekly Lesson Plans"
    const title = "Weekly Lesson Plans";
    page.drawText(title, {
      x: textStartX,
      y: y - 25,
      size: FONTS.title,
      color: COLORS.headerText,
      font: fonts.bold,
    });

    // School Year
    const yearText = schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    page.drawText(yearText, {
      x: textStartX,
      y: y - 42,
      size: FONTS.subtitle,
      color: COLORS.text,
      font: fonts.regular,
    });

    y -= 80; // Spacing after header

    // Info row: Teacher Name | Course | Week of (centered)
    const weekStart = weekDays[0];
    const weekEnd = weekDays[4];
    const weekRange = `${format(weekStart, "MMMM d")}-${format(weekEnd, "d, yyyy")}`;

    const infoText = `Teacher Name: ${teacherName || "___________"}          Course: ${courseName || "___________"}          Week of: ${weekRange}`;
    
    const estimatedInfoWidth = infoText.length * 4.5;
    const infoX = (PAGE.width - estimatedInfoWidth) / 2;
    
    page.drawText(infoText, {
      x: infoX,
      y,
      size: FONTS.label,
      color: COLORS.text,
      font: fonts.bold,
    });

    y -= 15;
  } else {
    // Continuation pages - smaller header
    const title = `Weekly Lesson Plans (Page ${pageIndex + 1} of ${totalPages})`;
    const titleWidth = title.length * FONTS.subtitle * 0.6;
    const titleX = (PAGE.width - titleWidth) / 2;
    
    page.drawText(title, {
      x: titleX,
      y,
      size: FONTS.subtitle,
      color: COLORS.headerText,
      font: fonts.bold,
    });

    y -= 30;
  }

  // Separator line
  page.drawLine({
    start: { x: PAGE.margin.left, y },
    end: { x: PAGE.width - PAGE.margin.right, y },
    color: COLORS.border,
    thickness: 1,
  });

  y -= 10;

  // === COLUMN LAYOUT ===
  const contentWidth = PAGE.width - PAGE.margin.left - PAGE.margin.right;
  const columnWidth = contentWidth / 5;
  const columnGap = 4;
  const columnTop = y;
  const columnBottom = PAGE.margin.bottom + 30;
  const availableHeight = columnTop - columnBottom;

  // Draw day columns with pagination support
  weekDays.forEach((day, index) => {
    const x = PAGE.margin.left + index * columnWidth;
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(dayKey) || [];
    
    // Get events for this specific page
    const distribution = paginationInfo.eventDistribution.get(dayKey) || [];
    const pageDistribution = distribution.find(d => d.page === pageIndex);
    const eventsForThisPage = pageDistribution ? pageDistribution.events : [];

    drawDayColumnWithEvents(page, {
      x,
      y: columnTop,
      width: columnWidth - columnGap,
      availableHeight,
      dayName: WEEKDAYS[index],
      dayDate: day,
      events: eventsForThisPage,
      allDayEvents: dayEvents,
      fonts,
      pageIndex,
    });
  });

  // Footer with page number
  const footerText = totalPages > 1 
    ? `Page ${pageIndex + 1} of ${totalPages} | Generated: ${format(new Date(), "MMM d, yyyy")}`
    : `Generated: ${format(new Date(), "MMM d, yyyy")}`;
  
  page.drawText(footerText, {
    x: PAGE.margin.left,
    y: 20,
    size: FONTS.small,
    color: COLORS.lightText,
    font: fonts.regular,
  });
}

// ============================================================================
// DAY COLUMN WITH MULTIPLE EVENT CARDS
// ============================================================================

interface DayColumnWithEventsOptions {
  x: number;
  y: number;
  width: number;
  availableHeight: number;
  dayName: string;
  dayDate: Date;
  events: CalendarEvent[]; // Events to show on this specific page
  allDayEvents: CalendarEvent[]; // All events for the day (for empty check)
  fonts: Fonts;
  pageIndex: number;
}

interface EventCardOptions {
  x: number;
  y: number;
  width: number;
  event: CalendarEvent;
  fonts: Fonts;
}

// Draw a single event card with border
function drawEventCard(
  page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>,
  options: EventCardOptions
): number {
  const { x, y, width, event, fonts } = options;
  const padding = 6;
  const textWidth = width - padding * 2;
  let contentY = y - padding;

  // Calculate card height first
  let cardHeight = padding * 2; // top + bottom padding
  const lineHeight = 10;

  // Group section
  if (event.groupCode) {
    cardHeight += 12; // Label
    cardHeight += lineHeight; // Group code value
  }
  cardHeight += 8; // Section spacing

  // Standards
  if (event.standards && event.standards.length > 0) {
    cardHeight += 12; // Label
    cardHeight += event.standards.slice(0, 3).length * lineHeight;
  }
  cardHeight += 8; // Section spacing

  // Objectives
  if (event.objectives) {
    cardHeight += 12; // Label
    const objectiveLines = wrapText(event.objectives, 22);
    cardHeight += objectiveLines.slice(0, 8).length * lineHeight;
  }
  cardHeight += 8; // Section spacing

  // Lesson
  if (event.lesson) {
    cardHeight += 12; // Label
    const lessonLines = wrapText(event.lesson, 22);
    cardHeight += lessonLines.slice(0, 6).length * lineHeight;
  }

  // Additional Info
  if (event.additionalInfo) {
    cardHeight += 8; // Section spacing
    cardHeight += 12; // Label
    const additionalLines = wrapText(event.additionalInfo, 22);
    cardHeight += additionalLines.slice(0, 8).length * lineHeight;
  }

  // Draw card bottom border (separator line)
  page.drawLine({
    start: { x, y: y - cardHeight },
    end: { x: x + width, y: y - cardHeight },
    color: rgb(0.5, 0.5, 0.5),
    thickness: 0.8,
  });

  // === GROUP SECTION ===
  if (event.groupCode) {
    page.drawText("Group:", {
      x: x + padding,
      y: contentY,
      size: FONTS.label,
      color: COLORS.headerText,
      font: fonts.bold,
    });
    contentY -= 12;

    page.drawText(event.groupCode, {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.text,
      font: fonts.regular,
    });
    contentY -= lineHeight;
    contentY -= 8; // Section spacing
  }

  // === STANDARDS SECTION ===
  page.drawText("Standards:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  if (event.standards && event.standards.length > 0) {
    event.standards.slice(0, 3).forEach((standard) => {
      const bulletText = `• ${truncateText(standard, 18)}`;
      page.drawText(bulletText, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= lineHeight;
    });
  } else {
    page.drawText("• N/A", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    contentY -= lineHeight;
  }

  contentY -= 8;

  // === OBJECTIVES SECTION ===
  page.drawText("Objectives:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  if (event.objectives) {
    const objectiveLines = wrapText(event.objectives, 22);
    objectiveLines.slice(0, 8).forEach((line) => {
      page.drawText(line, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= lineHeight;
    });
  } else {
    page.drawText("N/A", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    contentY -= lineHeight;
  }

  contentY -= 8;

  // === LESSON SECTION ===
  page.drawText("Lesson #:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  if (event.lesson) {
    const lessonLines = wrapText(event.lesson, 22);
    lessonLines.slice(0, 6).forEach((line) => {
      page.drawText(line, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= lineHeight;
    });
  } else {
    page.drawText("N/A", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    contentY -= lineHeight;
  }

  // === ADDITIONAL INFO SECTION ===
  if (event.additionalInfo) {
    contentY -= 8;
    page.drawText("Additional Information:", {
      x: x + padding,
      y: contentY,
      size: FONTS.label,
      color: COLORS.headerText,
      font: fonts.bold,
    });
    contentY -= 12;

    const additionalLines = wrapText(event.additionalInfo, 22);
    additionalLines.slice(0, 8).forEach((line) => {
      page.drawText(line, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= lineHeight;
    });
  }

  return cardHeight;
}

// Draw day column with event cards for this page
function drawDayColumnWithEvents(
  page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>,
  options: DayColumnWithEventsOptions
) {
  const { x, y, width, availableHeight, dayName, events, allDayEvents, fonts, pageIndex } = options;

  // Column background and border
  const columnBottom = y - availableHeight;
  page.drawRectangle({
    x,
    y: columnBottom,
    width,
    height: availableHeight,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  // Day header background (only on first page)
  if (pageIndex === 0) {
    const headerHeight = 20;
    page.drawRectangle({
      x,
      y: y - headerHeight,
      width,
      height: headerHeight,
      color: COLORS.headerBg,
      borderColor: COLORS.border,
      borderWidth: 0.5,
    });

    // Day name (bold) - dynamically centered
    const dayNameWidth = dayName.length * FONTS.header * 0.6;
    const dayNameX = x + (width - dayNameWidth) / 2;
    
    page.drawText(dayName, {
      x: dayNameX,
      y: y - 14,
      size: FONTS.header,
      color: COLORS.headerText,
      font: fonts.bold,
    });
  }

  let contentY = pageIndex === 0 ? y - 20 - 10 : y - 10; // Start below header on first page
  const padding = 8;
  const cardMargin = 8;

  // Show "No lesson scheduled" only on first page if there are no events at all
  if (allDayEvents.length === 0 && pageIndex === 0) {
    page.drawText("No lesson scheduled", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    return;
  }

  // Draw event cards for this page (already filtered by pagination)
  events.forEach((event) => {
    const cardHeight = drawEventCard(page, {
      x,
      y: contentY,
      width,
      event,
      fonts,
    });

    contentY -= cardHeight + cardMargin;
  });
}

// ============================================================================
// PAGE 1: Header + Standards/Objectives/Lesson#
// ============================================================================

interface Page1Options {
  weekDays: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  teacherName?: string;
  courseName?: string;
  campusName?: string;
  schoolYear?: string;
  fonts: Fonts;
  logo: ReturnType<ReturnType<typeof PDF.create>["embedPng"]>;
}

function drawPage1(page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>, options: Page1Options) {
  const { weekDays, eventsByDay, teacherName, courseName, campusName, schoolYear, fonts, logo } = options;

  let y = PAGE.height - PAGE.margin.top;

  // === HEADER SECTION (CENTERED) ===
  
  // Logo + text block - centered
  const logoWidth = 60;
  const logoHeight = 60;
  const logoTextGap = 15;
  
  // Calculate approximate text width for centering
  // "Weekly Lesson Plans" is approximately 170pts wide
  const estimatedTextWidth = 170;
  const totalHeaderWidth = logoWidth + logoTextGap + estimatedTextWidth;
  
  // Center the entire block
  const blockStartX = (PAGE.width - totalHeaderWidth) / 2;
  const logoX = blockStartX;
  const textStartX = blockStartX + logoWidth + logoTextGap;
  
  // Draw logo
  page.drawImage(logo, {
    x: logoX,
    y: y - logoHeight + 10,
    width: logoWidth,
    height: logoHeight,
  });

  // Campus Name and Title (to the right of logo)
  if (campusName) {
    page.drawText(campusName, {
      x: textStartX,
      y: y - 8,
      size: FONTS.subtitle,
      color: COLORS.headerText,
      font: fonts.bold,
    });
  }

  // Title: "Weekly Lesson Plans"
  const title = "Weekly Lesson Plans";
  page.drawText(title, {
    x: textStartX,
    y: y - 25,
    size: FONTS.title,
    color: COLORS.headerText,
    font: fonts.bold,
  });

  // School Year
  const yearText = schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  page.drawText(yearText, {
    x: textStartX,
    y: y - 42,
    size: FONTS.subtitle,
    color: COLORS.text,
    font: fonts.regular,
  });

  y -= 80; // Increased spacing after header

  // Info row: Teacher Name | Course | Week of (centered)
  const weekStart = weekDays[0];
  const weekEnd = weekDays[4];
  const weekRange = `${format(weekStart, "MMMM d")}-${format(weekEnd, "d, yyyy")}`;

  const infoText = `Teacher Name: ${teacherName || "___________"}          Course: ${courseName || "___________"}          Week of: ${weekRange}`;
  
  // Approximate text width (chars * ~4.5pts per char at size 9)
  const estimatedInfoWidth = infoText.length * 4.5;
  const infoX = (PAGE.width - estimatedInfoWidth) / 2;
  
  page.drawText(infoText, {
    x: infoX,
    y,
    size: FONTS.label,
    color: COLORS.text,
    font: fonts.bold,
  });

  y -= 15;

  // Separator line
  page.drawLine({
    start: { x: PAGE.margin.left, y },
    end: { x: PAGE.width - PAGE.margin.right, y },
    color: COLORS.border,
    thickness: 1,
  });

  y -= 10;

  // === COLUMN LAYOUT ===
  const contentWidth = PAGE.width - PAGE.margin.left - PAGE.margin.right;
  const columnWidth = contentWidth / 5;
  const columnGap = 4;
  const cardTop = y;
  const cardBottom = PAGE.margin.bottom + 30;
  const cardHeight = cardTop - cardBottom;

  // Draw day columns
  weekDays.forEach((day, index) => {
    const x = PAGE.margin.left + index * columnWidth;
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(dayKey) || [];

    drawDayColumn(page, {
      x,
      y: cardTop,
      width: columnWidth - columnGap,
      height: cardHeight,
      dayName: WEEKDAYS[index],
      dayDate: day,
      events: dayEvents,
      fonts,
    });
  });

  // Footer
  page.drawText(
    `Generated: ${format(new Date(), "MMM d, yyyy")}`,
    {
      x: PAGE.margin.left,
      y: 20,
      size: FONTS.small,
      color: COLORS.lightText,
      font: fonts.regular,
    }
  );
}

// ============================================================================
// DAY COLUMN (Page 1)
// ============================================================================

interface DayColumnOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  dayName: string;
  dayDate: Date;
  events: CalendarEvent[];
  fonts: Fonts;
}

function drawDayColumn(
  page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>,
  options: DayColumnOptions
) {
  const { x, y, width, height, dayName, events, fonts } = options;

  // Card border
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  // Day header background
  const headerHeight = 20;
  page.drawRectangle({
    x,
    y: y - headerHeight,
    width,
    height: headerHeight,
    color: COLORS.headerBg,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  // Day name (bold) - dynamically centered
  // Calculate approximate text width: chars * size * 0.6 (average char width ratio)
  const dayNameWidth = dayName.length * FONTS.header * 0.6;
  const dayNameX = x + (width - dayNameWidth) / 2;
  
  page.drawText(dayName, {
    x: dayNameX,
    y: y - 14,
    size: FONTS.header,
    color: COLORS.headerText,
    font: fonts.bold,
  });

  let contentY = y - headerHeight - 15;
  const padding = 8;
  const textWidth = width - padding * 2;

  if (events.length === 0) {
    page.drawText("No lesson scheduled", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    return;
  }

  // For simplicity, show first event (multiple events per day would need different handling)
  const event = events[0];

  // === STANDARDS SECTION ===
  page.drawText("Standards:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  if (event.standards && event.standards.length > 0) {
    event.standards.slice(0, 3).forEach((standard) => {
      const bulletText = `• ${truncateText(standard, 18)}`;
      page.drawText(bulletText, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= 10;
    });
  } else {
    page.drawText("• N/A", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    contentY -= 10;
  }

  contentY -= 8;

  // === OBJECTIVES SECTION ===
  page.drawText("Objectives:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  if (event.objectives) {
    // Split objectives into lines that fit the column width
    const objectiveLines = wrapText(event.objectives, 22);
    objectiveLines.slice(0, 8).forEach((line) => {
      page.drawText(line, {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.text,
        font: fonts.regular,
      });
      contentY -= 10;
    });
    if (objectiveLines.length > 8) {
      page.drawText("...", {
        x: x + padding,
        y: contentY,
        size: FONTS.body,
        color: COLORS.lightText,
        font: fonts.regular,
      });
      contentY -= 10;
    }
  } else {
    page.drawText("N/A", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    contentY -= 10;
  }

  // === LESSON # at bottom ===
  const lessonY = y - height + 15;
  const lessonText = event.lessonTitle 
    ? `Lesson: ${truncateText(event.lessonTitle, 16)}`
    : event.lesson 
      ? `Lesson: ${truncateText(event.lesson, 16)}`
      : "";
  
  if (lessonText) {
    page.drawText(lessonText, {
      x: x + padding,
      y: lessonY,
      size: FONTS.label,
      color: COLORS.headerText,
      font: fonts.bold,
    });
  }
}

// ============================================================================
// PAGE 2: Additional Information (Before/During/After)
// ============================================================================

interface Page2Options {
  weekDays: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  fonts: Fonts;
}

function drawPage2(page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>, options: Page2Options) {
  const { weekDays, eventsByDay, fonts } = options;

  let y = PAGE.height - PAGE.margin.top;

  // Title
  page.drawText("Additional Information / Notes", {
    x: PAGE.width / 2 - 100,
    y,
    size: FONTS.title,
    color: COLORS.headerText,
    font: fonts.bold,
  });

  y -= 30;

  // Separator
  page.drawLine({
    start: { x: PAGE.margin.left, y },
    end: { x: PAGE.width - PAGE.margin.right, y },
    color: COLORS.border,
    thickness: 1,
  });

  y -= 15;

  // Column layout
  const contentWidth = PAGE.width - PAGE.margin.left - PAGE.margin.right;
  const columnWidth = contentWidth / 5;
  const columnGap = 4;
  const cardTop = y;
  const cardBottom = PAGE.margin.bottom + 20;
  const cardHeight = cardTop - cardBottom;

  weekDays.forEach((day, index) => {
    const x = PAGE.margin.left + index * columnWidth;
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDay.get(dayKey) || [];

    drawAdditionalInfoColumn(page, {
      x,
      y: cardTop,
      width: columnWidth - columnGap,
      height: cardHeight,
      dayName: WEEKDAYS[index],
      events: dayEvents,
      fonts,
    });
  });

  // Footer
  page.drawText("CPCA Teachers Portal", {
    x: PAGE.width - PAGE.margin.right - 120,
    y: 20,
    size: FONTS.small,
    color: COLORS.lightText,
    font: fonts.regular,
  });
}

interface AdditionalInfoColumnOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  dayName: string;
  events: CalendarEvent[];
  fonts: Fonts;
}

function drawAdditionalInfoColumn(
  page: ReturnType<ReturnType<typeof PDF.create>["addPage"]>,
  options: AdditionalInfoColumnOptions
) {
  const { x, y, width, height, dayName, events, fonts } = options;

  // Card border
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  // Day header
  const headerHeight = 20;
  page.drawRectangle({
    x,
    y: y - headerHeight,
    width,
    height: headerHeight,
    color: COLORS.headerBg,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  // Day name (bold) - dynamically centered
  const dayNameWidth = dayName.length * FONTS.header * 0.6;
  const dayNameX = x + (width - dayNameWidth) / 2;
  
  page.drawText(dayName, {
    x: dayNameX,
    y: y - 14,
    size: FONTS.header,
    color: COLORS.headerText,
    font: fonts.bold,
  });

  let contentY = y - headerHeight - 15;
  const padding = 8;

  if (events.length === 0 || !events[0].additionalInfo) {
    page.drawText("No additional info", {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.lightText,
      font: fonts.regular,
    });
    return;
  }

  const event = events[0];

  // PENDING: The template has structured Before/During/After sections
  // Our additionalInfo is a single string. Displaying as-is for now.
  
  page.drawText("Notes:", {
    x: x + padding,
    y: contentY,
    size: FONTS.label,
    color: COLORS.headerText,
    font: fonts.bold,
  });
  contentY -= 12;

  const lines = wrapText(event.additionalInfo || "", 20);
  lines.slice(0, 15).forEach((line) => {
    page.drawText(line, {
      x: x + padding,
      y: contentY,
      size: FONTS.body,
      color: COLORS.text,
      font: fonts.regular,
    });
    contentY -= 10;
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupEventsByDay(events: CalendarEvent[], weekDays: Date[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  weekDays.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    map.set(dayKey, []);
  });

  events.forEach((event) => {
    const eventDate = new Date(event.date);
    const dayKey = format(eventDate, "yyyy-MM-dd");
    if (map.has(dayKey)) {
      map.get(dayKey)!.push(event);
    }
  });

  return map;
}

function deriveCourseName(events: CalendarEvent[]): string | undefined {
  // Find the most common course name in events
  const courseNames = events
    .map((e) => e.curriculumName || e.course)
    .filter(Boolean);
  
  if (courseNames.length === 0) return undefined;
  
  // Return most frequent
  const counts = courseNames.reduce((acc, name) => {
    acc[name!] = (acc[name!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxCharsPerLine 
        ? truncateText(word, maxCharsPerLine) 
        : word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

/**
 * Download the PDF in the browser
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  // Create ArrayBuffer to satisfy BlobPart type
  const buffer = new ArrayBuffer(pdfBytes.length);
  const view = new Uint8Array(buffer);
  view.set(pdfBytes);

  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
