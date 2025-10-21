export async function sendTelegramMessage(chatId: string, message: string) {
  const botToken = "8073450438:AAHMRm4I5DxCj4WX80ryjZ48L1reCHWiTSc";
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}
