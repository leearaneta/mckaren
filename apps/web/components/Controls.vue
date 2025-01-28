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

    <!-- Main controls area with tabs -->
    <div class="flex gap-4">
      <!-- Controls section -->
      <div class="flex flex-col">
        <!-- Facility filters -->
        <div class="flex flex-wrap gap-2 mb-6">
          <label 
            v-for="facility in facilities" 
            :key="facility.name"
            class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <input
              type="checkbox"
              v-model="currentFilter.selectedFacilities"
              :value="facility.name"
              class="rounded text-blue-600"
            >
            <span>{{ facility.name }}</span>
          </label>
        </div>

        <!-- Days of week filter -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Days of week:</h3>
          <div class="flex gap-3">
            <label 
              v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" 
              :key="day + index"
              class="flex items-center gap-1"
            >
              <input
                type="checkbox"
                v-model="currentFilter.daysOfWeek"
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
            <span class="text-sm font-medium text-gray-700">Minimum duration:</span>
            <select 
              v-model="currentFilter.minDuration" 
              class="rounded-lg border-gray-300 text-sm pl-2"
            >
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
              <span class="text-sm font-medium text-gray-700">Start time:</span>
              <select 
                v-model="currentFilter.minStartTime" 
                class="rounded-lg border-gray-300 text-sm pl-2"
              >
                <option 
                  v-for="option in timeOptions" 
                  :key="`${option.value.hour}-${option.value.minute}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            
            <label class="flex items-center space-x-2">
              <span class="text-sm font-medium text-gray-700">End time:</span>
              <select 
                v-model="currentFilter.maxEndTime" 
                class="rounded-lg border-gray-300 text-sm pl-2"
                :class="{ 'border-red-500': isEndTimeBeforeStart }"
              >
                <option 
                  v-for="option in timeOptions" 
                  :key="`${option.value.hour}-${option.value.minute}`"
                  :value="option.value"
                  :disabled="isTimeBeforeStart(option.value)"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          
          <div v-if="isEndTimeBeforeStart" class="text-sm text-red-500">
            End time must be after start time
          </div>
        </div>
      </div>

      <!-- Tabs section -->
      <div class="flex flex-col min-w-[100px] border-l pl-4">
        <div class="flex items-center gap-4 mb-4">
          <h3 class="text-sm font-medium text-gray-700">Filters</h3>
          <button 
            class="text-sm text-blue-600 hover:text-blue-700"
            @click="addFilter"
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
                'bg-blue-50 text-blue-600': currentFilterIndex === index,
                'hover:bg-gray-50': currentFilterIndex !== index
              }"
              @click="currentFilterIndex = index"
            >
              Filter {{ index + 1 }}
            </button>
            <button 
              v-if="filters.filters.length > 1"
              class="px-2 text-gray-400 hover:text-red-600"
              @click="removeFilter(index)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

const currentFilterIndex = ref(0)

const currentFilter = computed(() => {
  return filters.filters[currentFilterIndex.value]
})

const addFilter = () => {
  filters.addFilter()
  currentFilterIndex.value = filters.filters.length - 1
}

const removeFilter = (index: number) => {
  if (filters.filters.length > 1) {
    filters.removeFilter(index)
    if (currentFilterIndex.value >= filters.filters.length) {
      currentFilterIndex.value = filters.filters.length - 1
    }
  }
}

// Helper to compare times
const isEndTimeBeforeStart = computed(() => {
  const start = currentFilter.value.minStartTime
  const end = currentFilter.value.maxEndTime
  // Convert midnight (0:00) to 24:00 for comparison
  const endHour = end.hour === 0 ? 24 : end.hour
  const startHour = start.hour
  return endHour < startHour || (endHour === startHour && end.minute <= start.minute)
})

function isTimeBeforeStart(time: { hour: number, minute: number }): boolean {
  const start = currentFilter.value.minStartTime
  // Convert midnight (0:00) to 24:00 for comparison
  const timeHour = time.hour === 0 ? 24 : time.hour
  const startHour = start.hour
  return timeHour < startHour || (timeHour === startHour && time.minute <= start.minute)
}
</script> 