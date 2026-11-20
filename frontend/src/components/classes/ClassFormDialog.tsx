// 반 만들기·수정 창 (대표). 수업 시간은 요일·시작·끝을 여러 줄로 넣는다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { createClass, getClassLevels, getTeachers, updateClass } from '@/api/classes'
import { errorMessage, fieldErrors } from '@/api/errors'
import { Field, INPUT_CLASS } from '@/components/form/Field'
import { Dialog } from '@/components/ui/Dialog'
import type { ClassDetail, ClassScheduleSlot, ClassSummary } from '@/types/classes'
import { cn } from '@/utils/cn'
import { formatTime, weekdayName } from '@/utils/format'

interface Props {
  open: boolean
  /** 없으면 새 반 */
  target?: ClassSummary
  onClose: () => void
  onSaved: (d: ClassDetail) => void
}

export function ClassFormDialog({ open, target, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={target ? `${target.name} 수정` : '반 만들기'} className="sm:max-w-lg">
      {open && <Form key={target?.id ?? 'new'} target={target} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  )
}

type Row = { key: number; weekday: number; startTime: string; endTime: string }

let rowKey = 0
const toRow = (s: ClassScheduleSlot): Row => ({ key: rowKey++, weekday: s.weekday, startTime: formatTime(s.startTime), endTime: formatTime(s.endTime) })

function Form({ target, onClose, onSaved }: Omit<Props, 'open'>) {
  const queryClient = useQueryClient()
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: getTeachers, staleTime: 5 * 60_000 })
  const levels = useQuery({ queryKey: ['class-levels'], queryFn: getClassLevels, staleTime: 5 * 60_000 })

  const [name, setName] = useState(target?.name ?? '')
  const [level, setLevel] = useState(target?.level ?? '')
  const [teacherId, setTeacherId] = useState(target?.teacherId ?? '')
  const [capacity, setCapacity] = useState(target?.capacity?.toString() ?? '')
  const [active, setActive] = useState(target?.active ?? true)
  const [rows, setRows] = useState<Row[]>(() => (target?.schedules ?? []).map(toRow))

  const mutation = useMutation({
    mutationFn: () => {
      const req = {
        name: name.trim(),
        level: level.trim(),
        teacherId: teacherId || null,
        capacity: capacity ? Number(capacity) : null,
        active,
        schedules: rows.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
      }
      return target ? updateClass(target.id, req) : createClass(req)
    },
    onSuccess: (d) => {
      queryClient.setQueryData(['class', d.info.id], d)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['class-levels'] })
      queryClient.invalidateQueries({ queryKey: ['student'] }) // 학생 화면의 반 이름·시간
      onSaved(d)
      onClose()
    },
  })
  const errors = fieldErrors(mutation.error)

  function addRow() {
    // 마지막 줄 다음 요일, 같은 시간 (첫 줄은 월 16:00~17:30)
    const last = rows.at(-1)
    setRows([...rows, last
      ? { key: rowKey++, weekday: (last.weekday % 7) + 1, startTime: last.startTime, endTime: last.endTime }
      : { key: rowKey++, weekday: 1, startTime: '16:00', endTime: '17:30' }])
  }

  function patch(key: number, change: Partial<Row>) {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (target?.active && !active && !window.confirm('운영 종료하면 반 목록·시간표에서 빠집니다. 계속할까요?')) return
    mutation.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="반 이름" htmlFor="cls-name" error={errors.name}>
          <input id="cls-name" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="예: 중2A" aria-invalid={!!errors.name} className={INPUT_CLASS} />
        </Field>
        <Field label="레벨" htmlFor="cls-level" error={errors.level}>
          <input id="cls-level" required maxLength={10} list="cls-level-options" value={level} onChange={(e) => setLevel(e.target.value)}
            placeholder="M2" aria-invalid={!!errors.level} className={cn(INPUT_CLASS, 'uppercase')} />
          <datalist id="cls-level-options">
            {levels.data?.map((l) => <option key={l} value={l} />)}
          </datalist>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="담당 강사" htmlFor="cls-teacher" error={errors.teacherId}>
          <select id="cls-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={INPUT_CLASS}>
            <option value="">미정</option>
            {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            {/* 사용 중지된 강사가 담당이면 목록에 없으므로 그대로 보여준다 */}
            {target?.teacherId && teachers.data && !teachers.data.some((t) => t.id === target.teacherId) && (
              <option value={target.teacherId}>{target.teacherName ?? '(사용 중지)'}</option>
            )}
          </select>
        </Field>
        <Field label="정원" htmlFor="cls-capacity" error={errors.capacity} hint="비우면 제한 없음">
          <input id="cls-capacity" type="number" inputMode="numeric" min={1} max={200} value={capacity}
            onChange={(e) => setCapacity(e.target.value)} aria-invalid={!!errors.capacity} className={INPUT_CLASS} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink">수업 시간</legend>
        {rows.length === 0 && <p className="mb-2 text-xs text-muted">아직 수업 시간이 없습니다. 시간표에 나오려면 수업 시간을 넣으세요.</p>}
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="grid grid-cols-[4.5rem_1fr_auto_1fr_2.25rem] items-center gap-1.5">
              <select aria-label={`${i + 1}번째 요일`} value={r.weekday} onChange={(e) => patch(r.key, { weekday: Number(e.target.value) })} className={INPUT_CLASS}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{weekdayName(d)}</option>)}
              </select>
              <input type="time" step={600} required aria-label={`${i + 1}번째 시작`} value={r.startTime}
                onChange={(e) => patch(r.key, { startTime: e.target.value })} className={cn(INPUT_CLASS, 'px-2 tabular-nums')} />
              <span className="text-xs text-muted" aria-hidden>~</span>
              <input type="time" step={600} required aria-label={`${i + 1}번째 끝`} value={r.endTime}
                onChange={(e) => patch(r.key, { endTime: e.target.value })} className={cn(INPUT_CLASS, 'px-2 tabular-nums')} />
              <button type="button" aria-label={`${i + 1}번째 수업 시간 지우기`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-alert/10 hover:text-alert">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addRow}
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-track px-2.5 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800">
          <Plus className="size-3.5" aria-hidden /> 수업 시간 추가
        </button>
      </fieldset>

      {target && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-brand" />
          운영 중
          <span className="text-xs text-muted">(끄면 반 목록·시간표에서 빠집니다. 학생이 없을 때만 가능)</span>
        </label>
      )}

      {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-track">취소</button>
        <button type="submit" disabled={mutation.isPending || !name.trim() || !level.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {target ? '저장' : '반 만들기'}
        </button>
      </div>
    </form>
  )
}
