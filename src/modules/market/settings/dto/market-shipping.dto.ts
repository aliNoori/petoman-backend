import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray } from "class-validator";

export class ShippingMethodDto {
    @ApiProperty({ example: 'petomanCourier' })
    @IsString()
    type: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    isActive: boolean;

    @ApiPropertyOptional({ example: '1 تا 2 ساعت' })
    @IsString()
    @IsOptional()
    deliveryTime?: string;

    @ApiPropertyOptional({ example: 40000 })
    @IsNumber()
    @IsOptional()
    price?: number;
}

export class UpdateShippingDto {
    @ApiProperty({ type: [ShippingMethodDto] })
    @IsArray()
    methods: ShippingMethodDto[];
}