import { PartialType} from '@nestjs/swagger';

import {CreateRequestShopDto} from "./create-request-shop.dto";

export class UpdateRequestShopDto extends PartialType(CreateRequestShopDto){}