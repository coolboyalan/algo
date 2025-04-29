import { configDotenv } from "dotenv";
import { str, num, cleanEnv } from "envalid";

configDotenv();

const env = cleanEnv(process.env, {
  KEY: str(),
  SECRET: str(),
  ACCESS_TOKEN: str(),
  DB_URI: str(),
  UPSTOX_KEY: str(),
  UPSTOX_SECRET: str(),
  UPSTOX_REDIRECT_URI: str(),
  UPSTOX_ACCESS_TOKEN: str(),
});

export default env;
