import Redis from 'ioredis';
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error('Redis connection URL is not set in environment variables.');
}

console.log('Redis connected');

export const redis = new Redis(redisUrl);
