import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Tenant} from "../../../core/entities/tenant.entity";
import {Repository} from "typeorm";

@Injectable()
export class ShopService {
    constructor(
        @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,

    ) {}
    /**
     * Retrieve all tenants (shops)
     */
    async findAll(): Promise<Tenant[]> {
        return this.tenantRepo.find({
            where:{status:'active'},
            relations: ['tenantUsers','reviews.user','marketProducts.reviews',
                'marketProducts.product','marketProducts.product.brand',
                'marketProducts.features','marketProducts.specifications']
            // select: ['id', 'name', 'type']
        });
    }

}