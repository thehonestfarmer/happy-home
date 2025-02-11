import puppeteer from "puppeteer";
import fs from "fs/promises"; // If using ES modules

function sleep(ms: number): Promise<void> {
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

export async function scrapeListingPage(listingUrl: string) {
  const startTime = Date.now();
  console.log(`\n🔍 Starting to scrape: ${listingUrl}`);
  
  try {
    console.log('📱 Launching browser...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set a reasonable timeout
    page.setDefaultNavigationTimeout(30000); // 30 seconds

    // Navigate to the page
    console.log('🌐 Navigating to page...');
    await page.goto(listingUrl, { waitUntil: "networkidle0" });
    console.log('✅ Page loaded successfully');

    // Scrape images
    console.log('📸 Scraping listing images...');
    const listingImages = await page.$$eval(".slick-track", (elements) => {
      const images = elements
        .map((el) => {
          const list = el.querySelectorAll("li > a > img") ?? [];
          return Array.from(list).map((li) => li.src);
        })
        .flat();
      return images;
    });
    console.log(`Found ${listingImages.length} images`);

    // Scrape recommended text
    console.log('📝 Scraping recommended text...');
    const recommendedText = await page.$$eval(
      "section.detail_txt.recommend_txt p",
      (items) =>
        items
          .map((el) => el.textContent.trim())
          .flat(),
    );
    
    const formattedRecommendedText = recommendedText[0]
      .split("\n")
      .join("")
      .split("★")
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`Found ${formattedRecommendedText.length} recommended text items`);

    // Check if sold
    console.log('🏷️ Checking sold status...');
    const isDetailSoldPresent = await page
      .$eval(
        "div.detail_sold",
        () => true,
      )
      .catch(() => false);
    console.log(`Sold status: ${isDetailSoldPresent ? 'SOLD' : 'Available'}`);

    // Clean up
    await browser.close();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Scraping completed in ${duration}s`);

    return {
      listingImages,
      recommendedText: formattedRecommendedText,
      isDetailSoldPresent,
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ Scraping failed after ${duration}s:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return error;
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

