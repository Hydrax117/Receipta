import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Mock data store
const merchantReceipts = new Map<string, Array<{
  id: string;
  amount: string;
  status: string;
  timestamp: number;
}>>();

// GET /api/merchant/receipts - Get merchant's receipts
router.get('/receipts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.merchantId;
    const receipts = merchantReceipts.get(merchantId) || [];

    res.json({ receipts });
  } catch (error) {
    console.error('Error fetching merchant receipts:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch receipts',
      },
    });
  }
});

// GET /api/merchant/stats - Get merchant statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.merchantId;
    const receipts = merchantReceipts.get(merchantId) || [];

    const stats = {
      totalReceipts: receipts.length,
      confirmedReceipts: receipts.filter(r => r.status === 'Confirmed').length,
      pendingReceipts: receipts.filter(r => r.status === 'Pending').length,
      failedReceipts: receipts.filter(r => r.status === 'Failed').length,
      totalVolume: receipts
        .filter(r => r.status === 'Confirmed')
        .reduce((sum, r) => sum + parseFloat(r.amount), 0)
        .toString(),
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching merchant stats:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch statistics',
      },
    });
  }
});

export default router;
