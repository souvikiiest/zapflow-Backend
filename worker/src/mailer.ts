
import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS, 
    },
  });

  const info = await transporter.sendMail({
    from: `"MiniZap" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: body, 
  });
};
