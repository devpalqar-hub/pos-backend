-- CreateTable
CREATE TABLE `staff` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `monthlySalary` DECIMAL(10, 2) NOT NULL,
    `paidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `dailyWorkHours` DECIMAL(4, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_restaurantId_idx`(`restaurantId`),
    UNIQUE INDEX `staff_restaurantId_email_key`(`restaurantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_working_days` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `day` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,

    UNIQUE INDEX `staff_working_days_staffId_day_key`(`staffId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_leaves` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `leaveType` ENUM('PAID', 'UNPAID') NOT NULL DEFAULT 'PAID',
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_leaves_staffId_idx`(`staffId`),
    UNIQUE INDEX `staff_leaves_staffId_date_key`(`staffId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_overtimes` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `hours` DECIMAL(4, 2) NOT NULL,
    `wageAmount` DECIMAL(10, 2) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_overtimes_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payrolls` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `monthlySalary` DECIMAL(10, 2) NOT NULL,
    `totalWorkingDays` INTEGER NOT NULL,
    `perDaySalary` DECIMAL(10, 2) NOT NULL,
    `paidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `unpaidLeaveDays` INTEGER NOT NULL DEFAULT 0,
    `overtimeAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `bonusAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deductionAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deductionNotes` VARCHAR(500) NULL,
    `totalDeductions` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAdditions` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `finalSalary` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'PROCESSED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `processedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payrolls_restaurantId_idx`(`restaurantId`),
    INDEX `payrolls_staffId_idx`(`staffId`),
    UNIQUE INDEX `payrolls_staffId_month_year_key`(`staffId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_working_days` ADD CONSTRAINT `staff_working_days_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_leaves` ADD CONSTRAINT `staff_leaves_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_overtimes` ADD CONSTRAINT `staff_overtimes_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
