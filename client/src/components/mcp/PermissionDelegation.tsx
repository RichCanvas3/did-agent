import React, { useState } from 'react';
import { createPublicClient, http, createClient, custom, createWalletClient } from 'viem';
import { sepolia } from 'viem/chains';
import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createBundlerClient } from 'viem/account-abstraction';
import { erc7715ProviderActions } from "@metamask/delegation-toolkit/experimental";
import { erc7710BundlerActions } from "@metamask/delegation-toolkit/experimental";

export const PermissionDelegation: React.FC = () => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const chain = sepolia;

  const provider = (window as any).ethereum;

  const login = async () => {
    const selectedNetwork = await provider.request({ method: "eth_chainId" });

    if (parseInt(selectedNetwork) !== chain.id) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: `0x${chain.id.toString(16)}`,
          },
        ],
      });
    }

    const [owner] = (await provider.request({
      method: "eth_requestAccounts",
    })) as any[];

    const walletClient = createWalletClient({
      chain: chain,
      transport: custom(provider),
      account: owner as `0x${string}`
    });

    console.info("........> wallet address: ", owner);

    return {
      owner,
      signatory: { walletClient: walletClient },
    };
  };

  const getOtherSmartAccount = async (
    owner: any,
    signatory: any,
    publicClient: any
  ): Promise<any> => {
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
      console.log("........ smart accountClient: ", accountClient.address);
    }

    return accountClient;
  };

  const handlePermissionDelegation = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const client = createClient({
        transport: custom((window as any).ethereum),
      }).extend(erc7715ProviderActions());

      const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
      });

      const loginResp = await login();
      console.info("........ client: ", loginResp);
      const otherAccountClient = await getOtherSmartAccount(loginResp.owner, loginResp.signatory, publicClient);

      const currentTime = Math.floor(Date.now() / 1000);
      const oneDayInSeconds = 24 * 60 * 60;
      const expiry = currentTime + oneDayInSeconds;

      const permissions = await client.grantPermissions([
        {
          chainId: sepolia.id,
          expiry,
          signer: {
            type: "account",
            data: {
              address: otherAccountClient.address,
            },
          },
          permission: {
            type: "native-token-stream",
            data: {
              initialAmount: 1n, // 1 WEI
              amountPerSecond: 1n, // 1 WEI per second
              startTime: currentTime,
              maxAmount: 10n, // 10 WEI
              justification: "Payment for a subscription service",
            },
          },
        },
      ]);

      const permission = permissions[0];
      const { accountMeta, context, signerMeta } = permission;

      const delegationManager = signerMeta?.delegationManager;

      const pimlicoClient = createPimlicoClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL),
        chain: chain
      });
      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      const bundlerClient = createBundlerClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
        chain: chain,
        paymaster: true,
      }).extend(erc7710BundlerActions()) as any;

      const hash = await bundlerClient.sendUserOperationWithDelegation({
        publicClient,
        account: otherAccountClient,
        calls: [
          {
            to: otherAccountClient.address,
            data: "0x",
            value: 1n,
            permissionsContext: context,
            delegationManager,
          },
        ],
        ...fee,
        accountMetadata: accountMeta,
      });

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      });

      console.info("........ handlePermissionDelegation receipt: ", receipt);
      setResponse({ success: true, receipt });

    } catch (err) {
      console.error('Error in permission delegation:', err);
      setResponse({ error: 'Permission delegation failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>ERC-7715 Permission Delegation</h2>
      <div>
        <button onClick={handlePermissionDelegation} disabled={loading}>
          {loading ? 'Processing permission delegation...' : 'ERC-7715 Permission Delegation'}
        </button>
      </div>

      {response && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: response.error ? '#f8d7da' : '#d4edda',
          borderRadius: '8px',
          border: `1px solid ${response.error ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: response.error ? '#721c24' : '#155724' }}>
            {response.error ? 'Error' : 'Success'}
          </h3>
          <pre style={{ margin: 0, color: response.error ? '#721c24' : '#155724' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}; 