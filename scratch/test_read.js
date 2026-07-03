const { createClient } = require('genlayer-js');
const { testnetBradbury } = require('genlayer-js/chains');

const client = createClient({ chain: testnetBradbury });

const ADDRESS = '0x7D412D77f1f7d9f94279663172F69f83A1D60Ee0';

async function run() {
  try {
    console.log("Reading stats...");
    const stats = await client.readContract({
      address: ADDRESS,
      functionName: 'get_global_stats',
      args: [],
    });
    console.log("Stats output:", stats);

    console.log("Reading escrows...");
    const escrows = await client.readContract({
      address: ADDRESS,
      functionName: 'get_escrows',
      args: [0, 10],
    });
    console.log("Escrows output:", escrows);
  } catch (err) {
    console.error("Read failed:", err);
  }
}

run();
