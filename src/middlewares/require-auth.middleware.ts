import User from "@/models/user.model.js";
import { ApiError } from "@/utils/api-error.js";
import { verifyAccessToken } from "@/utils/tokens.js";
import { Request, Response, NextFunction } from "express";

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (!token) {
      throw new ApiError(401, "Unauthorized", "fail", {
        errors: ["Access token missing"],
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token expired", "fail");
      }
      throw new ApiError(401, "Invalid access token", "fail");
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(404, "User not found", "fail");
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new ApiError(401, "Token invalidated", "fail");
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default requireAuth;
