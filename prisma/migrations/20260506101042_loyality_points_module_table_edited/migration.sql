/*
  Warnings:

  - You are about to drop the column `loyalityDiscountRatio` on the `loyality_points` table. All the data in the column will be lost.
  - You are about to drop the `_LoyalityPointToMenuItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` DROP FOREIGN KEY `_LoyalityPointToMenuItem_A_fkey`;

-- DropForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` DROP FOREIGN KEY `_LoyalityPointToMenuItem_B_fkey`;

-- AlterTable
ALTER TABLE `loyality_offers` ADD COLUMN `conditionMaxAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `conditionMinAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `loyalityDiscountRatio` DECIMAL(5, 4) NULL,
    ADD COLUMN `maxUsagePerCustomer` INTEGER NULL,
    MODIFY `pointsRequired` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `loyality_points` DROP COLUMN `loyalityDiscountRatio`,
    ADD COLUMN `menuItemId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_LoyalityPointToMenuItem`;

-- AddForeignKey
ALTER TABLE `loyality_points` ADD CONSTRAINT `loyality_points_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
