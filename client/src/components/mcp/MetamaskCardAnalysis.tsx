import React, { useState } from 'react';
import { ethers } from "ethers";
import axios from 'axios';

export const MetamaskCardAnalysis: React.FC = () => {
  const [metamaskCardResults, setMetamaskCardResults] = useState<any[]>([]);
  const [metamaskCardLoading, setMetamaskCardLoading] = useState(false);

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
    const receipt = await lineaProvider.getTransactionReceipt(txHash);
    const transferTopic = iface.getEvent("Transfer");

    console.info("........ receipt: ", receipt);

    const tokenTransfers = receipt?.logs
      .map(log => {
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
      });

    return tokenTransfers;
  }

  async function getMetamaskCardWithdrawTransactions() {
    const url = `https://api.lineascan.build/api?module=account&action=txlist&address=${METAMASK_CARD_CONTRACT_ADDR}&startblock=${START_BLOCK}&endblock=${END_BLOCK}&sort=asc&apikey=${LINEASCAN_API_KEY}`;
    const response = await axios.get(url);
    const transactions = response.data.result;

    return transactions;
  }

  const handleMetamaskCardEOAWithdrawRecipients = async () => {
    setMetamaskCardLoading(true);
    setMetamaskCardResults([]);

    try {
      const withdrawTxs = await getMetamaskCardWithdrawTransactions();
      console.log(`Found ${withdrawTxs.length} withdraw() transactions.\n`);

      const results: any[] = [];

      let count = 0;
      for (const tx of withdrawTxs) {
        count++;
        if (count > 1) {
          break;
        }
        const rtn = await getTokenTransfersFromTx(tx.hash);

        if (rtn && rtn.length > 0) {
          results.push({
            transactionHash: tx.hash,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
            ...rtn[0]
          });
        }
      }

      setMetamaskCardResults(results);
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
        <button onClick={handleMetamaskCardEOAWithdrawRecipients} disabled={metamaskCardLoading}>
          {metamaskCardLoading ? 'Analyzing MetaMask Card...' : 'Check for MetaMask Card and Withdrawals'}
        </button>
      </div>

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
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '5px',
              border: '1px solid #e9ecef'
            }}>
              {result.error ? (
                <div style={{ color: '#dc3545' }}>{result.error}</div>
              ) : (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Transaction:</strong>
                    <a
                      href={`https://lineascan.build/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#007bff', textDecoration: 'none', marginLeft: '5px' }}
                    >
                      {result.transactionHash.substring(0, 10)}...
                    </a>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Timestamp:</strong> {result.timestamp}
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>From (MetaMask Card EOA):</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {result.from}
                    </span>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>To (Central Card Fund):</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {result.to}
                    </span>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>USDC Amount:</strong>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                      {(BigInt(result.value) / BigInt(10 ** 6)).toString()} USDC
                    </span>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Token Contract:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {result.tokenAddress}
                    </span>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Withdraw Originator:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {result.withdrawOriginator}
                    </span>
                  </div>
                  <div>
                    <strong>Withdraw Processor:</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                      {result.withdrawProcessor}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 