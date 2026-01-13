import JWT from "jsonwebtoken";

export const createAccessToken = (userID:string,role:"user"|"admin",tokenVersion:number)=>{
      
  const token = JWT.sign({
    sub:userID,
    role,
    tokenVersion
  } , process.env.JWT_ACCESS_SECRET!,{
    expiresIn:'30m'
  });
  return token
}

export const verifyAccessToken = (token:string)=>{
  const payload = JWT.verify(token,process.env.JWT_ACCESS_SECRET!) as {
    sub:string,
    role:"user" | "admin",
    tokenVersion:number
  };

  return payload
}


export const createRefreshToken= (userID:string,tokenVersion:number,jti:string)=>{
   const token = JWT.sign({
    sub:userID,
    tokenVersion,
    jti
  } , process.env.JWT_REFRESH_SECRET!,{
    expiresIn:'7d'
  });
  return token
}


export const createVerifyToken = (userID:string)=>{
  const token = JWT.sign({
    sub:userID
  },process.env.JWT_EMAIL_SECRET!,{
    expiresIn:'1h'
  })
  return token
}


export const verifyRefreshToken = (token:string)=>{
     
  const payload = JWT.verify(token,process.env.JWT_REFRESH_SECRET!) as {
    sub:string;
    tokenVersion:number;
    jti:string
  };
  return payload
}