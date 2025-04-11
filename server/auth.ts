import { type Express, type Request, type Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import session from "express-session";
import { User } from "@shared/schema";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import MemoryStore from "memorystore";

// For production, use a secure key from env variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-for-development";

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token generation
export function generateJWT(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Configure session store
const SessionStore = MemoryStore(session);

export function setupAuth(app: Express) {
  // Initialize session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "clinic-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 }, // 1 day
      store: new SessionStore({
        checkPeriod: 86400000 // 24 hours
      })
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password login
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "User not found" });
          }

          const isPasswordValid = await verifyPassword(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: "Invalid password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // JWT token handling middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if user is already authenticated via session
    if (req.isAuthenticated()) {
      return next();
    }

    // Check for JWT token in authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyJWT(token);
      
      if (decoded) {
        // Set user in request for use in routes
        req.user = decoded;
        return next();
      }
    }

    next();
  });

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Declare user property in Express Request interface
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      role: 'admin' | 'medico' | 'recepcionista';
      professionalId?: number;
    }
  }
}
