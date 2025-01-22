<template>
  <Modal
    :show="show"
    :z-index="zIndex"
    title="Filter courts"
    @close="$emit('close')"
    @confirm="$emit('close')"
  >
    <div class="space-y-6">
      <!-- Facility selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select facility:
        </label>
        <select 
          v-model="selectedFacility"
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
      <div v-if="selectedFacility" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <label 
            v-for="court in currentFacility?.courts.sort()" 
            :key="court"
            class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <input
              type="checkbox"
              v-model="filters.selectedCourts[selectedFacility]"
              :value="court"
              class="rounded text-blue-600"
            >
            <span>{{ court }}</span>
          </label>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility } from '~/utils/types'
import Modal from './Modal.vue'

const props = defineProps<{
  show: boolean
  facilities: Facility[]
  zIndex?: number
}>()

defineEmits<{
  (e: 'close'): void
}>()

const filters = useFiltersStore()
const selectedFacility = ref('')

// Only show facilities that are selected in the main filters
const filteredFacilities = computed(() => 
  props.facilities.filter(f => filters.selectedFacilities.includes(f.name))
)

// Get the current facility object
const currentFacility = computed(() => 
  props.facilities.find(f => f.name === selectedFacility.value)
)

// Set initial facility when modal opens
watch(() => props.show, (isOpen) => {
  if (isOpen && filteredFacilities.value.length > 0) {
    selectedFacility.value = filteredFacilities.value[0].name
  }
})
</script> 