ALTER TABLE `RepairTicket`
  ADD COLUMN `requesterName` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `department` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `contact` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `location` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `assetCode` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `RepairTicket_createdAt_id_idx` ON `RepairTicket`(`createdAt`, `id`);
CREATE INDEX `RepairTicket_status_createdAt_idx` ON `RepairTicket`(`status`, `createdAt`);

CREATE TABLE `RequestItem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `estimatedUnitPrice` DECIMAL(12,2) NULL,
  INDEX `RequestItem_ticketId_idx`(`ticketId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `actor` VARCHAR(191) NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `TicketEvent_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RequestItem` ADD CONSTRAINT `RequestItem_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `RepairTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TicketEvent` ADD CONSTRAINT `TicketEvent_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `RepairTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
