<template>
  <div class="space-y-8">
    <!-- Timeline -->
    <Timeline 
      :facility="{
        ...facility,
        courts: facility.courts.filter(court => !omittedCourts?.includes(court))
      }"
      :openings="halfHourOpenings"
      :date="date"
    />

    <!-- Openings list -->
    <div v-if="openings?.length">
      <h3 class="text-lg font-medium mb-4">Available Openings</h3>
      
      <!-- Table header -->
      <div class="flex">
        <div class="w-32 font-medium"></div>
        <div 
          v-for="duration in durations" 
          :key="duration"
          class="flex-1 px-4 font-medium"
        >
          {{ formatDuration(duration) }}
        </div>
      </div>
      
      <hr class="my-2" />

      <!-- Table rows -->
      <div class="mt-2 space-y-1">
        <div 
          v-for="(timeOpenings, time) in openingsByStartTime" 
          :key="time"
          class="flex items-stretch min-h-[2.5rem]"
        >
          <div class="w-32 py-2">{{ formatTime(new Date(Number(time))) }}</div>
          <div 
            v-for="duration in durations"
            :key="duration"
            class="flex-1 px-4 py-2"
          >
            <div 
              v-if="timeOpenings[duration]?.length"
              class="rounded bg-blue-50 hover:bg-blue-100 transition-colors p-2 text-sm text-gray-600"
            >
              {{ timeOpenings[duration]?.[0].courts ? 
                timeOpenings[duration]?.[0].courts.join(', ') : 
                timeOpenings[duration]?.[0].path?.join(' → ') 
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-gray-500 italic">
      No openings available for the selected date.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Facility, HalfHourOpening, Opening } from '~/utils/types'
import Timeline from './Timeline.vue'
import { computed } from 'vue'

const props = defineProps<{
  facility: Facility
  omittedCourts?: string[]
  halfHourOpenings: HalfHourOpening[]
  openings: Opening[]
  date: Date
}>()

// Get unique durations sorted ascending
const durations = computed(() => {
  const uniqueDurations = new Set(props.openings.map(o => o.durationMinutes))
  return Array.from(uniqueDurations).sort((a, b) => a - b)
})

// Group openings by start time and duration
const openingsByStartTime = computed(() => {
  const grouped: Record<number, Record<number, Opening[]>> = {}
  
  for (const opening of props.openings) {
    const timeKey = opening.startDatetime.getTime()
    if (!grouped[timeKey]) {
      grouped[timeKey] = {}
    }
    if (!grouped[timeKey][opening.durationMinutes]) {
      grouped[timeKey][opening.durationMinutes] = []
    }
    grouped[timeKey][opening.durationMinutes].push(opening)
  }

  // Sort by start time
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b))
  )
})

// Format time helper
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })
}

// Format duration helper
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`
}
</script> 