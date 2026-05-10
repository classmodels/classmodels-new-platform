-- AlterTable
ALTER TABLE "AgendaCalendar" ADD COLUMN     "defaultDayStartTime" TEXT NOT NULL DEFAULT '08:00:00',
ADD COLUMN     "defaultDayEndTime" TEXT NOT NULL DEFAULT '18:00:00',
ADD COLUMN     "breakStart" TEXT,
ADD COLUMN     "breakEnd" TEXT;
