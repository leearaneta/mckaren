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
      <div class="flex-1">
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
              <span class="text-sm font-medium text-gray-700">Start time:</span>
              <select 
                v-model="currentFilter.minStartTime.hour" 
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
              <span class="text-sm font-medium text-gray-700">End time:</span>
              <select 
                v-model="currentFilter.maxEndTime.hour" 
                class="rounded-lg border-gray-300 text-sm pl-2"
                :class="{ 'border-red-500': currentFilter.maxEndTime.hour <= currentFilter.minStartTime.hour }"
              >
                <option 
                  v-for="option in timeOptions" 
                  :key="option.value"
                  :value="option.value"
                  :disabled="option.value <= currentFilter.minStartTime.hour"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          
          <div v-if="currentFilter.maxEndTime.hour <= currentFilter.minStartTime.hour" class="text-sm text-red-500">
            End time must be after start time
          </div>
        </div>
      </div>

      <!-- Tabs section -->
      <div class="flex flex-col min-w-[100px] border-l pl-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-700">Filters</h3>
          <button 
            class="text-sm text-blue-600 hover:text-blue-700"
            @click="addFilter"
          >
            +
          </button>
        </div>
        <div class="space-y-2 overflow-y-auto max-h-[300px]">
          <button
            v-for="(filter, index) in filters.filters"
            :key="index"
            class="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors duration-200"
            :class="{
              'bg-blue-50 text-blue-600': currentFilterIndex === index,
              'hover:bg-gray-50': currentFilterIndex !== index
            }"
            @click="currentFilterIndex = index"
          >
            Filter {{ index + 1 }}
          </button>
        </div>
        <button 
          v-if="filters.filters.length > 1"
          class="mt-4 text-sm text-red-600 hover:text-red-700"
          @click="removeFilter"
        >
          Remove filter
        </button>
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
  return Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`
  }))
})

const currentFilterIndex = ref(0)

const currentFilter = computed(() => {
  return filters.filters[currentFilterIndex.value]
})

const addFilter = () => {
  filters.addFilter()
  currentFilterIndex.value = filters.filters.length - 1
}

const removeFilter = () => {
  if (filters.filters.length > 1) {
    filters.removeFilter(currentFilterIndex.value)
    if (currentFilterIndex.value >= filters.filters.length) {
      currentFilterIndex.value = filters.filters.length - 1
    }
  }
}
</script> 