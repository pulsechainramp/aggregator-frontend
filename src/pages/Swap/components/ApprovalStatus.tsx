import React from "react";
import { ZeroAddress } from "../../../const/swap";

interface ApprovalStatusProps {
  fromToken: any;
  fromAmount: string;
  isApproved: boolean;
  isApproving: boolean;
}

const ApprovalStatus: React.FC<ApprovalStatusProps> = ({
  fromToken,
  fromAmount,
  isApproved,
  isApproving,
}) => {
  if (!fromToken || fromToken.address === ZeroAddress || !fromAmount) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg-surface p-3 sm:mt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm text-text-subtle">Token Approval Status:</span>
        <div className="flex items-center gap-2">
          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-success sm:h-3 sm:w-3"></div>
              <span className="text-xs sm:text-sm font-medium text-success">Approved</span>
            </div>
          ) : isApproving ? (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-warning sm:h-3 sm:w-3"></div>
              <span className="text-xs sm:text-sm font-medium text-warning">Approving...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-danger sm:h-3 sm:w-3"></div>
              <span className="text-xs sm:text-sm font-medium text-danger">Not Approved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalStatus; 
