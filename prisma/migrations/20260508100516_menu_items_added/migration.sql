/*
  Warnings:

  - You are about to drop the column `menuItemId` on the `loyality_points` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `loyality_points` DROP FOREIGN KEY `loyality_points_menuItemId_fkey`;

-- DropIndex
DROP INDEX `loyality_points_menuItemId_fkey` ON `loyality_points`;

-- AlterTable
ALTER TABLE `loyality_points` DROP COLUMN `menuItemId`;

-- CreateTable
CREATE TABLE `_LoyalityPointToMenuItem` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LoyalityPointToMenuItem_AB_unique`(`A`, `B`),
    INDEX `_LoyalityPointToMenuItem_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` ADD CONSTRAINT `_LoyalityPointToMenuItem_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` ADD CONSTRAINT `_LoyalityPointToMenuItem_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
