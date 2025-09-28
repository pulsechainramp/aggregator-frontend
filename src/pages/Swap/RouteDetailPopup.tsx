import { FaArrowRight } from "react-icons/fa";
import { useAppSelector } from "../../store/hooks";
import React from "react";

const RouteDetailsPopup = () => {
  const { fromToken, toToken, quote, allChains } = useAppSelector(
    (state) => state.swap
  );
  return (
    <div className="w-full max-h-[60vh] sm:max-h-none overflow-y-auto">
      <div className="mb-3 sm:mb-4">
        <span className="font-semibold text-base sm:text-lg">Route Details</span>
      </div>
      {quote?.route.map((route, index) => (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3 sm:mb-2"
          key={index}
        >
          {/* Start Token */}
          <div className="flex flex-col items-center mb-2 sm:mb-0">
            <img
              src={fromToken?.image}
              alt={"chainlogo"}
              className="w-6 h-6 sm:w-8 sm:h-8 mb-1 rounded-full"
            />
            <span className="text-xs font-bold">{route.percent}%</span>
          </div>
          
          {/* Route Steps */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2  justify-center">
            {route.subroutes.map((subroute, subIndex) => (
              <div key={subIndex} className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <div className="flex flex-col items-center bg-[#23263b] rounded-xl px-3 sm:px-4 py-2 min-w-[160px] sm:min-w-[200px] w-full sm:w-auto">
                  {subroute.paths.map((path, pathIndex) => (
                  <div key={pathIndex} className="flex items-center justify-between w-full py-1">
                    {/* Show full token sequence (2, 3, or 4 tokens) */}
                    <span className="text-xs font-semibold truncate flex items-center gap-1">
                      {path.tokens?.map((t, i) => (
                        <React.Fragment key={`${t.address}-${i}`}>
                          <span className="truncate">{t.symbol || (t.address?.slice(0,6) + "…" + t.address?.slice(-4))}</span>
                          {i < (path.tokens.length - 1) && <span className="text-gray-400">→</span>}
                        </React.Fragment>
                      ))}
                    </span>

                    {/* DEX label always visible as a pill */}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 mx-2 truncate">
                      {path.exchange}
                    </span>

                    <span className="text-xs font-bold text-right">{path.percent}%</span>
                  </div>
                ))}
                </div>
                {subIndex !== route.subroutes.length - 1 && (
                  <FaArrowRight className="text-gray-400 hidden sm:block" />
                )}
                {subIndex !== route.subroutes.length - 1 && (
                  <div className="w-full sm:hidden h-px bg-gray-600 my-2"></div>
                )}
              </div>
            ))}
          </div>
          
          {/* End Token */}
          <div className="flex flex-col items-center mt-2 sm:mt-0">
            <img
              src={toToken?.image}
              alt="toToken"
              className="w-6 h-6 sm:w-8 sm:h-8 mb-1 rounded-full"
            />
          </div>
        </div>
      ))}
      <hr className="border-[#23263b] my-3" />
      <div className="text-xs text-gray-400 leading-relaxed">
        This route optimizes your total output by considering split routes,
        multi-hops, and the gas cost of each step.
      </div>
    </div>
  );
};

export default RouteDetailsPopup;
