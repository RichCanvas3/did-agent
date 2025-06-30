import React, { useState } from 'react';
import { createPublicClient, http, createClient, custom, createWalletClient, toHex, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createBundlerClient } from 'viem/account-abstraction';
import { erc7715ProviderActions } from "@metamask/delegation-toolkit/experimental";
import { erc7710BundlerActions } from "@metamask/delegation-toolkit/experimental";

// Helper function to convert BigInt values to strings for JSON serialization
const convertBigIntToString = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  
  return obj;
};

export const PermissionDelegation: React.FC = () => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const chain = sepolia;

  const provider = (window as any).ethereum;

  const login = async () => {
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
    setAccountInfo(null);

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

      // Set account information for display
      setAccountInfo({
        eoaAddress: loginResp.owner,
        smartAccountAddress: otherAccountClient.address,
        isDeployed: await otherAccountClient.isDeployed()
      });

      const currentTime = Math.floor(Date.now() / 1000);
      const oneDayInSeconds = 24 * 60 * 60;
      const expiry = currentTime + oneDayInSeconds;

      console.info("Granting permissions for native token stream...");
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

      console.info("Setting up bundler client for delegation...");
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

      console.info("Sending user operation with delegation...");
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

      console.info("Waiting for transaction receipt...");
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      });

      console.info("........ handlePermissionDelegation receipt: ", receipt);
      setResponse({ 
        success: true, 
        receipt,
        permissionDetails: {
          chainId: sepolia.id,
          expiry: new Date(expiry * 1000).toISOString(),
          initialAmount: "1 WEI",
          amountPerSecond: "1 WEI/second",
          maxAmount: "10 WEI",
          justification: "Payment for a subscription service"
        }
      });

    } catch (err) {
      console.error('Error in permission delegation:', err);
      setResponse({ 
        error: 'Permission delegation failed', 
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>ERC-7715 Permission Delegation</h2>
      
      {/* Flow Description */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>
          Permission Delegation Flow
        </h3>
        <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#6c757d' }}>
          <p><strong>1. Account Setup:</strong> Connect MetaMask and deploy smart account if needed</p>
          <p><strong>2. Permission Grant:</strong> Grant native token stream permissions to smart account</p>
          <p><strong>3. Delegation Execution:</strong> Execute delegated operation with permission context</p>
          <p><strong>4. Verification:</strong> Confirm transaction receipt and permission status</p>
        </div>
      </div>

      <div>
        <button className='service-button' onClick={handlePermissionDelegation} disabled={loading}>
          {loading ? 'Processing permission delegation...' : 'ERC-7715 Permission Delegation'}
        </button>
      </div>

      {/* Account Information */}
      {accountInfo && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>
            Account Information
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <div><strong>EOA Address:</strong> <span style={{ fontFamily: 'monospace' }}>{accountInfo.eoaAddress}</span></div>
            <div><strong>Smart Account Address:</strong> <span style={{ fontFamily: 'monospace' }}>{accountInfo.smartAccountAddress}</span></div>
            <div><strong>Deployment Status:</strong> {accountInfo.isDeployed ? 'Deployed' : 'Not Deployed'}</div>
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: response.error ? '#f8d7da' : '#d4edda',
          borderRadius: '8px',
          border: `1px solid ${response.error ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: response.error ? '#721c24' : '#155724' }}>
            {response.error ? 'Error' : 'Permission Delegation Successful'}
          </h3>
          
          {response.error ? (
            <div style={{ color: '#721c24' }}>
              <p><strong>Error:</strong> {response.error}</p>
              {response.details && <p><strong>Details:</strong> {response.details}</p>}
            </div>
          ) : (
            <div style={{ color: '#155724' }}>
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Permission Details:</h4>
                <ul style={{ margin: '0', paddingLeft: '20px' }}>
                  <li><strong>Chain ID:</strong> {response.permissionDetails.chainId}</li>
                  <li><strong>Expiry:</strong> {response.permissionDetails.expiry}</li>
                  <li><strong>Initial Amount:</strong> {response.permissionDetails.initialAmount}</li>
                  <li><strong>Amount Per Second:</strong> {response.permissionDetails.amountPerSecond}</li>
                  <li><strong>Max Amount:</strong> {response.permissionDetails.maxAmount}</li>
                  <li><strong>Justification:</strong> {response.permissionDetails.justification}</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Transaction Receipt:</h4>
                <pre style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  backgroundColor: 'rgba(0,0,0,0.05)', 
                  padding: '10px', 
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(convertBigIntToString(response.receipt), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 