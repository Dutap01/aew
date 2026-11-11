import { defineStore } from 'pinia'
import { formatLog } from '@/utils/LogUtils'

export const useLogStore = defineStore('log', {
  state: () => ({
    logs: [],
  }),
  actions: {
    addLog(message) {
      this.logs.push(formatLog(message))
    },
    clear() {
      this.logs = []
    },
  },
})
