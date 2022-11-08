import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const constant = ['/api/login', '/api/register', '/api/logout'];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (constant.indexOf(req.path) !== -1 || req.path.includes("/api/public")) return next();
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