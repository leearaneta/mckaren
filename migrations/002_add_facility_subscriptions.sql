CREATE TABLE facility_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  facility TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  minimum_duration INTEGER NOT NULL CHECK (minimum_duration >= 30 AND minimum_duration <= 180 AND minimum_duration % 30 = 0),
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour INTEGER NOT NULL CHECK (end_hour > 0 AND end_hour <= 24),
  omitted_courts TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_end_hour CHECK (end_hour > start_hour),
  CONSTRAINT valid_facility FOREIGN KEY (facility) REFERENCES facilities (name) ON DELETE CASCADE
);

-- Create index for efficient lookups by email and facility
CREATE INDEX facility_subscriptions_email_idx ON facility_subscriptions (email);
CREATE INDEX facility_subscriptions_facility_idx ON facility_subscriptions (facility); 