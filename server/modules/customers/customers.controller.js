const { createRepository } = require("../../shared/crudRepository");
const { createController } = require("../../shared/crudController");

const repository = createRepository("customers", ["name", "phone", "email", "document", "address"]);
module.exports = createController("customers", repository);
