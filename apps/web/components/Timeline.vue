<template>
  <svg :viewBox="`${minX} ${minY} ${maxX} ${maxY}`">
    <text :x="0" :y="headerHeight - 5" :font-size="fontSize * 1.2">
      {{ formattedDate }}
    </text>
    
    <!-- Horizontal lines for courts -->
    <line
      v-for="pos in xLinePositions"
      :key="pos"
      stroke="rgba(0, 0, 0, .5)"
      :x1="0"
      :x2="width"
      :y1="pos"
      :y2="pos"
    />
    
    <!-- Court labels -->
    <text
      v-for="(court, idx) in facility.courts"
      :key="court"
      :x="0"
      :y="xTextPositions[idx]"
      :font-size="fontSize"
    >
      {{ court }}
    </text>
    
    <!-- Vertical time lines -->
    <line
      v-for="pos in yLinePositions"
      :key="pos"
      stroke="rgba(0, 0, 0, .25)"
      :x1="pos"
      :x2="pos"
      :y1="headerHeight"
      :y2="maxY - margin"
    />
    
    <!-- Time labels -->
    <text
      v-for="(time, idx) in allCourtTimes"
      :key="time"
      :x="yLinePositions[idx]"
      :y="headerHeight - 5"
      text-anchor="middle"
      :font-size="fontSize"
      opacity="0.75"
    >
      {{ time }}
    </text>
    
    <!-- Opening rectangles -->
    <rect
      v-for="chunk in chunks"
      :key="`${chunk.court}-${chunk.startTime}-${chunk.endTime}`"
      v-bind="getRectAttrsForChunk(chunk)"
      @mouseover="hoveredChunk = chunk"
      @mouseout="hoveredChunk = null"
    />
    
    <!-- Hovered opening highlight -->
    <rect
      v-if="hoveredChunk"
      v-bind="getRectAttrsForChunk(hoveredChunk)"
      fill="#5286fa"
      pointer-events="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Facility } from '~/utils/types'

interface OpeningChunk {
  court: string
  startTime: string
  endTime: string
}

const props = defineProps<{
  openings: HalfHourOpening[]
  facility: Facility
  date: Date
}>()

// Constants
const margin = 10
const width = 1500
const rowHeight = 50 // Fixed height per court row
const headerHeight = 40 // Height for the date and time labels
const fontSize = 18
const minX = -margin / 2
const minY = -margin / 2
const maxX = width + (margin / 2)
const maxY = headerHeight + (rowHeight * props.facility.courts.length) + margin

// Courts setup
const xLineCount = props.facility.courts.length + 1
const xLineStart = headerHeight
const xLinePositions = Array.from(
  { length: xLineCount }, 
  (_, idx) => idx * rowHeight + xLineStart
)
const xTextPositions = xLinePositions
  .slice(0, xLinePositions.length - 1)
  .map(pos => pos + (rowHeight / 2))

// Time setup
const dayStartHour = 6
const allCourtTimes = [
  ...Array.from({ length: 12 - dayStartHour }, (_, i) => `${i + dayStartHour}AM`),
  '12PM',
  ...Array.from({ length: 11 }, (_, i) => `${i + 1}PM`),
]
const yLineStart = width / 6
const yLineCount = allCourtTimes.length
const yLineSpacing = (width - yLineStart) / yLineCount
const yLinePositions = Array.from({ length: yLineCount }, (_, idx) => idx * yLineSpacing + yLineStart)

// State
const hoveredChunk = ref<OpeningChunk | null>(null)

// Computed
const formattedDate = computed(() => {
  return props.date.toDateString()
})

const chunks = computed(() => {
  if (!props.openings.length) return []
  
  // Sort openings by court and time
  const sortedOpenings = [...props.openings].sort((a, b) => {
    const courtCompare = a.court.localeCompare(b.court)
    if (courtCompare !== 0) return courtCompare
    return new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  })
  
  const chunks: OpeningChunk[] = []
  let currentChunk: OpeningChunk | null = null
  
  for (const opening of sortedOpenings) {
    if (!currentChunk) {
      currentChunk = {
        court: opening.court,
        startTime: opening.datetime,
        endTime: new Date(new Date(opening.datetime).getTime() + 30 * 60 * 1000).toISOString()
      }
      continue
    }
    
    const currentEndTime = new Date(currentChunk.endTime)
    const openingTime = new Date(opening.datetime)
    
    if (currentChunk.court === opening.court && currentEndTime.getTime() === openingTime.getTime()) {
      // Extend current chunk
      currentChunk.endTime = new Date(openingTime.getTime() + 30 * 60 * 1000).toISOString()
    } else {
      // Start new chunk
      chunks.push(currentChunk)
      currentChunk = {
        court: opening.court,
        startTime: opening.datetime,
        endTime: new Date(new Date(opening.datetime).getTime() + 30 * 60 * 1000).toISOString()
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
})

function getRectAttrsForChunk(chunk: OpeningChunk) {
  const startDate = new Date(chunk.startTime)
  const endDate = new Date(chunk.endTime)
  const startHour = startDate.getHours()
  const startMinutes = startDate.getMinutes()
  const courtIndex = props.facility.courts.indexOf(chunk.court)
  
  // Calculate position based on both hours and minutes
  const hourOffset = startHour - dayStartHour // Hours since 6AM
  const minuteOffset = startMinutes / 60 // Convert minutes to fraction of an hour
  const timeOffset = hourOffset + minuteOffset
  
  // Calculate width based on duration
  const durationInHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  
  const x = timeOffset * yLineSpacing + yLineStart
  const rectWidth = yLineSpacing * durationInHours
  const y = xLinePositions[courtIndex]
  const height = rowHeight
  
  return {
    x,
    width: rectWidth,
    y,
    height,
    rx: 5,
    ry: 5,
    fill: '#c4d9fd',
    stroke: '#5286fa',
    cursor: 'pointer',
  }
}
</script>

<style scoped>
svg {
  width: 100%;
  height: auto;
  max-height: 80vh;
}
</style> 