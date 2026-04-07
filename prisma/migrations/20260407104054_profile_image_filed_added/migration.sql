/*
  Warnings:

  - The values [PARTIAL,OVERDUE] on the enum `vendor_payments_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `staff_profiles` ADD COLUMN `profileImage` VARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE `vendor_payments` MODIFY `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING';
