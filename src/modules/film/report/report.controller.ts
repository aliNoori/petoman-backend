import {
    Body,
    Controller, Delete,
    Get, Param, Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common'
import { ReportService } from './report.service'
import { CreateReportDto} from "./create-report.dto";

@Controller('reports')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Post()
    // @UseGuards(JwtAuthGuard,BlacklistGuard)
    async createReport(
        @Body() dto: CreateReportDto,
        @Req() req: any,
    ) {
        const userId = req.user?.id // اگر لاگین داری
        await this.reportService.create(dto, userId)

        return {
            message: 'گزارش با موفقیت ثبت شد',
        }
    }

    @Get()
    // فقط ادمین
    async getAllReports() {
        return this.reportService.findAll()
    }

    @Patch(':id/status')
    async updateReportStatus(
        @Param('id') id: string,
        @Body('status') status: 'pending' | 'resolved' | 'dismissed'
    ) {
        return this.reportService.changeStatus(id, status);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.reportService.remove(id);
    }
}
