// 공개 신청서 (로그인 없음, 휴대폰 우선): /apply/consult, /apply/level-test
import { useMutation } from '@tanstack/react-query'
import { CalendarPlus, CheckCircle2, Dices, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { errorMessage, fieldErrors } from '@/api/errors'
import { submitInquiry } from '@/api/inquiries'
import { Card } from '@/components/ui/Card'
import { INQUIRY_TYPE_LABEL } from '@/components/ui/InquiryBadges'
import type { InquiryType, PreferredSlot } from '@/types/inquiry'
import { cn } from '@/utils/cn'
import { randomPerson, randomSlots } from '@/utils/devRandom'
import { formatShortDate, toIsoDate } from '@/utils/format'

const GRADES = ['초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3']
// 10:00 ~ 20:30, 30분 간격
const TIMES = Array.from({ length: 22 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const MAX_SLOTS = 3

const INPUT =
  'h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20'

const INTRO: Record<InquiryType, string> = {
  consult: '학습 상담을 원하시는 날짜와 시간을 남겨 주시면 확인 후 연락드립니다.',
  level_test: '레벨테스트 희망 일정을 남겨 주시면 확인 후 응시 안내를 드립니다.',
}

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toIsoDate(d)
}

/** 010-1234-5678 형태로 입력 중 자동 하이픈 */
function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

export function ApplyView({ type }: { type: InquiryType }) {
  const [applicantName, setApplicantName] = useState('')
  const [applicantPhone, setApplicantPhone] = useState('')
  const [studentName, setStudentName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [slots, setSlots] = useState<PreferredSlot[]>([{ date: tomorrow(), time: '16:00' }])
  const [message, setMessage] = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({ mutationFn: submitInquiry })
  const errors = { ...fieldErrors(mutation.error), ...localErrors }

  /** 개발용: 신청에 필요한 정보를 랜덤으로 채운다 (신청하기는 직접 누른다) */
  function fillRandom() {
    const p = randomPerson()
    setApplicantName(p.applicantName)
    setApplicantPhone(p.applicantPhone)
    setStudentName(p.studentName)
    setSchool(p.school)
    setGrade(p.grade)
    setSlots(randomSlots())
    setMessage(p.message)
    setPrivacyAgreed(true)
    setLocalErrors({})
    mutation.reset()
  }

  /** 완료 화면에서 새 신청서로 */
  function startOver() {
    setApplicantName('')
    setApplicantPhone('')
    setStudentName('')
    setSchool('')
    setGrade('')
    setSlots([{ date: tomorrow(), time: '16:00' }])
    setMessage('')
    setPrivacyAgreed(false)
    setLocalErrors({})
    mutation.reset()
    window.scrollTo({ top: 0 })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!applicantName.trim()) next.applicantName = '신청자 이름을 입력하세요.'
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(applicantPhone)) next.applicantPhone = '휴대폰 번호를 정확히 입력하세요. (예: 010-1234-5678)'
    if (!studentName.trim()) next.studentName = '학생 이름을 입력하세요.'
    if (!privacyAgreed) next.privacyAgreed = '개인정보 수집·이용에 동의해야 신청할 수 있습니다.'
    setLocalErrors(next)
    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0])?.focus()
      return
    }
    mutation.mutate({
      type,
      applicantName: applicantName.trim(),
      applicantPhone,
      studentName: studentName.trim(),
      school: school.trim() || undefined,
      grade: grade || undefined,
      preferredSlots: slots,
      message: message.trim() || undefined,
      privacyAgreed,
    })
  }

  if (mutation.isSuccess) {
    return (
      <Card hoverLift={false} className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-brand" aria-hidden />
        <h1 className="text-xl font-extrabold text-ink">{INQUIRY_TYPE_LABEL[type]} 신청이 접수되었습니다</h1>
        <p className="text-sm text-muted">
          {studentName} 학생 · 희망 일정 {slots.map((s) => `${formatShortDate(s.date)} ${s.time}`).join(', ')}
        </p>
        <p className="text-sm text-ink">확인 후 {applicantPhone} 으로 연락드리겠습니다.</p>
        <button type="button" onClick={startOver}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-track px-4 text-sm font-semibold text-ink hover:bg-brand-50">
          <RotateCcw className="size-4" aria-hidden /> 새로 신청하기
        </button>
      </Card>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{INQUIRY_TYPE_LABEL[type]} 신청</h1>
      <p className="mt-1.5 mb-5 text-sm text-muted">{INTRO[type]}</p>

      {import.meta.env.DEV && (
        <button type="button" onClick={fillRandom}
          className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-grape/60 bg-grape-50 text-sm font-bold text-grape hover:bg-grape/10">
          <Dices className="size-4" aria-hidden /> 랜덤 작성 (개발용)
        </button>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Card hoverLift={false} className="space-y-4">
          <SectionTitle>신청자 (학부모)</SectionTitle>
          <Field id="applicantName" label="이름" required error={errors.applicantName}>
            <input id="applicantName" autoComplete="name" value={applicantName} onChange={(e) => setApplicantName(e.target.value)}
              className={cn(INPUT, errors.applicantName ? 'border-alert' : 'border-line')} maxLength={30} />
          </Field>
          <Field id="applicantPhone" label="휴대폰 번호" required error={errors.applicantPhone}>
            <input id="applicantPhone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678"
              value={applicantPhone} onChange={(e) => setApplicantPhone(formatPhoneInput(e.target.value))}
              className={cn(INPUT, errors.applicantPhone ? 'border-alert' : 'border-line')} />
          </Field>
        </Card>

        <Card hoverLift={false} index={1} className="space-y-4">
          <SectionTitle>학생</SectionTitle>
          <Field id="studentName" label="이름" required error={errors.studentName}>
            <input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)}
              className={cn(INPUT, errors.studentName ? 'border-alert' : 'border-line')} maxLength={30} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field id="school" label="학교" error={errors.school}>
              <input id="school" placeholder="예: 한빛중" value={school} onChange={(e) => setSchool(e.target.value)}
                className={cn(INPUT, 'border-line')} maxLength={40} />
            </Field>
            <Field id="grade" label="학년">
              <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={cn(INPUT, 'border-line')}>
                <option value="">선택</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card hoverLift={false} index={2} className="space-y-3">
          <SectionTitle>희망 일정 <span className="font-medium text-muted">(최대 {MAX_SLOTS}개)</span></SectionTitle>
          {slots.map((slot, i) => (
            <div key={i} className="grid grid-cols-[1fr_6.5rem_2.75rem] gap-2">
              <label className="sr-only" htmlFor={`slot-date-${i}`}>희망 날짜 {i + 1}</label>
              <input id={`slot-date-${i}`} type="date" min={tomorrow()} value={slot.date} required
                onChange={(e) => setSlots(slots.map((s, j) => (j === i ? { ...s, date: e.target.value } : s)))}
                className={cn(INPUT, 'border-line px-3')} />
              <label className="sr-only" htmlFor={`slot-time-${i}`}>희망 시간 {i + 1}</label>
              <select id={`slot-time-${i}`} value={slot.time}
                onChange={(e) => setSlots(slots.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)))}
                className={cn(INPUT, 'border-line px-2.5')}>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button type="button" aria-label={`희망 일정 ${i + 1} 삭제`} disabled={slots.length === 1}
                onClick={() => setSlots(slots.filter((_, j) => j !== i))}
                className="flex h-12 items-center justify-center rounded-xl text-muted hover:bg-track hover:text-alert disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {errors.preferredSlots && <p className="text-xs text-alert">{errors.preferredSlots}</p>}
          {slots.length < MAX_SLOTS && (
            <button type="button" onClick={() => setSlots([...slots, { date: slots[slots.length - 1].date, time: '16:00' }])}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <CalendarPlus className="size-4" aria-hidden /> 일정 추가
            </button>
          )}
        </Card>

        <Card hoverLift={false} index={3} className="space-y-4">
          <Field id="message" label="문의 내용" error={errors.message}>
            <textarea id="message" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="궁금한 점이나 학생의 현재 학습 상황을 적어 주세요."
              className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </Field>

          <div>
            <label className="flex items-start gap-2.5">
              <input id="privacyAgreed" type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-brand" />
              <span className="text-sm text-ink">
                <b>[필수]</b> 개인정보 수집·이용에 동의합니다.
                <span className="mt-1 block text-xs text-muted">
                  수집 항목: 신청자 이름·휴대폰 번호, 학생 이름·학교·학년 / 목적: 상담·레벨테스트 안내 / 보관: 상담 종료 후 1년
                </span>
              </span>
            </label>
            {errors.privacyAgreed && <p className="mt-1.5 text-xs text-alert">{errors.privacyAgreed}</p>}
          </div>
        </Card>

        {mutation.isError && Object.keys(fieldErrors(mutation.error)).length === 0 && (
          <p role="alert" className="rounded-xl bg-alert/10 px-4 py-3 text-sm text-alert">{errorMessage(mutation.error)}</p>
        )}

        <button type="submit" disabled={mutation.isPending}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60">
          {mutation.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          신청하기
        </button>
      </form>
    </>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-bold text-ink">{children}</h2>
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink">
        {label} {required && <span className="text-alert">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-alert">{error}</p>}
    </div>
  )
}
