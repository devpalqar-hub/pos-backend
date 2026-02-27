/*
  Warnings:

  - You are about to drop the `staff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `payrolls` DROP FOREIGN KEY `payrolls_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `staff` DROP FOREIGN KEY `staff_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `staff_leaves` DROP FOREIGN KEY `staff_leaves_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `staff_overtimes` DROP FOREIGN KEY `staff_overtimes_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `staff_working_days` DROP FOREIGN KEY `staff_working_days_staffId_fkey`;

-- DropTable
DROP TABLE `staff`;

-- CreateTable
CREATE TABLE `staff_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `monthlySalary` DECIMAL(10, 2) NOT NULL,
    `paidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `dailyWorkHours` DECIMAL(4, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff_profiles` ADD CONSTRAINT `staff_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_working_days` ADD CONSTRAINT `staff_working_days_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_leaves` ADD CONSTRAINT `staff_leaves_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_overtimes` ADD CONSTRAINT `staff_overtimes_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
