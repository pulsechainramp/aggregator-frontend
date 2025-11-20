import { FaArrowRight } from "react-icons/fa";
import TokenIcon from "../../components/TokenIcon";
import { useAppSelector } from "../../store/hooks";

const RouteDetailsPopup = () => {
  const { fromToken, toToken, quote } = useAppSelector((state) => state.swap);

  return (
    <div className="w-full max-h-[60vh] overflow-y-auto sm:max-h-none">
      <div className="mb-3 sm:mb-4">
        <span className="text-base font-semibold text-text sm:text-lg">Route Details</span>
      </div>

      {quote?.route.map((route, index) => (
        <div
          key={index}
          className="mb-3 flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-primary-050/40 p-3 sm:mb-2 sm:flex-row sm:gap-4"
        >
          {/* Start Token */}
          <div className="mb-2 flex flex-col items-center sm:mb-0">
            <TokenIcon token={fromToken ?? undefined} size={32} />
            <span className="text-xs font-semibold text-text">{route.percent}%</span>
          </div>

          {/* Route Steps */}
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
            {route.subroutes.map((subroute, subIndex) => (
              <div key={subIndex} className="flex w-full flex-col items-center gap-2 sm:flex-row">
                <div className="flex w-full min-w-[160px] flex-col items-center rounded-xl border border-border bg-bg-surface px-3 py-2 shadow-sm sm:min-w-[200px] sm:w-auto sm:px-4">
                  {subroute.paths.map((path, pathIndex) => (
                    <div key={pathIndex} className="flex w-full items-center justify-between py-1">
                      <span className="truncate text-xs font-semibold text-text">
                        {path.tokens[0].symbol}
                        <span className="mx-1 text-text-subtle">-&gt;</span>
                        {path.tokens[1].symbol}
                      </span>
                      <span className="mx-1 hidden truncate text-xs text-text-subtle sm:mx-2 sm:block">
                        {path.exchange}
                      </span>
                      <span className="text-right text-xs font-semibold text-text">
                        {path.percent}%
                      </span>
                    </div>
                  ))}
                </div>
                {subIndex !== route.subroutes.length - 1 && (
                  <FaArrowRight className="hidden text-primary sm:block" />
                )}
                {subIndex !== route.subroutes.length - 1 && (
                  <div className="my-2 h-px w-full bg-border sm:hidden"></div>
                )}
              </div>
            ))}
          </div>

          {/* End Token */}
          <div className="mt-2 flex flex-col items-center sm:mt-0">
            <TokenIcon token={toToken ?? undefined} size={32} />
          </div>
        </div>
      ))}

      <hr className="my-3 border-border" />
      <div className="leading-relaxed text-xs text-text-subtle">
        This route optimizes your total output by considering split routes, multi-hops, and the gas cost of each step.
      </div>
    </div>
  );
};

export default RouteDetailsPopup;
