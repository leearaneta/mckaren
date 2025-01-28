import type { DurationMinutes } from '@mckaren/types';
import { processSubscriptionOpenings } from '../src/etl/openings';
import type { HalfHourOpening } from '../src/types';

describe('processSubscriptionOpenings', () => {
  const facility = 'Test Facility';
  const baseDate = new Date('2024-01-01T12:00:00Z');

  // Helper to create half-hour openings
  function createHalfHourOpening(court: string, datetime: Date): HalfHourOpening {
    return { facility, court, datetime };
  }

  // Helper to create a sequence of half-hour openings
  function createHalfHourOpenings(court: string, startTime: Date, count: number): HalfHourOpening[] {
    return Array.from({ length: count }, (_, i) => {
      const datetime = new Date(startTime.getTime() + i * 30 * 60 * 1000);
      return createHalfHourOpening(court, datetime);
    });
  }

  describe('basic functionality', () => {
    it('should return empty object when there are no new openings', () => {
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      const prevHalfHourOpenings = [...currentHalfHourOpenings];
      const subscriptions = [{
        email: 'test@example.com',
        preferences: {
          minStartTime: { hour: 8, minute: 0 },
          maxEndTime: { hour: 22, minute: 0 },
          minDuration: 60 as DurationMinutes,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
          omittedCourts: []
        }
      }];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      expect(result).toEqual({});
    });

    it('should detect new openings and group them by email', () => {
      // Previous state: Court 1 has 2 slots
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 2);
      
      // Current state: Court 1 has 4 slots (2 new ones)
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      
      const subscriptions = [{
        email: 'test@example.com',
        preferences: {
          minStartTime: { hour: 8, minute: 0 },
          maxEndTime: { hour: 22, minute: 0 },
          minDuration: 60 as DurationMinutes,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
          omittedCourts: []
        }
      }];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      expect(Object.keys(result)).toEqual(['test@example.com']);
      expect(result['test@example.com'].length).toBeGreaterThan(0);
      expect(result['test@example.com'][0]).toHaveProperty('facility', facility);
    });
  });

  describe('multiple subscriptions', () => {
    it('should handle multiple subscriptions for the same email', () => {
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 2);
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      
      const subscriptions = [
        {
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: 8, minute: 0 },
            maxEndTime: { hour: 12, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [1, 2, 3] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        },
        {
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: 13, minute: 0 },
            maxEndTime: { hour: 17, minute: 0 },
            minDuration: 90 as DurationMinutes,
            daysOfWeek: [4, 5] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        }
      ];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      expect(Object.keys(result)).toEqual(['test@example.com']);
      // Should deduplicate openings for the same time slots
      const openings = result['test@example.com'];
      const uniqueTimes = new Set(openings.map(o => o.startDatetime.toISOString()));
      expect(uniqueTimes.size).toBe(openings.length);
    });

    it('should handle multiple emails', () => {
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 2);
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      
      const subscriptions = [
        {
          email: 'test1@example.com',
          preferences: {
            minStartTime: { hour: 8, minute: 0 },
            maxEndTime: { hour: 12, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [1, 2, 3] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        },
        {
          email: 'test2@example.com',
          preferences: {
            minStartTime: { hour: 8, minute: 0 },
            maxEndTime: { hour: 12, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [1, 2, 3] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        }
      ];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      expect(Object.keys(result).sort()).toEqual(['test1@example.com', 'test2@example.com']);
    });
  });

  describe('filtering', () => {
    it('should respect omitted courts', () => {
      const prevHalfHourOpenings = [
        ...createHalfHourOpenings('Court 1', baseDate, 2),
        ...createHalfHourOpenings('Court 2', baseDate, 2)
      ];
      const currentHalfHourOpenings = [
        ...createHalfHourOpenings('Court 1', baseDate, 4),
        ...createHalfHourOpenings('Court 2', baseDate, 4)
      ];
      
      const subscriptions = [{
        email: 'test@example.com',
        preferences: {
          minStartTime: { hour: 8, minute: 0 },
          maxEndTime: { hour: 22, minute: 0 },
          minDuration: 60 as DurationMinutes,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
          omittedCourts: ['Court 2']
        }
      }];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      expect(result['test@example.com'].every(o => !o.courts?.includes('Court 2'))).toBe(true);
    });

    it('should respect time preferences', () => {
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 2);
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      
      const subscriptions = [{
        email: 'test@example.com',
        preferences: {
          minStartTime: { hour: baseDate.getHours(), minute: 0 },
          maxEndTime: { hour: baseDate.getHours() + 1, minute: 0 },
          minDuration: 60 as DurationMinutes,
          daysOfWeek: [baseDate.getDay()] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
          omittedCourts: []
        }
      }];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      const openings = result['test@example.com'] || [];
      openings.forEach(opening => {
        const hour = opening.startDatetime.getHours();
        expect(hour).toBeGreaterThanOrEqual(baseDate.getHours());
        expect(hour).toBeLessThanOrEqual(baseDate.getHours() + 1);
      });
    });
  });

  describe('deduplication', () => {
    it('should deduplicate openings with same start time and duration across subscriptions', () => {
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 6);
      
      const subscriptions = [
        {
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: baseDate.getHours(), minute: 0 },
            maxEndTime: { hour: baseDate.getHours() + 2, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [baseDate.getDay()] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        },
        {
          // Same preferences but different name - should still dedupe
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: baseDate.getHours(), minute: 0 },
            maxEndTime: { hour: baseDate.getHours() + 2, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [baseDate.getDay()] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        }
      ];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      const openings = result['test@example.com'];
      
      // Check for unique combinations of start time and duration
      const uniqueOpenings = new Set(
        openings.map(o => `${o.startDatetime.toISOString()}-${o.durationMinutes}`)
      );
      expect(uniqueOpenings.size).toBe(openings.length);
    });

    it('should deduplicate openings with overlapping time ranges', () => {
      const prevHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 4);
      const currentHalfHourOpenings = createHalfHourOpenings('Court 1', baseDate, 8);
      
      const subscriptions = [
        {
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: baseDate.getHours(), minute: 0 },
            maxEndTime: { hour: baseDate.getHours() + 2, minute: 0 },
            minDuration: 60 as DurationMinutes,
            daysOfWeek: [baseDate.getDay()] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        },
        {
          // Overlapping time range with different duration
          email: 'test@example.com',
          preferences: {
            minStartTime: { hour: baseDate.getHours() + 1, minute: 0 },
            maxEndTime: { hour: baseDate.getHours() + 3, minute: 0 },
            minDuration: 90 as DurationMinutes,
            daysOfWeek: [baseDate.getDay()] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
            omittedCourts: []
          }
        }
      ];

      const result = processSubscriptionOpenings(subscriptions, facility, currentHalfHourOpenings, prevHalfHourOpenings);
      const openings = result['test@example.com'];
      
      // Check that each opening is unique by start time and duration
      const seen = new Set<string>();
      const duplicates = openings.filter(opening => {
        const key = `${opening.startDatetime.toISOString()}-${opening.durationMinutes}`;
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });
      
      expect(duplicates.length).toBe(0);
      
      // Verify we have openings from both subscriptions
      const durations = new Set(openings.map(o => o.durationMinutes));
      expect(durations).toContain(60);
      expect(durations).toContain(90);
    });
  });
}); 