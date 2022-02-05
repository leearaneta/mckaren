<script>
  import _ from 'lodash';
  import qs from 'qs';


  export let openings;
  const margin = 10;
  const width = 1600;
  const height = 250;
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

  let hoveredOpening;
  function getRectAttrsForOpening({ startHour, hourLength, court }) {
    const isHoveredOpening = hoveredOpening
      && startHour === hoveredOpening.startHour 
      && court === hoveredOpening.court;

    const idx = startHour - 5;
    const x = idx * yLineSpacing + yLineStart;
    const width = yLineSpacing * hourLength;
    const y = xLinePositions[court - 2];
    const height = xLineSpacing;
    return {
      x, width, y, height, rx: 5, ry: 5,
      fill: '#c4d9fd', stroke: 'rgba(0, 0, 0, .75)',
      color: '#5286fa', 'border-color': 'currentColor', cursor: 'pointer',
    };
  }

  function appendURLsToOpening(opening) {
    const { datetime, startHour, hourLength, court } = opening;
    const isWeekend = [0, 6].includes(datetime.getDay());
    const sessionIdMapping = isWeekend
      ? {
        8: { 1: 35, 2: 36, 3: 37 },
        19: { 1: 25, 2: 26, 3: 27 },
        24: { 1: 29, 2: 30, 3: 32 }
      }
      : {
        14: { 1: 14, 2: 15, 3: 16 },
        18: { 1: 5, 2: 7, 3: 8 },
        22: { 1: 18, 2: 19, 3: 20 },
        24: { 1: 1128, 2: 1130 },
      };
    const sessions = _(sessionIdMapping).keys().map(k => Number(k)).sortBy().value();

    function getHoursSpentPerSession(hour, length, hoursSpentPerSession = {}) {
      const _hoursSpentPerSession = { ...hoursSpentPerSession }
      const session = sessions.find(session => hour < session);
      _hoursSpentPerSession[session] ||= 0;
      _hoursSpentPerSession[session]++;
      return length === 1
        ? _hoursSpentPerSession
        : getHoursSpentPerSession(hour + 1, length - 1, _hoursSpentPerSession)
    }

    const hoursSpentPerSession = getHoursSpentPerSession(startHour, hourLength);

    function getURLFromSessionLength([session, hours], idx, arr) {
      const sessionId = sessionIdMapping[session][hours];
      let bookingDatetime = datetime;
      if (idx > 0) {
        bookingDatetime = new Date(datetime.getTime());
        const hourOffset = arr[0][1];
        bookingDatetime.setTime(bookingDatetime.getTime() + hourOffset*60*60*1000);
      }
      const offset = bookingDatetime.getTimezoneOffset()
      const dateWithOffset = new Date(bookingDatetime.getTime() - (offset*60*1000))
      const isoLikeDate = dateWithOffset.toISOString().split('.')[0];
      const formattedDateString = `${bookingDatetime.toDateString()} ${bookingDatetime.toLocaleTimeString()}`;
      const baseURL = 'https://cart.mindbodyonline.com/sites/19060/cart/add_booking?';
      const querystring = `item[info]=${formattedDateString}&item[mbo_location_id]=1&item[name]=${hours} Hour Rental with Tennis Court #${court}&item[session_type_id]=${sessionId}&item[staff_id]=${court+3}&item[start_date_time]=${isoLikeDate}+00:00&item[type]=Appointment&source=appointment_v0`;
      return `${baseURL}${qs.stringify(qs.parse(querystring))}`
    }
  
    const urls = _(hoursSpentPerSession)
      .toPairs()
      .orderBy(([session]) => session, 'asc')
      .map(getURLFromSessionLength)
      .value();

    return { ...opening, urls };
  }

  $: sortedOpenings = _.orderBy(openings, 'startHour', 'asc').map(appendURLsToOpening);

  function handleOpeningClick(opening) {
    opening.urls.forEach(url => {
      console.log(url)
      window.open(url)
    });
  }

  export let selectedDate;
  function formatDate({ year, month, dayOfMonth }) {
    const dateString = `${month+1}/${dayOfMonth}/${year}`;
    return new Date(Date.parse(dateString)).toDateString();
  }
  $: formattedSelectedDate = selectedDate ? formatDate(selectedDate) : '';

</script>

<main>
  <svg viewBox={`${minX} ${minY} ${maxX} ${maxY}`}>
    <text x="0" y={timeLabelHeight - 5} font-size="20"> { formattedSelectedDate } </text>
    {#each xLinePositions as pos}
      <line stroke="rgba(0, 0, 0, .5)" x1="0" x2={width} y1={pos} y2={pos}/>
    {/each}
    {#each courts as court, idx}
      <text x="0" y={xTextPositions[idx]}> Court {court} </text>
    {/each}
    {#each yLinePositions as pos}
      <line stroke="rgba(0, 0, 0, .25)" x1={pos} x2={pos} y1={timeLabelHeight} y2={height}/>
    {/each}
    {#each yLinePositions as pos, idx}
      <text x={pos} y={timeLabelHeight - 2} text-anchor="middle" opacity="0.75"> { allCourtTimes[idx] } </text>
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
  </svg>
</main>
