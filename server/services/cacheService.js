import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.init();
  }

  init() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.log('💡 Redis caching not configured - running without cache');
        this.isConnected = false;
      });

    } catch (error) {
      console.log('💡 Redis caching not configured - running without cache');
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    if (!this.isConnected) return false;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clearAll() {
    if (!this.isConnected) return false;
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  async getStats() {
    if (!this.isConnected) {
      return { connected: false, message: 'Redis not configured' };
    }
    
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      return {
        connected: true,
        keyCount,
        memory: info.split('\n').find(line => line.startsWith('used_memory_human'))?.split(':')[1]?.trim()
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // Cache wrapper for database queries
  async cached(key, fetchFunction, ttl = 300) {
    const cached = await this.get(key);
    if (cached) return cached;

    const data = await fetchFunction();
    await this.set(key, data, ttl);
    return data;
  }

  // Statistics caching
  async cacheStatistics(data) {
    await this.set('admin_statistics', data, 60); // 1 minute TTL
  }

  async getCachedStatistics() {
    return await this.get('admin_statistics');
  }

  // Search results caching
  async cacheSearchResults(query, filters, results) {
    const key = `search:${JSON.stringify({ query, filters })}`;
    await this.set(key, results, 120); // 2 minutes TTL
  }

  async getCachedSearchResults(query, filters) {
    const key = `search:${JSON.stringify({ query, filters })}`;
    return await this.get(key);
  }
}

export default new CacheService();