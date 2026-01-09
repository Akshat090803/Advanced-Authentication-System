import cookieParser from "cookie-parser";
import express from "express"
import { errorHandler } from "@/middlewares/error.middleware.js";
import { registerHandler } from "@/controllers/auth/auth.controller.js";

const app =express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.post('/register',registerHandler)
app.use(errorHandler)
export default app