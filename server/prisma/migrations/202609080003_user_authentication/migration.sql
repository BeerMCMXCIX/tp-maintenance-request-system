CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `role` VARCHAR(30) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_username_key`(`username`),
  INDEX `User_role_active_idx`(`role`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuthSession` (
  `id` VARCHAR(30) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `userId` INTEGER NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AuthSession_tokenHash_key`(`tokenHash`),
  INDEX `AuthSession_userId_idx`(`userId`),
  INDEX `AuthSession_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
