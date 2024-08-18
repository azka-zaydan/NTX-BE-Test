const redis = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const client = redis.createClient({
	database: Number(process.env.CACHE_REDIS_DB),
	socket: {
		host: process.env.CACHE_REDIS_HOST,
		port: Number(process.env.CACHE_REDIS_PORT),
	},
});
client.connect();

exports.redisClient = () => {
	return client;
};
