CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reservedBy" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

CREATE INDEX "Reservation_roomId_startAt_idx" ON "Reservation"("roomId", "startAt");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
