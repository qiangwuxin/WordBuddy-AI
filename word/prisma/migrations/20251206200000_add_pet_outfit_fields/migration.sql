-- AlterTable
ALTER TABLE `pet_outfits` ADD COLUMN `style` VARCHAR(191) NOT NULL DEFAULT '写实',
ADD COLUMN `position` INTEGER NOT NULL DEFAULT 1,
ADD COLUMN `shootingHand` INTEGER NULL;

-- AlterTable: Update default values for existing columns
ALTER TABLE `pet_outfits` MODIFY COLUMN `jerseyColor` VARCHAR(191) NOT NULL DEFAULT '红色',
MODIFY COLUMN `jerseyNumber` INTEGER NOT NULL DEFAULT 10;

