import { Response } from "express"


interface ISendSuccessResponse <T>{
   res:Response;
   statusCode:number;
   message:string;
   data?:T;

}

export const sendSuccessResponse = <T>({res,statusCode,message,data}:ISendSuccessResponse<T>)=>{
       return res.status(statusCode).json({
        status:"success",
        success:true,
        message,
        data:data ?? null
       })
}