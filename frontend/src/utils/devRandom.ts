// 개발용 랜덤 데이터 (신청서 자동 작성 등). 개발 서버(import.meta.env.DEV)에서만 쓴다.
import type { PreferredSlot } from '@/types/inquiry'
import { addDays, todaySeoul } from './seoulDate'

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const GIVEN = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '서윤', '예준', '지아', '하준', '수아', '지호', '하린', '준서', '다은']
const PARENT_GIVEN = ['영희', '철수', '미경', '성호', '은정', '재훈', '지현', '상우']
/** 학년 → 그 학년이 다닐 학교 */
const SCHOOLS: Record<string, string[]> = {
  초: ['별빛초', '햇살초'],
  중: ['한빛중', '새솔중', '푸른중', '하늘중'],
  고: ['누리고', '한결고'],
}
const GRADES = ['초5', '초6', '중1', '중1', '중2', '중2', '중3', '중3', '고1']
const TIMES = ['14:00', '15:00', '15:30', '16:00', '16:30', '17:00', '18:00', '19:00']
const MESSAGES = [
  '문법이 약해서 상담 받고 싶어요.',
  '내신 대비 반이 있는지 궁금합니다.',
  '레벨테스트 후 반 배정 가능할까요?',
  '주말 상담도 가능한가요?',
  '독해 속도가 느린 편입니다.',
  '',
]

export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')

export function randomPerson() {
  const surname = pick(SURNAMES)
  const grade = pick(GRADES)
  return {
    studentName: surname + pick(GIVEN),
    applicantName: surname + pick(PARENT_GIVEN),
    applicantPhone: `010-${digits(4)}-${digits(4)}`,
    school: pick(SCHOOLS[grade[0]]),
    grade,
    message: pick(MESSAGES),
  }
}

/** 내일부터 2주 안의 희망 일정 1~3개 (날짜 순, 겹치지 않게) */
export function randomSlots(): PreferredSlot[] {
  const today = todaySeoul()
  const count = 1 + Math.floor(Math.random() * 3)
  const days = new Set<number>()
  while (days.size < count) days.add(1 + Math.floor(Math.random() * 14))
  return [...days].sort((a, b) => a - b).map((d) => ({ date: addDays(today, d), time: pick(TIMES) }))
}
