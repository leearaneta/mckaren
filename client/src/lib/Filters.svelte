<script>
  import _ from 'lodash';
  import request from './request';

  export let filters;
  export let formattedFilters;
  const weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

  let email;
  let message;

  function removeFilter(idx) {
    filters = filters.filter((_, i) => i !== idx);
  }

  function formatFilterForPOSTRequest({ weekdays, hourLength }, idx) {
    const selectedWeekdays = _(weekdays)
      .pickBy()
      .keys()
      .map(weekday => Number(weekday))
      .map(weekday => weekday === 0 ? 7 : weekday) // convert to postgres
      .value();
    
    return {
      weekdays: selectedWeekdays,
      min_start_hour: formattedFilters[idx].minStartHour,
      max_end_hour: formattedFilters[idx].maxEndHour,
      length: hourLength,
    }
  }

  function setMessage(_message) {
    message = _message;
    setTimeout(() => message = null, 3000);
  }

  function subscribe() {
    request.post('/subscriptions', { email, filters: filters.map(formatFilterForPOSTRequest) })
      .then(() => setMessage('yay it worked!'))
      .catch(() => setMessage('something broke :/'))
  }

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
  $: emailIsValid = validateEmail(email);
</script>

<div class="container">
  <div class="filters">
    {#each filters as filter, filterIdx}
      <div class="filter">
        <div class="top">
          <div class="remove" on:click={() => removeFilter(filterIdx)}> &#215 </div>
          <div class="error"> { formattedFilters[filterIdx].error || '' } </div>
        </div>
        <div class="days">
          on:
          {#each weekdays as weekday, weekdayIdx}
            <label><input type="checkbox" bind:checked={filter.weekdays[weekdayIdx]} /> { weekday } </label>
          {/each}
        </div>
        <div class="time">
          between: 
          <input type="time" bind:value={filter.minStartTime} />
          and
          <input type="time" bind:value={filter.maxEndTime} />
        </div>
        <div class="length">
          for:
          <label><input type="radio" bind:group={filter.hourLength} value={1} /> 1 hour </label>
          <label><input type="radio" bind:group={filter.hourLength} value={2} /> 2 hours </label>
          <label><input type="radio" bind:group={filter.hourLength} value={3} /> 3 hours? wow lol </label>
        </div>
      </div>
    {/each}
    {#if filters.length <= 3}
      <div
        class="add"
        on:click={() => filters = [...filters, { weekdays: {}, hourLength: 1 }]}
      >
        &#x2B;
      </div>
    {/if}
  </div>
  <div class="subscription">
    <input bind:value={email} class="email" placeholder="email" />
    <button
      class="subscribe"
      on:click={subscribe}
      disabled={!emailIsValid || formattedFilters.find(filter => filter.error)}
    >
      { message || 'subscribe to filters ^^' }
    </button>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 20rem;
    height: 100%;
  }
  .filter {
    display: flex;
    flex-direction: column;
    font-size: 0.925rem;
  }
  .days, .time, .length, .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .add, .remove {
    cursor: pointer;
  }
  .email, .subscribe {
    width: 48%;
  }
  .subscription {
    display: flex;
    justify-content: space-between;
  }
  .error {
    color: #ff0033;
    font-size: 0.8rem;
  }
</style>