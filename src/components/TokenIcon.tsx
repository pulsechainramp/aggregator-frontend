import React, { useEffect, useMemo, useState } from "react";

type TokenLike = {
  symbol?: string;
  logoURI?: string;
  image?: string;
  remoteLogoURIs?: string[];
};

interface TokenIconProps {
  token?: TokenLike | null;
  size?: number;
  className?: string;
}

const defaultContainerClasses =
  "flex items-center justify-center rounded-full border border-border bg-bg-page text-xs font-semibold uppercase text-primary";

const TokenIcon: React.FC<TokenIconProps> = ({ token, size = 40, className }) => {
  const remoteKey = token?.remoteLogoURIs?.join("|") ?? "";
  const candidates = useMemo(() => {
    const sources: string[] = [];
    const push = (value?: string) => {
      if (value && !sources.includes(value)) {
        sources.push(value);
      }
    };
    push(token?.logoURI);
    push(token?.image);
    if (Array.isArray(token?.remoteLogoURIs)) {
      for (const url of token.remoteLogoURIs) {
        push(url);
      }
    }
    return sources;
  }, [token?.logoURI, token?.image, remoteKey]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setShowFallback(false);
  }, [remoteKey, token?.logoURI, token?.image]);

  if (showFallback || candidates.length === 0) {
    const fallbackLabel = (token?.symbol || "?").slice(0, 3).toUpperCase();
    return (
      <div
        className={`${defaultContainerClasses} ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        {fallbackLabel}
      </div>
    );
  }

  const handleError = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    setShowFallback(true);
  };

  return (
    <img
      src={candidates[currentIndex]}
      alt={token?.symbol || "token"}
      className={`rounded-full border border-border object-cover ${className ?? ""}`}
      style={{ width: size, height: size }}
      onError={handleError}
    />
  );
};

export default TokenIcon;
