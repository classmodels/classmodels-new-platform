-- Agenda (equivalent Class Models Agenda Pro data model)

CREATE TABLE "AgendaCalendar" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6f121b',
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicBooking" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaCalendar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgendaCalendar_slug_key" ON "AgendaCalendar"("slug");

CREATE TABLE "AgendaSlot" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "slotDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendaSlot_calendarId_slotDate_idx" ON "AgendaSlot"("calendarId", "slotDate");

CREATE TABLE "AgendaField" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "width" TEXT NOT NULL DEFAULT '2',
    "placeholder" TEXT,
    "titlePosition" TEXT NOT NULL DEFAULT 'above',
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT,

    CONSTRAINT "AgendaField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendaField_calendarId_idx" ON "AgendaField"("calendarId");
CREATE UNIQUE INDEX "AgendaField_calendarId_fieldKey_key" ON "AgendaField"("calendarId", "fieldKey");

CREATE TABLE "AgendaClosedDay" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "closedDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaClosedDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgendaClosedDay_calendarId_closedDate_key" ON "AgendaClosedDay"("calendarId", "closedDate");

CREATE TABLE "AgendaBooking" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "name" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "fieldsJson" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendaBooking_calendarId_startAt_idx" ON "AgendaBooking"("calendarId", "startAt");
CREATE INDEX "AgendaBooking_slotId_idx" ON "AgendaBooking"("slotId");

ALTER TABLE "AgendaSlot" ADD CONSTRAINT "AgendaSlot_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AgendaCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaField" ADD CONSTRAINT "AgendaField_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AgendaCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaClosedDay" ADD CONSTRAINT "AgendaClosedDay_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AgendaCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaBooking" ADD CONSTRAINT "AgendaBooking_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "AgendaCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaBooking" ADD CONSTRAINT "AgendaBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AgendaSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaBooking" ADD CONSTRAINT "AgendaBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
