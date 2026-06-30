export enum OrderStatus {
    CART = 'CART',
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    REJECTED = 'REJECTED',
    CONFIRMED = 'CONFIRMED',
    IN_QUEUE = 'IN_QUEUE',
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    ////FSM order status
    CUSTOMER_PENDING = 'CUSTOMER_PENDING',           // ایجاد شده، منتظر پرداخت
    CUSTOMER_PAID = 'CUSTOMER_PAID',                 // پرداخت موفق
    TENANT_PROCESSING = 'TENANT_PROCESSING',     // در حال آماده‌سازی (تایید فروشنده)
    TENANT_SHIPPED = 'TENANT_SHIPPED',           // ارسال شده به مقصد
    CUSTOMER_DELIVERED = 'CUSTOMER_DELIVERED',       // تحویل داده شده
    TENANT_CANCELLED = 'TENANT_CANCELLED',         // لغو شده
    CUSTOMER_CANCELLED = 'CUSTOMER_CANCELLED',
    CUSTOMER_REFUNDED = 'CUSTOMER_REFUNDED',
    TENANT_REFUND = 'TENANT_REFUND',
    PENDING_REMAINING_PAYMENT = 'PENDING_REMAINING_PAYMENT'
}

export const getStatusText = (status) => {
    const texts = {
        // وضعیت‌های اولیه و عمومی
        'CART': 'سبد خرید',
        'DRAFT': 'پیش‌نویس',
        'SUBMITTED': 'ثبت شده',
        'REJECTED': 'رد شده',
        'CONFIRMED': 'تایید شده',
        'IN_QUEUE': 'در صف',

        // وضعیت‌های پرداخت
        'PENDING_PAYMENT': 'در انتظار پرداخت',
        'PAYMENT_FAILED': 'پرداخت ناموفق',
        'PENDING_REMAINING_PAYMENT': 'در انتظار پرداخت باقی‌مانده',

        // وضعیت‌های FSM (معماری سفارشات)
        'CUSTOMER_PENDING': 'در انتظار پرداخت',
        'CUSTOMER_PAID': 'پرداخت شده (در انتظار تایید فروشنده)',
        'TENANT_PROCESSING': 'در حال پردازش و آماده‌سازی',
        'TENANT_SHIPPED': 'ارسال شده',
        'CUSTOMER_DELIVERED': 'تحویل شده',

        // وضعیت‌های لغو و مرجوعی
        'CUSTOMER_CANCELLED': 'لغو شده توسط کاربر',
        'TENANT_CANCELLED': 'لغو شده توسط فروشنده',
        'CUSTOMER_REFUNDED': 'بازگشت وجه به کاربر',
        'TENANT_REFUND': 'درخواست بازگشت وجه توسط فروشنده'
    };

    return texts[status] || status;
};