import express from "express";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();
const routesDir = __dirname;

/**
 * Read all route files in the routes directory, dynamically import and use them.
 *
 * @return {Promise<void>} No return value
 */

const loadRoutes = async () => {
  const files = fs.readdirSync(routesDir);

  for (let file of files) {
    if (file.endsWith(".route.js") && file != "index.route.js") {
      const routePath = join(routesDir, file);
      const routeUrl = pathToFileURL(routePath).href;
      const route = (await import(routeUrl)).default;
      file = file.replace(".route.js", "");
      let endpoint = "";
      for (const ele of file) {
        if (ele.toUpperCase() === ele && ele !== ".") endpoint += "-";
        endpoint += ele;
      }
      router.use(`/${endpoint}`, route);
    }
  }
};

await loadRoutes();

export default router;
