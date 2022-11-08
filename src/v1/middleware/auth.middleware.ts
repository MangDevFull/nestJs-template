import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.path.includes(`/api/${process.env.VERSION}/public`) || req.path.includes(`/api/${process.env.VERSION}/auth`)) return next();
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (user) next();
  } catch (error) {
    console.log(error);
    if (error.expiredAt) {
      delete error.expiredAt;
      error.message = "Token timeout";
    }
    res.json({ code: 401, message: error.message, error });
  }
};