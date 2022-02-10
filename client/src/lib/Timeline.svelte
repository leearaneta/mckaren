<script>
  import _ from 'lodash';


  export let openings;
  const margin = 10;
  const width = 1500;
  const height = 320;
  const fontSize = width / 80;
  const minX = -margin / 2;
  const minY = -margin / 2;
  const maxX = width + (margin / 2);
  const maxY = height + (margin / 2);
  const timeLabelHeight = height / 12;

  const courts = _.range(2, 8)
  const xLineCount = courts.length + 1
  const xLineSpacing = (height - timeLabelHeight) / courts.length;
  const xLineStart = timeLabelHeight;
  const xLinePositions = _.range(xLineCount).map(idx => idx * xLineSpacing + xLineStart);
  const xTextPositions = xLinePositions
    .slice(0, xLinePositions.length - 1)
    .map(pos => pos + (xLineSpacing / 2))

  const allCourtTimes = [
    ..._.range(5, 12).map(hr => `${hr}AM`),
    '12PM',
    ..._.range(1, 12).map(hr => `${hr}PM`),
  ];
  const yLineStart = width / 6;
  const yLineCount = allCourtTimes.length;
  const yLineSpacing = (width - yLineStart) / yLineCount;
  const yLinePositions = _.range(yLineCount).map(idx => idx * yLineSpacing + yLineStart);

  function getRectAttrsForOpening({ startHour, hourLength, court }) {
    const idx = startHour - 5;
    const x = idx * yLineSpacing + yLineStart;
    const width = yLineSpacing * hourLength;
    const y = xLinePositions[court - 2];
    const height = xLineSpacing;
    return {
      x, width, y, height, rx: 5, ry: 5,
      fill: '#c4d9fd', stroke: '#5286fa',
      cursor: 'pointer',
    };
  }

  $: sortedOpenings = _.orderBy(openings, 'startHour', 'asc');

  function handleOpeningClick(opening) {
    opening.urls.forEach(url => window.open(url));
  }

  export let selectedDate;
  function formatDate({ year, month, dayOfMonth }) {
    const dateString = `${month+1}/${dayOfMonth}/${year}`;
    return new Date(Date.parse(dateString)).toDateString();
  }
  $: formattedSelectedDate = selectedDate ? formatDate(selectedDate) : '';

  let hoveredOpening;

</script>

<main>
  <svg viewBox={`${minX} ${minY} ${maxX} ${maxY}`}>
    <text x="0" y={timeLabelHeight - 5} font-size={fontSize * 1.2}> { formattedSelectedDate } </text>
    {#each xLinePositions as pos}
      <line stroke="rgba(0, 0, 0, .5)" x1="0" x2={width} y1={pos} y2={pos}/>
    {/each}
    {#each courts as court, idx}
      <text x="0" y={xTextPositions[idx]} font-size={fontSize}> Court {court} </text>
    {/each}
    {#each yLinePositions as pos}
      <line stroke="rgba(0, 0, 0, .25)" x1={pos} x2={pos} y1={timeLabelHeight} y2={height}/>
    {/each}
    {#each yLinePositions as pos, idx}
      <text
        x={pos} y={timeLabelHeight - 5}
        text-anchor="middle" font-size={fontSize}
        opacity="0.75"
      > { allCourtTimes[idx] } </text>
    {/each}
    {#each sortedOpenings as opening}
      <rect
        {...getRectAttrsForOpening(opening)}
        on:click={() => handleOpeningClick(opening)}
        on:mouseover={() => hoveredOpening = opening}
        on:mouseout={() => hoveredOpening = null}
        on:focus={() => 'hi'} on:blur={() => 'hi'}
      />
    {/each}
    {#if hoveredOpening}
      <rect {...getRectAttrsForOpening(hoveredOpening)} fill="#5286fa" pointer-events="none"/>
    {/if}
  </svg>
</main>
