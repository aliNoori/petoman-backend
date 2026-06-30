export enum PaymentStatus {
    INIT = 'INIT',        // Created but not started
    PENDING = 'PENDING',  // Waiting for payment
    AWAITING_PAYMENT='AWAITING_PAYMENT',
    PAID = 'PAID',        // Successfully paid
    FAILED = 'FAILED',    // Payment failed
    REFUNDED = 'REFUNDED', // Money returned
    CANCELED = 'CANCELED'
}
