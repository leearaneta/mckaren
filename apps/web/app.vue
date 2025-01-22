<template>
  <div class="container mx-auto p-8">
    <h1 class="text-2xl font-bold mb-4">mckaren</h1>
    
    <div v-if="pending || facilitiesPending" class="text-gray-600">
      Loading openings...
    </div>
    
    <div v-else-if="error || facilitiesError" class="text-red-600">
      Error loading data: {{ error || facilitiesError }}
    </div>
    
    <div v-else>
      <!-- Global controls -->
      <div class="bg-white rounded-lg shadow p-4 mb-8">
        <div class="flex gap-8 max-w-3xl">
          <!-- Left column: Filters -->
          

          <!-- Right column: Calendar -->
          <div class="w-80">
            <Calendar 
              v-model="selectedDate"
              :valid-dates="validDates"
            />
          </div>
          <div class="flex-1">
            <!-- Selected date -->
            <div class="text-xl font-medium mb-4">
              {{ selectedDate.toDateString() }}
            </div>

            <!-- Facility filters -->
            <div class="flex flex-wrap gap-2 mb-6">
              <label 
                v-for="facility in facilities" 
                :key="facility.name"
                class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  v-model="selectedFacilities"
                  :value="facility.name"
                  class="rounded text-blue-600"
                >
                <span>{{ facility.name }}</span>
              </label>
            </div>

            <!-- Minimum duration filter -->
            <div class="mb-4">
              <label class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-700">Minimum Duration:</span>
                <select 
                  v-model="minimumDuration" 
                  class="rounded-lg border-gray-300 text-sm pl-2"
                >
                  <option :value="30">30 minutes</option>
                  <option :value="60">1 hour</option>
                  <option :value="90">1.5 hours</option>
                  <option :value="120">2 hours</option>
                  <option :value="150">2.5 hours</option>
                  <option :value="180">3 hours</option>
                </select>
              </label>
            </div>
            
            <!-- Time range filters -->
            <div class="mb-4">
              <div class="flex items-center space-x-4 mb-2">
                <label class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-700">Start Time:</span>
                  <select 
                    v-model="startHour" 
                    class="rounded-lg border-gray-300 text-sm pl-2"
                  >
                    <option 
                      v-for="option in timeOptions" 
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                
                <label class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-700">End Time:</span>
                  <select 
                    v-model="endHour" 
                    class="rounded-lg border-gray-300 text-sm pl-2"
                    :class="{ 'border-red-500': endHour <= startHour }"
                  >
                    <option 
                      v-for="option in timeOptions" 
                      :key="option.value"
                      :value="option.value"
                      :disabled="option.value <= startHour"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>
              
              <div v-if="endHour <= startHour" class="text-sm text-red-500">
                End time must be after start time
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Timelines -->
      <div class="space-y-8">
        <div 
          v-for="facility in filteredFacilities" 
          :key="facility.name" 
          class="bg-white rounded-lg shadow p-4"
        >
          <h2 class="text-xl font-semibold mb-4">{{ facility.name }}</h2>
          
          <Timeline 
            :openings="getOpeningsForFacility(facility.name)"
            :facility="facility"
            :date="selectedDate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HalfHourOpening } from '@mckaren/types'
import type { Facility } from '~/utils/types'
import Calendar from '~/components/Calendar.vue'

interface Opening {
  facility: string
  startDatetime: string
  endDatetime: string
  minuteLength: number
}

interface OpeningChunk {
  court: string
  startTime: string
  endTime: string
}

// State
const selectedDate = ref(new Date())
const selectedFacilities = ref<string[]>([])
const minimumDuration = ref(30)
const startHour = ref(6) // Default to 6 AM
const endHour = ref(24) // Default to 10 PM

// Fetch data
const { data: openings, pending, error } = await useFetch<HalfHourOpening[]>('/api/half-hour-openings')
const { data: facilities, pending: facilitiesPending, error: facilitiesError } = await useFetch<Facility[]>('/api/facilities')
const { data: longerOpenings } = await useFetch<Opening[]>('/api/openings')

// Initialize selected facilities when data is loaded
watch(facilities, (newFacilities) => {
  if (newFacilities && selectedFacilities.value.length === 0) {
    selectedFacilities.value = newFacilities.map(f => f.name)
  }
}, { immediate: true })

// Computed
const filteredFacilities = computed(() => {
  if (!facilities.value) return []
  return facilities.value.filter(f => selectedFacilities.value.includes(f.name))
})

const validHalfHourOpenings = computed(() => {
  if (!openings.value) return []
  
  return openings.value.filter(opening => {
    // Check if within selected time range
    if (!filteredFacilities.value.some(facility => facility.name === opening.facility)) return false
    const openingTime = new Date(opening.datetime)
    const hour = openingTime.getHours()
    const isInTimeRange = hour >= startHour.value && (
      endHour.value === 24 
        ? hour < 24
        : hour < endHour.value
    )
    if (!isInTimeRange) return false

    // If minimum duration is 30 minutes or no longer openings, all openings are valid
    if (minimumDuration.value <= 30 || !longerOpenings.value) return true

    // Check if this opening falls within a longer opening
    return longerOpenings.value.some(longerOpening => {
      if (longerOpening.facility !== opening.facility || 
          longerOpening.minuteLength < minimumDuration.value) {
        return false
      }
      
      const startTime = new Date(longerOpening.startDatetime)
      const endTime = new Date(longerOpening.endDatetime)
      
      return openingTime >= startTime && openingTime < endTime
    })
  })
})

const validHalfHourOpeningsByFacility = computed(() => {
  return validHalfHourOpenings.value.reduce((acc, opening) => {
    acc[opening.facility] = acc[opening.facility] || []
    acc[opening.facility].push(opening)
    return acc
  }, {} as Record<string, HalfHourOpening[]>)
})

const validDates = computed(() => {
  const dates = validHalfHourOpenings.value.map(opening => {
    const date = new Date(opening.datetime)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  })
  return [...new Set(dates)].map(timestamp => new Date(timestamp))
})

function getOpeningsForFacility(facilityName: string) {
  const facilityOpenings = validHalfHourOpeningsByFacility.value[facilityName] || []
  return facilityOpenings.filter(opening => 
    isSameDay(new Date(opening.datetime), selectedDate.value)
  )
}

// Time range options
const timeOptions = computed(() => {
  const options = []
  for (let hour = 5; hour <= 24; hour++) {
    const label = hour === 24 
      ? 'Midnight' 
      : `${hour <= 12 ? hour : hour - 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
    
    options.push({
      value: hour,
      label
    })
  }
  return options
})

// Helper functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

</script>

<style>
body {
  @apply bg-gray-50;
}
</style>
