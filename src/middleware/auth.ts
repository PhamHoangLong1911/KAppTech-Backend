import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';

// Extend Request interface to include user
interface AuthRequest extends Request {
  user?: IUser;
}

// Protect routes - require authentication
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Debug logging
    console.log('Auth Debug - Headers:', req.headers.authorization);
    console.log('Auth Debug - Token:', token ? 'Token exists' : 'No token');

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Debug logging
      console.log('Auth Debug - JWT_SECRET exists:', !!process.env.JWT_SECRET);
      console.log('Auth Debug - Token length:', token.length);
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
      console.log('Auth Debug - Token decoded successfully, user ID:', decoded.id);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      console.log('Auth Debug - User found:', !!user);
      
      if (!user) {
        console.log('Auth Debug - User not found in database');
        return res.status(401).json({
          success: false,
          message: 'Token is not valid'
        });
      }

      if (!user.isActive) {
        console.log('Auth Debug - User account deactivated');
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated'
        });
      }

      req.user = user;
      console.log('Auth Debug - Successfully authenticated user:', user.email);
      next();
    } catch (error) {
      console.log('Auth Debug - JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user?.role || 'unknown'} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional auth - get user if token exists but don't require it
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};
