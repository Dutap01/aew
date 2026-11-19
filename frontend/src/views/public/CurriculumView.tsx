// 강의 소개 (공개): /curriculum 전체 과정, /curriculum/:slug 레벨별 상세 (반 요일·시간, 회차 커리큘럼)
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarClock, ListOrdered } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getCourses } from '@/api/courses'
import { Card } from '@/components/ui/Card'
import { LEVEL_INFO, levelName, levelSlug } from '@/config/academy'
import type { CourseClass, CourseLevel } from '@/types/course'
import { formatTime, weekdayName } from '@/utils/format'

function useCourses() {
  return useQuery({ queryKey: ['public-courses'], queryFn: getCourses, staleTime: 5 * 60_000 })
}

/** 월·수·금 16:00–17:30 (요일이 같은 시간이면 묶어서) */
function scheduleText(c: CourseClass): string {
  if (c.schedules.length === 0) return '시간 미정'
  const groups = new Map<string, number[]>()
  for (const s of c.schedules) {
    const key = `${formatTime(s.startTime)}–${formatTime(s.endTime)}`
    groups.set(key, [...(groups.get(key) ?? []), s.weekday])
  }
  return [...groups].map(([time, days]) => `${days.map(weekdayName).join('·')} ${time}`).join(' / ')
}

export function CurriculumView() {
  const courses = useCourses()
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">강의 소개</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">레벨테스트 결과에 따라 맞는 과정과 반을 안내해 드립니다.</p>
      <Status query={courses} />
      <div className="space-y-4">
        {courses.data?.map((c, i) => (
          <Card key={c.level} index={i} hoverLift={false}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-lg font-extrabold text-ink">{levelName(c.level)}</h2>
                <p className="text-[11px] text-muted">{LEVEL_INFO[c.level]?.target}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/80">{LEVEL_INFO[c.level]?.summary}</p>
              </div>
              <Link to={`/curriculum/${levelSlug(c.level)}`}
                className="inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-xl bg-track px-3 text-xs font-bold text-ink hover:bg-brand-50 hover:text-brand-800">
                커리큘럼 보기 <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <ClassList classes={c.classes} />
          </Card>
        ))}
      </div>
      <ApplyBanner />
    </>
  )
}

export function CurriculumLevelView() {
  const { slug = '' } = useParams()
  const courses = useCourses()
  const course: CourseLevel | undefined = courses.data?.find((c) => levelSlug(c.level) === slug.toLowerCase())

  return (
    <>
      <Link to="/curriculum" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> 전체 과정
      </Link>
      <Status query={courses} />
      {courses.data && !course && (
        <Card hoverLift={false}><p className="text-sm text-ink">찾는 과정이 없습니다.</p></Card>
      )}
      {course && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{levelName(course.level)}</h1>
          <p className="mt-0.5 text-xs text-muted">{LEVEL_INFO[course.level]?.target}</p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-relaxed text-ink/80">{LEVEL_INFO[course.level]?.summary}</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Card hoverLift={false}>
              <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-ink">
                <CalendarClock className="size-4 text-brand" aria-hidden /> 수업 시간
              </h2>
              <ClassList classes={course.classes} />
            </Card>
            <Card hoverLift={false} index={1}>
              <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-ink">
                <ListOrdered className="size-4 text-brand" aria-hidden /> 회차별 커리큘럼
              </h2>
              {course.curriculum.length === 0 ? (
                <p className="text-sm text-muted">커리큘럼을 준비 중입니다.</p>
              ) : (
                <ol className="space-y-2.5">
                  {course.curriculum.map((item) => (
                    <li key={item.seq} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-800 tabular-nums">
                        {item.seq}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        {item.description && <p className="text-xs text-muted">{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
          <ApplyBanner />
        </>
      )}
    </>
  )
}

function ClassList({ classes }: { classes: CourseClass[] }) {
  if (classes.length === 0) return <p className="mt-3 text-sm text-muted">현재 모집 중인 반이 없습니다.</p>
  return (
    <ul className="mt-3 divide-y divide-line">
      {classes.map((c) => (
        <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
          <span className="text-sm font-bold text-ink">{c.name}</span>
          <span className="text-sm text-ink tabular-nums">{scheduleText(c)}</span>
        </li>
      ))}
    </ul>
  )
}

function ApplyBanner() {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 rounded-card bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-brand-900">어느 반이 맞을지 고민되시나요? 레벨테스트로 정확히 진단해 드립니다.</p>
      <div className="flex gap-2">
        <Link to="/apply/level-test" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-700">레벨테스트 신청</Link>
        <Link to="/apply/consult" className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-brand-800 hover:bg-brand-100">상담 신청</Link>
      </div>
    </div>
  )
}

function Status({ query }: { query: { isPending: boolean; isError: boolean } }) {
  if (query.isPending) return <div className="h-64 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />
  if (query.isError) return <Card hoverLift={false}><p role="alert" className="text-sm text-alert">강의 정보를 불러오지 못했습니다.</p></Card>
  return null
}
