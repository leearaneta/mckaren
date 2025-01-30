-- Set timezone to EST/EDT
SET timezone = 'America/New_York';

-- Make this the default for all new connections
ALTER DATABASE :DBNAME SET timezone = 'America/New_York';

-- Create facilities table with name as primary key
CREATE TABLE IF NOT EXISTS facilities (
    name TEXT PRIMARY KEY,
    headers JSONB NULL,
    courts JSONB NOT NULL
);

-- Create half_hour_openings table with facility reference
CREATE TABLE IF NOT EXISTS half_hour_openings (
    facility TEXT REFERENCES facilities(name),
    court TEXT,
    datetime TIMESTAMPTZ,
    PRIMARY KEY (facility, court, datetime)
);

-- Insert known facilities with their courts
INSERT INTO facilities (name, courts)
VALUES 
    ('mccarren', '[
        "Court #1 (Singles Court)",
        "Court #2",
        "Court #3",
        "Court #4",
        "Court #5",
        "Court #6",
        "Court #7"
    ]'::jsonb),
    ('usta', '[
        "9186",
        "9187",
        "9188",
        "9189",
        "9190",
        "9191",
        "9192",
        "9193",
        "9940",
        "9941",
        "9942",
        "9943"
    ]'::jsonb),
    ('pptc', '[
        "Court 1a",
        "Court 1b",
        "Court 2a",
        "Court 2b",
        "Court 3a",
        "Court 3b",
        "Court 4a",
        "Court 4b",
        "Court 5a",
        "Court 5b",
        "Court 6b"
    ]'::jsonb)
ON CONFLICT (name) DO UPDATE SET courts = EXCLUDED.courts; 