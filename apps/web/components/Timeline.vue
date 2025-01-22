<template>
  <div>
    <div class="flex justify-between items-center mb-2">
      <div>
        <h3 class="text-lg font-medium">{{ facility.name }}</h3>
        <div class="text-sm text-gray-600">{{ formattedDate }}</div>
      </div>
      <button 
        class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
        @click="condensed = !condensed"
      >
        {{ condensed ? 'Show All Courts' : 'Condense View' }}
      </button>
    </div>
    <svg :viewBox="`${minX} ${minY} ${maxX} ${maxY}`">
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
        v-for="(court, idx) in condensed ? ['All Courts'] : sortedCourts"
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
      >
        <title>{{ condensed ? getChunkCourts(chunk) : chunk.court }}</title>
      </rect>
      
      <!-- Hovered opening highlight -->
      <rect
        v-if="hoveredChunk"
        v-bind="getRectAttrsForChunk(hoveredChunk)"
        fill="#5286fa"
        pointer-events="none"
      />
    </svg>
  </div>
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

// State
const hoveredChunk = ref<OpeningChunk | null>(null)
const condensed = ref(false)

// Constants
const margin = 10
const width = 1500
const rowHeight = 50 // Fixed height per court row
const headerHeight = 40 // Height for the date and time labels
const fontSize = 18
const minX = -margin / 2
const minY = -margin / 2
const maxX = width + (margin / 2)
const maxY = computed(() => 
  condensed.value 
    ? headerHeight + rowHeight + margin 
    : headerHeight + (rowHeight * props.facility.courts.length) + margin
)

// Courts setup
const sortedCourts = computed(() => [...props.facility.courts].sort())

const xLineCount = computed(() => condensed.value ? 2 : sortedCourts.value.length + 1)
const xLineStart = headerHeight
const xLinePositions = Array.from(
  { length: xLineCount.value }, 
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

// Computed
const formattedDate = computed(() => {
  return props.date.toDateString()
})

const chunks = computed(() => {
  if (!props.openings.length) return []
  
  // Filter openings to only include selected courts
  const validOpenings = props.openings.filter(opening => 
    props.facility.courts.includes(opening.court)
  )
  
  if (!validOpenings.length) return []
  
  // Sort openings by time only in condensed view, by court and time otherwise
  const sortedOpenings = [...validOpenings].sort((a, b) => {
    if (!condensed.value) {
      const courtCompare = a.court.localeCompare(b.court)
      if (courtCompare !== 0) return courtCompare
    }
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
    
    if (condensed.value) {
      // In condensed view, merge chunks if they're adjacent or overlapping
      if (currentEndTime.getTime() >= openingTime.getTime()) {
        // Extend current chunk if this opening ends later
        const openingEndTime = new Date(openingTime.getTime() + 30 * 60 * 1000)
        if (openingEndTime > currentEndTime) {
          currentChunk.endTime = openingEndTime.toISOString()
        }
      } else {
        chunks.push(currentChunk)
        currentChunk = {
          court: opening.court,
          startTime: opening.datetime,
          endTime: new Date(openingTime.getTime() + 30 * 60 * 1000).toISOString()
        }
      }
    } else {
      // In normal view, only merge consecutive slots for the same court
      if (currentChunk.court === opening.court && currentEndTime.getTime() === openingTime.getTime()) {
        currentChunk.endTime = new Date(openingTime.getTime() + 30 * 60 * 1000).toISOString()
      } else {
        chunks.push(currentChunk)
        currentChunk = {
          court: opening.court,
          startTime: opening.datetime,
          endTime: new Date(openingTime.getTime() + 30 * 60 * 1000).toISOString()
        }
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
  const courtIndex = condensed.value ? 0 : sortedCourts.value.indexOf(chunk.court)
  
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
    'data-court': chunk.court,
  }
}

function getChunkCourts(chunk: OpeningChunk): string {
  const chunkStart = new Date(chunk.startTime)
  const chunkEnd = new Date(chunk.endTime)
  
  // Find all openings that overlap with this chunk
  const overlappingCourts = props.openings
    .filter(opening => {
      const openingTime = new Date(opening.datetime)
      return openingTime >= chunkStart && openingTime < chunkEnd
    })
    .map(opening => opening.court)
  
  // Get unique courts and sort them
  const uniqueCourts = [...new Set(overlappingCourts)].sort()
  
  return uniqueCourts.join(', ')
}
</script>

<style scoped>
svg {
  width: 100%;
  height: auto;
  max-height: 80vh;
}
</style> 