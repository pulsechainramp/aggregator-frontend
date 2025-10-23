import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ContactUsModal({ open, onClose }: Props) {
  const simplexLink = "https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2FixvvzatmijnuRYWyjU4YvBe1r9C6rYxRzyDcYN7siW4%3D%40smp.pulsechainramp.com%2F2wIjJL0hvVtrYFBxl2c5RULXcZM58fFs%23%2F%3Fv%3D1-3%26dh%3DMCowBQYDK2VuAyEAds2sGuPzcU3tsyO66iFy40VJhjB1eJ5aC0LIvLjXXRU%253D&data=%7B%22groupLinkId%22%3A%22867dR5NhhyPUCG71aOQgAw%3D%3D%22%7D";

  const visible = open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none";

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center transition ${visible}`}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* modal */}
      <div className="relative z-10 w-[92vw] max-w-md rounded-2xl border border-white/10 bg-[#151528] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Contact Us</h3>
          <button 
            onClick={onClose} 
            className="text-2xl text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-white/80 text-center">
            Join our SimpleX chat group for support and updates
          </p>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <img
                src="/simplex-qrcode.jpg"
                alt="SimpleX Chat QR Code"
                className="w-64 h-64 rounded-lg"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-white/70 text-center space-y-2">
            <p>Scan the QR code with your SimpleX app</p>
            <p className="text-xs">or</p>
          </div>

          {/* Link Button */}
          <a
            href={simplexLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-emerald-500 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            Open in SimpleX
          </a>

          <div className="text-xs text-white/50 text-center">
            Don't have SimpleX?{" "}
            <a
              href="https://simplex.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Download here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
