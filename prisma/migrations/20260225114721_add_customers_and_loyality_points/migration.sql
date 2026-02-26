-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `name` VARCHAR(255) NULL,
    `wallet` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_restaurantId_idx`(`restaurantId`),
    INDEX `customers_phone_idx`(`phone`),
    UNIQUE INDEX `customers_restaurantId_phone_key`(`restaurantId`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyality_points` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `points` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `startTime` VARCHAR(10) NULL,
    `endTime` VARCHAR(10) NULL,
    `maxUsagePerCustomer` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `loyality_points_restaurantId_idx`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyality_point_days` (
    `id` VARCHAR(191) NOT NULL,
    `loyalityPointId` VARCHAR(191) NOT NULL,
    `day` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,

    UNIQUE INDEX `loyality_point_days_loyalityPointId_day_key`(`loyalityPointId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyality_point_categories` (
    `id` VARCHAR(191) NOT NULL,
    `loyalityPointId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `loyality_point_categories_loyalityPointId_categoryId_key`(`loyalityPointId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyality_point_menu_items` (
    `id` VARCHAR(191) NOT NULL,
    `loyalityPointId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `loyality_point_menu_items_loyalityPointId_menuItemId_key`(`loyalityPointId`, `menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyality_point_redemptions` (
    `id` VARCHAR(191) NOT NULL,
    `loyalityPointId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `pointsAwarded` DECIMAL(10, 2) NOT NULL,
    `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loyality_point_redemptions_loyalityPointId_idx`(`loyalityPointId`),
    INDEX `loyality_point_redemptions_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_points` ADD CONSTRAINT `loyality_points_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_days` ADD CONSTRAINT `loyality_point_days_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_categories` ADD CONSTRAINT `loyality_point_categories_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_categories` ADD CONSTRAINT `loyality_point_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_menu_items` ADD CONSTRAINT `loyality_point_menu_items_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_menu_items` ADD CONSTRAINT `loyality_point_menu_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_redemptions` ADD CONSTRAINT `loyality_point_redemptions_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyality_point_redemptions` ADD CONSTRAINT `loyality_point_redemptions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
