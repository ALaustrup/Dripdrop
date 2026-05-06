import { WalletConnectModal } from '@walletconnect/modal-react-native';

import { walletConnectModalConfig } from '@/services/walletConnect';

export function WalletConnectModalWrapper() {
  return <WalletConnectModal {...walletConnectModalConfig} />;
}
