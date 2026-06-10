import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ADMIN_TOKEN_TTL = "8h";

export interface AdminRequest extends Request {
  admin?: {
    username: string;
    role: "admin";
  };
}

interface AdminJwtPayload {
  username: string;
  role: "admin";
}

const getAdminSecret = () =>
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  "";

export const getConfiguredAdminUsername = () =>
  process.env.ADMIN_USERNAME || (process.env.NODE_ENV === "production" ? "" : "admin");

const getConfiguredAdminPassword = () =>
  process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "orbit-admin");

const safeEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const adminAuthConfigured = () =>
  Boolean(getConfiguredAdminUsername() && getConfiguredAdminPassword() && getAdminSecret());

export const verifyAdminCredentials = (username: string, password: string) => {
  if (!adminAuthConfigured()) return false;
  return safeEquals(username.trim(), getConfiguredAdminUsername()) &&
    safeEquals(password, getConfiguredAdminPassword());
};

export const createAdminToken = (username: string) => {
  const secret = getAdminSecret();
  if (!secret) throw new Error("Admin session secret is not configured.");
  return jwt.sign({ username, role: "admin" } satisfies AdminJwtPayload, secret, {
    expiresIn: ADMIN_TOKEN_TTL,
  });
};

export const getAdminTokenFromRequest = (req: Request) => {
  const headerToken = req.header("x-admin-token");
  if (headerToken) return headerToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("AdminBearer ")) return authHeader.slice("AdminBearer ".length);

  return "";
};

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!adminAuthConfigured()) {
    res.status(503).json({ error: "Admin auth is not configured." });
    return;
  }

  const token = getAdminTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Admin token required" });
    return;
  }

  try {
    const payload = jwt.verify(token, getAdminSecret()) as AdminJwtPayload;
    if (payload.role !== "admin" || payload.username !== getConfiguredAdminUsername()) {
      res.status(403).json({ error: "Invalid admin session" });
      return;
    }
    req.admin = { username: payload.username, role: "admin" };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
