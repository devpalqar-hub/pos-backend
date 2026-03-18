/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `expense_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `order_session_update_times` (
    `id` VARCHAR(191) NOT NULL,
    `orderSessionId` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_session_update_times_orderSessionId_idx`(`orderSessionId`),
    INDEX `order_session_update_times_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `expense_categories_name_key` ON `expense_categories`(`name`);

-- AddForeignKey
ALTER TABLE `order_session_update_times` ADD CONSTRAINT `order_session_update_times_orderSessionId_fkey` FOREIGN KEY (`orderSessionId`) REFERENCES `order_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
