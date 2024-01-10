import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import dotenv from "dotenv";
import fs from "fs/promises";

const instagramURL = "https://www.instagram.com/accounts/login/";
const config = JSON.parse(await fs.readFile("../config/config.json"));

dotenv.config({
	path: "../config/.env",
});

function resetAtMidnight() {
	console.log("\x1b[32mPosting again on 12:00PM\x1b[0m");
	const now = new Date();
	const night = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
		0,
		0,
		0
	);
	const msToMidnight = night.getTime() - now.getTime();

	setTimeout(() => {
		post();
		resetAtMidnight();
	}, msToMidnight);
}

function delay(timeout) {
	return new Promise((resolve) => setTimeout(resolve, timeout));
}

async function post() {
	puppeteer.use(StealthPlugin());
	const browser = await puppeteer.launch({
		userDataDir: "../config/user_data",
		headless: "new",
	});

	const page = await browser.newPage();

	await page.goto(instagramURL);
	const currentPage = await page.evaluate(() => document.location.href);

	config.post++;
	if (config.post > 37) config.post = 1;
	config.day++;

	console.log(config.day, config.post);

	if (currentPage === instagramURL) {
		console.log("\x1b[31mAccount logged out, logging back in...\x1b[0m");

		await page.goto("https://www.instagram.com/accounts/login/");

		await page.waitForSelector(
			'[aria-label="Phone number, username, or email"]'
		);

		await page.type(
			'[aria-label="Phone number, username, or email"]',
			process.env.name
		);
		await page.type('[aria-label="Password"]', process.env.password);
		await page.click('[type="submit"]');

		await page.waitForNavigation({
			waitUntil: "networkidle0",
		});
		console.log("\x1b[32mLogged in!\x1b[0m");
	}

	await delay(config.dealyMS);

	try {
		await page.waitForXPath("//button[contains(text(),'Not Now')]", {
			visible: true,
			timeout: 10000,
		});
		const notNow = await page.$x("//button[contains(text(),'Not Now')]");
		console.log("\x1b[32mClicking Not Now button\x1b[0m");
		await notNow[0].click();
	} catch (err) {
		console.log("\x1b[33mNot Now button doesn't exist\x1b[0m");
	}

	page.waitForSelector('svg[aria-label="New post"]');
	page.click('svg[aria-label="New post"]');

	console.log("\x1b[32mWaiting for the file inputs\x1b[0m");

	await page.waitForSelector("input[type='file']");

	const fileInputs = await page.$$('input[type="file"]');
	const input = fileInputs[fileInputs.length - 1];

	try {
		await fileChooser.accept([`../posts/${config.post}.mp4`]);
		await delay(config.dealyMS);
	} catch (err) {
		console.log("\x1b[33mCould not use file picker\x1b[0m");
		try {
			await page.click("[aria-label='New Post']");
		} catch (err) {
			console.log("\x1b[33mError caught\x1b[0m");
		}
	}
	await input.uploadFile(`../posts/${config.post}.mp4`);

	await delay(config.dealyMS);

	try {
		await page.waitForXPath("//button[contains(text(),'OK')]", {
			visible: true,
			timeout: 10000,
		});
		const ok = await page.$x("//button[contains(text(),'OK')]");
		console.log("\x1b[32mClicking OK button\x1b[0m");
		await ok[0].click();
	} catch (err) {
		console.log("\x1b[33mOK button doesn't exist\x1b[0m");
	}

	await delay(config.delayMS);

	console.log("\x1b[32mClicking next button\x1b[0m");

	let next = await page.$x("//div[contains(text(),'Next')]");
	await next[0].click();

	await delay(config.dealyMS);

	console.log("\x1b[32mClicking next button\x1b[0m");

	next = await page.$x("//div[contains(text(),'Next')]");
	await next[0].click();

	console.log("\x1b[32mWriting caption\x1b[0m");

	await page.click('div[aria-label="Write a caption..."]');
	await page.keyboard.type(`Day ${config.day}`, { delay: 25 });

	console.log("\x1b[32mClicking share\x1b[0m");

	const share = await page.$x("//div[contains(text(),'Share')]");
	await share[0].click();

	console.log("\x1b[32mPosting...\x1b[0m");

	try {
		await page.waitForXPath(
			"//span[contains(text(), 'Your reel has been shared.')]",
			{ visible: true, timeout: 1800000 }
		);

		console.log("\x1b[32mSaving config changes...\x1b[0m");
		await fs.writeFile(
			"../config/config.json",
			JSON.stringify(config),
			"utf8"
		);

		console.log("\x1b[32mAll done!\x1b[0m");
	} catch (err) {
		console.log(`\x1b[31mError caught: ${err}\x1b[0m`);
		resetAtMidnight();
	}

	browser.close();

	resetAtMidnight();
}

console.clear();
resetAtMidnight();
