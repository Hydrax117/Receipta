import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();

// In-memory store for demo - replace with database in production
const merchants = new Map<string, { id: string; email: string; passwordHash: string; publicKey: string }>();

// POST /api/auth/register - Merchant registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, publicKey } = req.body;

    if (!email || !password || !publicKey) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, password, and Stellar public key are required',
        },
      });
    }

    if (merchants.has(email)) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const merchantId = `merchant_${Date.now()}`;

    merchants.set(email, {
      id: merchantId,
      email,
      passwordHash,
      publicKey,
    });

    const token = jwt.sign(
      { merchantId, email, publicKey },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      merchant: {
        id: merchantId,
        email,
        publicKey,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register merchant',
      },
    });
  }
});

// POST /api/auth/login - Merchant login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email and password are required',
        },
      });
    }

    const merchant = merchants.get(email);

    if (!merchant) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const isValid = await bcrypt.compare(password, merchant.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const token = jwt.sign(
      { merchantId: merchant.id, email: merchant.email, publicKey: merchant.publicKey },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      merchant: {
        id: merchant.id,
        email: merchant.email,
        publicKey: merchant.publicKey,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to login',
      },
    });
  }
});

export default router;
