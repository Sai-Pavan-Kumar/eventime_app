import { supabase } from './supabase';
import type { CollegeRow } from '../types';

export const WORD_NORMALIZATION: Record<string, string> = {
  clg: 'college',
  engg: 'engineering',
  eng: 'engineering',
  univ: 'university',
  varsity: 'university',
  inst: 'institute',
  tech: 'technology',
  govt: 'government',
};

export const COMMON_COLLEGE_ALIASES: Record<string, string> = {
  cbit: 'Chaitanya Bharathi',
  bits: 'Birla Institute',
  iiit: 'Information Technology',
  vnr: 'Vignana Jyothi',
  vnrvjiet: 'Vignana Jyothi',
  vbit: 'Vignana Bharathi',
  mgit: 'Mahatma Gandhi Institute of Technology',
  griet: 'Gokaraju',
  snist: 'Sreenidhi',
  mrec: 'Malla Reddy',
  mlrit: 'Marri Laxman',
  cmrec: 'CMR Engineering',
  nsut: 'Netaji Subhas',
  dtu: 'Delhi Technological',
};

export function cleanPrefix(name: string): string {
  // Strip AISHE codes or numbering like "130083-", "C497 ", etc.
  return name.replace(/^[\d\w]+[-_\s]+/, '');
}

// Global in-memory cache for instantaneous (0ms) results on repeated queries
const searchCache = new Map<string, CollegeRow[]>();

/**
 * Searches colleges with multi-word normalization, alias expansions, and caching.
 */
export async function searchColleges(rawQuery: string): Promise<CollegeRow[]> {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  // Check cache
  if (searchCache.has(query)) {
    return searchCache.get(query)!;
  }

  // Alias direct expansion e.g. "cbit" -> "Chaitanya Bharathi"
  const aliasMatch = COMMON_COLLEGE_ALIASES[query];
  const queryToUse = aliasMatch || query;

  const rawWords = queryToUse.split(/\s+/).filter(Boolean);
  const words = rawWords.map((w) => WORD_NORMALIZATION[w] || w);

  try {
    let directQuery = supabase
      .from('colleges')
      .select('id, name, slug, state, theme_color, logo_url, website');

    for (const w of words) {
      directQuery = directQuery.ilike('name', `%${w}%`);
    }

    const { data, error } = await directQuery.limit(10);
    if (error) throw error;

    const results = (data || []).map((col) => ({
      ...col,
      name: cleanPrefix(col.name),
    })) as CollegeRow[];

    searchCache.set(query, results);
    return results;
  } catch (err) {
    console.warn('[college-search] Query error:', err);
    return [];
  }
}
