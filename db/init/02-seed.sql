-- =========================================================
-- BusMitra Database Seed Data
-- Seeded from data/routes.json, data/stops.json, data/gtfs.json
-- =========================================================

-- Seed Route M1 (Moga -> Dagru)
INSERT INTO routes (id, name, description, color, polyline)
VALUES (
    'M1',
    'Moga → Dagru',
    'Main city route from Moga Bus Stand to Dagru Village via GT Road',
    '#1a56db',
    '[
      { "lat": 30.8163, "lng": 75.1720 },
      { "lat": 30.8165, "lng": 75.1710 },
      { "lat": 30.8170, "lng": 75.1695 },
      { "lat": 30.8175, "lng": 75.1685 },
      { "lat": 30.8180, "lng": 75.1670 },
      { "lat": 30.8185, "lng": 75.1650 },
      { "lat": 30.8190, "lng": 75.1630 },
      { "lat": 30.8195, "lng": 75.1600 },
      { "lat": 30.8205, "lng": 75.1570 },
      { "lat": 30.8215, "lng": 75.1530 },
      { "lat": 30.8225, "lng": 75.1490 },
      { "lat": 30.8240, "lng": 75.1440 },
      { "lat": 30.8255, "lng": 75.1390 },
      { "lat": 30.8270, "lng": 75.1340 },
      { "lat": 30.8290, "lng": 75.1280 },
      { "lat": 30.8310, "lng": 75.1220 },
      { "lat": 30.8325, "lng": 75.1180 },
      { "lat": 30.8335, "lng": 75.1165 },
      { "lat": 30.8345, "lng": 75.1155 },
      { "lat": 30.8350, "lng": 75.1150 }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed Driver D1
INSERT INTO drivers (id, name, phone, route_id, score)
VALUES ('D1', 'Rajesh Kumar', '+919876543210', 'M1', 88)
ON CONFLICT (id) DO NOTHING;

-- Seed Bus M1
INSERT INTO buses (id, route_id, driver_id, current_lat, current_lng, speed, status, heading, onboard)
VALUES ('M1', 'M1', 'D1', 30.8163, 75.1720, 0, 'scheduled', 0, 14)
ON CONFLICT (id) DO UPDATE SET
    current_lat = EXCLUDED.current_lat,
    current_lng = EXCLUDED.current_lng;

-- Seed 8 Stops along Route M1
INSERT INTO stops (id, name, lat, lng, order_num, route_id) VALUES
('S1', 'Moga Bus Stand', 30.8163, 75.1720, 1, 'M1'),
('S2', 'Bhagwan Chowk', 30.8175, 75.1685, 2, 'M1'),
('S3', 'Railway Station', 30.8190, 75.1630, 3, 'M1'),
('S4', 'Civil Hospital', 30.8215, 75.1530, 4, 'M1'),
('S5', 'Guru Nanak Chowk', 30.8240, 75.1440, 5, 'M1'),
('S6', 'Kot Ise Khan Road', 30.8270, 75.1340, 6, 'M1'),
('S7', 'Dairy Complex', 30.8310, 75.1220, 7, 'M1'),
('S8', 'Dagru Village', 30.8350, 75.1150, 8, 'M1')
ON CONFLICT (id) DO NOTHING;

-- Seed GTFS Timetable Data (Trip M1-T1 and M1-T2)
INSERT INTO gtfs_data (id, route_id, stop_id, arrival_time, departure_time, stop_sequence, day_type) VALUES
('GTFS-1', 'M1', 'S1', '06:00:00', '06:02:00', 1, 'weekday'),
('GTFS-2', 'M1', 'S2', '06:07:00', '06:08:00', 2, 'weekday'),
('GTFS-3', 'M1', 'S3', '06:14:00', '06:15:00', 3, 'weekday'),
('GTFS-4', 'M1', 'S4', '06:21:00', '06:22:00', 4, 'weekday'),
('GTFS-5', 'M1', 'S5', '06:28:00', '06:29:00', 5, 'weekday'),
('GTFS-6', 'M1', 'S6', '06:34:00', '06:35:00', 6, 'weekday'),
('GTFS-7', 'M1', 'S7', '06:40:00', '06:41:00', 7, 'weekday'),
('GTFS-8', 'M1', 'S8', '06:47:00', '06:47:00', 8, 'weekday'),
('GTFS-9', 'M1', 'S1', '09:00:00', '09:02:00', 1, 'weekday'),
('GTFS-10', 'M1', 'S2', '09:07:00', '09:08:00', 2, 'weekday'),
('GTFS-11', 'M1', 'S3', '09:14:00', '09:15:00', 3, 'weekday'),
('GTFS-12', 'M1', 'S4', '09:21:00', '09:22:00', 4, 'weekday')
ON CONFLICT (id) DO NOTHING;

-- Seed Historical Speeds for Rush Hours and Regular Hours
INSERT INTO historical_speeds (route_id, hour, avg_speed_kmh, sample_count) VALUES
('M1', 8, 18.5, 42),
('M1', 9, 16.0, 58),
('M1', 12, 22.4, 35),
('M1', 17, 17.2, 50),
('M1', 18, 15.8, 62),
('M1', 20, 24.0, 28)
ON CONFLICT DO NOTHING;
