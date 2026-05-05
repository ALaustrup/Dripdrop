import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ethers } from 'ethers';

import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useDripStore } from '@/stores/useDripStore';
import {
  estimateTransferGas,
  createTransferPayload,
  hasWalletConnectProjectId,
  parseCaipAddress,
  SUPPORTED_CHAINS,
  type SupportedChainKey,
} from '@/services/walletConnect';

const TESTNET_TOKEN_ADDRESS = process.env.EXPO_PUBLIC_DRIP_TOKEN_ADDRESS ?? '';
const TESTNET_TOKEN_DECIMALS = Number(process.env.EXPO_PUBLIC_DRIP_TOKEN_DECIMALS ?? 18);
const DEFAULT_CHAIN: SupportedChainKey = 'baseSepolia';

export default function WalletScreen() {
  const { isConnected, open, provider, address } = useWalletConnect();
  const { phase, dripBalance, sendDripToUser, queueExternalTransfer } = useDripStore((state) => ({
    phase: state.phase,
    dripBalance: state.dripBalance,
    sendDripToUser: state.sendDripToUser,
    queueExternalTransfer: state.queueExternalTransfer,
  }));

  const [usernameRecipient, setUsernameRecipient] = useState('');
  const [walletRecipient, setWalletRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletAccount = useMemo(() => parseCaipAddress(address ? `eip155:${SUPPORTED_CHAINS.baseSepolia.id}:${address}` : undefined), [address]);
  const canSend = phase === 'Cloud';
  const hasWallet = isConnected && provider;

  const handleConnect = async () => {
    if (!hasWalletConnectProjectId()) {
      Alert.alert('WalletConnect not configured', 'Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID to enable wallet connection.');
      return;
    }
    await open();
  };

  const handleInternalSend = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !usernameRecipient.trim()) {
      Alert.alert('Invalid input', 'Enter a valid username and amount.');
      return;
    }
    if (parsedAmount > dripBalance) {
      Alert.alert('Insufficient balance', 'Amount exceeds current DRIP balance.');
      return;
    }
    await sendDripToUser(usernameRecipient.trim(), amount);
    Alert.alert('Transfer queued', `Sent ${parsedAmount} DRIP to @${usernameRecipient.trim()}.`);
    setAmount('');
    setUsernameRecipient('');
  };

  const handleExternalSend = async () => {
    if (!hasWallet || !provider || !walletAccount) {
      Alert.alert('Wallet required', 'Connect a wallet before sending on-chain.');
      return;
    }

    if (!TESTNET_TOKEN_ADDRESS) {
      Alert.alert('Token not configured', 'Set EXPO_PUBLIC_DRIP_TOKEN_ADDRESS for testnet token sends.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !walletRecipient.trim()) {
      Alert.alert('Invalid input', 'Enter a valid destination wallet and amount.');
      return;
    }

    if (!ethers.utils.isAddress(walletRecipient.trim())) {
      Alert.alert('Invalid wallet', 'Destination wallet address is invalid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const estimate = await estimateTransferGas(
        DEFAULT_CHAIN,
        walletAccount.address,
        TESTNET_TOKEN_ADDRESS,
        ethers.utils.parseUnits(amount, TESTNET_TOKEN_DECIMALS).toString()
      );
      setGasEstimate(estimate);

      const web3Provider = new ethers.providers.Web3Provider(provider as ethers.providers.ExternalProvider);
      const signer = web3Provider.getSigner();
      const fromAddress = await signer.getAddress();
      const txPayload = createTransferPayload({
        tokenContract: TESTNET_TOKEN_ADDRESS,
        to: walletRecipient.trim(),
        amount,
        decimals: TESTNET_TOKEN_DECIMALS,
      });
      const tx = await signer.sendTransaction({
        from: fromAddress,
        to: txPayload.to,
        data: txPayload.data,
        value: txPayload.value,
      });

      queueExternalTransfer({
        id: `wallet_tx_${Date.now()}`,
        to: walletRecipient.trim(),
        amount,
        type: 'wallet',
        chain: DEFAULT_CHAIN,
      });
      Alert.alert('Transfer submitted', `Tx hash: ${tx.hash.slice(0, 10)}...`);
      setAmount('');
      setWalletRecipient('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send transfer.';
      Alert.alert('Transfer failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.subtitle}>In-app DRIP: {Math.floor(dripBalance).toLocaleString()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Web3 Connection</Text>
        <Text style={styles.cardBody}>
          Wallet status: {hasWallet ? 'Connected' : 'Disconnected'} {address ? `(${address.slice(0, 6)}...${address.slice(-4)})` : ''}
        </Text>
        <Pressable style={styles.button} onPress={handleConnect}>
          <Text style={styles.buttonText}>{hasWallet ? 'Reconnect Wallet' : 'Connect Wallet'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send to Username</Text>
        <TextInput
          style={styles.input}
          value={usernameRecipient}
          onChangeText={setUsernameRecipient}
          placeholder="username"
          placeholderTextColor="#7f9db8"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount DRIP"
          keyboardType="decimal-pad"
          placeholderTextColor="#7f9db8"
        />
        <Pressable style={[styles.button, !canSend && styles.buttonDisabled]} onPress={handleInternalSend} disabled={!canSend}>
          <Text style={styles.buttonText}>{canSend ? 'Send to User' : 'Unlock at Cloud phase'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send to External Wallet (Base/Polygon Testnet)</Text>
        <TextInput
          style={styles.input}
          value={walletRecipient}
          onChangeText={setWalletRecipient}
          placeholder="0x..."
          placeholderTextColor="#7f9db8"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount DRIP"
          keyboardType="decimal-pad"
          placeholderTextColor="#7f9db8"
        />
        {gasEstimate && <Text style={styles.meta}>Estimated gas units: {gasEstimate}</Text>}
        <Pressable
          style={[styles.button, (!canSend || isSubmitting) && styles.buttonDisabled]}
          onPress={handleExternalSend}
          disabled={!canSend || isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Sending...' : 'Send On-Chain'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#03192f',
  },
  title: {
    color: '#ecf8ff',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9ac5e5',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#0b2945',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: '#f2f9ff',
    fontSize: 17,
    fontWeight: '700',
  },
  cardBody: {
    color: '#abd1eb',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#0f3456',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f2fbff',
  },
  button: {
    backgroundColor: '#2a9df4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  meta: {
    color: '#8dc3e6',
    fontSize: 12,
  },
});
