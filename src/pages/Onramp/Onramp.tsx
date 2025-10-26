import { motion } from "framer-motion";

const Onramp = () => {
  return (
    <div className="min-h-screen bg-bg-page text-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Onramp
          </h1>
          <p className="text-slate-400 text-lg">
            Coming soon...
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onramp;
