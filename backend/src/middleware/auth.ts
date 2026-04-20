import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user_id?: string;
  user_email?: string;
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

import { supabase } from "../lib/supabase";

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("[Backend] Missing or invalid Authorization header");
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  
  // Diagnostic logs
  console.log(`[Backend] Auth Attempt: ${req.method} ${req.path}`);
  console.log(`[Backend] Token prefix: ${token.slice(0, 15)}...`);
  console.log(`[Backend] SUPABASE_JWT_SECRET configured: ${!!process.env.SUPABASE_JWT_SECRET}`);

  try {
    // We use getUser(token) which is the source of truth from Supabase
    // This handles verification, expiration, and project matching automatically
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("[Backend] Auth failed:", error?.message || "User not found");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user_id = user.id;
    req.user_email = user.email;
    
    console.info(`[Backend] Auth Success: ${user.email}`);
    next();
  } catch (err) {
    console.error("[Backend] Critical auth middleware error:", err);
    res.status(401).json({ error: "Authentication failed" });
    return;
  }
}
