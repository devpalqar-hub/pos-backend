-- CreateTable
CREATE TABLE `restaurant_feature_flags` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `feature` ENUM('POS', 'ONLINE_ORDERING', 'COUPONS', 'LOYALTY_POINTS', 'MARKETING', 'DOORDASH', 'UBER_EATS', 'PAYROLL', 'EXPENSES') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `restaurant_feature_flags_restaurantId_idx`(`restaurantId`),
    UNIQUE INDEX `restaurant_feature_flags_restaurantId_feature_key`(`restaurantId`, `feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `restaurant_feature_flags` ADD CONSTRAINT `restaurant_feature_flags_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
