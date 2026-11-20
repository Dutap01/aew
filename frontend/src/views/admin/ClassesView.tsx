// 반 구성: 반 목록(레벨·담당 강사·수업 시간·인원) + 고른 반의 학생.
// 조회는 대표·상담실장, 반 만들기·수정은 대표만. 고른 반·운영 종료 반 보기는 주소(?class=&all=1)에 남긴다.
import { useQuery } from '@tanstack/react-query'
import { Clock, Pencil, Plus, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getClass, getClasses } from '@/api/classes'
import { errorMessage } from '@/api/errors'
import { ClassFormDialog } from '@/components/classes/ClassFormDialog'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { StudentStatusBadge } from '@/components/ui/StudentStatusBadge'
import { useAuthStore } from '@/stores/authStore'
import type { ClassSummary } from '@/types/classes'
import { cn } from '@/utils/cn'
import { formatShortDate, formatTime, weekdayName } from '@/utils/format'
import { formatSchedules } from '@/utils/schedule'

export function ClassesView() {
  const isOwner = useAuthStore((s) => s.user?.role === 'owner')
  const [params, setParams] = useSearchParams()
  const showAll = params.get('all') === '1'
  const selectedId = params.get('class')
  const [form, setForm] = useState<{ target?: ClassSummary } | null>(null)

  const list = useQuery({ queryKey: ['classes', { all: showAll }], queryFn: () => getClasses(showAll) })
  const classes = list.data ?? []
  const selected = classes.find((c) => c.id === selectedId) ?? classes[0]
  const activeClasses = classes.filter((c) => c.active)
  const totalStudents = activeClasses.reduce((sum, c) => sum + c.studentCount, 0)

  function update(key: 'class' | 'all', value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: key === 'class' })
  }

  return (
    <>
      <Topbar title="반 구성" subtitle={list.data ? `운영 중 ${activeClasses.length}개 반 · 학생 ${totalStudents}명` : ' '} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          <input type="checkbox" checked={showAll} onChange={(e) => update('all', e.target.checked ? '1' : null)} className="size-4 accent-brand" />
          운영 종료한 반도 보기
        </label>
        {isOwner ? (
          <button type="button" onClick={() => setForm({})}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-700">
            <Plus className="size-4" aria-hidden /> 반 만들기
          </button>
        ) : (
          <p className="text-xs text-muted">반 만들기·수정은 대표만 할 수 있습니다.</p>
        )}
      </div>

      {list.isError ? (
        <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(list.error, '반 목록을 불러오지 못했습니다.')}</p></Card>
      ) : !list.data ? (
        <div className="h-96 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />
      ) : classes.length === 0 ? (
        <Card hoverLift={false} className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
          <Users className="size-8 text-muted" aria-hidden />
          <p className="text-sm font-bold text-ink">아직 반이 없습니다</p>
          {isOwner && <p className="text-xs text-muted">'반 만들기'로 반 이름·레벨·담당 강사·수업 시간을 넣으세요.</p>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card hoverLift={false} className="p-2">
            <ul aria-label="반 목록" className="space-y-1">
              {classes.map((c) => (
                <li key={c.id}>
                  <ClassRow c={c} selected={c.id === selected?.id} onSelect={() => update('class', c.id)} />
                </li>
              ))}
            </ul>
          </Card>
          {selected && <ClassPanel key={selected.id} summary={selected} isOwner={isOwner} onEdit={() => setForm({ target: selected })} />}
        </div>
      )}

      {isOwner && (
        <ClassFormDialog open={form !== null} target={form?.target} onClose={() => setForm(null)}
          onSaved={(d) => update('class', d.info.id)} />
      )}
    </>
  )
}

function ClassRow({ c, selected, onSelect }: { c: ClassSummary; selected: boolean; onSelect: () => void }) {
  const ratio = c.capacity ? c.studentCount / c.capacity : 0
  return (
    <button type="button" onClick={onSelect} aria-current={selected || undefined}
      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        selected ? 'bg-brand-50 ring-1 ring-brand/40' : 'hover:bg-panel', !c.active && 'opacity-60')}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-extrabold text-white">{c.level}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-ink">{c.name}</span>
          {!c.active && <span className="rounded-full bg-track px-1.5 py-0.5 text-[10px] font-semibold text-muted">운영 종료</span>}
        </span>
        <span className="block truncate text-xs text-muted tabular-nums">{c.teacherName ?? '강사 미정'} · {formatSchedules(c.schedules)}</span>
      </span>
      <span className={cn('shrink-0 text-xs font-semibold tabular-nums', ratio >= 1 ? 'text-alert' : ratio >= 0.9 ? 'text-wait' : 'text-ink')}>
        {c.studentCount}{c.capacity !== null && <span className="font-normal text-muted"> / {c.capacity}</span>}명
      </span>
    </button>
  )
}

function ClassPanel({ summary, isOwner, onEdit }: { summary: ClassSummary; isOwner: boolean; onEdit: () => void }) {
  const detail = useQuery({ queryKey: ['class', summary.id], queryFn: () => getClass(summary.id) })
  const c = detail.data?.info ?? summary

  return (
    <Card hoverLift={false} index={1} className="self-start">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-ink">{c.name}</h2>
          <p className="text-xs text-muted">레벨 {c.level} · 정원 {c.capacity ?? '제한 없음'}{c.capacity !== null && '명'}</p>
        </div>
        {isOwner && (
          <button type="button" onClick={onEdit}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-track px-2.5 text-xs font-bold text-ink hover:bg-brand-50 hover:text-brand-800">
            <Pencil className="size-3.5" aria-hidden /> 수정
          </button>
        )}
      </div>

      <dl className="mb-5 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2.5 text-sm">
        <dt className="flex items-center gap-1 text-muted"><UserRound className="size-3.5" aria-hidden />담당</dt>
        <dd className="text-ink">{c.teacherName ?? <span className="text-muted">미정</span>}</dd>
        <dt className="flex items-start gap-1 pt-0.5 text-muted"><Clock className="size-3.5 translate-y-0.5" aria-hidden />수업</dt>
        <dd className="text-ink">
          {c.schedules.length === 0 ? <span className="text-muted">수업 시간 없음</span> : (
            <ul className="flex flex-wrap gap-1.5">
              {c.schedules.map((s, i) => (
                <li key={i} className="rounded-lg bg-panel px-2 py-1 text-xs font-semibold tabular-nums">
                  {weekdayName(s.weekday)} {formatTime(s.startTime)}~{formatTime(s.endTime)}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>

      <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-ink">
        학생 <span className="text-xs font-normal text-muted">{c.studentCount}명</span>
      </h3>
      {detail.isError ? (
        <p role="alert" className="text-xs text-alert">{errorMessage(detail.error)}</p>
      ) : !detail.data ? (
        <div className="h-40 animate-pulse rounded-xl bg-track" aria-label="불러오는 중" />
      ) : detail.data.students.length === 0 ? (
        <p className="rounded-xl bg-panel px-3 py-6 text-center text-xs text-muted">
          아직 학생이 없습니다.{isOwner && ' 학생 화면의 \'반에 넣기\'로 학생을 넣으세요.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-line text-[11px] font-semibold text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">이름</th>
                <th scope="col" className="px-3 py-2">학교 · 학년</th>
                <th scope="col" className="px-3 py-2">시작</th>
                <th scope="col" className="py-2 pl-3 text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {detail.data.students.map((s) => (
                <tr key={s.enrollmentId}>
                  <td className="py-2 pr-3">
                    <Link to={`/admin/students/${s.studentId}`} className="font-bold text-ink hover:text-brand-700 hover:underline">{s.name}</Link>
                    <span className="ml-1.5 font-mono text-[11px] text-muted">{s.studentCode}</span>
                  </td>
                  <td className="px-3 py-2 text-ink">{[s.school, s.grade].filter(Boolean).join(' · ') || <span className="text-muted">-</span>}</td>
                  <td className="px-3 py-2 text-muted tabular-nums">{formatShortDate(s.startDate)}</td>
                  <td className="py-2 pl-3 text-right"><StudentStatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
