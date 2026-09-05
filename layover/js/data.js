export const AVATARS = ['🧑','👨','🧔','👱','👨‍🦰','👨‍🦱','🧑‍🦲','👴','👲','🧔‍♂️','👨‍🦳','🦃','🦅','🐺','🦊','🐻','🐼','🐨','🦁','🐯'];

export const PREFERENCES = [
    'hiking','dinner','movies','dancing','wine','coffee','gym','yoga',
    'beach','museum','cooking','karaoke','brunch','board games','reading',
    'concerts','travel','photography','cycling','running'
];

export const ACTIVITIES = [
    { name: 'drinks', duration: 45 },
    { name: 'dinner', duration: 90 },
    { name: 'hiking', duration: 120 },
    { name: 'movies', duration: 120 },
    { name: 'dancing', duration: 90 },
    { name: 'sex', duration: 30, requireMatch: 50 },
    { name: 'hookup', duration: 30, requireMatch: 40 },
    { name: 'one night stand', duration: 45, requireMatch: 30 },
];

// Fictional gay airlines
export const AIRLINES = [
    {
        id: 'VL',
        name: 'Velvet',
        fullName: 'Velvet Airways',
        color: '#8a1a3a',
        accent: '#d4a574',
        vibe: 'Luxury & romance — silk, champagne, red lips',
        icon: '💋',
        hubs: ['JFK','LAX','MIA','SFO','BOS'],
        lounge: 'The Velvet Room'
    },
    {
        id: 'BF',
        name: 'Bearforce',
        fullName: 'BearForce One',
        color: '#5c3a21',
        accent: '#f0c040',
        vibe: 'Woodsy & warm — bears, flannel, fireplace',
        icon: '🐻',
        hubs: ['ORD','DEN','SEA','MSP','SFO'],
        lounge: 'The Den'
    },
    {
        id: 'PR',
        name: 'Prism',
        fullName: 'Prism Airways',
        color: '#6a2fb8',
        accent: '#00e5ff',
        vibe: 'Rainbow & radiant — proud, bright, unstoppable',
        icon: '🌈',
        hubs: ['ATL','DTW','CLT','BNA','RDU'],
        lounge: 'Prism Club'
    },
    {
        id: 'AD',
        name: 'Adonis',
        fullName: 'Adonis Air',
        color: '#e9407a',
        accent: '#00f0ff',
        vibe: 'Circuit & glossy — gym, glitter, all night',
        icon: '✨',
        hubs: ['LAS','PHX','FLL','TPA','LAX'],
        lounge: 'Adonis Lounge'
    },
    {
        id: 'HR',
        name: 'Harbor',
        fullName: 'Harbor Air',
        color: '#0f2a44',
        accent: '#c8a96a',
        vibe: 'Leather & late-night — harness, harbor lights',
        icon: '⚓',
        hubs: ['DFW','IAH','MSY','DAL','HOU'],
        lounge: 'The Harbor'
    },
];

export function getAirlineById(id) {
    return AIRLINES.find(a => a.id === id);
}

export function getAirlinesForHub(airportId) {
    return AIRLINES.filter(a => a.hubs.includes(airportId));
}

// Airports with lat/lon and delay risk
// delayRisk 0.07-0.25, avgDelay 30-65
export const AIRPORTS = [
    { id: 'ATL', name: 'Atlanta', region: 'southeast', isHub: true, capacity: 10, lat:33.6407, lon:-84.4277, delayRisk:0.18, avgDelay:50 },
    { id: 'BOS', name: 'Boston', region: 'northeast', isHub: true, capacity: 8, lat:42.3656, lon:-71.0096, delayRisk:0.19, avgDelay:50 },
    { id: 'CLT', name: 'Charlotte', region: 'southeast', isHub: false, capacity: 5, lat:35.2140, lon:-80.9431, delayRisk:0.12, avgDelay:40 },
    { id: 'ORD', name: 'Chicago', region: 'midwest', isHub: true, capacity: 10, lat:41.9742, lon:-87.9073, delayRisk:0.25, avgDelay:65 },
    { id: 'CVG', name: 'Cincinnati', region: 'midwest', isHub: false, capacity: 4, lat:39.0488, lon:-84.6678, delayRisk:0.08, avgDelay:30 },
    { id: 'CLE', name: 'Cleveland', region: 'midwest', isHub: false, capacity: 4, lat:41.4117, lon:-81.8498, delayRisk:0.13, avgDelay:40 },
    { id: 'CMH', name: 'Columbus', region: 'midwest', isHub: false, capacity: 4, lat:39.9980, lon:-82.8919, delayRisk:0.09, avgDelay:32 },
    { id: 'DAL', name: 'Dallas', region: 'south', isHub: true, capacity: 8, lat:32.8471, lon:-96.8518, delayRisk:0.11, avgDelay:38 },
    { id: 'DFW', name: 'Dallas-Fort Worth', region: 'south', isHub: true, capacity: 10, lat:32.8998, lon:-97.0403, delayRisk:0.15, avgDelay:45 },
    { id: 'DEN', name: 'Denver', region: 'west', isHub: true, capacity: 8, lat:39.8561, lon:-104.6737, delayRisk:0.10, avgDelay:35 },
    { id: 'DTW', name: 'Detroit', region: 'midwest', isHub: false, capacity: 5, lat:42.2124, lon:-83.3534, delayRisk:0.14, avgDelay:42 },
    { id: 'FLL', name: 'Fort Lauderdale', region: 'southeast', isHub: false, capacity: 5, lat:26.0726, lon:-80.1527, delayRisk:0.11, avgDelay:38 },
    { id: 'HNL', name: 'Honolulu', region: 'hawaii', isHub: true, capacity: 6, lat:21.3187, lon:-157.9225, delayRisk:0.06, avgDelay:25 },
    { id: 'IAH', name: 'Houston', region: 'south', isHub: true, capacity: 8, lat:29.9844, lon:-95.3414, delayRisk:0.16, avgDelay:48 },
    { id: 'HOU', name: 'Houston Hobby', region: 'south', isHub: false, capacity: 4, lat:29.6454, lon:-95.2789, delayRisk:0.09, avgDelay:32 },
    { id: 'IND', name: 'Indianapolis', region: 'midwest', isHub: false, capacity: 4, lat:39.7173, lon:-86.2945, delayRisk:0.08, avgDelay:30 },
    { id: 'JFK', name: 'New York JFK', region: 'northeast', isHub: true, capacity: 10, lat:40.6413, lon:-73.7781, delayRisk:0.22, avgDelay:60 },
    { id: 'LGA', name: 'New York LaGuardia', region: 'northeast', isHub: false, capacity: 6, lat:40.7769, lon:-73.8740, delayRisk:0.21, avgDelay:58 },
    { id: 'EWR', name: 'Newark', region: 'northeast', isHub: false, capacity: 6, lat:40.6895, lon:-74.1745, delayRisk:0.20, avgDelay:55 },
    { id: 'LAX', name: 'Los Angeles', region: 'west', isHub: true, capacity: 10, lat:33.9416, lon:-118.4085, delayRisk:0.13, avgDelay:42 },
    { id: 'LAS', name: 'Las Vegas', region: 'west', isHub: true, capacity: 8, lat:36.0840, lon:-115.1537, delayRisk:0.09, avgDelay:32 },
    { id: 'MCI', name: 'Kansas City', region: 'midwest', isHub: false, capacity: 4, lat:39.2976, lon:-94.7139, delayRisk:0.07, avgDelay:28 },
    { id: 'MIA', name: 'Miami', region: 'southeast', isHub: true, capacity: 8, lat:25.7959, lon:-80.2870, delayRisk:0.14, avgDelay:45 },
    { id: 'MSP', name: 'Minneapolis', region: 'midwest', isHub: true, capacity: 6, lat:44.8848, lon:-93.2223, delayRisk:0.12, avgDelay:40 },
    { id: 'BNA', name: 'Nashville', region: 'southeast', isHub: false, capacity: 5, lat:36.1263, lon:-86.6782, delayRisk:0.09, avgDelay:30 },
    { id: 'MSY', name: 'New Orleans', region: 'south', isHub: false, capacity: 5, lat:29.9934, lon:-90.2580, delayRisk:0.10, avgDelay:35 },
    { id: 'OAK', name: 'Oakland', region: 'west', isHub: false, capacity: 4, lat:37.7214, lon:-122.2208, delayRisk:0.08, avgDelay:30 },
    { id: 'PDX', name: 'Portland', region: 'west', isHub: false, capacity: 5, lat:45.5898, lon:-122.5951, delayRisk:0.09, avgDelay:32 },
    { id: 'PHL', name: 'Philadelphia', region: 'northeast', isHub: false, capacity: 6, lat:39.8729, lon:-75.2437, delayRisk:0.17, avgDelay:48 },
    { id: 'PHX', name: 'Phoenix', region: 'west', isHub: true, capacity: 6, lat:33.4352, lon:-112.0101, delayRisk:0.07, avgDelay:28 },
    { id: 'PIT', name: 'Pittsburgh', region: 'northeast', isHub: false, capacity: 4, lat:40.4915, lon:-80.2329, delayRisk:0.10, avgDelay:35 },
    { id: 'RDU', name: 'Raleigh-Durham', region: 'southeast', isHub: false, capacity: 4, lat:35.8776, lon:-78.7875, delayRisk:0.08, avgDelay:30 },
    { id: 'SAN', name: 'San Diego', region: 'west', isHub: false, capacity: 5, lat:32.7338, lon:-117.1933, delayRisk:0.08, avgDelay:30 },
    { id: 'SFO', name: 'San Francisco', region: 'west', isHub: true, capacity: 8, lat:37.6213, lon:-122.3790, delayRisk:0.16, avgDelay:48 },
    { id: 'SEA', name: 'Seattle', region: 'west', isHub: true, capacity: 7, lat:47.4502, lon:-122.3088, delayRisk:0.11, avgDelay:38 },
    { id: 'STL', name: 'St. Louis', region: 'midwest', isHub: false, capacity: 4, lat:38.7487, lon:-90.3700, delayRisk:0.09, avgDelay:32 },
    { id: 'TPA', name: 'Tampa', region: 'southeast', isHub: false, capacity: 5, lat:27.9755, lon:-82.5332, delayRisk:0.09, avgDelay:32 },
    { id: 'IAD', name: 'Washington Dulles', region: 'northeast', isHub: false, capacity: 5, lat:38.9531, lon:-77.4565, delayRisk:0.15, avgDelay:45 },
    { id: 'DCA', name: 'Washington Reagan', region: 'northeast', isHub: false, capacity: 5, lat:38.8512, lon:-77.0402, delayRisk:0.18, avgDelay:52 },
];

// Symmetrized — every route is now two-way to prevent stranding
export const CONNECTIONS = {
    'ATL': ['BNA','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HOU','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','SAN','SEA','SFO','STL','TPA'],
    'BNA': ['ATL','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','STL','TPA'],
    'BOS': ['ATL','BNA','CLT','DCA','DEN','DFW','DTW','EWR','FLL','IAD','IAH','JFK','LAS','LAX','LGA','MIA','MSP','MSY','ORD','PHL','PIT','RDU','SEA','SFO','TPA'],
    'CLE': ['ATL','BNA','CLT','DCA','JFK','ORD','PHL'],
    'CLT': ['ATL','BNA','BOS','CLE','CMH','CVG','DCA','DFW','DTW','EWR','IAD','IND','JFK','LGA','MCI','MIA','MSY','ORD','PHL','PIT','RDU','STL','TPA'],
    'CMH': ['ATL','BNA','CLT','DFW','ORD','PHL'],
    'CVG': ['ATL','BNA','CLT','DFW','MSP','ORD','PHL'],
    'DAL': ['ATL','BNA','DEN','DFW','HOU','IAH','JFK','LAS','LAX','MIA','MSY','ORD','PHX'],
    'DCA': ['ATL','BNA','BOS','CLE','CLT','FLL','IAD','JFK','LAX','LGA','MIA','ORD','PHL','RDU','SFO'],
    'DEN': ['ATL','BNA','BOS','DAL','DFW','HNL','HOU','IAH','JFK','LAS','LAX','MCI','MIA','MSP','MSY','OAK','ORD','PDX','PHX','SAN','SEA','SFO','STL'],
    'DFW': ['ATL','BNA','BOS','CLT','CMH','CVG','DAL','DEN','DTW','IAH','IND','JFK','LAS','LAX','MCI','MIA','MSP','MSY','ORD','PHL','PHX','SAN','SEA','SFO','STL'],
    'DTW': ['ATL','BOS','CLT','DFW','JFK','LAS','LAX','MIA','MSP','ORD','PHL','PHX'],
    'EWR': ['ATL','BOS','CLT','FLL','JFK','LAS','LAX','MIA','ORD','SFO'],
    'FLL': ['ATL','BOS','DCA','EWR','IAD','JFK','LAX','LGA','MIA','MSP','ORD','PHL','TPA'],
    'HNL': ['DEN','IAH','JFK','LAS','LAX','ORD','PHX','SEA','SFO'],
    'HOU': ['ATL','DAL','DEN','LAS','LAX','MSY'],
    'IAD': ['ATL','BNA','BOS','CLT','DCA','FLL','JFK','LAS','LAX','LGA','MIA','ORD','PHL','RDU','SFO'],
    'IAH': ['ATL','BNA','BOS','DAL','DEN','DFW','HNL','JFK','LAS','LAX','MCI','MIA','MSP','MSY','ORD','PHX','SAN','SFO','STL'],
    'IND': ['ATL','BNA','CLT','DFW','ORD','PHL','PHX'],
    'JFK': ['ATL','BNA','BOS','CLE','CLT','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','IAD','IAH','LAS','LAX','LGA','MIA','MSP','MSY','ORD','PHL','PHX','PIT','RDU','SAN','SEA','SFO','TPA'],
    'LAS': ['ATL','BNA','BOS','DAL','DEN','DFW','DTW','EWR','HNL','HOU','IAD','IAH','JFK','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SEA','SFO','STL'],
    'LAX': ['ATL','BNA','BOS','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','HOU','IAD','IAH','JFK','LAS','MIA','MSP','MSY','OAK','ORD','PDX','PHL','PHX','PIT','RDU','SAN','SEA','SFO','TPA'],
    'LGA': ['ATL','BNA','BOS','CLT','DCA','FLL','IAD','JFK','MIA','ORD','PHL','RDU'],
    'MCI': ['ATL','BNA','CLT','DEN','DFW','IAH','ORD','PHX','STL'],
    'MIA': ['ATL','BNA','BOS','CLT','DAL','DCA','DEN','DFW','DTW','EWR','FLL','IAD','IAH','JFK','LAS','LAX','LGA','MSY','ORD','PHL','PHX','RDU','SEA','SFO','TPA'],
    'MSP': ['ATL','BNA','BOS','CVG','DEN','DFW','DTW','FLL','IAH','JFK','LAS','LAX','ORD','PHL','PHX','SEA','SFO'],
    'MSY': ['ATL','BNA','BOS','CLT','DAL','DEN','DFW','HOU','IAH','JFK','LAX','MIA','ORD'],
    'OAK': ['DEN','LAS','LAX','PDX','SEA','SFO'],
    'ORD': ['ATL','BNA','BOS','CLE','CLT','CMH','CVG','DAL','DCA','DEN','DFW','DTW','EWR','FLL','HNL','IAD','IAH','IND','JFK','LAS','LAX','LGA','MCI','MIA','MSP','MSY','PHL','PHX','PIT','RDU','SAN','SEA','SFO','STL','TPA'],
    'PDX': ['DEN','LAS','LAX','OAK','SEA','SFO'],
    'PHL': ['ATL','BNA','BOS','CLE','CLT','CMH','CVG','DCA','DFW','DTW','FLL','IAD','IND','JFK','LAX','LGA','MIA','MSP','ORD','PIT','RDU'],
    'PHX': ['ATL','BNA','DAL','DEN','DFW','DTW','HNL','IAH','IND','JFK','LAS','LAX','MCI','MIA','MSP','ORD','SAN','SEA','SFO'],
    'PIT': ['ATL','BNA','BOS','CLT','JFK','LAX','ORD','PHL'],
    'RDU': ['ATL','BNA','BOS','CLT','DCA','IAD','JFK','LAX','LGA','MIA','ORD','PHL'],
    'SAN': ['ATL','DEN','DFW','IAH','JFK','LAS','LAX','ORD','PHX','SEA','SFO'],
    'SEA': ['ATL','BOS','DEN','DFW','HNL','JFK','LAS','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SFO'],
    'SFO': ['ATL','BOS','DCA','DEN','DFW','EWR','HNL','IAD','IAH','JFK','LAS','LAX','MIA','MSP','OAK','ORD','PDX','PHX','SAN','SEA'],
    'STL': ['ATL','BNA','CLT','DEN','DFW','IAH','LAS','MCI','ORD'],
    'TPA': ['ATL','BNA','BOS','CLT','FLL','JFK','LAX','MIA','ORD'],
};

export const FIRST_NAMES = ['Mike','Jake','Chris','Matt','Ryan','Tyler','Brandon','Kevin','Brian','Jason','David','James','Eric','Adam','Dan','Nick','Alex','Sam','Ben','Luke','Carlos','Luis','Miguel','Diego','Andres','Omar','Hassan','Raj','Wei','Jin','Kai','Leo','Marco','Pierre','Antonio','Sergio','Rafael','Hiroshi','Yuki','Chen','Arjun','Vikram','Noah','Ethan','Liam','Mason','Logan','Aiden','Lucas','Oliver','Elijah','Caleb','Nathan','Isaiah','Carter','Wyatt','Gabriel','Julian','Sebastian','Adrian'];

export const BACKGROUNDS = ['business consultant','software engineer','graphic designer','personal trainer','nurse','teacher','chef','photographer','musician','architect','doctor','lawyer','freelance writer','marketing manager','pilot','flight attendant','real estate agent','yoga instructor','barber','social worker','veterinarian','dentist','pharmacist','therapist','artist','model','entertainer'];

export const REGION_DISTANCES = {
    northeast: { northeast: 1, southeast: 2, midwest: 2, south: 3, west: 4, hawaii: 6 },
    southeast: { northeast: 2, southeast: 1, midwest: 2, south: 1, west: 4, hawaii: 6 },
    midwest: { northeast: 2, southeast: 2, midwest: 1, south: 2, west: 3, hawaii: 6 },
    south: { northeast: 3, southeast: 1, midwest: 2, south: 1, west: 3, hawaii: 6 },
    west: { northeast: 4, southeast: 4, midwest: 3, south: 3, west: 1, hawaii: 3 },
    hawaii: { northeast: 6, southeast: 6, midwest: 6, south: 6, west: 3, hawaii: 1 },
};
