import { ApiError } from "@/utils/api-error.js";
import { NextFunction, Request, Response } from "express"


const requireRole = (role:"admin"|"user")=>{

  return (req:Request,_res:Response,next:NextFunction)=>{

      try {
        const authUser = req.user;

      if(!authUser){
         throw new ApiError(401,"Unauthorized","fail")
      }

      if(authUser.role !== role){
        throw new ApiError(403,"Forbidden Access","fail",{
          errors:["You are not authorized to access"]
        })
      }

      next()
      } catch (error) {
        next(error)
      }
  }
}

export default requireRole