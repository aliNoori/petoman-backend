import { PartialType} from '@nestjs/swagger';
import {CreateRequestTenantDto} from "./create-request-tenant.dto";


export class UpdateRequestTenantDto extends PartialType(CreateRequestTenantDto){}