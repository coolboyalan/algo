import { configDotenv } from "dotenv";
import { str, num, cleanEnv } from "envalid";

configDotenv();

const env = cleanEnv(process.env, {
  KEY: str(),
  KITE_SECRET: str(),
  KITE_ACCESS_TOKEN: str(),
  DB_URI: str(),
  UPSTOX_KEY: str(),
  UPSTOX_SECRET: str(),
  UPSTOX_REDIRECT_URI: str(),
  UPSTOX_ACCESS_TOKEN: str(),
  ANGEL_CLIENT: str(),
  ANGEL_PASS: str(),
  ANGEL_SECRET: str(),
  ANGEL_KEY: str(),
  ANGEL_ACCESS_TOKEN: str(),
});

export default env;
