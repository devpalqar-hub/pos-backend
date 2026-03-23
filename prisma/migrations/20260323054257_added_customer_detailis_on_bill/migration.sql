-- AlterTable
ALTER TABLE `bills` ADD COLUMN `customerEmail` VARCHAR(255) NULL,
    ADD COLUMN `customerName` VARCHAR(255) NULL,
    ADD COLUMN `customerPhone` VARCHAR(30) NULL;
