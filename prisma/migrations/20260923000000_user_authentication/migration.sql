ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT, ADD COLUMN "lastLoginAt" TIMESTAMP(3);
CREATE TABLE "user_sessions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE TABLE "sign_in_logs" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "sign_in_logs_email_idx" ON "sign_in_logs"("email");
CREATE INDEX "sign_in_logs_userId_idx" ON "sign_in_logs"("userId");
