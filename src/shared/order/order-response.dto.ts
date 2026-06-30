import { ApiProperty } from '@nestjs/swagger';
import {OrderType} from "./order-type.enum";
import {OrderStatus} from "./order-status.enum";


export class OrderItemResponseDto {
    @ApiProperty()
    productId: string;

    @ApiProperty()
    price: number;

    @ApiProperty()
    quantity: number;
}

export class OrderResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: OrderType })
    type: OrderType;

    @ApiProperty({ enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty()
    totalAmount: number;

    @ApiProperty({ required: false })
    note?: string;

    @ApiProperty({ type: [OrderItemResponseDto] })
    items: OrderItemResponseDto[];

    @ApiProperty()
    createdAt: Date;
}
