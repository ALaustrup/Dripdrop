import { IProviderMetadata } from '@walletconnect/modal-react-native';
import Constants from 'expo-constants';
import { ethers } from 'ethers';

const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const metadata: IProviderMetadata = {
  name: 'DripDrop',
  description: 'Tap. Collect. Flow. Unlock the Water Cycle.',
  url: 'https://dripdrop.cc',
  icons: ['https://dripdrop.cc/icon.png'],
  redirect: {
    native: 'dripdrop://',
    universal: 'https://dripdrop.cc',
  },
};

export const walletConnectModalConfig = {
  projectId,
  providerMetadata: metadata,
};

export type WalletAccount = {
  address: string;
  chainId: number;
};

export const SUPPORTED_CHAINS = {
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
  },
  polygonAmoy: {
    id: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
  },
} as const;

export type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

export function hasWalletConnectProjectId(): boolean {
  return projectId.length > 0;
}

export function parseCaipAddress(caipAddress: string | undefined): WalletAccount | null {
  if (!caipAddress) {
    return null;
  }

  const [namespace, chainId, address] = caipAddress.split(':');
  if (namespace !== 'eip155' || !chainId || !address) {
    return null;
  }

  const parsedChainId = Number(chainId);
  if (!Number.isFinite(parsedChainId)) {
    return null;
  }

  return {
    address: ethers.utils.getAddress(address),
    chainId: parsedChainId,
  };
}

export function createReadonlyProvider(chainKey: SupportedChainKey): ethers.providers.JsonRpcProvider {
  const chain = SUPPORTED_CHAINS[chainKey];
  return new ethers.providers.JsonRpcProvider(chain.rpcUrl, chain.id);
}

export async function estimateTransferGas(
  chainKey: SupportedChainKey,
  from: string,
  to: string,
  valueInWei: string
): Promise<string> {
  const provider = createReadonlyProvider(chainKey);
  const estimate = await provider.estimateGas({
    from,
    to,
    value: ethers.BigNumber.from(valueInWei),
  });
  return estimate.toString();
}

export function getExpoProjectOwner(): string | undefined {
  const owner = Constants.expoConfig?.owner;
  return owner ?? undefined;
}

export type WalletConnection = {
  address: string;
  chainId: number;
  signer?: ethers.Signer;
};

export type TokenTransferRequest = {
  tokenContract: string;
  to: string;
  amount: string;
  decimals: number;
};

const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

export function createTransferPayload(request: TokenTransferRequest): {
  to: string;
  data: string;
  value: string;
} {
  const iface = new ethers.utils.Interface(ERC20_ABI);
  const parsedAmount = ethers.utils.parseUnits(request.amount, request.decimals);
  return {
    to: request.tokenContract,
    data: iface.encodeFunctionData('transfer', [request.to, parsedAmount]),
    value: '0x0',
  };
}

export async function transferDripToken(
  signer: ethers.Signer,
  request: TokenTransferRequest
): Promise<string> {
  const contract = new ethers.Contract(request.tokenContract, ERC20_ABI, signer);
  const tx = await contract.transfer(request.to, ethers.utils.parseUnits(request.amount, request.decimals));
  return tx.hash;
}
