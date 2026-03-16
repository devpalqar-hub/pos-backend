-- AlterTable
ALTER TABLE `order_batches` ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `order_batches` ADD CONSTRAINT `order_batches_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
