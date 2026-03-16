# BridgeTransaction.ps1
$PulseTxHash = "0xe3fc196d23ae0809b9118a8df8119d5b22bbd4d0bac561c58faef362a97311eb"  # replace this

$script = @'
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const PLS_RPC = 'https://rpc.pulsechain.com';
const ETH_RPC = 'https://eth.public-rpc.com';
const pulseTxHash = '$PulseTxHash';

// Known contracts
const PLS_HOME = '0x4fd0aaa7506f3d9cb8274bdb946ec42a1b8751ef'; // PulseChain OmniBridge Home
const ETH_HOME = '0x88ad09518695c6c3712ac10a214be5109a655671'; // Ethereum OmniBridge Home

const abiPath = path.join(process.cwd(), 'aggregator-frontend', 'src', 'abis', 'OmniBridge.json');
const omniAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

const plsProvider = new ethers.JsonRpcProvider(PLS_RPC, { chainId: 369, name: 'pulsechain' });
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC, { chainId: 1, name: 'homestead' });

(async () => {
  const iface = new ethers.Interface(omniAbi);
  const receipt = await plsProvider.getTransactionReceipt(pulseTxHash);
  const bridgeLog = receipt.logs.find(l => l.address.toLowerCase() === PLS_HOME.toLowerCase());
  if (!bridgeLog) {
    console.log('No TokensBridgingInitiated log found on PulseChain');
    return;
  }
  const parsed = iface.parseLog({ topics: bridgeLog.topics, data: bridgeLog.data });
  const messageId = parsed.args[3];
  console.log('Message ID:', messageId);

  // Check if executed on Ethereum Home
  const topic = iface.getEvent('TokensBridged').topicHash;
  const filter = {
    address: ETH_HOME,
    topics: [topic, null, null, null, messageId],
    fromBlock: 0,
    toBlock: 'latest',
  };

  let logs = [];
  try {
    logs = await ethProvider.getLogs(filter);
  } catch (e) {
    console.error('Error fetching ETH logs:', e);
  }
  console.log('Executed logs on ETH Home:', logs.length);
})();
'@

node -e $script
