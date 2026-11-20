// 레벨테스트 설정 (대표·상담실장): 레벨테스트 계정 사용 시간 + 지금 쓸 수 있는 레벨테스트 계정
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, Timer, UserRoundX } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { getActiveTestAccounts, getLevelTestSettings, updateLevelTestSettings } from '@/api/attempts'
import { errorMessage, fieldErrors } from '@/api/errors'
import { Topbar } from '@/components/layout/Topbar'
import { AttemptStatusBadge } from '@/components/test/AttemptStatusBadge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

const PRESETS = [30, 60, 90, 120, 180]

/** 90 → "1시간 30분" */
function duration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h}시간` : '', m ? `${m}분` : ''].filter(Boolean).join(' ') || '0분'
}

export function LevelTestSettingsView() {
  return (
    <>
      <Topbar title="레벨테스트 설정" subtitle="레벨테스트 전용 계정의 사용 시간" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <AccountTimeCard />
        <ActiveAccountsCard />
      </div>
    </>
  )
}

function AccountTimeCard() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['level-test-settings'], queryFn: getLevelTestSettings })
  if (!query.data) {
    return query.isError
      ? <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error)}</p></Card>
      : <div className="h-80 animate-pulse rounded-card bg-white" />
  }
  return <AccountTimeForm key={query.data.accountMinutes} saved={query.data.accountMinutes}
    onSaved={(v) => queryClient.setQueryData(['level-test-settings'], v)} />
}

function AccountTimeForm({ saved, onSaved }: { saved: number; onSaved: (v: { accountMinutes: number }) => void }) {
  const [value, setValue] = useState(String(saved))
  const [done, setDone] = useState(false)
  const minutes = Number(value)
  const mutation = useMutation({
    mutationFn: () => updateLevelTestSettings({ accountMinutes: minutes }),
    onSuccess: (v) => { onSaved(v); setDone(true) },
  })
  const errors = fieldErrors(mutation.error)
  const valid = Number.isInteger(minutes) && minutes >= 10 && minutes <= 1440

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Card hoverLift={false} className="self-start">
      <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink"><Timer className="size-4 text-brand-700" aria-hidden /> 계정 사용 시간</h2>
      <p className="mb-5 text-xs text-muted">레벨테스트를 발급한 뒤 이 시간이 지나면 그 계정으로 로그인할 수 없습니다.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="빠른 선택">
          {PRESETS.map((p) => (
            <button key={p} type="button" aria-pressed={minutes === p} onClick={() => { setValue(String(p)); setDone(false) }}
              className={cn('h-9 rounded-full px-3.5 text-xs font-semibold', minutes === p ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50')}>
              {duration(p)}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="account-minutes" className="mb-1.5 block text-xs font-semibold text-ink">직접 입력 (분)</label>
          <div className="flex items-center gap-2">
            <input id="account-minutes" type="number" inputMode="numeric" min={10} max={1440} step={5} value={value}
              onChange={(e) => { setValue(e.target.value); setDone(false) }} aria-invalid={!valid}
              className="h-11 w-32 rounded-xl border border-line bg-white px-3 text-right text-base font-bold text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-alert" />
            <span className="text-sm text-muted">분{valid && ` = ${duration(minutes)}`}</span>
          </div>
          <p className={cn('mt-1 text-[11px]', !valid || errors.accountMinutes ? 'text-alert' : 'text-muted')}>
            {errors.accountMinutes ?? '10분 ~ 1440분(24시간)'}
          </p>
        </div>

        <ul className="space-y-1.5 rounded-xl bg-panel px-3.5 py-3 text-xs text-ink">
          <li>• 시간은 <b>발급한 순간부터</b> 잽니다.</li>
          <li>• 학생이 응시를 시작하면 <b>시험이 끝날 때까지</b>는 사용 시간이 지나도 끊기지 않습니다.</li>
          <li>• 바꾼 시간은 <b>이후에 발급(다시 발급)하는 계정</b>부터 적용됩니다.</li>
          <li>• 시간이 지난 계정은 결과 화면의 '다시 발급'으로 살릴 수 있습니다.</li>
        </ul>

        {mutation.isError && !errors.accountMinutes && <p role="alert" className="text-xs text-alert">{errorMessage(mutation.error)}</p>}
        <div className="flex items-center justify-end gap-3">
          {done && <span className="flex items-center gap-1 text-xs font-semibold text-brand-700"><Check className="size-3.5" aria-hidden />저장했습니다</span>}
          <button type="submit" disabled={!valid || minutes === saved || mutation.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40">
            {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />} 저장
          </button>
        </div>
      </form>
    </Card>
  )
}

function ActiveAccountsCard() {
  const query = useQuery({ queryKey: ['test-accounts'], queryFn: getActiveTestAccounts, refetchInterval: 60_000 })
  return (
    <Card hoverLift={false} index={1} className="self-start p-0">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[15px] font-bold text-ink">지금 쓸 수 있는 레벨테스트 계정</h2>
        {query.data && <span className="text-xs text-muted">{query.data.length}개</span>}
      </div>
      {query.isError ? (
        <p role="alert" className="px-5 pb-5 text-sm text-alert">{errorMessage(query.error)}</p>
      ) : !query.data ? (
        <div className="mx-5 mb-5 h-32 animate-pulse rounded-xl bg-track" />
      ) : query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
          <UserRoundX className="size-7 text-muted" aria-hidden />
          <p className="text-xs text-muted">지금 로그인할 수 있는 레벨테스트 계정이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-y border-line bg-panel/60 text-[11px] font-semibold text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5">아이디</th>
                <th scope="col" className="px-3 py-2.5">학생</th>
                <th scope="col" className="px-3 py-2.5">상태</th>
                <th scope="col" className="px-5 py-2.5">사용 기한</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {query.data.map((t) => (
                <tr key={t.attemptId}>
                  <td className="px-5 py-2.5 font-mono text-sm font-bold text-ink">{t.loginId}</td>
                  <td className="px-3 py-2.5">
                    <Link to={`/admin/level-tests/${t.attemptId}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{t.studentName}</Link>
                    <span className="ml-1.5 font-mono text-[11px] text-muted">{t.studentCode}</span>
                  </td>
                  <td className="px-3 py-2.5"><AttemptStatusBadge status={t.status} /></td>
                  <td className="px-5 py-2.5 text-xs text-ink tabular-nums">{formatDateTime(t.expiresAt)}까지</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
