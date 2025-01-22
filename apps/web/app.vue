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
      <div class="bg-white rounded-lg shadow py-6 px-4 mb-8">
        <div class="flex gap-8 max-w-3xl">
          <!-- Left column: Calendar -->
          <div class="w-80">
            <Calendar 
              v-model="selectedDate"
              :valid-dates="validDates"
            />
          </div>

          <!-- Right column: Filters -->
          <div class="flex-1">
            <!-- Selected date -->
            <div class="text-xl font-medium mb-4">
              {{ selectedDate.toDateString() }}
            </div>

            <div class="mb-4">
              <div v-if="endHour <= startHour" class="text-sm text-red-500">
                End time must be after start time
              </div>
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

            <!-- Days of week filter -->
            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Days of Week:</h3>
              <div class="flex gap-3">
                <label 
                  v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" 
                  :key="day + index"
                  class="flex items-center gap-1"
                >
                  <input
                    type="checkbox"
                    v-model="selectedDays"
                    :value="index"
                    class="rounded text-blue-600 w-3 h-3"
                  >
                  <span class="text-xs">{{ day }}</span>
                </label>
              </div>
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
            </div>

            <!-- Filter courts button -->
            <div>
              <button 
                class="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                @click="showCourtFilter = true"
              >
                Filter Courts
              </button>
            </div>

          </div>
        </div>
      </div>
      
      <!-- Court filter modal -->
      <div 
        v-if="showCourtFilter"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        @click.self="showCourtFilter = false"
      >
        <div class="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-medium">Filter Courts</h2>
            <button 
              class="text-gray-500 hover:text-gray-700"
              @click="showCourtFilter = false"
            >
              ✕
            </button>
          </div>
          
          <!-- Facility selector -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Facility:
            </label>
            <select 
              v-model="selectedFacilityInModal"
              class="w-full rounded-lg border-gray-300 pl-2 h-10"
            >
              <option 
                v-for="facility in filteredFacilities" 
                :key="facility.name"
                :value="facility.name"
              >
                {{ facility.name }}
              </option>
            </select>
          </div>
          
          <!-- Court checkboxes -->
          <div v-if="selectedFacilityInModal" class="space-y-4">
            <div class="flex flex-wrap gap-2">
              <label 
                v-for="court in facilities?.find(f => f.name === selectedFacilityInModal)?.courts.sort()" 
                :key="court"
                class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  v-model="selectedCourts[selectedFacilityInModal]"
                  :value="court"
                  class="rounded text-blue-600"
                >
                <span>{{ court }}</span>
              </label>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end">
            <button 
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              @click="showCourtFilter = false"
            >
              Done
            </button>
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
          <Timeline 
            :openings="getOpeningsForFacility(facility.name)"
            :facility="{
              ...facility,
              courts: selectedCourts[facility.name] || []
            }"
            :date="selectedDate"
            :condensed="condensedViews[facility.name]"
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

// State
const selectedDate = ref(new Date())
const selectedFacilities = ref<string[]>([])
const selectedDays = ref<number[]>([0, 1, 2, 3, 4, 5, 6])
const minimumDuration = ref(30)
const startHour = ref(6)
const endHour = ref(24)
const condensedViews = ref<Record<string, boolean>>({})
const showCourtFilter = ref(false)
const selectedCourts = ref<Record<string, string[]>>({})
const selectedFacilityInModal = ref<string>('')

// Fetch data
const { data: openings, pending, error } = await useFetch<HalfHourOpening[]>('/api/half-hour-openings')
const { data: facilities, pending: facilitiesPending, error: facilitiesError } = await useFetch<Facility[]>('/api/facilities')
const { data: longerOpenings } = await useFetch<Opening[]>('/api/openings')

// Initialize selected courts when facilities load
watch(facilities, (newFacilities) => {
  if (newFacilities) {
    if (selectedFacilities.value.length === 0) {
      selectedFacilities.value = newFacilities.map(f => f.name)
    }
    // Initialize selected courts for each facility
    newFacilities.forEach(facility => {
      if (!selectedCourts.value[facility.name]) {
        selectedCourts.value[facility.name] = [...facility.courts]
      }
    })
  }
}, { immediate: true })

// Watch for modal opening to set initial facility
watch(showCourtFilter, (isOpen) => {
  if (isOpen && filteredFacilities.value.length > 0) {
    selectedFacilityInModal.value = filteredFacilities.value[0].name
  }
})

// Computed
const filteredFacilities = computed(() => {
  if (!facilities.value) return []
  return facilities.value.filter(f => selectedFacilities.value.includes(f.name))
})

const validHalfHourOpenings = computed(() => {
  if (!openings.value) return []
  
  return openings.value.filter(opening => {
    // Check if within selected days
    const openingDate = new Date(opening.datetime)
    if (!selectedDays.value.includes(openingDate.getDay())) return false
    
    // Check if within selected facilities and courts
    const facility = filteredFacilities.value.find(f => f.name === opening.facility)
    if (!facility) return false
    if (!selectedCourts.value[facility.name]?.includes(opening.court)) return false
    
    // Check if within selected time range
    const hour = openingDate.getHours()
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
      
      return openingDate >= startTime && openingDate < endTime
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
