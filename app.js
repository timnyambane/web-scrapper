const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

// Connect to the SQLite database
const db = new sqlite3.Database("database.db");

// Create the 'users' table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// Serve the static files from the 'public' folder
app.use(express.static("public"));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));

// Register Route
app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/public/register.html");
});

// Login Route
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/login.html");
});

// Handle the registration form submission
app.post("/register", (req, res) => {
	const { name, email, password } = req.body;

	// Insert the user data into the 'users' table
	db.run(
		"INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
		[name, email, password],
		(err) => {
			if (err) {
				// Handle any database error
				res.send("Error occurred during registration.");
			} else {
				res.redirect("/");
			}
		}
	);
});

// Handle the login form submission
app.post("/login", (req, res) => {
	const { email, password } = req.body;

	// Check if the user exists in the database
	db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
		if (err) {
			// Handle any database error
			res.send("Error occurred during login.");
		} else if (!row) {
			// User not found
			res.send("User not found.");
		} else if (row.password !== password) {
			// Incorrect password
			res.send("Invalid email or password.");
		} else {
			// Set loggedIn property in the session to indicate successful login
			res.redirect("/home");
		}
	});
});

const baseURLs = {
	theguardian: "https://www.theguardian.com",
	theindependent: "https://www.independent.co.uk",
};

//Home Route
app.get("/home", (req, res) => {
	const homeHTML = fs.readFileSync("public/home.html", "utf8");
	res.send(homeHTML);
});

app.get("/scrape", async (req, res) => {
	const website = req.query.website;

	if (website !== "theguardian" && website !== "theindependent") {
		res.status(400).send("Invalid website selected.");
		return;
	}

	try {
		const response = await axios.get(baseURLs[website]);
		const $ = cheerio.load(response.data);
		const articles = [];

		// Select the elements containing the article headlines
		let headlineSelector;
		if (website === "theguardian") {
			headlineSelector = ".fc-item__title";
		} else if (website === "theindependent") {
			headlineSelector = ".article-default";
		}

		// Extract the headlines and push them to the articles array
		$(headlineSelector).each((index, element) => {
			articles.push($(element).text().trim());
		});

		// Create a CSV string from the articles array
		const csvData = articles.join("\n");

		// Generate the file name with the current date and time
		const now = new Date();
		const formattedDate = now.toISOString().replace(/:/g, "-").slice(0, -5); // Example: 2023-05-31T12-30-00
		const fileName = `articles/${website}_${formattedDate}.csv`;

		// Save the CSV file
		fs.writeFileSync(fileName, csvData);

		const message = `File has been created successfully.`;
		res.send(message);
		console.log(message);
	} catch (error) {
		console.error("An error occurred while scraping the website:", error);
		res.status(500).send("An error occurred while scraping the website.");
	}
});

app.listen(port, () => {
	console.log(`Web scraper app listening at http://localhost:${port}`);
});
