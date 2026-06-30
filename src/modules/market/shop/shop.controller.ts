import {ApiBearerAuth, ApiTags} from "@nestjs/swagger";
import {Controller, Get} from "@nestjs/common";
import {ShopService} from "./shop.service";


@ApiTags('Market / Shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopController {
    constructor(
        private readonly shopService: ShopService
    ) {
    }

    @Get()
    async findAll() {
        return this.shopService.findAll();
    }




}