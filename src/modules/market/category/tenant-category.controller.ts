import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CreateTenantCategoryDto} from "./dto/create-tenant-category.dto";
import {JwtAuthGuard} from "../../../shared/auth/guards/jwt-auth.guard";
import {TenantCategoryService} from "./tenant-category.service";
import {AdminGuard} from "../../../shared/auth/guards/admin-guard";
import {Permissions} from "../../../shared/auth/decorators/permissions.decorator";
import {BlacklistGuard} from "../../../shared/auth/guards/blacklist.guard";

@ApiTags('Market / Categories')
@ApiBearerAuth()

@UseGuards(JwtAuthGuard,BlacklistGuard)
@Permissions('tenant.manage')

@Controller('market/categories')

export class TenantCategoryController {

    constructor(
        private readonly categoryService: TenantCategoryService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create new category' })
    @UseGuards(AdminGuard)
    create(@Body() dto: CreateTenantCategoryDto) {
        return this.categoryService.createCategory(dto);
    }

    @Get('/list')
    @ApiOperation({ summary: 'Get all categories for tenant' })
    findAll() {
        return this.categoryService.getCategories();
    }

}
