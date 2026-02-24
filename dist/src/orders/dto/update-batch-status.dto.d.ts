export declare enum BatchStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    READY = "READY",
    SERVED = "SERVED"
}
export declare class UpdateBatchStatusDto {
    status: BatchStatus;
}
