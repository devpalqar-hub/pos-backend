-- CreateTable
CREATE TABLE `trigger_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `subject` VARCHAR(500) NULL,
    `textContent` TEXT NULL,
    `htmlContent` LONGTEXT NULL,
    `imageUrl` VARCHAR(1000) NULL,
    `ruleOperator` ENUM('AND', 'OR') NOT NULL DEFAULT 'AND',
    `repeatDelayDays` INTEGER NOT NULL DEFAULT 1,
    `maxTriggersPerCustomer` INTEGER NULL,
    `expiresAt` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trigger_campaigns_restaurantId_idx`(`restaurantId`),
    INDEX `trigger_campaigns_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trigger_campaign_rules` (
    `id` VARCHAR(191) NOT NULL,
    `triggerCampaignId` VARCHAR(191) NOT NULL,
    `condition` ENUM('VISITED_IN_DATE_RANGE', 'VISITED_ON_DAY', 'ORDERED_ITEMS', 'HAS_PENDING_LOYALTY', 'MIN_VISIT_COUNT', 'MIN_SPEND_AMOUNT') NOT NULL,
    `value` TEXT NULL,

    INDEX `trigger_campaign_rules_triggerCampaignId_idx`(`triggerCampaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trigger_campaign_channels` (
    `id` VARCHAR(191) NOT NULL,
    `triggerCampaignId` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,

    UNIQUE INDEX `trigger_campaign_channels_triggerCampaignId_channel_key`(`triggerCampaignId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trigger_campaign_logs` (
    `id` VARCHAR(191) NOT NULL,
    `triggerCampaignId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPTED_OUT') NOT NULL DEFAULT 'PENDING',
    `errorMsg` VARCHAR(500) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trigger_campaign_logs_triggerCampaignId_idx`(`triggerCampaignId`),
    INDEX `trigger_campaign_logs_customerId_idx`(`customerId`),
    INDEX `trigger_campaign_logs_triggerCampaignId_customerId_idx`(`triggerCampaignId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trigger_campaign_trackers` (
    `id` VARCHAR(191) NOT NULL,
    `triggerCampaignId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `triggerCount` INTEGER NOT NULL DEFAULT 0,
    `lastTriggeredAt` DATETIME(3) NULL,

    INDEX `trigger_campaign_trackers_triggerCampaignId_idx`(`triggerCampaignId`),
    INDEX `trigger_campaign_trackers_customerId_idx`(`customerId`),
    UNIQUE INDEX `trigger_campaign_trackers_triggerCampaignId_customerId_key`(`triggerCampaignId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trigger_campaigns` ADD CONSTRAINT `trigger_campaigns_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_rules` ADD CONSTRAINT `trigger_campaign_rules_triggerCampaignId_fkey` FOREIGN KEY (`triggerCampaignId`) REFERENCES `trigger_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_channels` ADD CONSTRAINT `trigger_campaign_channels_triggerCampaignId_fkey` FOREIGN KEY (`triggerCampaignId`) REFERENCES `trigger_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_logs` ADD CONSTRAINT `trigger_campaign_logs_triggerCampaignId_fkey` FOREIGN KEY (`triggerCampaignId`) REFERENCES `trigger_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_logs` ADD CONSTRAINT `trigger_campaign_logs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_trackers` ADD CONSTRAINT `trigger_campaign_trackers_triggerCampaignId_fkey` FOREIGN KEY (`triggerCampaignId`) REFERENCES `trigger_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trigger_campaign_trackers` ADD CONSTRAINT `trigger_campaign_trackers_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
