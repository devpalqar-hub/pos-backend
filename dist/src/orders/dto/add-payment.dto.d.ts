export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    UPI = "UPI",
    ONLINE = "ONLINE",
    OTHER = "OTHER"
}
export declare class AddPaymentDto {
    amount: string;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
}
