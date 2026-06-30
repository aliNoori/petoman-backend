import { ApiProperty } from '@nestjs/swagger';
import {OrderStatus} from "./order-status.enum";


export class OrderListItemDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty()
    totalAmount: number;

    @ApiProperty()
    createdAt: Date;
}