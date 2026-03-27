import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  host: string;
  nodeEnv: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 8000,
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;
