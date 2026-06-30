import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentSetting } from './payment-setting.entity';
import { PaymentSettingService } from './payment-setting.service';
import { PaymentSettingController } from './payment-setting.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PaymentSetting])],
    controllers: [PaymentSettingController],
    providers: [PaymentSettingService],
    exports: [PaymentSettingService],
})
export class PaymentSettingModule {}
