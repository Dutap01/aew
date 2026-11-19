import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import type { TaskDue, TodayTask } from '@/types/dashboard'

const DUE_LABEL: Record<TaskDue, string> = { today: '오늘', tomorrow: '내일', week: '이번 주' }

interface TodayTasksProps {
  tasks: TodayTask[]
  index?: number
  /** 체크 변경 시 서버 반영용 (나중에 API 연결) */
  onToggle?: (id: string, done: boolean) => void
}

export function TodayTasks({ tasks, index, onToggle }: TodayTasksProps) {
  const [items, setItems] = useState(tasks)
  const doneCount = items.filter((t) => t.done).length

  const toggle = (task: TodayTask) => {
    const done = !task.done
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)))
    onToggle?.(task.id, done)
  }

  return (
    <Card index={index} className="flex flex-col">
      <CardHeader
        title="오늘 할 일"
        description={`${items.length}건 중 ${doneCount}건 완료`}
        action={
          <span className="rounded-full bg-alert/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-alert">
            {items.filter((t) => !t.done && t.due === 'today').length}건 마감
          </span>
        }
      />

      <ul className="flex-1 space-y-2">
        {items.map((task) => (
          <li key={task.id}>
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                task.tone === 'blue' ? 'bg-sky-soft hover:bg-sky-100/70' : 'bg-brand-50 hover:bg-brand-100/70',
                task.done && 'opacity-60',
              )}
            >
              <input type="checkbox" checked={task.done} onChange={() => toggle(task)} className="peer sr-only" />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
                  task.done ? 'border-brand bg-brand text-white' : 'border-ink/25 bg-white',
                )}
              >
                {task.done && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-[13px] font-semibold text-ink', task.done && 'line-through')}>{task.title}</span>
                <span className="block truncate text-[11px] text-muted">{task.meta}</span>
              </span>
              <span
                className={cn(
                  'mt-0.5 shrink-0 text-[11px] font-bold',
                  task.due === 'today' && !task.done ? 'text-alert' : 'text-muted',
                )}
              >
                {DUE_LABEL[task.due]}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Link
        to="/schedule"
        className="mt-3 inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-panel hover:text-brand-700"
      >
        전체 보기 <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </Card>
  )
}
