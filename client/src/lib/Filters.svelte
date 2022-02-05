<script>
  export let filters;
  const days = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
</script>

<main>
  <div class="filters">
    {#each filters as filter, filterIdx}
      <div class="filter">
        <div
          class="remove"
          on:click={() => filters = filters.filter((_, idx) => idx !== filterIdx)}
        >
          x
        </div>
        <div class="days">
          on:
          {#each days as day, dayIdx}
            <label><input type="checkbox" bind:checked={filter.days[dayIdx]} /> { day } </label>
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
    <div
      class="add"
      on:click={() => filters = [...filters, { days: {} }]}
    >
      +
    </div>
  </div>
</main>

<style>
  .filter {
    width: 50%;
    display: flex;
    flex-direction: column;
  }
  .days, .time, .length {
    display: flex;
    justify-content: space-between;
  }
  .add, .remove {
    cursor: pointer;
  }
</style>