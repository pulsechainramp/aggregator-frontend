import type { VercelRequest, VercelResponse } from "@vercel/node";

const safeParse = (body: unknown) => {
  if (!body) return {};
  if (typeof body === "object") return body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return { raw: body };
    }
  }
  return { raw: body };
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const report = safeParse(req.body);
  console.warn("[csp-report] violation received", report);
  return res.status(204).end();
}

