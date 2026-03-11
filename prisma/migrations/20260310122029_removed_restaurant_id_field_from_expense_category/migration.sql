/*
  Warnings:

  - You are about to drop the column `restaurantId` on the `expense_categories` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `expense_categories` DROP FOREIGN KEY `expense_categories_restaurantId_fkey`;

-- DropIndex
DROP INDEX `expense_categories_restaurantId_fkey` ON `expense_categories`;

-- AlterTable
ALTER TABLE `expense_categories` DROP COLUMN `restaurantId`;
