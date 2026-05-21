function getValue(context, path) {
  return path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : ""), context);
}

function renderString(value, context) {
  return String(value).replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const resolved = getValue(context, key);
    return Array.isArray(resolved) ? resolved.join("\n") : String(resolved ?? "");
  });
}

function renderTemplate(template, context) {
  if (typeof template === "string") return renderString(template, context);
  if (Array.isArray(template)) return template.map((item) => renderTemplate(item, context));
  if (template && typeof template === "object") {
    return Object.fromEntries(Object.entries(template).map(([key, value]) => [key, renderTemplate(value, context)]));
  }
  return template;
}

function detectPlaceholders(text) {
  return [...String(text || "").matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]);
}

function importExcelTemplate(buffer) {
  const xlsx = require("xlsx");
  const workbook = xlsx.read(buffer, { type: "buffer", cellStyles: true });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return {
      name: sheetName,
      rows: xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: "" })
    };
  });
  return { kind: "excel", sheets, placeholders: detectPlaceholders(JSON.stringify(sheets)) };
}

function buildPreviewContext() {
  return {
    empresa: "Daryez Smart Point",
    cliente: "Cliente de ejemplo",
    fecha: new Date().toLocaleDateString("es-DO"),
    productos: ["2 x Cafe Premium - 300.00", "1 x Azucar - 75.00"],
    subtotal: "375.00",
    itbis: "67.50",
    total: "442.50",
    metodo_pago: "Efectivo",
    telefono: "809-000-0000",
    direccion: "Direccion del negocio"
  };
}

module.exports = { buildPreviewContext, detectPlaceholders, importExcelTemplate, renderTemplate };
