import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import {
  ImageMagick, MagickFormat, MagickGeometry, initializeImageMagick,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30")),
);
await initializeImageMagick(wasmBytes);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (message: string, status: number) => new Response(
  JSON.stringify({ error: message }),
  { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
);

function pngChunk(type: string, bytes: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(bytes.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, bytes.length, false);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(bytes, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < chunk.length - 4; i++) {
    crc ^= chunk[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0, false);
  return chunk;
}

async function neutralProfilePng(size: number): Promise<Uint8Array> {
  // LIW branding is reserved for Free cards. Paid cards without a photo
  // receive a deliberately logo-free portrait silhouette.
  const raw = new Uint8Array(size * (size * 4 + 1));
  const background = [15, 35, 73, 255];
  const foreground = [246, 249, 255, 255];
  const accent = [209, 172, 92, 255];
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size;
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const dx = nx - 0.5;
      const head = (dx * dx + (ny - 0.36) ** 2) < 0.135 ** 2;
      const shoulders = (dx / 0.33) ** 2 + ((ny - 0.805) / 0.24) ** 2 < 1;
      const trim = (dx / 0.4) ** 2 + ((ny - 0.5) / 0.4) ** 2 < 1
        && (dx / 0.385) ** 2 + ((ny - 0.5) / 0.385) ** 2 >= 1;
      const color = head || shoulders ? foreground : trim ? accent : background;
      raw.set(color, row + 1 + x * 4);
    }
  }
  const compressed = new Uint8Array(await new Response(
    new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer());
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size, false);
  view.setUint32(4, size, false);
  ihdr[8] = 8; // RGBA, 8 bits/channel
  ihdr[9] = 6;
  const chunks = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array()),
  ];
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

function permittedProfileSource(value: unknown, supabaseUrl: string): URL | null {
  try {
    const candidate = new URL(String(value || "").trim());
    if (candidate.origin !== new URL(supabaseUrl).origin ||
      !candidate.pathname.startsWith("/storage/v1/object/public/profile-images/") ||
      !candidate.pathname.split("/").pop()) return null;
    return candidate;
  } catch { return null; }
}

function profileToPng(bytes: Uint8Array, size: number): Uint8Array {
  return ImageMagick.read(bytes, (image): Uint8Array => {
    image.autoOrient();
    const edge = Math.min(image.width, image.height);
    image.crop(new MagickGeometry(
      Math.floor((image.width - edge) / 2),
      Math.floor((image.height - edge) / 2),
      edge, edge,
    ));
    image.resetPage();
    image.resize(size, size);
    return image.write(MagickFormat.Png, data => new Uint8Array(data));
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json("Method not allowed", 405);
  try {
    const request = new URL(req.url);
    const slug = String(request.searchParams.get("slug") || "").trim().toLowerCase();
    const size = Number(request.searchParams.get("size"));
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) || ![192, 512].includes(size)) {
      return json("Invalid icon request", 400);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY") || "";
    if (!supabaseUrl || !serviceKey) throw new Error("Database configuration unavailable");
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: card, error: cardError } = await db.from("digital_cards")
      .select("id,profile_image_url").eq("slug", slug).eq("status", "published").maybeSingle();
    if (cardError) throw cardError;
    if (!card) return json("Card not found", 404);
    const { data: planKey, error: planError } = await db.rpc("public_card_plan_key", { p_card_id: card.id });
    if (planError) throw planError;
    if (!planKey || planKey === "starter") return json("Profile icons are not available on Free", 403);

    let png: Uint8Array | null = null;
    const sourceUrl = permittedProfileSource(card.profile_image_url, supabaseUrl);
    if (sourceUrl) {
      try {
        const photo = await fetch(sourceUrl.href, {
          headers: { Accept: "image/png,image/jpeg,image/webp" },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
        if (photo.ok &&
          /^image\/(png|jpeg|webp)(?:;|$)/i.test(photo.headers.get("content-type") || "") &&
          Number(photo.headers.get("content-length") || 0) <= 8 * 1024 * 1024) {
          const bytes = new Uint8Array(await photo.arrayBuffer());
          if (bytes.length > 0 && bytes.length <= 8 * 1024 * 1024) {
            png = profileToPng(bytes, size);
          }
        }
      } catch (error) {
        console.warn("Published profile icon conversion failed:", String(error));
      }
    }
    if (!png) png = await neutralProfilePng(size);
    return new Response(png, {
      status: 200,
      headers: {
        ...cors, "Content-Type": "image/png",
        "Content-Length": String(png.byteLength),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("card-icon-staging error:", error);
    return json("Unable to build profile icon", 500);
  }
});
