ALTER TABLE `User` ADD COLUMN `department` VARCHAR(100) NOT NULL DEFAULT '', ADD COLUMN `branch` VARCHAR(100) NOT NULL DEFAULT '', ADD COLUMN `permissions` JSON NULL, ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE TABLE `AuditLog` (
`id` INTEGER NOT NULL AUTO_INCREMENT,
`action` VARCHAR(50) NOT NULL,
`actorId` INTEGER NULL,
`actorUsername` VARCHAR(50) NOT NULL DEFAULT '',
`target` VARCHAR(100) NOT NULL DEFAULT '',
`details` TEXT NOT NULL,
`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
INDEX `AuditLog_createdAt_id_idx` (`createdAt`, `id`),
INDEX `AuditLog_actorId_createdAt_idx` (`actorId`, `createdAt`),
PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
