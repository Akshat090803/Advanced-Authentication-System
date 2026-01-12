import bcrypt from "bcryptjs";

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(11);
  const hash = await bcrypt.hash(password, salt);
  return hash;
};


export const comparePassword= async (password:string,hashPassword:string)=>{
      return bcrypt.compare(password,hashPassword)
}