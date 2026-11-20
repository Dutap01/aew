import type { components } from '@/api/schema'

type S = components['schemas']

export type TestOption = S['TestOption']
export type AttemptSummary = S['AttemptSummary']
export type AttemptStatus = AttemptSummary['status']
export type AttemptPage = S['PageResponseAttemptSummary']
export type AttemptCounts = S['AttemptCounts']
export type AttemptDetail = S['AttemptDetail']
export type AttemptItemResult = S['ItemResult']
export type AreaScore = S['AreaScore']
export type AttemptIssuedResponse = S['AttemptIssuedResponse']
export type StudentAttempt = S['StudentAttempt']
export type Question = S['Question']
export type LevelTestSettings = S['LevelTestSettings']
export type TestAccountInfo = S['TestAccountInfo']
