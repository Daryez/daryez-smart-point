const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

let db;

function toPostgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function connectDatabase() {
  if (db) return db;

  if (env.dbClient === "postgres") {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: env.databaseUrl });
    const run = async (sql, params = []) => {
      const normalized = /^\s*insert\s+/i.test(sql) && !/\sreturning\s+/i.test(sql) ? `${sql} RETURNING id` : sql;
      const result = await pool.query(toPostgresSql(normalized), params);
      return { ...result, lastInsertRowid: result.rows?.[0]?.id };
    };
    db = {
      client: "postgres",
      query: run,
      one: async (sql, params = []) => (await pool.query(toPostgresSql(sql), params)).rows[0] || null,
      many: async (sql, params = []) => (await pool.query(toPostgresSql(sql), params)).rows
    };
    return db;
  }

  const sqlitePath = path.resolve(process.cwd(), env.sqlitePath);
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(sqlitePath) ? fs.readFileSync(sqlitePath) : null;
  const sqlite = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  sqlite.run("PRAGMA foreign_keys = ON");

  const persist = () => {
    fs.writeFileSync(sqlitePath, Buffer.from(sqlite.export()));
  };

  const selectOne = (sql, params = []) => {
    const rows = selectMany(sql, params);
    return rows[0] || null;
  };

  const selectMany = (sql, params = []) => {
    const statement = sqlite.prepare(sql);
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    statement.free();
    return rows;
  };

  const run = (sql, params = []) => {
    sqlite.run(sql, params);
    const lastInsert = selectOne("SELECT last_insert_rowid() AS id");
    persist();
    return { lastInsertRowid: lastInsert?.id };
  };

  db = {
    client: "sqlite",
    query: run,
    one: selectOne,
    many: selectMany,
    exec: (sql) => {
      sqlite.exec(sql);
      persist();
    }
  };
  return db;
}

function getDatabase() {
  if (!db) throw new Error("Base de datos no inicializada.");
  return db;
}

module.exports = { connectDatabase, getDatabase };
