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
        </div>
        <!-- Subscribe button -->
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
        v-show="filters.allSelectedFacilities.includes(facility.name)"
        class="bg-white rounded-lg shadow p-4"
      >
        <Timeline 
          :facility="{
            ...facility,
            courts: facility.courts.filter(court => !filters.omittedCourts[facility.name]?.includes(court))
          }"
          :openings="displayHalfHourOpeningsByFacility[facility.name] || []"
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
  filters.initializeOmittedCourts(facilities.value)
})

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// Filter half-hour openings by facility and current filters
const validHalfHourOpeningsByFacility = computed(() => {
  const byFacility: Record<string, HalfHourOpening[]> = {}
  
  // First, group half-hour openings by facility
  const halfHourOpeningsByFacility: Record<string, HalfHourOpening[]> = {}
  halfHourOpenings.value
    .filter(opening => isSameDay(opening.datetime, selectedDate.value))
    .forEach(opening => {
      if (!halfHourOpeningsByFacility[opening.facility]) {
        halfHourOpeningsByFacility[opening.facility] = []
      }
      halfHourOpeningsByFacility[opening.facility].push(opening)
    })

  // For each facility, get valid openings based on filters
  for (const [facility, facilityOpenings] of Object.entries(halfHourOpeningsByFacility)) {
    // Get openings for each filter
    const validOpeningsByFilter = filters.filters.map(filter => {
      const preferences = {
        minStartTime: filter.minStartTime,
        maxEndTime: filter.maxEndTime,
        minDuration: filter.minDuration,
        daysOfWeek: filter.daysOfWeek,
        omittedCourts: filters.omittedCourts[facility] || []
      }

      // Filter openings by preferences
      const filterOpenings = facilityOpenings.filter(opening => 
        !preferences.omittedCourts.includes(opening.court)
      )
      
      return filterHalfHourOpeningsByPreferences(filterOpenings, preferences)
    })

    // Combine all valid openings and remove duplicates
    const allValidOpenings = new Set(
      validOpeningsByFilter.flat().map(o => 
        JSON.stringify({ court: o.court, datetime: o.datetime.toISOString() })
      )
    )

    byFacility[facility] = Array.from(allValidOpenings).map(str => {
      const o = JSON.parse(str)
      return {
        facility,
        court: o.court,
        datetime: new Date(o.datetime)
      }
    })
  }

  return byFacility
})

// Compute valid openings for each facility based on valid half-hour openings
const validOpeningsByFacility = computed(() => {
  const byFacility: Record<string, Opening[]> = {}
  
  for (const [facility, facilityOpenings] of Object.entries(validHalfHourOpeningsByFacility.value)) {
    // Get openings for each filter
    const openingsByFilter = filters.filters.map(filter => {
      const preferences = {
        minStartTime: filter.minStartTime,
        maxEndTime: filter.maxEndTime,
        minDuration: filter.minDuration,
        daysOfWeek: filter.daysOfWeek,
        omittedCourts: filters.omittedCourts[facility] || []
      }

      // Get openings with facility
      const openings = getOpenings(
        facilityOpenings,
        preferences.minDuration
      )

      // Add facility back to each opening
      return openings.map(opening => ({
        ...opening,
        facility
      }))
    })

    // Combine all openings and remove duplicates
    const uniqueOpenings = new Set(
      openingsByFilter.flat().map(o => 
        JSON.stringify({
          facility: o.facility,
          startDatetime: o.startDatetime.toISOString(),
          endDatetime: o.endDatetime.toISOString(),
          durationMinutes: o.durationMinutes,
          path: o.path
        })
      )
    )

    byFacility[facility] = Array.from(uniqueOpenings).map(str => {
      const o = JSON.parse(str)
      return {
        facility: o.facility,
        startDatetime: new Date(o.startDatetime),
        endDatetime: new Date(o.endDatetime),
        durationMinutes: o.durationMinutes,
        path: o.path
      }
    })
  }

  return byFacility
})

// Filter half-hour openings to only include those that are part of valid openings
const displayHalfHourOpeningsByFacility = computed(() => {
  const byFacility: Record<string, HalfHourOpening[]> = {}

  for (const [facility, openings] of Object.entries(validOpeningsByFacility.value)) {
    // Create a set of valid datetime-court combinations
    const validSlots = new Set(
      openings.flatMap(opening => {
        const slots: string[] = []
        let currentTime = opening.startDatetime
        let pathIndex = 0
        
        while (currentTime < opening.endDatetime) {
          slots.push(JSON.stringify({
            court: opening.path[pathIndex],
            datetime: currentTime.toISOString()
          }))
          currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)
          pathIndex++
        }
        
        return slots
      })
    )

    // Filter half-hour openings to only include those in valid slots
    byFacility[facility] = validHalfHourOpeningsByFacility.value[facility]?.filter(opening => 
      validSlots.has(JSON.stringify({
        court: opening.court,
        datetime: opening.datetime.toISOString()
      }))
    ) || []
  }

  return byFacility
})

// Get valid dates from filtered openings
const validDates = computed(() => {
  const dates = Object.values(displayHalfHourOpeningsByFacility.value)
    .flat()
    .map(opening => {
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
