import { KindnessType, KindnessStatus, TimerType } from '../kindness-meeting.entity'

export class KindnessMeetingResponseDto {
    id: string
    type: KindnessType
    image?: string
    title: string
    description: string
    goal?: number
    current?: number
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    location?: string
    eventDate?: string
    eventTime?: string
    manager: string
    status: KindnessStatus
    category?: string
    showOnHomepage: boolean
    showTimer: boolean
    timerType?: TimerType
    timerAlert: boolean
    alertDays?: number
    createdAt: Date
    updatedAt: Date

    // فیلد محاسبه‌شده
    duration?: string
}