import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { adminAuth } from "../lib/firebase-admin.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
  firebaseUser?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "cafe_manager_secret_key_123456";

const DEFAULT_ALLOWED_EMAILS = [
  "gom7762@gmail.com",
  "admin@cafe.com",
  "janucafe@gmail.com",
];

export const isEmailAllowed = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const targetEmail = email.trim().toLowerCase();
  
  const allowed = new Set<string>(DEFAULT_ALLOWED_EMAILS.map(e => e.toLowerCase()));
  
  const envEmails = process.env.ALLOWED_OWNER_EMAILS;
  if (envEmails && envEmails.includes("@")) {
    envEmails.split(",").forEach((e) => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed) {
        allowed.add(trimmed);
      }
    });
  }
  
  return allowed.has(targetEmail);
};

// Manual cookie parser helper
const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      const name = parts.shift()!.trim();
      list[name] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
};

// Admin authentication middleware protecting /api/admin/*
export const requireAdminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Check for JWT inside httpOnly cookie
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.admin_token;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const role = decoded.role || "owner";
        if (role === "owner" && !isEmailAllowed(decoded.email)) {
          return res.status(403).json({ error: "Forbidden: Your email is not authorized as an owner." });
        }
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: role,
        };
        return next();
      } catch (err) {
        // Token in cookie is invalid, try headers or return unauthorized
        console.warn("Invalid JWT in cookie", err);
      }
    }

    // 2. Fallback to Authorization Header (Firebase Token or Bearer JWT)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.split("Bearer ")[1];
      
      if (!bearerToken || bearerToken === "null" || bearerToken === "undefined") {
        return res.status(401).json({ error: "Unauthorized: Invalid or empty token" });
      }

      let decoded: any = null;
      try {
        decoded = jwt.decode(bearerToken, { complete: true });
      } catch (e) {
        // Ignored, will be handled as invalid
      }

      if (!decoded) {
        return res.status(401).json({ error: "Unauthorized: Malformed token structure" });
      }

      // Discriminator: Firebase ID tokens are RS256 JWTs that must have a "kid" header claim and whose issuer (iss) starts with "https://securetoken.google.com/"
      const isFirebaseToken = !!(
        decoded.header &&
        decoded.header.kid &&
        decoded.payload &&
        decoded.payload.iss &&
        decoded.payload.iss.startsWith("https://securetoken.google.com/")
      );

      if (isFirebaseToken) {
        try {
          const decodedFirebase = await adminAuth.verifyIdToken(bearerToken);
          if (!isEmailAllowed(decodedFirebase.email)) {
            return res.status(403).json({ error: "Forbidden: Your email is not authorized as an owner." });
          }
          req.firebaseUser = decodedFirebase;
          req.user = {
            userId: 999999, // Surrogate id for Firebase users
            email: decodedFirebase.email || "",
            role: "owner",
          };
          return next();
        } catch (fbErr) {
          console.error("Firebase token verification failed:", fbErr);
          return res.status(401).json({ error: "Unauthorized: Invalid Firebase session" });
        }
      } else {
        try {
          const decodedLocal = jwt.verify(bearerToken, JWT_SECRET) as any;
          const role = decodedLocal.role || "owner";
          if (role === "owner" && !isEmailAllowed(decodedLocal.email)) {
            return res.status(403).json({ error: "Forbidden: Your email is not authorized as an owner." });
          }
          req.user = {
            userId: decodedLocal.userId,
            email: decodedLocal.email,
            role: role,
          };
          return next();
        } catch (err: any) {
          console.error("Local JWT verification failed:", err.message);
          return res.status(401).json({ error: `Unauthorized: Invalid token session (${err.message})` });
        }
      }
    }

    return res.status(401).json({ error: "Unauthorized: Owner session required" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
};
