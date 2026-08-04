import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';

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
    // getConfig() returns the validated config — JWT_SECRET is guaranteed
    // non-empty and ≥32 chars; no fallback to a hardcoded string.
    const { jwtSecret } = getConfig();
    const decoded = jwt.verify(token, jwtSecret) as {
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
