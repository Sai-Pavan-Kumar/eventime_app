const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function parseEventDateString(dateStr?: string | null): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const raw = dateStr.split(/[·•]/)[0].trim();
    if (!raw) return null;

    // Pattern 1: ISO format YYYY-MM-DD (e.g. "2026-09-06" or "2026/09/06")
    const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Pattern 2: D Mon YYYY or DD Mon YYYY (e.g. "6 Sep 2026", "27 Sep 2026", "6 September 2026")
    const dMonYMatch = raw.match(/^(\d{1,2})\s+([a-zA-Z]+),?\s+(\d{4})/);
    if (dMonYMatch) {
      const day = parseInt(dMonYMatch[1], 10);
      const monKey = dMonYMatch[2].toLowerCase();
      const month = MONTH_NAMES[monKey];
      const year = parseInt(dMonYMatch[3], 10);
      if (month !== undefined) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // Pattern 3: Mon D, YYYY or Mon D YYYY (e.g. "Sep 6, 2026", "September 6 2026")
    const monDYMatch = raw.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (monDYMatch) {
      const monKey = monDYMatch[1].toLowerCase();
      const month = MONTH_NAMES[monKey];
      const day = parseInt(monDYMatch[2], 10);
      const year = parseInt(monDYMatch[3], 10);
      if (month !== undefined) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // Pattern 4: DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Fallback: standard Date parse
    const fallback = new Date(raw);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }

    return null;
  } catch {
    return null;
  }
}

export function formatEventTime(
  dateStr?: string | null,
  startTime?: string | null
): string {
  // 1. If explicit start_time field exists
  if (startTime && startTime.trim()) {
    return startTime.trim();
  }

  // 2. If date_string contains time like "2026-06-21 · 04:00 PM"
  if (dateStr && (dateStr.includes('·') || dateStr.includes('•'))) {
    const parts = dateStr.split(/[·•]/);
    if (parts.length > 1 && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  // 3. If ISO string with time component
  if (dateStr && dateStr.includes('T')) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const hours = parsed.getHours();
      const minutes = parsed.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        return parsed.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
  }

  // 4. Clean fallback matching website
  return 'All Day';
}

export function formatEventDateDetailed(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return 'Date TBA';
  const parsed = parseEventDateString(dateStr);
  if (!parsed) return dateStr.trim();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[parsed.getDay()]}, ${months[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}
