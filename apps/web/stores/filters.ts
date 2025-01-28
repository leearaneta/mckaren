import { defineStore } from 'pinia'
import type { Preferences } from '@mckaren/types'

interface Filter extends Omit<Preferences, 'omittedCourts'> {
  selectedFacilities: string[]
}

interface FiltersState {
  filters: Filter[]
  omittedCourts: Record<string, string[]>
}

export const useFiltersStore = defineStore('filters', {
  state: (): FiltersState => ({
    filters: [{
      selectedFacilities: [],
      minStartTime: { hour: 6, minute: 0 },
      maxEndTime: { hour: 23, minute: 0 },
      minDuration: 60,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    }],
    omittedCourts: {}
  }),

  getters: {
    allSelectedFacilities(): string[] {
      const facilities = new Set<string>()
      this.filters.forEach(filter => {
        filter.selectedFacilities.forEach(facility => facilities.add(facility))
      })
      return Array.from(facilities)
    }
  },

  actions: {
    initializeSelectedFacilities(facilities: { name: string }[]) {
      if (this.filters[0].selectedFacilities.length === 0) {
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
      // Clone the last filter's settings for the new filter
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
      }
    }
  }
}) 