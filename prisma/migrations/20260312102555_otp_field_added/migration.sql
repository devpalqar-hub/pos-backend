/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,email]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `otp` VARCHAR(10) NULL,
    ADD COLUMN `otpExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `customers_email_idx` ON `customers`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `customers_restaurantId_email_key` ON `customers`(`restaurantId`, `email`);
