/*
  Warnings:

  - You are about to drop the column `menuItemId` on the `loyality_offers` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE `_LoyalityOfferToMenuItem` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LoyalityOfferToMenuItem_AB_unique`(`A`, `B`),
    INDEX `_LoyalityOfferToMenuItem_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_LoyalityOfferToMenuItem` ADD CONSTRAINT `_LoyalityOfferToMenuItem_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_offers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LoyalityOfferToMenuItem` ADD CONSTRAINT `_LoyalityOfferToMenuItem_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single menu item relation data into m-n table
INSERT INTO `_LoyalityOfferToMenuItem` (`A`, `B`)
SELECT `id`, `menuItemId`
FROM `loyality_offers`
WHERE `menuItemId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `loyality_offers` DROP FOREIGN KEY `loyality_offers_menuItemId_fkey`;

-- DropIndex
DROP INDEX `loyality_offers_menuItemId_idx` ON `loyality_offers`;

-- AlterTable
ALTER TABLE `loyality_offers` DROP COLUMN `menuItemId`;
