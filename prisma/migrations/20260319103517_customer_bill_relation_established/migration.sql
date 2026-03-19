-- AlterTable
ALTER TABLE `bills` ADD COLUMN `customerId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
