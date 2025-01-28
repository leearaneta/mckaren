<template>
  <Modal
    :show="show"
    :z-index="zIndex"
    title="Subscribe to new openings!"
    @close="handleClose"
    @confirm="handleSubscribe"
  >
    <div class="space-y-6">
      <!-- Email input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Email address
        </label>
        <input
          v-model="email"
          type="email"
          class="w-full rounded-lg border-gray-300 pl-2"
          :class="{ 'border-red-500': emailError }"
          placeholder="Enter your email"
        >
        <div v-if="emailError" class="mt-1 text-sm text-red-500">
          {{ emailError }}
        </div>
      </div>

      <!-- Information text -->
      <div class="text-sm text-gray-600 space-y-2">
        <p>
          Your subscription will include the following facilities with your current settings:
        </p>
        <ul class="list-disc pl-5">
          <li v-for="facility in selectedFacilities" :key="facility">
            {{ facility }}
          </li>
        </ul>
        <p class="mt-4 font-medium">
          Note:
        </p>
        <ul class="list-disc pl-5">
          <li>You can have multiple subscriptions per facility with different time preferences.</li>
          <li>Court preferences are shared across all subscriptions for each facility.</li>
          <li>All subscriptions will be reviewed before notifications are sent.</li>
        </ul>
      </div>

      <!-- Current settings preview -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <h3 class="font-medium mb-4">Current settings</h3>
        <Controls :facilities="facilities" @showCourtFilter="$emit('showCourtFilter')" />
      </div>
    </div>

    <!-- Footer with success message -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div v-show="showSuccess" class="text-green-600 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Subscription created!</span>
        </div>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 text-gray-600 border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors duration-200 font-medium text-sm"
            @click="handleSubscribe"
          >
            Subscribe
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFiltersStore } from '~/stores/filters'
import type { Facility } from '~/utils/types'
import type { Preferences } from '@mckaren/types'
import Modal from './Modal.vue'
import Controls from './Controls.vue'

const props = defineProps<{
  show: boolean
  facilities: Facility[]
  zIndex?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'showCourtFilter'): void
}>()

const filters = useFiltersStore()
const email = ref('')
const emailError = ref('')
const showSuccess = ref(false)

const selectedFacilities = computed(() => filters.allSelectedFacilities)

function handleClose() {
  if (!showSuccess.value) {
    emit('close')
  }
}

async function handleSubscribe() {
  // Reset states
  emailError.value = ''
  showSuccess.value = false

  // Validate email
  if (!email.value) {
    emailError.value = 'Email is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Invalid email format'
    return
  }

  try {
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value,
        subscriptions: filters.filters.flatMap(filter => 
          filter.selectedFacilities.map(facility => ({
            facility,
            preferences: {
              minStartTime: filter.minStartTime,
              maxEndTime: filter.maxEndTime,
              minDuration: filter.minDuration,
              daysOfWeek: filter.daysOfWeek,
            }
          }))
        ),
        courtPreferences: filters.omittedCourts
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create subscription')
    }

    // Show success message
    showSuccess.value = true
    
    // Close modal after a delay
    setTimeout(() => {
      showSuccess.value = false
      emit('close')
    }, 1500)
  } catch (error) {
    console.error('Error creating subscription:', error)
    emailError.value = 'Failed to create subscription. Please try again.'
  }
}
</script> 