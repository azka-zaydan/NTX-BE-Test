const exampleMiddleware = require("./exampleMiddleware");
const roleMiddleware = require("./role");
const {} = require("../shared/jwt");
const jwtMiddleware = require("./jwt");
module.exports = {
	exampleMiddleware,
	roleMiddleware,
	jwtMiddleware,
};
