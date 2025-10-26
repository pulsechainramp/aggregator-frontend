import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const BridgeHeader: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex flex-row items-center justify-between gap-4 sm:mb-8"
    >
      <h2 className="text-2xl font-semibold text-text sm:text-3xl">
        Bridge
      </h2>
      
      <Link
        to="/activity"
        className="touch-target inline-flex items-center justify-center rounded-lg border border-primary bg-primary-050 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary-600 hover:bg-primary-050/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus whitespace-nowrap"
      >
        View Activity
      </Link>
    </motion.div>
  );
};

export default BridgeHeader; 
