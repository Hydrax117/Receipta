import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// In-memory store for demo
const paymentLinks = new Map<string, {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  description: string;
  receiverAddress: string;
  createdAt: number;
  expiresAt: number;
}>();

// POST /api/payment-links - Create payment link (authenticated)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amount, currency, description, receiverAddress } = req.body;

    if (!amount || !currency || !receiverAddress) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Amount, currency, and receiver address are required',
        },
      });
    }

    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();
    const expiresAt = createdAt + (24 * 60 * 60 * 1000); // 24 hours

    const paymentLink = {
      id: linkId,
      merchantId: req.merchant!.merchantId,
      amount,
      currency,
      description: description || '',
      receiverAddress,
      createdAt,
      expiresAt,
    };

    paymentLinks.set(linkId, paymentLink);

    res.status(201).json({
      paymentLink: {
        ...paymentLink,
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${linkId}`,
      },
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      error: {
        code: 'LINK_CREATION_FAILED',
        message: 'Failed to create payment link',
      },
    });
  }
});

// GET /api/payment-links/:id - Get payment link details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const link = paymentLinks.get(id);

    if (!link) {
      return res.status(404).json({
        error: {
          code: 'LINK_NOT_FOUND',
          message: 'Payment link not found',
        },
      });
    }

    if (Date.now() > link.expiresAt) {
      return res.status(410).json({
        error: {
          code: 'LINK_EXPIRED',
          message: 'Payment link has expired',
        },
      });
    }

    res.json({ paymentLink: link });
  } catch (error) {
    console.error('Error fetching payment link:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payment link',
      },
    });
  }
});

export default router;
