import User from "@/models/user.model.js";
import { sendSuccessResponse } from "@/utils/send-success-resposne.js";
import { NextFunction, Request, Response } from "express";


export const getDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await User.find(
      {},
      {
        email: 1,
        role: 1,
        username: 1,
        createdAt: 1,
        isEmailVerified: 1,
        loginCount: 1,
        refreshSessions: 1,
      }
    ).sort({ createdAt: -1 });

    const resArr = users.map((user) => {
      return {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        loginCount: user.loginCount,
        sessionCount: user.refreshSessions.length,
      };
    });

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Users fetched successfully",
      data: resArr,
    });
  } catch (error) {
    next(error);
  }
};
