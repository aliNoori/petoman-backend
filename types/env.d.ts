declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: 'development' | 'production' | 'test';
        // بقیه متغیرهای محیطی که داری
        IPPANEL_API_KEY?: string;
        IPPANEL_ORIGINATOR?: string;
        IPPANEL_BASE_URL?: string;
        IPPANEL_PATTERN_CODE?: string;
    }
}
