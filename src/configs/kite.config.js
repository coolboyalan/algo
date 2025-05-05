
import { KiteConnect } from "kiteconnect";
import env from "#configs/env";

const kite = new KiteConnect({
  api_key: env.KEY || "",
});

kite.setAccessToken(env.KITE_ACCESS_TOKEN);

export default kite;
