import React from "react";
import { Link } from "react-router-dom";
import { GlobeAltIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

interface BridgeHeaderProps {
  onLocaleClick: () => void;
}

const BridgeHeader: React.FC<BridgeHeaderProps> = ({ onLocaleClick }) => {
  return (
    <div className="mb-0 flex flex-row items-center justify-between gap-4 sm:mb-8">
      <h3 className="text-lg font-semibold text-text sm:text-xl">Bridge</h3>

      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="cursor-pointer"
          onClick={onLocaleClick}
          aria-label="Change language and number format"
        >
          <GlobeAltIcon className="h-6 w-6 text-text-muted hover:text-primary" />
        </motion.div>
        <Link
          to="/activity"
          className="touch-target inline-flex items-center justify-center rounded-lg border border-primary bg-primary-050 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary-600 hover:bg-primary-050/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus whitespace-nowrap"
        >
          View Activity
        </Link>
      </div>
    </div>
  );
};

export default BridgeHeader;
