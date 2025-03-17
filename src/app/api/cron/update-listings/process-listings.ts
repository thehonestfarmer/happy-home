import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Task<T> = () => Promise<T>;

async function runSerially<T>(tasks: Task<T>[]): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    const result = await task();
    results.push(result);
  }
  return results;
}

interface ScrapedData {
  listingImages: string[];
  recommendedText: string[];
  isDetailSoldPresent: boolean;
}

interface ListingsData {
  newListings: {
    [key: string]: {
      listingImages: string[];
      recommendedText: string[];
      isDetailSoldPresent: boolean;
    };
  };
}

export async function scrapeListingPage(listingUrl: string): Promise<ScrapedData | Error> {
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
          const list = el.querySelectorAll("li > a > img");
          return Array.from(list).map((li) => (li as HTMLImageElement).src);
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
          .map((el) => el.textContent?.trim() || "")
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
    return error as Error;
  }
}

async function ensureFileExists(filePath: string, defaultContent: any = {}): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
    console.log(`Created new file: ${filePath}`);
  }
}

async function writeListingDataToJson(result: ScrapedData, id: number | string): Promise<void> {
  const listingsPath = path.join(process.cwd(), "listings.json");
  
  // Ensure listings.json exists
  await ensureFileExists(listingsPath, { newListings: {} });
  
  // Read and update data
  const fileContents = await fs.readFile(listingsPath, "utf8");
  const data = JSON.parse(fileContents) as ListingsData;

  if (!data.newListings) {
    data.newListings = {};
  }

  data.newListings[String(id)] = {
    listingImages: result.listingImages,
    recommendedText: result.recommendedText.filter(Boolean),
    isDetailSoldPresent: result.isDetailSoldPresent
  };

  // Write back to file
  await fs.writeFile(listingsPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Updated listings.json with data for ID: ${id}`);
}

async function init(index = 0): Promise<void> {
  const outputPath = path.join(process.cwd(), "output.json");
  
  // Ensure output.json exists
  await ensureFileExists(outputPath, { listingDetail: [] });
  
  try {
    const fileContents = await fs.readFile(outputPath, "utf8");
    const data = JSON.parse(fileContents) as { listingDetail: string[] };

    if (!Array.isArray(data.listingDetail)) {
      throw new Error("Invalid output.json format: listingDetail must be an array");
    }

    const details = data.listingDetail;
    for (let i = index; i < details.length; i++) {
      try {
        const result = await scrapeListingPage(details[i]);
        if (result instanceof Error) {
          console.error(`Failed to scrape listing ${i}:`, result);
          continue;
        }
        
        await writeListingDataToJson(result, i);
        await fs.writeFile(path.join(process.cwd(), "idx"), String(i), "utf8");
        console.log(`Processed listing ${i} successfully`);
        
        // Add a small delay between requests to be polite
        await sleep(1000);
      } catch (e) {
        console.error(`Error processing listing ${i}:`, e);
        break;
      }
    }
    console.log("✅ Scraping process completed");
  } catch (e) {
    console.error("Failed to initialize scraping:", e);
    process.exit(1);
  }
}

// If this file is run directly (not imported as a module)
if (require.main === module) {
  init().catch(console.error);
}

