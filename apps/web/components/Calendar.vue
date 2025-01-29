<template>
  <div class="calendar">
    <header>
      <button 
        class="p-2 hover:bg-gray-100 rounded-full transition-colors"
        @click="toPrev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      <div class="month">{{ months[displayMonth] }} {{ displayYear }}</div>
      <button 
        class="p-2 hover:bg-gray-100 rounded-full transition-colors"
        @click="toNext"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
    </header>

    <div class="grid">
      <span 
        v-for="(label, idx) in labels" 
        :key="label" 
        class="label"
      >
        {{ labels[(idx + offset) % 7] }}
      </span>

      <template v-for="week in 6">
        <template v-if="current[week - 1]">
          <template v-for="day in 7">
            <template v-if="current[week - 1][day - 1] !== 0">
              <div
                :key="`current-${week}-${day}`"
                class="date"
                :class="{
                  today: isToday(current[week - 1][day - 1]),
                  'has-openings': hasOpenings({ year: displayYear, month: displayMonth, dayOfMonth: current[week - 1][day - 1] }),
                  selected: isSelected(current[week - 1][day - 1])
                }"
                @click="handleDateClick({ year: displayYear, month: displayMonth, dayOfMonth: current[week - 1][day - 1] })"
              >
                <span class="text">{{ current[week - 1][day - 1] }}</span>
              </div>
            </template>
            <template v-else-if="week < 2">
              <div :key="`prev-${week}-${day}`" class="date other">
                <span class="text">{{ prev[prev.length - 1][day - 1] }}</span>
              </div>
            </template>
            <template v-else>
              <div :key="`next-${week}-${day}`" class="date other">
                <span class="text">{{ next[0][day - 1] }}</span>
              </div>
            </template>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: Date
  validDates: Date[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
}>()

const today = new Date()
const offset = 0 // Sun

const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Compute display month and year from the selected date
const displayYear = computed(() => props.modelValue.getFullYear())
const displayMonth = computed(() => props.modelValue.getMonth())

function calendarize(date: Date, offset: number) {
  const year = date.getFullYear()
  const month = date.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const calendar: number[][] = []
  let week: number[] = []
  let day = 1
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push(0)
  }
  
  // Add all days of the month
  while (day <= lastDay.getDate()) {
    week.push(day)
    
    if (week.length === 7) {
      calendar.push(week)
      week = []
    }
    
    day++
  }
  
  // Fill out the last week if needed
  while (week.length < 7 && week.length > 0) {
    week.push(0)
  }
  
  if (week.length === 7) {
    calendar.push(week)
  }
  
  return calendar
}

const prev = computed(() => calendarize(new Date(displayYear.value, displayMonth.value - 1), offset))
const current = computed(() => calendarize(new Date(displayYear.value, displayMonth.value), offset))
const next = computed(() => calendarize(new Date(displayYear.value, displayMonth.value + 1), offset))

function toPrev() {
  const newDate = new Date(props.modelValue)
  newDate.setMonth(newDate.getMonth() - 1)
  emit('update:modelValue', newDate)
}

function toNext() {
  const newDate = new Date(props.modelValue)
  newDate.setMonth(newDate.getMonth() + 1)
  emit('update:modelValue', newDate)
}

function isToday(day: number) {
  return displayYear.value === today.getFullYear() && 
         displayMonth.value === today.getMonth() && 
         day === today.getDate()
}

function handleDateClick({ year, month, dayOfMonth }: { year: number, month: number, dayOfMonth: number }) {
  emit('update:modelValue', new Date(year, month, dayOfMonth))
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

function hasOpenings({ year, month, dayOfMonth }: { year: number, month: number, dayOfMonth: number }) {
  const date = new Date(year, month, dayOfMonth)
  return props.validDates.some(validDate => isSameDay(validDate, date))
}

function isSelected(day: number) {
  return displayYear.value === props.modelValue.getFullYear() && 
         displayMonth.value === props.modelValue.getMonth() && 
         day === props.modelValue.getDate()
}
</script>

<style scoped>
.calendar {
  max-width: 300px;
}

header {
  display: flex;
  margin-bottom: 1rem;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.month {
  display: block;
  text-align: center;
}

.grid {
  display: grid;
  grid-template-rows: 5% auto;
  grid-template-columns: repeat(7, 1fr);
  text-align: right;
  height: 90%;
  grid-gap: 2px;
}

.label {
  font-weight: 400;
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.6;
}

.date {
  border: 1px solid #bbbbbb;
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
}

.date:hover {
  background-color: #f3f4f6;
}

.date.today {
  color: #5286fa;
  border-color: currentColor;
}

.date.has-openings {
  background-color: #c4d9fd;
}

.date.other {
  opacity: 0.2;
}

.text {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.8rem;
}

.date.selected {
  background-color: #5286fa;
  color: white;
  border-color: #5286fa;
}

.date.selected:hover {
  background-color: #4070e0;
}

.date.selected.has-openings {
  background-color: #5286fa;
}

.date.today.selected {
  color: white;
}
</style> 