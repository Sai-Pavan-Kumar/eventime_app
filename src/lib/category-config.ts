export interface CategoryMeta {
  accentColor: string;
  bgLight: string;
  template?: string;
}

export const CATEGORIES_LIST = [
  "AI Event", "Auto & EV Expo", "Awards Night", "Career Event", "Charity Event", "College Event", "College Fest",
  "Comedy Show", "Community Event", "Concert", "Conference", "Creator Meetup", "Developer Event", "Exhibition", "Film Festival",
  "Fitness Event", "Food Festival", "Founder Meetup", "Gaming & Esports", "Hackathon", "Investor Event", "Music Festival",
  "Open Mic", "Pet Event", "Running Event", "Sports Tournament", "Startup Event", "Summit", "Tech Event",
  "Wellness Event", "Women Event", "Workshop"
] as const;

export const CATEGORY_CONFIG: Record<string, { accentColor: string; bgLight: string }> = {
  'AI Event': { accentColor: '#7C3AED', bgLight: '#F5F3FF' },
  'Auto & EV Expo': { accentColor: '#06B6D4', bgLight: '#ECFEFF' },
  'Awards Night': { accentColor: '#EAB308', bgLight: '#FEFCE8' },
  'Career Event': { accentColor: '#0EA5E9', bgLight: '#F0F9FF' },
  'Charity Event': { accentColor: '#06B6D4', bgLight: '#ECFEFF' },
  'College Event': { accentColor: '#2563EB', bgLight: '#EFF6FF' },
  'College Fest': { accentColor: '#9333EA', bgLight: '#FAF5FF' },
  'Comedy Show': { accentColor: '#F59E0B', bgLight: '#FFFBEB' },
  'Community Event': { accentColor: '#14B8A6', bgLight: '#F0FDFA' },
  'Concert': { accentColor: '#D946EF', bgLight: '#FDF4FF' },
  'Conference': { accentColor: '#6366F1', bgLight: '#EEF2FF' },
  'Creator Meetup': { accentColor: '#F97316', bgLight: '#FFF7ED' },
  'Default Event': { accentColor: '#6C47FF', bgLight: '#EEF0FF' },
  'Developer Event': { accentColor: '#2563EB', bgLight: '#EFF6FF' },
  'Exhibition': { accentColor: '#EC4899', bgLight: '#FDF2F8' },
  'Film Festival': { accentColor: '#DC2626', bgLight: '#FEF2F2' },
  'Fitness Event': { accentColor: '#16A34A', bgLight: '#F0FDF4' },
  'Food Festival': { accentColor: '#EA580C', bgLight: '#FFF7ED' },
  'Founder Meetup': { accentColor: '#8B5CF6', bgLight: '#F5F3FF' },
  'Gaming & Esports': { accentColor: '#0284C7', bgLight: '#F0F9FF' },
  'Hackathon': { accentColor: '#4F46E5', bgLight: '#EEF2FF' },
  'Investor Event': { accentColor: '#059669', bgLight: '#ECFDF5' },
  'Music Festival': { accentColor: '#C026D3', bgLight: '#FDF4FF' },
  'Open Mic': { accentColor: '#D97706', bgLight: '#FFFBEB' },
  'Pet Event': { accentColor: '#0D9488', bgLight: '#F0FDFA' },
  'Running Event': { accentColor: '#16A34A', bgLight: '#F0FDF4' },
  'Sports Tournament': { accentColor: '#2563EB', bgLight: '#EFF6FF' },
  'Startup Event': { accentColor: '#6C47FF', bgLight: '#EEF0FF' },
  'Summit': { accentColor: '#4338CA', bgLight: '#EEF2FF' },
  'Tech Event': { accentColor: '#7C3AED', bgLight: '#F5F3FF' },
  'Wellness Event': { accentColor: '#059669', bgLight: '#ECFDF5' },
  'Women Event': { accentColor: '#DB2777', bgLight: '#FDF2F8' },
  'Workshop': { accentColor: '#0891B2', bgLight: '#ECFEFF' },
};

export function getCategoryMeta(categoryName: string) {
  return CATEGORY_CONFIG[categoryName] || { accentColor: '#6C47FF', bgLight: '#EEF0FF' };
}