-- Create new subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  days_of_week INTEGER[] NOT NULL,
  minimum_duration INTEGER NOT NULL CHECK (minimum_duration >= 30 AND minimum_duration <= 180 AND minimum_duration % 30 = 0),
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  start_minute INTEGER NOT NULL CHECK (start_minute = 0 OR start_minute = 30),
  end_hour INTEGER NOT NULL CHECK (end_hour > 0 AND end_hour <= 24),
  end_minute INTEGER NOT NULL CHECK (end_minute = 0 OR end_minute = 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_end_hour CHECK (end_hour > start_hour)
);

-- Create new facility_subscriptions join table
CREATE TABLE new_facility_subscriptions (
  facility TEXT NOT NULL,
  subscription_id INTEGER NOT NULL,
  PRIMARY KEY (facility, subscription_id),
  FOREIGN KEY (facility) REFERENCES facilities(name) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Drop old table and rename new join table
DROP TABLE facility_subscriptions CASCADE;
ALTER TABLE new_facility_subscriptions RENAME TO facility_subscriptions;

-- Create indexes for efficient lookups
CREATE INDEX subscriptions_email_idx ON subscriptions (email);
CREATE INDEX facility_subscriptions_subscription_id_idx ON facility_subscriptions (subscription_id); 