const { createRepository } = require("../../shared/crudRepository");
const { createController } = require("../../shared/crudController");

const repository = createRepository("suppliers", ["name", "phone", "email", "document", "address"]);
module.exports = createController("suppliers", repository);
