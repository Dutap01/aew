import { cn } from '@/utils/cn'

const PALETTE = ['bg-brand', 'bg-grape', 'bg-navy', 'bg-wait', 'bg-brand-700', 'bg-sky-600']

function hashIndex(text: string, mod: number) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % mod
}

/** 한글 이름은 성을 뺀 이름 첫 글자, 그 외는 앞 두 글자 이니셜 */
export function initialsOf(name: string) {
  const trimmed = name.trim()
  if (/^[가-힣]+$/.test(trimmed)) return trimmed.length >= 3 ? trimmed.slice(1, 2) : trimmed.slice(0, 1)
  return trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface AvatarProps {
  name: string
  size?: number
  className?: string
  colorClassName?: string
}

export function Avatar({ name, size = 36, className, colorClassName }: AvatarProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold',
        colorClassName ?? `${PALETTE[hashIndex(name, PALETTE.length)]} text-white`,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
