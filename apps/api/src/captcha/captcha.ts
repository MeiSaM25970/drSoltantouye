import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { BadRequestException } from "@nestjs/common";
import { jwtSecret } from "../common/secrets";

const TTL_MS = 5 * 60 * 1000;
const secret = jwtSecret;
const usedNonces = new Map<string, number>();

/** Digit shapes as strokes inside a 10 x 16 box. Drawn as paths so the code never appears as text in the image. */
const GLYPHS: Record<string, [number, number][]> = {
  "2": [[0.5, 3.5], [2, 1], [5, 0], [8, 1], [9.5, 3.5], [8.5, 6.5], [0.5, 15.5], [9.5, 15.5]],
  "3": [[0.5, 2.5], [3, 0.5], [6.5, 0.5], [9, 2.5], [8.5, 5.5], [4.5, 7.5], [9, 10], [9.5, 13], [7, 15.5], [3, 15.5], [0.5, 13.5]],
  "4": [[7, 15.5], [7, 0.5], [0.5, 11], [10, 11]],
  "5": [[9, 0.5], [1.5, 0.5], [1, 7], [4, 6], [7.5, 6.5], [9.5, 9.5], [9, 13], [6.5, 15.5], [3, 15.5], [0.5, 13]],
  "6": [[8.5, 1.5], [5, 0.5], [2, 3], [0.5, 8], [0.5, 12], [2.5, 15.5], [6, 15.5], [9, 13], [9, 9.5], [6.5, 7], [3, 7.5], [0.8, 10]],
  "7": [[0.5, 0.5], [9.5, 0.5], [4.5, 15.5]],
  "8": [[5, 7.5], [1.5, 6], [1, 2.5], [3.5, 0.5], [6.5, 0.5], [9, 2.5], [8.5, 6], [5, 7.5], [1, 10], [0.5, 13], [3, 15.5], [7, 15.5], [9.5, 13], [9, 10], [5, 7.5]],
  "9": [[1.5, 14.5], [5, 15.5], [8, 13], [9.5, 8], [9.5, 4], [7.5, 0.5], [4, 0.5], [1, 3], [1, 6.5], [3.5, 9], [7, 8.5], [9.2, 6]],
};

const INKS = ["#2b1d14", "#3a281c", "#8c4f26", "#b4693a", "#5b3a24"];
const DIGITS = Object.keys(GLYPHS);
const jitter = (amount: number) => (randomInt(-1000, 1001) / 1000) * amount;

function sign(nonce: string, expires: number, code: string) {
  return createHmac("sha256", secret()).update(`${nonce}.${expires}.${code}`).digest("base64url");
}

function render(code: string) {
  const width = 240;
  const height = 88;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf6ee"/><stop offset="1" stop-color="#efe3d3"/></linearGradient></defs>`,
    `<rect width="${width}" height="${height}" fill="url(#g)"/>`,
  ];
  for (let i = 0; i < 26; i += 1) {
    parts.push(`<circle cx="${randomInt(0, width)}" cy="${randomInt(0, height)}" r="${(randomInt(4, 14) / 10).toFixed(1)}" fill="#b4693a" opacity="${(randomInt(15, 40) / 100).toFixed(2)}"/>`);
  }
  for (let i = 0; i < 4; i += 1) {
    const y1 = randomInt(10, height - 10);
    const y2 = randomInt(10, height - 10);
    parts.push(`<path d="M0 ${y1} C ${width * 0.3} ${y1 + randomInt(-30, 30)}, ${width * 0.65} ${y2 + randomInt(-30, 30)}, ${width} ${y2}" stroke="${INKS[randomInt(0, INKS.length)]}" stroke-opacity="0.35" stroke-width="1.4" fill="none"/>`);
  }
  const slot = (width - 36) / code.length;
  [...code].forEach((digit, index) => {
    const scale = 2.9 + jitter(0.35);
    const cx = 18 + slot * index + slot / 2 + jitter(3);
    const cy = height / 2 + jitter(5);
    const rotate = jitter(16);
    const skew = jitter(10);
    const points = GLYPHS[digit].map(([x, y]) => `${(x + jitter(0.35)).toFixed(2)},${(y + jitter(0.35)).toFixed(2)}`).join(" ");
    parts.push(
      `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rotate.toFixed(1)}) skewX(${skew.toFixed(1)}) scale(${scale.toFixed(2)}) translate(-5 -8)">` +
        `<polyline points="${points}" fill="none" stroke="${INKS[randomInt(0, INKS.length)]}" stroke-width="${(1.5 + jitter(0.2)).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    );
  });
  for (let i = 0; i < 3; i += 1) {
    const y = randomInt(14, height - 14);
    parts.push(`<path d="M${randomInt(0, 30)} ${y} Q ${width / 2} ${y + randomInt(-26, 26)} ${width - randomInt(0, 30)} ${y + randomInt(-12, 12)}" stroke="${INKS[randomInt(0, INKS.length)]}" stroke-opacity="0.55" stroke-width="1.2" fill="none"/>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

export function createCaptcha() {
  const code = Array.from({ length: 5 }, () => DIGITS[randomInt(0, DIGITS.length)]).join("");
  const nonce = randomBytes(9).toString("base64url");
  const expires = Date.now() + TTL_MS;
  return { token: `${nonce}.${expires}.${sign(nonce, expires, code)}`, svg: render(code), expiresIn: TTL_MS / 1000 };
}

function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, "");
}

/** Each token works once, right or wrong, so a code cannot be brute-forced on one image. */
export function assertCaptcha(token: unknown, answer: unknown) {
  const fail = () => new BadRequestException("کد داخل تصویر درست نیست. تصویر تازه گرفته شد.");
  if (typeof token !== "string" || typeof answer !== "string") throw new BadRequestException("کد داخل تصویر را بنویسید");
  const [nonce, expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  const now = Date.now();
  for (const [key, until] of usedNonces) if (until < now) usedNonces.delete(key);
  if (!nonce || !signature || !Number.isFinite(expires) || expires < now) throw new BadRequestException("کد داخل تصویر منقضی شد. تصویر تازه بگیرید.");
  if (usedNonces.has(nonce)) throw fail();
  usedNonces.set(nonce, expires);
  const expected = Buffer.from(sign(nonce, expires, latinDigits(answer)));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw fail();
}
