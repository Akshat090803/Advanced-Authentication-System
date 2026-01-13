import { NextFunction, Request, Response } from "express";
import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";
import User, { IUser } from "@/models/user.model.js";
import { ApiError } from "@/utils/api-error.js";
import { comparePassword, hashPassword } from "@/utils/hash-password.js";
import JWT from "jsonwebtoken";
import { sendEmail } from "@/utils/email.js";
import { sendSuccessResponse } from "@/utils/send-success-resposne.js";
import {
  createAccessToken,
  createRefreshToken,
  createVerifyToken,
  verifyRefreshToken,
} from "@/utils/tokens.js";
import crypto, { randomUUID } from "crypto";

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appUrl = process.env.BACKEND_URL!;
    console.log("appUrl", appUrl);
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

    const verifyToken = createVerifyToken(registeredUser._id.toString());

    const verifyUrl = `${appUrl}/auth/verify-email?token=${verifyToken}`;

    await sendEmail(
      registeredUser.email,
      "Verify your email address",
      `
        <div>
          <p>Hello ${registeredUser.username},</p>
          <p>Please verify your email by clicking the link below:</p>
          <p>
            <a href="${verifyUrl}" target="_blank">
              Verify Email
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
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
    next(error);
  }
};

export const verifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.query.token as string | undefined;

    if (!token) {
      throw new ApiError(400, "Validation Error", "fail", {
        errors: ["Verification Token is missing."],
      });
    }

    const payload = JWT.verify(token, process.env.JWT_EMAIL_SECRET!) as {
      sub: string;
    };

    const user = await User.findById(payload?.sub);

    if (!user) {
      throw new ApiError(404, "Not Found.", "fail", {
        errors: ["User not found."],
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
      statusCode: 200,
      message: "User Verified Successfully",
    });
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      return next(
        new ApiError(401, "Token Expired", "fail", {
          errors: ["Link has expired."],
        })
      );
    }
    next(error);
  }
};

export const resendVerifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const appUrl = process.env.BACKEND_URL!;
    console.log("appUrl", appUrl);
    const { email } = emailSchema.parse(req.body);

    if (!email) {
      throw new ApiError(400, "Validation Error", "fail", {
        errors: ["Email is required"],
      });
    }

    //!both will have only _id field
    // const user = await User.findOne({email}).select({_id:true});
    // const user = await User.exists({email});

    const user = await User.findOne({ email });
    if (!user) {
      return sendSuccessResponse({
        res,
        statusCode: 200,
        message: "If the email exists, a verification link has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return sendSuccessResponse({
        res,
        statusCode: 200,
        message: "Email is already verified.",
      });
    }

    const verifyToken = createVerifyToken(user._id.toString());

    const verifyUrl = `${appUrl}/auth/verify-email?token=${verifyToken}`;
    await sendEmail(
      user.email,
      "Verify your email address",
      `
        <div>
          <p>Hello ${user.username},</p>
          <p>Please verify your email by clicking the link below:</p>
          <p>
            <a href="${verifyUrl}" target="_blank">
              Verify Email
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
        </div>
      `
    );

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "If the email exists, a verification link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = loginSchema.parse(req.body);
    const { email, password } = result;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new ApiError(404, "Not Found", "fail", {
        errors: ["User with this email not found."],
      });
    }
    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      throw new ApiError(401, "Incorrect Password", "fail", {
        errors: ["Password is Incorrect."],
      });
    }

    if (!user.isEmailVerified) {
      throw new ApiError(403, "Email is not verified", "fail", {
        errors: ["Email is not verified yet. Please verify your email."],
      });
    }

    const MAX_SESSIONS = 5;
    if (user.refreshSessions.length >= MAX_SESSIONS) {
      user.refreshSessions.shift();
    }

    const jti = randomUUID();
    user.refreshSessions.push({
      jti,
      userAgent: req.headers["user-agent"],
    });

    await user.save();
    const userID = user._id.toString();
    const tokenVersion = user.tokenVersion;
    const role = user.role;

    const accessToken = createAccessToken(userID, role, tokenVersion);

    const refreshToken = createRefreshToken(userID, tokenVersion, jti);

    const isProd = process.env.NODE_ENV === "production";
    //  refresh token is saved to cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: isProd,
      path: "/",
    });

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Login done successfully",
      data: {
        accessToken,
        id: userID,
        role,
        userName: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactoredEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// will refresh access and refresh Token
export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new ApiError(401, "Refresh token not found", "fail");
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload || !payload?.sub || !payload?.jti) {
      throw new ApiError(401, "Invalid Refresh Token", "fail", {
        errors: ["User details missing in refresh token"],
      });
    }
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new ApiError(404, "User not found", "fail");
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new ApiError(401, "Invalid Refresh Token", "fail", {
        errors: [
          "User's tokenVersion didn't match refresh token's tokenVersion",
        ],
      });
    }

    const isSessionExist = user.refreshSessions.some((s) => {
      return s.jti === payload.jti;
    });

    if (!isSessionExist) {
      throw new ApiError(401, "Invalid refresh token", "fail", {
        errors: ["User session has expired"],
      });
    }

    const newJti = randomUUID();

    //remove old session
    await User.findByIdAndUpdate(payload.sub, {
      $pull: { refreshSessions: { jti: payload.jti } },
    });
    //add new session
    await User.findByIdAndUpdate(payload.sub, {
      $push: {
        refreshSessions: {
          jti: newJti,
          userAgent: req.headers["user-agent"],
        },
      },
    });

    const userID = user._id.toString();
    const tokenVersion = user.tokenVersion;
    const role = user.role;
    const newAccessToken = createAccessToken(userID, role, tokenVersion);
    const newRefreshToken = createRefreshToken(userID, tokenVersion, newJti);

    const isProd = process.env.NODE_ENV === "production";
    //  refresh token is saved to cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: isProd,
      path: "/",
    });

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Refresh token updated successfully",
      data: {
        accessToken: newAccessToken,
        id: userID,
        role,
        userName: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactoredEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);

        if (payload?.sub && payload?.jti) {
          //  Remove ONLY this session (single device logout)
          await User.findByIdAndUpdate(payload.sub, {
            $pull: {
              refreshSessions: { jti: payload.jti },
            },
          });
        }
      } catch {
        // ignore invalid / expired refresh token
      }
    }

    //clear cookie from  browser
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Logged out from this device successfully",
    });
  } catch (error) {
    next(error);
  }
};

//forgot password
export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, method } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });

    if (!user) {
      return sendSuccessResponse({
        res,
        statusCode: 200,
        message: "If the email exists, reset instructions have been sent.",
      });
    }

    user.resetPasswordToken = undefined;
    user.resetPasswordOtp = undefined;

    const expireAt = new Date(Date.now() + 10 * 60 * 1000); //expires in 10 min
    user.resetPasswordExpires = expireAt;

    if (method === "token") {
      const appUrl = process.env.BACKEND_URL!;
      //create a raw token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.resetPasswordToken = hashedToken;

      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await sendEmail(
        user.email,
        "Reset your password",
        `
          <p>Hello ${user.username},</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" target="_blank">Reset Password</a>
          <p>This link expires in 10 minutes.</p>
        `
      );
    }

    if (method === "otp") {
      // const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otp = crypto.randomInt(100000, 1000000).toString();
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

      user.resetPasswordOtp = hashedOtp;

      await sendEmail(
        user.email,
        "Your password reset OTP",
        `
          <p>Hello ${user.username},</p>
          <p>Your OTP for password reset is:</p>
          <h2>${otp}</h2>
          <p>This OTP expires in 10 minutes.</p>
        `
      );
    }

    await user.save();
    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "If the email exists, reset instructions have been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, token, otp } = resetPasswordSchema.parse(req.body);

    if (!password || (!token && !otp)) {
      throw new ApiError(400, "Validation Error", "fail", {
        errors: ["Password and token or otp are required"],
      });
    }

    let user: IUser | null = null;

    //token validation
    if (token) {
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      }).select("+password");
    }

    //otp validation
    else if (otp) {
      const normalizedOtp = otp.replace(/\s+/g, "");
      const hashedOtp = crypto.createHash("sha256").update(normalizedOtp).digest("hex");

      user = await User.findOne({
        resetPasswordOtp: hashedOtp,
        resetPasswordExpires: { $gt: Date.now() },
      }).select("+password");
    }

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset request", "fail");
    }

    const newHashedPassword = await hashPassword(password);
    user.password = newHashedPassword;

    //reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;

    //invalidate all user sessions
    user.tokenVersion += 1;
    user.refreshSessions = [];
    await user.save();

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Password reset successfully. Please login again.",
    });
  } catch (error) {
    next(error);
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

//?Crypto vs Bcrypt

//! for hashing Passwords use bcrypt
//!for resetting passwords use Crypto
// crypto vs bcrypt — What each is for
// Use case	crypto (SHA-256)	bcrypt
// Passwords	❌ Not ideal	✅ BEST
// Reset tokens	✅ BEST	❌ Overkill
// OTPs	✅ BEST	❌ Overkill
// Fast comparison	✅	❌ Slow
// Built-in salt	❌ (not needed here)	✅
// CPU cost	Low	High
// 🧠 Why bcrypt is WRONG for reset tokens / OTPs

// Reset tokens & OTPs are:

// Short-lived (10–15 min)

// One-time use

// Random & high entropy

// bcrypt:

// Is intentionally slow

// Uses random salt

// Requires bcrypt.compare() (costly)

// 👉 This gives NO real security benefit here and:

// Increases CPU load

// Makes brute-force protection worse at scale

// Complicates logic

// ✅ Correct Security Model
// Passwords

// ✔ bcrypt
// ✔ High cost
// ✔ Long-term storage

// Reset tokens / OTPs

// ✔ crypto hashing
// ✔ Fast comparison
// ✔ Short-lived
// ✔ One-time use
