-- AlterTable
ALTER TABLE `order_session_update_times` ADD COLUMN `fieldChanged` VARCHAR(100) NULL,
    ADD COLUMN `newValue` TEXT NULL,
    ADD COLUMN `oldValue` TEXT NULL;
