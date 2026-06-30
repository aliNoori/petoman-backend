
import { Injectable } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';

export interface ParsedDeviceInfo {
    os: string;
    browser: string;
    device: string; // Mobile, Tablet, Desktop, SmartTV, etc.
    engine: string;
}

@Injectable()
export class DeviceDetectorService {
    /**
     * پارس کردن رشته User-Agent و استخراج اطلاعات دقیق
     */
    parse(userAgent: string): ParsedDeviceInfo {
        if (!userAgent || userAgent === 'unknown') {
            return {
                os: 'Unknown',
                browser: 'Unknown',
                device: 'Unknown',
                engine: 'Unknown',
            };
        }

        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        return {
            // سیستم‌عامل (مثلاً: Windows 10, iOS 14.0)
            os: result.os.name || result.os.version ? `${result.os.name} ${result.os.version || ''}`.trim() || 'Unknown' : 'Unknown',

            // مرورگر (مثلاً: Chrome 91.0)
            browser: result.browser.name || result.browser.version ? `${result.browser.name} ${result.browser.version || ''}`.trim() || 'Unknown' : 'Unknown',

            // نوع دستگاه
            device: result.device.type ? result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1) : 'Unknown',

            // موتور رندر (مثلاً: Blink, WebKit)
            engine: result.engine.name || 'Unknown',
        };
    }
}