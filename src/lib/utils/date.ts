export function parseEventDateString(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const raw = dateStr.split(/[·•]/)[0].trim();
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed;
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
