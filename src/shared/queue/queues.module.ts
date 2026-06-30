import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bull';

@Module({
    imports: [
        BullModule.registerQueue(
            {name: 'send-sms'},
            {name: 'wallet-settlement'},
            {name:'notifications'},
            {name:'cleanup'},
            {name:'payment-reconciliation'}
            // هر صف دیگری که دارید اینجا اضافه کنید
        ),
    ],
    exports: [
        BullModule, // صادر کردن BullModule تا ماژول‌های دیگر بتوانند از آن استفاده کنند
    ],
})
export class QueuesModule {
}