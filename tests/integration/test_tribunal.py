from gltest import get_contract_factory, create_account
from gltest.assertions import tx_execution_succeeded
import json

def test_escrow_tribunal_arbitration():
    # Deploy Tribunal contract
    factory = get_contract_factory("Tribunal")
    contract = factory.deploy(args=[])
    
    # Create test accounts for client and provider
    client = create_account()
    provider = create_account()
    
    # 1. Create an Escrow with native tokens locked
    deadline = 1720000000
    now = 1719990000
    
    rc = contract.connect(client).create_escrow(
        args=[
            provider.address,
            "Logo Design & Brand Identity Guidelines",
            "Provider must design a clean vector logo and 10-page brand guidelines document in PDF format.",
            deadline,
            now
        ],
        value=1000000000000000000 # 1 GEN
    ).transact()
    
    assert tx_execution_succeeded(rc)
    
    # Retrieve escrow details to confirm active state
    escrow = contract.get_escrow(args=["escrow-0"]).call()
    assert escrow["id"] == "escrow-0"
    assert escrow["status"] == "ACTIVE"
    assert escrow["client"] == client.address.as_hex
    assert escrow["provider"] == provider.address.as_hex
    assert escrow["amount"] == "1000000000000000000"
    
    # 2. Provider submits the deliverable
    rc_submit = contract.connect(provider).submit_work(
        args=[
            "escrow-0",
            "Here is the final deliverable link: https://example.com/logo-files.zip. The guidelines are on page 4."
        ]
    ).transact()
    
    assert tx_execution_succeeded(rc_submit)
    
    escrow_sub = contract.get_escrow(args=["escrow-0"]).call()
    assert escrow_sub["status"] == "SUBMITTED"
    assert escrow_sub["deliverable"] != ""
    
    # 3. Client raises a dispute (e.g. deliverable is empty or doesn't meet specs)
    disputed_time = now + 1000
    rc_dispute = contract.connect(client).raise_dispute(
        args=[
            "escrow-0",
            "The zip link is broken and does not contain the brand guidelines PDF at all. Only a single draft logo is provided.",
            disputed_time
        ]
    ).transact()
    
    assert tx_execution_succeeded(rc_dispute)
    
    escrow_disp = contract.get_escrow(args=["escrow-0"]).call()
    assert escrow_disp["status"] == "DISPUTED"
    assert escrow_disp["client_evidence"] != ""
    
    # 4. Provider submits counter-evidence
    rc_counter = contract.connect(provider).submit_counter_evidence(
        args=[
            "escrow-0",
            "I checked the link, it works. The guidelines are in the second folder of the archive. Here is a direct backup link: https://example.com/backup-guidelines.pdf"
        ]
    ).transact()
    
    assert tx_execution_succeeded(rc_counter)
    
    escrow_counter = contract.get_escrow(args=["escrow-0"]).call()
    assert escrow_counter["provider_evidence"] != ""
    
    # 5. Convene court (arbitrate dispute)
    arbitrated_time = now + 2000
    rc_arb = contract.arbitrate_dispute(
        args=["escrow-0", arbitrated_time]
    ).transact()
    assert tx_execution_succeeded(rc_arb)
    
    escrow_final = contract.get_escrow(args=["escrow-0"]).call()
    assert escrow_final["status"] in ("COMPLETED", "REFUNDED", "SPLIT")
    assert "verdict" in escrow_final["resolution"]
    assert 0 <= int(escrow_final["resolution"]["provider_percent"]) <= 100
    
    print("arbitration complete. Verdict:", escrow_final["resolution"]["verdict"])
    print("Provider percent payout:", escrow_final["resolution"]["provider_percent"])
    
    # 6. Check global stats
    stats = contract.get_global_stats(args=[]).call()
    assert int(stats["total_escrows"]) == 1
    assert int(stats["resolved_disputes"]) == 1
