const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

export const formatToday = (date = new Date()) => dateFormatter.format(date)

export const formatNumber = (value: number) => value.toLocaleString('ko-KR')
