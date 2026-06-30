import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractController} from "./contract.controller";
import { ContractService} from "./contract.service";
import { TenantRequest} from "../request/entities/tenant-request.entity";
import {Contract} from "../../core/entities/contract.entity";
import {User} from "../user/entities/user.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([Contract, TenantRequest, User]),
    ],
    controllers: [ContractController],
    providers: [ContractService],
    exports: [ContractService],
})
export class ContractModule {}