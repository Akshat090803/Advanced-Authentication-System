import cookieParser from "cookie-parser";
import express from "express"
import { errorHandler } from "@/middlewares/error.middleware.js";
import authRoutes from "@routes/auth.routes.js"
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";


const app =express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.use('/auth',authRoutes)
app.use('/user',userRoutes)
app.use('/admin',adminRoutes)
app.use(errorHandler)
export default app