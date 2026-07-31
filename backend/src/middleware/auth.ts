import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  merchant?: {
    merchantId: string;
    email: string;
    publicKey: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Read the JWT from the HttpOnly cookie set by /api/auth/login or /api/auth/register
  const token: string | undefined = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token required',
      },
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret) as {
      merchantId: string;
      email: string;
      publicKey: string;
    };

    req.merchant = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
};
