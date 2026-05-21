const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const { connectDatabase } = require("./database/connection");
const { apiRouter } = require("./routes");
const { apiRateLimit } = require("./middlewares/rateLimit");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const rootDir = path.resolve(__dirname, "..");
const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.appOrigin, credentials: true }));
app.use(morgan(env.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use("/api", apiRateLimit, apiRouter);

app.get("/", (_req, res) => res.sendFile(path.join(rootDir, "index.html")));
app.get("/styles.css", (_req, res) => res.sendFile(path.join(rootDir, "styles.css")));
app.get("/app.js", (_req, res) => res.sendFile(path.join(rootDir, "app.js")));

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`Daryez Smart Point listo en http://localhost:${env.port}`);
    console.log(`API disponible en http://localhost:${env.port}/api/health`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("No se pudo iniciar Daryez Smart Point", error);
    process.exit(1);
  });
}

module.exports = { app, start };
