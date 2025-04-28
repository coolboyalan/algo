import Candle from "#models/candle";
import Service from "#services/base";

class CandleService extends Service {
  static Model = Candle;
}

export default CandleService;
