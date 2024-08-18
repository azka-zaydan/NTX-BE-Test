const roleMiddlewareFunc = (requiredRole) => {
	return (req, res, next) => {
		const userRole = req.user?.role;

		if (!userRole || userRole !== requiredRole) {
			return res.status(403).send({
				success: false,
				statusCode: 403,
				message: "Access denied. You do not have the required role.",
			});
		}

		next();
	};
};

const roleMiddleware = {
	roleMiddlewareFunc,
};

module.exports = roleMiddleware;
