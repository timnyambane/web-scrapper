const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const app = express();
const port = 3000;

const baseURLs = {
	theguardian: "https://www.theguardian.com",
	theindependent: "https://www.independent.co.uk",
};

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
