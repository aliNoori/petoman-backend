import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Documentary} from "./documentary.entity";
import {DocumentaryController} from "./documentary.controller";
import {DocumentaryService} from "./documentary.service";

@Module({
    imports: [TypeOrmModule.forFeature([Documentary])],
    controllers: [DocumentaryController],
    providers: [DocumentaryService],
})
export class DocumentationModule {}
