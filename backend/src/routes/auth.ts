import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * POST /api/auth/login
 * Standard login for Swagger/External tools to get a JWT
 */
router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    // Check if the user exists in our local profiles table first to verify username/email
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: email },
          { email_username: email } // Allowing login by email or username
        ]
      }
    });

    const targetEmail = profile ? profile.email : email;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.json({
      access_token: data.session?.access_token,
      token_type: "bearer",
      expires_in: data.session?.expires_in,
      refresh_token: data.session?.refresh_token,
      user: data.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

/**
 * POST /api/auth/signup
 */
router.post("/signup", async (req, res: Response) => {
  const { email, password, full_name, matric_number, phone_number, username } = req.body;
  
  if (!email || !password || !username) {
    res.status(400).json({ error: "Email, password, and username are required" });
    return;
  }

  // Strict University Email & Password Validation
  const universityDomain = "@elizadeuniversity.edu.ng";
  const isValidEmail = email.toLowerCase().endsWith(universityDomain);
  const isValidPassword = password && password.length >= 6;

  if (!isValidEmail || !isValidPassword) {
    res.status(400).json({ 
      error: "Invalid format. Required: " + 
             (isValidEmail ? "" : `Email must be firstname.surname${universityDomain}. `) + 
             (isValidPassword ? "" : "Password must be at least 6 characters long.")
    });
    return;
  }

  try {
    // 1. Check if email or username already exists in profiles
    const existingUser = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: email },
          { email_username: username }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      res.status(400).json({ error: `${field} already exists. Please use a different one.` });
      return;
    }

    // 2. Proceed with Supabase Signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          matric_number: matric_number?.trim() || null,
          phone_number: phone_number?.trim() || null,
          username,
        },
      },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ user: data.user, session: data.session });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

export default router;
