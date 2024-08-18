// Create a new WebSocket connection to the server
const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8080"); // Replace with your server URL and port

// Event listener for when the connection is opened
ws.onopen = () => {
	console.log("Connected to WebSocket server");
};

// Event listener for receiving messages from the server
ws.onmessage = (event) => {
	try {
		const receivedData = JSON.parse(event.data);
		if (receivedData.success) {
			console.log("Data received from server:", receivedData.data);
		} else {
			console.error("Failed to fetch data:", receivedData.message);
		}
	} catch (err) {
		console.error("Error parsing data:", err);
	}
};

// Event listener for when the connection is closed
ws.onclose = () => {
	console.log("Disconnected from WebSocket server");
};

// Event listener for errors
ws.onerror = (error) => {
	console.error("WebSocket error:", error);
};
