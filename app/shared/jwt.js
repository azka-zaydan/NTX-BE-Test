const jwt = require("jsonwebtoken");
const auth = require("../config/auth");
exports.generateToken = (user) => {
	const payload = {
		id: user.id,
		digits: user.digits,
		role: user.positionTitle,
	};

	return jwt.sign(payload, auth.secret, { expiresIn: "1h" });
};

exports.verifyToken = (token) => {
	try {
		return jwt.verify(token, auth.secret);
	} catch (error) {
		throw new Error("Invalid token");
	}
};
