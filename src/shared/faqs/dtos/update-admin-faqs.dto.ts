import { PartialType } from '@nestjs/swagger';
import {CreateAdminFaqDto} from "./create-admin-faqs.dto";

export class UpdateAdminFaqDto extends PartialType(CreateAdminFaqDto) {}