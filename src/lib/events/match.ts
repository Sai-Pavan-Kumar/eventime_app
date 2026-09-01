// src/lib/events/match.ts

import type { EventRow, ProfileRow } from "@/types";

export function getMatchLabel(
  event: Partial<EventRow>, 
  profile: Partial<ProfileRow> | null
): string | undefined {
  if (!profile?.is_onboarded) return undefined;
  
  if (event.category && profile.goals?.includes(event.category)) {
    return `Matches Category: ${event.category}`;
  }
  
  if (event.city && profile.preferred_cities?.includes(event.city)) {
    return `Matches City: ${event.city}`;
  }
  
  return undefined;
}