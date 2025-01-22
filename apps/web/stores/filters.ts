import { defineStore } from 'pinia'

interface FiltersState {
  selectedFacilities: string[]
  selectedDays: number[]
  minimumDuration: number
  startHour: number
  endHour: number
  selectedCourts: Record<string, string[]>
}

export const useFiltersStore = defineStore('filters', {
  state: (): FiltersState => ({
    selectedFacilities: [],
    selectedDays: [0, 1, 2, 3, 4, 5, 6],
    minimumDuration: 30,
    startHour: 6,
    endHour: 24,
    selectedCourts: {}
  }),

  actions: {
    initializeSelectedCourts(facilities: { name: string, courts: string[] }[]) {
      facilities.forEach(facility => {
        if (!this.selectedCourts[facility.name]) {
          this.selectedCourts[facility.name] = [...facility.courts]
        }
      })
    },

    initializeSelectedFacilities(facilities: { name: string }[]) {
      if (this.selectedFacilities.length === 0) {
        this.selectedFacilities = facilities.map(f => f.name)
      }
    }
  }
}) 