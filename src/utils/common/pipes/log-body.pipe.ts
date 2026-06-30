// src/common/pipes/log-body.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class LogBodyPipe implements PipeTransform {
    transform(value: any) {
        console.log('📥 ورودی خام به کنترلر:', value);
        return value; // حتماً مقدار رو برگردون تا به مرحله بعدی بره
    }
}
