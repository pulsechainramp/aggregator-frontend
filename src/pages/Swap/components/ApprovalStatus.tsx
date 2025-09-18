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
    <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-[#1e2030] rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <span className="text-xs sm:text-sm text-gray-400">Token Approval Status:</span>
        <div className="flex items-center gap-2">
          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs sm:text-sm text-green-400">Approved</span>
            </div>
          ) : isApproving ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm text-yellow-400">Approving...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs sm:text-sm text-red-400">Not Approved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalStatus; 