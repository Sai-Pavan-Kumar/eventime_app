export function parseEventDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const raw = dateStr.split(' · ')[0].trim();
    // Handle standard YYYY-MM-DD, ISO 8601 strings
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
