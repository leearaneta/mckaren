<template>
  <div class="container mx-auto p-6">
    <!-- Controls section -->
    <section class="bg-white rounded-lg shadow py-6 px-4 mb-8">
      <div class="flex justify-between">
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
        </div>        <!-- Subscribe button -->
        <div class="flex flex-col justify-end">
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            @click="showSubscriptionModal = true"
          >
            Subscribe to new openings
          </button>
        </div>
      </div>
    </section>

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
      :preferences="currentPreferences"
      :z-index="30"
      @close="showSubscriptionModal = false"
      @showCourtFilter="showCourtFilter = true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility, HalfHourOpening, Opening } from '~/utils/types'
import type { Preferences, DurationMinutes } from '@mckaren/types'
import { getOpenings, filterHalfHourOpeningsByPreferences } from '@mckaren/openings'
import Calendar from '~/components/Calendar.vue'
import Timeline from '~/components/Timeline.vue'
import Controls from '~/components/Controls.vue'
import CourtFilterModal from '~/components/CourtFilterModal.vue'
import SubscriptionModal from '~/components/SubscriptionModal.vue'

const filters = useFiltersStore()
const facilities = ref<Facility[]>([])
const halfHourOpenings = ref<HalfHourOpening[]>([])
const showCourtFilter = ref(false)
const showSubscriptionModal = ref(false)
const selectedDate = ref(new Date())

// Fetch facilities and openings on mount
onMounted(async () => {
  const [facilitiesResponse, openingsResponse] = await Promise.all([
    fetch('/api/facilities'),
    fetch('/api/half-hour-openings')
  ])
  facilities.value = await facilitiesResponse.json()
  const openingsData = await openingsResponse.json()
  
  halfHourOpenings.value = openingsData.map((o: { facility: string; court: string; datetime: string }) => ({
    ...o,
    datetime: new Date(o.datetime)
  }))
  
  filters.initializeSelectedFacilities(facilities.value)
  filters.initializeSelectedCourts(facilities.value)
})

// Convert filters to Preferences type
const currentPreferences = computed<Preferences>(() => ({
  minStartTime: { hour: filters.startHour, minute: 0 },
  maxEndTime: { hour: filters.endHour, minute: 0 },
  minDuration: filters.minimumDuration as DurationMinutes,
  daysOfWeek: filters.selectedDays as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
  omittedCourts: []
}))

// Filter half-hour openings by facility and current filters
const validHalfHourOpenings = computed(() => {
  // Filter to only selected facilities and courts
  const relevantHalfHourOpenings = halfHourOpenings.value.filter(opening => 
    filters.selectedFacilities.includes(opening.facility) &&
    filters.selectedCourts[opening.facility]?.includes(opening.court)
  )

  // Filter by preferences (days, time range)
  return filterHalfHourOpeningsByPreferences(relevantHalfHourOpenings, currentPreferences.value)
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
  
  // First, group half-hour openings by facility
  const halfHourOpeningsByFacility: Record<string, HalfHourOpening[]> = {}
  validHalfHourOpenings.value
    .filter(opening => isSameDay(opening.datetime, selectedDate.value))
    .forEach(opening => {
      if (!halfHourOpeningsByFacility[opening.facility]) {
        halfHourOpeningsByFacility[opening.facility] = []
      }
      halfHourOpeningsByFacility[opening.facility].push(opening)
    })
  
  // For each facility, get valid openings based on minimum duration
  // and only keep half-hour openings that are part of these openings
  for (const [facility, facilityOpenings] of Object.entries(halfHourOpeningsByFacility)) {
    // Get longer openings based on minimum duration
    const openings = getOpenings(facilityOpenings, currentPreferences.value.minDuration)
    
    // Create a set of valid datetime strings for fast lookup
    const validDatetimes = new Set(
      openings.flatMap(opening => {
        const validTimes: string[] = []
        let current = new Date(opening.startDatetime)
        while (current < opening.endDatetime) {
          validTimes.push(current.toISOString())
          current = new Date(current.getTime() + 30 * 60 * 1000)
        }
        return validTimes
      })
    )
    
    // Only keep half-hour openings that are part of valid longer openings
    byFacility[facility] = facilityOpenings.filter(opening => 
      validDatetimes.has(opening.datetime.toISOString())
    )
  }
  
  return byFacility
})

// Get valid dates from filtered openings
const validDates = computed(() => {
  const dates = validHalfHourOpenings.value.map(opening => {
    const date = opening.datetime;
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
