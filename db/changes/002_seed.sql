INSERT INTO "Room" ("name", "capacity") VALUES
    ('会議室 A', 4),
    ('会議室 B', 8),
    ('大会議室', 20);

-- Sample reservations on the day of the first apply. Times are JST; Prisma stores timestamps as UTC.
INSERT INTO "Reservation" ("roomId", "title", "reservedBy", "startAt", "endAt")
SELECT r."id", s."title", s."reservedBy",
       ((now() AT TIME ZONE 'Asia/Tokyo')::date + s."startTime") AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC',
       ((now() AT TIME ZONE 'Asia/Tokyo')::date + s."endTime") AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC'
FROM (VALUES
    ('会議室 A', '朝会', '山田', TIME '09:30', TIME '10:00'),
    ('会議室 A', '1on1', '佐藤', TIME '14:00', TIME '14:30'),
    ('大会議室', '全社定例', '鈴木', TIME '16:00', TIME '17:00')
) AS s("roomName", "title", "reservedBy", "startTime", "endTime")
JOIN "Room" r ON r."name" = s."roomName";
