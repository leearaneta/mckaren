<template>
  <div class="container mx-auto p-6">
    <!-- Controls section -->
    <section class="bg-white rounded-lg shadow py-6 px-4 mb-8">
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

          <Controls 
            :facilities="facilities" 
            @showCourtFilter="showCourtFilter = true" 
          />
        </div>
      </div>
    </section>

    <!-- Subscribe button -->
    <div class="flex justify-end mb-8">
      <button 
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        @click="showSubscriptionModal = true"
      >
        Subscribe to new openings
      </button>
    </div>

    <!-- Timelines -->
    <div class="space-y-8">
      <section 
        v-for="facility in facilities" 
        :key="facility.name"
        v-show="filters.selectedFacilities.includes(facility.name)"
        class="bg-white rounded-lg shadow p-4"
      >
        <Timeline 
          :facility="{
            ...facility,
            courts: filters.selectedCourts[facility.name]?.sort() || []
          }"
          :openings="validHalfHourOpeningsByFacility[facility.name] || []"
          :date="selectedDate"
        />
      </section>
    </div>

    <!-- Modals -->
    <CourtFilterModal
      :show="showCourtFilter"
      :facilities="facilities"
      :z-index="40"
      @close="showCourtFilter = false"
    />

    <SubscriptionModal
      :show="showSubscriptionModal"
      :facilities="facilities"
      :z-index="30"
      @close="showSubscriptionModal = false"
      @showCourtFilter="showCourtFilter = true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility, HalfHourOpening } from '~/utils/types'
import Calendar from '~/components/Calendar.vue'
import Timeline from '~/components/Timeline.vue'
import Controls from '~/components/Controls.vue'
import CourtFilterModal from '~/components/CourtFilterModal.vue'
import SubscriptionModal from '~/components/SubscriptionModal.vue'

interface Opening {
  facility: string
  startDatetime: string
  endDatetime: string
  minuteLength: number
}

const filters = useFiltersStore()
const facilities = ref<Facility[]>([])
const openings = ref<HalfHourOpening[]>([])
const longerOpenings = ref<Opening[]>([])
const showCourtFilter = ref(false)
const showSubscriptionModal = ref(false)
const selectedDate = ref(new Date())

// Fetch facilities and openings on mount
onMounted(async () => {
  const [facilitiesResponse, openingsResponse, longerOpeningsResponse] = await Promise.all([
    fetch('/api/facilities'),
    fetch('/api/half-hour-openings'),
    fetch('/api/openings')
  ])
  facilities.value = await facilitiesResponse.json()
  openings.value = await openingsResponse.json()
  longerOpenings.value = await longerOpeningsResponse.json()
  filters.initializeSelectedFacilities(facilities.value)
  filters.initializeSelectedCourts(facilities.value)
})

// Filter openings by facility and current filters
const validHalfHourOpenings = computed(() => {
  return openings.value.filter(opening => {
    // Check if within selected days
    const openingDate = new Date(opening.datetime)
    if (!filters.selectedDays.includes(openingDate.getDay())) return false
    
    // Check if within selected facilities and courts
    if (!filters.selectedFacilities.includes(opening.facility)) return false
    if (!filters.selectedCourts[opening.facility]?.includes(opening.court)) return false
    
    // Check if within selected time range
    const hour = openingDate.getHours()
    const isInTimeRange = hour >= filters.startHour && (
      filters.endHour === 24 
        ? hour < 24
        : hour < filters.endHour
    )
    if (!isInTimeRange) return false

    // If minimum duration is 30 minutes or no longer openings, all openings are valid
    if (filters.minimumDuration <= 30 || !longerOpenings.value) return true

    // Check if this opening falls within a longer opening
    return longerOpenings.value.some(longerOpening => {
      if (longerOpening.facility !== opening.facility || 
          longerOpening.minuteLength < filters.minimumDuration) {
        return false
      }
      
      const startTime = new Date(longerOpening.startDatetime)
      const endTime = new Date(longerOpening.endDatetime)
      
      return openingDate >= startTime && openingDate < endTime
    })
  })
})

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// Group valid openings by facility and filter by selected date
const validHalfHourOpeningsByFacility = computed(() => {
  const byFacility: Record<string, HalfHourOpening[]> = {}
  
  validHalfHourOpenings.value
    .filter(opening => isSameDay(new Date(opening.datetime), selectedDate.value))
    .forEach(opening => {
      if (!byFacility[opening.facility]) {
        byFacility[opening.facility] = []
      }
      byFacility[opening.facility].push(opening)
    })
  
  return byFacility
})

// Get valid dates from filtered openings
const validDates = computed(() => {
  const dates = validHalfHourOpenings.value.map(opening => {
    const date = new Date(opening.datetime)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  })
  return [...new Set(dates)].map(timestamp => new Date(timestamp))
})
</script>

<style>
body {
  @apply bg-gray-50;
}
</style>
