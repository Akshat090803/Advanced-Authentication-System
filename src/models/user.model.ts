import { Schema, Document, model } from "mongoose";

export interface IRefreshSession {
  jti: string;
  createdAt?: Date;
  userAgent?: string;
}
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  twoFactoredEnabled: boolean;
  twoFactorSecret?: string;
  tokenVersion: number;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
  refreshSessions: IRefreshSession[];
}

const refreshSessionSchema = new Schema<IRefreshSession>({
  jti: {
    type: String,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userAgent: {
    type: String,
    default:""
  },
},{_id:false});

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      unique: [true, "Username already taken"],
      index: true, //fast search based on username
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: [true, "Email already taken"],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, //by default exclude it from sending in query result
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    twoFactoredEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: undefined,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
      index: true, // Fast lookup during password reset
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    refreshSessions:{
      type:[refreshSessionSchema],
      default:[]
    }
  },
  {
    timestamps: true,
  }
);


const User = model<IUser>("user", userSchema);
export default User;
