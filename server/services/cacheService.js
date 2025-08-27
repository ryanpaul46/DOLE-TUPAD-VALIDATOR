import redis from 'redis';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Only initialize Redis if it's available
      if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
        this.client = redis.createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (err) => {
          console.warn('⚠️ Redis connection error - caching disabled:', err.message);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('✅ Redis cache connected');
          this.isConnected = true;
        });

        await this.client.connect();
      } else {
        console.log('💡 Redis caching not configured - running without cache');
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed - caching disabled:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Get cached value
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set cached value with TTL (time to live in seconds)
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Check if a name exists in cache (for duplicate detection)
   */
  async isDuplicate(name) {
    const cacheKey = `duplicate:${name.toLowerCase().trim()}`;
    return await this.get(cacheKey);
  }

  /**
   * Cache duplicate status
   */
  async cacheDuplicate(name, isDuplicate, record = null) {
    const cacheKey = `duplicate:${name.toLowerCase().trim()}`;
    await this.set(cacheKey, { isDuplicate, record }, 1800); // 30 minutes
  }

  /**
   * Cache database lookup map
   */
  async cacheNameLookup(nameMap) {
    const cacheKey = 'name_lookup_map';
    await this.set(cacheKey, Array.from(nameMap.entries()), 1800);
  }

  /**
   * Get cached name lookup map
   */
  async getCachedNameLookup() {
    const cacheKey = 'name_lookup_map';
    const cached = await this.get(cacheKey);
    return cached ? new Map(cached) : null;
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.client) {
      return { connected: false, error: 'Redis not connected' };
    }

    try {
      const info = await this.client.info('memory');
      return {
        connected: this.isConnected,
        info: info
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new CacheService();