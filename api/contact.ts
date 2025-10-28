import * as dotenv from "dotenv";
dotenv.config();

import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  source?: string;
  website?: string;
};

const {
  CONTACT_SMTP_HOST,
  CONTACT_SMTP_PORT,
  CONTACT_SMTP_SECURE,
  CONTACT_SMTP_USER,
  CONTACT_SMTP_PASS,
  CONTACT_EMAIL_FROM,
  CONTACT_EMAIL_TO,
} = process.env;

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const transporter =
  CONTACT_SMTP_HOST &&
  CONTACT_SMTP_USER &&
  CONTACT_SMTP_PASS &&
  CONTACT_EMAIL_TO
    ? nodemailer.createTransport({
        host: CONTACT_SMTP_HOST,
        port: CONTACT_SMTP_PORT ? Number(CONTACT_SMTP_PORT) : 587,
        secure: CONTACT_SMTP_SECURE === "true",
        auth: {
          user: CONTACT_SMTP_USER,
          pass: CONTACT_SMTP_PASS,
        },
      })
    : null;

if (transporter) {
  transporter
    .verify()
    .then(() => console.log("[contact] Email transporter ready"))
    .catch((error) =>
      console.error("[contact] Email transporter verification failed", error),
    );
} else {
  console.warn(
    "[contact] Email transporter not configured. Missing SMTP environment variables.",
  );
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!transporter) {
    return res.status(503).json({
      error: "Contact form is temporarily unavailable. Please try again later.",
    });
  }

  let payload: ContactPayload;
  if (typeof req.body === "string") {
    try {
      payload = JSON.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in request body." });
    }
  } else {
    payload = req.body;
  }

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const { name, email, subject, message, source, website } = payload;

  if (website && website.trim().length > 0) {
    return res.status(400).json({ error: "Invalid submission." });
  }

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ error: "Name, email, and message are required." });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email." });
  }

  if (message.length > 4000) {
    return res.status(400).json({ error: "Message is too long." });
  }

  const cleanSubject = subject?.trim() || "General Inquiry";
  const contextSource = source?.trim() || "footer-modal";

  const sanitizedMessage = message.trim();
  const textContent = [
    "New contact form submission from PulseChain Ramp:",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${cleanSubject}`,
    `Source: ${contextSource}`,
    "",
    "Message:",
    sanitizedMessage,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: CONTACT_EMAIL_FROM || CONTACT_SMTP_USER,
      to: CONTACT_EMAIL_TO,
      replyTo: email,
      subject: `PulseChain Ramp Contact: ${cleanSubject}`,
      text: textContent,
      html: `<p>New contact form submission from PulseChain Ramp:</p>
             <ul>
               <li><strong>Name:</strong> ${escapeHtml(name)}</li>
               <li><strong>Email:</strong> ${escapeHtml(email)}</li>
               <li><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</li>
               <li><strong>Source:</strong> ${escapeHtml(contextSource)}</li>
             </ul>
             <p><strong>Message:</strong></p>
             <p>${escapeHtml(sanitizedMessage).replace(/\n/g, "<br/>")}</p>`,
    });

    return res
      .status(200)
      .json({ message: "Thanks for reaching out! We will be in touch soon." });
  } catch (error) {
    console.error("[contact] Failed to send email", error);
    return res.status(500).json({
      error: "We could not send your message. Please try again later.",
    });
  }
}
