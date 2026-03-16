-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: toastproddb
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_LoyalityPointToMenuCategory`
--

DROP TABLE IF EXISTS `_LoyalityPointToMenuCategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_LoyalityPointToMenuCategory` (
  `A` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `B` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `_LoyalityPointToMenuCategory_AB_unique` (`A`,`B`),
  KEY `_LoyalityPointToMenuCategory_B_index` (`B`),
  CONSTRAINT `_LoyalityPointToMenuCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_LoyalityPointToMenuCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_LoyalityPointToMenuItem`
--

DROP TABLE IF EXISTS `_LoyalityPointToMenuItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_LoyalityPointToMenuItem` (
  `A` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `B` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `_LoyalityPointToMenuItem_AB_unique` (`A`,`B`),
  KEY `_LoyalityPointToMenuItem_B_index` (`B`),
  CONSTRAINT `_LoyalityPointToMenuItem_A_fkey` FOREIGN KEY (`A`) REFERENCES `loyality_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `_LoyalityPointToMenuItem_B_fkey` FOREIGN KEY (`B`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bill_items`
--

DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `billId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menuItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(10,2) NOT NULL,
  `totalPrice` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_items_billId_idx` (`billId`),
  KEY `bill_items_menuItemId_fkey` (`menuItemId`),
  CONSTRAINT `bill_items_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `bills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bill_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bills`
--

DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bills` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `billNumber` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('DRAFT','FINAL','PAID','VOIDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `subtotal` decimal(10,2) NOT NULL,
  `taxRate` decimal(5,2) NOT NULL,
  `taxAmount` decimal(10,2) NOT NULL,
  `discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalAmount` decimal(10,2) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `generatedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paidAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bills_sessionId_key` (`sessionId`),
  UNIQUE KEY `bills_restaurantId_billNumber_key` (`restaurantId`,`billNumber`),
  KEY `bills_restaurantId_idx` (`restaurantId`),
  KEY `bills_status_idx` (`status`),
  KEY `bills_generatedById_fkey` (`generatedById`),
  CONSTRAINT `bills_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bills_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bills_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `order_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_channel_stats`
--

DROP TABLE IF EXISTS `campaign_channel_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_channel_stats` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campaignId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('EMAIL','SMS','WHATSAPP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sentCount` int NOT NULL DEFAULT '0',
  `deliveredCount` int NOT NULL DEFAULT '0',
  `failedCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaign_channel_stats_campaignId_channel_key` (`campaignId`,`channel`),
  CONSTRAINT `campaign_channel_stats_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_recipients`
--

DROP TABLE IF EXISTS `campaign_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_recipients` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campaignId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('EMAIL','SMS','WHATSAPP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','SENT','DELIVERED','FAILED','OPTED_OUT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `errorMsg` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_recipients_campaignId_idx` (`campaignId`),
  KEY `campaign_recipients_customerId_idx` (`customerId`),
  CONSTRAINT `campaign_recipients_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaign_recipients_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_rules`
--

DROP TABLE IF EXISTS `campaign_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_rules` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campaignId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition` enum('ALL_CUSTOMERS','MIN_ORDERS','MAX_ORDERS','MIN_SPEND','MAX_SPEND','LAST_ORDER_WITHIN_DAYS','ORDER_CHANNEL','MIN_LOYALTY_POINTS') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaign_rules_campaignId_idx` (`campaignId`),
  CONSTRAINT `campaign_rules_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `textContent` text COLLATE utf8mb4_unicode_ci,
  `htmlContent` longtext COLLATE utf8mb4_unicode_ci,
  `imageUrl` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruleOperator` enum('AND','OR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AND',
  `status` enum('DRAFT','SCHEDULED','RUNNING','COMPLETED','PAUSED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SCHEDULED',
  `scheduledAt` datetime(3) DEFAULT NULL,
  `startedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `totalRecipients` int NOT NULL DEFAULT '0',
  `sentCount` int NOT NULL DEFAULT '0',
  `deliveredCount` int NOT NULL DEFAULT '0',
  `failedCount` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `campaigns_restaurantId_idx` (`restaurantId`),
  KEY `campaigns_status_idx` (`status`),
  CONSTRAINT `campaigns_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wallet` decimal(10,2) NOT NULL DEFAULT '0.00',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_restaurantId_phone_key` (`restaurantId`,`phone`),
  KEY `customers_restaurantId_idx` (`restaurantId`),
  KEY `customers_phone_idx` (`phone`),
  CONSTRAINT `customers_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doordash_item_mappings`
--

DROP TABLE IF EXISTS `doordash_item_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doordash_item_mappings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doorDashSettingsId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doorDashItemId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doorDashItemName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `menuItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `doordash_item_mappings_doorDashSettingsId_doorDashItemId_key` (`doorDashSettingsId`,`doorDashItemId`),
  KEY `doordash_item_mappings_menuItemId_fkey` (`menuItemId`),
  CONSTRAINT `doordash_item_mappings_doorDashSettingsId_fkey` FOREIGN KEY (`doorDashSettingsId`) REFERENCES `doordash_settings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `doordash_item_mappings_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doordash_settings`
--

DROP TABLE IF EXISTS `doordash_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doordash_settings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `developerId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keyId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signingSecret` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhookSecret` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storeId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `autoAccept` tinyint(1) NOT NULL DEFAULT '1',
  `autoCreateOrders` tinyint(1) NOT NULL DEFAULT '1',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `doordash_settings_restaurantId_key` (`restaurantId`),
  CONSTRAINT `doordash_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doordash_webhook_logs`
--

DROP TABLE IF EXISTS `doordash_webhook_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doordash_webhook_logs` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventType` enum('ORDER_CREATED','ORDER_UPDATED','ORDER_CANCELLED','ORDER_PICKED_UP','ORDER_DELIVERED','UNKNOWN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `status` enum('RECEIVED','PROCESSED','IGNORED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RECEIVED',
  `rawPayload` json NOT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `sessionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receivedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `doordash_webhook_logs_restaurantId_idx` (`restaurantId`),
  KEY `doordash_webhook_logs_eventType_idx` (`eventType`),
  CONSTRAINT `doordash_webhook_logs_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expenseName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expenseType` enum('DAILY','WEEKLY','MONTHLY','YEARLY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_restaurantId_idx` (`restaurantId`),
  KEY `expenses_expenseType_idx` (`expenseType`),
  CONSTRAINT `expenses_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loyality_point_days`
--

DROP TABLE IF EXISTS `loyality_point_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyality_point_days` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loyalityPointId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day` enum('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loyality_point_days_loyalityPointId_day_key` (`loyalityPointId`,`day`),
  CONSTRAINT `loyality_point_days_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loyality_point_redemptions`
--

DROP TABLE IF EXISTS `loyality_point_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyality_point_redemptions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loyalityPointId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pointsAwarded` decimal(10,2) NOT NULL,
  `redeemedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `loyality_point_redemptions_loyalityPointId_idx` (`loyalityPointId`),
  KEY `loyality_point_redemptions_customerId_idx` (`customerId`),
  CONSTRAINT `loyality_point_redemptions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `loyality_point_redemptions_loyalityPointId_fkey` FOREIGN KEY (`loyalityPointId`) REFERENCES `loyality_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loyality_points`
--

DROP TABLE IF EXISTS `loyality_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyality_points` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` decimal(10,2) NOT NULL DEFAULT '0.00',
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `startTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxUsagePerCustomer` int DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `isGroup` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `loyality_points_restaurantId_idx` (`restaurantId`),
  CONSTRAINT `loyality_points_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marketing_settings`
--

DROP TABLE IF EXISTS `marketing_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_settings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `smtpHost` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtpPort` int DEFAULT NULL,
  `smtpUser` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtpPassword` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtpFromEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtpFromName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtpSecure` tinyint(1) NOT NULL DEFAULT '1',
  `twilioAccountSid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twilioAuthToken` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twilioFromNumber` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `waBaId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `waPhoneNumberId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `waAccessToken` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketing_settings_restaurantId_key` (`restaurantId`),
  CONSTRAINT `marketing_settings_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_categories`
--

DROP TABLE IF EXISTS `menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_categories` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `imageUrl` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_categories_restaurantId_name_key` (`restaurantId`,`name`),
  KEY `menu_categories_restaurantId_idx` (`restaurantId`),
  CONSTRAINT `menu_categories_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `discountedPrice` decimal(10,2) DEFAULT NULL,
  `imageUrl` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `itemType` enum('STOCKABLE','NON_STOCKABLE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NON_STOCKABLE',
  `stockCount` int DEFAULT '0',
  `isAvailable` tinyint(1) NOT NULL DEFAULT '1',
  `isOutOfStock` tinyint(1) NOT NULL DEFAULT '0',
  `outOfStockAt` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `menu_items_restaurantId_idx` (`restaurantId`),
  KEY `menu_items_categoryId_idx` (`categoryId`),
  CONSTRAINT `menu_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `menu_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `menu_items_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_batches`
--

DROP TABLE IF EXISTS `order_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_batches` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchNumber` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','READY','SERVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_batches_sessionId_batchNumber_key` (`sessionId`,`batchNumber`),
  KEY `order_batches_sessionId_idx` (`sessionId`),
  KEY `order_batches_status_idx` (`status`),
  KEY `order_batches_createdById_fkey` (`createdById`),
  CONSTRAINT `order_batches_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_batches_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `order_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menuItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unitPrice` decimal(10,2) NOT NULL,
  `totalPrice` decimal(10,2) NOT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','PREPARING','PREPARED','SERVED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `preparedAt` datetime(3) DEFAULT NULL,
  `servedAt` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `cancelReason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_batchId_idx` (`batchId`),
  KEY `order_items_menuItemId_idx` (`menuItemId`),
  KEY `order_items_status_idx` (`status`),
  CONSTRAINT `order_items_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `order_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_sessions`
--

DROP TABLE IF EXISTS `order_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_sessions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tableId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sessionNumber` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('DINE_IN','ONLINE_OWN','UBER_EATS','DOORDASH') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DINE_IN',
  `status` enum('OPEN','BILLED','PAID','CANCELLED','VOID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `customerName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerPhone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guestCount` int NOT NULL DEFAULT '1',
  `externalOrderId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `externalChannel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deliveryAddress` text COLLATE utf8mb4_unicode_ci,
  `deliveryFee` decimal(10,2) DEFAULT NULL,
  `specialInstructions` text COLLATE utf8mb4_unicode_ci,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `taxAmount` decimal(10,2) DEFAULT NULL,
  `discountAmount` decimal(10,2) DEFAULT NULL,
  `totalAmount` decimal(10,2) DEFAULT NULL,
  `openedById` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_sessions_restaurantId_sessionNumber_key` (`restaurantId`,`sessionNumber`),
  KEY `order_sessions_restaurantId_idx` (`restaurantId`),
  KEY `order_sessions_tableId_idx` (`tableId`),
  KEY `order_sessions_status_idx` (`status`),
  KEY `order_sessions_openedById_fkey` (`openedById`),
  CONSTRAINT `order_sessions_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `order_sessions_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_sessions_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `otp_tokens`
--

DROP TABLE IF EXISTS `otp_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_tokens` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `isUsed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `otp_tokens_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `billId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('CASH','CARD','UPI','ONLINE','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payments_billId_idx` (`billId`),
  KEY `payments_processedById_fkey` (`processedById`),
  CONSTRAINT `payments_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `bills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payments_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payrolls`
--

DROP TABLE IF EXISTS `payrolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payrolls` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staffId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `monthlySalary` decimal(10,2) NOT NULL,
  `totalWorkingDays` int NOT NULL,
  `perDaySalary` decimal(10,2) NOT NULL,
  `paidLeaveDays` int NOT NULL DEFAULT '0',
  `unpaidLeaveDays` int NOT NULL DEFAULT '0',
  `overtimeAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bonusAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `deductionAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `deductionNotes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalDeductions` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalAdditions` decimal(10,2) NOT NULL DEFAULT '0.00',
  `finalSalary` decimal(10,2) NOT NULL,
  `status` enum('DRAFT','PROCESSED','PAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `processedAt` datetime(3) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payrolls_staffId_month_year_key` (`staffId`,`month`,`year`),
  KEY `payrolls_restaurantId_idx` (`restaurantId`),
  KEY `payrolls_staffId_idx` (`staffId`),
  CONSTRAINT `payrolls_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payrolls_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `price_rule_days`
--

DROP TABLE IF EXISTS `price_rule_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_rule_days` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day` enum('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `price_rule_days_ruleId_day_key` (`ruleId`,`day`),
  CONSTRAINT `price_rule_days_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `price_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `price_rules`
--

DROP TABLE IF EXISTS `price_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_rules` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menuItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleType` enum('RECURRING_WEEKLY','LIMITED_TIME') COLLATE utf8mb4_unicode_ci NOT NULL,
  `specialPrice` decimal(10,2) NOT NULL,
  `startTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `price_rules_restaurantId_idx` (`restaurantId`),
  KEY `price_rules_menuItemId_idx` (`menuItemId`),
  CONSTRAINT `price_rules_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `price_rules_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `restaurants`
--

DROP TABLE IF EXISTS `restaurants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurants` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ownerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postalCode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `logoUrl` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coverUrl` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cuisineType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxCapacity` int DEFAULT NULL,
  `taxRate` decimal(5,2) DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restaurants_slug_key` (`slug`),
  KEY `restaurants_ownerId_idx` (`ownerId`),
  KEY `restaurants_createdById_fkey` (`createdById`),
  CONSTRAINT `restaurants_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `restaurants_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff_leaves`
--

DROP TABLE IF EXISTS `staff_leaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_leaves` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staffId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `leaveType` enum('PAID','UNPAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PAID',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `leaveCost` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_leaves_staffId_date_key` (`staffId`,`date`),
  KEY `staff_leaves_staffId_idx` (`staffId`),
  CONSTRAINT `staff_leaves_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff_overtimes`
--

DROP TABLE IF EXISTS `staff_overtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_overtimes` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staffId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(4,2) NOT NULL,
  `wageAmount` decimal(10,2) NOT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `staff_overtimes_staffId_idx` (`staffId`),
  CONSTRAINT `staff_overtimes_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff_profiles`
--

DROP TABLE IF EXISTS `staff_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_profiles` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monthlySalary` decimal(10,2) NOT NULL,
  `paidLeaveDays` int NOT NULL DEFAULT '0',
  `dailyWorkHours` decimal(4,2) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jobRole` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noOfWorkingDays` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_profiles_email_key` (`email`),
  KEY `staff_profiles_restaurantId_fkey` (`restaurantId`),
  CONSTRAINT `staff_profiles_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff_working_days`
--

DROP TABLE IF EXISTS `staff_working_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_working_days` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staffId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day` enum('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_working_days_staffId_day_key` (`staffId`,`day`),
  CONSTRAINT `staff_working_days_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_groups`
--

DROP TABLE IF EXISTS `table_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_groups` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `table_groups_restaurantId_name_key` (`restaurantId`,`name`),
  KEY `table_groups_restaurantId_idx` (`restaurantId`),
  CONSTRAINT `table_groups_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tables`
--

DROP TABLE IF EXISTS `tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `groupId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seatCount` int NOT NULL,
  `status` enum('AVAILABLE','OCCUPIED','RESERVED','CLEANING') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tables_restaurantId_name_key` (`restaurantId`,`name`),
  KEY `tables_restaurantId_idx` (`restaurantId`),
  KEY `tables_groupId_idx` (`groupId`),
  CONSTRAINT `tables_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `table_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tables_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','OWNER','RESTAURANT_ADMIN','WAITER','CHEF','BILLER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITER',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_createdById_fkey` (`createdById`),
  KEY `users_restaurantId_fkey` (`restaurantId`),
  CONSTRAINT `users_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `working_hours`
--

DROP TABLE IF EXISTS `working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_hours` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `restaurantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day` enum('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `openTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closeTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isClosed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `working_hours_restaurantId_day_key` (`restaurantId`,`day`),
  CONSTRAINT `working_hours_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-07  6:02:57
