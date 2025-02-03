import { defineStore } from 'pinia'
import type { Preferences } from '@mckaren/types'

export interface Filter extends Omit<Preferences, 'omittedCourts'> {
  selectedFacilities: string[]
  name: string
}

interface FiltersState {
  filters: Filter[]
  omittedCourts: Record<string, string[]>
  currentFilterIndex: number
}

const STORAGE_KEY = 'mckaren:filters'

function getDefaultState(): FiltersState {
  return {
    filters: [{
      name: '',
      selectedFacilities: [],
      minStartTime: { hour: 6, minute: 0 },
      maxEndTime: { hour: 23, minute: 0 },
      minDuration: 60,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    }],
    omittedCourts: {},
    currentFilterIndex: 0
  }
}

function isValidState(state: any): state is FiltersState {
  if (!state || typeof state !== 'object') return false;
  if (!Array.isArray(state.filters)) return false;
  if (typeof state.currentFilterIndex !== 'number') return false;
  if (!state.omittedCourts || typeof state.omittedCourts !== 'object') return false;

  // Validate each filter
  return state.filters.every((filter: any) => 
    Array.isArray(filter.selectedFacilities) &&
    typeof filter.name === 'string' &&
    typeof filter.minDuration === 'number' &&
    Array.isArray(filter.daysOfWeek) &&
    filter.minStartTime && typeof filter.minStartTime.hour === 'number' && typeof filter.minStartTime.minute === 'number' &&
    filter.maxEndTime && typeof filter.maxEndTime.hour === 'number' && typeof filter.maxEndTime.minute === 'number'
  );
}

export const useFiltersStore = defineStore('filters', {
  state: (): FiltersState => {
    // Try to load state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem(STORAGE_KEY)
        if (savedState) {
          const parsedState = JSON.parse(savedState)
          if (isValidState(parsedState)) {
            return parsedState
          }
          // If state is invalid, clear localStorage
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        // If there's any error parsing the state, clear localStorage
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // Return default state if nothing in localStorage or if it was invalid
    return getDefaultState()
  },

  getters: {
    allSelectedFacilities(): string[] {
      const facilities = new Set<string>()
      this.filters.forEach(filter => {
        filter.selectedFacilities.forEach(facility => facilities.add(facility))
      })
      return Array.from(facilities)
    },

    currentFilter(): Filter {
      return this.filters[this.currentFilterIndex]
    }
  },

  actions: {
    initializeSelectedFacilities(facilities: { name: string }[]) {
      if (this.filters.every(filter => filter.selectedFacilities.length === 0)) {
        this.filters[0].selectedFacilities = facilities.map(f => f.name)
      }
    },

    initializeOmittedCourts(facilities: { name: string, courts: string[] }[]) {
      facilities.forEach(facility => {
        if (!this.omittedCourts[facility.name]) {
          this.omittedCourts[facility.name] = []
        }
      })
    },

    addFilter() {
      const lastFilter = this.filters[this.filters.length - 1]
      this.filters.push({
        name: '',
        selectedFacilities: [...lastFilter.selectedFacilities],
        minStartTime: { ...lastFilter.minStartTime },
        maxEndTime: { ...lastFilter.maxEndTime },
        minDuration: lastFilter.minDuration,
        daysOfWeek: [...lastFilter.daysOfWeek],
      })
      this.setCurrentFilterIndex(this.filters.length - 1)
    },

    removeFilter(index: number) {
      if (this.filters.length > 1) {
        this.filters.splice(index, 1)
        // Rename remaining filters to maintain sequence
        this.filters.forEach((filter, i) => {
          if (filter.name.match(/^Filter \d+$/)) {
            filter.name = `Filter ${i + 1}`
          }
        })
        if (this.currentFilterIndex >= this.filters.length) {
          this.currentFilterIndex = this.filters.length - 1
        }
      }
    },

    setCurrentFilterIndex(index: number) {
      if (index >= 0 && index < this.filters.length) {
        this.currentFilterIndex = index
      }
    },

    updateCurrentFilter(filter: Filter) {
      this.filters[this.currentFilterIndex] = filter
    }
  }
})

// Set up store subscription for persistence
export function setupFiltersStore() {
  const store = useFiltersStore()
  store.$subscribe(
    (mutation, state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    { detached: true, deep: true }
  )
  return store
} 