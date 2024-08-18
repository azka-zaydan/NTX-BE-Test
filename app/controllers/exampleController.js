const db = require("../models");
const WebSocket = require("ws");
const axios = require("axios");
const jwt = require("../shared/jwt");
const { redisClient } = require("../redis/redis");

exports.refactoreMe1 = (req, res) => {
	// function ini sebenarnya adalah hasil survey dri beberapa pertnayaan, yang mana nilai dri jawaban tsb akan di store pada array seperti yang ada di dataset
	// Mengambil data survey dari tabel "surveys"
	db.sequelize
		.query('SELECT * FROM "surveys"')
		.then(([data]) => {
			// Menghitung rata-rata untuk setiap index (1-10)
			const totalIndex = Array(10)
				.fill(0)
				.map((_, i) => {
					const sum = data.reduce((acc, curr) => acc + curr.values[i], 0);
					return sum / data.length;
				});

			// Mengirimkan hasil dalam response
			res.status(200).send({
				statusCode: 200,
				success: true,
				data: totalIndex,
			});
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send({
				statusCode: 500,
				success: false,
				message: "Failed to get surveys.",
			});
		});
};

exports.refactoreMe2 = (req, res) => {
	// function ini untuk menjalakan query sql insert dan mengupdate field "dosurvey" yang ada di table user menjadi true, jika melihat data yang di berikan, salah satu usernnya memiliki dosurvey dengan data false
	const { userId, values } = req.body;

	// Memasukkan data survey baru ke dalam tabel "surveys"
	db.sequelize
		.query(
			'INSERT INTO "surveys" ("userId", "values", "createdAt", "updatedAt") VALUES (?, ?, NOW(), NOW()) RETURNING *',
			{ replacements: [userId, values] }
		)
		.then(([data]) => {
			// Mengupdate field "dosurvey" di tabel "users"
			db.sequelize
				.query('UPDATE "users" SET "dosurvey" = true WHERE "id" = ?', {
					replacements: [userId],
				})
				.then(() => {
					res.status(201).send({
						statusCode: 201,
						message: "Survey sent successfully!",
						success: true,
						data: data[0],
					});
				})
				.catch((err) => {
					console.error(err);
					res.status(500).send({
						statusCode: 500,
						message: "Failed to update user survey status.",
						success: false,
					});
				});
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send({
				statusCode: 500,
				message: "Cannot post survey.",
				success: false,
			});
		});
};

exports.callmeWebSocket = (server) => {
	const wss = new WebSocket.Server({ server });

	wss.on("connection", (ws) => {
		console.log("Client connected");

		// Fungsi untuk fetch data dari API dan kirim ke client
		const fetchData = async () => {
			axios
				.get("https://livethreatmap.radware.com/api/map/attacks?limit=10")
				.then((res) => {
					const data = res.data;
					for (let index = 0; index < data.length; index++) {
						const attacks = data[index];
						attacks.forEach((attack) => {
							db.sequelize
								.query(
									'INSERT INTO "attacks" ("attackType", "sourceCountry", "destinationCountry", "severity", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, NOW(), NOW())',
									{
										replacements: [
											attack.type,
											attack.sourceCountry,
											attack.destinationCountry,
											attack.weight,
										],
									}
								)
								.then(() => {
									// console.log("Data stored successfully");
								})
								.catch((error) => {
									console.error("Error storing data:", error);
								});
							ws.send(
								JSON.stringify({
									success: true,
									data: attack,
								})
							);
						});
					}
				})
				.catch((err) => {
					console.error("Error fetching data:", err);
					ws.send(
						JSON.stringify({
							success: false,
							message: "Failed to fetch data",
						})
					);
				});
		};

		// Fetch data pertama kali ketika client terkoneksi
		fetchData();

		// Setup interval untuk fetch data setiap 3 menit (180000 ms)
		const intervalId = setInterval(fetchData, 180000);

		// Cleanup interval ketika koneksi terputus
		ws.on("close", () => {
			console.log("Client disconnected");
			clearInterval(intervalId);
		});
	});
};

exports.getData = async (req, res) => {
	try {
		const cachedData = await redisClient().get("attack/count");
		if (cachedData) {
			res.status(200).send({
				success: true,
				statusCode: 200,
				data: JSON.parse(cachedData),
			});
			return;
		}

		// If no cached data, fetch from database
		const [sourceData] = await db.sequelize.query(`
      SELECT
        "sourceCountry" as "country",
        COUNT(*) as "total"
      FROM
        "attacks"
      GROUP BY
        "sourceCountry"
    `);

		const [destinationData] = await db.sequelize.query(`
      SELECT
        "destinationCountry" as "country",
        COUNT(*) as "total"
      FROM
        "attacks"
      GROUP BY
        "destinationCountry"
    `);

		const sourceCountries = sourceData.map((row) => row.country);
		const sourceTotals = sourceData.map((row) => parseInt(row.total, 10));

		const destinationCountries = destinationData.map((row) => row.country);
		const destinationTotals = destinationData.map((row) =>
			parseInt(row.total, 10)
		);

		const allCountries = [
			...new Set([...sourceCountries, ...destinationCountries]),
		];
		const totalCounts = allCountries.map((country) => {
			const sourceIndex = sourceCountries.indexOf(country);
			const destinationIndex = destinationCountries.indexOf(country);

			const sourceTotal = sourceIndex !== -1 ? sourceTotals[sourceIndex] : 0;
			const destinationTotal =
				destinationIndex !== -1 ? destinationTotals[destinationIndex] : 0;

			return sourceTotal + destinationTotal;
		});

		const resultData = {
			label: allCountries,
			total: totalCounts,
		};

		await redisClient().set("attack/count", JSON.stringify(resultData));
		res.status(200).send({
			success: true,
			statusCode: 200,
			data: resultData,
		});
		return;
	} catch (error) {
		res.status(500).send({
			success: false,
			statusCode: 500,
			message: "Failed to retrieve data",
		});
	}
};

exports.register = async (req, res) => {
	const {
		digits,
		fotoUrl,
		workType,
		positionTitle,
		lat,
		lon,
		company,
		fullname,
	} = req.body;

	try {
		// Check if the digits already exist
		const [existingUser] = await db.sequelize.query(
			`SELECT * FROM "users" WHERE digits = ?`,
			{
				replacements: [digits],
				type: db.sequelize.QueryTypes.SELECT,
			}
		);

		if (existingUser) {
			return res.status(400).send({
				success: false,
				statusCode: 400,
				message: "Digits already exist. Please use a different digits value.",
			});
		}

		// Insert the new user into the database with isLogin set to true
		const [newUser] = await db.sequelize.query(
			`INSERT INTO "users" 
      (digits, "fotoUrl", "workType", "positionTitle", lat, lon, company, "isLogin", "createdAt", "updatedAt", dovote, dosurvey, dofeedback, fullname, "cuurentLeave") 
      VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW(), ?, ?, ?, ?, ?) RETURNING *`,
			{
				replacements: [
					digits,
					fotoUrl,
					workType,
					positionTitle,
					lat,
					lon,
					company,
					false, // Default dovote
					false, // Default dosurvey
					false, // Default dofeedback
					fullname,
					0, // Default cuurentLeave
				],
			}
		);

		// Generate JWT token for the new user
		const token = jwt.generateToken(newUser);

		res.status(201).send({
			success: true,
			statusCode: 201,
			message: "User registered and logged in successfully!",
			token,
		});
	} catch (error) {
		console.error("Error during user registration:", error);
		res.status(500).send({
			success: false,
			statusCode: 500,
			message: "User registration failed.",
		});
	}
};

exports.login = async (req, res) => {
	const { digits } = req.body;

	try {
		// Fetch the user by digits
		const [user] = await db.sequelize.query(
			`SELECT * FROM "users" WHERE digits = ?`,
			{
				replacements: [digits],
				type: db.sequelize.QueryTypes.SELECT,
			}
		);

		if (!user) {
			return res.status(401).send({
				success: false,
				statusCode: 401,
				message: "Invalid digits.",
			});
		}

		// Update the user's isLogin status to true
		await db.sequelize.query(
			`UPDATE "users" SET "isLogin" = true WHERE "id" = ?`,
			{
				replacements: [user.id],
			}
		);

		// Generate JWT token using the helper function
		const token = jwt.generateToken(user);

		res.status(200).send({
			success: true,
			statusCode: 200,
			message: "Login successful!",
			token,
		});
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).send({
			success: false,
			statusCode: 500,
			message: "Login failed.",
		});
	}
};
