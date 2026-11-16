// recharts 는 CSS 변수 대신 hex 값을 받으므로 @theme 토큰과 같은 값을 여기서 한 번만 정의한다.
export const CHART = {
  brand: '#4caf50',
  brandSoft: '#cfe7d0',
  grape: '#8b5cf6',
  navy: '#1e3a5f',
  grid: '#eceeea',
  track: '#f0f2ee',
  axis: '#9aa19c',
} as const

export const axisTick = { fontSize: 11, fill: CHART.axis } as const
