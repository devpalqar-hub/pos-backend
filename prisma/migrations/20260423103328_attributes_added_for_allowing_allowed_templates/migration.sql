-- AlterTable
ALTER TABLE `marketing_settings` ADD COLUMN `waOptInDescription` TEXT NULL,
    ADD COLUMN `waOptInMethod` VARCHAR(100) NULL,
    ADD COLUMN `waTemplateLanguageCode` VARCHAR(20) NULL,
    ADD COLUMN `waTemplateName` VARCHAR(255) NULL;
