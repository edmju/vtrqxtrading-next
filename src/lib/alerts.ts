import { sendMail } from "./mailer";
import { sendTelegramMessage } from "./telegram";
import fs from "fs";

export async function checkAlerts(user: any) {
  const data = JSON.parse(fs.readFileSync("src/data/macroData_Global.json", "utf-8"));
  const changes = [];

  for (const c of data.data) {
    const { country, indicators } = c;
    if (parseFloat(indicators.Inflation) > 4) {
      changes.push(`${country}: inflation élevée (${indicators.Inflation}%)`);
    }
    if (parseFloat(indicators.Unemployment) > 6) {
      changes.push(`${country}: chômage élevé (${indicators.Unemployment}%)`);
    }
  }

  if (changes.length > 0) {
    const msg = `📊 Alertes économiques:\n${changes.join("\n")}`;
    if (user.prefMail) await sendMail(user.prefMail, "Alerte macro", msg);
    if (user.prefTelegram) await sendTelegramMessage(user.prefTelegram, msg);
  }
}
