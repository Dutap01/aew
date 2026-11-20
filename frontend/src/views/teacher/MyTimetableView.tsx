// 강사 본인 주간 시간표: 담당하는 운영 중 반의 수업
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '@/api/errors'
import { getMyTeacherTimetable } from '@/api/timetables'
import { Topbar } from '@/components/layout/Topbar'
import { mondayOf, WeekTimetable } from '@/components/timetable/WeekTimetable'
import { Card } from '@/components/ui/Card'
import { todaySeoul } from '@/utils/seoulDate'

export function TeacherTimetableView() {
  const [week, setWeek] = useState(() => mondayOf(todaySeoul()))
  const query = useQuery({ queryKey: ['my-timetable', 'teacher', week], queryFn: () => getMyTeacherTimetable(week) })

  return (
    <>
      <Topbar title="내 시간표" />
      <Card hoverLift={false}>
        <WeekTimetable week={week} onWeekChange={setWeek} data={query.data} isLoading={query.isLoading}
          error={query.isError ? errorMessage(query.error, '시간표를 불러오지 못했습니다.') : undefined}
          secondLine={(e) => (e.studentCount !== null ? `학생 ${e.studentCount}명` : null)}
          emptyText="담당하는 반 수업이 없습니다. 반 배정은 대표에게 문의하세요." />
      </Card>
    </>
  )
}
