import { z } from 'zod';

// role is intentionally NOT accepted from client input — server always assigns 'viewer'.
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
