// src/modules/market/products/dto/bulk-delete-variants.dto.ts
import { IsArray, IsString } from 'class-validator';

export class BulkDeleteVariantsDto {
    @IsArray()
    @IsString({ each: true })
    variantIds: string[];
}