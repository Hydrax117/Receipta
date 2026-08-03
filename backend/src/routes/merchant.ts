import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ---------------------------------------------------------------------------
// Shared in-memory receipt store
//
// Exported so POST /api/receipts can write into it when a receipt is created.
// Key: merchantId  Value: array of receipt records (newest-first after push+reverse)
// ---------------------------------------------------------------------------

export interface MerchantReceipt {
  id: string;
  amount: string;
  currency: string;
  status: 'Pending' | 'Confirmed' | 'Failed';
  sender: string;
  receiver: string;
  timestamp: number;
}

export const merchantReceipts = new Map<string, MerchantReceipt[]>();

// ---------------------------------------------------------------------------
// GET /api/merchant/receipts
// Query params: ?page=1&limit=20  (both optional, defaults shown)
// ---------------------------------------------------------------------------

router.get('/receipts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.merchantId;
    const all = merchantReceipts.get(merchantId) ?? [];

    // --- Pagination ----------------------------------------------------------
    const page  = Math.max(1, parseInt((req.query.page  as string) ?? '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10) || 20));
    const total  = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start  = (page - 1) * limit;
    const receipts = all.slice(start, start + limit);

    res.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching merchant receipts:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch receipts' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/merchant/stats
// ---------------------------------------------------------------------------

router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.merchantId;
    const receipts = merchantReceipts.get(merchantId) ?? [];

    const confirmedReceipts = receipts.filter(r => r.status === 'Confirmed');

    const stats = {
      totalReceipts:     receipts.length,
      confirmedReceipts: confirmedReceipts.length,
      pendingReceipts:   receipts.filter(r => r.status === 'Pending').length,
      failedReceipts:    receipts.filter(r => r.status === 'Failed').length,
      totalVolume:       confirmedReceipts
        .reduce((sum, r) => sum + parseFloat(r.amount), 0)
        .toString(),
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching merchant stats:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch statistics' },
    });
  }
});

export default router;
