// 학생 본인 주간 시간표: 소속 반의 수업 (반 소속 기간에 맞춰 날짜별로)
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '@/api/errors'
import { getMyStudentTimetable } from '@/api/timetables'
import { Topbar } from '@/components/layout/Topbar'
import { mondayOf, WeekTimetable } from '@/components/timetable/WeekTimetable'
import { Card } from '@/components/ui/Card'
import { todaySeoul } from '@/utils/seoulDate'

export function StudentTimetableView() {
  const [week, setWeek] = useState(() => mondayOf(todaySeoul()))
  const query = useQuery({ queryKey: ['my-timetable', 'student', week], queryFn: () => getMyStudentTimetable(week) })

  return (
    <>
      <Topbar title="내 시간표" />
      <Card hoverLift={false}>
        <WeekTimetable week={week} onWeekChange={setWeek} data={query.data} isLoading={query.isLoading}
          error={query.isError ? errorMessage(query.error, '시간표를 불러오지 못했습니다.') : undefined}
          secondLine={(e) => (e.teacherName ? `${e.teacherName} 선생님` : null)}
          emptyText="이번 주 수업이 없습니다." />
      </Card>
    </>
  )
}
