import { loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerifyEmailHandler, verifyEmailHandler } from "@/controllers/auth/auth.controller.js";
import express from "express"

const router = express.Router();


router.post('/register',registerHandler);
router.post('/login',loginHandler);
router.post('/resend-verification',resendVerifyEmailHandler);
router.post('/refresh',refreshHandler);
router.post('/logout',logoutHandler)
router.get('/verify-email',verifyEmailHandler);

export default  router