# Tribunal: Decentralized AI Escrow Arbitration Court

Tribunal is a next-generation smart contract escrow court designed to handle subjective contract disputes. Traditional smart contracts can only enforce arithmetic and objective conditions (e.g., verifying a multisig signature or block height). Tribunal extends smart contracts with natural language reasoning, allowing two parties (a client and a provider) to lock funds in escrow under a custom, natural language agreement, submit deliverables, and resolve disputes under the consensus of an AI Jury.

The dispute evaluation runs entirely inside a **GenLayer Intelligent Contract**, executing non-deterministic LLM analysis under validator consensus. Payouts or refunds are executed automatically on-chain based on the final verdict.

---

## Technical Design & Consensus Safety

### 1. The Clock-Sync Hazard Resolution
In distributed state machines, calling system-time functions like `datetime.now()` inside deterministic transitions creates a consensus hazard. Since validators execute transactions at slightly different physical times, their clock readings will differ, leading to diverging state hashes and failed transactions.

**Tribunal solves this by eliminating on-chain system clock reads.** All timestamps (`created_at`, `deadline`, `disputed_at`, `resolved_at`) are passed as explicit arguments signed by the client/provider during transaction calls. This keeps all state updates 100% deterministic across all nodes.

### 2. Eliminating the "Shape-Only" Equivalence Loophole
Most GenLayer equivalence checks compare only the numerical output or the categorical verdict, leaving the generated proposal/reasoning text unchecked. A malicious leader node could write arbitrary or malicious text in the decision fields, which other validators would accept if they only verify the numerical split.

**Tribunal implements a strict consistency and sanity check in both `leader_fn` and `validator_fn`:**
* The verdict categorical string ("PAYOUT", "REFUND", "SPLIT") is strictly validated against the returned provider percentage.
* A `PAYOUT` verdict forces `provider_percent` to be exactly `100`.
* A `REFUND` verdict forces `provider_percent` to be exactly `0`.
* A `SPLIT` verdict restricts the percentage between `1` and `99`.
* Both leader and validator outputs must fall within a strict `10%` tolerance range for split payouts.
* Any unhandled JSON parse exceptions or missing structures in the validator's LLM run are caught defensively to return `False` rather than causing validator node execution failures.

---

## State Workflow Matrix

```
   [ CLIENT ]
  Fund Escrow --------+
                      |
                      v
                +------------+
                |   ACTIVE   | <----+ (Provider updates/submits)
                +------------+
                      |
                      | (Provider submits work)
                      v
                +------------+
                | SUBMITTED  |
                +------------+
                 /          \
  (Approve Work)/            \(Raise Dispute)
               v              v
        +-----------+    +------------+
        | COMPLETED |    |  DISPUTED  | (Locks state, opens evidence files)
        +-----------+    +------------+
                             /    \
            (Submit Evidence)      (Submit Evidence)
             Client                 Provider
                             \    /
                              v  v
                       +--------------+
                       | CONVENE COURT| (AI arbitration consensus)
                       +--------------+
                              |
                     +--------+--------+
                     |                 |
                     v                 v
               +-----------+     +-----------+
               | COMPLETED |     | REFUNDED  |  (Or SPLIT payout)
               +-----------+     +-----------+
```

---

## API Reference

### Writes
* **`create_escrow(provider, title, terms, deadline_timestamp, client_timestamp)`** `[Payable]`  
  Locks native funds (`gl.message.value`) in escrow, registers the contractor address, set terms, and starts the timer.
* **`submit_work(escrow_id, deliverable)`**  
  Allows the provider to submit their deliverable text or links. Sets status to `SUBMITTED`.
* **`approve_work(escrow_id)`**  
  Allows the client to approve work and release 100% of the funds to the provider.
* **`raise_dispute(escrow_id, reason, client_timestamp)`**  
  Locks the escrow and triggers dispute mode, recording the claimant's initial claim.
* **`submit_counter_evidence(escrow_id, evidence)`**  
  Allows the other participant to submit their defense and evidence.
* **`arbitrate_dispute(escrow_id, client_timestamp)`**  
  Triggers the AI Tribunal court to evaluate the dispute. Splits and distributes locked funds directly to both wallets.

### Views
* **`get_escrow(escrow_id)`**  
  Returns full JSON representation of an escrow case file.
* **`get_escrows(start, limit)`**  
  Returns paginated list of cases.
* **`get_global_stats()`**  
  Returns total escrow count, active disputes, and resolved cases.

---

## Local Setup & Development

### 1. Contract Testing & Linting
Verify contract code format and constraints using the GenVM SDK:
```bash
# Lint check the contract
genvm-lint check contracts/tribunal.py

# Run local integration test suite
gltest tests/integration/ -v -s
```

### 2. Frontend Local Server
Run the Obsidian Industrial terminal locally:
```bash
# Navigate to workspace
cd frontend

# Install dependencies
npm install

# Start local server
npm run dev
```

---

## Deployment
Deploy the Intelligent Contract to the GenLayer Bradbury Testnet using the CLI:
```bash
genlayer deploy --contract contracts/tribunal.py
```
After deployment, paste your contract address in `frontend/src/lib/contract.ts` to connect the client.
