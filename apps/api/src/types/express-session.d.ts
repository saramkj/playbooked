import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "investor" | "admin";
  }
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: "investor" | "admin";
      };
    }
  }
}

export {};
