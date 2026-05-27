-- Migration: add_toast_webhook
-- Adds: toast_webhook_logs table, webhookSecret + autoCreateOrders to toast_settings

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. New columns on toast_settings
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE `toast_settings`
  ADD COLUMN `webhookSecret`    VARCHAR(500) NULL      AFTER `toastRestaurantExternalId`,
  ADD COLUMN `autoCreateOrders` BOOLEAN      NOT NULL DEFAULT TRUE AFTER `autoSyncEnabled`;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. New toast_webhook_logs table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE `toast_webhook_logs` (
  `id`            VARCHAR(191) NOT NULL,
  `restaurantId`  VARCHAR(191) NULL,
  `eventId`       VARCHAR(255) NULL,
  `eventType`     ENUM(
                    'ORDER_CREATED',
                    'ORDER_UPDATED',
                    'ORDER_DELETED',
                    'ORDER_VOIDED',
                    'MENU_PUBLISHED',
                    'UNKNOWN'
                  ) NOT NULL DEFAULT 'UNKNOWN',
  `status`        ENUM(
                    'RECEIVED',
                    'PROCESSED',
                    'IGNORED',
                    'FAILED'
                  ) NOT NULL DEFAULT 'RECEIVED',
  `rawPayload`    JSON NULL,
  `errorMessage`  TEXT NULL,
  `sessionId`     VARCHAR(191) NULL,
  `receivedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  INDEX `toast_webhook_logs_restaurantId_idx`  (`restaurantId`),
  INDEX `toast_webhook_logs_eventType_idx`     (`eventType`),
  INDEX `toast_webhook_logs_status_idx`        (`status`),

  CONSTRAINT `toast_webhook_logs_restaurantId_fkey`
    FOREIGN KEY (`restaurantId`)
    REFERENCES `restaurants` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
