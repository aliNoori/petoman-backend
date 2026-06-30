import {
    Injectable,
} from '@nestjs/common';
import {Tenant} from "../../core/entities/tenant.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";


@Injectable()
export class PharmacyService {
    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>
    ) {
    }

    /**
     * Retrieve tenants (shop)
     */
    async getTenant(tenantId: string): Promise<Tenant|null> {
        return this.tenantRepo.findOne({
            where: {id: tenantId}
        });
    }

}