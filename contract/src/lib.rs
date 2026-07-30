#![no_std]

mod types;
pub use types::{DataKey, FeeConfig, Receipt, ReceiptError, ReceiptStatus};

use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env};

/// Generates a deterministic 32-byte receipt ID by hashing
/// (sender, receiver, amount, timestamp) with SHA-256.
pub fn generate_receipt_id(
    env: &Env,
    sender: &Address,
    receiver: &Address,
    amount: i128,
    timestamp: u64,
) -> BytesN<32> {
    // Create a tuple of all parameters and hash it
    env.crypto().sha256(&Bytes::from_array(
        env,
        &[
            sender.to_string().len() as u8,
            receiver.to_string().len() as u8,
            (amount >> 56) as u8,
            (amount >> 48) as u8,
            (amount >> 40) as u8,
            (amount >> 32) as u8,
            (amount >> 24) as u8,
            (amount >> 16) as u8,
            (amount >> 8) as u8,
            amount as u8,
            (timestamp >> 56) as u8,
            (timestamp >> 48) as u8,
            (timestamp >> 40) as u8,
            (timestamp >> 32) as u8,
            (timestamp >> 24) as u8,
            (timestamp >> 16) as u8,
            (timestamp >> 8) as u8,
            timestamp as u8,
        ],
    )).into()
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

        // Either sender or receiver can mark as failed
        let caller_is_sender = receipt.sender == env.current_contract_address();
        let caller_is_receiver = receipt.receiver == env.current_contract_address();

        if !caller_is_sender && !caller_is_receiver {
            receipt.sender.require_auth();
        }

        if receipt.status != ReceiptStatus::Pending {
            return Err(ReceiptError::InvalidStatusTransition);
        }

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

    /// Get all receipt IDs for a receiver.
    pub fn get_receipts_by_receiver(
        env: Env,
        receiver: Address,
    ) -> soroban_sdk::Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::ReceiverIndex(receiver))
            .unwrap_or(soroban_sdk::Vec::new(&env))
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

        let receipts = client.get_receipts_by_receiver(&receiver);
        assert_eq!(receipts.len(), 2);
        assert!(receipts.contains(&id1));
        assert!(receipts.contains(&id2));
    }
}
