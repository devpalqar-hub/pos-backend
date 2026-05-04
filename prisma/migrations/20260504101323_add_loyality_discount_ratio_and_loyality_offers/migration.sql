-- AlterTable
ALTER TABLE `loyality_points` ADD COLUMN `loyalityDiscountRatio` DECIMAL(5, 4) NULL;

-- CreateTable
CREATE TABLE `loyality_offers` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('AMOUNT', 'FOOD') NOT NULL,
    `pointsRequired` DECIMAL(10, 2) NOT NULL,
    `redeemAmount` DECIMAL(10, 2) NULL,
    `menuItemId` VARCHAR(191) NULL,
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `loyality_offers_restaurantId_idx`(`restaurantId`),
    INDEX `loyality_offers_menuItemId_idx`(`menuItemId`),
    INDEX `loyality_offers_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loyality_offers` ADD CONSTRAINT `loyality_offers_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_offers` ADD CONSTRAINT `loyality_offers_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
