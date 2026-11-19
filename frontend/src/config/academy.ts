// 학원 소개 정보 (메인·강의 소개 페이지). 실제 학원 정보로 바꿔 쓴다.
// 반·요일·시간·회차 커리큘럼은 DB 에서 가져오고, 여기에는 문구만 둔다.

export const ACADEMY = {
  name: '한빛 중등영어학원',
  tagline: '진단으로 시작하고, 리포트로 확인하는 중등 영어',
  intro: '레벨테스트로 현재 실력을 진단하고, 수준에 맞는 반에서 수업합니다. 매주 두 번 학습 리포트를 학부모님께 보내 드립니다.',
  phone: '02-000-0000',
  address: '서울시 ○○구 ○○로 00, 0층',
  hours: '평일 14:00 ~ 22:00 · 토요일 10:00 ~ 18:00',
}

/** 레벨 코드(classes.level) → 화면 이름·소개 */
export const LEVEL_INFO: Record<string, { name: string; summary: string; target: string }> = {
  M1: { name: '중1 과정', summary: '문장 구조와 기초 문법을 다지고, 교과서 수준의 독해에 익숙해집니다.', target: '중학교 1학년 · 초6 심화' },
  M2: { name: '중2 과정', summary: '시제·준동사·수동태 등 핵심 문법을 정리하고 내신 서술형을 준비합니다.', target: '중학교 2학년' },
  M3: { name: '중3 과정', summary: '고난도 구문과 서술형 쓰기를 훈련하고 고등 영어로 연결합니다.', target: '중학교 3학년 · 예비 고1' },
}

export function levelName(level: string): string {
  return LEVEL_INFO[level]?.name ?? level
}

/** 주소에 쓰는 레벨 이름: M2 → m2 */
export const levelSlug = (level: string) => level.toLowerCase()
