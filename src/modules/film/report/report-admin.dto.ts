import { ReportEntity} from "./report.entity";

export class ReportAdminDto {
    id: string
    reporter: string
    reason: string
    reportType: string
    targetTitle: string
    status: 'pending' | 'resolved' | 'dismissed' | 'assigned'
    date: string

    static fromEntity(entity: ReportEntity): ReportAdminDto {
        return {
            id: entity.id,
            reporter: entity.userId ? 'کاربر ثبت‌شده' : 'مهمان',
            reason: entity.description,
            reportType: entity.problemType,
            targetTitle: `${entity.mediaType} (${entity.mediaId})`,
            status: entity.status,
            // date: entity.createdAt.toLocaleString('fa-IR'),
            //date: entity.createdAt.toLocaleDateString(),
            date: entity.createdAt.toISOString(),
        }
    }
}