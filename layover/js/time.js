export const START_HOUR = 6;

export function formatGameTime(totalMinutes) {
    const day = Math.floor(totalMinutes / 1440) + 1;
    const minutesInDay = totalMinutes % 1440;
    let hours = Math.floor(minutesInDay / 60);
    const mins = minutesInDay % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `Day ${day}, ${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export function formatTimeOfDay(todMinutes) {
    let hours = Math.floor(todMinutes / 60);
    const mins = todMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function getDayNumber(gameTime) {
    return Math.floor(gameTime / 1440);
}

export function getDayStart(gameTime) {
    return Math.floor(gameTime / 1440) * 1440;
}

export function getTod(gameTime) {
    return gameTime % 1440;
}
