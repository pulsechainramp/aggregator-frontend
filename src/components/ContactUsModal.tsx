import React, { useState } from "react";
import { toast } from "react-toastify";

type Props = {
  open: boolean;
  onClose: () => void;
};

const createInitialForm = () => ({
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
});

export default function ContactUsModal({ open, onClose }: Props) {
  const simplexLink =
    "https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2FixvvzatmijnuRYWyjU4YvBe1r9C6rYxRzyDcYN7siW4%3D%40smp.pulsechainramp.com%2F2wIjJL0hvVtrYFBxl2c5RULXcZM58fFs%23%2F%3Fv%3D1-3%26dh%3DMCowBQYDK2VuAyEAds2sGuPzcU3tsyO66iFy40VJhjB1eJ5aC0LIvLjXXRU%253D&data=%7B%22groupLinkId%22%3A%22867dR5NhhyPUCG71aOQgAw%3D%3D%22%7D";
  const telegramLink = "https://t.me/PulseChainRamp";

  const [form, setForm] = useState(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const visible = open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none";

  const handleClose = () => {
    setForm(createInitialForm());
    setSubmitted(false);
    setSubmitting(false);
    onClose();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill out your name, email, and message.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          website: form.website,
          source: "footer-modal",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "We could not send your message.");
      }

      toast.success(data?.message || "Message sent! We'll be in touch soon.");
      setForm(createInitialForm());
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not send your message.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center transition ${visible}`}>
      <div className="absolute inset-0 bg-overlay" onClick={handleClose} />
      <div className="relative z-10 flex max-h-[90vh] w-[92vw] max-w-lg flex-col overflow-y-auto rounded-2xl border border-border bg-bg-surface p-6 shadow-floating">
        <div className="mb-4 flex flex-shrink-0 items-center justify-between">
          <h3 className="text-xl font-semibold text-text">Contact Us</h3>
          <button
            onClick={handleClose}
            className="text-2xl font-semibold text-text-muted transition-colors hover:text-text"
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </div>

        <form className="flex-1 space-y-5 overflow-y-auto" onSubmit={handleSubmit}>
          <p className="text-sm leading-relaxed text-text-muted">
            Send us a note and the team will follow up by email. Prefer live chat?{" "}
            <a
              href={simplexLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary-600"
            >
              SimpleX
            </a>{" "}
            or{" "}
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary-600"
            >
              Telegram
            </a>
            .
          </p>
          <p className="text-xs text-text-subtle">
            You can also email us directly at{" "}
            <a
              href="mailto:PulseChainRamp@gmail.com"
              className="font-semibold text-primary hover:text-primary-600"
            >
              PulseChainRamp@gmail.com
            </a>
          </p>

          <div className="grid gap-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-primary-050/40 p-4 text-center">
              <img
                src="/simplex-qrcode.jpg"
                alt="Scan to join the PulseChain Ramp SimpleX chat"
                className="h-48 w-48 rounded-lg border border-border object-contain"
              />
              <p className="text-xs text-text-muted">
                Scan with SimpleX to open our support group instantly.
              </p>
              <a
                href={simplexLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-primary-600 hover:bg-primary-600"
              >
                Open SimpleX Chat
              </a>
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:bg-primary-050/60"
              >
                Message us on Telegram
              </a>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-primary focus:outline-none"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-primary focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="contact-subject">
                Subject <span className="font-normal text-text-subtle">(optional)</span>
              </label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-primary focus:outline-none"
                placeholder="How can we help?"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-primary focus:outline-none"
                placeholder="Share a few details..."
                required
                maxLength={4000}
              />
            </div>
          </div>

          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
            className="hidden"
            aria-hidden="true"
          />

          {submitted ? (
            <div className="rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success">
              Thanks! Your message is on the way. We'll respond from our support inbox.
            </div>
          ) : (
            <button
              type="submit"
              className="w-full touch-target rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-primary-600 hover:bg-primary-600 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
