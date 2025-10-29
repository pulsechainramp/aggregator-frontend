import React from "react";
import { Link } from "react-router-dom";

const BridgeHeader: React.FC = () => {
  return (
    <div className="mb-6 flex flex-row items-center justify-between gap-4 sm:mb-8">
      <h3 className="text-lg font-semibold text-text sm:text-xl">Bridge</h3>

      <Link
        to="/activity"
        className="touch-target inline-flex items-center justify-center rounded-lg border border-primary bg-primary-050 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary-600 hover:bg-primary-050/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus whitespace-nowrap"
      >
        View Activity
      </Link>
    </div>
  );
};

export default BridgeHeader;
