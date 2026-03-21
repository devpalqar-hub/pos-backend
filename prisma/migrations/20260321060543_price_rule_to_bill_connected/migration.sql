-- AlterTable
ALTER TABLE `bills` ADD COLUMN `SpecialPriceApplied` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `priceruleId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_priceruleId_fkey` FOREIGN KEY (`priceruleId`) REFERENCES `price_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
