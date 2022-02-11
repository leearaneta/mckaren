<script>
  import _ from 'lodash';
  import { subscribe } from 'svelte/internal';
  import Calendar from './lib/Calendar.svelte';
  import Filters from './lib/Filters.svelte';
  import Timeline from './lib/Timeline.svelte';
  import request from './lib/request';


  const persistedFilters = localStorage.getItem('mckaren.filters');
  const initialFilter = {
    weekdays: _.range(7).reduce((weekdays, weekday) => ({ ...weekdays, [weekday]: true }), {}),
    minStartTime: '05:00', maxEndTime: '00:00', hourLength: 1,
  };
  let filters = persistedFilters ? JSON.parse(persistedFilters) : [initialFilter];

  function getErrorFromFilter(filter) {
    const { weekdays, hourLength, minStartHour, maxEndHour } = filter;
    if (!Object.values(weekdays).find(v => v)) return 'at least one weekday needs to be selected';
    else if (!minStartHour) return 'minimum start time is required';
    else if (!maxEndHour) return 'maximum end time is required';
    else if (maxEndHour < minStartHour + hourLength) return 'start time has to be before end time';
  }

  function formatFilter(filter) {
    function convertTimeToHours(time, end = false) {
      if (!time) return undefined;
      if (end && time === '00:00') return 24;
      const [hour, minute] = time.split(':');
      return Number(hour) + (Number(minute) / 60);
    }
    const minStartHour = convertTimeToHours(filter.minStartTime);
    const maxEndHour = convertTimeToHours(filter.maxEndTime, true);
    const formatted = { ...filter, minStartHour, maxEndHour };
    const error = getErrorFromFilter(formatted);
    return { ...formatted, error };
  }

  $: formattedFilters = filters.map(formatFilter);
  $: validFilters = formattedFilters.filter(filter => !filter.error);
  $: {
    localStorage.setItem('mckaren.filters', JSON.stringify(filters));
  }

  let openings;
  function formatOpening({ court, urls, weekday, datetime, start_hour, hour_length, end_hour }) {
    const [year, month, dayOfMonth] = datetime.split(' ')[0].split('-');
    const startHour = start_hour;
    const hourLength = hour_length;
    const endHour = end_hour;
    const _weekday = weekday === 7 ? 0 : weekday // convert from postgres;
    return {
      court, urls,
      year: Number(year), month: Number(month), dayOfMonth: Number(dayOfMonth),
      weekday: _weekday, startHour, endHour, hourLength };
  }

  $: {
    request.get('/openings').then(res => openings = res.data.map(formatOpening));
  }

  // refresh data every minute when window is active;
  let timer = 0;
  setInterval(() => {
    if (timer < 60) {
      timer += 1;
    } else if (!document.hidden) {
      request.get('/openings').then(res => openings = res.data.map(formatOpening));
      timer = 0;
    }
  }, 1000);


  function openingPassesFilter(opening, filter) {
    const weekdayPassesFilter = filter.weekdays[opening.weekday];
    const timePassesFilter = (opening.startHour >= filter.minStartHour) && (opening.endHour <= filter.maxEndHour);
    const lengthPassesFilter = opening.hourLength === filter.hourLength;
    return weekdayPassesFilter && timePassesFilter && lengthPassesFilter;
  }
  function openingIsValid(opening) {
    return validFilters.find(filter => openingPassesFilter(opening, filter));
  }
  $: filteredOpenings = validFilters.length > 0 ? openings?.filter(openingIsValid) : [];

  function openingFallsOnDate(opening, date) {
    return opening.year === date.year
      && opening.month - 1 === date.month
      && opening.dayOfMonth === date.dayOfMonth;
  }

  let selectedDate;
  $: openingsForSelectedDate = selectedDate
    ? filteredOpenings?.filter(opening => openingFallsOnDate(opening, selectedDate))
    : []

  $: getDateClass = (date) => {
    if (_.isEqual(date, selectedDate)) {
      return 'is-selected';
    }
    if (filteredOpenings.find(opening => openingFallsOnDate(opening, date))) {
      return 'has-opening';
    }
    return '';
  };

</script>

<div class="mckaren">
  <div class="header"> mckaren </div>
  <div class="calendar">
    {#if openings}
      <Calendar on:click={(e) => selectedDate = e.detail} getDateClass={getDateClass} />
    {:else}
      <div> loading... </div>
    {/if}
  </div>
  <div class="filters">
    <Filters bind:filters formattedFilters={formattedFilters} on:subscribe={subscribe} />
  </div>
  <div class="timeline">
    <Timeline openings={openingsForSelectedDate} selectedDate={selectedDate} />
  </div>
</div>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  .mckaren {
    height: 100vh;
    width: 100%;
    display: grid;
    gap: 1rem 2rem;
    grid-template-rows: 1fr 2fr 56fr 42fr 1fr;
    grid-template-columns: 2fr 10fr 10fr 2fr;
    grid-template-areas:
      ". . . ."
      ". header header ."
      ". calendar filters ."
      ". timeline timeline ."
      ". . . ."
  }
  .header {
    grid-area: header;
  }
  .calendar {
    grid-area: calendar;
  }
  .timeline {
    grid-area: timeline;
  }
  .filters {
    grid-area: filters;
  }

  :global(.has-opening) {
    background: #c4d9fd;
    color: #5286fa;
    border-color: currentColor;
    cursor: pointer;
  }

  :global(.has-opening:hover, .is-selected) {
    background: #5286fa;
    color: #c4d9fd;
    border-color: currentColor;
  }

</style>
