-- CreateTable
CREATE TABLE `uber_eats_settings` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(255) NOT NULL,
    `clientSecret` VARCHAR(500) NOT NULL,
    `webhookSecret` VARCHAR(500) NOT NULL,
    `storeId` VARCHAR(255) NULL,
    `autoAccept` BOOLEAN NOT NULL DEFAULT true,
    `autoCreateOrders` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uber_eats_settings_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uber_eats_item_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `uberEatsSettingsId` VARCHAR(191) NOT NULL,
    `uberEatsItemId` VARCHAR(255) NULL,
    `uberEatsItemName` VARCHAR(255) NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uber_eats_item_mappings_uberEatsSettingsId_uberEatsItemId_key`(`uberEatsSettingsId`, `uberEatsItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uber_eats_webhook_logs` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `eventId` VARCHAR(255) NULL,
    `eventType` ENUM('ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_DENIED', 'ORDER_CANCELLED', 'ORDER_READY_FOR_PICKUP', 'ORDER_PICKED_UP', 'ORDER_DELIVERED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `status` ENUM('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `rawPayload` JSON NOT NULL,
    `errorMessage` TEXT NULL,
    `sessionId` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `uber_eats_webhook_logs_restaurantId_idx`(`restaurantId`),
    INDEX `uber_eats_webhook_logs_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `uber_eats_settings` ADD CONSTRAINT `uber_eats_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uber_eats_item_mappings` ADD CONSTRAINT `uber_eats_item_mappings_uberEatsSettingsId_fkey` FOREIGN KEY (`uberEatsSettingsId`) REFERENCES `uber_eats_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uber_eats_item_mappings` ADD CONSTRAINT `uber_eats_item_mappings_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uber_eats_webhook_logs` ADD CONSTRAINT `uber_eats_webhook_logs_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
