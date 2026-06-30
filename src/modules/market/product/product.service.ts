import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {DataSource, In, Repository} from 'typeorm';
import {TenantContext} from "../../../tenants/tenant-context.service";
import {MarketProduct, MarketProductStatus} from "./entities/product.entity";
import {ProductTenantCategory} from "./entities/product-category.entity";
import {CreateProductDto} from './dto/create-product.dto';
import {Product, ProductStatus} from "../../../shared/product/product.entity";
import {AttachProductDto} from "./dto/attach-product.dto";
import {InjectRepository} from "@nestjs/typeorm";
import {ProductVariant} from "./entities/product-variant.entity";
import {ProductFeature} from "./entities/product-feature.entity";
import {ProductSpecification} from "./entities/product-specification.entity";
import {I18nService} from "nestjs-i18n";

@Injectable()
export class ProductService {
    constructor(
        private readonly i18n: I18nService,
        private readonly dataSource: DataSource,
        private readonly tenantContext: TenantContext,
        @InjectRepository(ProductVariant)
        private readonly variantRepository: Repository<ProductVariant>,
    ) {}

    /**
     * Create product with validation and secure response
     */
    async createProduct(dto: CreateProductDto, userId: string): Promise<any> {
        const tenantId = this.tenantContext.getTenantId();

        // اعتبارسنجی اولیه
        if (!tenantId) {
            //throw new UnauthorizedException('Tenant context is missing.');
            throw new BadRequestException(
                this.i18n.t('error.product.invalid_tenant')
            );
        }

        return this.dataSource.transaction(async (manager) => {
            try {
                // 1. Create Base Product (Global)
                const baseProduct = manager.create(Product, {
                    tenantId,
                    createdBy: userId, // ثبت کاربر سازنده
                    name: dto.name,
                    code: dto.code,
                    description: dto.description,
                    image: dto.image,
                    galleryImages: dto.galleryImages,
                    brandId: dto.brand,
                    categoryBreadcrumb: dto.categoryBreadcrumb,
                    categoryId: dto.categoryId,
                    categoryIds: dto.categoryIds,
                    type: dto.type,
                    status: ProductStatus.PENDING
                });
                const savedBaseProduct = await manager.save(baseProduct);


                // 2. Create Market Product (Tenant Specific)
                const marketProduct = manager.create(MarketProduct, {
                    tenantId,
                    price: dto.price,
                    discountedPrice: dto.discountedPrice,
                    discountValue: dto.discountValue,
                    discountType: dto.discountType,
                    hasDiscount: dto.hasDiscount,
                    stock: dto.stock,
                    isActive: dto.isActive ?? true,
                    hasExpiryDate: dto.hasExpiryDate,
                    expiryDate: dto.expiryDate,
                    discountStartDate: dto.discountStartDate,
                    discountEndDate: dto.discountEndDate,
                    status: MarketProductStatus.PENDING,
                    product: savedBaseProduct,
                    createdBy: userId
                });
                const savedMarketProduct = await manager.save(marketProduct);

                // 3. Handle Categories
                if (dto.categoryIds?.length) {
                    const categoryEntities = dto.categoryIds.map(catId =>
                        manager.create(ProductTenantCategory, {
                            productId: savedMarketProduct.id,
                            categoryId: catId
                        })
                    );
                    await manager.save(ProductTenantCategory, categoryEntities);
                }

                // 4. Handle Features (Safe handling)
                if (dto.features?.length) {
                    const featureEntities = dto.features.map((text, index) =>
                        manager.create(ProductFeature, {
                            text,
                            sortOrder: index,
                            marketProduct: savedMarketProduct
                        })
                    );
                    await manager.save(ProductFeature, featureEntities);
                }

                // 5. Handle Specifications
                if (dto.specifications?.length) {
                    const specEntities = dto.specifications.map(spec =>
                        manager.create(ProductSpecification, {
                            label: spec.label,
                            value: spec.value,
                            marketProduct: savedMarketProduct
                        })
                    );
                    await manager.save(ProductSpecification, specEntities);
                }

                // Return sanitized response (Only necessary fields)
                return this.formatProductResponse(savedMarketProduct, savedBaseProduct);

            } catch (error) {
                // Log error here if needed
                //throw new BadRequestException('Failed to create product. ' + error.message);
                throw new BadRequestException(
                    this.i18n.t('error.product.create_error')
                );
            }
        });
    }

    /**
     * Update product with ownership and status check
     */
    async updateProduct(id: string, dto: CreateProductDto, userId: string): Promise<any> {
        const tenantId = this.tenantContext.getTenantId();
        const marketRepo = this.dataSource.getRepository(MarketProduct);
        const productRepo = this.dataSource.getRepository(Product);

        const marketProduct = await marketRepo.findOne({
            where: { id, tenantId },
            relations: ['product', 'features', 'specifications']
        });

        if (!marketProduct) {
            throw new BadRequestException(
                this.i18n.translate('error.product.global_product_not_found')
            );
        }

        return this.dataSource.transaction(async (manager) => {
            try {
                // بررسی مالکیت
                const isOwner = marketProduct.product.tenantId === tenantId;

                // ✅ اضافه شدن شرط بررسی وضعیت محصول پایه
                // اگر محصول پایه APPROVED باشد، نمی‌توان اطلاعات پایه را تغییر داد
                const canUpdateBaseProduct = isOwner && marketProduct.product.status !== ProductStatus.APPROVED;

                // Update Base Product (Global Fields) - ONLY if owner AND status is not APPROVED
                if (canUpdateBaseProduct) {
                    Object.assign(marketProduct.product, {
                        name: dto.name,
                        code: dto.code,
                        description: dto.description,
                        image: dto.image,
                        galleryImages: dto.galleryImages,
                        brandId: dto.brand,
                        categoryBreadcrumb: dto.categoryBreadcrumb,
                        categoryId: dto.categoryId,
                        type: dto.type,
                        updatedBy: userId
                    });
                    marketProduct.product.status=ProductStatus.PENDING
                    marketProduct.status=MarketProductStatus.PENDING
                    await productRepo.save(marketProduct.product);
                }

                // Update Market Product (Tenant Fields) - Always allowed for tenant members
                Object.assign(marketProduct, {
                    price: dto.price,
                    discountedPrice: dto.discountedPrice,
                    discountValue: dto.discountValue,
                    discountType: dto.discountType,
                    hasDiscount: dto.hasDiscount,
                    stock: dto.stock,
                    isActive: dto.isActive,
                    hasExpiryDate: dto.hasExpiryDate,
                    expiryDate: dto.expiryDate,
                    discountStartDate: dto.discountStartDate,
                    discountEndDate: dto.discountEndDate,
                    updatedBy: userId
                });
                const savedMarketProduct = await marketRepo.save(marketProduct);

                // Replace Features
                if (marketProduct.features?.length) {
                    await manager.remove(marketProduct.features);
                }
                if (dto.features?.length) {
                    const newFeatures = dto.features.map((text, index) =>
                        manager.create(ProductFeature, {
                            text,
                            sortOrder: index,
                            marketProduct: savedMarketProduct
                        })
                    );
                    await manager.save(ProductFeature, newFeatures);
                }

                // Replace Specifications
                if (marketProduct.specifications?.length) {
                    await manager.remove(marketProduct.specifications);
                }
                if (dto.specifications?.length) {
                    const newSpecs = dto.specifications.map(spec =>
                        manager.create(ProductSpecification, {
                            label: spec.label,
                            value: spec.value,
                            marketProduct: savedMarketProduct
                        })
                    );
                    await manager.save(ProductSpecification, newSpecs);
                }

                return this.formatProductResponse(savedMarketProduct, savedMarketProduct.product);
            } catch (error) {
                throw new BadRequestException(
                    this.i18n.translate('error.product.update_error')
                );
            }
        });
    }

    async updateProductStatus(id: string, isActive: boolean, userId: string): Promise<any> {
        const tenantId = this.tenantContext.getTenantId();
        const marketRepo = this.dataSource.getRepository(MarketProduct);

        const marketProduct = await marketRepo.findOne({
            where: { id, tenantId },
            relations: ['product']
        });

        if (!marketProduct) {
            //throw new NotFoundException('Product not found.');
            throw new BadRequestException(
                this.i18n.t('error.product.global_product_not_found')
            );
        }

        marketProduct.isActive = isActive;
        marketProduct.updatedBy = userId;

        const saved = await marketRepo.save(marketProduct);

        return this.formatProductResponse(saved, saved.product);
    }

    async attachProduct(dto: AttachProductDto, userId: string): Promise<any> {
        const tenantId = this.tenantContext.getTenantId();

        if (!dto.globalProductId) {
            //throw new BadRequestException('Global Product ID is required.');
            throw new BadRequestException(
                this.i18n.t('error.product.global_product_id_required')
            );
        }

        return this.dataSource.transaction(async (manager) => {
            try {
                const baseProduct = await manager.findOne(Product, {
                    where: { id: dto.globalProductId },
                    select: ['id', 'name', 'image', 'galleryImages', 'type', 'code', 'categoryBreadcrumb']
                } as any);

                if (!baseProduct) {
                    //throw new NotFoundException('Global product not found.');
                    throw new BadRequestException(
                        this.i18n.t('error.product.global_product_not_found')
                    );
                }

                // Check for duplicate attachment
                const existing = await manager.findOne(MarketProduct, {
                    where: { tenantId, product: { id: dto.globalProductId } }
                });

                if (existing) {
                    //throw new BadRequestException('This product is already attached to your shop.');
                    throw new BadRequestException(
                        this.i18n.t('error.product.already_attached')
                    );
                }

                const marketProduct = manager.create(MarketProduct, {
                    tenantId,
                    price: dto.price,
                    discountedPrice: dto.discountedPrice,
                    discountValue: dto.discountValue,
                    discountType: dto.discountType,
                    hasDiscount: dto.hasDiscount,
                    stock: dto.stock,
                    isActive: dto.isActive ?? true,
                    hasExpiryDate: dto.hasExpiryDate,
                    expiryDate: dto.expiryDate,
                    discountStartDate: dto.discountStartDate,
                    discountEndDate: dto.discountEndDate,
                    description:dto.description,
                    product: baseProduct,
                    createdBy: userId
                });

                const savedMarketProduct = await manager.save(marketProduct);

                // Attach categories if available from global product
                if (baseProduct.categoryIds?.length) {
                    const categoryEntities = baseProduct.categoryIds.map(catId =>
                        manager.create(ProductTenantCategory, {
                            productId: savedMarketProduct.id,
                            categoryId: catId
                        })
                    );
                    await manager.save(ProductTenantCategory, categoryEntities);
                }

                return await this.formatProductResponse(savedMarketProduct, baseProduct);

            } catch (error) {
                if (error instanceof NotFoundException || error instanceof BadRequestException) {
                    throw error;
                }
                //throw new BadRequestException('Failed to attach product.');
                throw new BadRequestException(
                    this.i18n.t('error.product.failed_to_attach')
                );
            }
        });
    }

    async syncVariants(productId: string, variantsPayload: any[], userId: string): Promise<any> {
        const tenantId = this.tenantContext.getTenantId();

        return this.dataSource.transaction(async (manager) => {
            const marketProductRepo = manager.getRepository(MarketProduct);
            const variantRepo = manager.getRepository(ProductVariant);

            const product = await marketProductRepo.findOne({
                where: { id: productId, tenantId },
                relations: ['variants']
            });

            if (!product) {
                //throw new NotFoundException('Product not found or access denied.');
                throw new BadRequestException(
                    this.i18n.t('error.forbidden')
                );
            }

            const currentVariants = product.variants || [];
            const newVariantsData = variantsPayload.filter((v: any) => !v.id);
            const updatedVariantsData = variantsPayload.filter((v: any) => v.id);
            const deletedVariantIds = currentVariants
                .filter((cv: any) => !variantsPayload.find((nv: any) => nv.id === cv.id))
                .map((cv: any) => cv.id);

            // Delete
            if (deletedVariantIds.length > 0) {
                await variantRepo.delete(deletedVariantIds);
            }

            // Create
            const savedNewVariants: ProductVariant[] = [];
            for (const v of newVariantsData) {
                const newVariant = variantRepo.create({
                    name: v.name,
                    attributes: v.attributes || {},
                    price: v.price,
                    stock: v.stock,
                    isActive: v.isActive ?? true,
                    image: v.image,
                    marketProduct: product,
                    createdBy: userId
                });
                const saved = await variantRepo.save(newVariant);
                savedNewVariants.push(saved);
            }

            // Update
            const savedUpdatedVariants: ProductVariant[] = [];
            for (const v of updatedVariantsData) {
                const existing = currentVariants.find((cv: any) => cv.id === v.id);
                if (existing) {
                    existing.name = v.name;
                    existing.attributes = v.attributes || {};
                    existing.price = v.price;
                    existing.stock = v.stock;
                    existing.isActive = v.isActive ?? true;
                    if (v.image) existing.image = v.image;
                    existing.updatedBy = userId;

                    const saved = await variantRepo.save(existing);
                    savedUpdatedVariants.push(saved);
                }
            }

            return [...savedNewVariants, ...savedUpdatedVariants]
        });
    }

    async getProducts(userId: string): Promise<any[]> {
        const tenantId = this.tenantContext.getTenantId();
        const marketRepo = this.dataSource.getRepository(MarketProduct);

        const marketProducts = await marketRepo.find({
            where: {
                tenantId,
                status: In([MarketProductStatus.APPROVED, MarketProductStatus.NEEDS_REVISION, MarketProductStatus.PENDING])
            },
            relations: [
                'product.brand',
                'product.category',
                'variants',
                'features',
                'specifications',
                'tenant'
            ],
            order: { createdAt: 'DESC' },
            // Optimization: Select only needed columns if possible, but relations make it complex.
            // Consider creating a View or DTO projection for large datasets.
        });

        return marketProducts.map(mp => this.formatProductResponse(mp, mp.product));
    }

    async getGlobalProducts(userId: string): Promise<any[]> {
        const productRepo = this.dataSource.getRepository(Product);
        return productRepo.find({
            where: { status: ProductStatus.APPROVED },
            order: { createdAt: 'DESC' }
        });
    }

    async deleteProduct(id: string, userId: string): Promise<void> {
        const tenantId = this.tenantContext.getTenantId();
        const repository = this.dataSource.getRepository(MarketProduct);

        const result = await repository.delete({ id, tenantId });

        if (result.affected === 0) {
            //throw new NotFoundException('Product not found or access denied.');
            throw new BadRequestException(
                this.i18n.t('error.forbidden')
            );
        }
    }

    async deleteFeature(productId: string, featureId: string, userId: string): Promise<void> {
        const tenantId = this.tenantContext.getTenantId();
        const marketRepo = this.dataSource.getRepository(MarketProduct);
        const featureRepo = this.dataSource.getRepository(ProductFeature);

        const marketProduct = await marketRepo.findOne({
            where: { id: productId, tenantId }
        });

        if (!marketProduct) {
            //throw new NotFoundException('Product not found.');
            throw new BadRequestException(
                this.i18n.t('error.not_found')
            );
        }

        const feature = await featureRepo.findOne({
            where: { id: featureId, marketProductId: productId }
        });

        if (!feature) {
            //throw new NotFoundException('Feature not found.');
            throw new BadRequestException(
                this.i18n.t('error.not_found')
            );
        }

        await featureRepo.remove(feature);
    }

    /**
     * Helper to format response securely
     */
    private formatProductResponse(marketProduct: MarketProduct, baseProduct: Product): any {
        return {
            id: marketProduct.id,
            tenantId: marketProduct.tenantId,
            // Market/Product Specifics
            price: marketProduct.price,
            stock: marketProduct.stock,
            isActive: marketProduct.isActive,
            hasDiscount: marketProduct.hasDiscount,
            discountValue: marketProduct.discountValue,
            discountType: marketProduct.discountType,
            discountedPrice: marketProduct.discountedPrice,
            hasExpiryDate: marketProduct.hasExpiryDate,
            expiryDate: marketProduct.expiryDate,
            discountStartDate: marketProduct.discountStartDate,
            discountEndDate: marketProduct.discountEndDate,
            averageRating: marketProduct.averageRating,
            reviewsCount: marketProduct.reviewsCount,
            status: marketProduct.status,
            description: marketProduct.description,
            createdAt: marketProduct.createdAt,
            updatedAt: marketProduct.updatedAt,
            // Base Product Info
            name: baseProduct.name,
            code: baseProduct.code,
            image: baseProduct.image,
            galleryImages: baseProduct.galleryImages,
            brand: baseProduct.brand,
            categoryBreadcrumb: baseProduct.categoryBreadcrumb,
            category: baseProduct.category,
            categoryId: baseProduct.categoryId,
            type: baseProduct.type,
            // Relations
            variants: marketProduct.variants,
            features: marketProduct.features,
            specifications: marketProduct.specifications
        };
    }
}