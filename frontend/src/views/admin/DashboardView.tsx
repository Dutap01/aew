import { useEffect, useState } from 'react'
import { getDashboardData } from '@/api/dashboard'
import { ClassDonutCard } from '@/components/dashboard/ClassDonutCard'
import { ClassTable } from '@/components/dashboard/ClassTable'
import { EnrollmentCard } from '@/components/dashboard/EnrollmentCard'
import { HomeworkBarCard } from '@/components/dashboard/HomeworkBarCard'
import { RecentReports } from '@/components/dashboard/ReportDocCard'
import { TeacherActivity } from '@/components/dashboard/TeacherActivity'
import { TodayTasks } from '@/components/dashboard/TodayTasks'
import { TrendChartCard } from '@/components/dashboard/TrendChartCard'
import { Topbar } from '@/components/layout/Topbar'
import type { DashboardData } from '@/types/dashboard'

// 3열(≥1280px) → 2열(≥1024px, 오른쪽 열은 아래로 내려가 2열로 펼침) → 1열
const GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.95fr)]'
const COLUMN = 'flex min-w-0 flex-col gap-4'

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getDashboardData()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <Topbar title="대시보드" />
      {error ? (
        <p role="alert" className="rounded-card bg-white p-6 text-sm text-alert shadow-card">
          데이터를 불러오지 못했습니다: {error}
        </p>
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        // 카드 순번(index)은 화면에서 위→아래, 왼→오 순서로 0.05s 간격 stagger
        <div className={GRID}>
          <div className={COLUMN}>
            <TrendChartCard data={data.trend} index={0} />
            <ClassDonutCard data={data.composition} index={3} />
          </div>

          <div className={COLUMN}>
            <RecentReports reports={data.reports} index={1} />
            <EnrollmentCard data={data.enrollment} index={4} />
            <ClassTable rows={data.classes} index={6} />
          </div>

          <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
            <div className="lg:row-span-2 xl:row-span-1">
              <TodayTasks tasks={data.tasks} index={2} />
            </div>
            <TeacherActivity teachers={data.teachers} index={5} />
            <HomeworkBarCard data={data.homework} index={7} />
          </div>
        </div>
      )}
    </>
  )
}

function DashboardSkeleton() {
  const block = 'animate-pulse rounded-card bg-white/80 shadow-card motion-reduce:animate-none'
  return (
    <div className={GRID} aria-busy="true" aria-label="대시보드 불러오는 중">
      <div className={COLUMN}>
        <div className={`${block} h-80`} />
        <div className={`${block} h-64`} />
      </div>
      <div className={COLUMN}>
        <div className={`${block} h-44`} />
        <div className={`${block} h-80`} />
      </div>
      <div className={`${COLUMN} lg:col-span-2 xl:col-span-1`}>
        <div className={`${block} h-72`} />
        <div className={`${block} h-44`} />
      </div>
    </div>
  )
}
