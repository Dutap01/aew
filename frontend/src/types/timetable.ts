import type { components } from '@/api/schema'

type S = components['schemas']

export type Timetable = S['Timetable']
export type TimetableEntry = S['TimetableEntry']
export type TimetableOwner = S['TimetableOwner']
