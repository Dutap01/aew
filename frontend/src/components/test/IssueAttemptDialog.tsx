// 레벨테스트 발급 창. 응시마다 레벨테스트 전용 계정(T123456, 사용 시간 제한)을 만들고 비밀번호를 한 번 보여준다.
// 아이디는 나중에 결과·접수 화면에서 다시 볼 수 있고, 비밀번호를 잊으면 '다시 발급'.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { getLevelTests, issueAttempt } from '@/api/attempts'
import { errorMessage } from '@/api/errors'
import { CredentialsPanel } from '@/components/student/CredentialsPanel'
import { Dialog } from '@/components/ui/Dialog'
import type { AttemptIssuedResponse } from '@/types/test'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  student: { id: string; name: string }
  /** 레벨테스트 접수에서 발급할 때 */
  inquiryId?: string
  onClose: () => void
}

export function IssueAttemptDialog({ open, student, inquiryId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={`${student.name} 레벨테스트 발급`}>
      {open && <Body student={student} inquiryId={inquiryId} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ student, inquiryId, onClose }: Omit<Props, 'open'>) {
  const queryClient = useQueryClient()
  const tests = useQuery({ queryKey: ['level-tests-options'], queryFn: getLevelTests, staleTime: 60_000 })
  const [testId, setTestId] = useState<string | null>(null)
  const [issued, setIssued] = useState<AttemptIssuedResponse | null>(null)
  const selected = testId ?? (tests.data?.length === 1 ? tests.data[0].id : null)

  const mutation = useMutation({
    mutationFn: () => issueAttempt({ studentId: student.id, testId: selected!, inquiryId: inquiryId ?? null }),
    onSuccess: (res) => {
      setIssued(res)
      queryClient.invalidateQueries({ queryKey: ['attempts'] })
      queryClient.invalidateQueries({ queryKey: ['student-attempts', student.id] })
      queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['test-accounts'] })
    },
  })

  if (issued) return <Issued issued={issued} onClose={onClose} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (selected) mutation.mutate() }} className="space-y-4">
      {tests.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-track" />
      ) : !tests.data?.length ? (
        <p className="rounded-xl bg-wait/15 px-3 py-3 text-sm text-[#a16207]">발급할 수 있는 레벨테스트가 없습니다. 문항이 등록되면 발급할 수 있습니다.</p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-ink">테스트</legend>
          <ul className="space-y-1.5">
            {tests.data.map((t) => (
              <li key={t.id}>
                <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1',
                  selected === t.id ? 'bg-brand-50 ring-brand' : 'ring-line hover:bg-panel')}>
                  <input type="radio" name="test" checked={selected === t.id} onChange={() => setTestId(t.id)} className="accent-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{t.title}</span>
                    <span className="block text-xs text-muted">{t.itemCount}문항{t.timeLimitMinutes ? ` · ${t.timeLimitMinutes}분` : ' · 시간 제한 없음'}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <p className="rounded-xl bg-panel px-3 py-2.5 text-xs text-ink">
        발급하면 이 테스트만 볼 수 있는 <b>레벨테스트 전용 계정</b>을 만듭니다. 학생 정식 계정과는 별개이고,
        정해진 시간(레벨테스트 설정)이 지나면 로그인할 수 없습니다.
      </p>

      {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-track">취소</button>
        <button type="submit" disabled={!selected || mutation.isPending}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          발급
        </button>
      </div>
    </form>
  )
}

function Issued({ issued, onClose }: { issued: AttemptIssuedResponse; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink"><b>{issued.attempt.testTitle}</b>을(를) 발급했습니다.</p>
      <CredentialsPanel loginId={issued.loginId} password={issued.password} expiresAt={issued.expiresAt} />
      <p className="text-xs text-muted">
        학생이 이 정보로 로그인하면 바로 레벨테스트가 보입니다. 아이디는 접수 상세·레벨테스트 결과 화면에서 다시 볼 수 있습니다.
      </p>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700">확인</button>
      </div>
    </div>
  )
}
