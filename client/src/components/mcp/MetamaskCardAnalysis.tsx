import React, { useState } from 'react';
import { ethers } from "ethers";
import axios from 'axios';

export const MetamaskCardAnalysis: React.FC = () => {
  const [metamaskCardResults, setMetamaskCardResults] = useState<any[]>([]);
  const [metamaskCardLoading, setMetamaskCardLoading] = useState(false);
  const [analysisStats, setAnalysisStats] = useState<any>(null);

  // Linea RPC or Etherscan-compatible API
  const lineaProvider = new ethers.JsonRpcProvider("https://rpc.linea.build");

  const METAMASK_CARD_CONTRACT_ADDR = "0xA90b298d05C2667dDC64e2A4e17111357c215dD2";
  const WITHDRAW_SELECTOR = "0xf7ece0cf"; //ethers.id("withdraw()").substring(0, 10);

  const LINEASCAN_API_KEY = "Z68JJAC45R53NRQN8VMBWGVKWNU6N3JQR6";

  const ERC20_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ];
  const iface = new ethers.Interface(ERC20_ABI);

  const START_BLOCK = 20071449;
  const END_BLOCK = 21000000;

  async function getTokenTransfersFromTx(txHash: string) {
    try {
      const receipt = await lineaProvider.getTransactionReceipt(txHash);
      const transferTopic = iface.getEvent("Transfer");

      console.info("........ receipt: ", receipt);

      const tokenTransfers = receipt?.logs
        .map(log => {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) {
              console.info("........ from Metamask Card EOA: ", parsed.args.from);
              console.info("........ to Central Card Fund: ", parsed.args.to);
              console.info("........ withdraw amount USDC: ", (Number(parsed.args.value) / 10 ** 6).toFixed(2));
              console.info("........ tokenAddress: ", log.address);
              console.info("........ Metamask Card Contract (withdraw processor: to): ", receipt.to);
              console.info("........ Central Card Fund Contract (withdraw originator: from): ", receipt.from);

              return {
                from: parsed.args.from,
                to: parsed.args.to,
                value: parsed.args.value.toString(),
                tokenAddress: log.address,
                withdrawOriginator: receipt.from,
                withdrawProcessor: receipt.to
              };
            }
          } catch (error) {
            console.warn("Failed to parse log:", error);
            return null;
          }
        })
        .filter(Boolean); // Remove null values

      return tokenTransfers;
    } catch (error) {
      console.error("Error getting token transfers from transaction:", error);
      return [];
    }
  }

  async function getEOAWithdrawRecipients(transactionHash: string) {
    try {
      // Get transaction and receipt to confirm source
      const tx = await lineaProvider.getTransaction(transactionHash);
      const txReceipt = await lineaProvider.getTransactionReceipt(transactionHash);

      if (!tx) {
        console.warn("Transaction not found:", transactionHash);
        return null;
      }

      const erc20TransferTopic = ethers.id("Transfer(address,address,uint256)");
      console.info("........ erc20TransferTopic: ", txReceipt);

      const tokenTransfers = txReceipt?.logs.filter(log =>
        log.topics[0] === erc20TransferTopic
      );

      console.info("........ tokenTransfers: ", tokenTransfers);

      const isWithdrawCall =
        tx.to?.toLowerCase() === METAMASK_CARD_CONTRACT_ADDR.toLowerCase() &&
        tx.data.startsWith(WITHDRAW_SELECTOR);

      if (isWithdrawCall) {
        console.info("........ from: ", tx.from);
        console.info("........ to: ", tx.to);
        return {
          isWithdrawCall: true,
          from: tx.from,
          to: tx.to,
          tokenTransfers
        };
      }

      return {
        isWithdrawCall: false,
        tokenTransfers
      };
    } catch (error) {
      console.error("Error analyzing EOA withdraw recipients:", error);
      return null;
    }
  }

  async function getMetamaskCardWithdrawTransactions() {
    try {
      const url = `https://api.lineascan.build/api?module=account&action=txlist&address=${METAMASK_CARD_CONTRACT_ADDR}&startblock=${START_BLOCK}&endblock=${END_BLOCK}&sort=asc&apikey=${LINEASCAN_API_KEY}`;
      const response = await axios.get(url);
      const transactions = response.data.result;

      return transactions;
    } catch (error) {
      console.error("Error fetching MetaMask Card transactions:", error);
      throw error;
    }
  }

  const handleMetamaskCardEOAWithdrawRecipients = async () => {
    setMetamaskCardLoading(true);
    setMetamaskCardResults([]);
    setAnalysisStats(null);

    try {
      const withdrawTxs = await getMetamaskCardWithdrawTransactions();
      console.log(`Found ${withdrawTxs.length} withdraw() transactions.\n`);

      const results: any[] = [];
      let totalUSDC = 0n;
      let successfulTransfers = 0;

      // Process more transactions for better analysis
      let count = 0
      for (const tx of withdrawTxs) {
        try {
            count++
            if (count > 1) {
                break;
            }

          const rtn = await getTokenTransfersFromTx(tx.hash);
          const eoaAnalysis = await getEOAWithdrawRecipients(tx.hash);

          if (rtn && rtn.length > 0) {
            const transfer = rtn[0];
            if (transfer) {
              const usdcAmount = BigInt(transfer.value);
              totalUSDC += usdcAmount;
              successfulTransfers++;

              results.push({
                transactionHash: tx.hash,
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
                ...transfer,
                eoaAnalysis
              });
            }
          }
        } catch (error) {
          console.warn(`Error processing transaction ${tx.hash}:`, error);
        }
      }

      setMetamaskCardResults(results);
      setAnalysisStats({
        totalTransactions: withdrawTxs.length,
        successfulTransfers,
        totalUSDC: (Number(totalUSDC) / 10 ** 6).toFixed(2),
        averageUSDC: successfulTransfers > 0 ? (Number(totalUSDC) / 10 ** 6 / successfulTransfers).toFixed(2) : '0'
      });
    } catch (error) {
      console.error("Error analyzing MetaMask Card transactions:", error);
      setMetamaskCardResults([{ error: "Failed to fetch MetaMask Card data" }]);
    } finally {
      setMetamaskCardLoading(false);
    }
  };

  return (
    <div>
      <h2>MetaMask Card Analysis</h2>
      <div>
        <button className='service-button' onClick={handleMetamaskCardEOAWithdrawRecipients} disabled={metamaskCardLoading}>
          {metamaskCardLoading ? 'Analyzing MetaMask Card...' : 'Check for MetaMask Card and Withdrawals'}
        </button>
      </div>

      {/* Analysis Statistics */}
      {analysisStats && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0056b3' }}>
            Analysis Statistics
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0056b3' }}>
                {analysisStats.totalTransactions}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Transactions</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {analysisStats.successfulTransfers}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Successful Transfers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                {analysisStats.totalUSDC}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Total USDC</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                {analysisStats.averageUSDC}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Average USDC</div>
            </div>
          </div>
        </div>
      )}

      {metamaskCardResults.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
            MetaMask Card Analysis Results
            <span style={{ fontSize: '0.9em', fontWeight: 'normal', color: '#6c757d' }}>
              {' '}({metamaskCardResults.length} transactions found)
            </span>
          </h3>

          {metamaskCardResults.map((result, index) => (
            <div key={index} style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {result.error ? (
                <div style={{ color: '#dc3545' }}>{result.error}</div>
              ) : (
                <>
                  <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Transaction #{index + 1}</strong>
                    <a
                      href={`https://lineascan.build/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#007bff', 
                        textDecoration: 'none',
                        fontSize: '0.9em',
                        padding: '4px 8px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                      }}
                    >
                      View on Lineascan
                    </a>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Hash:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.transactionHash}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Timestamp:</strong> {result.timestamp}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>From (MetaMask Card EOA):</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.from}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>To (Central Card Fund):</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.to}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>USDC Amount:</strong>
                    <span style={{ color: '#28a745', fontWeight: 'bold', marginLeft: '5px' }}>
                      {(BigInt(result.value) / BigInt(10 ** 6)).toString()} USDC
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Token Contract:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.tokenAddress}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Withdraw Originator:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.withdrawOriginator}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Withdraw Processor:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', marginLeft: '5px' }}>
                      {result.withdrawProcessor}
                    </span>
                  </div>
                  {result.eoaAnalysis && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}>
                      <strong>EOA Analysis:</strong>
                      <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                        <div>Is Withdraw Call: {result.eoaAnalysis.isWithdrawCall ? 'Yes' : 'No'}</div>
                        {result.eoaAnalysis.isWithdrawCall && (
                          <>
                            <div>From: {result.eoaAnalysis.from}</div>
                            <div>To: {result.eoaAnalysis.to}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 