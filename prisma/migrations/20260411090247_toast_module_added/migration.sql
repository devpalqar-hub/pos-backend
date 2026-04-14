-- AlterTable
ALTER TABLE `order_sessions` MODIFY `channel` ENUM('DINE_IN', 'ONLINE_OWN', 'UBER_EATS', 'DOORDASH', 'TOAST') NOT NULL DEFAULT 'DINE_IN';

-- AlterTable
ALTER TABLE `restaurant_feature_flags` MODIFY `feature` ENUM('POS', 'ONLINE_ORDERING', 'COUPONS', 'LOYALTY_POINTS', 'MARKETING', 'DOORDASH', 'UBER_EATS', 'TOAST', 'PAYROLL', 'EXPENSES') NOT NULL;

-- CreateTable
CREATE TABLE `toast_settings` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `clientSecret` VARCHAR(500) NOT NULL,
    `toastRestaurantExternalId` VARCHAR(255) NOT NULL,
    `apiBaseUrl` VARCHAR(255) NOT NULL DEFAULT 'https://ws-api.toasttab.com',
    `defaultOrderLookbackHours` INTEGER NOT NULL DEFAULT 24,
    `autoSyncEnabled` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `toast_settings_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toast_sync_states` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `menuLastUpdatedAt` DATETIME(3) NULL,
    `ordersLastStartAt` DATETIME(3) NULL,
    `ordersLastEndAt` DATETIME(3) NULL,
    `lastSyncStatus` ENUM('SUCCESS', 'SKIPPED', 'FAILED') NULL,
    `lastSyncError` TEXT NULL,
    `lastSuccessfulAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `toast_sync_states_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toast_menu_item_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `toastItemGuid` VARCHAR(255) NOT NULL,
    `toastItemName` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `toast_menu_item_mappings_restaurantId_idx`(`restaurantId`),
    UNIQUE INDEX `toast_menu_item_mappings_restaurantId_toastItemGuid_key`(`restaurantId`, `toastItemGuid`),
    UNIQUE INDEX `toast_menu_item_mappings_restaurantId_menuItemId_key`(`restaurantId`, `menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toast_order_links` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `orderSessionId` VARCHAR(191) NOT NULL,
    `toastOrderGuid` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `toast_order_links_orderSessionId_key`(`orderSessionId`),
    INDEX `toast_order_links_restaurantId_idx`(`restaurantId`),
    UNIQUE INDEX `toast_order_links_restaurantId_toastOrderGuid_key`(`restaurantId`, `toastOrderGuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toast_sync_logs` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `syncType` ENUM('MENU', 'ORDERS', 'FULL') NOT NULL,
    `status` ENUM('SUCCESS', 'SKIPPED', 'FAILED') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `categoriesUpserted` INTEGER NOT NULL DEFAULT 0,
    `itemsUpserted` INTEGER NOT NULL DEFAULT 0,
    `ordersCreated` INTEGER NOT NULL DEFAULT 0,
    `ordersSkipped` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `summary` JSON NULL,

    INDEX `toast_sync_logs_restaurantId_idx`(`restaurantId`),
    INDEX `toast_sync_logs_syncType_idx`(`syncType`),
    INDEX `toast_sync_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `toast_settings` ADD CONSTRAINT `toast_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_sync_states` ADD CONSTRAINT `toast_sync_states_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_menu_item_mappings` ADD CONSTRAINT `toast_menu_item_mappings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_menu_item_mappings` ADD CONSTRAINT `toast_menu_item_mappings_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_order_links` ADD CONSTRAINT `toast_order_links_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_order_links` ADD CONSTRAINT `toast_order_links_orderSessionId_fkey` FOREIGN KEY (`orderSessionId`) REFERENCES `order_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toast_sync_logs` ADD CONSTRAINT `toast_sync_logs_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
