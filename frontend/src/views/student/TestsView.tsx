// 학생: 내 레벨테스트 목록. 발급된 테스트를 시작하거나 이어서 푼다. 점수는 보여주지 않는다 (결과는 학원에서 안내).
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Clock, PlayCircle } from 'lucide-react'
import { Link } from 'react-router'
import { getMyAttempts } from '@/api/attempts'
import { errorMessage } from '@/api/errors'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import type { StudentAttempt } from '@/types/test'
import { formatDateTime } from '@/utils/format'

export function StudentTestsView() {
  const query = useQuery({ queryKey: ['my-attempts'], queryFn: getMyAttempts })
  const list = query.data ?? []
  const open = list.filter((a) => a.status === 'issued' || a.status === 'in_progress')
  const done = list.filter((a) => a.status === 'submitted' || a.status === 'graded')

  return (
    <>
      <Topbar title="레벨테스트" />
      {query.isError ? (
        <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error, '테스트를 불러오지 못했습니다.')}</p></Card>
      ) : !query.data ? (
        <div className="h-48 animate-pulse rounded-card bg-white" />
      ) : list.length === 0 ? (
        <Card hoverLift={false} className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
          <ClipboardList className="size-8 text-muted" aria-hidden />
          <p className="text-sm font-bold text-ink">받은 레벨테스트가 없습니다</p>
          <p className="text-xs text-muted">학원에서 테스트를 발급하면 여기에 나옵니다.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {open.map((a, i) => <OpenCard key={a.id} a={a} index={i} />)}
          {done.length > 0 && (
            <Card hoverLift={false} index={open.length}>
              <h2 className="mb-3 text-sm font-bold text-ink">제출한 테스트</h2>
              <ul className="space-y-2">
                {done.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
                    <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{a.testTitle}</span>
                      <span className="block text-xs text-muted tabular-nums">{a.submittedAt && `${formatDateTime(a.submittedAt)} 제출`} · 결과는 학원에서 안내해 드립니다</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

function OpenCard({ a, index }: { a: StudentAttempt; index: number }) {
  const started = a.status === 'in_progress'
  return (
    <Card hoverLift={false} index={index} className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold text-brand-700">{started ? '응시 중' : '응시 대기'}</p>
        <h2 className="text-lg font-extrabold text-ink">{a.testTitle}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden />
          {a.itemCount}문항 · {a.timeLimitMinutes ? `${a.timeLimitMinutes}분` : '시간 제한 없음'}
          {started && a.deadline && ` · ${formatDateTime(a.deadline)}까지`}
        </p>
      </div>
      <Link to={`/s/test/${a.id}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white hover:bg-brand-700">
        <PlayCircle className="size-5" aria-hidden /> {started ? '이어서 풀기' : '테스트 보기'}
      </Link>
    </Card>
  )
}
