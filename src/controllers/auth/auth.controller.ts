import { NextFunction, Request, Response } from "express";
import { registerSchema } from "./auth.schema.js";
import User from "@/models/user.model.js";
import { ApiError } from "@/utils/api-error.js";
import { hashPassword } from "@/utils/hash-password.js";
import JWT from "jsonwebtoken";
import { sendEmail } from "@/utils/email.js";
import { sendSuccessResponse } from "@/utils/send-success-resposne.js";

const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT}`;
export const registerHandler = async (req: Request, res: Response ,next:NextFunction) => {
 try {
   //!with using .parse
  const result = registerSchema.parse(req.body);
  const { username, email, password } = result;
  //no if condition for !result.success

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    const duplicateField =
      existingUser.username === username ? "username" : "email";
    throw new ApiError(409, "Conflict Error", "fail", {
      [duplicateField]: [
        `${
          duplicateField[0].toUpperCase() + duplicateField.slice(1)
        } is already taken.`,
      ],
    });
  }

  const passwordHash = await hashPassword(password);

  const registeredUser = await User.create({
    email: email,
    username: username,
    password: passwordHash,
    role: "user",
    isEmailVerified: false,
    twoFactoredEnabled: false,
  });

  const verifyToken = JWT.sign(
    {
      sub: registeredUser._id.toString(),
    },
    process.env.JWT_ACCESS_SECRET!,
    {
      expiresIn: "1h",
    }
  );

  const verifyUrl = `${appUrl}/auth/verify-email?token=${verifyToken}`;

  await sendEmail(
    registeredUser.email,
    `Thanks for registering ${registeredUser.username}. Please Verify Your Email`,
    `
       <div>
       <p>verify your email by clicking the link below</p>
       <p><a href={${verifyUrl}}>click here</a></p>
       </div>
    `
  );

  const resData = {
    id: registeredUser._id.toString(),
    email: registeredUser.email,
    username: registeredUser.username,
    role: registeredUser.role,
    isEmailVerified: registeredUser.isEmailVerified,
  };
  return sendSuccessResponse({
    res,
    statusCode: 201,
    message: "User registered",
    data: resData,
  });
 } catch (error) {
   next(error)
 }
 
};

export const verifyEmailHandler = async (req: Request, res: Response,next:NextFunction) => {
  try {
    
    const token = req.query.token as string | undefined;

  if (!token) {
    throw new ApiError(400, "Validation Error", "fail", {
      token: ["Verification Token is missing."],
    });
  }

  const payload = JWT.verify(token, process.env.JWT_ACCESS_SECRET!) as {
    sub: string;
  };
  const user = await User.findById(payload.sub);

  if (!user) {
    throw new ApiError(404, "Not Found.", "fail", {
      user: ["User not found."],
    });
  }

  if (user.isEmailVerified) {
   return sendSuccessResponse({
        res,
        statusCode: 200,
        message: "Email is already verified.",
      });
  }

  user.isEmailVerified = true;
  await user.save();

  return sendSuccessResponse({
    res,
    statusCode:200,
    message:"User Verified Successfully",
  })
  } catch (error:any) {
    if (error?.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token Expired","fail", { token: ["Link has expired."] }));
    }
     next(error)
  }
};

//!registerHandler Points
//!is we use safe parse it doesnot throw error it
//  ?   The result of a safeParse is what we call a Discriminated Union. It looks like this behind the scenes:
// ?If successful: { success: true, data: { ... } }
// ?If failed: { success: false, error: ZodError }
//!Alternate .parse()
// ?if you are using a Global Error Handler or a try/catch block, you can use .parse() instead. It returns the data directly or throws an error if it fails:
// const result = registerSchema.safeParse(req.body);

// if (!result.success) {
//   return res.status(400).json({
//     success: false,
//     message: result.error.flatten(),
//   });
// }
// const { username, email, password } = result.data;

//!with using .parse
// const result = registerSchema.parse(req.body);
// const { username, email, password } = result;
//?no if condition for !result.success

//!
// const userExist = await User.findOne({
//   $or: [{ $eq: { username: username } }, { $eq: { email: email } }],
// });
//?this above is unOptimised query as findOne will return whole user document but we just want to check is user exist or not , returning whole user will take time
//!so...
//userexists only return _id
// const existingUser = await User.exists({
//   $or:[{username},{email}]
// })
// if(existingUser){
//       return res.status(409).json({ message: "Username or Email already exists" });
// }
//?But this way we are sending a common message that either username or email is used not giving info of  a specific field .

//!so we again switch to findOne
// const existingUser = await User.findOne({
//   $or: [{ username }, { email }],
// });

// if (existingUser) {
//   if (existingUser.username === username && existingUser.email === email) {
//     return res
//       .status(409)
//       .json({ message: "Both Username and Email are already taken" });
//   }
//   if (existingUser.username === username) {
//     return res.status(409).json({ message: "Username is already taken" });
//   }
//   if (existingUser.email === email) {
//     return res.status(409).json({ message: "Email is already registered" });
//   }
// }
//? But this way user only get to know about that username or email is taken only when he hit submit button
//?this is bad ux as in comapny as we type on username , a small checkavailability api hits on change to show insatnt availabiltiy.
//! so we create a checkAvaialbility api also
//!and also what in case if at time of typing username was available but during submission , username taken
//?so we check in registerHandler also as a final check and at checkAvailability api also for instant check result at ui
