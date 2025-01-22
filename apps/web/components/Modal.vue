<template>
  <div 
    v-if="show"
    class="fixed inset-0 flex items-center justify-center"
    :style="{ zIndex: zIndex }"
    @click.self="$emit('close')"
  >
    <div class="fixed inset-0 bg-black bg-opacity-50" @click.self="$emit('close')" />
    <div class="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto relative">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-medium">{{ title }}</h2>
        <button 
          class="text-gray-500 hover:text-gray-700"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>
      
      <!-- Content -->
      <div class="space-y-4">
        <slot />
      </div>
      
      <!-- Footer -->
      <div class="mt-6 flex justify-end gap-3">
        <slot name="footer">
          <button 
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            @click="$emit('confirm')"
          >
            Confirm
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  zIndex?: number
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script> 