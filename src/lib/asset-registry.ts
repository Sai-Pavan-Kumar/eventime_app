// Central static asset registry for React Native bundling
// Resolves 100% genuine .webp assets without dynamic require errors

export const APP_ASSETS = {
  logo: require('../../assets/logo1.webp'),
  sbLogo: require('../../assets/sb-logo.webp'),
  heroBanner: require('../../assets/hero-section-v2.webp'),
  illustrations: {
    empty: require('../../assets/illustrations/empty_state3.webp'),
    search: require('../../assets/illustrations/search_state.webp'),
    error: require('../../assets/illustrations/error_state3.webp'),
    notFound: require('../../assets/illustrations/404_state3.webp'),
    emptySaved: require('../../assets/empty-saved.webp'),
    emptyProfile: require('../../assets/empty-profile.webp'),
    throneEmpty: require('../../assets/throne-empty.webp'),
  },
};

const CATEGORY_ASSET_MAP: Record<string, any> = {
  'ai-event': require('../../assets/card-backgrounds/ai-event.webp'),
  'alumni-event': require('../../assets/card-backgrounds/alumni-event.webp'),
  'auto-ev-expo': require('../../assets/card-backgrounds/auto-ev-expo.webp'),
  'awards-night': require('../../assets/card-backgrounds/awards-night.webp'),
  'career-event': require('../../assets/card-backgrounds/career-event.webp'),
  'charity-event': require('../../assets/card-backgrounds/charity-event.webp'),
  'college-event': require('../../assets/card-backgrounds/college-event.webp'),
  'college-fest': require('../../assets/card-backgrounds/college-fest.webp'),
  'comedy-show': require('../../assets/card-backgrounds/comedy-show.webp'),
  'community-event': require('../../assets/card-backgrounds/community-event.webp'),
  'concert': require('../../assets/card-backgrounds/concert.webp'),
  'conference': require('../../assets/card-backgrounds/conference.webp'),
  'creator-meetup': require('../../assets/card-backgrounds/creator-meetup.webp'),
  'default-event': require('../../assets/card-backgrounds/default-event.webp'),
  'developer-event': require('../../assets/card-backgrounds/developer-event.webp'),
  'educational-fair': require('../../assets/card-backgrounds/educational-fair.webp'),
  'exhibition': require('../../assets/card-backgrounds/exhibition.webp'),
  'expo': require('../../assets/card-backgrounds/expo.webp'),
  'film-festival': require('../../assets/card-backgrounds/film-festival.webp'),
  'fitness-event': require('../../assets/card-backgrounds/fitness-event.webp'),
  'food-festival': require('../../assets/card-backgrounds/food-festival.webp'),
  'founder-meetup': require('../../assets/card-backgrounds/founder-meetup.webp'),
  'gaming-esports': require('../../assets/card-backgrounds/gaming-esports.webp'),
  'hackathon': require('../../assets/card-backgrounds/hackathon.webp'),
  'investor-event': require('../../assets/card-backgrounds/investor-event.webp'),
  'music-festival': require('../../assets/card-backgrounds/music-festival.webp'),
  'networking-event': require('../../assets/card-backgrounds/networking-event.webp'),
  'open-mic': require('../../assets/card-backgrounds/open-mic.webp'),
  'pet-event': require('../../assets/card-backgrounds/pet-event.webp'),
  'running-event': require('../../assets/card-backgrounds/running-event.webp'),
  'sports-tournament': require('../../assets/card-backgrounds/sports-tournament.webp'),
  'startup-event': require('../../assets/card-backgrounds/startup-event.webp'),
  'summit': require('../../assets/card-backgrounds/summit.webp'),
  'tech-event': require('../../assets/card-backgrounds/tech-event.webp'),
  'wellness-event': require('../../assets/card-backgrounds/wellness-event.webp'),
  'women-event': require('../../assets/card-backgrounds/women-event.webp'),
  'workshop': require('../../assets/card-backgrounds/workshop.webp'),
};

const CITY_ASSET_MAP: Record<string, any> = {
  'ahmedabad': require('../../assets/cities/ahmedabad1.webp'),
  'anantapur': require('../../assets/cities/anantapur1.webp'),
  'bengaluru': require('../../assets/cities/bengaluru1.webp'),
  'bhopal': require('../../assets/cities/bhopal1.webp'),
  'chennai': require('../../assets/cities/chennai1.webp'),
  'coimbatore': require('../../assets/cities/coimbatore1.webp'),
  'default': require('../../assets/cities/default1.webp'),
  'guntur': require('../../assets/cities/guntur1.webp'),
  'gurugram': require('../../assets/cities/gurugram1.webp'),
  'hyderabad': require('../../assets/cities/hyderabad1.webp'),
  'indore': require('../../assets/cities/indore1.webp'),
  'jaipur': require('../../assets/cities/jaipur1.webp'),
  'kakinada': require('../../assets/cities/kakinada1.webp'),
  'kanpur': require('../../assets/cities/kanpur1.webp'),
  'karimnagar': require('../../assets/cities/karimnagar1.webp'),
  'khammam': require('../../assets/cities/khammam1.webp'),
  'kochi': require('../../assets/cities/kochi1.webp'),
  'kolkata': require('../../assets/cities/kolkata1.webp'),
  'lucknow': require('../../assets/cities/lucknow1.webp'),
  'mangaluru': require('../../assets/cities/mangaluru1.webp'),
  'mumbai': require('../../assets/cities/mumbai1.webp'),
  'mysuru': require('../../assets/cities/mysuru1.webp'),
  'nagpur': require('../../assets/cities/nagpur1.webp'),
  'new-delhi': require('../../assets/cities/new-delhi1.webp'),
  'nizamabad': require('../../assets/cities/nizamabad1.webp'),
  'noida': require('../../assets/cities/noida1.webp'),
  'online': require('../../assets/cities/online1.webp'),
  'pune': require('../../assets/cities/pune1.webp'),
  'surat': require('../../assets/cities/surat.webp'),
  'thiruvananthapuram': require('../../assets/cities/thiruvananthapuram1.webp'),
  'tirupati': require('../../assets/cities/tirupati1.webp'),
  'vijayawada': require('../../assets/cities/vijayawada1.webp'),
  'visakhapatnam': require('../../assets/cities/visakhapatnam1.webp'),
  'warangal': require('../../assets/cities/warangal1.webp'),
};

const CITY_COVER_MAP: Record<string, any> = {
  'ahmedabad': require('../../assets/cities/covers/ahmedabad1.webp'),
  'anantapur': require('../../assets/cities/covers/anantapur1.webp'),
  'bengaluru': require('../../assets/cities/covers/bengaluru1.webp'),
  'bhopal': require('../../assets/cities/covers/bhopal1.webp'),
  'chennai': require('../../assets/cities/covers/chennai1.webp'),
  'coimbatore': require('../../assets/cities/covers/coimbatore1.webp'),
  'default': require('../../assets/cities/covers/default1.webp'),
  'guntur': require('../../assets/cities/covers/guntur1.webp'),
  'gurugram': require('../../assets/cities/covers/gurugram1.webp'),
  'hyderabad': require('../../assets/cities/covers/hyderabad4.webp'),
  'indore': require('../../assets/cities/covers/indore1.webp'),
  'jaipur': require('../../assets/cities/covers/jaipur1.webp'),
  'kakinada': require('../../assets/cities/covers/kakinada1.webp'),
  'kanpur': require('../../assets/cities/covers/kanpur1.webp'),
  'karimnagar': require('../../assets/cities/covers/karimnagar1.webp'),
  'khammam': require('../../assets/cities/covers/khammam1.webp'),
  'kochi': require('../../assets/cities/covers/kochi1.webp'),
  'kolkata': require('../../assets/cities/covers/kolkata1.webp'),
  'lucknow': require('../../assets/cities/covers/lucknow1.webp'),
  'mangaluru': require('../../assets/cities/covers/mangaluru1.webp'),
  'mumbai': require('../../assets/cities/covers/mumbai1.webp'),
  'mysuru': require('../../assets/cities/covers/mysuru1.webp'),
  'nagpur': require('../../assets/cities/covers/nagpur1.webp'),
  'new-delhi': require('../../assets/cities/covers/new-delhi1.webp'),
  'nizamabad': require('../../assets/cities/covers/nizamabad1.webp'),
  'noida': require('../../assets/cities/covers/noida1.webp'),
  'online': require('../../assets/cities/covers/online1.webp'),
  'pune': require('../../assets/cities/covers/pune1.webp'),
  'thiruvananthapuram': require('../../assets/cities/covers/thiruvananthapuram1.webp'),
  'tirupati': require('../../assets/cities/covers/tirupati1.webp'),
  'vijayawada': require('../../assets/cities/covers/vijayawada1.webp'),
  'visakhapatnam': require('../../assets/cities/covers/visakhapatnam1.webp'),
  'warangal': require('../../assets/cities/covers/warangal1.webp'),
};

export function getCategoryPoster(category?: string | null) {
  if (!category) return CATEGORY_ASSET_MAP['default-event'];
  const slug = category.toLowerCase().trim().replace(/\s+/g, '-');
  return CATEGORY_ASSET_MAP[slug] || CATEGORY_ASSET_MAP['default-event'];
}

export function getCityImage(city?: string | null) {
  if (!city) return CITY_ASSET_MAP['default'];
  const slug = city.toLowerCase().trim().replace(/\s+/g, '-');
  return CITY_ASSET_MAP[slug] || CITY_ASSET_MAP['default'];
}

export function getCityCover(city?: string | null) {
  if (!city) return CITY_COVER_MAP['default'];
  const slug = city.toLowerCase().trim().replace(/\s+/g, '-');
  return CITY_COVER_MAP[slug] || CITY_COVER_MAP['default'];
}
