<template>
  <div class="container max-w-[1280px] mx-auto p-6">
    <!-- Sticky date navigation -->
    <div class="sticky flex top-0 bg-white py-4 px-4 rounded-t-lg shadow z-10 justify-center md:justify-normal">
      <div class="flex items-center justify-between w-[240px] md:w-[360px] gap-4">
        <button 
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          @click="selectedDate = new Date(selectedDate.setDate(selectedDate.getDate() - 1))"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <div class="text-xl font-medium">
          <span class="hidden md:inline">
            {{ selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
          </span>
          <span class="md:hidden">
            {{ selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
          </span>
        </div>
        
        <button 
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          @click="selectedDate = new Date(selectedDate.setDate(selectedDate.getDate() + 1))"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Controls section -->
    <section class="bg-white shadow mb-8 rounded-b-lg">
      <div class="py-6 px-4">
        <div class="flex flex-col md:flex-row md:justify-between">
          <div class="flex gap-8">
            <!-- Left column: Calendar -->
            <div class="w-80 hidden md:block">
              <Calendar 
                v-model="selectedDate"
                :valid-dates="validDates"
              />
            </div>

            <!-- Right column: Filters -->
            <div class="flex-1">
              <Controls 
                :facilities="facilities" 
                @showCourtFilter="showCourtFilter = true" 
              />
            </div>
          </div>

          <!-- Subscribe button - hidden on mobile, shown in original position on desktop -->
          <div class="hidden md:flex md:flex-col md:justify-end">
            <button 
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              @click="showSubscriptionModal = true"
            >
              Subscribe to new openings
            </button>
          </div>
        </div>

        <!-- Subscribe button - shown below controls on mobile -->
        <div class="mt-6 md:hidden">
          <button 
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            @click="showSubscriptionModal = true"
          >
            Subscribe to new openings
          </button>
        </div>
      </div>
    </section>

    <!-- Faclities -->
    <div class="bg-white rounded-lg shadow">
      <!-- Facility tabs -->
      <div class="sticky top-[72px] bg-white border-b z-10 py-1 rounded-t-lg">
        <div class="flex gap-2 px-4">
          <button
            v-for="facility in facilities"
            :key="facility.name"
            v-show="filters.allSelectedFacilities.includes(facility.name)"
            class="px-4 py-2 text-sm font-medium transition-colors duration-200 -mb-px"
            :class="{
              'text-blue-600 border-b-2 border-blue-600': selectedFacility === facility.name,
              'text-gray-500 hover:text-gray-700': selectedFacility !== facility.name
            }"
            @click="selectedFacility = facility.name"
          >
            {{ facility.name }}
          </button>
        </div>
      </div>

      <!-- Facility view -->
      <div class="p-4">
        <template v-if="selectedFacility && currentFacility">
          <FacilityView
            :facility="currentFacility"
            :omitted-courts="filters.omittedCourts[currentFacility.name]"
            :half-hour-openings="displayHalfHourOpeningsByFacility[currentFacility.name] || []"
            :openings="currentFacilityOpenings"
            :date="selectedDate"
          />
        </template>
      </div>
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility, HalfHourOpening, Opening } from '~/utils/types'
import { getOpenings, filterHalfHourOpeningsByPreferences } from '@mckaren/openings'
import Calendar from '~/components/Calendar.vue'
import Controls from '~/components/Controls.vue'
import CourtFilterModal from '~/components/CourtFilterModal.vue'
import SubscriptionModal from '~/components/SubscriptionModal.vue'
import FacilityView from '~/components/FacilityView.vue'

const filters = useFiltersStore()
const facilities = ref<Facility[]>([])
const halfHourOpenings = ref<HalfHourOpening[]>([])
const showCourtFilter = ref(false)
const showSubscriptionModal = ref(false)
const selectedDate = ref(new Date())
const selectedFacility = ref('')

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let intervalId: NodeJS.Timeout | null = null;
let isFetchQueued = false;

// Polling function
async function pollHalfHourOpenings() {
  try {
    const response = await fetch('/api/half-hour-openings')
    const openingsData = await response.json()
    
    halfHourOpenings.value = openingsData.map((o: { facility: string; court: string; datetime: string }) => ({
      ...o,
      datetime: new Date(o.datetime)
    }))
  } catch (error) {
    console.error('Failed to fetch half-hour openings:', error);
  }
}

// Start polling
function startPolling() {
  if (intervalId) return; // Don't start if already polling
  pollHalfHourOpenings(); // Initial fetch
  intervalId = setInterval(() => {
    if (document.hidden) {
      isFetchQueued = true;
    } else {
      pollHalfHourOpenings();
    }
  }, POLL_INTERVAL_MS);
}

// Stop polling
function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Handle visibility change
function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    if (isFetchQueued) {
      pollHalfHourOpenings();
      isFetchQueued = false;
    }
    startPolling();
  }
}

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

  // Set up visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Start polling if page is visible
  if (!document.hidden) {
    startPolling();
  }
})

// Clean up on unmount
onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  stopPolling();
})

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// Filter half-hour openings by facility 
const validHalfHourOpeningsByFacility = computed(() => {
  const byFacility: Record<string, HalfHourOpening[]> = {}
  // just filter by omitted courts
  for (const halfHourOpening of halfHourOpenings.value) {
    if (!byFacility[halfHourOpening.facility]) {
      byFacility[halfHourOpening.facility] = []
    }
    if (!filters.omittedCourts[halfHourOpening.facility]?.includes(halfHourOpening.court)) {
      byFacility[halfHourOpening.facility].push(halfHourOpening)
    }
  }
  return byFacility
})

// Compute valid openings for each facility based on valid half-hour openings
const validOpeningsByFacility = computed(() => {
  const byFacility: Record<string, Opening[]> = {}
  
  for (const [facility, facilityOpenings] of Object.entries(validHalfHourOpeningsByFacility.value)) {
    // Get openings for each filter
    const allOpenings = filters.filters.flatMap(filter => {
      const preferences = {
        minStartTime: filter.minStartTime,
        maxEndTime: filter.maxEndTime,
        minDuration: filter.minDuration,
        daysOfWeek: filter.daysOfWeek,
        omittedCourts: filters.omittedCourts[facility] || []
      }
      const filteredBySelectedFacilities = facilityOpenings.filter(opening => filter.selectedFacilities.includes(opening.facility))
      const filteredOpenings = filterHalfHourOpeningsByPreferences(filteredBySelectedFacilities, preferences)
      // Get openings with facility
      const openings = getOpenings(filteredOpenings, filter.minDuration)
      // Add facility back to each opening
      return openings.map(opening => ({ ...opening, facility }))
    })

    // Flatten and deduplicate openings based on start time and duration
    const seen = new Set<string>()
    byFacility[facility] = allOpenings.filter(opening => {
      const key = `${opening.startDatetime.getTime()}-${opening.durationMinutes}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return byFacility
})

// Filter half-hour openings to only include those that are part of selected date
const displayHalfHourOpeningsByFacility = computed(() => {
  const byFacility: Record<string, HalfHourOpening[]> = {}
  for (const [facility, openings] of Object.entries(validHalfHourOpeningsByFacility.value)) {
    byFacility[facility] = openings.filter(opening => isSameDay(opening.datetime, selectedDate.value))
  }
  return byFacility
})

// Get valid dates from filtered openings
const validDates = computed(() => {
  const dates = Object.values(validOpeningsByFacility.value)
    .flat()
    .map(opening => {
      const date = opening.startDatetime;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    })
  return [...new Set(dates)].map(timestamp => new Date(timestamp))
})

// Get current facility
const currentFacility = computed(() => 
  facilities.value.find(f => f.name === selectedFacility.value)
)

// Get openings for current facility and selected date
const currentFacilityOpenings = computed(() => {
  if (!currentFacility.value) return []
  return (validOpeningsByFacility.value[currentFacility.value.name] || [])
    .filter(opening => isSameDay(opening.startDatetime, selectedDate.value))
})

// Set initial facility when facilities are loaded
watch(facilities, (newFacilities) => {
  if (newFacilities.length > 0 && !selectedFacility.value) {
    selectedFacility.value = newFacilities[0].name
  }
}, { immediate: true })

// Update selected facility if current one is filtered out
watch(() => filters.allSelectedFacilities, (selectedFacilities) => {
  if (selectedFacility.value && !selectedFacilities.includes(selectedFacility.value)) {
    selectedFacility.value = selectedFacilities[0] || ''
  }
}, { immediate: true })

</script>

<style>
body {
  @apply bg-gray-50;
}
</style>
