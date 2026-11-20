// 학생 정식 계정 한 줄 (학생 상세): 아이디(복사) + 비밀번호 재발급, 계정이 없으면 계정 만들기.
// 레벨테스트 전용 계정은 components/test/TestAccountRow.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '@/api/errors'
import { resetStudentPassword } from '@/api/students'
import { CredentialsPanel } from '@/components/student/CredentialsPanel'
import { Dialog } from '@/components/ui/Dialog'
import type { StudentCredentials } from '@/types/student'

interface Props {
  studentId: string
  studentName: string
  loginId: string | null
}

export function StudentAccountRow({ studentId, studentName, loginId }: Props) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [issued, setIssued] = useState<StudentCredentials | null>(null)
  const reset = useMutation({
    mutationFn: () => resetStudentPassword(studentId),
    onSuccess: (c) => {
      setIssued(c)
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
    },
  })

  const dialog = (
    <Dialog open={issued !== null} onClose={() => setIssued(null)} title={`${studentName} 학생 계정`}>
      {issued && (
        <div className="space-y-4">
          <CredentialsPanel loginId={issued.loginId} password={issued.initialPassword} />
          <div className="flex justify-end">
            <button type="button" onClick={() => setIssued(null)} className="h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700">확인</button>
          </div>
        </div>
      )}
    </Dialog>
  )

  if (!loginId) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">아직 없음</span>
        <button type="button" disabled={reset.isPending}
          onClick={() => window.confirm(`${studentName} 학생의 정식 계정(아이디: 학생 코드)을 만들까요? 시간표·숙제를 볼 때 쓰는 계정입니다.`) && reset.mutate()}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-track px-2 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50">
          {reset.isPending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />} 계정 만들기
        </button>
        {reset.isError && <span role="alert" className="basis-full text-[11px] text-alert">{errorMessage(reset.error)}</span>}
        {dialog}
      </span>
    )
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(loginId!)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-sm font-bold text-ink">{loginId}</span>
      <button type="button" onClick={copy} aria-label="아이디 복사" title="아이디 복사"
        className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink">
        {copied ? <Check className="size-3.5 text-brand-700" /> : <Copy className="size-3.5" />}
      </button>
      <button type="button" disabled={reset.isPending}
        onClick={() => window.confirm(`${studentName} 학생의 비밀번호를 새로 만들까요? 지금 쓰던 비밀번호로는 더 이상 로그인할 수 없습니다.`) && reset.mutate()}
        className="inline-flex h-7 items-center gap-1 rounded-lg bg-track px-2 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50">
        {reset.isPending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />}
        비밀번호 재발급
      </button>
      {reset.isError && <span role="alert" className="basis-full text-[11px] text-alert">{errorMessage(reset.error)}</span>}
      {dialog}
    </span>
  )
}
