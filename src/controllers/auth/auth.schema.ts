import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string("Username must be a string")
    .trim()
    .min(1, "Username is required") //this ensure username is required
    .min(4, "Username must be atleast 4 characters")
    .max(20, "Username cannot exceeds 20 characters"),
  email: z.email("Invalid email format").trim().min(1, "Email is required").toLowerCase(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
});
