import { AnimatePresence, motion } from "framer-motion";
import { TokenType } from "../../types/Swap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setFromToken, setToToken } from "../../store/swapSlice";

interface TokenPopupProps {
  isOpen: boolean;
  onClose: () => void;
  chain: TokenType | null;
  setChain: (chain: TokenType) => void;
  selectType: "from" | "to" | null;
  searchChain: string;
  setSearchChain: (searchChain: string) => void;
  searchToken: string;
  setSearchToken: (searchToken: string) => void;
  availableTokens: TokenType[];
}

const TokenPopup = ({
  isOpen,
  onClose,
  chain,
  setChain,
  selectType,
  searchChain,
  setSearchChain,
  searchToken,
  setSearchToken,
  availableTokens,
}: TokenPopupProps) => {
  const { allChains } = useAppSelector((state) => state.swap);

  const dispatch = useAppDispatch();

  const handleSetToken = (token: TokenType) => {
    if (selectType === "from") {
      dispatch(setFromToken(token));
    } else {
      dispatch(setToToken(token));
    }
  };

  // Filter for PulseChain tokens only
  const pulsechainTokens = availableTokens.filter(
    (token) => 
      token.blockchainNetwork?.toLowerCase() === "pulsechain" ||
      token.network?.toLowerCase() === "pulsechain" ||
      token.blockchainNetwork?.toLowerCase() === "pls" ||
      token.network?.toLowerCase() === "pls"
  );

  // Filter for PulseChain chains only
  const pulsechainChains = allChains.filter(
    (tempChain) =>
      (tempChain.type === "NATIVE_ETH" || tempChain.type === "NATIVE") &&
      (tempChain.network?.toLowerCase() === "pulsechain" ||
       tempChain.network?.toLowerCase() === "pls" ||
       tempChain.blockchainNetwork?.toLowerCase() === "pulsechain" ||
       tempChain.blockchainNetwork?.toLowerCase() === "pls")
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-surface shadow-floating max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-text">
                Select Token
              </h2>
              <button
                onClick={onClose}
                className="text-text-subtle hover:text-text transition-colors p-1"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(90vh-80px)]">

              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                {/* Chains Panel */}
                <div className="w-full sm:w-[200px] hidden">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search chains"
                      className="w-full rounded-lg border border-border bg-bg-page px-3 py-2 pl-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={searchChain}
                      onChange={(e) => setSearchChain(e.target.value)}
                    />
                    <svg
                      className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 transform -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {searchChain && (
                      <button
                        type="button"
                        aria-label="Clear chain search"
                        onClick={() => setSearchChain("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-050/60 focus:outline-none"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[200px] sm:max-h-[310px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center justify-center text-xs sm:text-sm text-text-subtle">
                      PulseChain Network
                    </div>
                    <hr className="border-border" />
                    {pulsechainChains
                      .filter(
                        (tempChain) =>
                          tempChain.network
                            .toLowerCase()
                            .includes(searchChain.toLowerCase())
                      )
                      .map((tempChain, index) => (
                        <button
                          key={index}
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
                            chain?.blockchainNetwork === tempChain.blockchainNetwork
                              ? "bg-primary-050 text-primary font-semibold"
                              : "text-text hover:bg-primary-050/40"
                          }`}
                          onClick={() => setChain(tempChain)}
                        >
                          <img
                            src={tempChain.image}
                            alt={tempChain.symbol}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-2"
                          />
                          <span className="truncate">{tempChain.network}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Tokens Panel */}
                <div className="flex-1">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search tokens"
                      value={searchToken}
                      onChange={(e) => setSearchToken(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-page px-3 py-2 pl-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                    <svg
                      className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 transform -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <button
                      type="button"
                      aria-label="Clear token search"
                      onClick={() => setSearchToken("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-050/60 focus:outline-none"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] sm:max-h-[320px] overflow-y-auto custom-scrollbar">
                    {pulsechainTokens.length > 0
                      ? pulsechainTokens.map((token, index) => (
                          <motion.button
                            key={index}
                            className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-page px-3 py-2 transition-colors hover:border-primary hover:bg-primary-050/60 sm:px-4"
                            onClick={() => {
                              handleSetToken(token);
                              onClose();
                            }}
                          >
                            <div className="flex-shrink-0 rounded-full text-xl">
                              <img
                                src={token.image}
                                alt={token.symbol}
                                className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                              />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <div className="truncate text-sm font-semibold text-text">
                                {token.symbol}
                              </div>
                              <div className="truncate text-xs text-text-muted">
                                {token.name}
                              </div>
                            </div>
                          </motion.button>
                        ))
                      : Array.from({ length: 10 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-8 w-full rounded-lg border border-border bg-bg-page sm:h-10"
                          ></div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TokenPopup;
