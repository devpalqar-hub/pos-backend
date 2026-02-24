export declare enum OrderChannel {
    DINE_IN = "DINE_IN",
    ONLINE_OWN = "ONLINE_OWN",
    UBER_EATS = "UBER_EATS"
}
export declare class CreateSessionDto {
    tableId?: string;
    channel?: OrderChannel;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    guestCount?: number;
    externalOrderId?: string;
    deliveryAddress?: string;
    specialInstructions?: string;
}
