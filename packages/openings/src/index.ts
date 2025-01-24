import type { HalfHourOpening, Preferences, Opening, DurationMinutes } from '@mckaren/types';

type CondensedHalfHourOpening = {
  startDatetime: Date;
  courts: Set<string>;
}

type OpeningChunk = {
  startDatetime: Date;
  endDatetime: Date;
  condensedHalfHourOpenings: CondensedHalfHourOpening[];
}

function isDayOfWeek(day: number): day is 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return day >= 0 && day <= 6;
}

export function filterHalfHourOpeningsByPreferences(
  halfHourOpenings: HalfHourOpening[],
  preferences: Preferences
): HalfHourOpening[] {
  return halfHourOpenings
    // Filter by days of week
    .filter(opening => {
      const day = opening.datetime.getDay();
      return isDayOfWeek(day) && preferences.daysOfWeek.includes(day);
    })
    // Filter by time range
    .filter(opening => {
      const hour = opening.datetime.getHours();
      const minute = opening.datetime.getMinutes();

      // Check if time is within range
      if (hour < preferences.minStartTime.hour) return false;
      if (hour > preferences.maxEndTime.hour) return false;
      
      // If on boundary hours, check minutes
      if (hour === preferences.minStartTime.hour && minute < preferences.minStartTime.minute) return false;
      if (hour === preferences.maxEndTime.hour && minute > preferences.maxEndTime.minute) return false;

      return true;
    })
    // Filter out omitted courts
    .filter(opening => !preferences.omittedCourts.includes(opening.court));
}

function createCondensedOpenings(filteredOpenings: HalfHourOpening[]): CondensedHalfHourOpening[] {
  // Group openings by start time to get all available courts for each time slot
  const openingsByTime = filteredOpenings.reduce<Record<number, CondensedHalfHourOpening>>((acc, opening) => {
    const timeKey = opening.datetime.getTime();
    
    if (!acc[timeKey]) {
      acc[timeKey] = {
        startDatetime: opening.datetime,
        courts: new Set([opening.court])
      };
    } else {
      acc[timeKey].courts.add(opening.court);
    }
    
    return acc;
  }, {});

  return Object.values(openingsByTime).sort((a, b) => 
    a.startDatetime.getTime() - b.startDatetime.getTime()
  );
}

function createConsecutiveChunks(condensedOpenings: CondensedHalfHourOpening[]): OpeningChunk[] {
  const chunks: OpeningChunk[] = [];
  let currentChunk: OpeningChunk | null = null;

  for (const opening of condensedOpenings) {
    if (!currentChunk) {
      currentChunk = {
        startDatetime: opening.startDatetime,
        endDatetime: new Date(opening.startDatetime.getTime() + 30 * 60 * 1000),
        condensedHalfHourOpenings: [opening]
      };
      continue;
    }

    // Check if this opening is consecutive (30 minutes after the last one)
    const expectedNextTime = currentChunk.endDatetime.getTime();
    const actualTime = opening.startDatetime.getTime();

    if (expectedNextTime === actualTime) {
      // Extend current chunk
      currentChunk.endDatetime = new Date(actualTime + 30 * 60 * 1000);
      currentChunk.condensedHalfHourOpenings.push(opening);
    } else {
      // Start new chunk
      chunks.push(currentChunk);
      currentChunk = {
        startDatetime: opening.startDatetime,
        endDatetime: new Date(opening.startDatetime.getTime() + 30 * 60 * 1000),
        condensedHalfHourOpenings: [opening]
      };
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function setDiff(setA: Set<string>, setB: Set<string>): Set<string> {
  return new Set([...setA].filter(court => setB.has(court)));
}

function findOptimalPath(condensedOpenings: CondensedHalfHourOpening[]): string[] {
  let path: string[] = [];
  let possibleCourts: Set<string> = new Set();
  let currentCount = 0;
  const toRecheck: { index: number, courts: Set<string> }[] = [];

  for (const [i, opening] of condensedOpenings.entries()) {
    const diff = setDiff(possibleCourts, opening.courts);
    if (diff.size === 0) {
      // Need to switch courts - pick any available one
      if (currentCount === 1 && i > 1) {
        toRecheck.push({ index: i - 1, courts: possibleCourts })
      }
      path = [...path, ...Array(currentCount).fill(Array.from(possibleCourts)[0])];
      possibleCourts = opening.courts;
      currentCount = 1
    } else {
      possibleCourts = diff
      currentCount++
    }
    if (i === condensedOpenings.length - 1) {
      if (currentCount === 1 && i > 0) {
        toRecheck.push({ index: i, courts: possibleCourts })
      }
      path = [...path, ...Array(currentCount).fill(Array.from(possibleCourts)[0])];
    }
  }

  for (const recheck of toRecheck) {
    const opening = condensedOpenings[recheck.index - 1]
    const diff = setDiff(recheck.courts, opening.courts)
    if (diff.size > 0) {
      const courtToSwitchTo = Array.from(diff)[0]
      path[recheck.index] = courtToSwitchTo
      path[recheck.index - 1] = courtToSwitchTo
    }
  }

  return path;
}

function createOpeningsFromChunk(chunk: OpeningChunk, minDuration: DurationMinutes): Omit<Opening, 'facility'>[] {
  const openings: Omit<Opening, 'facility'>[] = [];
  const numSlots = chunk.condensedHalfHourOpenings.length;
  const minSlots = minDuration / 30;

  // For each possible starting position
  for (let start = 0; start < numSlots; start++) {
    // For each possible length (that's at least minDuration)
    for (let len = minSlots; len <= numSlots - start; len++) {
      const relevantOpenings = chunk.condensedHalfHourOpenings.slice(start, start + len);
      const durationMinutes = len * 30 as DurationMinutes;
      
      openings.push({
        startDatetime: relevantOpenings[0].startDatetime,
        endDatetime: new Date(relevantOpenings[0].startDatetime.getTime() + durationMinutes * 60 * 1000),
        durationMinutes,
        path: findOptimalPath(relevantOpenings)
      });
    }
  }

  return openings;
}

export function getOpenings(
  halfHourOpenings: HalfHourOpening[],
  minDuration: DurationMinutes
): Omit<Opening, 'facility'>[] {
  const condensedOpenings = createCondensedOpenings(halfHourOpenings);
  const chunks = createConsecutiveChunks(condensedOpenings);
  return chunks.flatMap(chunk => 
    createOpeningsFromChunk(chunk, minDuration)
  );
} 