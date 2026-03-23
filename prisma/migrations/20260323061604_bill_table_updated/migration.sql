-- AlterTable
ALTER TABLE `bills` ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `coupounDiscountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `loyalityPointDiscountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `loyalityPointRedemptionId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_loyalityPointRedemptionId_fkey` FOREIGN KEY (`loyalityPointRedemptionId`) REFERENCES `loyality_point_redemptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
