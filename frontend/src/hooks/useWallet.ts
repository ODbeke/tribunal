'use client';

import { useCallback, useEffect, useState } from 'react';

const COURT_NETWORK = {
  chainId: '0x107D', // Bradbury Testnet ID (4221)
  chainName: 'GenLayer Bradbury Testnet',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: ['https://rpc-bradbury.genlayer.com'],
  blockExplorerUrls: ['https://explorer-bradbury.genlayer.com/'],
};

const EXPECTED_CHAIN_HEX = '0x107d';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
}

export interface WalletHook {
  account: `0x${string}` | null;
  networkId: string | null;
  balanceGEN: string | null;
  isConnecting: boolean;
  walletError: string | null;
  isProviderDetected: boolean;
  isValidChain: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  updateBalance: () => Promise<void>;
}

function formatWeiToGEN(hexWei: string, precision = 4): string {
  try {
    const rawVal = BigInt(hexWei);
    const divisor = 10n ** 18n;
    const whole = rawVal / divisor;
    const remainder = rawVal % divisor;
    let fraction = remainder.toString().padStart(18, '0').slice(0, precision);
    fraction = fraction.replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return '0.0000';
  }
}

export function useWallet(): WalletHook {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [balanceGEN, setBalanceGEN] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isProviderDetected, setIsProviderDetected] = useState(false);

  useEffect(() => {
    setIsProviderDetected(!!getProvider());
  }, []);

  const fetchNetworkId = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    try {
      const currentChain = (await provider.request({ method: 'eth_chainId' })) as string;
      setNetworkId(currentChain);
    } catch {
      // quiet fallback
    }
  }, []);

  const updateBalance = useCallback(async () => {
    const provider = getProvider();
    if (!provider || !account) return;
    try {
      const hexBal = (await provider.request({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      })) as string;
      setBalanceGEN(formatWeiToGEN(hexBal));
    } catch {
      // quiet fallback
    }
  }, [account]);

  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setWalletError('No Web3 provider detected. Please install a GenLayer-enabled wallet extension.');
      return;
    }
    setIsConnecting(true);
    setWalletError(null);
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('Wallet connection failed: No accounts returned');
      }

      // Proactively request to add and switch to Bradbury chain
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [COURT_NETWORK],
        });
      } catch {
        // chain might already exist on provider
      }

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: COURT_NETWORK.chainId }],
        });
      } catch {
        // user might reject the network switch
      }

      setAccount(accounts[0] as `0x${string}`);
      await fetchNetworkId();
    } catch (e) {
      const errMsg = String((e as { message?: string })?.message ?? e);
      if (/reject|denied|4001/i.test(errMsg)) {
        setWalletError('Signature request was rejected by user.');
      } else {
        setWalletError('Failed to synchronize connection with web3 provider.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [fetchNetworkId]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setBalanceGEN(null);
  }, []);

  // Listen to provider events
  useEffect(() => {
    const provider = getProvider();
    if (!provider || !provider.on) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accList = args[0] as string[];
      if (!accList || accList.length === 0) setAccount(null);
      else setAccount(accList[0] as `0x${string}`);
    };

    const handleChainChanged = (...args: unknown[]) => {
      setNetworkId(args[0] as string);
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (account) {
      updateBalance();
    }
  }, [account, updateBalance]);

  const isValidChain = (networkId ?? '').toLowerCase() === EXPECTED_CHAIN_HEX;

  return {
    account,
    networkId,
    balanceGEN,
    isConnecting,
    walletError,
    isProviderDetected,
    isValidChain,
    connectWallet,
    disconnectWallet,
    updateBalance,
  };
}
