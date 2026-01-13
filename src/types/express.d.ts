import { IUser } from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: IUser["role"];
        email: string;
        username: string;
        isEmailVerified: boolean;
      };
    }
  }
}