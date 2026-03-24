/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,code]` on the table `coupons` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `coupons_code_key` ON `coupons`;

-- CreateIndex
CREATE UNIQUE INDEX `coupons_restaurantId_code_key` ON `coupons`(`restaurantId`, `code`);
