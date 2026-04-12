-- Add Twilio SMS configuration columns to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS twilio_token TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS twilio_from TEXT;
