import {
    Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards
} from '@nestjs/common';
import {
    ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse,
    ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse
} from '@nestjs/swagger';
import {PharmacyMedicineService} from './pharmacy-medicine.service';
import {CreatePharmacyMedicineDto} from './dto/create-pharmacy-medicine.dto';
import {UpdatePharmacyMedicineDto} from './dto/update-pharmacy-medicine.dto';
import {AttachMedicineDto} from "./dto/attach-medicine.dto";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {TenantMembershipGuard} from "../../../shared/auth/guards/tenant-membership.guard";
import {TenantGuard} from "../../../shared/auth/guards/tenant.guard";
import {CapabilityGuard} from "../../../shared/auth/guards/capability.guard";
import {Capabilities} from "../../../shared/auth/decorators/capabilities.decorator";
import {Permissions} from "../../../shared/auth/decorators/permissions.decorator";
import {CurrentUser} from "../../../shared/auth/guards/current-user.decorator";
import {User} from "../../../shared/user/entities/user.entity";
import {I18nService} from 'nestjs-i18n';

@ApiTags('Pharmacy / Medicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantMembershipGuard, TenantGuard, CapabilityGuard)
//@Capabilities('PHARMACY_MANAGEMENT')//TODO:add this capability
@Capabilities('PRODUCT_MANAGEMENT')
//@Permissions('medicines.manage')//TODO:add this permission
@Permissions('products.manage')
@Controller('pharmacy/medicines')
export class PharmacyMedicineController {
    constructor(
        private readonly pharmacyMedicineService: PharmacyMedicineService,
        private readonly i18n: I18nService
    ) {
    }

    @Get()
    @ApiOperation({summary: 'Retrieve all medicines for the current pharmacy'})
    @ApiOkResponse({
        description: 'List of medicines retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'لیست داروهای داروخانه با موفقیت دریافت شد.',
                data: []
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async findAllMedicine(@CurrentUser() user: User) {
        // ✅ الگوی یکپارچه
        const data = await this.pharmacyMedicineService.findAllMedicine(user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('pharmacy.list_success'),
            data: data
        };
    }

    @Get('global/global-medicines')
    @ApiOperation({summary: 'Retrieve all global medicines'})
    @ApiOkResponse({
        description: 'List of global medicines retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'لیست داروهای سراسری با موفقیت دریافت شد.',
                data: []
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async findAllGlobalMedicine(@CurrentUser() user: User) {
        const data = await this.pharmacyMedicineService.findAllGlobalMedicine(user.id);

        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('pharmacy.global_list_success'),
            data: data
        };
    }

    @Get(':medicineId')
    @ApiOperation({summary: 'Retrieve a specific medicine by ID'})
    @ApiParam({name: 'medicineId', description: 'شناسه رکورد داروخانه'})
    @ApiOkResponse({
        description: 'Medicine details retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'اطلاعات دارو با موفقیت دریافت شد.',
                data: {}
            }
        }
    })
    @ApiNotFoundResponse({description: 'Medicine not found.'})
    @HttpCode(HttpStatus.OK)
    async findOneMedicine(
        @Param('medicineId') medicineId: string,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای جزئیات
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('pharmacy.detail_success'),
            data: await this.pharmacyMedicineService.findOneMedicine(medicineId, user.id)
        };
    }

    @Post()
    @ApiOperation({summary: 'Add a new medicine to the pharmacy'})
    @ApiCreatedResponse({
        description: 'Medicine added successfully.',
        schema: {
            example: {
                statusCode: 200, // طبق درخواست شما 200 است
                message: 'دارو با موفقیت به داروخانه اضافه شد.',
                data: {}
            }
        }
    })
    @ApiBadRequestResponse({description: 'Invalid input data.'})
    @HttpCode(HttpStatus.OK)
    async create(
        @Body() createDto: CreatePharmacyMedicineDto,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای ایجاد
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('pharmacy.create_success'),
            data: await this.pharmacyMedicineService.create(createDto, user.id)
        };
    }

    @Post('/new/attach')
    @ApiOperation({summary: 'Attach existing global medicine to tenant'})
    @ApiCreatedResponse({
        description: 'Medicine attached successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'داروی سراسری با موفقیت متصل شد.',
                data: {}
            }
        }
    })
    @ApiBadRequestResponse({description: 'Invalid medicine ID or data.'})
    @HttpCode(HttpStatus.OK)
    async attach(
        @Body() dto: AttachMedicineDto,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای اتصال
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('pharmacy.attach_success'),
            data: await this.pharmacyMedicineService.attachMedicine(dto, user.id)
        };
    }

    @Patch(':id')
    @ApiOperation({summary: 'Update medicine information (price, stock, etc.)'})
    @ApiParam({name: 'id', description: 'شناسه رکورد داروخانه'})
    @ApiOkResponse({
        description: 'Medicine updated successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'اطلاعات دارو با موفقیت به‌روزرسانی شد.',
                data: {}
            }
        }
    })
    @ApiNotFoundResponse({description: 'Medicine not found.'})
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdatePharmacyMedicineDto,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای ویرایش
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('pharmacy.update_success'),
            data: await this.pharmacyMedicineService.update(id, updateDto, user.id)
        };
    }

    @Patch('update-status/:id')
    @ApiOperation({summary: 'Update medicine active/inactive status'})
    @ApiOkResponse({
        description: 'Medicine status updated successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'وضعیت دارو تغییر کرد.',
                data: {}
            }
        }
    })
    @ApiNotFoundResponse({description: 'Medicine not found.'})
    @HttpCode(HttpStatus.OK)
    async updateStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای تغییر وضعیت
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('pharmacy.status_update_success'),
            data: await this.pharmacyMedicineService.updateMedicineStatus(id, isActive, user.id)
        };
    }

    @Delete(':id')
    @ApiOperation({summary: ''})
    @ApiParam({name: 'id', description: 'شناسه رکورد داروخانه'})
    @ApiOkResponse({
        description: 'Medicine deleted successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'دارو با موفقیت حذف شد.',
                data: {}
            }
        }
    })
    @ApiNotFoundResponse({description: 'Medicine not found.'})
    @HttpCode(HttpStatus.OK)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        // ✅ الگوی یکپارچه برای حذف
        return {
            statusCode: HttpStatus.OK,
            message: await this.i18n.translate('pharmacy.delete_success'),
            data: await this.pharmacyMedicineService.remove(id, user.id)
        };
    }
}