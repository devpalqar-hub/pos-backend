-- CreateTable
CREATE TABLE `stripe_settings` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `secretKey` VARCHAR(500) NOT NULL,
    `publishableKey` VARCHAR(500) NULL,
    `webhookSecret` VARCHAR(500) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stripe_settings_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stripe_settings` ADD CONSTRAINT `stripe_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
