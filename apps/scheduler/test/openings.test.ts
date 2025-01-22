import { getOpenings } from '../src/etl/openings';
import type { HalfHourOpening } from '../src/types';

describe('getOpenings', () => {
  test('finds single court 1-hour opening', () => {
    const slots: HalfHourOpening[] = [
      { court: '1', datetime: '2024-01-01T12:00:00.000Z' },
      { court: '1', datetime: '2024-01-01T12:30:00.000Z' }
    ];

    const openings = getOpenings(slots);
    expect(openings).toHaveLength(1);
    expect(openings[0]).toEqual({
      startDatetime: '2024-01-01T12:00:00.000Z',
      endDatetime: '2024-01-01T13:00:00.000Z',
      minuteLength: 60,
      mostConvenient: [['1']]
    });
  });

  test('finds multi-court 2-hour opening', () => {
    const slots: HalfHourOpening[] = [
      // Court 1 available first hour
      { court: '1', datetime: '2024-01-01T12:00:00.000Z' },
      { court: '1', datetime: '2024-01-01T12:30:00.000Z' },
      // Court 2 available second hour
      { court: '2', datetime: '2024-01-01T13:00:00.000Z' },
      { court: '2', datetime: '2024-01-01T13:30:00.000Z' },
    ];

    const openings = getOpenings(slots);
    expect(openings).toHaveLength(6);
    
    // Find the 2-hour opening
    const twoHourOpening = openings.find(o => o.minuteLength === 120);
    expect(twoHourOpening).toBeDefined();
    expect(twoHourOpening?.mostConvenient).toEqual([['1', '2']]);
  });

  test('prefers single court for long duration', () => {
    const slots: HalfHourOpening[] = [
      // Court 1 available whole time
      { court: '1', datetime: '2024-01-01T12:00:00.000Z' },
      { court: '1', datetime: '2024-01-01T12:30:00.000Z' },
      { court: '1', datetime: '2024-01-01T13:00:00.000Z' },
      { court: '1', datetime: '2024-01-01T13:30:00.000Z' },
      // Court 2 also available whole time
      { court: '2', datetime: '2024-01-01T12:00:00.000Z' },
      { court: '2', datetime: '2024-01-01T12:30:00.000Z' },
      { court: '2', datetime: '2024-01-01T13:00:00.000Z' },
      { court: '2', datetime: '2024-01-01T13:30:00.000Z' },
    ];

    const openings = getOpenings(slots);
    const twoHourOpening = openings.find(o => o.minuteLength === 120);
    expect(twoHourOpening?.mostConvenient).toEqual([['1']]);
  });

  test('handles no available openings', () => {
    const slots: HalfHourOpening[] = [
      // Non-consecutive slots
      { court: '1', datetime: '2024-01-01T12:00:00.000Z' },
      { court: '1', datetime: '2024-01-01T13:00:00.000Z' },
    ];

    const openings = getOpenings(slots);
    expect(openings).toHaveLength(0);
  });
}); 