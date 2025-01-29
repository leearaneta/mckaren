<template>
  <div class="md:space-y-8">
    <!-- Timeline - hidden on mobile -->
    <Timeline 
      v-show="!isMobile"
      :facility="{
        ...facility,
        courts: facility.courts.filter(court => !omittedCourts?.includes(court))
      }"
      :openings="halfHourOpenings"
      :date="date"
    />

    <!-- Openings list -->
    <div v-if="openings?.length">
      <!-- Table header -->
      <div class="sticky top-[120px] bg-white z-10 border-b">
        <div class="flex py-1">
          <div class="w-20 md:w-32 font-medium flex items-center"></div>
          <div 
            v-for="duration in durations" 
            :key="duration"
            class="flex-1 px-1 md:px-4 font-medium text-sm md:text-base text-center md:text-left"
          >
            {{ isMobile ? `${duration}m` : formatDuration(duration) }}
          </div>
        </div>
      </div>
      
      <!-- Table rows -->
      <div class="space-y-1 pt-2">
        <div 
          v-for="(timeOpenings, time) in openingsByStartTime" 
          :key="time"
          class="flex items-stretch min-h-[2.5rem]"
        >
          <div class="w-20 md:w-32 py-2 flex items-center text-sm md:text-base">{{ formatTime(new Date(Number(time))) }}</div>
          <div 
            v-for="duration in durations"
            :key="duration"
            class="flex-1 px-1 md:px-4 py-2"
          >
            <div 
              v-if="timeOpenings[duration]?.length"
              :class="{
                'rounded bg-blue-50 hover:bg-blue-100 transition-colors text-sm text-gray-600': true,
                'p-2': !isMobile,
                'px-0.5 py-1 flex justify-center': isMobile
              }"
            >
              <template v-if="isMobile">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </template>
              <template v-else>
                {{ timeOpenings[duration]?.[0].courts ? 
                  timeOpenings[duration]?.[0].courts.join(', ') : 
                  deduplicatePath(timeOpenings[duration]?.[0].path || []).join(' → ') 
                }}
              </template>
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
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  facility: Facility
  omittedCourts?: string[]
  halfHourOpenings: HalfHourOpening[]
  openings: Opening[]
  date: Date
}>()

const isMobile = ref(false)

// Check if mobile on mount and when window resizes
function checkMobile() {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

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

// Helper to deduplicate consecutive path entries
function deduplicatePath(path: string[]): string[] {
  return path.filter((item, index) => item !== path[index - 1]);
}

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