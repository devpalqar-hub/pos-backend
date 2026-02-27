/*
  Warnings:

  - You are about to drop the column `userId` on the `staff_profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `staff_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `staff_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `staff_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `staff_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `staff_profiles` DROP FOREIGN KEY `staff_profiles_userId_fkey`;

-- DropIndex
DROP INDEX `staff_profiles_userId_key` ON `staff_profiles`;

-- AlterTable
ALTER TABLE `staff_profiles` DROP COLUMN `userId`,
    ADD COLUMN `email` VARCHAR(255) NOT NULL,
    ADD COLUMN `name` VARCHAR(255) NOT NULL,
    ADD COLUMN `phone` VARCHAR(30) NULL,
    ADD COLUMN `restaurantId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `staff_profiles_email_key` ON `staff_profiles`(`email`);

-- AddForeignKey
ALTER TABLE `staff_profiles` ADD CONSTRAINT `staff_profiles_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
