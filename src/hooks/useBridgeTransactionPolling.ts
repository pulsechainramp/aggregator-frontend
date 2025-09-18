import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { pollBridgeTransactionStatus } from "../store/bridgeSlice";

export const useBridgeTransactionPolling = () => {
  const dispatch = useAppDispatch();
  const { bridgeTransaction, isPolling, pollingError } = useAppSelector(
    (state) => state.bridge
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start polling when bridge transaction is created
  useEffect(() => {
    if (bridgeTransaction && bridgeTransaction.status === "pending") {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Start polling every 7 seconds
      pollingIntervalRef.current = setInterval(() => {
        dispatch(pollBridgeTransactionStatus(bridgeTransaction.messageId));
      }, 7000);

      // Initial poll
      dispatch(pollBridgeTransactionStatus(bridgeTransaction.messageId));
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [bridgeTransaction?.messageId, bridgeTransaction?.status, dispatch]);

  // Stop polling when status changes to 'executed'
  useEffect(() => {
    if (bridgeTransaction && bridgeTransaction.status === "executed") {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [bridgeTransaction?.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  return {
    bridgeTransaction,
    isPolling,
    pollingError,
  };
};
