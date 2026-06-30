import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Donation} from "./donation.entity";
import {DonationController} from "./donation.controller";
import {DonationService} from "./donation.service";

@Module({
    imports: [TypeOrmModule.forFeature([Donation])],
    controllers: [DonationController],
    providers: [DonationService],
})
export class DonationModule {}
