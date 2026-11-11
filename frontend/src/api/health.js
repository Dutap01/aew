import { api } from './client'

// GET /api/health → { status: 'UP' }
export function getHealth() {
  return api.get('/health')
}
