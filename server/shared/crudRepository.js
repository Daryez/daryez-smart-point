const { getDatabase } = require("../database/connection");

function createRepository(table, fields) {
  return {
    list(tenantId, limit = 100, offset = 0) {
      return getDatabase().many(`SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [tenantId, limit, offset]);
    },
    findById(tenantId, id) {
      return getDatabase().one(`SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`, [tenantId, id]);
    },
    create(tenantId, input) {
      const allowed = fields.filter((field) => Object.prototype.hasOwnProperty.call(input, field));
      const columns = ["tenant_id", ...allowed];
      const values = [tenantId, ...allowed.map((field) => input[field])];
      const placeholders = columns.map(() => "?").join(", ");
      const result = getDatabase().query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`, values);
      return this.findById(tenantId, result.lastInsertRowid || result.rows?.[0]?.id);
    },
    update(tenantId, id, input) {
      const allowed = fields.filter((field) => Object.prototype.hasOwnProperty.call(input, field));
      if (!allowed.length) return this.findById(tenantId, id);
      const assignments = allowed.map((field) => `${field} = ?`).join(", ");
      const values = [...allowed.map((field) => input[field]), tenantId, id];
      getDatabase().query(`UPDATE ${table} SET ${assignments} WHERE tenant_id = ? AND id = ?`, values);
      return this.findById(tenantId, id);
    }
  };
}

module.exports = { createRepository };
