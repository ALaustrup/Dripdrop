type NoopWalletConnect = {
  open: () => Promise<void>;
  close: () => void;
  isConnected: boolean;
  address: undefined;
  provider: undefined;
};

export function useWalletConnect(): NoopWalletConnect {
  return {
    open: async () => {},
    close: () => {},
    isConnected: false,
    address: undefined,
    provider: undefined,
  };
}
