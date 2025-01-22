<template>
  <div>
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
            v-model="filters.selectedDays"
            :value="index"
            class="rounded text-blue-600 w-3 h-3"
          >
          <span class="text-xs">{{ day }}</span>
        </label>
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
          v-model="filters.selectedFacilities"
          :value="facility.name"
          class="rounded text-blue-600"
        >
        <span>{{ facility.name }}</span>
      </label>
    </div>

    <!-- Minimum duration filter -->
    <div class="mb-4">
      <label class="flex items-center space-x-2">
        <span class="text-sm font-medium text-gray-700">Minimum duration:</span>
        <select 
          v-model="filters.minimumDuration" 
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
            v-model="filters.startHour" 
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
            v-model="filters.endHour" 
            class="rounded-lg border-gray-300 text-sm pl-2"
            :class="{ 'border-red-500': filters.endHour <= filters.startHour }"
          >
            <option 
              v-for="option in timeOptions" 
              :key="option.value"
              :value="option.value"
              :disabled="option.value <= filters.startHour"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
      
      <div v-if="filters.endHour <= filters.startHour" class="text-sm text-red-500">
        End time must be after start time
      </div>
    </div>

    <!-- Filter courts button -->
    <div>
      <button 
        class="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="$emit('showCourtFilter')"
      >
        Filter courts
      </button>
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
</script> 