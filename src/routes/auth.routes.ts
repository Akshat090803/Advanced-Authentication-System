import { forgotPasswordHandler, googleAuthCallbackHandler, googleAuthRedirectHandler, loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerifyEmailHandler, resetPasswordHandler, verifyEmailHandler } from "@/controllers/auth/auth.controller.js";
import express from "express"

const router = express.Router();


router.post('/register',registerHandler);
router.post('/login',loginHandler);
router.post('/resend-verification',resendVerifyEmailHandler);
router.post('/refresh',refreshHandler);
router.post('/logout',logoutHandler);
router.post('/forgot-password',forgotPasswordHandler);
router.post('/reset-password',resetPasswordHandler);
router.get('/google',googleAuthRedirectHandler)
router.get('/google/callback',googleAuthCallbackHandler)
router.get('/verify-email',verifyEmailHandler);

export default  router