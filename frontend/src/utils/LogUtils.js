export function formatLog(message) {
  const time = new Date().toLocaleTimeString('ko-KR')
  return `[${time}] ${message}`
}
