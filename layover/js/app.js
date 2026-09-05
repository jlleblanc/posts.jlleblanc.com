import { AVATARS, PREFERENCES, ACTIVITIES, AIRPORTS, CONNECTIONS, FIRST_NAMES, BACKGROUNDS, AIRLINES, getAirlineById } from './data.js';
import { formatGameTime, formatDuration, formatTimeOfDay, START_HOUR } from './time.js';
import { getFlightCost, getRealisticDuration, getMilesForFlight } from './flights.js';
import { buildTimetable, getFlightsFrom } from './schedule.js';
import { ensureLoyalty, addLoyaltyMiles, getEffectiveCost, getTier, getLoyaltyFor, getNextTierProgress } from './loyalty.js';
import { getLoungesAt, canAccessLounge, getLoungeBonus, purchaseLoungePass, isLoungePassActive, loungePassTimeLeft, LOUNGE_PASS_COST, LOUNGE_PASS_DURATION } from './lounge.js';

// init timetable
buildTimetable();

// ---- helpers ----
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateManName() { return randomFrom(FIRST_NAMES); }

const HUMAN_AVATARS = AVATARS.slice(0, 11); // exclude 🦃🦅 animals at end of human set
function generateMan(playerPrefs) {
    const prefs = shuffle(PREFERENCES).slice(0, randomInt(2, 5));
    // hiddenPrefs are not shown initially; revealed after meeting and affect activity bonus
    const hiddenPrefs = shuffle(PREFERENCES.filter(p => !prefs.includes(p))).slice(0, randomInt(1, 3));
    const age = randomInt(18, 55);
    const avatar = randomFrom(HUMAN_AVATARS);
    const name = generateManName();
    const background = randomFrom(BACKGROUNDS);
    // layovers from 45m (tight sprint) to 16h; weighted so short layovers exist and matter
    const layoverRoll = Math.random();
    const layoverMinutes = layoverRoll < 0.15 ? randomInt(45, 90) : layoverRoll < 0.35 ? randomInt(90, 180) : layoverRoll < 0.65 ? randomInt(180, 360) : randomInt(360, 960);
    const matchingPrefs = prefs.filter(p => playerPrefs.includes(p));
    const matchPercent = Math.min(99, Math.max(15, 40 + matchingPrefs.length * 15 + randomInt(-10, 10)));
    return {
        id: Date.now() + Math.random(),
        name, age, avatar, background,
        preferences: prefs,
        hiddenPrefs,
        matchPercent,
        minutesLeft: layoverMinutes,
        maxMinutes: layoverMinutes,
        credits: matchPercent > 70 ? 3 : matchPercent > 45 ? 2 : 1,
    };
}

function generateAirportMen(airport, playerPrefs, count) {
    const men = [];
    for (let i = 0; i < count; i++) men.push(generateMan(playerPrefs));
    return men;
}

// ---- state ----
let gameState = {
    activeCharacterId: null,
    characters: {},
};

let currentView = 'flights';
let currentFilter = 'here';
let pendingArrivals = [];

function createNewCharacter(name, avatar, prefs) {
    const id = 'char_' + Date.now();
    const startAirport = randomFrom(['JFK','LAX','ORD','ATL','DFW','SFO','MIA','DEN','SEA','BOS']);
    const startGameTime = START_HOUR * 60;

    const world = {
        gameTime: startGameTime,
        airports: {},
    };

    AIRPORTS.forEach(a => {
        world.airports[a.id] = { men: [] };
    });

    // seed world: start airport 2-4, others sparsely populated so Browse All isn't empty and small airports aren't ghost towns
    const startMen = randomInt(2, 4);
    world.airports[startAirport].men = generateAirportMen(startAirport, prefs, startMen);
    AIRPORTS.forEach(a => {
        if (a.id === startAirport) return;
        const isHub = a.isHub;
        const spawnChance = isHub ? 0.7 : 0.4;
        if (Math.random() < spawnChance) {
            const count = isHub ? randomInt(1, 2) : 1;
            world.airports[a.id].men = generateAirportMen(a.id, prefs, count);
        }
    });

    gameState.characters[id] = {
        id, name, avatar,
        currentAirport: startAirport,
        credits: 9,
        preferences: prefs,
        stats: { encounters: 0, bestMatch: 0, totalCreditsEarned: 0 },
        world,
        history: { flights: [], encounters: [] },
        loyalty: {},
        loungePass: null,
    };
    ensureLoyalty(gameState.characters[id]);

    gameState.activeCharacterId = id;
    saveGame();
    return id;
}

function getActiveChar() {
    return gameState.characters[gameState.activeCharacterId];
}

// ---- save/load ----
function saveGame() {
    try {
        localStorage.setItem('layover_save', JSON.stringify(gameState));
    } catch(e) { console.warn('Save failed', e); }
}

function loadGame() {
    try {
        const raw = localStorage.getItem('layover_save');
        if (raw) {
            const parsed = JSON.parse(raw);
            gameState = parsed;
            // migration: remove legacy schedules
            Object.values(gameState.characters).forEach(c => {
                if (c.world) {
                    delete c.world.schedules;
                    delete c.world.lastScheduleRefresh;
                    if (!c.world.airports) c.world.airports = {};
                    // ensure all airports exist
                    AIRPORTS.forEach(a => {
                        if (!c.world.airports[a.id]) c.world.airports[a.id] = { men: [] };
                        if (!c.world.airports[a.id].men) c.world.airports[a.id].men = [];
                    });
                    // reseed sparse worlds (pre-fix saves had only start airport populated)
                    const totalMen = Object.values(c.world.airports).reduce((s, p) => s + (p.men?.length || 0), 0);
                    if (totalMen < 8) {
                        AIRPORTS.forEach(a => {
                            if (a.id === c.currentAirport) return;
                            if (c.world.airports[a.id].men.length === 0) {
                                const spawnChance = a.isHub ? 0.6 : 0.35;
                                if (Math.random() < spawnChance) {
                                    c.world.airports[a.id].men = generateAirportMen(a.id, c.preferences, a.isHub ? randomInt(1,2) : 1);
                                }
                            }
                        });
                    }
                }
                if (!c.history) c.history = { flights:[], encounters:[] };
                if (!c.stats) c.stats = { encounters:0, bestMatch:0, totalCreditsEarned:0 };
                ensureLoyalty(c);
                if (c.loungePass && !c.loungePass.expires) c.loungePass = null;
                // normalize credits floor for old saves
                if (c.credits < 3) c.credits = Math.max(c.credits, 3);
            });
            return true;
        }
    } catch(e) { console.warn('Load failed', e); }
    return false;
}

// ---- time advancement ----
function advanceTime(char, minutes) {
    const oldTime = char.world.gameTime;
    char.world.gameTime += minutes;

    Object.keys(char.world.airports).forEach(airportId => {
        const port = char.world.airports[airportId];
        port.men.forEach(m => { m.minutesLeft -= minutes; });
        port.men = port.men.filter(m => m.minutesLeft > 0);
    });

    // periodic arrivals: every 6h tick — loop to handle long jumps (flights + waits)
    const oldTick = Math.floor(oldTime / 360);
    const newTick = Math.floor(char.world.gameTime / 360);
    for (let tick = oldTick + 1; tick <= newTick; tick++) {
        const playerAirport = char.currentAirport;
        const loungeBonus = getLoungeBonus(char) > 0;
        const arrivalChance = loungeBonus ? 0.7 : 0.5;

        // guarantee at least one arrival if player airport empty-ish and we crossed a tick
        const currentMen = char.world.airports[playerAirport].men;
        const needsMen = currentMen.length < 2;
        if ((needsMen || currentMen.length < 4) && (needsMen || Math.random() < arrivalChance)) {
            const arriving = generateAirportMen(playerAirport, char.preferences, randomInt(1, loungeBonus ? 3 : 2));
            if (loungeBonus && arriving.length > 0) {
                const best = arriving.reduce((a,b)=> a.matchPercent > b.matchPercent ? a : b);
                best.matchPercent = Math.min(95, best.matchPercent + 10 + randomInt(0,10));
                best.background = 'lounge regular';
            }
            char.world.airports[playerAirport].men.push(...arriving);
            pendingArrivals.push(...arriving);
        }

        Object.keys(char.world.airports).forEach(airportId => {
            if (airportId === playerAirport) return;
            const port = char.world.airports[airportId];
            // remote airports idle less often; but ensure sparse seeding
            if (port.men.length < 2 && Math.random() < 0.25) {
                const arriving = generateAirportMen(airportId, char.preferences, randomInt(1, 2));
                port.men.push(...arriving);
            }
        });
    }

    saveGame();
}

function wait() {
    const char = getActiveChar();
    advanceTime(char, 30);
    renderGame();
}

function waitUntilNextFlight() {
    const char = getActiveChar();
    const flights = getFlightsFrom(char.currentAirport, char.world.gameTime, 1440);
    if (flights.length === 0) {
        advanceTime(char, 60);
        renderGame();
        return;
    }
    const next = flights[0];
    const waitTime = Math.max(0, next.scheduledDeparture - char.world.gameTime);
    if (waitTime <= 0) {
        advanceTime(char, 30);
    } else {
        // fast-forward to boarding (30m before departure) to feel active
        const jump = Math.max(30, waitTime);
        advanceTime(char, jump);
    }
    renderGame();
}

// ---- encounters ----
function startEncounter(man) {
    const char = getActiveChar();
    const layover = man.minutesLeft;
    const loungeBonus = getLoungeBonus(char); // 0.15 if accessible
    const adjustedMatch = Math.min(99, man.matchPercent + (loungeBonus * 100));
    // layover pressure reduces effective compatibility — rushed encounters are less likely to click
    let layoverPenalty = 0;
    let layoverNote = '';
    if (layover < 60) { layoverPenalty = 20; layoverNote = 'rushed — only ' + formatDuration(layover) + ' layover'; }
    else if (layover < 120) { layoverPenalty = 15; layoverNote = 'tight — ' + formatDuration(layover) + ' layover'; }
    else if (layover < 180) { layoverPenalty = 10; layoverNote = 'short — ' + formatDuration(layover) + ' layover'; }
    else if (layover < 240) { layoverPenalty = 5; }
    const effectiveMatch = Math.max(5, Math.min(99, adjustedMatch - layoverPenalty));
    const successRoll = randomInt(10, 90);
    const success = effectiveMatch > successRoll;
    let creditsEarned = 0;
    const activities = [];
    let totalTime = 45;

    if (success) {
        const possibleActivities = ACTIVITIES.filter(a => !a.requireMatch || adjustedMatch >= a.requireMatch);
        // weight activities that share prefs between player and man (including hidden) — makes hidden matter
        const weighted = possibleActivities.map(act => {
            const isPref = man.preferences.includes(act.name) || man.hiddenPrefs.includes(act.name);
            const playerHas = char.preferences.includes(act.name);
            const shared = isPref && playerHas;
            return { act, weight: shared ? 3 : isPref ? 1.5 : 1 };
        });
        // weighted shuffle pick — shared prefs bias selection
        const pool = [];
        weighted.forEach(({act, weight}) => {
            const copies = Math.round(weight * 2);
            for (let i=0;i<copies;i++) pool.push(act);
        });
        const desired = randomInt(1, Math.min(3, possibleActivities.length));
        const chosenSet = new Set();
        while (chosenSet.size < desired && pool.length > 0) {
            const pick = randomFrom(pool);
            chosenSet.add(pick);
            const idx = pool.indexOf(pick);
            if (idx !== -1) pool.splice(idx,1);
        }
        if (chosenSet.size === 0) chosenSet.add(randomFrom(possibleActivities));
        const chosen = [...chosenSet];

        chosen.forEach(act => {
            const isPref = man.preferences.includes(act.name) || man.hiddenPrefs.includes(act.name);
            const playerHas = char.preferences.includes(act.name);
            const sharedBonus = (isPref && playerHas) ? 0.15 : 0;
            const hiddenBonus = (man.hiddenPrefs.includes(act.name) && playerHas) ? 0.10 : 0; // discovering hidden is rewarding
            const base = adjustedMatch / 100;
            const actSuccess = Math.random() < Math.min(0.95, base + sharedBonus + hiddenBonus);
            activities.push({ name: act.name + (sharedBonus>0 ? ' ★' : ''), success: actSuccess, raw: act.name });
            if (actSuccess) creditsEarned += 1;
            totalTime += act.duration;
        });

        creditsEarned += man.credits;
    }

    // consolation: never leave empty-handed — failed spark still earns 1 credit for time spent
    if (!success) {
        creditsEarned = 1;
        totalTime = 30; // shorter consolation encounter
    }

    // Enforce layover cap — encounter cannot outlast the man's layover
    let wasCapped = false;
    let wasRushed = layoverPenalty > 0;
    if (totalTime > layover) {
        wasCapped = true;
        // trim longest activities first until it fits
        while (activities.length > 0 && totalTime > layover) {
            let idx = 0;
            let maxDur = -1;
            for (let i = 0; i < activities.length; i++) {
                const key = activities[i].raw || activities[i].name.replace(' ★','');
                const dur = ACTIVITIES.find(a => a.name === key)?.duration || 30;
                if (dur > maxDur) { maxDur = dur; idx = i; }
            }
            const removed = activities.splice(idx, 1)[0];
            totalTime -= maxDur;
            if (removed.success) creditsEarned = Math.max(success ? man.credits : 1, creditsEarned - 1);
        }
        if (totalTime > layover) totalTime = layover;
        // if we had to trim, ensure at least the base chat fits; if layover <30, it's just a quick hello
        if (totalTime < 15) totalTime = Math.min(layover, 15);
    }

    char.stats.encounters++;
    if (man.matchPercent > char.stats.bestMatch) {
        char.stats.bestMatch = man.matchPercent;
    }
    char.stats.totalCreditsEarned += creditsEarned;
    char.credits += creditsEarned;

    char.history.encounters.push({
        manName: man.name,
        manAge: man.age,
        airport: char.currentAirport,
        compatibility: man.matchPercent,
        effectiveCompatibility: effectiveMatch,
        success,
        creditsEarned,
        activities: activities.map(a => a.raw || a.name),
        gameTime: char.world.gameTime,
        timestamp: Date.now(),
        loungeBonus: loungeBonus > 0,
        layover,
        layoverPenalty,
        wasCapped,
        totalTime,
    });

    advanceTime(char, totalTime);

    document.getElementById('encounter-avatar').textContent = man.avatar;
    document.getElementById('encounter-name').textContent = `${man.name}, ${man.age}`;
    const airportObj = AIRPORTS.find(a => a.id === char.currentAirport);
    const loungeNote = loungeBonus > 0 ? ' · ✨ lounge boost' : '';
    const cappedNote = wasCapped ? ' · ⏱ cut short by layover' : '';
    const rushedNote = layoverNote ? ' · ' + layoverNote : '';
    document.getElementById('encounter-airport').textContent = `${airportObj ? airportObj.name : char.currentAirport} Airport · ${formatDuration(totalTime)} spent · ${formatDuration(layover)} layover${loungeNote}${cappedNote}${rushedNote}`;

    const matchEl = document.getElementById('encounter-match');
    // show effective after layover penalty and lounge
    const displayMatch = loungeBonus > 0 || layoverPenalty > 0 ? `${man.matchPercent}% → ${effectiveMatch}%` : man.matchPercent + '%';
    let titleParts = [];
    if (loungeBonus > 0) titleParts.push(`+15 lounge`);
    if (layoverPenalty > 0) titleParts.push(`-${layoverPenalty} rushed (${formatDuration(layover)} layover)`);
    matchEl.textContent = displayMatch;
    matchEl.title = titleParts.length ? `Base ${man.matchPercent}% ${titleParts.join(' ')} = ${effectiveMatch}% effective` : '';
    matchEl.style.color = effectiveMatch >= 70 ? '#2ecc71' : effectiveMatch >= 45 ? '#f1c40f' : '#e74c3c';

    const actContainer = document.getElementById('encounter-activities');
    actContainer.innerHTML = '';
    if (wasCapped) {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:12px; color:#f1c40f; background:rgba(241,196,15,0.12); border:1px solid rgba(241,196,15,0.3); border-radius:8px; padding:8px 10px; margin-bottom:8px; text-align:center;';
        note.textContent = `⏱ His flight boards in ${formatDuration(layover)} — encounter cut short to ${formatDuration(totalTime)}.`;
        actContainer.appendChild(note);
    } else if (layoverPenalty > 0) {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:12px; color:#aaa; background:rgba(255,255,255,0.06); border-radius:8px; padding:8px 10px; margin-bottom:8px; text-align:center;';
        note.textContent = `⏱ Tight layover (${formatDuration(layover)}) — success chance reduced by ${layoverPenalty}%.`;
        actContainer.appendChild(note);
    }
    activities.forEach(act => {
        const row = document.createElement('div');
        row.className = 'activity-row';
        row.innerHTML = `
            <span class="activity-name">${act.name}</span>
            <span class="activity-result ${act.success ? 'success' : 'fail'}">${act.success ? '✓ Great time' : '✗ Awkward'}</span>
        `;
        actContainer.appendChild(row);
    });

    const rewardEl = document.getElementById('encounter-reward');
    if (creditsEarned > 0) {
        let rewardText = `+${creditsEarned} credits earned!`;
        if (loungeBonus>0) rewardText += ' (lounge boosted)';
        if (wasCapped) rewardText += ' · cut short';
        else if (layoverPenalty>0) rewardText += ` · -${layoverPenalty}% layover penalty`;
        rewardEl.style.display = 'block';
        document.getElementById('reward-text').textContent = rewardText;
    } else {
        rewardEl.style.display = 'none';
    }

    showScreen('encounter-screen');
}

function endEncounter() {
    showScreen('game-screen');
    renderGame();
}

// ---- flights ----
function bookFlight(flight) {
    const char = getActiveChar();
    const effectiveCost = getEffectiveCost(flight.cost, char, flight.airline);
    if (char.credits < effectiveCost) return;

    char.credits -= effectiveCost;
    const waitTime = Math.max(0, flight.scheduledDeparture - char.world.gameTime);
    const flightDuration = flight.duration; // realistic

    // advance to scheduled departure (waiting) + flight + delay is already in actualArrival but we use duration+delay via actual
    const delayExtra = flight.delayed ? flight.delayMinutes : 0;
    advanceTime(char, waitTime + flightDuration + delayExtra);

    const fromAirport = char.currentAirport;
    char.currentAirport = flight.to;

    // loyalty earning
    const miles = getMilesForFlight(fromAirport, flight.to);
    addLoyaltyMiles(char, flight.airline, miles);

    char.history.flights.push({
        from: fromAirport,
        to: flight.to,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        cost: effectiveCost,
        baseCost: flight.cost,
        miles,
        delayed: flight.delayed,
        delayMinutes: flight.delayMinutes,
        scheduledDeparture: flight.scheduledDeparture,
        gameTime: char.world.gameTime,
        timestamp: Date.now(),
    });

    saveGame();
    showArrivalScreen(flight.to, flight.delayed ? flight.delayMinutes : 0, flight);
}

function showArrivalScreen(airportId, delayMinutes, flight) {
    const airport = AIRPORTS.find(a => a.id === airportId);
    document.getElementById('arrival-icon').textContent = delayMinutes > 0 ? '⚠️' : '✈️';
    document.getElementById('arrival-title').textContent = delayMinutes > 0
        ? `Delayed at ${airport.name}`
        : `Arrived at ${airport.name}`;
    const char = getActiveChar();
    document.getElementById('arrival-subtitle').textContent = `${airportId} · ${formatGameTime(char.world.gameTime)}${flight ? ` · ${flight.flightNumber} ${getAirlineById(flight.airline).name}` : ''}`;

    const delayEl = document.getElementById('arrival-delay');
    if (delayMinutes > 0) {
        delayEl.style.display = 'flex';
        const airlineName = flight ? getAirlineById(flight.airline).name : '';
        delayEl.textContent = `Your ${airlineName} flight was delayed by ${formatDuration(delayMinutes)}. Time passed while you waited.`;
    } else {
        delayEl.style.display = 'none';
    }

    const newMenEl = document.getElementById('arrival-newmen');
    const menListEl = document.getElementById('arrival-men-list');
    if (pendingArrivals.length > 0) {
        newMenEl.style.display = '';
        menListEl.innerHTML = pendingArrivals.map(m => `
            <div class="profile-card" style="margin-bottom:8px;">
                <div class="profile-top">
                    <div class="profile-avatar">${m.avatar}</div>
                    <div class="profile-main">
                        <div class="profile-name">${m.name}, ${m.age}</div>
                        <div class="profile-location">${m.background} · ${formatDuration(m.minutesLeft)} layover</div>
                    </div>
                    <div class="match-badge ${m.matchPercent >= 70 ? 'match-high' : m.matchPercent >= 45 ? 'match-mid' : 'match-low'}">${m.matchPercent}%</div>
                </div>
                <div class="profile-prefs">
                    ${m.preferences.slice(0, 3).map(p => `<span class="profile-pref">${p}</span>`).join('')}
                </div>
            </div>
        `).join('');
        pendingArrivals = [];
    } else {
        newMenEl.style.display = 'none';
    }

    showScreen('arrival-screen');
}

function endArrival() {
    showScreen('game-screen');
    renderGame();
}

// ---- UI ----
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleCharDropdown() {
    document.getElementById('char-dropdown').classList.toggle('open');
}

function renderTitleScreen() {
    const list = document.getElementById('char-list');
    list.innerHTML = '';

    const chars = Object.values(gameState.characters);
    if (chars.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">✈️</div><p>No characters yet. Create one to start!</p></div>';
        return;
    }

    chars.forEach(c => {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.addEventListener('click', () => {
            gameState.activeCharacterId = c.id;
            saveGame();
            showScreen('game-screen');
            renderGame();
        });
        const ap = AIRPORTS.find(a => a.id === c.currentAirport);
        card.innerHTML = `
            <div class="char-avatar">${c.avatar}</div>
            <div class="char-info">
                <div class="char-name">${c.name}</div>
                <div class="char-stats">
                    ${ap ? ap.name : c.currentAirport} ·
                    ${c.credits} credits ·
                    ${c.stats.encounters} encounters
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderCreateScreen() {
    const picker = document.getElementById('avatar-picker');
    picker.innerHTML = '';
    AVATARS.forEach(a => {
        const opt = document.createElement('div');
        opt.className = 'avatar-option';
        opt.textContent = a;
        opt.addEventListener('click', () => {
            picker.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
        picker.appendChild(opt);
    });
    if (picker.children[0]) picker.children[0].classList.add('selected');

    const prefPicker = document.getElementById('pref-picker');
    prefPicker.innerHTML = '';
    PREFERENCES.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'pref-chip';
        chip.textContent = p;
        chip.addEventListener('click', () => chip.classList.toggle('selected'));
        prefPicker.appendChild(chip);
    });
}

function createCharacter() {
    const name = document.getElementById('char-name-input').value.trim();
    if (!name) { alert('Enter a name'); return; }

    const avatarEl = document.querySelector('#avatar-picker .avatar-option.selected');
    if (!avatarEl) { alert('Choose an avatar'); return; }
    const avatar = avatarEl.textContent;

    const prefs = [...document.querySelectorAll('#pref-picker .pref-chip.selected')].map(c => c.textContent);
    if (prefs.length < 2) { alert('Select at least 2 preferences'); return; }

    createNewCharacter(name, avatar, prefs);
    showScreen('game-screen');
    renderGame();
}

function renderGame() {
    const char = getActiveChar();
    if (!char) return;

    ensureLoyalty(char);
    document.getElementById('header-avatar').textContent = char.avatar;
    document.getElementById('header-name').textContent = char.name;
    document.getElementById('header-credits').textContent = char.credits;

    const dropdown = document.getElementById('char-dropdown');
    dropdown.innerHTML = '';
    Object.values(gameState.characters).forEach(c => {
        const item = document.createElement('div');
        item.className = 'char-dropdown-item' + (c.id === char.id ? ' active' : '');
        item.innerHTML = `<span>${c.avatar}</span> <span>${c.name}</span>`;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            gameState.activeCharacterId = c.id;
            saveGame();
            dropdown.classList.remove('open');
            renderGame();
        });
        dropdown.appendChild(item);
    });

    const airport = AIRPORTS.find(a => a.id === char.currentAirport);
    document.getElementById('current-airport-code').textContent = airport ? `${airport.id} — ${airport.name}` : char.currentAirport;
    document.getElementById('game-time-display').textContent = formatGameTime(char.world.gameTime);

    renderLoungeBanner();

    if (currentView === 'flights') renderFlightSchedule();
    else if (currentView === 'browse') renderProfileList();
    else if (currentView === 'profile') renderProfileView();
}

function renderLoungeBanner() {
    const char = getActiveChar();
    const banner = document.getElementById('lounge-banner');
    const lounges = getLoungesAt(char.currentAirport);
    if (lounges.length === 0) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = 'flex';
    const accessible = lounges.filter(a => canAccessLounge(char, a.id, char.currentAirport));
    const hasAccess = accessible.length > 0;
    banner.className = 'lounge-banner' + (hasAccess ? ' has-access' : '');
    if (hasAccess) {
        const al = accessible[0];
        const tier = getLoyaltyFor(char, al.id).tier;
        banner.innerHTML = `
            <div class="lounge-banner-info">
                <div class="lounge-banner-title">${al.icon} ${al.lounge} — Access granted <span style="font-weight:400; font-size:11px; padding:2px 6px; border-radius:8px; background:rgba(255,255,255,0.12);">${tier}</span></div>
                <div class="lounge-banner-sub">Encounters here have +15% success · Extra arrivals</div>
            </div>
            <div class="lounge-banner-actions">
                <span style="font-size:11px; color:#2ecc71; align-self:center;">✨ Active</span>
            </div>
        `;
    } else {
        const best = lounges[0];
        // hint if they have an airline-wide pass for another hub
        const hasGlobalPass = char.loungePass && char.loungePass.expires > char.world.gameTime;
        const globalPassMsg = hasGlobalPass ? ` · You have ${getAirlineById(char.loungePass.airline).name} pass (${formatDuration(loungePassTimeLeft(char))} left, valid at any ${getAirlineById(char.loungePass.airline).name} hub)` : '';
        banner.innerHTML = `
            <div class="lounge-banner-info">
                <div class="lounge-banner-title">${best.icon} ${best.lounge} <span style="font-weight:400; color:#888; font-size:12px;">· ${best.name} hub</span></div>
                <div class="lounge-banner-sub">Gold+ free · Day pass 2💳 for 4h at any ${best.name} hub · +15% success${globalPassMsg}</div>
            </div>
            <div class="lounge-banner-actions" id="lounge-actions"></div>
        `;
        const actions = banner.querySelector('#lounge-actions');
        lounges.forEach(al => {
            const btn = document.createElement('button');
            const tier = getLoyaltyFor(char, al.id).tier;
            const canAfford = char.credits >= LOUNGE_PASS_COST;
            btn.className = 'btn-lounge';
            btn.textContent = `${al.id} Pass 2💳 ${tier !== 'member' ? `(${tier})` : ''}`;
            btn.disabled = !canAfford;
            btn.title = canAfford ? `Buy 4h pass to ${al.lounge}` : 'Not enough credits';
            btn.addEventListener('click', () => {
                const res = purchaseLoungePass(char, al.id);
                if (!res.ok) alert(res.reason);
                else {
                    saveGame();
                    renderGame();
                }
            });
            actions.appendChild(btn);
        });
        // if has silver, hint discount? No discount on lounge yet, but show tier progress maybe
    }
    // also show pass time left if active
    if (isLoungePassActive(char)) {
        const left = loungePassTimeLeft(char);
        const sub = banner.querySelector('.lounge-banner-sub');
        if (sub) sub.textContent += ` · Pass expires in ${formatDuration(left)}`;
    }
}

function renderFlightSchedule() {
    const char = getActiveChar();
    const container = document.getElementById('flight-schedule');
    container.innerHTML = '';

    const flights = getFlightsFrom(char.currentAirport, char.world.gameTime, 1440);

    if (flights.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🛫</div><p>No flights in next 24 hours. Wait for tomorrow’s schedule.</p></div>';
        return;
    }

    flights.slice(0, 15).forEach(f => {
        const destAirport = AIRPORTS.find(a => a.id === f.to);
        const waitTime = Math.max(0, f.scheduledDeparture - char.world.gameTime);
        const airline = getAirlineById(f.airline);
        const effectiveCost = getEffectiveCost(f.cost, char, f.airline);
        const hasDiscount = effectiveCost < f.cost;
        const canAfford = char.credits >= effectiveCost;

        const statusClass = f.delayed ? 'delayed' : waitTime <= 30 ? 'boarding' : 'ontime';
        const statusText = f.delayed ? `Delayed +${formatDuration(f.delayMinutes)}` : waitTime <= 30 ? 'Boarding' : 'On Time';

        const row = document.createElement('div');
        row.className = 'flight-row' + (f.delayed ? ' flight-delayed' : '');

        const schedArrivalTod = (f.tod + f.duration) % 1440;
        const actualDepTod = (f.tod + (f.delayed ? f.delayMinutes : 0)) % 1440;
        const actualArrTod = (f.tod + f.duration + (f.delayed ? f.delayMinutes : 0)) % 1440;
        const timeLine = f.delayed
            ? `Sched <span style="color:#e0e0e0; text-decoration:line-through; opacity:0.6;">${formatTimeOfDay(f.tod)} → ${formatTimeOfDay(schedArrivalTod)}</span> <span style="color:#f1c40f;">Actual ${formatTimeOfDay(actualDepTod)} → ${formatTimeOfDay(actualArrTod)}</span>`
            : `Sched <span style="color:#e0e0e0;">${formatTimeOfDay(f.tod)} → ${formatTimeOfDay(schedArrivalTod)}</span>`;
        row.innerHTML = `
            <div class="flight-row-info">
                <div class="flight-airline-row">
                    <span class="airline-badge" style="background:${airline.color}; border: 1px solid ${airline.accent};">
                        <span class="airline-icon">${airline.icon}</span> ${airline.name}
                    </span>
                    <span style="font-size:12px; color:#aaa;">${f.flightNumber} · Gate ${f.gate}</span>
                </div>
                <div class="flight-dest">${f.to} — ${destAirport ? destAirport.name : f.to}</div>
                <div class="flight-meta">
                    ${timeLine} · ${formatDuration(f.duration)} · <span style="color:#e0e0e0;">Departs in ${formatDuration(waitTime)}</span>
                </div>
                <div style="margin-top:6px;"><span class="flight-status ${statusClass}">${statusText}</span></div>
            </div>
            <div class="flight-row-actions">
                <div class="flight-cost-badge">
                    ${hasDiscount ? `<span class="cost-strike">${f.cost}💳</span>` : ''}
                    <span style="color:${hasDiscount ? '#2ecc71' : '#e94560'};">${effectiveCost}💳</span>
                </div>
                ${hasDiscount ? `<div class="discount-tag">${getLoyaltyFor(char, f.airline).tier} saves ${f.cost - effectiveCost}💳</div>` : ''}
                <button class="flight-book-btn" ${canAfford ? '' : 'disabled'}>Book</button>
            </div>
        `;
        const btn = row.querySelector('.flight-book-btn');
        btn.addEventListener('click', () => bookFlight(f));
        if (!canAfford) btn.title = 'Not enough credits';
        container.appendChild(row);
    });
}

function renderProfileList() {
    const char = getActiveChar();
    const container = document.getElementById('profile-list');
    const titleEl = document.getElementById('section-title');
    container.innerHTML = '';

    const allMen = [];
    Object.keys(char.world.airports).forEach(aid => {
        char.world.airports[aid].men.forEach(m => {
            allMen.push({ ...m, airport: aid });
        });
    });

    const filteredMen = currentFilter === 'here'
        ? allMen.filter(m => m.airport === char.currentAirport)
        : allMen;

    titleEl.textContent = currentFilter === 'here' ? 'Men at this airport' : 'All men everywhere';

    filteredMen.sort((a, b) => {
        const distA = getFlightCost(char.currentAirport, a.airport);
        const distB = getFlightCost(char.currentAirport, b.airport);
        if (distA !== distB) return distA - distB;
        return b.matchPercent - a.matchPercent;
    });

    if (filteredMen.length === 0) {
        const msg = currentFilter === 'here'
            ? 'No men at this airport. Fly somewhere or wait for arrivals...'
            : 'No men found nearby. Wait for new arrivals...';
        container.innerHTML = `<div class="empty-state"><div class="icon">🤷</div><p>${msg}</p></div>`;
        return;
    }

    filteredMen.forEach(m => {
        const card = document.createElement('div');
        card.className = 'profile-card';

        const matchClass = m.matchPercent >= 70 ? 'match-high' : m.matchPercent >= 45 ? 'match-mid' : 'match-low';
        const timerClass = m.minutesLeft <= 60 ? 'urgent' : '';
        const isCurrentAirport = m.airport === char.currentAirport;

        const airportName = AIRPORTS.find(a => a.id === m.airport)?.name || m.airport;
        const isDirect = CONNECTIONS[char.currentAirport]?.includes(m.airport);
        const cost = getFlightCost(char.currentAirport, m.airport);
        const itineraryHint = isCurrentAirport ? '' : isDirect ? `${cost}💳 direct` : `${cost}💳 · no direct — 1+ stops`;

        const shownPrefs = m.preferences.slice(0, 3);
        const hiddenCount = m.preferences.length - shownPrefs.length + m.hiddenPrefs.length;
        const rushedHint = m.minutesLeft < 60 ? 'rushed' : m.minutesLeft < 120 ? 'tight' : m.minutesLeft < 180 ? 'short' : '';
        const rushedLabel = isCurrentAirport && rushedHint ? ` · ${rushedHint} layover` : '';

        card.innerHTML = `
            <div class="profile-top">
                <div class="profile-avatar">${m.avatar}</div>
                <div class="profile-main">
                    <div class="profile-name">${m.name}, ${m.age}</div>
                    <div class="profile-location">${airportName}${!isCurrentAirport ? ` · ${formatDuration(m.minutesLeft)} layover · ${itineraryHint}` : ''}</div>
                </div>
                <div class="match-badge ${matchClass}">${m.matchPercent}%</div>
            </div>
            <div class="profile-prefs">
                ${shownPrefs.map(p => `<span class="profile-pref">${p}</span>`).join('')}
                ${hiddenCount > 0 ? `<span class="profile-pref hidden-pref">+${hiddenCount} hidden</span>` : ''}
            </div>
            <div class="profile-bottom">
                <span class="timer-badge ${timerClass}">⏱ ${formatDuration(m.minutesLeft)} left${rushedLabel}</span>
                ${isCurrentAirport
                    ? `<button class="meet-btn fly-btn">Meet ${m.name}</button>`
                    : `<button class="view-flights-btn fly-btn" ${isDirect ? '' : 'title="No direct flights — see flights tab for connections"'}>${isDirect ? 'View Flights' : 'Connections'}</button>`
                }
            </div>
        `;
        const meetBtn = card.querySelector('.meet-btn');
        if (meetBtn) meetBtn.addEventListener('click', () => meetManById(String(m.id)));
        const viewBtn = card.querySelector('.view-flights-btn');
        if (viewBtn) viewBtn.addEventListener('click', () => showGameTab('flights'));
        container.appendChild(card);
    });
}

function meetManById(manId) {
    const char = getActiveChar();
    const numId = parseFloat(manId);
    let foundMan = null;

    const port = char.world.airports[char.currentAirport];
    const idx = port.men.findIndex(m => m.id === numId || String(m.id) === String(manId));
    if (idx !== -1) {
        foundMan = port.men[idx];
        port.men.splice(idx, 1);
    }

    if (foundMan) {
        saveGame();
        startEncounter(foundMan);
    }
}

function showGameTab(tab) {
    currentView = tab;

    document.getElementById('flights-tab').style.display = tab === 'flights' ? '' : 'none';
    document.getElementById('browse-tab').style.display = tab === 'browse' ? '' : 'none';
    document.getElementById('profile-view').style.display = tab === 'profile' ? '' : 'none';

    document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));

    if (tab === 'flights') {
        document.querySelectorAll('.bottom-nav .nav-btn')[0].classList.add('active');
    } else if (tab === 'browse') {
        document.querySelectorAll('.bottom-nav .nav-btn')[1].classList.add('active');
    } else if (tab === 'profile') {
        document.querySelectorAll('.bottom-nav .nav-btn')[2].classList.add('active');
        renderProfileView();
    }

    renderGame();
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderProfileList();
}

function renderProfileView() {
    const char = getActiveChar();
    ensureLoyalty(char);
    const container = document.getElementById('profile-content');
    const airport = AIRPORTS.find(a => a.id === char.currentAirport);

    const allEvents = [];

    char.history.flights.forEach(f => {
        allEvents.push({ type: 'flight', gameTime: f.gameTime, data: f });
    });
    char.history.encounters.forEach(e => {
        allEvents.push({ type: 'encounter', gameTime: e.gameTime, data: e });
    });
    allEvents.sort((a, b) => b.gameTime - a.gameTime);

    let timelineHtml = allEvents.map(event => {
        if (event.type === 'flight') {
            const f = event.data;
            const fromName = AIRPORTS.find(a => a.id === f.from)?.name || f.from;
            const toName = AIRPORTS.find(a => a.id === f.to)?.name || f.to;
            const airline = f.airline ? getAirlineById(f.airline) : null;
            return `
                <div class="history-item flight">
                    <div class="history-title">✈️ ${fromName || 'Start'} → ${toName} ${airline ? `<span style="font-size:11px; padding:2px 6px; border-radius:8px; background:${airline.color}; color:white;">${airline.name} ${f.flightNumber||''}</span>` : ''}</div>
                    <div class="history-detail">${f.cost} credits${f.baseCost && f.baseCost!==f.cost ? ` (was ${f.baseCost})` : ''} · ${f.miles ? f.miles+' miles' : ''}${f.delayed ? ` · Delayed ${formatDuration(f.delayMinutes)}` : ' · On time'}</div>
                    <div class="history-time">${formatGameTime(f.gameTime)}</div>
                </div>
            `;
        } else {
            const e = event.data;
            const airportName = AIRPORTS.find(a => a.id === e.airport)?.name || e.airport;
            const eff = e.effectiveCompatibility ? ` → ${e.effectiveCompatibility}% eff` : '';
            const layoverInfo = e.layover ? ` · ${formatDuration(e.layover)} layover` : '';
            const cappedInfo = e.wasCapped ? ' · ⏱ cut short' : e.layoverPenalty ? ` · -${e.layoverPenalty}% rushed` : '';
            return `
                <div class="history-item encounter">
                    <div class="history-title">💕 ${e.manName}, ${e.manAge} — ${airportName} ${e.loungeBonus ? '✨ lounge' : ''}</div>
                    <div class="history-detail">
                        ${e.compatibility}%${eff} match · ${e.success ? '✓ Success' : '✗ No spark'}${layoverInfo}${cappedInfo}
                        ${e.creditsEarned > 0 ? ` · +${e.creditsEarned} credits` : ''}
                    </div>
                    ${e.activities.length > 0 ? `<div class="history-detail">Activities: ${e.activities.join(', ')}</div>` : ''}
                    ${e.totalTime ? `<div class="history-detail">${formatDuration(e.totalTime)} spent</div>` : ''}
                    <div class="history-time">${formatGameTime(e.gameTime)}</div>
                </div>
            `;
        }
    }).join('');

    // loyalty grid
    let loyaltyHtml = '<div class="loyalty-grid">';
    for (const al of AIRLINES) {
        const rec = getLoyaltyFor(char, al.id);
        const prog = getNextTierProgress(char, al.id);
        loyaltyHtml += `
            <div class="loyalty-card" style="border-top-color:${al.color}">
                <div class="loyalty-card-header">
                    <div class="loyalty-card-name"><span>${al.icon}</span> ${al.name}</div>
                    <span class="loyalty-tier ${rec.tier}">${rec.tier}</span>
                </div>
                <div class="loyalty-stats">${rec.miles.toLocaleString()} miles · ${rec.segments} segments</div>
                <div class="loyalty-progress"><div class="loyalty-progress-bar" style="width:${prog.pct}%; background:${al.color}"></div></div>
                <div class="loyalty-next">${prog.next ? `Next: ${prog.next} — need ${prog.needMiles.toLocaleString()} miles or ${prog.needSeg} seg` : 'Top tier — you’re iconic'}</div>
                <div style="font-size:11px; color:#666; margin-top:4px;">${al.lounge} @ ${al.hubs.join(', ')}</div>
            </div>
        `;
    }
    loyaltyHtml += '</div>';

    container.innerHTML = `
        <div class="profile-header">
            <div class="char-avatar">${char.avatar}</div>
            <div class="char-name">${char.name}</div>
            <div style="color:#888; margin-top:4px;">${airport ? airport.name : char.currentAirport} Airport</div>
        </div>

        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-value">${char.credits}</div>
                <div class="stat-label">Credits</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${char.stats.encounters}</div>
                <div class="stat-label">Encounters</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${char.stats.bestMatch}%</div>
                <div class="stat-label">Best Match</div>
            </div>
        </div>

        <div class="section-title">Airline Loyalty</div>
        ${loyaltyHtml}

        <div class="section-title">Timeline</div>
        ${timelineHtml || '<div class="empty-state"><p>No events yet</p></div>'}

        <div style="margin-top:32px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-small" id="switch-char-btn">Switch Character</button>
            <button class="btn btn-primary btn-small" id="new-char-btn2">New Character</button>
        </div>
    `;
    container.querySelector('#switch-char-btn').addEventListener('click', () => { showScreen('title-screen'); renderTitleScreen(); });
    container.querySelector('#new-char-btn2').addEventListener('click', () => { showScreen('create-screen'); renderCreateScreen(); });
}

// ---- wiring ----
function init() {
    loadGame();

    // title screen handlers
    document.getElementById('new-char-btn')?.addEventListener('click', () => showScreen('create-screen'));
    document.getElementById('create-back-btn')?.addEventListener('click', () => showScreen('title-screen'));
    document.getElementById('create-start-btn')?.addEventListener('click', createCharacter);

    document.getElementById('wait-btn')?.addEventListener('click', wait);
    document.getElementById('wait-next-btn')?.addEventListener('click', waitUntilNextFlight);
    document.getElementById('browse-men-btn')?.addEventListener('click', () => showGameTab('browse'));
    document.getElementById('view-flights-btn')?.addEventListener('click', () => showGameTab('flights'));
    document.getElementById('end-encounter-btn')?.addEventListener('click', endEncounter);
    document.getElementById('end-arrival-btn')?.addEventListener('click', endArrival);
    document.getElementById('char-switcher')?.addEventListener('click', toggleCharDropdown);
    document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
    document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.addEventListener('click', () => showGameTab(b.dataset.tab)));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.char-switcher')) {
            document.getElementById('char-dropdown')?.classList.remove('open');
        }
    });

    if (gameState.activeCharacterId && gameState.characters[gameState.activeCharacterId]) {
        showScreen('game-screen');
        renderGame();
    } else {
        showScreen('title-screen');
        renderTitleScreen();
    }

    renderCreateScreen();
}

// expose for html inline compat if needed
window.wait = wait;
window.waitUntilNextFlight = waitUntilNextFlight;
window.bookFlight = bookFlight;
window.meetManById = meetManById;
window.showGameTab = showGameTab;
window.setFilter = setFilter;
window.showScreen = showScreen;

init();
