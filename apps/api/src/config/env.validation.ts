import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().email().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).optional(),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optionalEmail,
  SMTP_PASS: optionalNonEmptyString,
  SMTP_FROM_EMAIL: optionalEmail,
  APP_NAME: optionalNonEmptyString,
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  PORT: z.coerce.number().int().positive().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return envSchema.parse(config);
}
