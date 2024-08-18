exampleMiddlewareFunction = (req, res, next) => {
	next();
};

const verify = {
	exampleMiddlewareFunction: exampleMiddlewareFunction,
};

module.exports = verify;
