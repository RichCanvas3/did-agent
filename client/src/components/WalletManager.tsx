import React, { useEffect, useState } from 'react';
import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { createPublicClient, http } from "viem";
import { createWalletClient, custom, toHex } from "viem";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/delegation-toolkit";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createBundlerClient } from "viem/account-abstraction";
import type { Address } from "viem";

interface WalletManagerProps {
  onAAWalletDeployed?: (address: string) => void;
}

export const WalletManager: React.FC<WalletManagerProps> = ({ onAAWalletDeployed }) => {
  const [eoaAddress, setEoaAddress] = useState<string>('');
  const [eoaBalance, setEoaBalance] = useState<string>('');
  const [aaBalance, setAaBalance] = useState<string>('');
  const [aaWalletAddress, setAaWalletAddress] = useState<string>('');

  const chain = sepolia;

  const fetchBalances = async () => {
    try {
      if ((window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts[0]) {
          const balance = await provider.getBalance(accounts[0]);
          setEoaAddress(accounts[0])
          setEoaBalance(ethers.formatEther(balance));
        }

        if (aaWalletAddress) {
          const aaBalance = await provider.getBalance(aaWalletAddress);
          setAaBalance(ethers.formatEther(aaBalance));
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [aaWalletAddress]);

  const login = async () => {
    const provider = (window as any).ethereum;
    const selectedNetwork = await provider.request({ method: "eth_chainId" });

    if (parseInt(selectedNetwork) !== chain.id) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: toHex(chain.id),
          },
        ],
      });
    }

    const [owner] = (await provider.request({
      method: "eth_requestAccounts",
    })) as Address[];

    const walletClient = createWalletClient({
      chain: chain,
      transport: custom(provider),
      account: owner as `0x${string}`
    });

    console.info("........> wallet address: ", owner)

    return {
      owner,
      signatory: { walletClient: walletClient },
    };
  };

  const getEOASmartAccount = async(
    owner: any,
    signatory: any,
    publicClient: any
  ) : Promise<any> => {
    console.info("Creating smart account with owner:", owner);

    const accountClient = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [
          owner,
        [] as string[],
        [] as bigint[],
        [] as bigint[]
      ] as [owner: `0x${string}`, keyIds: string[], xValues: bigint[], yValues: bigint[]],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000001",
      signatory: signatory as any,
    });

    console.info("Smart account created with address:", accountClient.address);
    const isDeployed = await accountClient.isDeployed();
    console.info("Smart account deployment status:", isDeployed);

    if (!isDeployed) {
      console.info("Deploying smart account...");
      const pimlicoClient = createPimlicoClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL),
        chain: chain
      });

      const bundlerClient = createBundlerClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
        chain: chain,
        paymaster: true,
      }) as any;

      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      try {
        const userOperationHash = await bundlerClient.sendUserOperation({
          account: accountClient,
          calls: [
            {
              to: accountClient.address,
              data: "0x",
              value: 0n,
            },
          ],
          callGasLimit: 5000000n,
          verificationGasLimit: 5000000n,
          preVerificationGas: 2000000n,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
        });

        console.info("Waiting for deployment receipt...");
        const { receipt } = await bundlerClient.waitForUserOperationReceipt({
          hash: userOperationHash,
        });
        console.info("Deployment receipt 1:", receipt);
      } catch (error) {
        console.error("Deployment error:", error);
        throw error;
      }
    }

    return accountClient;
  }

  const getOtherSmartAccount = async(
    owner: any,
    signatory: any,
    publicClient: any
  ) : Promise<any> => {
    const accountClient = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [
          owner,
        [] as string[],
        [] as bigint[],
        [] as bigint[]
      ] as [owner: `0x${string}`, keyIds: string[], xValues: bigint[], yValues: bigint[]],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000002",
      signatory: signatory as any,
    });

    const isDeployed = await accountClient.isDeployed();
    console.log("Smart account deployment status 2:", isDeployed);

    if (isDeployed == false) {
      console.info("Deploying smart account...");
      const pimlicoClient = createPimlicoClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL),
        chain: chain
      });

      const bundlerClient = createBundlerClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
        chain: chain,
        paymaster: true,
      }) as any;

      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      try {
        const userOperationHash = await bundlerClient.sendUserOperation({
          account: accountClient,
          calls: [
            {
              to: accountClient.address,
              data: "0x",
              value: 0n,
            },
          ],
          callGasLimit: 5000000n,
          verificationGasLimit: 5000000n,
          preVerificationGas: 2000000n,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
        });

        console.info("Waiting for deployment receipt...");
        const { receipt } = await bundlerClient.waitForUserOperationReceipt({
          hash: userOperationHash,
        });
        console.info("Deployment receipt 2:", receipt);
      } catch (error) {
        console.error("Deployment error:", error);
        throw error;
      }
    } else {
        console.log("Smart account is deployed");
        console.log("........ smart accountClient: ", accountClient.address)
    }

    return accountClient;
  }

  async function getBalance(address: string) {
    const sepProv = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
    const balance = await sepProv.getBalance(address);
    const eth = ethers.formatEther(balance);
    console.log(`Balance: ${eth} ETH for address: ${address}`);
    return eth;
  }

  return {
    eoaAddress,
    setEoaAddress,
    eoaBalance,
    setEoaBalance,
    aaBalance,
    setAaBalance,
    aaWalletAddress,
    setAaWalletAddress,
    fetchBalances,
    login,
    getEOASmartAccount,
    getOtherSmartAccount,
    getBalance,
    chain
  };
}; 