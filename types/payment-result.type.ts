// types/payment-result.types.ts

export interface BasePaymentResult {
    success: boolean;
    orderId?: string;
    txId?:string;
    orderCode: string;
    refId?: string;
    message?: string;
    error?: string;
    needsManualReview?: boolean; // این فیلد برای مدیریت خطاهای نیمه‌کاره است
}

export interface MarketPaymentResult extends BasePaymentResult {
    amount?: number;
    deliveryDate?: string;
    deliveryTime?: string;
    // سایر فیلدهای خاص مارکت
}

export interface VetClinicPaymentResult extends BasePaymentResult {
    // فیلدهای خاص کلینیک دامپزشکی
    amount?:any;
    appointment: any;
    doctorName: string;
    specialty: string;
    visitType: any;
    serviceType: string;
    paymentDate?: Date;
    servicePrice?: number;
    userId: string;
    petId: string;
    tenantId: string;
}