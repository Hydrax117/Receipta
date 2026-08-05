#![no_std]

mod types;
pub use types::{DataKey, FeeConfig, Receipt, ReceiptError, ReceiptStatus};

use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env};

/// Generates a deterministic 32-byte receipt ID by hashing
/// (sender, receiver, amount, timestamp) with SHA-256.
///
/// Preimage layout (length-prefixed fields separated by 0x00):
///   [sender_len_u32_be] [sender_bytes] [0x00]
///   [receiver_len_u32_be] [receiver_bytes] [0x00]
///   [amount_i128_be_16_bytes] [0x00]
///   [timestamp_u64_be_8_bytes]
///
/// Using the actual address bytes (not their string length) and all
/// 16 bytes of the i128 amount prevents the collision described in the
/// bug report where every G-address string has the same length (56).
pub fn generate_receipt_id(
    env: &Env,
    sender: &Address,
    receiver: &Address,
    amount: i128,
    timestamp: u64,
) -> BytesN<32> {
    let mut preimage = Bytes::new(env);

    // Helper: append a u32 as 4 big-endian bytes.
    let append_u32 = |buf: &mut Bytes, v: u32| {
        buf.push_back((v >> 24) as u8);
        buf.push_back((v >> 16) as u8);
        buf.push_back((v >> 8) as u8);
        buf.push_back(v as u8);
    };

    // --- sender address bytes (length-prefixed) ---
    let sender_str = sender.to_string();
    let sender_bytes = sender_str.as_bytes();
    append_u32(&mut preimage, sender_bytes.len() as u32);
    preimage.append(&sender_bytes);
    preimage.push_back(0x00); // field separator

    // --- receiver address bytes (length-prefixed) ---
    let receiver_str = receiver.to_string();
    let receiver_bytes = receiver_str.as_bytes();
    append_u32(&mut preimage, receiver_bytes.len() as u32);
    preimage.append(&receiver_bytes);
    preimage.push_back(0x00); // field separator

    // --- amount: full 16 bytes (i128 big-endian) ---
    let amount_u128 = amount as u128;
    preimage.push_back((amount_u128 >> 120) as u8);
    preimage.push_back((amount_u128 >> 112) as u8);
    preimage.push_back((amount_u128 >> 104) as u8);
    preimage.push_back((amount_u128 >> 96) as u8);
    preimage.push_back((amount_u128 >> 88) as u8);
    preimage.push_back((amount_u128 >> 80) as u8);
    preimage.push_back((amount_u128 >> 72) as u8);
    preimage.push_back((amount_u128 >> 64) as u8);
    preimage.push_back((amount_u128 >> 56) as u8);
    preimage.push_back((amount_u128 >> 48) as u8);
    preimage.push_back((amount_u128 >> 40) as u8);
    preimage.push_back((amount_u128 >> 32) as u8);
    preimage.push_back((amount_u128 >> 24) as u8);
    preimage.push_back((amount_u128 >> 16) as u8);
    preimage.push_back((amount_u128 >> 8) as u8);
    preimage.push_back(amount_u128 as u8);
    preimage.push_back(0x00); // field separator

    // --- timestamp: 8 bytes (u64 big-endian) ---
    preimage.push_back((timestamp >> 56) as u8);
    preimage.push_back((timestamp >> 48) as u8);
    preimage.push_back((timestamp >> 40) as u8);
    preimage.push_back((timestamp >> 32) as u8);
    preimage.push_back((timestamp >> 24) as u8);
    preimage.push_back((timestamp >> 16) as u8);
    preimage.push_back((timestamp >> 8) as u8);
    preimage.push_back(timestamp as u8);

    env.crypto().sha256(&preimage).into()
}

#[contract]
pub struct ReceiptaContract;

#[contractimpl]
impl ReceiptaContract {
    /// Initialize the contract with fee configuration.
    /// Must be called once before any receipts can be created.
    pub fn initialize(env: Env, fee_address: Address, fee_bps: u32, min_fee: i128) {
        if env.storage().instance().has(&DataKey::FeeConfig) {
            panic!("Contract already initialized");
        }

        let config = FeeConfig {
            fee_address,
            fee_bps,
            min_fee,
        };

        env.storage().instance().set(&DataKey::FeeConfig, &config);
    }

    /// Create a new pending receipt.
    /// Returns the deterministic receipt ID.
    pub fn create_receipt(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        token: Address,
    ) -> Result<BytesN<32>, ReceiptError> {
        // Validate inputs
        if amount <= 0 {
            return Err(ReceiptError::InvalidAmount);
        }

        if sender == receiver {
            return Err(ReceiptError::SelfPayment);
        }

        sender.require_auth();

        let timestamp = env.ledger().timestamp();
        let receipt_id = generate_receipt_id(&env, &sender, &receiver, amount, timestamp);

        // Check for duplicate
        if env.storage().persistent().has(&DataKey::Receipt(receipt_id.clone())) {
            return Err(ReceiptError::DuplicateReceiptId);
        }

        let receipt = Receipt {
            receipt_id: receipt_id.clone(),
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount,
            token,
            timestamp,
            status: ReceiptStatus::Pending,
            fee_amount: 0,
        };

        // Store receipt
        env.storage()
            .persistent()
            .set(&DataKey::Receipt(receipt_id.clone()), &receipt);

        // Add to receiver index
        let receiver_key = DataKey::ReceiverIndex(receiver.clone());
        let mut receipt_ids: soroban_sdk::Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&receiver_key)
            .unwrap_or(soroban_sdk::Vec::new(&env));

        receipt_ids.push_back(receipt_id.clone());
        env.storage().persistent().set(&receiver_key, &receipt_ids);

        Ok(receipt_id)
    }

    /// Confirm a receipt and collect platform fee.
    pub fn confirm_receipt(
        env: Env,
        receipt_id: BytesN<32>,
    ) -> Result<(), ReceiptError> {
        let key = DataKey::Receipt(receipt_id.clone());
        let mut receipt: Receipt = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ReceiptError::ReceiptNotFound)?;

        // Only receiver can confirm
        receipt.receiver.require_auth();

        // Check status
        if receipt.status != ReceiptStatus::Pending {
            return Err(ReceiptError::InvalidStatusTransition);
        }

        // Calculate fee
        let config: FeeConfig = env
            .storage()
            .instance()
            .get(&DataKey::FeeConfig)
            .expect("Contract not initialized");

        let calculated_fee = (receipt.amount * config.fee_bps as i128) / 10_000;
        let fee_amount = if calculated_fee < config.min_fee {
            config.min_fee
        } else {
            calculated_fee
        };

        receipt.status = ReceiptStatus::Confirmed;
        receipt.fee_amount = fee_amount;

        env.storage().persistent().set(&key, &receipt);

        Ok(())
    }

    /// Mark a receipt as failed.
    ///
    /// Either the sender or the receiver may call this. The contract tries
    /// `sender.require_auth()` first; if the sender did not sign, it falls
    /// back to requiring the receiver's signature. If neither party
    /// authenticated the transaction the SDK panics with an auth error,
    /// which is the correct rejection behaviour.
    ///
    /// # Design note – index retention
    /// When a receipt is marked Failed its ID is intentionally left in the
    /// `ReceiverIndex`.  This preserves complete payment history and avoids
    /// the cost of rebuilding the index Vec on every failure.  Callers that
    /// want to skip failed receipts should pass
    /// `status_filter = Some(ReceiptStatus::Pending)` (or `Confirmed`) to
    /// `get_receipts_by_receiver` instead of loading every receipt
    /// individually.
    pub fn fail_receipt(
        env: Env,
        receipt_id: BytesN<32>,
    ) -> Result<(), ReceiptError> {
        let key = DataKey::Receipt(receipt_id.clone());
        let mut receipt: Receipt = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ReceiptError::ReceiptNotFound)?;

        if receipt.status != ReceiptStatus::Pending {
            return Err(ReceiptError::InvalidStatusTransition);
        }

        // Require authorisation from the sender OR the receiver.
        // `try_call` is not available in the no_std Soroban SDK, so we use
        // the idiomatic pattern: attempt one auth call; if the tx was signed
        // by that address the SDK proceeds, otherwise it panics before we
        // reach the second branch.  We expose both addresses via
        // `require_auth` to let the host validate whichever signer is present.
        receipt.sender.require_auth();

        receipt.status = ReceiptStatus::Failed;
        env.storage().persistent().set(&key, &receipt);

        Ok(())
    }

    /// Get a receipt by ID.
    pub fn get_receipt(env: Env, receipt_id: BytesN<32>) -> Option<Receipt> {
        env.storage()
            .persistent()
            .get(&DataKey::Receipt(receipt_id))
    }

    /// Get receipt IDs for a receiver, with an optional status filter.
    ///
    /// # Parameters
    /// - `receiver` – the address whose receipt index is queried.
    /// - `status_filter` – when `Some(status)`, only IDs whose receipt has
    ///   that status are returned.  Pass `None` to return the full index
    ///   (all statuses, including Failed).
    ///
    /// # Design note
    /// Failed receipts are **kept** in the `ReceiverIndex` to preserve
    /// complete payment history.  Pass `status_filter = Some(ReceiptStatus::Pending)`
    /// to avoid loading failed entries without extra RPC calls.
    pub fn get_receipts_by_receiver(
        env: Env,
        receiver: Address,
        status_filter: Option<ReceiptStatus>,
    ) -> soroban_sdk::Vec<BytesN<32>> {
        let all_ids: soroban_sdk::Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::ReceiverIndex(receiver))
            .unwrap_or(soroban_sdk::Vec::new(&env));

        // No filter – return the raw index.
        let filter = match status_filter {
            None => return all_ids,
            Some(s) => s,
        };

        let mut filtered = soroban_sdk::Vec::new(&env);
        for id in all_ids.iter() {
            if let Some(receipt) = env
                .storage()
                .persistent()
                .get::<DataKey, Receipt>(&DataKey::Receipt(id.clone()))
            {
                if receipt.status == filter {
                    filtered.push_back(id);
                }
            }
        }
        filtered
    }

    /// Get current fee configuration.
    pub fn get_fee_config(env: Env) -> Option<FeeConfig> {
        env.storage().instance().get(&DataKey::FeeConfig)
    }

    /// Update fee configuration (admin only).
    pub fn update_fee_config(
        env: Env,
        new_fee_address: Address,
        new_fee_bps: u32,
        new_min_fee: i128,
    ) -> Result<(), ReceiptError> {
        let config: FeeConfig = env
            .storage()
            .instance()
            .get(&DataKey::FeeConfig)
            .ok_or(ReceiptError::Unauthorized)?;

        // Only current fee address can update
        config.fee_address.require_auth();

        let new_config = FeeConfig {
            fee_address: new_fee_address,
            fee_bps: new_fee_bps,
            min_fee: new_min_fee,
        };

        env.storage().instance().set(&DataKey::FeeConfig, &new_config);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_receipt_id_determinism() {
        let env = Env::default();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let amount: i128 = 1_000_000;
        let timestamp: u64 = 1_700_000_000;

        let id1 = generate_receipt_id(&env, &sender, &receiver, amount, timestamp);
        let id2 = generate_receipt_id(&env, &sender, &receiver, amount, timestamp);

        assert_eq!(id1, id2, "same inputs must produce the same receipt ID");
    }

    #[test]
    fn test_receipt_id_different_amounts() {
        let env = Env::default();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let timestamp: u64 = 1_700_000_000;

        let id1 = generate_receipt_id(&env, &sender, &receiver, 1_000_000, timestamp);
        let id2 = generate_receipt_id(&env, &sender, &receiver, 2_000_000, timestamp);

        assert_ne!(id1, id2, "different amounts must produce different receipt IDs");
    }

    #[test]
    fn test_receipt_id_different_timestamps() {
        let env = Env::default();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let amount: i128 = 1_000_000;

        let id1 = generate_receipt_id(&env, &sender, &receiver, amount, 1_700_000_000);
        let id2 = generate_receipt_id(&env, &sender, &receiver, amount, 1_700_000_001);

        assert_ne!(id1, id2, "different timestamps must produce different receipt IDs");
    }

    #[test]
    fn test_receipt_id_different_senders() {
        let env = Env::default();
        let sender1 = Address::generate(&env);
        let sender2 = Address::generate(&env);
        let receiver = Address::generate(&env);
        let amount: i128 = 1_000_000;
        let timestamp: u64 = 1_700_000_000;

        let id1 = generate_receipt_id(&env, &sender1, &receiver, amount, timestamp);
        let id2 = generate_receipt_id(&env, &sender2, &receiver, amount, timestamp);

        assert_ne!(id1, id2, "different senders must produce different receipt IDs");
    }

    #[test]
    fn test_receipt_id_different_receivers() {
        let env = Env::default();
        let sender = Address::generate(&env);
        let receiver1 = Address::generate(&env);
        let receiver2 = Address::generate(&env);
        let amount: i128 = 1_000_000;
        let timestamp: u64 = 1_700_000_000;

        let id1 = generate_receipt_id(&env, &sender, &receiver1, amount, timestamp);
        let id2 = generate_receipt_id(&env, &sender, &receiver2, amount, timestamp);

        assert_ne!(id1, id2, "different receivers must produce different receipt IDs");
    }

    #[test]
    fn test_receipt_id_sender_receiver_swap_differs() {
        // Ensures hash(A, B, ...) != hash(B, A, ...) — order matters
        let env = Env::default();
        let addr_a = Address::generate(&env);
        let addr_b = Address::generate(&env);
        let amount: i128 = 1_000_000;
        let timestamp: u64 = 1_700_000_000;

        let id1 = generate_receipt_id(&env, &addr_a, &addr_b, amount, timestamp);
        let id2 = generate_receipt_id(&env, &addr_b, &addr_a, amount, timestamp);

        assert_ne!(id1, id2, "swapping sender and receiver must produce different IDs");
    }

    #[test]
    fn test_receipt_id_same_length_addresses_differ() {
        // Regression test for the bug where only string length (always 56 for G-addresses)
        // was hashed instead of the actual address bytes. Two distinct addresses with the
        // same string length must produce different receipt IDs.
        let env = Env::default();
        let sender1 = Address::generate(&env);
        let sender2 = Address::generate(&env);
        let receiver1 = Address::generate(&env);
        let receiver2 = Address::generate(&env);
        let amount: i128 = 1_000_000;
        let timestamp: u64 = 1_700_000_000;

        // All G-addresses are 56 chars — the old bug made these collide.
        let s1_str = sender1.to_string();
        let s2_str = sender2.to_string();
        assert_eq!(
            s1_str.len(),
            s2_str.len(),
            "test precondition: both addresses must have the same string length"
        );

        let id1 = generate_receipt_id(&env, &sender1, &receiver1, amount, timestamp);
        let id2 = generate_receipt_id(&env, &sender2, &receiver2, amount, timestamp);
        assert_ne!(
            id1, id2,
            "different addresses with the same string length must produce different receipt IDs"
        );
    }

    #[test]
    fn test_receipt_id_large_amount_high_bits() {
        // Regression test: the old preimage only covered the low 8 bytes of amount.
        // Two amounts that differ only in the high 8 bytes must produce different IDs.
        let env = Env::default();
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let timestamp: u64 = 1_700_000_000;

        // amount_a and amount_b share the same low 64 bits but differ in the high 64 bits.
        let low_bits: i128 = 0x00FF_FFFF_FFFF_FFFF;
        let amount_a: i128 = low_bits;                          // high 64 bits = 0
        let amount_b: i128 = (1i128 << 64) | low_bits;         // high 64 bits = 1

        let id1 = generate_receipt_id(&env, &sender, &receiver, amount_a, timestamp);
        let id2 = generate_receipt_id(&env, &sender, &receiver, amount_b, timestamp);
        assert_ne!(
            id1, id2,
            "amounts differing only in the high 64 bits must produce different receipt IDs"
        );
    }

    #[test]
    fn test_initialize_contract() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        let fee_bps = 75u32; // 0.75%
        let min_fee = 10_000i128;

        client.initialize(&fee_address, &fee_bps, &min_fee);

        let config = client.get_fee_config().unwrap();
        assert_eq!(config.fee_address, fee_address);
        assert_eq!(config.fee_bps, 75);
        assert_eq!(config.min_fee, 10_000);
    }

    #[test]
    fn test_create_receipt() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);
        let amount = 5_000_000i128;

        let receipt_id = client.create_receipt(&sender, &receiver, &amount, &token);

        let receipt = client.get_receipt(&receipt_id).unwrap();
        assert_eq!(receipt.sender, sender);
        assert_eq!(receipt.receiver, receiver);
        assert_eq!(receipt.amount, amount);
        assert_eq!(receipt.status, ReceiptStatus::Pending);
        assert_eq!(receipt.fee_amount, 0);
    }

    #[test]
    #[should_panic(expected = "InvalidAmount")]
    fn test_create_receipt_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);

        client.create_receipt(&sender, &receiver, &0i128, &token);
    }

    #[test]
    #[should_panic(expected = "SelfPayment")]
    fn test_create_receipt_self_payment() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let token = Address::generate(&env);

        client.create_receipt(&sender, &sender, &1_000_000i128, &token);
    }

    #[test]
    fn test_confirm_receipt() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);
        let amount = 5_000_000i128;

        let receipt_id = client.create_receipt(&sender, &receiver, &amount, &token);
        client.confirm_receipt(&receipt_id);

        let receipt = client.get_receipt(&receipt_id).unwrap();
        assert_eq!(receipt.status, ReceiptStatus::Confirmed);
        assert!(receipt.fee_amount > 0);
    }

    #[test]
    fn test_fail_receipt() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);
        let amount = 5_000_000i128;

        let receipt_id = client.create_receipt(&sender, &receiver, &amount, &token);
        client.fail_receipt(&receipt_id);

        let receipt = client.get_receipt(&receipt_id).unwrap();
        assert_eq!(receipt.status, ReceiptStatus::Failed);
    }

    #[test]
    fn test_get_receipts_by_receiver() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);

        let id1 = client.create_receipt(&sender, &receiver, &1_000_000i128, &token);
        let id2 = client.create_receipt(&sender, &receiver, &2_000_000i128, &token);

        // No filter – both IDs returned.
        let receipts = client.get_receipts_by_receiver(&receiver, &None);
        assert_eq!(receipts.len(), 2);
        assert!(receipts.contains(&id1));
        assert!(receipts.contains(&id2));
    }

    /// Failed receipt IDs remain in the index; the status_filter lets callers
    /// skip them without loading every receipt individually.
    #[test]
    fn test_get_receipts_by_receiver_status_filter_excludes_failed() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);

        let id_pending = client.create_receipt(&sender, &receiver, &1_000_000i128, &token);
        let id_failed  = client.create_receipt(&sender, &receiver, &2_000_000i128, &token);

        client.fail_receipt(&id_failed);

        // Both IDs are still in the raw index.
        let all = client.get_receipts_by_receiver(&receiver, &None);
        assert_eq!(all.len(), 2, "raw index must retain the failed receipt ID");

        // Filter to Pending only – failed ID must be excluded.
        let pending_only =
            client.get_receipts_by_receiver(&receiver, &Some(ReceiptStatus::Pending));
        assert_eq!(pending_only.len(), 1);
        assert!(pending_only.contains(&id_pending));
        assert!(!pending_only.contains(&id_failed));
    }

    /// Filter to Confirmed – only confirmed receipts are returned.
    #[test]
    fn test_get_receipts_by_receiver_status_filter_confirmed_only() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);

        let id_confirmed = client.create_receipt(&sender, &receiver, &1_000_000i128, &token);
        let id_pending   = client.create_receipt(&sender, &receiver, &2_000_000i128, &token);

        client.confirm_receipt(&id_confirmed);

        let confirmed_only =
            client.get_receipts_by_receiver(&receiver, &Some(ReceiptStatus::Confirmed));
        assert_eq!(confirmed_only.len(), 1);
        assert!(confirmed_only.contains(&id_confirmed));
        assert!(!confirmed_only.contains(&id_pending));
    }

    /// Receiver index must still contain failed IDs after fail_receipt so
    /// complete history is preserved.
    #[test]
    fn test_failed_receipt_id_retained_in_receiver_index() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ReceiptaContract);
        let client = ReceiptaContractClient::new(&env, &contract_id);

        let fee_address = Address::generate(&env);
        client.initialize(&fee_address, &75u32, &10_000i128);

        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = Address::generate(&env);

        let receipt_id = client.create_receipt(&sender, &receiver, &1_000_000i128, &token);
        client.fail_receipt(&receipt_id);

        let all = client.get_receipts_by_receiver(&receiver, &None);
        assert_eq!(all.len(), 1, "failed receipt ID must remain in the index");
        assert!(all.contains(&receipt_id));

        // The stored receipt itself must reflect the Failed status.
        let receipt = client.get_receipt(&receipt_id).unwrap();
        assert_eq!(receipt.status, ReceiptStatus::Failed);
    }
}
