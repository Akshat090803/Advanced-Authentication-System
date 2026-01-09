import { ApiError } from "@/utils/api-error.js";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
   let statusCode = 500;
  let status = "error";
  let message = "Internal Server Error";
  let errors: Record<string, unknown[] | undefined> | null = null;

   if (err instanceof ApiError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    errors = err.errors;
  }
  else if (err instanceof ZodError) {
    statusCode = 400;
    status = "fail";
    message = "Validation Error";
    errors = err.flatten().fieldErrors;
  }
  else if (typeof err ==='object' && err!=null && "code" in err && err.code===11000){
    statusCode = 409;
    status = "fail";
    message = "Conflict Error";
    const keyValue = (err as any).keyValue ?? {}; //{keyValue: {email:"",username:""}}
    const field = Object.keys(keyValue)[0];
 
    errors = { [field]: [`${field} already exists`] };
  }
  else if (err instanceof Error) {
    message = err.message || message;
  }

  //final err response
  return res.status(statusCode || 500).json({
    status: status || "error",
    success: false,
    message: message || "Internal Server Error",
    errors: errors || null,
  });
};
