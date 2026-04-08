-- AlterTable
ALTER TABLE `expenses`
  ADD COLUMN `vendorId` VARCHAR(191) NULL,
  ADD INDEX `expenses_vendorId_idx`(`vendorId`);

-- AddForeignKey
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_vendorId_fkey`
  FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `vendor_payments`
  DROP FOREIGN KEY `vendor_payments_expenseId_fkey`;

-- AlterTable
ALTER TABLE `vendor_payments`
  DROP COLUMN `totalAmount`,
  DROP COLUMN `expenseId`;
