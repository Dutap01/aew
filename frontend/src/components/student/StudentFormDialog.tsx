// 학생 등록·기본 정보 수정 창 (대표·상담실장)
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage, fieldErrors } from '@/api/errors'
import { createStudent, updateStudent } from '@/api/students'
import { Field, INPUT_CLASS, TEXTAREA_CLASS } from '@/components/form/Field'
import { Dialog } from '@/components/ui/Dialog'
import { STUDENT_STATUS_LABEL } from '@/components/ui/StudentStatusBadge'
import type { StudentDetail, StudentStatus } from '@/types/student'

const GRADES = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3']
/** 직접 등록할 때 고를 수 있는 상태 (재원·휴원은 반에 넣으면서 정해진다) */
const CREATE_STATUSES: StudentStatus[] = ['consulting', 'test_scheduled']

interface Props {
  open: boolean
  /** 없으면 새 학생 등록 */
  student?: StudentDetail
  onClose: () => void
  onSaved: (s: StudentDetail) => void
}

export function StudentFormDialog({ open, student, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={student ? '학생 정보 수정' : '학생 등록'}>
      {open && <Form key={student?.id ?? 'new'} student={student} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  )
}

function Form({ student, onClose, onSaved }: Omit<Props, 'open'>) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(student?.name ?? '')
  const [school, setSchool] = useState(student?.school ?? '')
  const [grade, setGrade] = useState(student?.grade ?? '')
  const [parentName, setParentName] = useState(student?.parentName ?? '')
  const [parentPhone, setParentPhone] = useState(student?.parentPhone ?? '')
  const [status, setStatus] = useState<StudentStatus>(student?.status ?? 'consulting')
  const [memo, setMemo] = useState(student?.memo ?? '')

  // 수정: 지금 상태와 바꿀 수 있는 상태. 재원은 반 소속이 있을 때만 (없으면 '반에 넣기'로)
  const hasClass = student?.enrollments.some((e) => !e.endDate) ?? false
  const statuses: StudentStatus[] = student
    ? (['consulting', 'test_scheduled', 'enrolled', 'paused', 'withdrawn'] as StudentStatus[])
        .filter((s) => s === student.status || s !== 'enrolled' || hasClass)
    : CREATE_STATUSES

  const mutation = useMutation({
    mutationFn: () => {
      const req = { name: name.trim(), school, grade, parentName, parentPhone, status, memo }
      return student ? updateStudent(student.id, req) : createStudent(req)
    },
    onSuccess: (s) => {
      queryClient.setQueryData(['student', s.id], s)
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      onSaved(s)
      onClose()
    },
  })
  const errors = fieldErrors(mutation.error)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (student && status === 'withdrawn' && student.status !== 'withdrawn' && hasClass
      && !window.confirm('퇴원으로 바꾸면 지금 반 소속이 오늘 날짜로 모두 종료됩니다. 계속할까요?')) return
    mutation.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field label="학생 이름" htmlFor="st-name" error={errors.name}>
          <input id="st-name" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name} className={INPUT_CLASS} />
        </Field>
        <Field label="상태" htmlFor="st-status" error={errors.status}
          hint={!student ? '재원은 반에 넣으면 바뀝니다' : undefined}>
          <select id="st-status" value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)} className={INPUT_CLASS}>
            {statuses.map((s) => <option key={s} value={s}>{STUDENT_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <Field label="학교" htmlFor="st-school" error={errors.school}>
          <input id="st-school" maxLength={40} value={school} onChange={(e) => setSchool(e.target.value)}
            placeholder="예: 한빛중" className={INPUT_CLASS} />
        </Field>
        <Field label="학년" htmlFor="st-grade" error={errors.grade}>
          <select id="st-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={INPUT_CLASS}>
            <option value="">-</option>
            {[...new Set([...GRADES, grade].filter(Boolean))].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="학부모 이름" htmlFor="st-parent" error={errors.parentName}>
          <input id="st-parent" maxLength={30} value={parentName} onChange={(e) => setParentName(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="학부모 연락처" htmlFor="st-phone" error={errors.parentPhone} hint="안내 문자를 받는 번호">
          <input id="st-phone" type="tel" inputMode="tel" maxLength={13} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)}
            placeholder="010-1234-5678" aria-invalid={!!errors.parentPhone} className={INPUT_CLASS} />
        </Field>
      </div>
      <Field label="메모" htmlFor="st-memo" error={errors.memo}>
        <textarea id="st-memo" rows={2} maxLength={2000} value={memo} onChange={(e) => setMemo(e.target.value)}
          placeholder="형제 재원, 알레르기 등 계속 알고 있어야 할 내용" className={TEXTAREA_CLASS} />
      </Field>

      {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-track">취소</button>
        <button type="submit" disabled={mutation.isPending || !name.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {student ? '저장' : '등록'}
        </button>
      </div>
    </form>
  )
}
