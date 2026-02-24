export declare enum OrderItemStatus {
    PENDING = "PENDING",
    PREPARING = "PREPARING",
    PREPARED = "PREPARED",
    SERVED = "SERVED",
    CANCELLED = "CANCELLED"
}
export declare class UpdateItemStatusDto {
    status: OrderItemStatus;
    cancelReason?: string;
}
