export declare enum StockAction {
    MARK_OUT_OF_STOCK = "MARK_OUT_OF_STOCK",
    SET_STOCK = "SET_STOCK",
    DECREASE_STOCK = "DECREASE_STOCK",
    RESTOCK = "RESTOCK"
}
export declare class StockActionDto {
    action: StockAction;
    quantity?: number;
}
