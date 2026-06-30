import {
    Controller,
    Get,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {UserTenantCategoryService} from "./user-tenant-category.service";


@ApiTags('Market / Categories')
@ApiBearerAuth()
@Controller('user/market/categories')

export class UserTenantCategoryController {
    constructor(
        private readonly categoryService: UserTenantCategoryService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all categories for tenant' })
    findAll() {
        return this.categoryService.getCategories();
    }

    @Get('/with-products')
    @ApiOperation({ summary: 'Get all categories with products' })
    findAllWithMarketProduct() {
        return this.categoryService.getCategoryWithProducts();
    }
}
