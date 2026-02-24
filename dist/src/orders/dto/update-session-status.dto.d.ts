export declare enum SessionStatus {
    OPEN = "OPEN",
    BILLED = "BILLED",
    PAID = "PAID",
    CANCELLED = "CANCELLED",
    VOID = "VOID"
}
export declare class UpdateSessionStatusDto {
    status: SessionStatus;
}
