import path from "path";
import { promises as fs } from "fs";

export async function readMacroJson(file = "macroData_Global.json") {
  const filePath = path.join(process.cwd(), "src", "data", file);
  const raw = await fs.readFile(filePath, "utf-8");
  const j = JSON.parse(raw);
  if (j?.data) return j;
  if (j?.sources) return { updated: j.updated, data: j.sources };
  return { updated: j?.updated, data: [] };
}
