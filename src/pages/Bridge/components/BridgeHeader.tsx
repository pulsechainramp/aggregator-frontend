import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const BridgeHeader: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8"
    >
      <div className="flex flex-col">
        <h2 className="font-bold text-2xl sm:text-3xl text-white mb-2">
          Bridge
        </h2>
        <p className="text-gray-400 text-sm">
          Transfer tokens between Ethereum and PulseChain
        </p>
      </div>
      
      <Link
        to="/activity"
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
      >
        View Activity
      </Link>
    </motion.div>
  );
};

export default BridgeHeader; 