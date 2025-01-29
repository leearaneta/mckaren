import { defineStore } from 'pinia'
import type { Preferences } from '@mckaren/types'

interface Filter extends Omit<Preferences, 'omittedCourts'> {
  selectedFacilities: string[]
}

interface FiltersState {
  filters: Filter[]
  omittedCourts: Record<string, string[]>
  currentFilterIndex: number
}

const STORAGE_KEY = 'mckaren:filters'

export const useFiltersStore = defineStore('filters', {
  state: (): FiltersState => {
    // Try to load state from localStorage
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        return JSON.parse(savedState)
      }
    }

    // Return default state if nothing in localStorage
    return {
      filters: [{
        selectedFacilities: [],
        minStartTime: { hour: 6, minute: 0 },
        maxEndTime: { hour: 23, minute: 0 },
        minDuration: 60,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      }],
      omittedCourts: {},
      currentFilterIndex: 0
    }
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
        selectedFacilities: [...lastFilter.selectedFacilities],
        minStartTime: { ...lastFilter.minStartTime },
        maxEndTime: { ...lastFilter.maxEndTime },
        minDuration: lastFilter.minDuration,
        daysOfWeek: [...lastFilter.daysOfWeek],
      })
    },

    removeFilter(index: number) {
      if (this.filters.length > 1) {
        this.filters.splice(index, 1)
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