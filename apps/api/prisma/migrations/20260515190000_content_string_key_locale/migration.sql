-- ContentString: meerdere talen per sleutel (nl / fr / en)
ALTER TABLE `ContentString` DROP INDEX `ContentString_key_key`;
CREATE UNIQUE INDEX `ContentString_key_locale_key` ON `ContentString`(`key`, `locale`);
