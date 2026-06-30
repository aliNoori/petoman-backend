import { PartialType } from '@nestjs/mapped-types';
import {CreateDanimPostDto} from "./create-danim-post.dto";

export class UpdateDanimPostDto extends PartialType(CreateDanimPostDto) {}
