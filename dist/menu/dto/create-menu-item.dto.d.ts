export declare enum ItemTypeDto {
    STOCKABLE = "STOCKABLE",
    NON_STOCKABLE = "NON_STOCKABLE"
}
export declare class CreateMenuItemDto {
    name: string;
    description?: string;
    categoryId: string;
    price: number;
    discountedPrice?: number;
    imageUrl?: string;
    itemType: ItemTypeDto;
    stockCount?: number;
    sortOrder?: number;
}
