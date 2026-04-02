/*
  Warnings:

  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `customers` MODIFY `phone` VARCHAR(30) NOT NULL;
