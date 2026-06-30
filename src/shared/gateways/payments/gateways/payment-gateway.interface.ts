export interface PaymentGateway {
    readonly name: string

    pay(
        amount: number,
        callbackUrl: string,
        meta?: {
            email?: string
            mobile?: string
            description?: string
        }
    ): Promise<{
        authority: string
        redirectUrl: string
    }>

    verify(data: any): Promise<any>

    shouldRedirect(): boolean

    refund?(data: { authority: string; amount: number }): Promise<{ RefID: string }>;
}