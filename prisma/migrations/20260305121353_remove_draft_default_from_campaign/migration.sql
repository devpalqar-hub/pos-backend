-- AlterTable
ALTER TABLE `campaigns` MODIFY `status` ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE `order_sessions` MODIFY `channel` ENUM('DINE_IN', 'ONLINE_OWN', 'UBER_EATS', 'DOORDASH') NOT NULL DEFAULT 'DINE_IN';

-- CreateTable
CREATE TABLE `doordash_settings` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(255) NOT NULL,
    `keyId` VARCHAR(255) NOT NULL,
    `signingSecret` VARCHAR(500) NOT NULL,
    `webhookSecret` VARCHAR(500) NOT NULL,
    `storeId` VARCHAR(255) NULL,
    `autoAccept` BOOLEAN NOT NULL DEFAULT true,
    `autoCreateOrders` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doordash_settings_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doordash_item_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `doorDashSettingsId` VARCHAR(191) NOT NULL,
    `doorDashItemId` VARCHAR(255) NULL,
    `doorDashItemName` VARCHAR(255) NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doordash_item_mappings_doorDashSettingsId_doorDashItemId_key`(`doorDashSettingsId`, `doorDashItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doordash_webhook_logs` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `eventId` VARCHAR(255) NULL,
    `eventType` ENUM('ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_PICKED_UP', 'ORDER_DELIVERED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `status` ENUM('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `rawPayload` JSON NOT NULL,
    `errorMessage` TEXT NULL,
    `sessionId` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `doordash_webhook_logs_restaurantId_idx`(`restaurantId`),
    INDEX `doordash_webhook_logs_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `doordash_settings` ADD CONSTRAINT `doordash_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doordash_item_mappings` ADD CONSTRAINT `doordash_item_mappings_doorDashSettingsId_fkey` FOREIGN KEY (`doorDashSettingsId`) REFERENCES `doordash_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doordash_item_mappings` ADD CONSTRAINT `doordash_item_mappings_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doordash_webhook_logs` ADD CONSTRAINT `doordash_webhook_logs_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
