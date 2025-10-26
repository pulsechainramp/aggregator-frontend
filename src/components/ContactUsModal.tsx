type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ContactUsModal({ open, onClose }: Props) {
  const simplexLink =
    "https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2FixvvzatmijnuRYWyjU4YvBe1r9C6rYxRzyDcYN7siW4%3D%40smp.pulsechainramp.com%2F2wIjJL0hvVtrYFBxl2c5RULXcZM58fFs%23%2F%3Fv%3D1-3%26dh%3DMCowBQYDK2VuAyEAds2sGuPzcU3tsyO66iFy40VJhjB1eJ5aC0LIvLjXXRU%253D&data=%7B%22groupLinkId%22%3A%22867dR5NhhyPUCG71aOQgAw%3D%3D%22%7D";

  const stateClasses = open
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center transition-opacity duration-200 ${stateClasses}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative z-10 w-[92vw] max-w-lg rounded-lg border border-border bg-bg-surface p-6 shadow-floating sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id="contact-modal-title" className="text-2xl font-semibold text-text">
              Contact Us
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Join our SimpleX chat group for support and updates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="rounded-lg border border-border bg-bg-page p-4 shadow-sm">
              <img
                src="/simplex-qrcode.jpg"
                alt="SimpleX Chat QR Code"
                className="h-56 w-56 rounded-md object-cover sm:h-64 sm:w-64"
              />
            </div>
          </div>

          <div className="space-y-1 text-center text-sm text-text-muted">
            <p>Scan the QR code with your SimpleX app</p>
            <p className="text-xs uppercase tracking-wide text-text-subtle">or</p>
          </div>

          <a
            href={simplexLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-primary-600 hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Open in SimpleX
          </a>

          <div className="text-xs text-center text-text-muted">
            Don&apos;t have SimpleX?{" "}
            <a
              href="https://simplex.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary-600"
            >
              Download here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
