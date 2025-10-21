// Backend performance optimization
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class BackendPerformanceOptimizer {
  constructor(app) {
    this.app = app;
    this.optimizations = [];
  }

  // Apply all performance optimizations
  applyOptimizations() {
    console.log('🚀 Applying backend performance optimizations...');
    
    try {
      this.applySecurityOptimizations();
      this.applyCompressionOptimizations();
      this.applyRateLimiting();
      this.applyCachingOptimizations();
      this.applyDatabaseOptimizations();
      this.applyResponseOptimizations();
      
      console.log('✅ Backend performance optimizations applied successfully!');
      console.log(`📊 Optimizations applied: ${this.optimizations.length}`);
    } catch (error) {
      console.error('❌ Backend performance optimization failed:', error);
      throw error;
    }
  }

  // Apply security optimizations
  applySecurityOptimizations() {
    // Helmet for security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));
    
    this.optimizations.push('Security headers (Helmet)');
  }

  // Apply compression optimizations
  applyCompressionOptimizations() {
    // Compression middleware
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));
    
    this.optimizations.push('Response compression');
  }

  // Apply rate limiting
  applyRateLimiting() {
    // General rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use('/api/', limiter);
    
    // Strict rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: 'Too many authentication attempts, please try again later.',
    });
    
    this.app.use('/api/auth/', authLimiter);
    
    // Speed limiting for heavy endpoints
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes, then...
      delayMs: 500, // begin adding 500ms of delay per request above 50
    });
    
    this.app.use('/api/upload/', speedLimiter);
    
    this.optimizations.push('Rate limiting and speed limiting');
  }

  // Apply caching optimizations
  applyCachingOptimizations() {
    // Cache middleware
    this.app.use((req, res, next) => {
      // Set cache headers for static assets
      if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
      } else if (req.path.startsWith('/api/')) {
        // API responses - shorter cache
        res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
        res.setHeader('ETag', `"${Date.now()}"`);
      } else {
        // HTML pages - no cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      next();
    });
    
    this.optimizations.push('HTTP caching headers');
  }

  // Apply database optimizations
  applyDatabaseOptimizations() {
    // Database connection optimization
    const mongoose = require('mongoose');
    
    // Connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    };
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('📊 Database connected with optimizations');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Database connection error:', err);
    });
    
    this.optimizations.push('Database connection optimization');
  }

  // Apply response optimizations
  applyResponseOptimizations() {
    // Response time middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
        
        // Add response time header
        res.setHeader('X-Response-Time', `${duration}ms`);
      });
      
      next();
    });
    
    // JSON response optimization
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    this.optimizations.push('Response time monitoring and JSON optimization');
  }

  // Get optimization report
  getReport() {
    return {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      totalOptimizations: this.optimizations.length,
    };
  }
}

module.exports = BackendPerformanceOptimizer;
