import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, html: string) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    console.log("Env credentials not available.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    auth: {
      user: user,
      pass: pass,
    },
  });

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
   
  return result.messageId
};
