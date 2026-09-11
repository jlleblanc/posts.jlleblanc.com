// Cruising Altitude — static universe data
// Phase 1 scaffold. Timezones use STANDARD time offsets (no DST), so Arizona never shifts.

// Standard-time offsets in minutes east of UTC (e.g. EST = -300).
export const TZ = {
  EST: -300, CST: -360, MST: -420, PST: -480, AKST: -540, HST: -600,
};

export const AIRLINES = [
  { id: 'VL', name: 'Velvet', fullName: 'Velvet Airways', color: '#8a1a3a', accent: '#d4a574', vibe: 'Luxury & romance', icon: '💋', hubs: ['JFK', 'LAX', 'MIA', 'SFO', 'BOS'], lounge: 'The Velvet Room' },
  { id: 'BF', name: 'Bearforce', fullName: 'BearForce One', color: '#5c3a21', accent: '#f0c040', vibe: 'Woodsy & warm', icon: '🐻', hubs: ['ORD', 'DEN', 'SEA', 'MSP', 'SFO'], lounge: 'The Den' },
  { id: 'PR', name: 'Prism', fullName: 'Prism Airways', color: '#6a2fb8', accent: '#00e5ff', vibe: 'Rainbow & radiant', icon: '🌈', hubs: ['ATL', 'DTW', 'CLT', 'BNA', 'RDU'], lounge: 'Prism Club' },
  { id: 'AD', name: 'Adonis', fullName: 'Adonis Air', color: '#e9407a', accent: '#00f0ff', vibe: 'Circuit & glossy', icon: '✨', hubs: ['LAS', 'PHX', 'FLL', 'TPA', 'LAX'], lounge: 'Adonis Lounge' },
  { id: 'HR', name: 'Harbor', fullName: 'Harbor Air', color: '#0f2a44', accent: '#c8a96a', vibe: 'Leather & late-night', icon: '⚓', hubs: ['DFW', 'IAH', 'MSY', 'DAL', 'HOU'], lounge: 'The Harbor' },
];

export function getAirlineById(id) {
  return AIRLINES.find((a) => a.id === id);
}

// Airports: tzOffsetStd handles display. Arizona (PHX) stays MST year-round by design.
export const AIRPORTS = [
  { id: 'ATL', name: 'Atlanta', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: true, capacity: 10, lat: 33.6407, lon: -84.4277, delayRisk: 0.18, avgDelay: 50 },
  { id: 'BOS', name: 'Boston', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: true, capacity: 8, lat: 42.3656, lon: -71.0096, delayRisk: 0.19, avgDelay: 50 },
  { id: 'CLT', name: 'Charlotte', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: false, capacity: 5, lat: 35.214, lon: -80.9431, delayRisk: 0.12, avgDelay: 40 },
  { id: 'ORD', name: 'Chicago', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'midwest', isHub: true, capacity: 10, lat: 41.9742, lon: -87.9073, delayRisk: 0.25, avgDelay: 65 },
  { id: 'CVG', name: 'Cincinnati', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'midwest', isHub: false, capacity: 4, lat: 39.0488, lon: -84.6678, delayRisk: 0.08, avgDelay: 30 },
  { id: 'CLE', name: 'Cleveland', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'midwest', isHub: false, capacity: 4, lat: 41.4117, lon: -81.8498, delayRisk: 0.13, avgDelay: 40 },
  { id: 'CMH', name: 'Columbus', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'midwest', isHub: false, capacity: 4, lat: 39.998, lon: -82.8919, delayRisk: 0.09, avgDelay: 32 },
  { id: 'DAL', name: 'Dallas Love', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'south', isHub: true, capacity: 8, lat: 32.8471, lon: -96.8518, delayRisk: 0.11, avgDelay: 38 },
  { id: 'DFW', name: 'Dallas-Fort Worth', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'south', isHub: true, capacity: 10, lat: 32.8998, lon: -97.0403, delayRisk: 0.15, avgDelay: 45 },
  { id: 'DEN', name: 'Denver', tzOffsetStd: TZ.MST, tzAbbr: 'MST', region: 'west', isHub: true, capacity: 8, lat: 39.8561, lon: -104.6737, delayRisk: 0.10, avgDelay: 35 },
  { id: 'DTW', name: 'Detroit', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'midwest', isHub: false, capacity: 5, lat: 42.2124, lon: -83.3534, delayRisk: 0.14, avgDelay: 42 },
  { id: 'FLL', name: 'Fort Lauderdale', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: false, capacity: 5, lat: 26.0726, lon: -80.1527, delayRisk: 0.11, avgDelay: 38 },
  { id: 'HNL', name: 'Honolulu', tzOffsetStd: TZ.HST, tzAbbr: 'HST', region: 'hawaii', isHub: true, capacity: 6, lat: 21.3187, lon: -157.9225, delayRisk: 0.06, avgDelay: 25 },
  { id: 'ANC', name: 'Anchorage', tzOffsetStd: TZ.AKST, tzAbbr: 'AKST', region: 'alaska', isHub: false, capacity: 4, lat: 61.1743, lon: -149.9962, delayRisk: 0.10, avgDelay: 35 },
  { id: 'IAH', name: 'Houston', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'south', isHub: true, capacity: 8, lat: 29.9844, lon: -95.3414, delayRisk: 0.16, avgDelay: 48 },
  { id: 'HOU', name: 'Houston Hobby', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'south', isHub: false, capacity: 4, lat: 29.6454, lon: -95.2789, delayRisk: 0.09, avgDelay: 32 },
  { id: 'IND', name: 'Indianapolis', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'midwest', isHub: false, capacity: 4, lat: 39.7173, lon: -86.2945, delayRisk: 0.08, avgDelay: 30 },
  { id: 'JFK', name: 'New York JFK', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: true, capacity: 10, lat: 40.6413, lon: -73.7781, delayRisk: 0.22, avgDelay: 60 },
  { id: 'LGA', name: 'New York LaGuardia', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 6, lat: 40.7769, lon: -73.874, delayRisk: 0.21, avgDelay: 58 },
  { id: 'EWR', name: 'Newark', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 6, lat: 40.6895, lon: -74.1745, delayRisk: 0.20, avgDelay: 55 },
  { id: 'LAX', name: 'Los Angeles', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: true, capacity: 10, lat: 33.9416, lon: -118.4085, delayRisk: 0.13, avgDelay: 42 },
  { id: 'LAS', name: 'Las Vegas', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: true, capacity: 8, lat: 36.084, lon: -115.1537, delayRisk: 0.09, avgDelay: 32 },
  { id: 'MCI', name: 'Kansas City', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'midwest', isHub: false, capacity: 4, lat: 39.2976, lon: -94.7139, delayRisk: 0.07, avgDelay: 28 },
  { id: 'MIA', name: 'Miami', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: true, capacity: 8, lat: 25.7959, lon: -80.287, delayRisk: 0.14, avgDelay: 45 },
  { id: 'MSP', name: 'Minneapolis', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'midwest', isHub: true, capacity: 6, lat: 44.8848, lon: -93.2223, delayRisk: 0.12, avgDelay: 40 },
  { id: 'BNA', name: 'Nashville', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'southeast', isHub: false, capacity: 5, lat: 36.1263, lon: -86.6782, delayRisk: 0.09, avgDelay: 30 },
  { id: 'MSY', name: 'New Orleans', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'south', isHub: false, capacity: 5, lat: 29.9934, lon: -90.258, delayRisk: 0.10, avgDelay: 35 },
  { id: 'OAK', name: 'Oakland', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: false, capacity: 4, lat: 37.7214, lon: -122.2208, delayRisk: 0.08, avgDelay: 30 },
  { id: 'PDX', name: 'Portland', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: false, capacity: 5, lat: 45.5898, lon: -122.5951, delayRisk: 0.09, avgDelay: 32 },
  { id: 'PHL', name: 'Philadelphia', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 6, lat: 39.8729, lon: -75.2437, delayRisk: 0.17, avgDelay: 48 },
  { id: 'PHX', name: 'Phoenix', tzOffsetStd: TZ.MST, tzAbbr: 'MST', region: 'west', isHub: true, capacity: 6, lat: 33.4352, lon: -112.0101, delayRisk: 0.07, avgDelay: 28 },
  { id: 'PIT', name: 'Pittsburgh', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 4, lat: 40.4915, lon: -80.2329, delayRisk: 0.10, avgDelay: 35 },
  { id: 'RDU', name: 'Raleigh-Durham', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: false, capacity: 4, lat: 35.8776, lon: -78.7875, delayRisk: 0.08, avgDelay: 30 },
  { id: 'SAN', name: 'San Diego', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: false, capacity: 5, lat: 32.7338, lon: -117.1933, delayRisk: 0.08, avgDelay: 30 },
  { id: 'SFO', name: 'San Francisco', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: true, capacity: 8, lat: 37.6213, lon: -122.379, delayRisk: 0.16, avgDelay: 48 },
  { id: 'SEA', name: 'Seattle', tzOffsetStd: TZ.PST, tzAbbr: 'PST', region: 'west', isHub: true, capacity: 7, lat: 47.4502, lon: -122.3088, delayRisk: 0.11, avgDelay: 38 },
  { id: 'STL', name: 'St. Louis', tzOffsetStd: TZ.CST, tzAbbr: 'CST', region: 'midwest', isHub: false, capacity: 4, lat: 38.7487, lon: -90.37, delayRisk: 0.09, avgDelay: 32 },
  { id: 'TPA', name: 'Tampa', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'southeast', isHub: false, capacity: 5, lat: 27.9755, lon: -82.5332, delayRisk: 0.09, avgDelay: 32 },
  { id: 'IAD', name: 'Washington Dulles', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 5, lat: 38.9531, lon: -77.4565, delayRisk: 0.15, avgDelay: 45 },
  { id: 'DCA', name: 'Washington Reagan', tzOffsetStd: TZ.EST, tzAbbr: 'EST', region: 'northeast', isHub: false, capacity: 5, lat: 38.8512, lon: -77.0402, delayRisk: 0.18, avgDelay: 52 },
];

export function getAirportById(id) {
  return AIRPORTS.find((a) => a.id === id);
}

// Symmetrized route map (two-way, prevents stranding). Carried over from layover.
export const CONNECTIONS = {
  ATL: ['BNA','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HOU','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','SAN','SEA','SFO','STL','TPA'],
  BNA: ['ATL','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','STL','TPA'],
  BOS: ['ATL','BNA','CLT','DCA','DEN','DFW','DTW','EWR','FLL','IAD','IAH','JFK','LAS','LAX','LGA','MIA','MSP','MSY','ORD','PHL','PIT','RDU','SEA','SFO','TPA'],
  CLE: ['ATL','BNA','CLT','DCA','JFK','ORD','PHL'],
  CLT: ['ATL','BNA','BOS','CLE','CMH','CVG','DCA','DFW','DTW','EWR','IAD','IND','JFK','LGA','MCI','MIA','MSY','ORD','PHL','PIT','RDU','STL','TPA'],
  CMH: ['ATL','BNA','CLT','DFW','ORD','PHL'],
  CVG: ['ATL','BNA','CLT','DFW','MSP','ORD','PHL'],
  DAL: ['ATL','BNA','DEN','DFW','HOU','IAH','JFK','LAS','LAX','MIA','MSY','ORD','PHX'],
  DCA: ['ATL','BNA','BOS','CLE','CLT','FLL','IAD','JFK','LAX','LGA','MIA','ORD','PHL','RDU','SFO'],
  DEN: ['ATL','BNA','BOS','DAL','DFW','HNL','HOU','IAH','JFK','LAS','LAX','MCI','MIA','MSP','MSY','OAK','ORD','PDX','PHX','SAN','SEA','SFO','STL'],
  DFW: ['ATL','BNA','BOS','CLT','CMH','CVG','DAL','DEN','DTW','IAH','IND','JFK','LAS','LAX','MCI','MIA','MSP','MSY','ORD','PHL','PHX','SAN','SEA','SFO','STL'],
  DTW: ['ATL','BOS','CLT','DFW','JFK','LAS','LAX','MIA','MSP','ORD','PHL','PHX'],
  EWR: ['ATL','BOS','CLT','FLL','JFK','LAS','LAX','MIA','ORD','SFO'],
  FLL: ['ATL','BOS','DCA','EWR','IAD','JFK','LAX','LGA','MIA','MSP','ORD','PHL','TPA'],
  HNL: ['DEN','IAH','JFK','LAS','LAX','ORD','PHX','SEA','SFO'],
  ANC: ['SEA','PDX','DEN','ORD'],
  HOU: ['ATL','DAL','DEN','LAS','LAX','MSY'],
  IAD: ['ATL','BNA','BOS','CLT','DCA','FLL','JFK','LAS','LAX','LGA','MIA','ORD','PHL','RDU','SFO'],
  IAH: ['ATL','BNA','BOS','DAL','DEN','DFW','HNL','JFK','LAS','LAX','MCI','MIA','MSP','MSY','ORD','PHX','SAN','SFO','STL'],
  IND: ['ATL','BNA','CLT','DFW','ORD','PHL','PHX'],
  JFK: ['ATL','BNA','BOS','CLE','CLT','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','IAD','IAH','LAS','LAX','LGA','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','SAN','SEA','SFO','TPA'],
  LAS: ['ATL','BNA','BOS','DAL','DEN','DFW','DTW','EWR','HNL','HOU','IAD','IAH','JFK','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SEA','SFO','STL'],
  LAX: ['ATL','BNA','BOS','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','HOU','IAD','IAH','JFK','LAS','MIA','MSP','MSY','OAK','ORD','PDX','PHL','PHX','PIT','RDU','SAN','SEA','SFO','TPA'],
  LGA: ['ATL','BNA','BOS','CLT','DCA','FLL','IAD','JFK','MIA','ORD','PHL','RDU'],
  MCI: ['ATL','BNA','CLT','DEN','DFW','IAH','ORD','PHX','STL'],
  MIA: ['ATL','BNA','BOS','CLT','DAL','DCA','DEN','DFW','DTW','EWR','FLL','IAD','IAH','JFK','LAS','LAX','LGA','MSY','ORD','PHL','PHX','RDU','SEA','SFO','TPA'],
  MSP: ['ATL','BNA','BOS','CVG','DEN','DFW','DTW','FLL','IAH','JFK','LAS','LAX','ORD','PHL','PHX','SEA','SFO'],
  MSY: ['ATL','BNA','BOS','CLT','DAL','DEN','DFW','HOU','IAH','JFK','LAX','MIA','ORD'],
  OAK: ['DEN','LAS','LAX','PDX','SEA','SFO'],
  ORD: ['ATL','BNA','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','ANC','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','PHL','PHX','PIT','RDU','SAN','SEA','SFO','STL','TPA'],
  PDX: ['DEN','LAS','LAX','OAK','SEA','SFO','ANC'],
  PHL: ['ATL','BNA','BOS','CLE','CLT','CMH','CVG','DCA','DFW','DTW','FLL','IAD','IND','JFK','LAX','LGA','MIA','MSP','ORD','PIT','RDU'],
  PHX: ['ATL','BNA','DAL','DEN','DFW','DTW','HNL','IAH','IND','JFK','LAS','LAX','MCI','MIA','MSP','ORD','SAN','SEA','SFO'],
  PIT: ['ATL','BNA','BOS','CLT','JFK','LAX','ORD','PHL'],
  RDU: ['ATL','BNA','BOS','CLT','DCA','IAD','JFK','LAX','LGA','MIA','ORD','PHL'],
  SAN: ['ATL','DEN','DFW','IAH','JFK','LAS','LAX','ORD','PHX','SEA','SFO'],
  SEA: ['ATL','BOS','DEN','DFW','HNL','ANC','JFK','LAS','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SFO'],
  SFO: ['ATL','BOS','DCA','DEN','DFW','EWR','HNL','IAD','IAH','JFK','LAS','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SEA'],
  STL: ['ATL','BNA','CLT','DEN','DFW','IAH','LAS','MCI','ORD'],
  TPA: ['ATL','BNA','BOS','CLT','FLL','JFK','LAX','MIA','ORD'],
};

// Character creation: limited picks across both lists.
export const MAX_INTERESTS = 5;

export const INTERESTS_SOCIAL = [
  'hiking', 'dinner', 'movies', 'dancing', 'wine', 'coffee',
  'brunch', 'museums', 'concerts', 'cooking', 'photography', 'running',
];

export const INTERESTS_INTIMATE = [
  'chat', 'drinks', 'kissing', 'massage', 'cuddling', 'voyeur',
  'hookup', 'sex', 'overnight', 'shower fun', 'roleplay', 'exhibition',
];

export const INTERESTS_ALL = [...INTERESTS_SOCIAL, ...INTERESTS_INTIMATE];

// Activities: base points × match multiplier = encounter score.
export const ACTIVITIES = [
  { name: 'conversation', duration: 15, basePoints: 10, interestTag: 'chat' },
  { name: 'drinks', duration: 45, basePoints: 25, interestTag: 'drinks' },
  { name: 'dinner', duration: 90, basePoints: 40, interestTag: 'dinner' },
  { name: 'dancing', duration: 60, basePoints: 35, interestTag: 'dancing' },
  { name: 'makeout', duration: 30, basePoints: 60, interestTag: 'kissing', requireMatch: 0.25 },
  { name: 'hookup', duration: 30, basePoints: 100, interestTag: 'hookup', requireMatch: 0.4 },
  { name: 'sex', duration: 45, basePoints: 150, interestTag: 'sex', requireMatch: 0.5 },
  { name: 'overnight', duration: 120, basePoints: 200, interestTag: 'overnight', requireMatch: 0.65 },
];

export const AVATARS = ['🧑', '👨', '🧔', '👱', '👨‍🦰', '👨‍🦱', '🧑‍🦲', '👴', '👲', '🧔‍♂️', '👨‍🦳'];

export const FIRST_NAMES = ['Mike', 'Jake', 'Chris', 'Matt', 'Ryan', 'Tyler', 'Brandon', 'Kevin', 'Brian', 'Jason', 'David', 'James', 'Eric', 'Adam', 'Dan', 'Nick', 'Alex', 'Sam', 'Ben', 'Luke', 'Carlos', 'Luis', 'Miguel', 'Diego', 'Andres', 'Omar', 'Hassan', 'Raj', 'Wei', 'Jin', 'Kai', 'Leo', 'Marco', 'Pierre', 'Antonio', 'Sergio', 'Rafael', 'Hiroshi', 'Yuki', 'Chen', 'Arjun', 'Vikram', 'Noah', 'Ethan', 'Liam', 'Mason', 'Logan', 'Aiden', 'Lucas', 'Oliver', 'Elijah', 'Caleb', 'Nathan', 'Isaiah', 'Carter', 'Wyatt', 'Gabriel', 'Julian', 'Sebastian', 'Adrian'];

export const BACKGROUNDS = ['business consultant', 'software engineer', 'graphic designer', 'personal trainer', 'nurse', 'teacher', 'chef', 'photographer', 'musician', 'architect', 'doctor', 'lawyer', 'freelance writer', 'marketing manager', 'pilot', 'flight attendant', 'real estate agent', 'yoga instructor', 'barber', 'social worker', 'veterinarian', 'dentist', 'pharmacist', 'therapist', 'artist', 'model', 'entertainer'];

export const DIFFICULTIES = {
  unlimited: { label: 'Unlimited', budget: null },
  easy: { label: 'Easy', budget: 2500 },
  medium: { label: 'Medium', budget: 1500 },
  hard: { label: 'Hard', budget: 800 },
};
