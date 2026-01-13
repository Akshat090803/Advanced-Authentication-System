import User from "@/models/user.model.js"
import { ApiError } from "@/utils/api-error.js";
import { sendSuccessResponse } from "@/utils/send-success-resposne.js";
import { NextFunction, Request, Response } from "express"

export const getUserStats = async(req:Request,res:Response,next:NextFunction)=>{
  try {
     
    const userId=req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized", "fail"); //
    }

     const user = await User.findById(userId).select({
      loginCount: 1,
      refreshSessions: 1,
    });

    if(!user){
       throw new ApiError(404, "User not found", "fail");
    }
     
    return sendSuccessResponse({
      res,
      statusCode:200,
      message:"User stats fetched successfully",
      data:{
        loginCount: user.loginCount,
        sessionCount: user.refreshSessions.length,
        username:req.user?.username,
        email:req.user?.email
      }
    })

  } catch (error) {
    next(error)
  }
}