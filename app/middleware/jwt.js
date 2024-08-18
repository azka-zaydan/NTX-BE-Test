const jwt = require("../shared/jwt");

const jwtMiddlewareFunc = (req, res, next) => {
	const token = req.header("Authorization")?.replace("Bearer ", "");

	if (!token) {
		return res.status(401).send({
			success: false,
			statusCode: 401,
			message: "Access denied. No token provided.",
		});
	}

	try {
		const decoded = jwt.verifyToken(token);
		req.user = decoded;
		next();
	} catch (error) {
		res.status(400).send({
			success: false,
			statusCode: 400,
			message: "Invalid token.",
		});
	}
};

const jwtMiddleware = {
	jwtMiddlewareFunc,
};

module.exports = jwtMiddleware;
