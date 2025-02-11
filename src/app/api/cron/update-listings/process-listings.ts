import puppeteer from "puppeteer";
import fs from "fs/promises"; // If using ES modules

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSerially(tasks) {
  const results = [];
  for (const task of tasks) {
    const result = await task(); // Wait for each task to complete
    results.push(result); // Collect the result
  }
  return results;
}

async function scrapeListingPage(listingUrl) {
  try {
    console.log("loading ...", listingUrl);
    const browser = await puppeteer.launch({ headless: true }); // Set to false if you want to see the browser
    const page = await browser.newPage();

    // Navigate to the page
    await page.goto(listingUrl, { waitUntil: "networkidle0" }); // Ensure the page is fully loaded
    console.log("loaded ...", listingUrl);

    const listingImages = await page.$$eval(".slick-track", (elements) =>
      elements
        .map((el) => {
          const list = el.querySelectorAll("li > a > img") ?? [];
          return Array.from(list).map((li) => {
            return li.src;
          });
        })
        .flat(),
    );

    const recommendedText = await page.$$eval(
      "section.detail_txt.recommend_txt p",
      (items) =>
        items
          .map((el) => {
            return el.textContent.trim();
          })
          .flat(),
    );
    const isDetailSoldPresent = await page
      .$eval(
        "div.detail_sold",
        () => true, // If the element is found, return true
      )
      .catch(() => false);

    return {
      listingImages,
      recommendedText: recommendedText[0]
        .split("\n")
        .join("")
        .split("★")
        .map((s) => s.trim()),
      isDetailSoldPresent,
    };
  } catch (e) {
    console.error(e);
    return e;
  }
}

async function writeListingDataToJson(result, id) {
  const fileContents = await fs.readFile("./listings.json", "utf8");
  const data = JSON.parse(fileContents);

  data.newListings[String(id)].listingImages = result.listingImages;
  data.newListings[String(id)].recommendedText = result.recommendedText.filter(
    (i) => i,
  );
  data.newListings[String(id)].isDetailSoldPresent = result.isDetailSoldPresent;

  const newData = JSON.stringify(data, null, 2);
  await fs.writeFile("./listings.json", newData, "utf8", (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("JSON file has been saved.");
    }
  });
}

async function init(index = 0) {
  const fileContents = await fs.readFile("./output.json", "utf8");
  const data = JSON.parse(fileContents);

  let details = data.listingDetail;
  for (let i = index; i < details.length; i++) {
    try {
      const result = await scrapeListingPage(details[i]);
      console.log(result, "<<<");
      await writeListingDataToJson(result, i);
      await fs.writeFile("./idx", String(i), "utf8", (err) => {
        if (err) {
          console.error("Error writing to file", err);
          throw new Error("fs write error");
        } else {
          console.log("JSON file has been saved.");
        }
      });
      console.log("wrote", "<<<");
    } catch (e) {
      break;
    }
  }
  console.log("finish");
  return;
}

init(0);
