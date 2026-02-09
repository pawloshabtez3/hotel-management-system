-- Add email-based auth support while keeping legacy phoneNumber.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "User" ALTER COLUMN "phoneNumber" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
