import { Router } from 'express';
import { StellarClient } from '../stellar/client';

const router = Router();

const stellarClient = new StellarClient(
  process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  process.env.CONTRACT_ID || '',
  'testnet'
);

// GET /api/receipts/:id - Public receipt lookup
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 64) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RECEIPT_ID',
          message: 'Receipt ID must be a 64-character hex string',
        },
      });
    }

    const receipt = await stellarClient.getReceipt(id);

    if (!receipt) {
      return res.status(404).json({
        error: {
          code: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found',
        },
      });
    }

    res.json({ receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch receipt',
      },
    });
  }
});

export default router;
