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

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT secret missing" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as SupabaseJwtPayload;
    req.user_id = payload.sub;
    req.user_email = payload.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
