-- Cover-URL’s kunnen langer zijn dan 191 tekens (CDN / media paths).
ALTER TABLE `ModeshowEvent` MODIFY `coverImageUrl` TEXT NULL;
