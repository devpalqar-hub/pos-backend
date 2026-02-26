/*
  Warnings:

  - You are about to drop the column `day` on the `loyality_points` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `loyality_points` DROP COLUMN `day`;

-- CreateTable
CREATE TABLE `loyality_point_days` (
    `id` VARCHAR(191) NOT NULL,
    `loyalityPointId` VARCHAR(191) NOT NULL,
    `day` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,

    UNIQUE INDEX `loyality_point_days_loyalityPointId_day_key`(`loyalityPointId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loyality_point_days` ADD CONSTRAINT `loyality_point_days_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
