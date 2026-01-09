interface IError <T>{
  [key:string]:T[]
}

export class ApiError <T = string> extends Error {
  statusCode:number;
  status:string;
  success:false;
  errors:IError<T> | null;

  constructor  (statusCode:number ,message:string ,status:"success" | "fail" | "error", errors:IError<T> | null=null){
    super(message);
    this.statusCode=statusCode;
    this.status=status;
    this.success=false;
    this.errors=errors;

    Error.captureStackTrace(this,this.constructor)
  }

  
}