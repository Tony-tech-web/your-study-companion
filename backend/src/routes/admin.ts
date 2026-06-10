import { Router, Response } from "express";
import {
  adminAuthConfigured,
  createAdminToken,
  getConfiguredAdminUsername,
  requireAdmin,
  verifyAdminCredentials,
  AdminRequest,
} from "../middleware/adminAuth";

const router = Router();

router.post("/login", (req, res: Response) => {
  const { username, password } = req.body || {};

  if (!adminAuthConfigured()) {
    res.status(503).json({ error: "Admin auth is not configured." });
    return;
  }

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  if (!verifyAdminCredentials(String(username), String(password))) {
    res.status(401).json({ error: "Invalid admin credentials." });
    return;
  }

  const token = createAdminToken(String(username).trim());
  res.json({
    token,
    token_type: "admin",
    expires_in: 8 * 60 * 60,
    admin: {
      username: getConfiguredAdminUsername(),
      role: "admin",
    },
  });
});

router.get("/session", requireAdmin, (req: AdminRequest, res: Response) => {
  res.json({
    authenticated: true,
    admin: req.admin,
  });
});

export default router;
