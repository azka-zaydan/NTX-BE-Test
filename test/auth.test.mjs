import { use, expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import supertest from "supertest";
import express from "express";
import jwtHelper, { generateToken } from "../app/shared/jwt.js"; // Adjust path as necessary
import { jwtMiddleware, roleMiddleware } from "../app/middleware/index.js"; // Adjust path as necessary

use(sinonChai);

describe("Middleware - JWT Authentication and Role-Based Access Control", () => {
	let app;
	let request;

	before(() => {
		app = express();
		app.use(express.json());

		// Protected route that requires authentication
		app.get("/api/protected", jwtMiddleware.jwtMiddlewareFunc, (req, res) => {
			res.status(200).send({ message: "Access granted to protected route." });
		});

		// be-only route that requires both authentication and "be" role
		app.get(
			"/api/admin",
			jwtMiddleware.jwtMiddlewareFunc,
			roleMiddleware.roleMiddlewareFunc("be"),
			(req, res) => {
				res.status(200).send({ message: "Access granted to admin route." });
			}
		);

		request = supertest(app);
	});

	afterEach(() => {
		sinon.restore();
	});

	it("should deny access if no token is provided", async () => {
		const res = await request.get("/api/protected");

		expect(res.status).to.equal(401);
		expect(res.body).to.have.property(
			"message",
			"Access denied. No token provided."
		);
	});

	it("should deny access if an invalid token is provided", async () => {
		sinon.stub(jwtHelper, "verifyToken").throws(new Error("Invalid token"));

		const res = await request
			.get("/api/protected")
			.set("Authorization", "Bearer invalidToken");

		expect(res.status).to.equal(400);
		expect(res.body).to.have.property("message", "Invalid token.");
	});

	it("should grant access with a valid token", async () => {
		const user = { id: 1, digits: "VALID_DIGITS", positionTitle: "user" };
		const token = generateToken(user);

		const res = await request
			.get("/api/protected")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).to.equal(200);
		expect(res.body).to.have.property(
			"message",
			"Access granted to protected route."
		);
	});

	it("should deny access to an admin-only route if the user is not an admin", async () => {
		const user = { id: 1, digits: "VALID_DIGITS", positionTitle: "user" };
		const token = generateToken(user);

		const res = await request
			.get("/api/admin")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).to.equal(403);
		expect(res.body).to.have.property(
			"message",
			"Access denied. You do not have the required role."
		);
	});

	it("should grant access to an admin-only route if the user is an admin", async () => {
		const user = { id: 1, digits: "VALID_DIGITS", positionTitle: "be" };
		const token = generateToken(user);

		const res = await request
			.get("/api/admin")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).to.equal(200);
		expect(res.body).to.have.property(
			"message",
			"Access granted to admin route."
		);
	});
});
