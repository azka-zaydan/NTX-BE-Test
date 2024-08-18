const {
	exampleMiddleware,
	jwtMiddleware,
	roleMiddleware,
} = require("../middleware");
const exampleController = require("../controllers/exampleController");

module.exports = (app) => {
	app.use((req, res, next) => {
		res.header(
			"Access-Control-Allow-Headers",
			"x-access-token, Origin, Content-Type, Accept"
		);
		next();
	});

	const router = require("express").Router();

	router.post(
		"/register",
		[exampleMiddleware.exampleMiddlewareFunction],
		exampleController.register
	);

	router.post(
		"/login",
		[exampleMiddleware.exampleMiddlewareFunction],
		exampleController.login
	);

	router.post(
		"/role",
		jwtMiddleware.jwtMiddlewareFunc,
		roleMiddleware.roleMiddlewareFunc("be"),
		(req, res) => {
			res.status(200).send({
				success: true,
				statusCode: 200,
				message: "You have accessed a be-only route!",
			});
		}
	);

	app.use("/api/auth", router);
};
