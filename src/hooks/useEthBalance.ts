import { useEffect, useMemo, useState } from "react";
import { formatEther } from "ethers";
import useWallet from "./useWallet";
import { EthereumConfig } from "../config/chainConfig";

const POLL_MS = 12_000;

export default function useEthBalance() {
  const { wallet, currentChainId } = useWallet();
  const account = wallet ? wallet.accounts[0]?.address : undefined;
  const isOnEthereum = currentChainId === EthereumConfig.chainId;
  const [weiHex, setWeiHex] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const eth = (globalThis as any).ethereum ?? wallet?.provider;

  async function load() {
    if (!eth || !account || !isOnEthereum) {
      setWeiHex(null);
      return;
    }
    try {
      setLoading(true);
      // EIP-1193: eth_getBalance (returns hex Wei); format with ethers v6
      // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_getbalance/ | https://docs.ethers.org/v6/
      const res: string = await eth.request({
        method: "eth_getBalance",
        params: [account, "latest"],
      });
      setWeiHex(res);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "balance error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // initial
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, isOnEthereum]);

  const ethFloat = useMemo(() => {
    if (!weiHex) return 0;
    try {
      return Number(formatEther(BigInt(weiHex)));
    } catch {
      return 0;
    }
  }, [weiHex]);

  return { ethFloat, isOnEthereum, loading, error: err, refresh: load };
}
