import { forgotPasswordHandler, googleAuthCallbackHandler, googleAuthRedirectHandler, loginHandler, logoutHandler, refreshHandler, registerHandler, resendVerifyEmailHandler, resetPasswordHandler, setup2FaHandler, verify2FaLoginHandler, verify2FaSetupHandler, verifyEmailHandler } from "@/controllers/auth/auth.controller.js";
import requireAuth from "@/middlewares/require-auth.middleware.js";
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
router.post('/2fa/setup',requireAuth,setup2FaHandler)
router.post('/2fa/setup/verify',requireAuth,verify2FaSetupHandler)
router.post('/2fa/login',verify2FaLoginHandler)
router.get('/verify-email',verifyEmailHandler);

export default  router