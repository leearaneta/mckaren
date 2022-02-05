<script>
  import { createEventDispatcher } from 'svelte';
	import calendarize from 'calendarize';
	import Arrow from './Arrow.svelte';

  export let formatter = ({}) => '';
	
  const today = new Date();
  let year = today.getFullYear();
	let month = today.getMonth();
	let offset = 0; // Sun

	let labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	
	let prev = calendarize(new Date(year, month-1), offset);
	let current = calendarize(new Date(year, month), offset);
	let next = calendarize(new Date(year, month+1), offset);
	
	function toPrev() {
		[current, next] = [prev, current];
		
		if (--month < 0) {
			month = 11;
			year--;
		}
		
		prev = calendarize(new Date(year, month-1), offset);
	}
	
	function toNext() {
		[prev, current] = [current, next];
		
		if (++month > 11) {
			month = 0;
			year++;
		}
		
		next = calendarize(new Date(year, month+1), offset);
	}
	
	function isToday(day) {
		return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
	}

  const dispatch = createEventDispatcher();
  function handleDateClick(date) {
    dispatch('dateClick', date)
  }
</script>

<header>
	<Arrow left on:click={toPrev} />
	<div class="month"> {months[month]} {year} </div>
	<Arrow on:click={toNext} />
</header>

<div class="grid">
	{#each labels as txt, idx (txt)}
		<span class="label">{ labels[(idx + offset) % 7] }</span>
	{/each}

	{#each { length:6 } as w,idxw (idxw)}
		{#if current[idxw]}
			{#each { length:7 } as d,idxd (idxd)}
				{#if current[idxw][idxd] != 0}
					<div
            on:click={() => handleDateClick({ year, month, dayOfMonth: current[idxw][idxd] })}
            class="date"
            class:today={isToday(current[idxw][idxd])}
            style={formatter({ year, month, dayOfMonth: current[idxw][idxd]} )}
          >
						<span class="text"> { current[idxw][idxd] } </span>
					</div>
				{:else if (idxw < 1)}
					<div class="date other">
            <span class="text"> { prev[prev.length - 1][idxd] } </span>
          </div>
				{:else}
					<div class="date other">
            <span class="text"> { next[0][idxd] } </span>
          </div>
				{/if}
			{/each}
		{/if}
	{/each}
</div>

<style>
	header {
		display: flex;
		margin-bottom: 1rem;
		align-items: center;
		justify-content: center;
		user-select: none;
	}
	
	.month {
		display: block;
		text-align: center;
		text-transform: uppercase;
	}
	
	.grid {
		display: grid;
    grid-template-rows: 5% auto;
		grid-template-columns: repeat(7, 1fr);
		text-align: right;
    height: 90%;
		grid-gap: 2px;
	}
	
	.label {
		font-weight: 400;
		text-align: center;
		text-transform: uppercase;
    font-size: 0.8rem;
		opacity: 0.6;
	}
	
	.date {
		border: 1px solid #bbbbbb;
    position: relative;
	}
	
	/* .date.today {
		color: #5286fa;
		background: #c4d9fd;
		border-color: currentColor;
	} */
	
	.date.other {
		opacity: 0.2;
	}
  
  .text {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.8rem;
  }
</style>