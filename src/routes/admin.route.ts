import { getDashboardData } from "@/controllers/admin/admin.controller.js";
import requireAuth from "@/middlewares/require-auth.middleware.js";
import requireRole from "@/middlewares/require-role.middleware.js";
import express from "express"

const router = express();


router.get('/dashboard',requireAuth,requireRole('admin'),getDashboardData)


export default router