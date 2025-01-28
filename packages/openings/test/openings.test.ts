import type { HalfHourOpening } from '@mckaren/types';
import { getOpenings } from '../src';

describe('getOpenings', () => {
  const minDuration = 60;


  test('creates consecutive chunks correctly', () => {
    const openings: HalfHourOpening[] = [
      // 7:00-7:30
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T12:00:00.000Z') },
      // 7:30-8:00
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T12:30:00.000Z') },
      // 8:30-9:00 (gap, should start new chunk)
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T13:30:00.000Z') },
    ];

    const result = getOpenings(openings, 60);
    
    // Should have 1-hour opening from first chunk
    expect(result).toHaveLength(1);
    
    // Check first opening (1 hour)
    expect(result[0]).toEqual({
      startDatetime: new Date('2024-01-01T12:00:00.000Z'),
      endDatetime: new Date('2024-01-01T13:00:00.000Z'),
      durationMinutes: 60,
      courts: ['1']
    });
  });

  test('finds optimal path with minimal court switches', () => {
    const openings: HalfHourOpening[] = [
      // 7:00-7:30 - Courts 1,2 available
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T12:00:00.000Z') },
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T12:00:00.000Z') },
      // 7:30-8:00 - Only Court 2 available
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T12:30:00.000Z') },
      // 8:00-8:30 - Courts 1,2 available
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T13:00:00.000Z') },
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T13:00:00.000Z') },
    ];

    const result = getOpenings(openings, minDuration);
    
    // Should have 1.5 hour opening
    const fullOpening = result.find(o => o.durationMinutes === 90);
    expect(fullOpening).toBeDefined();
    expect(fullOpening?.courts).toEqual(['2']); // Should stick with Court 2 throughout
  });


  test('creates all valid duration openings within a chunk', () => {
    const openings: HalfHourOpening[] = [
      // 7:00-7:30
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T12:00:00.000Z') },
      // 7:30-8:00
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T12:30:00.000Z') },
      // 8:00-8:30
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T13:00:00.000Z') },
    ];

    const result = getOpenings(openings, minDuration);
    
    // Should have:
    // - 1.5 hour opening (7:00-8:30)
    // - 1 hour opening (7:00-8:00)
    // - 1 hour opening (7:30-8:30)
    expect(result).toHaveLength(3);
    
    const durations = result.map(o => o.durationMinutes).sort();
    expect(durations).toEqual([60, 60, 90]);
  });

  test('optimizes for longer openings with court switches', () => {
    const openings: HalfHourOpening[] = [
      // 10:00-10:30 - Court 1 only
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T15:00:00.000Z') },
      // 10:30-11:00 - Court 1 only
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T15:30:00.000Z') },
      // 11:00-11:30 - Both courts
      { facility: 'test', court: '1', datetime: new Date('2024-01-01T16:00:00.000Z') },
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T16:00:00.000Z') },
      // 11:30-12:00 - Court 2 only
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T16:30:00.000Z') },
      // 12:00-12:30 - Court 2 only
      { facility: 'test', court: '2', datetime: new Date('2024-01-01T17:00:00.000Z') },
    ];

    const result = getOpenings(openings, minDuration);
    
    // Should find:
    // 1. 10:00-12:00 (120 min) - switching from Court 1 to 2 at 11:00
    // 2. 10:00-11:30 (90 min) - staying on Court 1
    // 3. 10:30-12:00 (90 min) - switching from Court 1 to 2 at 11:00
    // 4. 11:00-12:30 (90 min) - staying on Court 2
    // Plus various 60-minute combinations

    
    // Check the 2-hour opening
    const twoHourOpening = result.find(o => o.durationMinutes === 120);
    expect(twoHourOpening).toBeDefined();
    expect(twoHourOpening?.path).toEqual(['1', '1', '2', '2']); // Switch at 11:00 to get full 2 hours
    
    // Check we have the right number of openings
    const ninetyMinOpenings = result.filter(o => o.durationMinutes === 90);
    expect(ninetyMinOpenings).toHaveLength(3);
  });
}); 