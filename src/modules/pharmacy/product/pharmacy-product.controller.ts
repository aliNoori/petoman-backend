import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { PharmacyProductService } from './pharmacy-product.service';
import { CreateProductDto } from '../../market/product/dto/create-product.dto';
import { AttachProductDto} from "../../market/product/dto/attach-product.dto";
import { BulkCreateVariantsDto } from '../../market/product/dto/create-variant.dto';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../../../shared/auth/guards/tenant-membership.guard';
import { CapabilityGuard } from '../../../shared/auth/guards/capability.guard';
import { Permissions } from '../../../shared/auth/decorators/permissions.decorator';
import { TenantGuard } from '../../../shared/auth/guards/tenant.guard';
import { Capabilities } from '../../../shared/auth/decorators/capabilities.decorator';
import { CurrentUser } from '../../../shared/auth/guards/current-user.decorator';
import { User } from '../../../shared/user/entities/user.entity';
import { I18nService } from 'nestjs-i18n';

@ApiTags('Pharmacy / Products')
@ApiBearerAuth()
@Controller('pharmacy/products')
@UseGuards(JwtAuthGuard, TenantMembershipGuard, TenantGuard, CapabilityGuard)
@Capabilities('PRODUCT_MANAGEMENT')
@Permissions('products.manage')
export class PharmacyProductController {
    constructor(
        private readonly i18n: I18nService,
        private readonly productService: PharmacyProductService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a new product' })
    @ApiCreatedResponse({
        description: 'Product created successfully.',
        schema: {
            example: {
                statusCode: 201,
                message: 'Product created successfully.',
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Pharmacy Product Name',
                    price: 150000
                }
            }
        }
    })
    @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
    @ApiUnauthorizedResponse({ description: 'Authentication required.' })
    @ApiForbiddenResponse({ description: 'Access denied.' })
    @HttpCode(HttpStatus.OK)
    async create(
        @Body() dto: CreateProductDto,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.createProduct(dto, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.create_success'),
            data: data
        };
    }

    @Post('attach')
    @ApiOperation({ summary: 'Attach an existing global product to the current tenant' })
    @ApiCreatedResponse({
        description: 'Product attached successfully.',
        schema: {
            example: {
                statusCode: 201,
                message: 'Product attached successfully.',
                data: {
                    productId: '550e8400-e29b-41d4-a716-446655440000',
                    tenantId: '550e8400-e29b-41d4-a716-446655440001'
                }
            }
        }
    })
    @ApiBadRequestResponse({ description: 'Invalid global product ID or data.' })
    @HttpCode(HttpStatus.OK)
    async attach(
        @Body() dto: AttachProductDto,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.attachProduct(dto, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.attach_success'),
            data: data
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an existing product' })
    @ApiOkResponse({
        description: 'Product updated successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Product updated successfully.',
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Updated Product Name',
                    price: 180000
                }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Product not found.' })
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() dto: CreateProductDto,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.updateProduct(id, dto, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.update_success'),
            data: data
        };
    }

    @Post(':id/variants/sync')
    @ApiOperation({ summary: 'Synchronize variants for a specific product' })
    @ApiCreatedResponse({
        description: 'Variants synchronized successfully.',
        schema: {
            example: {
                statusCode: 201,
                message: 'Variants synced successfully.',
                data: {
                    count: 5,
                    productId: '550e8400-e29b-41d4-a716-446655440000'
                }
            }
        }
    })
    @ApiBadRequestResponse({ description: 'Invalid variant data structure.' })
    @HttpCode(HttpStatus.OK)
    async syncVariants(
        @Param('id') id: string,
        @Body() bulkVariantsDto: BulkCreateVariantsDto,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.syncVariants(id, bulkVariantsDto.variants, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.sync_variants_success'),
            data: data
        };
    }

    @Patch('update-status/:id')
    @ApiOperation({ summary: 'Update product active/inactive status' })
    @ApiOkResponse({
        description: 'Product status updated successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Status updated successfully.',
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    isActive: true
                }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Product not found.' })
    @HttpCode(HttpStatus.OK)
    async updateStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.updateProductStatus(id, isActive, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.status_update_success'),
            data: data
        };
    }

    @Get()
    @ApiOperation({ summary: 'Retrieve all products for the current tenant' })
    @ApiOkResponse({
        description: 'List of products retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Products retrieved successfully.',
                data: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        name: 'Product 1',
                        price: 100000,
                        isActive: true
                    },
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        name: 'Product 2',
                        price: 200000,
                        isActive: false
                    }
                ]
            }
        }
    })
    @ApiUnauthorizedResponse({ description: 'Authentication required.' })
    @HttpCode(HttpStatus.OK)
    async findAll(@CurrentUser() user: User) {
        const data = await this.productService.getProducts(user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.list_success'),
            data: data
        };
    }

    @Get('global')
    @ApiOperation({ summary: 'Retrieve all global products (Admin/Global view)' })
    @ApiOkResponse({
        description: 'List of global products retrieved successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Global products retrieved successfully.',
                data: []
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async findAllGlobalProducts(@CurrentUser() user: User) {
        const data = await this.productService.getGlobalProducts(user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.global_list_success'),
            data: data
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a product' })
    @ApiOkResponse({
        description: 'Product deleted successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Product deleted successfully.',
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440000'
                }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Product not found.' })
    @HttpCode(HttpStatus.OK)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.deleteProduct(id, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.delete_success'),
            data: data
        };
    }

    @Delete(':productId/features/:featureId')
    @ApiOperation({ summary: 'Remove a specific feature from a product' })
    @ApiOkResponse({
        description: 'Feature removed successfully.',
        schema: {
            example: {
                statusCode: 200,
                message: 'Feature removed successfully.',
                data: {
                    productId: '550e8400-e29b-41d4-a716-446655440000',
                    featureId: '550e8400-e29b-41d4-a716-446655440001'
                }
            }
        }
    })
    @ApiNotFoundResponse({ description: 'Product or feature not found.' })
    @HttpCode(HttpStatus.OK)
    async removeFeature(
        @Param('productId') productId: string,
        @Param('featureId') featureId: string,
        @CurrentUser() user: User
    ) {
        const data = await this.productService.deleteFeature(productId, featureId, user.id);
        return {
            statusCode: HttpStatus.OK,
            message: this.i18n.translate('product.feature_remove_success'),
            data: data
        };
    }
}