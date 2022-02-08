<script>
  import axios from 'axios';
  import _ from 'lodash';
  import Calendar from './lib/Calendar.svelte';
  import Filters from './lib/Filters.svelte';
  import Timeline from './lib/Timeline.svelte';

  const persistedFilters = localStorage.getItem('mckaren.filters');
  const initialFilter = {
    days: _.range(7).reduce((days, day) => ({ ...days, [day]: true }), {}),
    minStartTime: '05:00', maxEndTime: '00:00', hourLength: 1,
  };
  let filters = persistedFilters ? JSON.parse(persistedFilters) : [initialFilter];

  function formatFilter(filter) {
    function convertTimeToHours(time, end = false) {
      if (!time) return undefined;
      if (end && time === '00:00') return 24;
      const [hour, minute] = time.split(':');
      return Number(hour) + (Number(minute) / 60);
    }
    return {
      ...filter,
      minStartHour: convertTimeToHours(filter.minStartTime),
      maxEndHour: convertTimeToHours(filter.maxEndTime, true),
    }
  }
  function filterIsValid({ days, hourLength, minStartHour, maxEndHour }) {
    return Object.values(days).find(v => v)
      && hourLength
      && minStartHour
      && maxEndHour
      && maxEndHour >= minStartHour + hourLength;
  }
  $: validFilters = filters.map(formatFilter).filter(filterIsValid);
  $: {
    localStorage.setItem('mckaren.filters', JSON.stringify(filters));
  }

  let openings;
  function formatOpening({ court, urls, ...opening }) {
    const datetime = new Date(opening.datetime);
    const startHour = datetime.getHours() + (datetime.getMinutes() / 60);
    const hourLength = opening.length;
    const endHour = startHour + hourLength;
    return { court, urls, datetime, startHour, endHour, hourLength };
  }
  $: {
    const url = import.meta.env.DEV ? 'http://localhost:5000/openings' : './openings';
    axios.get(url).then(res => openings = res.data.map(formatOpening));
  }

  function openingPassesFilter(opening, filter) {
    const dayPassesFilter = filter.days[opening.datetime.getDay()];
    const timePassesFilter = (opening.startHour >= filter.minStartHour) && (opening.endHour <= filter.maxEndHour);
    const lengthPassesFilter = opening.hourLength === filter.hourLength;
    return dayPassesFilter && timePassesFilter && lengthPassesFilter;
  }
  function openingIsValid(opening) {
    return validFilters.find(filter => openingPassesFilter(opening, filter));
  }
  $: filteredOpenings = validFilters.length > 0 ? openings?.filter(openingIsValid) : [];

  function openingFallsOnDate(opening, date) {
    return opening.datetime.getFullYear() === date.year
      && opening.datetime.getMonth() === date.month
      && opening.datetime.getDate() === date.dayOfMonth;
  }
  $: formatter = (date) => {
    return filteredOpenings.find(opening => openingFallsOnDate(opening, date))
      ? 'background: #c4d9fd; color: #5286fa; border-color: currentColor; cursor:pointer;'
      : '';
  };

  let selectedDate;
  $: openingsForSelectedDate = selectedDate
    ? filteredOpenings?.filter(opening => openingFallsOnDate(opening, selectedDate))
    : []

</script>

<main>
  <div class="app">
    <div class="header"> mckaren </div>
    <div class="calendar">
      {#if openings}
        <Calendar on:dateClick={(e) => selectedDate = e.detail} formatter={formatter} />
      {:else}
        <div> loading... </div>
      {/if}
    </div>
    <div class="filters">
      <Filters bind:filters />
    </div>
    <div class="timeline">
      <Timeline openings={openingsForSelectedDate} selectedDate={selectedDate} />
    </div>
  </div>
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  .app {
    display: grid;
    gap: 1rem 2rem;
    grid-template-rows: 4vh 52vh auto;
    grid-template-columns: 50vw auto;
    grid-template-areas:
      "header header"
      "calendar filters"
      "timeline timeline"
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
</style>
