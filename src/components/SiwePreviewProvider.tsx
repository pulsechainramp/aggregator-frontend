import React, { useCallback, useEffect, useRef, useState } from "react";
import { registerSiwePromptHandler } from "../utils/siwePrompt";
import { SiweChallengePreview } from "../utils/siwe";
import SiwePreviewModal from "./SiwePreviewModal";

const SiwePreviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const resolverRef = useRef<(result: boolean) => void>();
  const [pending, setPending] = useState<SiweChallengePreview | null>(null);

  const handleResult = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = undefined;
    setPending(null);
  }, []);

  useEffect(() => {
    registerSiwePromptHandler((challenge) => {
      setPending(challenge);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    });
  }, []);

  return (
    <>
      {children}
      {pending && (
        <SiwePreviewModal
          data={pending}
          onConfirm={() => handleResult(true)}
          onCancel={() => handleResult(false)}
        />
      )}
    </>
  );
};

export default SiwePreviewProvider;
