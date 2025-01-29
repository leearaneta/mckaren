<template>
  <div class="flex flex-col space-between">
    <!-- Filter courts button -->
    <div class="mb-4">
      <button 
        class="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="$emit('showCourtFilter')"
      >
        Filter courts
      </button>
    </div>

    <!-- Main controls area -->
    <div class="flex flex-col md:flex-row gap-4">
      <!-- Controls section -->
      <div class="flex flex-col flex-1 max-w-[360px]">
        <!-- Facility filters -->
        <div class="grid grid-cols-2 md:flex md:flex-wrap gap-1 md:gap-2 mb-4 md:mb-6">
          <label 
            v-for="facility in facilities" 
            :key="facility.name"
            class="flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-1.5 md:py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
          >
            <input
              type="checkbox"
              v-model="filters.currentFilter.selectedFacilities"
              :value="facility.name"
              class="rounded text-blue-600 w-3.5 h-3.5"
            >
            <span class="truncate">{{ facility.name }}</span>
          </label>
        </div>

        <!-- Days of week filter -->
        <div class="mb-4 md:mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Days of week:</h3>
          <div class="flex gap-3 flex-wrap">
            <label 
              v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" 
              :key="day + index"
              class="flex items-center gap-1"
            >
              <input
                type="checkbox"
                v-model="filters.currentFilter.daysOfWeek"
                :value="index"
                class="rounded text-blue-600 w-3 h-3"
              >
              <span class="text-xs">{{ day }}</span>
            </label>
          </div>
        </div>

        <!-- Time and duration filters -->
        <div class="space-y-4">
          <!-- Minimum duration filter -->
          <div class="flex flex-col space-y-1">
            <span class="text-sm font-medium text-gray-700 mb-1">Min duration:</span>
            <select 
              v-model="filters.currentFilter.minDuration" 
              class="rounded-lg border-gray-300 text-sm w-full pl-2"
            >
              <option :value="60">1 hour</option>
              <option :value="90">1.5 hours</option>
              <option :value="120">2 hours</option>
              <option :value="150">2.5 hours</option>
              <option :value="180">3 hours</option>
            </select>
          </div>
          
          <!-- Time range filters -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <!-- Start time filter -->
            <div class="flex flex-col space-y-1">
              <span class="text-sm font-medium text-gray-700 mb-1">Min start:</span>
              <select 
                v-model="filters.currentFilter.minStartTime" 
                class="rounded-lg border-gray-300 text-sm w-full pl-2"
              >
                <option 
                  v-for="option in timeOptions" 
                  :key="`${option.value.hour}-${option.value.minute}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <!-- End time filter -->
            <div class="flex flex-col space-y-1">
              <span class="text-sm font-medium text-gray-700 mb-1">Max end:</span>
              <select 
                v-model="filters.currentFilter.maxEndTime" 
                class="rounded-lg border-gray-300 text-sm w-full pl-2"
                :class="{ 'border-red-500': isEndTimeBeforeStart }"
              >
                <option 
                  v-for="option in timeOptions" 
                  :key="`${option.value.hour}-${option.value.minute}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs section -->
      <div class="md:border-l md:pl-4">
        <!-- Mobile filter navigation -->
        <div class="md:hidden">
          <!-- Filter navigation arrows and name -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              :disabled="filters.currentFilterIndex === 0"
              @click="filters.setCurrentFilterIndex(filters.currentFilterIndex - 1)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{ 'text-gray-300': filters.currentFilterIndex === 0 }" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            <div class="text-sm font-medium text-gray-700">
              Filter {{ filters.currentFilterIndex + 1 }}
            </div>

            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              :disabled="filters.currentFilterIndex === filters.filters.length - 1"
              @click="filters.setCurrentFilterIndex(filters.currentFilterIndex + 1)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{ 'text-gray-300': filters.currentFilterIndex === filters.filters.length - 1 }" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Filter actions -->
          <div class="flex gap-2">
            <button 
              class="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50 flex-1"
              @click="filters.addFilter()"
            >
              Add filter
            </button>
            <button 
              v-if="filters.filters.length > 1"
              class="text-sm text-gray-600 hover:text-red-600 px-3 py-1 rounded-md border border-gray-200 hover:bg-red-50 flex-1"
              @click="filters.removeFilter(filters.currentFilterIndex)"
            >
              Remove filter
            </button>
          </div>
        </div>

        <!-- Desktop filter list - hidden on mobile -->
        <div class="hidden md:block">
          <div class="flex items-center gap-4 mb-4">
            <h3 class="text-sm font-medium text-gray-700">Filters</h3>
            <button 
              class="text-sm text-blue-600 hover:text-blue-700"
              @click="filters.addFilter()"
            >
              +
            </button>
          </div>
          <div class="space-y-2 overflow-y-auto flex-1">
            <div
              v-for="(filter, index) in filters.filters"
              :key="index"
              class="flex items-center gap-1"
            >
              <button
                class="flex-1 px-2 py-1 text-left text-sm rounded-lg transition-colors duration-200 whitespace-nowrap"
                :class="{
                  'bg-blue-50 text-blue-600': filters.currentFilterIndex === index,
                  'hover:bg-gray-50': filters.currentFilterIndex !== index
                }"
                @click="filters.setCurrentFilterIndex(index)"
              >
                Filter {{ index + 1 }}
              </button>
              <button 
                v-if="filters.filters.length > 1"
                class="px-2 text-gray-400 hover:text-red-600"
                @click="filters.removeFilter(index)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility } from '~/utils/types'

defineProps<{
  facilities: Facility[]
}>()

defineEmits<{
  (e: 'showCourtFilter'): void
}>()

const filters = useFiltersStore()

const timeOptions = computed(() => {
  const options = []
  
  // Generate options from 5 AM to 11:30 PM
  for (let hour = 5; hour < 24; hour++) {
    // Full hour
    options.push({
      value: { hour, minute: 0 },
      label: formatTimeOption(hour, 0)
    })
    // Half hour
    options.push({
      value: { hour, minute: 30 },
      label: formatTimeOption(hour, 30)
    })
  }

  // Add midnight at the end
  options.push({
    value: { hour: 0, minute: 0 },
    label: 'Midnight'
  })

  return options
})

// Helper to format time options
function formatTimeOption(hour: number, minute: number): string {
  if (hour === 0 && minute === 0) return 'Midnight'
  const period = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
}

// Helper to compare times
const isEndTimeBeforeStart = computed(() => {
  const start = filters.currentFilter.minStartTime
  const end = filters.currentFilter.maxEndTime
  // Convert midnight (0:00) to 24:00 for comparison
  const endHour = end.hour === 0 ? 24 : end.hour
  const startHour = start.hour
  return endHour < startHour || (endHour === startHour && end.minute <= start.minute)
})

</script> 