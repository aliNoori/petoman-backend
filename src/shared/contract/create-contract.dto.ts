import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ContractStatus} from "../../core/entities/contract.entity";

export class CreateContractDto {
    @ApiProperty({ example: 'uuid-of-tenant-request' })
    @IsUUID()
    tenantRequestId: string;

    @ApiProperty({ example: { amount: 1000000, duration: 12 } })
    @IsObject()
    @IsOptional()
    contractData?: any;
}

export class UpdateContractStatusDto {
    @ApiProperty({ example: 'signed' })
    @IsEnum(ContractStatus)
    status: ContractStatus;

    @ApiProperty({ required: false, example: 'URL of signed file' })
    @IsString()
    @IsOptional()
    signedDocumentUrl?: string;

    @ApiProperty({ required: false, example: 'Reason for rejection' })
    @IsString()
    @IsOptional()
    rejectionReason?: string;
}