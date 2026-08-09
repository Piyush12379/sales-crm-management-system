import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

// TypeScript ka chota sa rule: Hume Express ko batana padega ki Request ke andar 'user' bhi aa sakta hai
export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
    // 1. Client se 'Authorization' header maangna
    const authHeader = req.header('Authorization');
    
    // Agar header hi nahi hai, toh wahi se reject kar do
    if (!authHeader) {
        return res.status(401).json({ error: 'Access Denied: Aapke paas token nahi hai!' });
    }

    // Token generally "Bearer <token>" ke format me aata hai, isliye hume sirf token wala hissa chahiye
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access Denied: Token format galat hai!' });
    }

    try {
        // 2. Token ko verify karna ki woh asli hai ya nakli
        const verified = jwt.verify(token, JWT_SECRET);
        
        // 3. Asli hai toh user ka data request me save karke API ko aage badhne (next) dena
        req.user = verified;
        next(); 
    } catch (error) {
        return res.status(403).json({ error: 'Invalid ya Expired Token' });
    }
};