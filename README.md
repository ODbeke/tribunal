# ⚖️ Tribunal: Decentralized AI Escrow Arbitration Court

Tribunal is an intelligent escrow and dispute-resolution court built on **GenLayer**. Unlike traditional smart contracts that can only verify deterministic, arithmetic logic, Tribunal extends on-chain agreements with **natural language reasoning**. 

Two parties (a Client and a Provider) can lock funds in escrow under a plain-text agreement, submit deliverables, and resolve subjective disputes under the consensus of an **AI validator jury**.

---

## 🔗 Deployed References & Links

*    **Live Frontend Application:** [https://tribunal-seven.vercel.app/](https://tribunal-seven.vercel.app/)
*    **Intelligent Contract Address:** [`0x7D412D77f1f7d9f94279663172F69f83A1D60Ee0`](https://explorer-bradbury.genlayer.com/address/0x7D412D77f1f7d9f94279663172F69f83A1D60Ee0)
*    **GenLayer Bradbury Explorer:** [Explorer](https://explorer-bradbury.genlayer.com)

---

## 💡 The Core Problem & GenLayer's Solution

### The Trust Deficit in Freelance Escrows
Traditional Web3 escrows are binary: either the client approves the work and releases the funds, or the contractor is left unpaid. If a dispute arises over the *quality* or *completeness* of the work, traditional smart contracts are powerless to judge. They require centralized human arbitration panels (like Kleros), which are slow, expensive, and introduce coordination hazards.

### The GenLayer Superpower
Tribunal leverages GenLayer’s **GenVM** to evaluate natural language terms directly inside the smart contract state transitions.
*   **Decentralized AI Jury:** Multiple consensus validators execute non-deterministic LLM prompts to analyze the agreement terms, deliverables, and evidence.
*   **Algorithmic Resolution:** The contract automatically splits and routes funds directly based on the jury's verdict (`PAYOUT`, `REFUND`, or `SPLIT`), removing centralized human intermediaries.

---

## 🔒 Consensus Safety & Smart Contract Solutions

Building on GenLayer requires defending against consensus divergence and malicious validator exploits. Tribunal implements several enterprise-grade safety patterns:

### 1. The Clock-Sync Hazard Resolution
In standard distributed networks, calling system-time functions (e.g., `datetime.now()` or `time.time()`) inside transactions creates a consensus hazard. Because validators process transactions at slightly different physical times, their clock readings will differ, causing diverging state hashes and failed transactions.
> **Solution:** Tribunal eliminates on-chain clock checks. All timestamps (`created_at`, `deadline`, `disputed_at`, and `resolved_at`) are passed as explicit arguments signed by the transaction sender.

### 2. Guarding against the "Shape-Only" Equivalence Loophole
In GenLayer's optimistic democracy, validator equivalence tests check if nodes agree on the execution results. If a validator only checks the numerical payout percentage, a malicious leader could write arbitrary garbage or malicious prompts inside the text-based reasoning fields.
> **Solution:** Tribunal's `leader_fn` and `validator_fn` enforce strict logical constraints:
> * A `PAYOUT` verdict strictly forces the provider payout to `100%`.
> * A `REFUND` verdict strictly forces the provider payout to `0%`.
> * A `SPLIT` verdict restricts the payout between `1%` and `99%` (falling back to a clean `50/50` split if bounds are violated).
> * Validators check equivalence on subjective splits using a strict **10% numerical tolerance window**.

### 3. Defensive Error Isolation
Consensus can stall if a validator node throws unhandled formatting or JSON parsing exceptions during LLM evaluation.
> **Solution:** The contract wraps all parsing routines in defensive try-except blocks. If a leader node outputs malformed data, the validator catches it cleanly and returns `False` (voting against the proposal) rather than crashing the validator node.

### 4. Client-Side Revert & Collision Prevention
* **Self-Escrow Protection:** The frontend modal intercepts wallet addresses, blocking a client from appointing their own connected address as the provider, which would revert the contract.
* **Consensus Execution Status:** GenLayer transactions that fail execution during the leader's run (reverted due to custom validations) still reach a consensus status of `ACCEPTED`. The frontend parses `txExecutionResult === 2` (`FINISHED_WITH_ERROR`) to intercept on-chain reverts and display real-time warning alerts.

---

## 🔄 State Machine Workflow

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
                       | CONVENE COURT| (Consensus LLM Evaluation)
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

## 🛠️ Method Reference & API

### Public Writes (Signed Transactions)
*   **`create_escrow(provider: str, title: str, terms: str, deadline_timestamp: u256, client_timestamp: u256)`** `[Payable]`
    Locks the client's native GEN tokens (`gl.message.value`), registers the contractor, and starts the dispute countdown.
*   **`submit_work(escrow_id: str, deliverable: str)`**
    Allows the provider to submit links or descriptions of completed work. Status transitions to `SUBMITTED`.
*   **`approve_work(escrow_id: str)`**
    Allows the client to approve work and release 100% of locked funds directly to the provider.
*   **`raise_dispute(escrow_id: str, reason: str, client_timestamp: u256)`**
    Triggers dispute mode, locking the contract state and logging the claimant's arguments.
*   **`submit_counter_evidence(escrow_id: str, evidence: str)`**
    Allows the defending party to log their rebuttal and counter-evidence in the case file.
*   **`arbitrate_dispute(escrow_id: str, client_timestamp: u256)`**
    Executes GenVM AI consensus arbitration. Splits and distributes locked funds directly to both wallets based on the verdict.

### Public Views (Read Only)
*   **`get_escrow(escrow_id: str) -> dict`**
    Returns the complete case file metadata.
*   **`get_escrows(start: u256, limit: u256) -> list`**
    Paginated retrieve of global escrows descending from newest to oldest.
*   **`get_global_stats() -> dict`**
    Returns total escrow count, active disputes, and resolved cases.

---

## 🚀 Payout Finalization Mechanics

In GenLayer's architecture, value transfers to Externally Owned Accounts (EOAs) are routed as **asynchronous EVM child messages**:
```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

# Emits the native GEN transfer to the recipient's EOA
_Recipient(Address(recipient)).emit_transfer(value=amount)
```
When a client approves work or the court arbitrates a case:
1. The transaction execution is validated and marked **`ACCEPTED`**.
2. The transfer is queued with `"onAcceptance": false`.
3. The native tokens are delivered to the recipient's wallet once the transaction moves to **`FINALIZED`** status (typically **~30 minutes** on the Bradbury Testnet, once the optimistic appeal window closes).

---

## 💻 Local Setup & Development

### 1. Contract Testing & Linting
Verify contract code format, gas usage, and constraints using the GenLayer CLI:
```bash
# Check syntax and contract compliance
genlayer-lint check contracts/tribunal.py

# Run local integration test suite
gltest tests/integration/ -v -s
```

### 2. Frontend Development Server
Start the Next.js visual dashboard locally:
```bash
# Install dependencies
cd frontend
npm install

# Run hot-reloading development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📦 Deployment

Deploy the Intelligent Contract to the GenLayer Bradbury Testnet:
```bash
genlayer deploy --contract contracts/tribunal.py
```
To connect the frontend, update `CONTRACT_ADDRESS` inside [contract.ts](file:///Users/okoyes/Downloads/GenLayer%20Proposals/tribunal/frontend/src/lib/contract.ts#L6-L7) with your deployed address.

---
Created for the GenLayer Developer Ecosystem. Built with ⚖️ by the Tribunal team.
