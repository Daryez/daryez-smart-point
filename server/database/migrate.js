const fs = require("fs");
const path = require("path");
const { connectDatabase, getDatabase } = require("./connection");

async function migrate() {
  await connectDatabase();
  const db = getDatabase();
  const migrationPath = path.join(__dirname, "migrations", "001_initial.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  if (db.client === "postgres") {
    const statements = sql.split("-- statement").map((item) => item.trim()).filter(Boolean);
    for (const statement of statements) {
      await db.query(statement.replaceAll("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY"));
    }
    return;
  }

  db.exec(sql);
}

if (require.main === module) {
  migrate()
    .then(() => console.log("Migraciones aplicadas correctamente."))
    .catch((error) => {
      console.error("Error aplicando migraciones", error);
      process.exit(1);
    });
}

module.exports = { migrate };
