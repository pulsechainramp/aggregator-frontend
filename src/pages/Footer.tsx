import { motion } from "framer-motion";

const Footer = () => {
  return (
    <motion.footer
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-center text-sm text-gray-400 space-y-3 h-[100px]"
    >
      <p>
        🔁 Accumulated Transaction Volume:{" "}
        <motion.span whileHover={{ color: "#4ade80" }} className="text-white">
          $1,714,669,123
        </motion.span>
      </p>
      <div className="flex justify-center space-x-4">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.2, backgroundColor: "#4ade80" }}
            whileTap={{ scale: 0.9 }}
            className="w-5 h-5 bg-white rounded-full cursor-pointer"
          />
        ))}
      </div>
      <p>
        © Copyright  2025,{" "}
        <motion.a
          whileHover={{ color: "#4ade80" }}
          href="#"
          className="underline"
        >
          Privacy Policy
        </motion.a>{" "}
        |{" "}
        <motion.a
          whileHover={{ color: "#4ade80" }}
          href="#"
          className="underline"
        >
          Terms of Use
        </motion.a>
      </p>
    </motion.footer>
  );
};

export default Footer;
