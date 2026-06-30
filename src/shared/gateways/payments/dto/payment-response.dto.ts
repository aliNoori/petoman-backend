import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
    @ApiProperty({ example: 'ORD-12345' })
    orderId: string;

    @ApiProperty({
        description: 'URL for online payment or null if wallet payment',
        example: 'https://bank.com/pay?id=xyz',
        nullable: true,
    })
    paymentUrl: string | null;

    @ApiProperty({ example: 'pending' })
    status: string;
}