-- DropForeignKey
ALTER TABLE `order_sessions` DROP FOREIGN KEY `order_sessions_openedById_fkey`;

-- DropIndex
DROP INDEX `order_sessions_openedById_fkey` ON `order_sessions`;

-- AlterTable
ALTER TABLE `order_sessions` ADD COLUMN `customerId` VARCHAR(191) NULL,
    MODIFY `openedById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `order_sessions` ADD CONSTRAINT `order_sessions_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_sessions` ADD CONSTRAINT `order_sessions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
