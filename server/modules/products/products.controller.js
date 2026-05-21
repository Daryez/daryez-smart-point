const { createRepository } = require("../../shared/crudRepository");
const { createController } = require("../../shared/crudController");

const repository = createRepository("products", ["sku", "barcode", "name", "description", "price", "cost", "stock", "min_stock", "status"]);
module.exports = createController("products", repository);
