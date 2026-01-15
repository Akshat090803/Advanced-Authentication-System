
import { getUserStats } from "@/controllers/user/user.controller.js";
import requireAuth from "@/middlewares/require-auth.middleware.js";
import express from "express"

const router = express.Router();

router.get('/user-stats',requireAuth,getUserStats)


export default router