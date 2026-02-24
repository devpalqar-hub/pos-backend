export declare class BatchItemDto {
    menuItemId: string;
    quantity: number;
    notes?: string;
}
export declare class CreateBatchDto {
    items: BatchItemDto[];
    notes?: string;
}
