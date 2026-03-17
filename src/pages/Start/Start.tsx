import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useWallet from "../../hooks/useWallet";
import {
  useAppDispatch,
  useAppSelector,
  useStartProgress,
} from "../../store/hooks";
import {
  checkStartBalances,
  setAccount as setStartAccount,
} from "../../store/startProgressSlice";
import { checkReferralCreationFeePaid } from "../../store/referralSlice";

type ChecklistStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done?: boolean;
};

const CheckIcon = () => (
  <span className="inline-flex h-5 w-5 min-w-[1.25rem] items-center justify-center rounded-full bg-success text-white shrink-0">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.42l2.543 2.543 6.793-6.793a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);

const NumberCircle = ({ value, active }: { value: string; active?: boolean }) => (
  <span
    className={`inline-flex h-8 w-8 min-w-[2rem] shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
      active ? "bg-primary text-white shadow-sm" : "border border-border text-text"
    }`}
    aria-label={`Step ${value}`}
  >
    {value}
  </span>
);

const Start = () => {
  const dispatch = useAppDispatch();
  const { account, wallet } = useWallet();
  const location = useLocation();
  const startProgress = useStartProgress();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestBalanceCheckRef = useRef<() => void>(() => {});

  const {
    loading: balancesLoading,
    complete: balancesComplete,
    error: balancesError,
    lastChecked: balancesLastChecked,
  } = startProgress.balances;

  const getInitialIsMobile = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  };

  const [isMobile, setIsMobile] = useState(getInitialIsMobile);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const referralState = useAppSelector((state) => state.referral);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("hasSeenStart", "true");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    dispatch(setStartAccount(account || null));
    setCollapsed({});
  }, [account, dispatch]);

  const MIN_CHECK_INTERVAL_MS = 60_000;
  const DEBOUNCE_MS = 400;

  useEffect(() => {
    requestBalanceCheckRef.current = () => {
      if (!account) return;
      if (balancesLoading || balancesComplete) return;

      const now = Date.now();
      if (balancesLastChecked && now - balancesLastChecked < MIN_CHECK_INTERVAL_MS) return;

      dispatch(checkStartBalances({ account }));
    };
  }, [
    account,
    balancesLoading,
    balancesComplete,
    balancesLastChecked,
    dispatch,
  ]);

  const requestBalanceCheck = useCallback(() => {
    requestBalanceCheckRef.current();
  }, []);

  const scheduleDebouncedCheck = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      requestBalanceCheckRef.current();
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    requestBalanceCheck();
  }, [account, requestBalanceCheck]);

  // Detect referral creation fee payment for the referral step
  useEffect(() => {
    if (!account) return;
    if (referralState.hasPaidCreationFee === true) return;
    if (referralState.checkingCreationFee) return;
    dispatch(checkReferralCreationFeePaid(account));
  }, [account, referralState.hasPaidCreationFee, referralState.checkingCreationFee, dispatch]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible") {
        scheduleDebouncedCheck();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [scheduleDebouncedCheck]);

  useEffect(() => {
    const provider = wallet?.provider as any;
    if (!provider?.on) return;
    const handler = () => scheduleDebouncedCheck();
    provider.on("chainChanged", handler);
    provider.on("accountsChanged", handler);
    return () => {
      if (provider.removeListener) {
        provider.removeListener("chainChanged", handler);
        provider.removeListener("accountsChanged", handler);
      } else if (provider.off) {
        provider.off("chainChanged", handler);
        provider.off("accountsChanged", handler);
      } else if (provider.removeEventListener) {
        provider.removeEventListener("chainChanged", handler);
        provider.removeEventListener("accountsChanged", handler);
      }
    };
  }, [wallet, scheduleDebouncedCheck]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/start") {
      scheduleDebouncedCheck();
    }
  }, [location.pathname, scheduleDebouncedCheck]);

  const walletComplete = Boolean(account);
  const fundingComplete = startProgress.balances.complete;
  const bridgeComplete = startProgress.bridge.complete;
  const swapComplete = startProgress.swap.complete;
  const referralComplete =
    referralState.hasPaidCreationFee === true ||
    Boolean(referralState.referralCode);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: "wallet",
        title: "Wallet",
        description:
          "Install a self-custody wallet and back up your recovery phrase.",
        href: "/wallet",
        cta: "Set Up My Wallet",
        done: walletComplete,
      },
      {
        id: "onramp",
        title: "Onramp",
        description:
          "Buy ETH or stablecoins (USDC, USDT, DAI) on Ethereum and withdraw to your wallet.",
        href: "/onramp",
        cta: "Buy Crypto Now",
        done: fundingComplete,
      },
      {
        id: "bridge",
        title: "Bridge",
        description:
          "Send ETH or stables from your wallet to PulseChain so it's ready for swaps.",
        href: "/bridge",
        cta: "Move Funds to PulseChain",
        done: bridgeComplete,
      },
      {
        id: "swap",
        title: "Swap",
        description:
          "Swap into the assets you need while keeping some PLS for fees.",
        href: "/swap",
        cta: "Swap Assets",
        done: swapComplete,
      },
      {
        id: "earn",
        title: "Earn More (Optional)",
        description:
          "Browse staking and farming options (up to ~10% APY) once you're settled in.",
        href: "/earn",
        cta: "Explore Earning",
      },
      {
        id: "referral",
        title: "Referral link (Optional)",
        description:
          "Pay the one-time fee to create your referral link and earn up to 3% when people swap through your link.",
        href: "/referrals",
        cta: "Create referral link",
        done: referralComplete,
      },
    ],
    [walletComplete, fundingComplete, bridgeComplete, swapComplete, referralComplete]
  );

  const currentIndex = steps.findIndex((step) => !step.done);
  const activeIndex = currentIndex === -1 ? -1 : currentIndex;

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      let changed = false;
      steps.forEach((step) => {
        if (isMobile && step.done && !(step.id in prev)) {
          next[step.id] = true; // initialize completed steps as collapsed on mobile
          changed = true;
        }
        if (!isMobile && prev[step.id]) {
          next[step.id] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [isMobile, walletComplete, fundingComplete, bridgeComplete, swapComplete, referralComplete, steps]);

  return (
    <div className="bg-bg-page px-4 py-6 text-text sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="space-y-4 rounded-3xl border border-border bg-bg-surface p-5 shadow-floating sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Get started
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Get on PulseChain, the simple way.
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/learn"
              className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              What is PulseChain?
            </Link>
            <span className="text-sm text-text-muted">
              Optional: start with a quick overview before you dive in.
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {steps.map((step, idx) => {
            const isCurrent = activeIndex === idx;
            const isDone = Boolean(step.done);
            const isCollapsible = isMobile && isDone;
            const isCollapsed = isCollapsible
              ? (step.id in collapsed ? Boolean(collapsed[step.id]) : true)
              : false;
            const buttonBase =
              "mt-auto inline-flex items-center justify-center rounded-full px-5 py-3 text-base font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
            const primaryButton = `${buttonBase} border border-primary bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg hover:-translate-y-0.5 hover:text-white`;
            const secondaryButton = `${buttonBase} border border-border bg-bg-page text-text opacity-80 hover:opacity-100 hover:-translate-y-0.5 hover:border-primary hover:text-primary`;
            const completedButton = `${buttonBase} border border-border bg-bg-page text-text opacity-90 hover:-translate-y-0.5 hover:border-primary hover:text-primary`;

            return (
              <article
                key={step.id}
                className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => {
                    if (!isCollapsible) return;
                    setCollapsed((prev) => ({
                      ...prev,
                      [step.id]: !prev[step.id],
                    }));
                  }}
                  {...(isCollapsible
                    ? {
                        "aria-expanded": !isCollapsed,
                        "aria-label": isCollapsed
                          ? `Expand step: ${step.title}`
                          : `Collapse step: ${step.title}`,
                      }
                    : {})}
                >
                  {isDone ? (
                    <CheckIcon />
                  ) : (
                    <NumberCircle value={`${idx + 1}`} active={isCurrent} />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold tracking-wide text-primary">
                      {step.title}
                    </p>
                    {!isDone && isCurrent ? (
                      <p className="mt-1 text-xs font-medium text-text-muted">Current step</p>
                    ) : isDone ? (
                      <p className="mt-1 text-xs font-medium text-text-muted">Done</p>
                    ) : null}
                    {!isCollapsed ? (
                      <p className="mt-1 text-sm text-text-muted">
                        {step.description}
                      </p>
                    ) : null}
                  </div>
                  {isCollapsible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className={`h-4 w-4 text-text-muted transition-transform ${isCollapsed ? "rotate-90" : "-rotate-90"}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : null}
                </button>

                {!isCollapsed ? (
                  isDone ? (
                    <Link
                      to={step.href}
                      target="_blank"
                      rel="noreferrer"
                      className={completedButton}
                    >
                      Review step
                    </Link>
                  ) : (
                    <Link
                      to={step.href}
                      target="_blank"
                      rel="noreferrer"
                      className={isCurrent ? primaryButton : secondaryButton}
                    >
                      {step.cta}
                    </Link>
                  )
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default Start;
