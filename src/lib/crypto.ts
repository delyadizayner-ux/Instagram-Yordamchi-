import crypto from "crypto";

// Instagram access tokenlarni bazaga yozishdan oldin shifrlash (AES-256-GCM).
// APP_ENCRYPTION_KEY — 64 ta hex belgi (32 bayt). .env.example'da yaratish buyrug'i bor.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "APP_ENCRYPTION_KEY noto'g'ri sozlangan — 64 ta hex belgi (32 bayt) bo'lishi kerak."
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Formati: iv:authTag:ciphertext (hammasi hex)
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptToken(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Shifrlangan token formati noto'g'ri.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
