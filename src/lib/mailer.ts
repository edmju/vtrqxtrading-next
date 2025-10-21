import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, text: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "trader@de-boysson.com",
      pass: "yxte qbqz klev gggi"
    },
  });

  await transporter.sendMail({
    from: '"VTRQX Analytics" <trader@de-boysson.com>',
    to,
    subject,
    text,
  });
}
