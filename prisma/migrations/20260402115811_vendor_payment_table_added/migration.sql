-- CreateTable
CREATE TABLE `vendor_payments` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `type` ENUM('INVOICE', 'ADVANCE', 'PARTIAL') NOT NULL DEFAULT 'INVOICE',
    `paymentMethod` ENUM('CASH', 'CARD', 'UPI', 'ONLINE', 'OTHER') NULL,
    `referenceNo` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `expenseId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_payments_vendorId_idx`(`vendorId`),
    INDEX `vendor_payments_restaurantId_idx`(`restaurantId`),
    INDEX `vendor_payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payments` ADD CONSTRAINT `vendor_payments_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
