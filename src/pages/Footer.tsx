import { motion } from "framer-motion";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <motion.footer
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className="flex h-[100px] flex-col items-center justify-center space-y-3 text-center text-sm text-text-subtle"
    >
      <p>PulseChainRamp &copy; {year}</p>
      <p>
        <motion.a href="/privacy" className="underline" whileHover={{ color: "#4ade80" }}>
          Privacy
        </motion.a>
        {" | "}
        <motion.a href="/terms" className="underline" whileHover={{ color: "#4ade80" }}>
          Terms of Use
        </motion.a>
        {" | "}
        <motion.a href="/docs" className="underline" whileHover={{ color: "#4ade80" }}>
          Docs
        </motion.a>
      </p>
    </motion.footer>
  );
};

export default Footer;
