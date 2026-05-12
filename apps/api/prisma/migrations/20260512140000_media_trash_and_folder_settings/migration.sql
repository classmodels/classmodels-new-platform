-- Map-instellingen + model-download / geplande hard delete
ALTER TABLE "MediaFolder" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "MediaAsset" ADD COLUMN "modelDownloadedAt" TIMESTAMP(3);
ALTER TABLE "MediaAsset" ADD COLUMN "scheduledHardDeleteAt" TIMESTAMP(3);
