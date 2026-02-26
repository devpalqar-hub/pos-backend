/*
  Warnings:

  - You are about to drop the `loyality_point_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `loyality_point_days` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `loyality_point_menu_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `loyality_point_categories` DROP FOREIGN KEY `loyality_point_categories_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `loyality_point_categories` DROP FOREIGN KEY `loyality_point_categories_loyalityPointId_fkey`;

-- DropForeignKey
ALTER TABLE `loyality_point_days` DROP FOREIGN KEY `loyality_point_days_loyalityPointId_fkey`;

-- DropForeignKey
ALTER TABLE `loyality_point_menu_items` DROP FOREIGN KEY `loyality_point_menu_items_loyalityPointId_fkey`;

-- DropForeignKey
ALTER TABLE `loyality_point_menu_items` DROP FOREIGN KEY `loyality_point_menu_items_menuItemId_fkey`;

-- AlterTable
ALTER TABLE `loyality_points` ADD COLUMN `day` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NULL,
    ADD COLUMN `isGroup` BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE `loyality_point_categories`;

-- DropTable
DROP TABLE `loyality_point_days`;

-- DropTable
DROP TABLE `loyality_point_menu_items`;

-- CreateTable
CREATE TABLE `_LoyalityPointToMenuCategory` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LoyalityPointToMenuCategory_AB_unique`(`A`, `B`),
    INDEX `_LoyalityPointToMenuCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_LoyalityPointToMenuItem` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LoyalityPointToMenuItem_AB_unique`(`A`, `B`),
    INDEX `_LoyalityPointToMenuItem_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuCategory` ADD CONSTRAINT `_LoyalityPointToMenuCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuCategory` ADD CONSTRAINT `_LoyalityPointToMenuCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` ADD CONSTRAINT `_LoyalityPointToMenuItem_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LoyalityPointToMenuItem` ADD CONSTRAINT `_LoyalityPointToMenuItem_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
