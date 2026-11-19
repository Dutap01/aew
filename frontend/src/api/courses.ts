import type { CourseLevel } from '@/types/course'
import { api } from './client'

/** 공개: 레벨별 운영 반(요일·시간)과 회차 커리큘럼 */
export const getCourses = () => api.get<CourseLevel[]>('/public/courses')
