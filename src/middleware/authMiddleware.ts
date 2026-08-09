import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

// 1. Token Verify karne ka Guard
export const verifyToken = (req: any, res: Response, next: NextFunction): any => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access Denied. Token missing.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or Expired Token' });
    }
};

// 2. Roles check karne ka Guard (Yahan 'export' lagana zaroori hai)
export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction): any => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access Denied. Sirf ${allowedRoles.join(', ')} isey access kar sakte hain.` });
        }
        next();
    };
};