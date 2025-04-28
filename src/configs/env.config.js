import { configDotenv } from "dotenv";
import { str, num, cleanEnv } from "envalid";

configDotenv();

const env = cleanEnv(process.env, {
  KEY: str(),
  SECRET: str(),
  ACCESS_TOKEN: str(),
  DB_URI: str(),
});

export default env;
