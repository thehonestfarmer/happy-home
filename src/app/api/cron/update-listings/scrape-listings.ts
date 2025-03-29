import * as puppeteer from 'puppeteer';
import translate from "translate";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { readListings } from './listings-manager';

// Helper function to generate a unique ID
function generateUniqueId(): string {
  return uuidv4();
}

// Local type definition for the listings data structure used in this file
interface ListingData {
  id?: string;
  address?: string; // Add address field for translated addresses
  tags: string;
  listingDetail: string;
  price: number;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingDetailUrl: string;
  buildDate: string;
  isSold: boolean;
  original: {
    address: string;
    tags: string;
    listingDetail: string;
    price: string;
    layout: string;
    buildDate: string;
    facilities?: {
      water: string | null;
      gas: string | null;
      sewage: string | null;
      greyWater: string | null;
    };
    schools?: {
      primary: string | null;
      juniorHigh: string | null;
    };
    dates?: {
      datePosted: string | null;
      dateRenovated: string | null;
    };
  };
}

type ListingsData = Record<string, ListingData>;

interface ScrapedResult {
  addresses: string[];
  tags: string[];
  listingDetail: string[];
  prices: number[];
  layout: string[];
  buildSqMeters: string[];
  landSqMeters: string[];
  listingDetailUrl: string[];
  buildDate: string[];
  isSold: boolean[];
  original: {
    tags: string[];
    listingDetail: string[];
    prices: string[];
    layout: string[];
    addresses: string[];
    buildDate: string[];
  };
}

async function translateData(data: ScrapedResult): Promise<ScrapedResult> {
  console.log("Starting batch translations...");

  // Batch translations after all data is collected
  try {
    // Check which fields need translation
    const needsAddressTranslation = data.addresses.some(item => containsJapanese(item));
    const needsTagsTranslation = data.tags.some(item => containsJapanese(item));
    const needsDetailTranslation = data.listingDetail.some(item => containsJapanese(item));
    const needsLayoutTranslation = data.layout.some(item => containsJapanese(item));
    const needsBuildDateTranslation = data.buildDate.some(item => containsJapanese(item));

    // Translate addresses
    let englishAddresses = data.addresses;
    if (needsAddressTranslation) {
      console.log("Translating all addresses...");
      englishAddresses = await translateList(data.addresses);
    } else {
      console.log("Addresses don't need translation, skipping...");
    }

    // Translate tags
    let englishTags = data.tags;
    if (needsTagsTranslation) {
      console.log("Translating all tags...");
      englishTags = await translateList(data.tags);
    } else {
      console.log("Tags don't need translation, skipping...");
    }

    // Translate listing details
    let englishListingDetail = data.listingDetail;
    if (needsDetailTranslation) {
      console.log("Translating all listing details...");
      englishListingDetail = await translateList(data.listingDetail);
    } else {
      console.log("Listing details don't need translation, skipping...");
    }

    // Translate layouts if needed
    let englishLayout = data.layout;
    if (needsLayoutTranslation) {
      console.log("Translating all layouts...");
      englishLayout = await translateList(data.layout);
    } else {
      console.log("Layouts don't need translation, skipping...");
    }

    // Translate build dates if needed
    let englishBuildDate = data.buildDate;
    if (needsBuildDateTranslation) {
      console.log("Translating all build dates...");
      englishBuildDate = await translateList(data.buildDate);
    } else {
      console.log("Build dates don't need translation, skipping...");
    }

    // Return combined result with translations
    const combinedResult: ScrapedResult = {
      addresses: englishAddresses,
      tags: englishTags,
      listingDetail: englishListingDetail,
      prices: data.prices,
      layout: englishLayout,
      buildSqMeters: data.buildSqMeters,
      landSqMeters: data.landSqMeters,
      listingDetailUrl: data.listingDetailUrl,
      buildDate: englishBuildDate,
      isSold: data.isSold,
      original: {
        tags: data.original.tags,
        listingDetail: data.original.listingDetail,
        prices: data.original.prices,
        layout: data.original.layout,
        addresses: data.original.addresses,
        buildDate: data.original.buildDate
      }
    };

    console.log("All translations complete!");
    return combinedResult;

  } catch (translateError) {
    console.error("Error during translation phase:", translateError);

    // Return original data as fallback if translations fail
    console.log("Returning original untranslated data as fallback");
    return data;
  }
}

async function mergeListings() {
  try {
    console.log('Starting to merge listings...');

    // Define file paths
    const batchResultsPath = path.join(process.cwd(), 'public', 'batch_test_results.json');
    const newOutputPath = path.join(process.cwd(), 'new_output.json');

    // Check if files exist
    if (!fs.existsSync(batchResultsPath)) {
      console.error(`File not found: ${batchResultsPath}`);
      return;
    }

    if (!fs.existsSync(newOutputPath)) {
      console.error(`File not found: ${newOutputPath}`);
      return;
    }

    // Read both files
    console.log('Reading existing batch test results...');
    const batchResultsData: ListingsData = JSON.parse(fs.readFileSync(batchResultsPath, 'utf8'));

    console.log('Reading new output data...');
    const newOutputData: ListingsData = JSON.parse(fs.readFileSync(newOutputPath, 'utf8'));

    // Count entries before merging
    const batchResultsCount = Object.keys(batchResultsData).length;
    const newOutputCount = Object.keys(newOutputData).length;

    console.log(`Batch results contains ${batchResultsCount} listings`);
    console.log(`New output contains ${newOutputCount} listings`);

    // Merge the data
    console.log('Merging data...');
    const mergedData: ListingsData = { ...batchResultsData };

    // Add or update entries from new_output.json
    let addedCount = 0;
    let updatedCount = 0;

    for (const [key, value] of Object.entries(newOutputData)) {
      // Ensure the value has an address property that matches the key (for translated addresses)
      // This makes sure the English address is used consistently as both the key and address property
      if (value && !value.address && typeof key === 'string') {
        value.address = key;
      }

      // Check if we already have this listing (by original address)
      let existingKey = null;
      if (value.original && value.original.address) {
        // Look through existing data to find if we have this original address
        for (const [existingDataKey, existingValue] of Object.entries(mergedData)) {
          if (existingValue.original &&
            existingValue.original.address === value.original.address) {
            existingKey = existingDataKey;
            break;
          }
        }
      }

      if (existingKey) {
        // We found the listing by original address - update it, but keep its key
        mergedData[existingKey] = {
          ...mergedData[existingKey],
          ...value,
          // Preserve the original ID
          id: mergedData[existingKey].id
        };

        // Also merge the original data
        if (value.original && mergedData[existingKey].original) {
          mergedData[existingKey].original = {
            ...mergedData[existingKey].original,
            ...value.original
          };
        }

        updatedCount++;

        // If the translated address is different from the existing key,
        // we should consider updating the key eventually
        if (existingKey !== key && key !== value.original.address) {
          console.log(`Note: Translation changed address from "${existingKey}" to "${key}"`);
          // In a future version, we might want to migrate the key
        }
      } else if (!mergedData[key]) {
        // This is a truly new entry
        mergedData[key] = value;
        addedCount++;

        // Generate a unique ID if it doesn't exist
        if (!mergedData[key].id) {
          mergedData[key].id = generateUniqueId();
        }
      } else {
        // This entry exists with the same key - update it
        mergedData[key] = {
          ...mergedData[key],
          ...value,
          // Preserve the original ID
          id: mergedData[key].id
        };

        // Also merge the original data
        if (value.original && mergedData[key].original) {
          mergedData[key].original = {
            ...mergedData[key].original,
            ...value.original
          };
        }

        updatedCount++;
      }
    }

    // Write the merged data back to batch_test_results.json
    console.log('Writing merged data back to batch_test_results.json...');
    fs.writeFileSync(batchResultsPath, JSON.stringify(mergedData, null, 2), 'utf8');

    console.log(`Merge complete!`);
    console.log(`Added ${addedCount} new listings`);
    console.log(`Updated ${updatedCount} existing listings`);
    console.log(`Total listings in merged file: ${Object.keys(mergedData).length}`);

    return {
      addedCount,
      updatedCount,
      totalCount: Object.keys(mergedData).length
    };

  } catch (error) {
    console.error('Error merging listings:', error);
    throw error;
  }
}

// The URL of the page to scrape - base URL without page parameters
const baseUrl =
  "https://www.shiawasehome-reuse.com/?bukken=jsearch&shub=1&kalb=0&kahb=kp120&tochimel=0&tochimeh=&mel=0&meh=";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatListingData(result: ScrapedResult): ScrapedResult {
  // Format addresses to title case
  result.addresses = result.addresses.map(addr =>
    addr ? toTitleCase(addr) : addr
  );

  // No need to format prices as they are now numbers
  // The original prices are already stored and can be formatted if needed

  return result;
}

// Improved translation function with enhanced exponential backoff
export async function translateText(text: string, retries = 5, baseDelay = 2000): Promise<string> {
  let attempts = 0;

  // If empty text, just return it
  if (!text || text.trim() === '') {
    return text;
  }

  while (attempts < retries) {
    try {
      attempts++;
      return await translate(text, { from: "ja", to: "en" });
    } catch (error) {
      console.log(`Translation error (attempt ${attempts}/${retries}):`, error);

      if (attempts >= retries) {
        console.log(`Failed to translate text after ${retries} attempts: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        // Return original text on failure instead of throwing
        return text;
      }

      // Calculate exponential backoff with jitter
      // Formula: baseDelay * (2^attempt) * (0.5 + Math.random() * 0.5)
      // This creates an exponential backoff with 50% randomization
      const exponentialDelay = baseDelay * Math.pow(2, attempts);
      const jitter = 0.5 + Math.random() * 0.5; // Random value between 0.5 and 1
      const delay = Math.floor(exponentialDelay * jitter);

      console.log(`Retrying in ${delay}ms (attempt ${attempts}/${retries})...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return text; // Fallback to original
}

async function translateList(japaneseList: (string | string[])[], batchSize = 20): Promise<string[]> {
  console.log(`Translating ${japaneseList.length} items...`);
  const results: string[] = [];

  // Process in smaller batches to avoid overwhelming the translation service
  // Reduced batch size from 20 to 10
  for (let i = 0; i < japaneseList.length; i += batchSize) {
    console.log(`Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(japaneseList.length / batchSize)}`);
    const batch = japaneseList.slice(i, i + batchSize);

    // Process each batch with sequential processing instead of parallel
    // This avoids hammering the translation API with simultaneous requests
    const batchResults: string[] = [];

    for (const text of batch) {
      try {
        let result: string;
        if (Array.isArray(text)) {
          // Process array elements sequentially with small delay between each
          const translatedArray: string[] = [];
          for (const t of text) {
            const translated = await translateText(t);
            translatedArray.push(translated);
            // Small delay between individual array item translations
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          result = translatedArray.join(', ');
        } else {
          result = await translateText(text);
        }
        batchResults.push(result);

        // Small delay between items in the same batch
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.log(`Translation error in batch: ${e}`);
        batchResults.push(Array.isArray(text) ? text.join(', ') : text); // Return original on error
      }
    }

    results.push(...batchResults);

    // Add delay between batches to prevent rate limiting
    if (i + batchSize < japaneseList.length) {
      const batchDelay = 1000;
      console.log(`Waiting ${batchDelay}ms before next translation batch...`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return results;
}

// Function to convert Japanese price format (e.g., "1280万円") to absolute number
function convertPriceToNumber(priceText: string): number {
  try {
    // Extract numeric part and remove commas
    const numericPart = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '');

    if (!numericPart || isNaN(Number(numericPart))) {
      return 0;
    }

    // Check if price contains "万円" (10,000 yen)
    if (priceText.includes('万円')) {
      return Number(numericPart) * 10000;
    }

    return Number(numericPart);
  } catch (e) {
    console.log("Error converting price:", e);
    return 0;
  }
}

// Helper function to detect if a string contains Japanese text
function containsJapanese(text: string): boolean {
  // Regex for matching Japanese characters
  const japaneseRegex = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
}

// Function to get URL for a specific page
function getPageUrl(pageNum: number): string {
  if (pageNum === 1) {
    return baseUrl; // First page doesn't need pagination parameters
  }
  return `${baseUrl}&paged=${pageNum}&so=date&ord=d&s=`;
}

// Modified function to scrape the page without translations
export async function scrapeListingsPage(page: puppeteer.Page, pageNum: number): Promise<ScrapedResult | null> {
  try {
    const pageUrl = getPageUrl(pageNum);
    console.log(`Scraping page ${pageNum} at URL: ${pageUrl}`);

    // Navigate to the page
    await page.goto(pageUrl, { waitUntil: "networkidle0" });

    // Get the count of all listing items on this page
    const listingsCount = await page.$$eval("#bukken_list > li", (items: Element[]) => items.length);
    console.log(`Found ${listingsCount} listings on page ${pageNum}`);

    // Extract floor plans
    let layout = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find the floor plan info within the listing item
          const floorPlanElements = item.querySelectorAll("dt");
          let floorPlan = "";

          // Loop through dt elements and find the one with "間取" text
          for (const dt of Array.from(floorPlanElements)) {
            if (dt.textContent && dt.textContent.includes("間取")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                floorPlan = (ddElement as HTMLElement).innerText.trim();
                break;
              }
            }
          }

          // If we can't find the specific element, try a more general approach
          if (!floorPlan) {
            // Look for any text with floor plan patterns like ○LDK, ○DK, etc.
            const text = (item as HTMLElement).innerText || "";
            const match = text.match(/([0-9]+[SLDK]{1,3}|[0-9]+DK|[0-9]+K)/);
            return match ? match[0] : "";
          }

          return floorPlan;
        } catch (e) {
          console.log("Error extracting floor plan:", e);
          return "";
        }
      })
    );

    // Extract prices
    let prices = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find price elements
          const priceElements = item.querySelectorAll("dt");
          let price = "";

          // Look for the price in dt elements
          for (const dt of Array.from(priceElements)) {
            if (dt.textContent && dt.textContent.includes("総額")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                // Check for price span with class a1234
                const priceSpan = ddElement.querySelector("span.a1234");
                if (priceSpan) {
                  price = (priceSpan as HTMLElement).innerText.trim() + "万円";
                } else {
                  price = (ddElement as HTMLElement).innerText.trim();
                }
                break;
              }
            }
          }

          // If we can't find the specific element, try a more general approach
          if (!price) {
            const text = (item as HTMLElement).innerText || "";
            const match = text.match(/([0-9,]+)万円/);
            return match ? match[0] : "";
          }

          return price;
        } catch (e) {
          console.log("Error extracting price:", e);
          return "";
        }
      })
    );

    // Extract land area
    let landSqMeters = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find land area elements
          const landAreaElements = item.querySelectorAll("dt");
          let landArea = "";

          // Look for the land area in dt elements
          for (const dt of Array.from(landAreaElements)) {
            if (dt.textContent && dt.textContent.includes("土地面積")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                landArea = (ddElement as HTMLElement).innerText.trim();
                break;
              }
            }
          }

          // If we can't find the specific element, try a more general approach
          if (!landArea) {
            const text = (item as HTMLElement).innerText || "";
            const match = text.match(/土地面積\s*:\s*([0-9,.]+)㎡/);
            return match ? match[1] + "㎡" : "";
          }

          return landArea;
        } catch (e) {
          console.log("Error extracting land area:", e);
          return "";
        }
      })
    );

    // Extract addresses
    let addresses = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find address - first try the title
          const titleElement = item.querySelector(".entry-title");
          if (titleElement) {
            const titleText = (titleElement as HTMLElement).innerText.trim();
            // Clean up the title to get just the address part
            return titleText.replace(/【.*?】|（.*?）|\(.*?\)|<.*?>|\s*\(売主\)\s*/g, '').trim();
          }

          // If no title, try looking for the address in the details
          const addressElements = item.querySelectorAll("dt");
          for (const dt of Array.from(addressElements)) {
            if (dt.textContent && dt.textContent.includes("住居表示")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                return (ddElement as HTMLElement).innerText.trim();
              }
            }
          }

          return "";
        } catch (e) {
          console.log("Error extracting address:", e);
          return "";
        }
      })
    );

    // Extract building area
    let buildSqMeters = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find building area elements
          const buildAreaElements = item.querySelectorAll("dt");
          let buildArea = "";

          // Look for the building area in dt elements
          for (const dt of Array.from(buildAreaElements)) {
            if (dt.textContent && dt.textContent.includes("建物面積")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                buildArea = (ddElement as HTMLElement).innerText.trim();
                break;
              }
            }
          }

          // If we can't find the specific element, try a more general approach
          if (!buildArea) {
            const text = (item as HTMLElement).innerText || "";
            const match = text.match(/建物面積\s*:\s*([0-9,.]+)㎡/);
            return match ? match[1] + "㎡" : "";
          }

          return buildArea;
        } catch (e) {
          console.log("Error extracting building area:", e);
          return "";
        }
      })
    );

    // Extract tags and recommended text for each listing
    const listingData = await page.$$eval("#bukken_list > li", (items: Element[]) => {
      return items.map((item: Element, index: number) => {
        try {
          // Extract tags from the facility list
          const facility = item.querySelectorAll(".facility li");
          const tags = Array.from(facility || [])
            .map(el => (el as HTMLElement).innerText.trim())
            .filter(Boolean);

          // Extract URL from the link
          const linkElement = item.querySelector("a");
          const url = linkElement ? linkElement.getAttribute('href') || "" : "";

          // Extract highlights from the recommendation text
          const recommendElement = item.querySelector(".recommend_txt");
          let recommendText = "";
          if (recommendElement) {
            recommendText = (recommendElement as HTMLElement).innerText || "";
          }

          return {
            tags,
            url,
            recommendText,
            index
          };
        } catch (e) {
          return {
            tags: [],
            url: "",
            recommendText: "",
            index
          };
        }
      });
    });

    // Process the tags and URLs
    const tagsList = new Array(listingsCount).fill("");
    const recommendTexts = new Array(listingsCount).fill("");
    const listingUrls = new Array(listingsCount).fill("");

    // Place the data in the correct index to maintain alignment with other arrays
    listingData.forEach(item => {
      if (item.tags.length > 0) {
        tagsList[item.index] = item.tags.join(', ');
      }
      if (item.recommendText) {
        recommendTexts[item.index] = item.recommendText;
      }
      if (item.url) {
        listingUrls[item.index] = item.url;
      }
    });

    // Extract build dates
    let buildDate = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Find the build date elements
          const buildDateElements = item.querySelectorAll("dt");
          let dateText = "";

          // Look for the build date in dt elements - usually labeled "新築年月"
          for (const dt of Array.from(buildDateElements)) {
            if (dt.textContent && dt.textContent.includes("新築年月")) {
              const ddElement = dt.nextElementSibling;
              if (ddElement) {
                dateText = (ddElement as HTMLElement).innerText.trim();
                break;
              }
            }
          }

          // If we can't find the specific element, try a more general approach
          if (!dateText) {
            const text = (item as HTMLElement).innerText || "";
            const match = text.match(/新築年月\s*[:：]?\s*([^\n]+)/);
            return match ? match[1].trim() : "";
          }

          return dateText;
        } catch (e) {
          console.log("Error extracting build date:", e);
          return "";
        }
      })
    );

    // Extract sold status
    let isSold = await page.$$eval("#bukken_list > li", (items: Element[]) =>
      items.map((item: Element) => {
        try {
          // Check for the sold tag/overlay - typically a div with class "archive_sold"
          const soldElement = item.querySelector(".archive_sold");
          return !!soldElement; // Convert to boolean
        } catch (e) {
          console.log("Error extracting sold status:", e);
          return false;
        }
      })
    );

    // Convert prices to absolute numbers
    const numericPrices = prices.map(price => convertPriceToNumber(price));

    // Return the result WITHOUT translations
    const result: ScrapedResult = {
      addresses: addresses,
      tags: tagsList,
      listingDetail: recommendTexts,
      prices: numericPrices,
      layout: layout,
      buildSqMeters,
      landSqMeters,
      listingDetailUrl: listingUrls,
      buildDate: buildDate,
      isSold,
      original: {
        tags: tagsList,
        listingDetail: recommendTexts,
        prices: prices,
        layout: layout,
        addresses: addresses,
        buildDate: buildDate
      }
    };

    // Check if there's a next page
    const hasNextPage = await page.evaluate((currentPageNum) => {
      const pagination = document.querySelector('.nav-next');
      if (!pagination) return false;

      // Try to find a link to the next page
      const nextPageLink = pagination.querySelector(`a[href*="paged=${currentPageNum + 1}"]`);
      return !!nextPageLink;
    }, pageNum);

    console.log(`Page ${pageNum} has next page: ${hasNextPage}`);
    return result;
  } catch (error) {
    console.error(`Error scraping page ${pageNum}:`, error);
    return null;
  }
}

// Modified function to scrape all pages and batch translations at the end
export async function scrapeAllListings(options: { pages: number }): Promise<ScrapedResult | null> {
  let browser: puppeteer.Browser | undefined;
  try {
    console.log("... launching puppeteer");
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log("... puppeteer launched");
    const page = await browser.newPage();
    console.log("... page created");

    // Get the total number of pages by checking pagination on the first page
    await page.goto(getPageUrl(1), { waitUntil: "networkidle0" });

    // Enhanced pagination detection with multiple approaches
    const totalPages = await page.evaluate(() => {
      // Method 1: Look for .nav-links pagination element
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        const pageLinks = Array.from(document.querySelectorAll('.nav-links a'));
        let maxPage = 1;

        for (const link of pageLinks) {
          const hrefMatch = link.getAttribute('href')?.match(/paged=(\d+)/);
          if (hrefMatch) {
            const pageNum = parseInt(hrefMatch[1], 10);
            if (!isNaN(pageNum) && pageNum > maxPage) {
              maxPage = pageNum;
            }
          }
        }

        if (maxPage > 1) {
          return maxPage;
        }
      }

      // Method 2: Look for pagination links by class or text content
      const paginationSelectors = [
        '.pagination a', '.pager a', '.wp-pagenavi a',
        '.page-numbers', '.paginate a', '.nav-links a', '.nav-next a'
      ];

      for (const selector of paginationSelectors) {
        const links = document.querySelectorAll(selector);
        if (links.length > 0) {
          let maxPage = 1;

          for (const link of Array.from(links)) {
            // Check text content for numbers
            const textMatch = link.textContent?.match(/\d+/);
            if (textMatch) {
              const pageNum = parseInt(textMatch[0], 10);
              if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
              }
            }

            // Check href for page numbers
            const href = link.getAttribute('href') || '';
            const pageMatch = href.match(/[?&]page=(\d+)|[?&]p=(\d+)|paged=(\d+)/);
            if (pageMatch) {
              const pageNum = parseInt(pageMatch[1] || pageMatch[2] || pageMatch[3], 10);
              if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
              }
            }
          }

          if (maxPage > 1) {
            return maxPage;
          }
        }
      }

      // Method 3: Look for "Next" or "次へ" links
      const nextLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        const text = link.textContent?.trim().toLowerCase() || '';
        return text.includes('next') || text.includes('次へ') || text.includes('次ページ');
      });

      if (nextLinks.length > 0) {
        return 20; // Default to 20 pages if we find next links but can't determine total
      }

      // Method 4: If listings exist but no pagination detected, assume multiple pages
      const hasListings = document.querySelectorAll('#bukken_list > li').length > 0;
      if (hasListings) {
        return 10; // Assume at least 10 pages if we found listings
      }

      // Last resort - return 1 if no pagination detected
      return 1;
    });

    // Use 10 pages minimum for thorough scraping
    const effectiveTotalPages = Math.max(totalPages, 10);
    console.log(`Detected ${totalPages} pages, using ${effectiveTotalPages} for thorough scraping`);

    // Create empty arrays to store all listings data
    let allAddresses: string[] = [];
    let allTags: string[] = [];
    let allListingDetail: string[] = [];
    let allPrices: number[] = [];
    let allLayout: string[] = [];
    let allBuildSqMeters: string[] = [];
    let allLandSqMeters: string[] = [];
    let allListingDetailUrl: string[] = [];
    let allBuildDate: string[] = [];
    let allIsSold: boolean[] = [];
    let allOriginalTags: string[] = [];
    let allOriginalListingDetail: string[] = [];
    let allOriginalPrices: string[] = [];
    let allOriginalLayout: string[] = [];
    let allOriginalAddresses: string[] = [];
    let allOriginalBuildDate: string[] = [];

    // Iterate through all pages
    const maxPages = parseInt(process.env.MAX_PAGES || String(effectiveTotalPages), 10);
    const pageOptions = options.pages === 0 ? maxPages : options.pages;
    const pagesToScrape = Math.min(maxPages, pageOptions);
    for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
      console.log(`Processing page ${pageNum} of ${maxPages}`);

      try {
        const pageUrl = getPageUrl(pageNum);
        console.log(`Scraping page ${pageNum} at URL: ${pageUrl}`);

        // Navigate to the page
        await page.goto(pageUrl, { waitUntil: "networkidle0" });

        // Get the count of all listing items on this page
        const listingsCount = await page.$$eval("#bukken_list > li", (items: Element[]) => items.length);
        console.log(`Found ${listingsCount} listings on page ${pageNum}`);

        if (listingsCount === 0) {
          console.log(`No listings found on page ${pageNum}, may have reached the end`);
          break;
        }

        // Extract all data using the existing selectors and methods from the original function
        // Floor plans, prices, land area, addresses, building area, tags, URLs, build dates, and sold status

        // Extract layout/floor plans
        let layout = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const floorPlanElements = item.querySelectorAll("dt");
              let floorPlan = "";

              for (const dt of Array.from(floorPlanElements)) {
                if (dt.textContent && dt.textContent.includes("間取")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    floorPlan = (ddElement as HTMLElement).innerText.trim();
                    break;
                  }
                }
              }

              if (!floorPlan) {
                const text = (item as HTMLElement).innerText || "";
                const match = text.match(/([0-9]+[SLDK]{1,3}|[0-9]+DK|[0-9]+K)/);
                return match ? match[0] : "";
              }

              return floorPlan;
            } catch (e) {
              return "";
            }
          })
        );

        // Extract prices
        let prices = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const priceElements = item.querySelectorAll("dt");
              let price = "";

              for (const dt of Array.from(priceElements)) {
                if (dt.textContent && dt.textContent.includes("総額")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    const priceSpan = ddElement.querySelector("span.a1234");
                    if (priceSpan) {
                      price = (priceSpan as HTMLElement).innerText.trim() + "万円";
                    } else {
                      price = (ddElement as HTMLElement).innerText.trim();
                    }
                    break;
                  }
                }
              }

              if (!price) {
                const text = (item as HTMLElement).innerText || "";
                const match = text.match(/([0-9,]+)万円/);
                return match ? match[0] : "";
              }

              return price;
            } catch (e) {
              return "";
            }
          })
        );

        // Extract land area
        let landSqMeters = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const landAreaElements = item.querySelectorAll("dt");
              let landArea = "";

              for (const dt of Array.from(landAreaElements)) {
                if (dt.textContent && dt.textContent.includes("土地面積")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    landArea = (ddElement as HTMLElement).innerText.trim();
                    break;
                  }
                }
              }

              // If we can't find the specific element, try a more general approach
              if (!landArea) {
                const text = (item as HTMLElement).innerText || "";
                const match = text.match(/土地面積\s*:\s*([0-9,.]+)㎡/);
                return match ? match[1] + "㎡" : "";
              }

              return landArea;
            } catch (e) {
              return "";
            }
          })
        );

        // Extract addresses
        let addresses = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const titleElement = item.querySelector(".entry-title");
              if (titleElement) {
                const titleText = (titleElement as HTMLElement).innerText.trim();
                return titleText.replace(/【.*?】|（.*?）|\(.*?\)|<.*?>|\s*\(売主\)\s*/g, '').trim();
              }

              const addressElements = item.querySelectorAll("dt");
              for (const dt of Array.from(addressElements)) {
                if (dt.textContent && dt.textContent.includes("住居表示")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    return (ddElement as HTMLElement).innerText.trim();
                  }
                }
              }

              return "";
            } catch (e) {
              return "";
            }
          })
        );

        // Extract building area
        let buildSqMeters = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const buildAreaElements = item.querySelectorAll("dt");
              let buildArea = "";

              for (const dt of Array.from(buildAreaElements)) {
                if (dt.textContent && dt.textContent.includes("建物面積")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    buildArea = (ddElement as HTMLElement).innerText.trim();
                    break;
                  }
                }
              }

              // If we can't find the specific element, try a more general approach
              if (!buildArea) {
                const text = (item as HTMLElement).innerText || "";
                const match = text.match(/建物面積\s*:\s*([0-9,.]+)㎡/);
                return match ? match[1] + "㎡" : "";
              }

              return buildArea;
            } catch (e) {
              return "";
            }
          })
        );

        // Extract tags and recommended text
        const listingData = await page.$$eval("#bukken_list > li", (items: Element[]) => {
          return items.map((item: Element, index: number) => {
            try {
              const facility = item.querySelectorAll(".facility li");
              const tags = Array.from(facility || [])
                .map(el => (el as HTMLElement).innerText.trim())
                .filter(Boolean);

              const linkElement = item.querySelector("a");
              const url = linkElement ? linkElement.getAttribute('href') || "" : "";

              const recommendElement = item.querySelector(".recommend_txt");
              let recommendText = "";
              if (recommendElement) {
                recommendText = (recommendElement as HTMLElement).innerText || "";
              }

              return { tags, url, recommendText, index };
            } catch (e) {
              return { tags: [], url: "", recommendText: "", index };
            }
          });
        });

        // Process the tags and URLs
        const tagsList = new Array(listingsCount).fill("");
        const recommendTexts = new Array(listingsCount).fill("");
        const listingUrls = new Array(listingsCount).fill("");

        listingData.forEach(item => {
          if (item.tags.length > 0) {
            tagsList[item.index] = item.tags.join(', ');
          }
          if (item.recommendText) {
            recommendTexts[item.index] = item.recommendText;
          }
          if (item.url) {
            listingUrls[item.index] = item.url;
          }
        });

        // Extract build dates
        let buildDate = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const buildDateElements = item.querySelectorAll("dt");
              let dateText = "";

              for (const dt of Array.from(buildDateElements)) {
                if (dt.textContent && dt.textContent.includes("新築年月")) {
                  const ddElement = dt.nextElementSibling;
                  if (ddElement) {
                    dateText = (ddElement as HTMLElement).innerText.trim();
                    break;
                  }
                }
              }

              // If we can't find the specific element, try a more general approach
              if (!dateText) {
                const text = (item as HTMLElement).innerText || "";
                const match = text.match(/新築年月\s*[:：]?\s*([^\n]+)/);
                return match ? match[1].trim() : "";
              }

              return dateText;
            } catch (e) {
              return "";
            }
          })
        );

        // Extract sold status
        let isSold = await page.$$eval("#bukken_list > li", (items: Element[]) =>
          items.map((item: Element) => {
            try {
              const soldElement = item.querySelector(".archive_sold");
              return !!soldElement;
            } catch (e) {
              return false;
            }
          })
        );

        // Convert prices to numbers
        const numericPrices = prices.map(price => convertPriceToNumber(price));

        // Accumulate data from this page
        allAddresses = allAddresses.concat(addresses);
        allTags = allTags.concat(tagsList);
        allListingDetail = allListingDetail.concat(recommendTexts);
        allPrices = allPrices.concat(numericPrices);
        allLayout = allLayout.concat(layout);
        allBuildSqMeters = allBuildSqMeters.concat(buildSqMeters);
        allLandSqMeters = allLandSqMeters.concat(landSqMeters);
        allListingDetailUrl = allListingDetailUrl.concat(listingUrls);
        allBuildDate = allBuildDate.concat(buildDate);
        allIsSold = allIsSold.concat(isSold);

        // Save original values
        allOriginalTags = allOriginalTags.concat(tagsList);
        allOriginalListingDetail = allOriginalListingDetail.concat(recommendTexts);
        allOriginalPrices = allOriginalPrices.concat(prices);
        allOriginalLayout = allOriginalLayout.concat(layout);
        allOriginalAddresses = allOriginalAddresses.concat(addresses);
        allOriginalBuildDate = allOriginalBuildDate.concat(buildDate);

        console.log(`Total listings accumulated so far: ${allAddresses.length}`);

      } catch (pageError) {
        console.error(`Error scraping page ${pageNum}:`, pageError);
        console.log(`Continuing to next page despite error...`);
      }

      // Add delay between page requests
      if (pageNum < maxPages) {
        const delay = parseInt(process.env.PAGE_DELAY || '3000', 10);
        console.log(`Waiting ${delay}ms before next page...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Close the browser after collecting all data
    if (browser) {
      await browser.close();
      console.log("Browser closed after collecting all data");
    }
    browser = undefined;

    return {
      addresses: allAddresses,
      tags: allTags,
      listingDetail: allListingDetail,
      prices: allPrices,
      layout: allLayout,
      buildSqMeters: allBuildSqMeters,
      landSqMeters: allLandSqMeters,
      listingDetailUrl: allListingDetailUrl,
      buildDate: allBuildDate,
      isSold: allIsSold,
      original: {
        tags: allOriginalTags,
        listingDetail: allOriginalListingDetail,
        prices: allOriginalPrices,
        layout: allOriginalLayout,
        addresses: allOriginalAddresses,
        buildDate: allOriginalBuildDate
      }
    };
  } catch (error) {
    console.error("Error scraping listings:", error);
    return null;
  }
}

// Define interface for the enhanced listing data
interface EnhancedListing {
  address: string;
  tags: string;
  listingDetail: string;
  price: number;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingDetailUrl: string;
  buildDate: string;
  isSold: boolean;
  original: {
    address: string;
    tags: string;
    listingDetail: string;
    price: string;
    layout: string;
    buildDate: string;
    facilities?: {
      water: string | null;
      gas: string | null;
      sewage: string | null;
      greyWater: string | null;
    };
    schools?: {
      primary: string | null;
      juniorHigh: string | null;
    };
    dates?: {
      datePosted: string | null;
      dateRenovated: string | null;
    };
  };
  coordinates?: {
    lat: number | null;
    long: number | null;
  };
  dates?: {
    datePosted: string | null;
    dateRenovated: string | null;
  };
  aboutProperty?: string | null;
  listingImages?: string[];
  facilities?: {
    water: string | null;
    gas: string | null;
    sewage: string | null;
    greyWater: string | null;
  };
  schools?: {
    primary: string | null;
    juniorHigh: string | null;
  };
}

// Process listing details by visiting each listing's detail page URL
export async function initProcessListingDetails(newOutput: Record<string, EnhancedListing>) {
  console.log("Starting process to extract detailed listing information...");
  try {
    // Check if we have data
    if (!newOutput || Object.keys(newOutput).length === 0) {
      console.error("No data found in new_output.json, please run the scraper first.");
      return {};
    }

    // Launch browser
    console.log("Launching browser for detail page scraping...");
    const browser = await puppeteer.launch({ headless: true });

    // Enhanced data object
    const enhancedData: Record<string, EnhancedListing> = {};
    let successCount = 0;
    let errorCount = 0;

    // Get the addresses to process
    const addresses = Object.keys(newOutput);
    const totalListings = addresses.length;

    console.log(`Found ${totalListings} listings to process...`);

    // Process each listing
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const listing = newOutput[address];

      try {
        console.log(`Processing listing ${i + 1}/${totalListings}: ${address}`);

        // Skip if no detail URL
        if (!listing.listingDetailUrl) {
          console.log(`No detail URL for ${address}, skipping...`);
          continue;
        }

        // Create a new page
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setDefaultNavigationTimeout(60000);

        // Navigate to the detail page
        await page.goto(listing.listingDetailUrl, { waitUntil: "networkidle0" });

        console.log(`Extracting details from ${listing.listingDetailUrl}`);

        // Extract coordinates
        const coordinates = await page.evaluate(() => {
          try {
            // Try multiple methods to find coordinates

            // 1. Look for iframe.detail-googlemap (primary method from latitude-longitude.ts)
            const mapIframe = document.querySelector('iframe.detail-googlemap');
            if (mapIframe) {
              const src = mapIframe.getAttribute('src') || '';
              const coordMatch = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (coordMatch && coordMatch[1] && coordMatch[2]) {
                console.log(`Found coordinates in detail-googlemap: ${coordMatch[1]},${coordMatch[2]}`);
                return {
                  lat: parseFloat(coordMatch[1]),
                  long: parseFloat(coordMatch[2])
                };
              }
            }

            // 2. Look for map_canvas which contains Google Maps data
            const mapCanvas = document.querySelector('#map_canvas');
            if (mapCanvas) {
              // Try to find coordinates in inline scripts
              const scripts = document.querySelectorAll('script');
              for (const script of scripts) {
                const content = script.textContent || '';
                // Look for JavaScript code that might set map coordinates
                const latMatch = content.match(/var\s+bukken_lat\s*=\s*["']?(-?\d+\.\d+)["']?/);
                const lngMatch = content.match(/var\s+bukken_lng\s*=\s*["']?(-?\d+\.\d+)["']?/);

                if (latMatch && lngMatch) {
                  console.log(`Found coordinates in script variables: ${latMatch[1]},${lngMatch[1]}`);
                  return {
                    lat: parseFloat(latMatch[1]),
                    long: parseFloat(lngMatch[1])
                  };
                }
              }

              // Alternative: Check if coordinates are in an attribute or data attribute
              const dataLatLng = mapCanvas.getAttribute('data-latlng') ||
                mapCanvas.getAttribute('data-coordinates') ||
                '';

              if (dataLatLng) {
                const parts = dataLatLng.split(',');
                if (parts.length === 2) {
                  console.log(`Found coordinates in data attribute: ${parts[0]},${parts[1]}`);
                  return {
                    lat: parseFloat(parts[0].trim()),
                    long: parseFloat(parts[1].trim())
                  };
                }
              }

              // Try to extract from map markers
              const marker = document.querySelector('.gm-style img[src*="gmapmark"]');
              if (marker && marker.parentElement) {
                const style = marker.parentElement.getAttribute('style') || '';
                const leftMatch = style.match(/left:\s*(-?\d+\.?\d*)px/);
                const topMatch = style.match(/top:\s*(-?\d+\.?\d*)px/);

                if (leftMatch && topMatch) {
                  // This is an approximation, but we need reference points to accurately calculate
                  console.log(`Found marker position: left=${leftMatch[1]}, top=${topMatch[1]}`);
                }
              }
            }

            // 3. Look for any Google Maps iframe (fallback)
            const anyMapIframe = document.querySelector('iframe[src*="maps.google"]');
            if (anyMapIframe) {
              const src = anyMapIframe.getAttribute('src') || '';
              const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (match) {
                console.log(`Found coordinates in generic maps iframe: ${match[1]},${match[2]}`);
                return {
                  lat: parseFloat(match[1]),
                  long: parseFloat(match[2])
                };
              }
            }

            // 4. Check if coordinates are in the page URL
            const canonicalLink = document.querySelector('link[rel="canonical"]');
            if (canonicalLink) {
              const href = canonicalLink.getAttribute('href') || '';
              if (href.includes('maps.google.com') || href.includes('maps.googleapis.com')) {
                const match = href.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (match) {
                  console.log(`Found coordinates in canonical link: ${match[1]},${match[2]}`);
                  return {
                    lat: parseFloat(match[1]),
                    long: parseFloat(match[2])
                  };
                }
              }
            }

            console.log('Could not find coordinates using any method');
            return { lat: null, long: null };
          } catch (e) {
            console.error('Error extracting coordinates:', e);
            return { lat: null, long: null };
          }
        });

        // Extract dates
        const dates = await page.evaluate(() => {
          const result: {
            datePosted: string | null;
            dateRenovated: string | null;
          } = {
            datePosted: null,
            dateRenovated: null
          };

          try {
            // Look for date information in all text on the page
            const pageContent = document.body.textContent || '';

            // Look for specific posting date format: YYYY.MM.DD掲載
            const postingDateRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})掲載/;
            const postingMatch = pageContent.match(postingDateRegex);
            if (postingMatch) {
              result.datePosted = postingMatch[0];
            }

            // If not found with the specific format, continue with other formats
            if (!result.datePosted) {
              // Look for date patterns in Japanese format (YYYY年MM月DD日)
              const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
              const matches = pageContent.match(dateRegex);

              if (matches && matches.length > 0) {
                // Find dates near specific keywords
                const paragraphs = document.querySelectorAll('p, div, span, li');

                paragraphs.forEach(element => {
                  const text = element.textContent || '';

                  // Check for renovation date
                  if (text.includes('リフォーム') ||
                    text.includes('改装') ||
                    text.includes('renovation') ||
                    text.includes('R7.3')) {
                    const match = text.match(dateRegex);
                    if (match) {
                      result.dateRenovated = match[0];
                    }
                  }

                  // Check for posting date
                  if (text.includes('掲載日') ||
                    text.includes('登録日') ||
                    text.includes('posted')) {
                    const match = text.match(dateRegex);
                    if (match) {
                      result.datePosted = match[0];
                    }
                  }
                });
              }
            }

            // Try alternative date formats
            if (!result.datePosted) {
              const westernDateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}/g;
              const paragraphs = document.querySelectorAll('p, div, span, li');

              paragraphs.forEach(element => {
                const text = element.textContent || '';
                if (text.includes('掲載日') || text.includes('登録日') || text.includes('posted')) {
                  const match = text.match(westernDateRegex);
                  if (match) {
                    result.datePosted = match[0];
                  }
                }
              });
            }

            // If still no dates found, look in tables
            if (!result.datePosted && !result.dateRenovated) {
              const tables = document.querySelectorAll('.spec_table, table');
              tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                  const headerCell = row.querySelector('th');
                  const dataCell = row.querySelector('td');

                  if (headerCell && dataCell) {
                    const header = headerCell.textContent?.trim() || '';
                    const data = dataCell.textContent?.trim() || '';

                    // Look for posting date
                    if (header.includes('掲載日') || header.includes('登録日')) {
                      result.datePosted = data;
                    }

                    // Look for renovation date
                    if (header.includes('リフォーム') || header.includes('改装') || header.includes('renovation')) {
                      result.dateRenovated = data;
                    }
                  }
                });
              });
            }
          } catch (e) {
            console.error('Error extracting dates:', e);
          }

          return result;
        });

        // Extract about property section
        const aboutProperty = await page.evaluate(() => {
          try {
            // Look for description content in meta tags
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
              const content = metaDescription.getAttribute('content');
              if (content) {
                return content;
              }
            }

            // Try to find property details in main content
            const propertyDetails = document.querySelector('.entry-content') ||
              document.querySelector('article') ||
              document.querySelector('.property-details');

            if (propertyDetails) {
              return propertyDetails.textContent || null;
            }

            // Fallback to spec tables
            const specTables = document.querySelectorAll('.spec_table, table');
            if (specTables && specTables.length > 0) {
              let tableTexts: string[] = [];
              specTables.forEach(table => {
                tableTexts.push(table.textContent?.trim() || '');
              });
              return tableTexts.filter(Boolean).join('\n');
            }

            return null;
          } catch (e) {
            console.error('Error extracting about property:', e);
            return null;
          }
        });

        // Extract listing images
        const listingImages = await page.evaluate(() => {
          try {
            // Try various selectors that might contain property images
            const selectors = [
              '.asset_body img',
              '.gallery img',
              '.property-gallery img',
              '.syousai_img img',
              '.img_wide img',
              '.boxer_sample img'
            ];

            for (const selector of selectors) {
              const images = document.querySelectorAll(selector);
              if (images && images.length > 0) {
                return Array.from(images)
                  .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
                  .filter(src => src !== null) as string[];
              }
            }

            // Fallback: look for any images that might be property photos
            const allImages = document.querySelectorAll('img[src*="uploads"]');
            return Array.from(allImages)
              .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
              .filter(src => src !== null) as string[];
          } catch (e) {
            console.error('Error extracting listing images:', e);
            return [] as string[];
          }
        });

        // Extract facilities information
        const facilities = await page.evaluate(() => {
          const result: {
            water: string | null;
            gas: string | null;
            sewage: string | null;
            greyWater: string | null;
          } = {
            water: null,
            gas: null,
            sewage: null,
            greyWater: null
          };

          try {
            // Locate utility information sections
            const utilityKeywords = [
              '設備',             // Equipment/Facilities
              'インフラ',         // Infrastructure
              'ユーティリティ',    // Utilities
              '水道',             // Water
              'ガス',             // Gas
              '下水',             // Sewage
              '排水',             // Drainage
              'facilities',
              'utilities',
              'water',
              'gas',
              'sewage',
              'drainage'
            ];

            // Find elements that might contain utility information
            const utilityElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.textContent || '';
              return utilityKeywords.some(keyword => text.includes(keyword)) && text.length < 100;
            });

            // Helper function to clean and normalize utility text
            const cleanUtilityText = (text: string): string => {
              return text.replace(/：/g, ':').trim();
            };

            // Process the utility elements
            if (utilityElements.length > 0) {
              utilityElements.forEach(el => {
                const text = el.textContent || '';

                // Extract water information
                if (text.includes('水道') || text.includes('上水') || text.includes('water supply')) {
                  if (!result.water) {
                    // Try to extract just the value after "水道:" or similar patterns
                    const waterMatch = text.match(/(水道|上水|water supply)[：:]\s*([^、。\n]+)/i);
                    if (waterMatch && waterMatch[2]) {
                      result.water = cleanUtilityText(waterMatch[2]);
                    } else if (text.includes('公営') || text.includes('public')) {
                      result.water = '公営水道 (Public water)';
                    } else if (text.includes('private') || text.includes('個人')) {
                      result.water = '個人水道 (Private water)';
                    } else if (text.includes('well') || text.includes('井戸')) {
                      result.water = '井戸 (Well water)';
                    }
                  }
                }

                // Extract gas information
                if (text.includes('ガス') || text.includes('gas')) {
                  if (!result.gas) {
                    const gasMatch = text.match(/(ガス|gas)[：:]\s*([^、。\n]+)/i);
                    if (gasMatch && gasMatch[2]) {
                      result.gas = cleanUtilityText(gasMatch[2]);
                    } else if (text.includes('都市ガス') || text.includes('city gas')) {
                      result.gas = '都市ガス (City gas)';
                    } else if (text.includes('プロパン') || text.includes('propane')) {
                      result.gas = 'プロパンガス (Propane gas)';
                    } else if (text.includes('LPG')) {
                      result.gas = 'LPGガス';
                    }
                  }
                }

                // Extract sewage information
                if (text.includes('下水') || text.includes('汚水') || text.includes('sewage')) {
                  if (!result.sewage) {
                    const sewageMatch = text.match(/(下水道|汚水|sewage)[：:]\s*([^、。\n]+)/i);
                    if (sewageMatch && sewageMatch[2]) {
                      result.sewage = cleanUtilityText(sewageMatch[2]);
                    } else if (text.includes('公共下水') || text.includes('public sewage')) {
                      result.sewage = '公共下水 (Public sewage)';
                    } else if (text.includes('浄化槽') || text.includes('septic')) {
                      result.sewage = '浄化槽 (Septic tank)';
                    }
                  }
                }

                // Extract grey water/drainage information
                if (text.includes('雑排水') || text.includes('排水') || text.includes('drainage')) {
                  if (!result.greyWater) {
                    const drainageMatch = text.match(/(雑排水|排水|drainage)[：:]\s*([^、。\n]+)/i);
                    if (drainageMatch && drainageMatch[2]) {
                      result.greyWater = cleanUtilityText(drainageMatch[2]);
                    }
                  }
                }
              });
            }

            // If we haven't found all utilities, try looking in tables
            const tables = document.querySelectorAll('.spec_table, table');
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              rows.forEach(row => {
                const headerCell = row.querySelector('th');
                const dataCell = row.querySelector('td');

                if (headerCell && dataCell) {
                  const header = headerCell.textContent?.trim() || '';
                  const data = dataCell.textContent?.trim() || '';

                  if ((header.includes('水道') || header.includes('上水') || header.includes('water')) && !result.water) {
                    result.water = data;
                  }
                  if ((header.includes('ガス') || header.includes('gas')) && !result.gas) {
                    result.gas = data;
                  }
                  if ((header.includes('下水道') || header.includes('汚水') || header.includes('sewage')) && !result.sewage) {
                    result.sewage = data;
                  }
                  if ((header.includes('雑排水') || header.includes('排水') || header.includes('drainage')) && !result.greyWater) {
                    result.greyWater = data;
                  }
                }
              });
            });

            // Clean up results to avoid urban planning data in utility fields
            const urbanPlanningTerms = [
              '都市計画', 'urban planning', 'coverage rate', 'volume rate',
              'school district', '学区', '小学校', '中学校'
            ];

            for (const key of ['water', 'gas', 'sewage', 'greyWater'] as const) {
              if (result[key]) {
                // If it contains urban planning info, it's likely not utility data
                if (urbanPlanningTerms.some(term => result[key]?.includes(term))) {
                  result[key] = null;
                }
              }
            }

          } catch (e) {
            console.error('Error extracting facilities:', e);
          }

          return result;
        });

        // Extract school districts
        const schools = await page.evaluate(() => {
          const result: {
            primary: string | null;
            juniorHigh: string | null;
          } = {
            primary: null,
            juniorHigh: null
          };

          try {
            // Look for school information in page text
            const pageText = document.body.textContent || '';

            // More specific regex patterns for school names
            // Look for Japanese school names with explicit school type markers
            const primarySchoolPattern = /([^\s]+(?:市立|町立|区立|私立)?[^\s]*?小学校)/;
            const juniorHighSchoolPattern = /([^\s]+(?:市立|町立|区立|私立)?[^\s]*?中学校)/;

            // Check for school district sections
            const schoolDistrictElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.textContent || '';
              return text.includes('学区') ||
                text.includes('school district') ||
                text.includes('通学区') ||
                (text.includes('小学校') && text.length < 30) ||
                (text.includes('中学校') && text.length < 30);
            });

            if (schoolDistrictElements.length > 0) {
              // Check parent elements for better context
              for (const el of schoolDistrictElements) {
                const containerText = el.textContent || '';

                // Primary school
                if (containerText.includes('小学校') && !result.primary) {
                  const primaryMatch = containerText.match(primarySchoolPattern);
                  if (primaryMatch && primaryMatch[0]) {
                    result.primary = primaryMatch[0].trim();
                  }
                }

                // Junior high school
                if (containerText.includes('中学校') && !result.juniorHigh) {
                  const juniorMatch = containerText.match(juniorHighSchoolPattern);
                  if (juniorMatch && juniorMatch[0]) {
                    result.juniorHigh = juniorMatch[0].trim();
                  }
                }
              }
            }

            // If still no results, try the old method but with better patterns
            if (!result.primary) {
              const primaryMatch = pageText.match(primarySchoolPattern);
              if (primaryMatch) {
                // Limit the match to just the school name, not surrounding text
                result.primary = primaryMatch[0].trim();
              }
            }

            if (!result.juniorHigh) {
              const juniorHighMatch = pageText.match(juniorHighSchoolPattern);
              if (juniorHighMatch) {
                // Limit the match to just the school name, not surrounding text
                result.juniorHigh = juniorHighMatch[0].trim();
              }
            }

            // Try tables for more structured data
            if (!result.primary || !result.juniorHigh) {
              const tables = document.querySelectorAll('.spec_table, table');
              tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                  const headerCell = row.querySelector('th');
                  const dataCell = row.querySelector('td');

                  if (headerCell && dataCell) {
                    const header = headerCell.textContent?.trim() || '';
                    const data = dataCell.textContent?.trim() || '';

                    // More specific matching for school information
                    if (header.includes('小学校') || header.includes('学区') || header.includes('primary school')) {
                      if (!result.primary && data) {
                        // Extract just the school name if possible
                        const schoolMatch = data.match(primarySchoolPattern);
                        result.primary = schoolMatch ? schoolMatch[0].trim() : data;
                      }
                    }

                    if (header.includes('中学校') || (header.includes('学区') && header.includes('中')) || header.includes('junior high')) {
                      if (!result.juniorHigh && data) {
                        // Extract just the school name if possible
                        const schoolMatch = data.match(juniorHighSchoolPattern);
                        result.juniorHigh = schoolMatch ? schoolMatch[0].trim() : data;
                      }
                    }
                  }
                });
              });
            }

            // Clean up the extracted school names
            if (result.primary) {
              // If it contains urban planning info, it's likely not a school name
              if (result.primary.includes('都市計画') ||
                result.primary.includes('urban planning') ||
                result.primary.includes('coverage') ||
                result.primary.includes('volume rate')) {
                result.primary = null;
              }
            }

            if (result.juniorHigh) {
              // If it contains urban planning info, it's likely not a school name
              if (result.juniorHigh.includes('都市計画') ||
                result.juniorHigh.includes('urban planning') ||
                result.juniorHigh.includes('coverage') ||
                result.juniorHigh.includes('volume rate')) {
                result.juniorHigh = null;
              }
            }

          } catch (e) {
            console.error('Error extracting school districts:', e);
          }

          return result;
        });

        // Create enhanced listing object
        enhancedData[address] = {
          ...listing,
          address: address, // Explicitly set the address to ensure it's preserved
          coordinates,
          dates,
          aboutProperty,
          listingImages,
          facilities,
          schools,
          original: {
            ...listing.original,
            address: address // Make sure address is also set in original
          }
        };

        // Close the page to free up memory
        await page.close();

        successCount++;
      } catch (error) {
        console.error(`Error processing listing ${address}:`, error);
        enhancedData[address] = { ...listing }; // Store original data in case of error
        errorCount++;
      }
    }

    // Close the browser
    await browser.close();

    console.log(`\nDetail page extraction complete!`);
    console.log(`Successfully processed: ${successCount}/${totalListings} listings`);
    if (errorCount > 0) {
      console.log(`Errors encountered: ${errorCount}/${totalListings} listings`);
    }

    return enhancedData;

  } catch (error) {
    console.error("Error in initProcessListingDetails:", error);
    return {};
  }
}

// Function to translate the enriched data values
export async function translateEnrichedData(listings: Record<string, EnhancedListing>, listingKeysToTranslate?: string[]) {
  try {
    console.log("Starting to translate enriched listing data...");

    // Filter to only the specified listing keys if provided
    let listingsToProcess: Record<string, EnhancedListing>;
    if (listingKeysToTranslate && listingKeysToTranslate.length > 0) {
      listingsToProcess = {};
      for (const key of listingKeysToTranslate) {
        if (listings[key]) {
          listingsToProcess[key] = listings[key];
        }
      }
      console.log(`Filtering translations to ${Object.keys(listingsToProcess).length} new listings`);
    } else {
      listingsToProcess = listings;
      console.log(`No filter provided - will translate all ${Object.keys(listings).length} listings`);
    }

    // Count total listings for progress tracking
    const totalListings = Object.keys(listingsToProcess).length;
    console.log(`Found ${totalListings} listings to translate`);

    let processedCount = 0;
    let translatedFieldsCount = 0;

    // Prepare arrays for batch translation
    const fieldsToTranslate: {
      listingKey: string;
      fieldType: string;
      fieldKey: string;
      originalText: string;
    }[] = [];

    // Collect all Japanese text that needs translation
    for (const [key, listing] of Object.entries<EnhancedListing>(listingsToProcess)) {
      // Check main listing fields
      if (listing.address && containsJapanese(listing.address)) {
        fieldsToTranslate.push({
          listingKey: key,
          fieldType: 'main',
          fieldKey: 'address',
          originalText: listing.address
        });
      }

      if (listing.tags && containsJapanese(listing.tags)) {
        fieldsToTranslate.push({
          listingKey: key,
          fieldType: 'main',
          fieldKey: 'tags',
          originalText: listing.tags
        });
      }

      if (listing.listingDetail && containsJapanese(listing.listingDetail)) {
        fieldsToTranslate.push({
          listingKey: key,
          fieldType: 'main',
          fieldKey: 'listingDetail',
          originalText: listing.listingDetail
        });
      }

      if (listing.layout && containsJapanese(listing.layout)) {
        fieldsToTranslate.push({
          listingKey: key,
          fieldType: 'main',
          fieldKey: 'layout',
          originalText: listing.layout
        });
      }

      if (listing.buildDate && containsJapanese(listing.buildDate)) {
        fieldsToTranslate.push({
          listingKey: key,
          fieldType: 'main',
          fieldKey: 'buildDate',
          originalText: listing.buildDate
        });
      }

      // Check facilities data
      if (listing.facilities) {
        if (listing.facilities.water && containsJapanese(listing.facilities.water)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'facilities',
            fieldKey: 'water',
            originalText: listing.facilities.water
          });
        }

        if (listing.facilities.gas && containsJapanese(listing.facilities.gas)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'facilities',
            fieldKey: 'gas',
            originalText: listing.facilities.gas
          });
        }

        if (listing.facilities.sewage && containsJapanese(listing.facilities.sewage)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'facilities',
            fieldKey: 'sewage',
            originalText: listing.facilities.sewage
          });
        }

        if (listing.facilities.greyWater && containsJapanese(listing.facilities.greyWater)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'facilities',
            fieldKey: 'greyWater',
            originalText: listing.facilities.greyWater
          });
        }
      }

      // Check school districts
      if (listing.schools) {
        if (listing.schools.primary && containsJapanese(listing.schools.primary)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'schools',
            fieldKey: 'primary',
            originalText: listing.schools.primary
          });
        }

        if (listing.schools.juniorHigh && containsJapanese(listing.schools.juniorHigh)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'schools',
            fieldKey: 'juniorHigh',
            originalText: listing.schools.juniorHigh
          });
        }
      }

      // Check dates
      if (listing.dates) {
        if (listing.dates.datePosted && containsJapanese(listing.dates.datePosted)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'dates',
            fieldKey: 'datePosted',
            originalText: listing.dates.datePosted
          });
        }

        if (listing.dates.dateRenovated && containsJapanese(listing.dates.dateRenovated)) {
          fieldsToTranslate.push({
            listingKey: key,
            fieldType: 'dates',
            fieldKey: 'dateRenovated',
            originalText: listing.dates.dateRenovated
          });
        }
      }
    }

    console.log(`Found ${fieldsToTranslate.length} fields that need translation`);

    // Process translations in batches
    const batchSize = 10;
    for (let i = 0; i < fieldsToTranslate.length; i += batchSize) {
      const batch = fieldsToTranslate.slice(i, i + batchSize);
      console.log(`Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fieldsToTranslate.length / batchSize)}`);

      // Translate each field in the batch
      for (const field of batch) {
        try {
          const listing = listings[field.listingKey];
          console.log(`Translating: ${field.fieldType} > ${field.fieldKey} for ${field.listingKey}`);

          // Perform translation
          const translatedText = await translateText(field.originalText);

          // Update the listing with the translated text based on field type
          if (field.fieldType === 'main') {
            // Apply translated text to the appropriate main field
            // Make sure to preserve original values
            if (!listing.original) {
              listing.original = {
                address: listing.address,
                tags: listing.tags,
                listingDetail: listing.listingDetail,
                price: String(listing.price),
                layout: listing.layout,
                buildDate: listing.buildDate
              };
            }

            switch (field.fieldKey) {
              case 'address':
                listing.address = translatedText;
                break;
              case 'tags':
                listing.tags = translatedText;
                break;
              case 'listingDetail':
                listing.listingDetail = translatedText;
                break;
              case 'layout':
                listing.layout = translatedText;
                break;
              case 'buildDate':
                listing.buildDate = translatedText;
                break;
            }
          }
          else if (field.fieldType === 'facilities') {
            // Ensure facilities object exists
            if (listing.facilities) {
              // Make a backup of the original value if it doesn't exist
              if (!listing.original.facilities) {
                listing.original.facilities = {
                  water: listing.facilities.water,
                  gas: listing.facilities.gas,
                  sewage: listing.facilities.sewage,
                  greyWater: listing.facilities.greyWater
                };
              }

              // Apply translated text to the appropriate field
              switch (field.fieldKey) {
                case 'water':
                  listing.facilities.water = translatedText;
                  break;
                case 'gas':
                  listing.facilities.gas = translatedText;
                  break;
                case 'sewage':
                  listing.facilities.sewage = translatedText;
                  break;
                case 'greyWater':
                  listing.facilities.greyWater = translatedText;
                  break;
              }
            }
          }
          else if (field.fieldType === 'schools') {
            // Ensure schools object exists
            if (listing.schools) {
              // Make a backup of the original value if it doesn't exist
              if (!listing.original.schools) {
                listing.original.schools = {
                  primary: listing.schools.primary,
                  juniorHigh: listing.schools.juniorHigh
                };
              }

              // Apply translated text to the appropriate field
              switch (field.fieldKey) {
                case 'primary':
                  listing.schools.primary = translatedText;
                  break;
                case 'juniorHigh':
                  listing.schools.juniorHigh = translatedText;
                  break;
              }
            }
          }
          else if (field.fieldType === 'dates') {
            // Ensure dates object exists
            if (listing.dates) {
              // Make a backup of the original value if it doesn't exist
              if (!listing.original.dates) {
                listing.original.dates = {
                  datePosted: listing.dates.datePosted,
                  dateRenovated: listing.dates.dateRenovated
                };
              }

              // Apply translated text to the appropriate field
              switch (field.fieldKey) {
                case 'datePosted':
                  listing.dates.datePosted = translatedText;
                  break;
                case 'dateRenovated':
                  listing.dates.dateRenovated = translatedText;
                  break;
              }
            }
          }

          translatedFieldsCount++;

          // Add a small delay between translations
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error translating ${field.fieldType} > ${field.fieldKey} for ${field.listingKey}:`, error);
        }
      }

      // Add delay between batches
      if (i + batchSize < fieldsToTranslate.length) {
        const batchDelay = 2000;
        console.log(`Waiting ${batchDelay}ms before next translation batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // Update processed count
      processedCount += batch.length;
      console.log(`Progress: ${processedCount}/${fieldsToTranslate.length} (${Math.round(processedCount / fieldsToTranslate.length * 100)}%)`);
    }

    // Save the translated data
    console.log("Saving translated data to translated_listings.json...");

    // Create a new object with translated address keys
    const translatedListings: Record<string, EnhancedListing> = {};
    const addressTranslations: Record<string, string> = {};

    // First, collect all address translations
    for (const [originalKey, listing] of Object.entries(listings)) {
      if (listing.address && listing.original && listing.original.address) {
        // Store the mapping between original Japanese address and translated address
        addressTranslations[listing.original.address] = listing.address;
      }
    }

    // Then create a new object with translated address keys
    for (const [originalKey, listing] of Object.entries(listings)) {
      // Use translated address as key if available, otherwise use original key
      const translatedKey = addressTranslations[originalKey] || originalKey;

      // Create a new listing object with the address field set to match the translatedKey
      const updatedListing = {
        ...listing,
        // Ensure address field matches the key
        address: translatedKey
      };

      translatedListings[translatedKey] = updatedListing;
    }

    console.log("Translation process complete!");
    console.log(`Total fields translated: ${translatedFieldsCount}`);
    return translatedListings;

  } catch (error) {
    console.error("Error in translateEnrichedData:", error);
  }
}




export async function scrapeAndTransformNewListings(options: { pages: number }): Promise<Record<string, any>> {
  try {
    const scrapedData = await scrapeAllListings(options);

    if (!scrapedData) {
      console.error("No data was scraped");
      return {};
    }

    const newListings = await compareAndGenerateNewListings(scrapedData);
    if (!newListings) {
      console.error("No new listings were generated");
      return {}
    }

    return newListings;
    
  } catch (error: any) {
    console.error("Error in scrapeAndTransformNewListings:", error);
    return error
  }
}



async function init() {
  try {
    console.log("Starting scraping process for all pages...");
    const scrapedData = await scrapeAllListings();

    if (!scrapedData) {
      console.error("No data was scraped");
      return;
    }

    // Transform the arrays into address-keyed objects
    const transformedData: Record<string, any> = {};

    // Use addresses as keys
    for (let i = 0; i < scrapedData.addresses.length; i++) {
      const address = scrapedData.addresses[i];

      // Skip entries with no address
      if (!address) continue;

      // Use a unique key if there are duplicate addresses (add counter)
      let key = address;
      let counter = 1;
      while (transformedData[key]) {
        counter++;
        key = `${address} (${counter})`;
      }

      // Create an object for each listing
      transformedData[key] = {
        tags: scrapedData.tags[i] || "",
        listingDetail: scrapedData.listingDetail[i] || "",
        price: scrapedData.prices[i] || 0,
        layout: scrapedData.layout[i] || "",
        buildSqMeters: scrapedData.buildSqMeters[i] || "",
        landSqMeters: scrapedData.landSqMeters[i] || "",
        listingDetailUrl: scrapedData.listingDetailUrl[i] || "",
        buildDate: scrapedData.buildDate[i] || "",
        isSold: scrapedData.isSold[i] || false,
        original: {
          address: scrapedData.original.addresses[i] || "",
          tags: scrapedData.original.tags[i] || "",
          listingDetail: scrapedData.original.listingDetail[i] || "",
          price: scrapedData.original.prices[i] || "",
          layout: scrapedData.original.layout[i] || "",
          buildDate: scrapedData.original.buildDate[i] || ""
        }
      };
    }

    // Write the transformed JSON data to a file
    await fs.promises.writeFile(
      "new_output.json",
      JSON.stringify(transformedData, null, 2),
      "utf-8",
    );

    console.log("Data successfully written to new_output.json");
    console.log(`Total listings: ${Object.keys(transformedData).length}`);

    // Check if we should automatically proceed to enrich the data
    console.log("AUTO_ENRICH is set to true, proceeding to enrich listing details...");
    await initProcessListingDetails(transformedData);
    console.log("Enrichment complete!");
  } catch (error) {
    console.error("Error writing to file:", error);
  }
}

/**
 * Test a single detail page extraction
 * @param urlOrPath URL or local file path to test
 */
async function testSingleDetailPage(urlOrPath: string) {
  console.log(`Testing detail page extraction for: ${urlOrPath}`);

  let browser;
  try {
    // Launch Puppeteer with security arguments
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
    });

    // Create a new page
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // Only log console errors, not all messages
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Could not find element')) {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });

    // Block unnecessary scripts
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      // Block Facebook and other social media scripts that cause console errors
      if (url.includes('facebook.com') ||
        url.includes('fbcdn.net') ||
        url.includes('fb.com') ||
        url.includes('facebook.net') ||
        url.includes('twitter.com') ||
        url.includes('connect.facebook')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Check if the input is a URL or a local file path
    const isUrl = urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');

    if (isUrl) {
      // If it's a URL, navigate to it
      console.log(`Navigating to URL...`);
      await page.goto(urlOrPath, {
        waitUntil: "networkidle0",
        timeout: 60000
      });

      // Wait for any dynamically loaded content
      await page.waitForTimeout(5000);
    } else {
      // If it's a local file path, read the file and set content
      console.log(`Reading local file...`);
      const html = await fs.promises.readFile(urlOrPath, 'utf-8');
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for any dynamic content
      await page.waitForTimeout(2000);
    }

    console.log("Page loaded, extracting data...");

    // Take a screenshot for debugging, but only save if there are extraction issues
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    // Extract data from the page
    const extractedResult = {
      url: urlOrPath,

      coordinates: await page.evaluate(() => {
        try {
          // Try multiple methods to find coordinates

          // 1. Look for iframe.detail-googlemap (primary method from latitude-longitude.ts)
          const mapIframe = document.querySelector('iframe.detail-googlemap');
          if (mapIframe) {
            const src = mapIframe.getAttribute('src') || '';
            const coordMatch = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordMatch && coordMatch[1] && coordMatch[2]) {
              return {
                lat: parseFloat(coordMatch[1]),
                long: parseFloat(coordMatch[2])
              };
            }
          }

          // 2. Look for map_canvas which contains Google Maps data
          const mapCanvas = document.querySelector('#map_canvas');
          if (mapCanvas) {
            // Try to find coordinates in inline scripts
            const scripts = document.querySelectorAll('script');

            for (const script of scripts) {
              const content = script.textContent || '';
              if (content.includes('bukken_lat') || content.includes('bukken_lng')) {
                // Extract lat/lng from script content
                const latMatch = content.match(/bukken_lat\s*=\s*['"]*(-?\d+\.\d+)/);
                const lngMatch = content.match(/bukken_lng\s*=\s*['"]*(-?\d+\.\d+)/);

                if (latMatch && lngMatch) {
                  return {
                    lat: parseFloat(latMatch[1]),
                    long: parseFloat(lngMatch[1])
                  };
                }
              }

              // Alternative format in script variables
              const latVar = content.match(/lat\s*[:=]\s*(-?\d+\.\d+)/);
              const lngVar = content.match(/lng\s*[:=]\s*(-?\d+\.\d+)/) || content.match(/long\s*[:=]\s*(-?\d+\.\d+)/);

              if (latVar && lngVar) {
                return {
                  lat: parseFloat(latVar[1]),
                  long: parseFloat(lngVar[1])
                };
              }
            }

            // Check for data attributes on the map element
            const dataLat = mapCanvas.getAttribute('data-lat');
            const dataLng = mapCanvas.getAttribute('data-lng') || mapCanvas.getAttribute('data-long');

            if (dataLat && dataLng) {
              return {
                lat: parseFloat(dataLat),
                long: parseFloat(dataLng)
              };
            }
          }

          // 3. Look for any Google Maps iframe as fallback
          const anyMapIframe = document.querySelector('iframe[src*="maps.google"]');
          if (anyMapIframe) {
            const src = anyMapIframe.getAttribute('src') || '';
            const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
              src.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);

            if (match) {
              return {
                lat: parseFloat(match[1]),
                long: parseFloat(match[2])
              };
            }
          }

          // 4. Search in canonical URLs
          const canonicalLink = document.querySelector('link[rel="canonical"]');
          if (canonicalLink) {
            const href = canonicalLink.getAttribute('href') || '';
            const coordMatch = href.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordMatch) {
              return {
                lat: parseFloat(coordMatch[1]),
                long: parseFloat(coordMatch[2])
              };
            }
          }

          // No coordinates found
          return {
            lat: null,
            long: null
          };
        } catch (e) {
          return {
            lat: null,
            long: null
          };
        }
      }),

      dates: await page.evaluate(() => {
        const result: {
          datePosted: string | null;
          dateRenovated: string | null;
        } = {
          datePosted: null,
          dateRenovated: null
        };

        try {
          // Look for date information in all text on the page
          const pageContent = document.body.textContent || '';

          // Look for specific posting date format: YYYY.MM.DD掲載
          const postingDateRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})掲載/;
          const postingMatch = pageContent.match(postingDateRegex);
          if (postingMatch) {
            result.datePosted = postingMatch[0];
          }

          // If not found with the specific format, continue with other formats
          if (!result.datePosted) {
            // Look for date patterns in Japanese format (YYYY年MM月DD日)
            const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
            const matches = pageContent.match(dateRegex);

            if (matches && matches.length > 0) {
              // Find dates near specific keywords
              const paragraphs = document.querySelectorAll('p, div, span, li');

              paragraphs.forEach(element => {
                const text = element.textContent || '';

                // Check for renovation date
                if (text.includes('リフォーム') ||
                  text.includes('改装') ||
                  text.includes('renovation')) {
                  const match = text.match(dateRegex);
                  if (match) {
                    result.dateRenovated = match[0];
                  }
                }

                // Check for posting date
                if (text.includes('掲載日') ||
                  text.includes('登録日') ||
                  text.includes('posted')) {
                  const match = text.match(dateRegex);
                  if (match) {
                    result.datePosted = match[0];
                  }
                }
              });
            }
          }

          // If still no dates found, look in tables
          if (!result.datePosted && !result.dateRenovated) {
            const tables = document.querySelectorAll('.spec_table, table');
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              rows.forEach(row => {
                const headerCell = row.querySelector('th');
                const dataCell = row.querySelector('td');

                if (headerCell && dataCell) {
                  const header = headerCell.textContent?.trim() || '';
                  const data = dataCell.textContent?.trim() || '';

                  // Look for posting date
                  if (header.includes('掲載日') || header.includes('登録日')) {
                    result.datePosted = data;
                  }

                  // Look for renovation date
                  if (header.includes('リフォーム') || header.includes('改装') || header.includes('renovation')) {
                    result.dateRenovated = data;
                  }
                }
              });
            });
          }
        } catch (e) {
          // Silent error
        }

        return result;
      }),

      aboutProperty: await page.evaluate(() => {
        let result = null;

        try {
          // Try meta description first
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            const content = metaDescription.getAttribute('content');
            if (content && content.length > 10) {
              return content;
            }
          }

          // Look for main content areas
          const contentSelectors = [
            '.property_detail', '.detail_main', '.detail-content',
            'article', 'main', '.main-content'
          ];

          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent?.trim();
              if (text && text.length > 50) {
                return text;
              }
            }
          }

          // Fallback to specification tables
          const tables = document.querySelectorAll('.spec_table, table');
          if (tables.length > 0) {
            let tableTexts: string[] = [];
            tables.forEach(table => {
              tableTexts.push(table.textContent?.trim() || '');
            });
            return tableTexts.filter(Boolean).join('\n');
          }
        } catch (e) {
          // Silent error
        }

        return result;
      }),

      listingImages: await extractListingImagesFromPage(page),

      facilities: await page.evaluate(() => {
        const result: {
          water: string | null;
          gas: string | null;
          sewage: string | null;
          greyWater: string | null;
        } = {
          water: null,
          gas: null,
          sewage: null,
          greyWater: null
        };

        try {
          // Get the entire page text to search for keywords
          const pageText = document.body.textContent || '';

          // Water
          if (pageText.includes('公営水道') || pageText.includes('public water')) {
            result.water = '公営水道';
          } else if (pageText.includes('井戸') || pageText.includes('well water')) {
            result.water = '井戸';
          }

          // Gas
          if (pageText.includes('都市ガス') || pageText.includes('city gas')) {
            result.gas = '都市ガス';
          } else if (pageText.includes('プロパン') || pageText.includes('propane')) {
            result.gas = 'プロパン';
          }

          // Sewage
          if (pageText.includes('公共下水') || pageText.includes('public sewage')) {
            result.sewage = '公共下水';
          } else if (pageText.includes('浄化槽') || pageText.includes('septic')) {
            result.sewage = '浄化槽';
          }

          // Look in tables for more specific information
          const tables = document.querySelectorAll('.spec_table, table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const headerCell = row.querySelector('th');
              const dataCell = row.querySelector('td');

              if (headerCell && dataCell) {
                const header = headerCell.textContent?.trim() || '';
                const data = dataCell.textContent?.trim() || '';

                // Match Japanese terms for utilities
                if (header.includes('水道') || header.includes('給水')) {
                  result.water = data;
                }
                if (header.includes('ガス')) {
                  result.gas = data;
                }
                if (header.includes('排水') || header.includes('下水')) {
                  result.sewage = data;
                }
                if (header.includes('雑排水') || header.includes('grey water')) {
                  result.greyWater = data;
                }
              }
            });
          });
        } catch (e) {
          // Silent error
        }

        return result;
      }),

      schools: await page.evaluate(() => {
        const result: {
          primary: string | null;
          juniorHigh: string | null;
        } = {
          primary: null,
          juniorHigh: null
        };

        try {
          // Get the entire page text
          const pageText = document.body.textContent || '';

          // Try to find school information in the text
          const primaryMatch = pageText.match(/小学校[：:]\s*([^\n\r,\.。]+)/) ||
            pageText.match(/小学校区[：:]\s*([^\n\r,\.。]+)/);
          if (primaryMatch && primaryMatch[1]) {
            result.primary = primaryMatch[1].trim();
          }

          const juniorMatch = pageText.match(/中学校[：:]\s*([^\n\r,\.。]+)/) ||
            pageText.match(/中学校区[：:]\s*([^\n\r,\.。]+)/);
          if (juniorMatch && juniorMatch[1]) {
            result.juniorHigh = juniorMatch[1].trim();
          }

          // Look in tables for more specific information
          const tables = document.querySelectorAll('.spec_table, table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const headerCell = row.querySelector('th');
              const dataCell = row.querySelector('td');

              if (headerCell && dataCell) {
                const header = headerCell.textContent?.trim() || '';
                const data = dataCell.textContent?.trim() || '';

                // Match Japanese terms for schools
                if (header.includes('小学校')) {
                  result.primary = data;
                }
                if (header.includes('中学校')) {
                  result.juniorHigh = data;
                }
              }
            });
          });
        } catch (e) {
          // Silent error
        }

        return result;
      })
    };

    // Translate Japanese content to English
    const translatedDetails = {
      ...extractedResult
    };

    // Translate aboutProperty if it exists
    if (extractedResult.aboutProperty) {
      try {
        translatedDetails.aboutProperty = await translateText(extractedResult.aboutProperty);
        console.log(`Translated aboutProperty text (${extractedResult.aboutProperty.length} chars)`);
      } catch (error) {
        console.log("Could not translate aboutProperty text, using original");
      }
    }

    // Translate facilities
    const translatedFacilities = {
      water: null as string | null,
      gas: null as string | null,
      sewage: null as string | null,
      greyWater: null as string | null
    };

    for (const [key, value] of Object.entries(extractedResult.facilities)) {
      if (value) {
        try {
          translatedFacilities[key as keyof typeof translatedFacilities] = await translateText(value);
        } catch (error) {
          translatedFacilities[key as keyof typeof translatedFacilities] = value;
        }
      }
    }

    // Translate schools
    const translatedSchools = {
      primary: null as string | null,
      juniorHigh: null as string | null
    };

    if (extractedResult.schools.primary) {
      try {
        translatedSchools.primary = await translateText(extractedResult.schools.primary);
      } catch (error) {
        translatedSchools.primary = extractedResult.schools.primary;
      }
    }

    if (extractedResult.schools.juniorHigh) {
      try {
        translatedSchools.juniorHigh = await translateText(extractedResult.schools.juniorHigh);
      } catch (error) {
        translatedSchools.juniorHigh = extractedResult.schools.juniorHigh;
      }
    }

    // Prepare final result with both translated and original data
    const result = {
      url: extractedResult.url,
      coordinates: extractedResult.coordinates,
      dates: extractedResult.dates,
      aboutProperty: translatedDetails.aboutProperty,
      listingImages: extractedResult.listingImages,
      facilities: translatedFacilities,
      schools: translatedSchools,
      original: {
        aboutProperty: extractedResult.aboutProperty,
        facilities: extractedResult.facilities,
        schools: extractedResult.schools
      }
    };

    // Log a concise summary of what was extracted
    const extractionSummary = {
      coordinates: result.coordinates.lat && result.coordinates.long ?
        `${result.coordinates.lat.toFixed(5)}, ${result.coordinates.long.toFixed(5)}` : 'Not found',
      dates: {
        posted: result.dates.datePosted || 'Not found',
        renovated: result.dates.dateRenovated || 'Not found'
      },
      aboutProperty: result.aboutProperty ? `${result.aboutProperty.substring(0, 50)}...` : 'Not found',
      images: result.listingImages.length,
      facilities: result.facilities,
      schools: result.schools
    };

    console.log('Extraction summary:');
    console.log(JSON.stringify(extractionSummary, null, 2));

    // Save screenshot only if coordinate extraction failed
    if (!result.coordinates.lat || !result.coordinates.long) {
      await fs.promises.writeFile('page-before-extraction.png', screenshotBuffer);
      console.log("Saved screenshot to page-before-extraction.png due to missing coordinates");
    }

    // Save the result to a file
    await fs.promises.writeFile('test_detail_page.json', JSON.stringify(result, null, 2), 'utf8');
    console.log(`Test complete. Results saved to test_detail_page.json`);
  } catch (error) {
    console.error('Error during detail page test:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

/**
 * Test processing a batch of listing details from new_output.json
 * @param maxEntries Maximum number of entries to process (default: all entries)
 * @param concurrency Number of parallel requests (default: 3)
 * @param maxRetries Maximum number of retries per request (default: 3)
 */
async function testBatchDetailPages(maxEntries = 0, concurrency = 3, maxRetries = 3) {
  console.log(`Testing batch detail page scraping${maxEntries > 0 ? ` for up to ${maxEntries} entries` : ' for all entries'}`);
  console.log(`Using concurrency: ${concurrency}, max retries: ${maxRetries}`);

  let browser: puppeteer.Browser | null = null;
  try {
    // Read data from new_output.json
    console.log("Reading new_output.json...");
    const newOutputPath = path.join(process.cwd(), 'new_output.json');
    const fileData = await fs.promises.readFile(newOutputPath, 'utf8');
    const outputData = JSON.parse(fileData);

    if (!outputData || typeof outputData !== 'object') {
      throw new Error("Invalid data format in new_output.json. Expected an object.");
    }

    // Define listing type based on EnhancedListing interface
    type Listing = {
      tags: string;
      listingDetail: string;
      price: number;
      layout: string;
      buildSqMeters: string;
      landSqMeters: string;
      listingDetailUrl: string;
      buildDate: string;
      isSold: boolean;
      original: {
        address: string;
        tags: string;
        listingDetail: string;
        price: string;
        layout: string;
        buildDate: string;
      };
    };

    // Convert object to array of entries using Object.values() with type annotation
    const entriesArray = Object.values(outputData) as Listing[];
    console.log(`Found ${entriesArray.length} entries in new_output.json`);

    // Limit to the specified number of entries or process all if maxEntries is 0
    const entriesToProcess = maxEntries > 0 ? entriesArray.slice(0, maxEntries) : entriesArray;
    console.log(`Processing ${entriesToProcess.length} entries...`);

    // Initialize result object indexed by English address
    const results: Record<string, any> = {};

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
    });

    let successCount = 0;
    let errorCount = 0;
    let retryCount = 0;

    // Semaphore for managing concurrency
    class Semaphore {
      private permits: number;
      private waiting: Array<() => void> = [];

      constructor(permits: number) {
        this.permits = permits;
      }

      async acquire(): Promise<void> {
        if (this.permits > 0) {
          this.permits--;
          return Promise.resolve();
        }

        return new Promise<void>(resolve => {
          this.waiting.push(resolve);
        });
      }

      release(): void {
        if (this.waiting.length > 0) {
          const resolve = this.waiting.shift()!;
          resolve();
        } else {
          this.permits++;
        }
      }
    }

    const semaphore = new Semaphore(concurrency);

    // Function to process a single entry with retry logic
    async function processEntry(entry: Listing, index: number): Promise<void> {
      if (!entry.listingDetailUrl) {
        console.log(`Entry #${index + 1} has no detail URL, skipping.`);
        errorCount++;
        return;
      }

      // Get the address to use as a key in results
      const addressKey = Object.keys(outputData).find(key =>
        outputData[key as keyof typeof outputData] === entry
      ) || `entry_${index}`;

      // Acquire semaphore permit
      await semaphore.acquire();

      // Implement retry with exponential backoff
      let currentTry = 0;
      let lastError: any = null;

      while (currentTry < maxRetries) {
        let page: puppeteer.Page | null = null;

        try {
          console.log(`[${index + 1}/${entriesToProcess.length}] Processing: ${entry.listingDetailUrl} (try ${currentTry + 1}/${maxRetries})`);

          // Create a new page for each request
          page = await browser!.newPage();
          page.setDefaultNavigationTimeout(60000 * (currentTry + 1)); // Increase timeout with each retry

          // Only log console errors, not all messages
          page.on('console', (msg: puppeteer.ConsoleMessage) => {
            if (msg.type() === 'error' && !msg.text().includes('Could not find element')) {
              console.log(`Browser console error: ${msg.text()}`);
            }
          });

          // Block unnecessary scripts
          await page.setRequestInterception(true);
          page.on('request', (request: puppeteer.HTTPRequest) => {
            const url = request.url();
            // Block Facebook and other social media scripts that cause console errors
            if (url.includes('facebook.com') ||
              url.includes('fbcdn.net') ||
              url.includes('fb.com') ||
              url.includes('facebook.net') ||
              url.includes('twitter.com') ||
              url.includes('connect.facebook')) {
              request.abort();
            } else {
              request.continue();
            }
          });

          // Navigate to the page with exponential backoff on timeout
          try {
            await page.goto(entry.listingDetailUrl, {
              waitUntil: "networkidle0",
              timeout: 60000 * (currentTry + 1)
            });
          } catch (navigationError: unknown) {
            // If navigation times out, retry with backoff
            if (navigationError instanceof Error &&
              navigationError.name === 'TimeoutError' &&
              currentTry < maxRetries - 1) {
              console.log(`Navigation timeout for: ${entry.listingDetailUrl}, will retry...`);
              await page.close();
              page = null;

              // Exponential backoff
              const backoffTime = Math.pow(2, currentTry) * 1000; // 1s, 2s, 4s, 8s...
              console.log(`Backing off for ${backoffTime}ms before retry ${currentTry + 2}...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));

              currentTry++;
              retryCount++;
              continue;
            } else {
              // If it's not a timeout error or we've reached max retries, rethrow
              throw navigationError;
            }
          }

          // Wait for any dynamic content
          await page.waitForTimeout(3000);

          // Extract raw data
          const extractedDetails = {
            coordinates: await page.evaluate(() => {
              const result: { lat: number | null; long: number | null } = {
                lat: null,
                long: null
              };

              try {
                // Try iframe.detail-googlemap first (from latitude-longitude.ts)
                const detailGooglemap = document.querySelector('iframe.detail-googlemap');
                if (detailGooglemap) {
                  const src = detailGooglemap.getAttribute('src') || '';
                  const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                  if (match) {
                    result.lat = parseFloat(match[1]);
                    result.long = parseFloat(match[2]);
                    return result;
                  }
                }

                // Try #map_canvas
                const mapCanvas = document.querySelector('#map_canvas');
                if (mapCanvas) {
                  // Check for inline scripts with coordinates
                  const scripts = document.querySelectorAll('script');
                  for (const script of scripts) {
                    const content = script.textContent || '';
                    // Look for various patterns of coordinate initialization
                    const latMatch = content.match(/lat\s*[:=]\s*(-?\d+\.\d+)/);
                    const lngMatch = content.match(/lng\s*[:=]\s*(-?\d+\.\d+)/) || content.match(/long\s*[:=]\s*(-?\d+\.\d+)/);

                    if (latMatch && lngMatch) {
                      result.lat = parseFloat(latMatch[1]);
                      result.long = parseFloat(lngMatch[1]);
                      return result;
                    }
                  }

                  // Check for data attributes
                  const lat = mapCanvas.getAttribute('data-lat');
                  const lng = mapCanvas.getAttribute('data-lng') || mapCanvas.getAttribute('data-long');

                  if (lat && lng) {
                    result.lat = parseFloat(lat);
                    result.long = parseFloat(lng);
                    return result;
                  }
                }

                // Try any Google Maps iframe as fallback
                const mapIframe = document.querySelector('iframe[src*="maps.google"]');
                if (mapIframe) {
                  const src = mapIframe.getAttribute('src') || '';
                  const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                  if (match) {
                    result.lat = parseFloat(match[1]);
                    result.long = parseFloat(match[2]);
                    return result;
                  }
                }
              } catch (e) {
                // Silent error - will just return null coordinates
              }

              return result;
            }),

            dates: await page.evaluate(() => {
              const result: {
                datePosted: string | null;
                dateRenovated: string | null;
              } = {
                datePosted: null,
                dateRenovated: null
              };

              try {
                // Look for date information in all text on the page
                const pageContent = document.body.textContent || '';

                // Look for specific posting date format: YYYY.MM.DD掲載
                const postingDateRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})掲載/;
                const postingMatch = pageContent.match(postingDateRegex);
                if (postingMatch) {
                  result.datePosted = postingMatch[0];
                }

                // If not found with the specific format, continue with other formats
                if (!result.datePosted) {
                  // Look for date patterns in Japanese format (YYYY年MM月DD日)
                  const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
                  const matches = pageContent.match(dateRegex);

                  if (matches && matches.length > 0) {
                    // Find dates near specific keywords
                    const paragraphs = document.querySelectorAll('p, div, span, li');

                    paragraphs.forEach(element => {
                      const text = element.textContent || '';

                      // Check for renovation date
                      if (text.includes('リフォーム') ||
                        text.includes('改装') ||
                        text.includes('renovation')) {
                        const match = text.match(dateRegex);
                        if (match) {
                          result.dateRenovated = match[0];
                        }
                      }

                      // Check for posting date
                      if (text.includes('掲載日') ||
                        text.includes('登録日') ||
                        text.includes('posted')) {
                        const match = text.match(dateRegex);
                        if (match) {
                          result.datePosted = match[0];
                        }
                      }
                    });
                  }
                }

                // Try alternative date formats
                if (!result.datePosted) {
                  const westernDateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}/g;
                  const paragraphs = document.querySelectorAll('p, div, span, li');

                  paragraphs.forEach(element => {
                    const text = element.textContent || '';
                    if (text.includes('掲載日') || text.includes('登録日') || text.includes('posted')) {
                      const match = text.match(westernDateRegex);
                      if (match) {
                        result.datePosted = match[0];
                      }
                    }
                  });
                }

                // If still no dates found, look in tables
                if (!result.datePosted && !result.dateRenovated) {
                  const tables = document.querySelectorAll('.spec_table, table');
                  tables.forEach(table => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                      const headerCell = row.querySelector('th');
                      const dataCell = row.querySelector('td');

                      if (headerCell && dataCell) {
                        const header = headerCell.textContent?.trim() || '';
                        const data = dataCell.textContent?.trim() || '';

                        // Look for posting date
                        if (header.includes('掲載日') || header.includes('登録日')) {
                          result.datePosted = data;
                        }

                        // Look for renovation date
                        if (header.includes('リフォーム') || header.includes('改装') || header.includes('renovation')) {
                          result.dateRenovated = data;
                        }
                      }
                    });
                  });
                }
              } catch (e) {
                // Silent error - will just return null dates
              }

              return result;
            }),

            aboutProperty: await page.evaluate(() => {
              let result = null;

              try {
                // Try meta description first
                const metaDescription = document.querySelector('meta[name="description"]');
                if (metaDescription) {
                  const content = metaDescription.getAttribute('content');
                  if (content && content.length > 10) {
                    return content;
                  }
                }

                // Look for main content areas
                const contentSelectors = [
                  '.property_detail', '.detail_main', '.detail-content',
                  'article', 'main', '.main-content'
                ];

                for (const selector of contentSelectors) {
                  const element = document.querySelector(selector);
                  if (element) {
                    const text = element.textContent?.trim();
                    if (text && text.length > 50) {
                      return text;
                    }
                  }
                }

                // Fallback to specification tables
                const tables = document.querySelectorAll('.spec_table, table');
                if (tables.length > 0) {
                  let tableTexts: string[] = [];
                  tables.forEach(table => {
                    tableTexts.push(table.textContent?.trim() || '');
                  });
                  return tableTexts.filter(Boolean).join('\n');
                }
              } catch (e) {
                // Silent error
              }

              return result;
            }),

            listingImages: await extractListingImagesFromPage(page),

            facilities: await page.evaluate(() => {
              const result: {
                water: string | null;
                gas: string | null;
                sewage: string | null;
                greyWater: string | null;
              } = {
                water: null,
                gas: null,
                sewage: null,
                greyWater: null
              };

              try {
                // Get the entire page text to search for keywords
                const pageText = document.body.textContent || '';

                // Water
                if (pageText.includes('公営水道') || pageText.includes('public water')) {
                  result.water = '公営水道';
                } else if (pageText.includes('井戸') || pageText.includes('well water')) {
                  result.water = '井戸';
                }

                // Gas
                if (pageText.includes('都市ガス') || pageText.includes('city gas')) {
                  result.gas = '都市ガス';
                } else if (pageText.includes('プロパン') || pageText.includes('propane')) {
                  result.gas = 'プロパン';
                }

                // Sewage
                if (pageText.includes('公共下水') || pageText.includes('public sewage')) {
                  result.sewage = '公共下水';
                } else if (pageText.includes('浄化槽') || pageText.includes('septic')) {
                  result.sewage = '浄化槽';
                }

                // Look in tables for more specific information
                const tables = document.querySelectorAll('.spec_table, table');
                tables.forEach(table => {
                  const rows = table.querySelectorAll('tr');
                  rows.forEach(row => {
                    const headerCell = row.querySelector('th');
                    const dataCell = row.querySelector('td');

                    if (headerCell && dataCell) {
                      const header = headerCell.textContent?.trim() || '';
                      const data = dataCell.textContent?.trim() || '';

                      // Match Japanese terms for utilities
                      if (header.includes('水道') || header.includes('給水')) {
                        result.water = data;
                      }
                      if (header.includes('ガス')) {
                        result.gas = data;
                      }
                      if (header.includes('排水') || header.includes('下水')) {
                        result.sewage = data;
                      }
                      if (header.includes('雑排水') || header.includes('grey water')) {
                        result.greyWater = data;
                      }
                    }
                  });
                });
              } catch (e) {
                // Silent error
              }

              return result;
            }),

            schools: await page.evaluate(() => {
              const result: {
                primary: string | null;
                juniorHigh: string | null;
              } = {
                primary: null,
                juniorHigh: null
              };

              try {
                // Get the entire page text
                const pageText = document.body.textContent || '';

                // Try to find school information in the text
                const primaryMatch = pageText.match(/小学校[：:]\s*([^\n\r,\.。]+)/) ||
                  pageText.match(/小学校区[：:]\s*([^\n\r,\.。]+)/);
                if (primaryMatch && primaryMatch[1]) {
                  result.primary = primaryMatch[1].trim();
                }

                const juniorMatch = pageText.match(/中学校[：:]\s*([^\n\r,\.。]+)/) ||
                  pageText.match(/中学校区[：:]\s*([^\n\r,\.。]+)/);
                if (juniorMatch && juniorMatch[1]) {
                  result.juniorHigh = juniorMatch[1].trim();
                }

                // Look in tables for more specific information
                const tables = document.querySelectorAll('.spec_table, table');
                tables.forEach(table => {
                  const rows = table.querySelectorAll('tr');
                  rows.forEach(row => {
                    const headerCell = row.querySelector('th');
                    const dataCell = row.querySelector('td');

                    if (headerCell && dataCell) {
                      const header = headerCell.textContent?.trim() || '';
                      const data = dataCell.textContent?.trim() || '';

                      // Match Japanese terms for schools
                      if (header.includes('小学校')) {
                        result.primary = data;
                      }
                      if (header.includes('中学校')) {
                        result.juniorHigh = data;
                      }
                    }
                  });
                });
              } catch (e) {
                // Silent error
              }

              return result;
            })
          };

          // Close the page to free up memory
          await page.close();
          page = null;

          // Translate Japanese content to English with retry
          const translatedDetails = { ...extractedDetails };

          const translateWithRetry = async (text: string, retries = 2): Promise<string> => {
            let attempt = 0;
            while (attempt <= retries) {
              try {
                if (!text || typeof text !== 'string') {
                  return text || '';
                }
                return await translateText(text);
              } catch (error: unknown) {
                if (attempt === retries) return text; // Use original on final failure
                attempt++;
                await new Promise(r => setTimeout(r, 1000 * attempt));
              }
            }
            return text || ''; // Fallback to original
          };

          // Translate aboutProperty
          if (extractedDetails.aboutProperty) {
            translatedDetails.aboutProperty = await translateWithRetry(extractedDetails.aboutProperty);
          }

          // Translate facilities
          const translatedFacilities = {
            water: null as string | null,
            gas: null as string | null,
            sewage: null as string | null,
            greyWater: null as string | null
          };

          for (const [key, value] of Object.entries(extractedDetails.facilities)) {
            if (value) {
              translatedFacilities[key as keyof typeof translatedFacilities] =
                await translateWithRetry(value);
            }
          }

          // Translate schools
          const translatedSchools = {
            primary: null as string | null,
            juniorHigh: null as string | null
          };

          if (extractedDetails.schools.primary) {
            translatedSchools.primary = await translateWithRetry(extractedDetails.schools.primary);
          }

          if (extractedDetails.schools.juniorHigh) {
            translatedSchools.juniorHigh = await translateWithRetry(extractedDetails.schools.juniorHigh);
          }

          // Store the result
          const detailResult = {
            ...entry as Listing,
            coordinates: extractedDetails.coordinates,
            dates: extractedDetails.dates,
            aboutProperty: translatedDetails.aboutProperty,
            listingImages: extractedDetails.listingImages,
            facilities: translatedFacilities,
            schools: translatedSchools,
            original: {
              ...entry.original,
              aboutProperty: extractedDetails.aboutProperty,
              facilities: extractedDetails.facilities,
              schools: extractedDetails.schools
            }
          };

          results[addressKey] = detailResult;
          successCount++;
          console.log(`✓ Successfully processed listing: ${addressKey}`);

          // Save incremental results every 10 successful entries
          if (successCount % 10 === 0) {
            const tempPath = path.join(process.cwd(), 'batch_test_results_partial.json');
            await fs.promises.writeFile(tempPath, JSON.stringify(results, null, 2), 'utf8');
            console.log(`Saved partial results (${successCount} listings processed so far)`);
          }

          // Success, exit the retry loop
          break;
        } catch (error: unknown) {
          // Close page if still open
          if (page) {
            await page.close();
          }

          lastError = error;

          // If we haven't reached max retries, try again with backoff
          if (currentTry < maxRetries - 1) {
            const backoffTime = Math.pow(2, currentTry) * 1000; // 1s, 2s, 4s, 8s...
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`Error processing ${entry.listingDetailUrl}: ${errorMessage}`);
            console.log(`Retrying in ${backoffTime}ms (attempt ${currentTry + 2}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            currentTry++;
            retryCount++;
          } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to process listing ${index + 1} after ${maxRetries} attempts: ${errorMessage}`);
            errorCount++;
          }
        }
      }

      // Release semaphore permit to allow next request
      semaphore.release();
    }

    // Process all entries with concurrency control
    const promises = entriesToProcess.map((entry, index) => processEntry(entry, index));
    await Promise.all(promises);

    // Save the final results to a JSON file
    const outputPath = path.join(process.cwd(), 'batch_test_results.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');

    console.log(`\nBatch test complete. Processed ${entriesToProcess.length} listings.`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}, Retries: ${retryCount}`);
    console.log(`Results saved to: ${outputPath}`);

  } catch (error) {
    console.error("Error in batch test:", error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

// ... existing code ...

// Parse command line arguments
// if (process.argv.includes('--run-all')) {
//   console.log("Running full optimized workflow...");
//   runFullWorkflow();
// } else if (process.argv.includes('--init')) {
//   console.log("Initializing scraping process...");
//   init();
// } else if (process.argv.includes('--test-detail-page')) {
//   console.log("Testing detail page scraping...");
//   const urlIndex = process.argv.indexOf('--test-detail-page');
//   const url = process.argv[urlIndex + 1];
//   if (url) {
//     testSingleDetailPage(url);
//   } else {
//     console.error("Error: No URL provided for --test-detail-page");
//     console.log("Usage: node scrape-listings.ts --test-detail-page [URL]");
//   }
// } else if (process.argv.includes('--test-batch') || process.argv.includes('--batch-detail-pages')) {
//   console.log("Testing batch detail pages...");
//   const batchArg = process.argv.includes('--test-batch') ? '--test-batch' : '--batch-detail-pages';
//   const batchIndex = process.argv.indexOf(batchArg);

//   // Default values
//   let maxEntries = 5;
//   let concurrency = 3;
//   let maxRetries = 3;

//   // Extract batch size and input path if provided
//   const remainingArgs = process.argv.slice(batchIndex + 1);

//   // Check for maxEntries (first numerical argument)
//   if (remainingArgs.length > 0 && !isNaN(Number(remainingArgs[0]))) {
//     maxEntries = Number(remainingArgs[0]);
//   }

//   // Check for concurrency (second numerical argument)
//   if (remainingArgs.length > 1 && !isNaN(Number(remainingArgs[1]))) {
//     concurrency = Number(remainingArgs[1]);
//   }

//   // Check for maxRetries (third numerical argument)
//   if (remainingArgs.length > 2 && !isNaN(Number(remainingArgs[2]))) {
//     maxRetries = Number(remainingArgs[2]);
//   }

//   // Start the batch processing
//   testBatchDetailPages(maxEntries, concurrency, maxRetries);
// } else {
//   console.log("No specific command provided. Usage:");
//   console.log("  --run-all               Run the optimized workflow (scrape all, but only process new listings)");
//   console.log("  --init                  Initialize scraping process");
//   console.log("  --test-detail-page URL  Test scraping a specific detail page");
//   console.log("  --test-batch            Test batch detail pages scraping");
//   console.log("  --batch-detail-pages    Process detail pages in batch mode");
//   console.log("    Options:");
//   console.log("    [maxEntries]          Maximum number of entries to process (default: 5)");
//   console.log("    [concurrency]         Number of concurrent requests (default: 3)");
//   console.log("    [maxRetries]          Maximum retry attempts per request (default: 3)");
// }

// ... existing code ...

// Add this helper function for image extraction based on listing-images.ts
async function extractListingImagesFromPage(page: any) {
  try {
    // First try the specific slick-track approach from listing-images.ts
    const slickTrackImages = await page.evaluate(() => {
      const images: string[] = [];

      try {
        // This matches the approach in listing-images.ts
        const slickTracks = document.querySelectorAll('.slick-track');
        if (slickTracks.length > 0) {
          slickTracks.forEach((el) => {
            const imgElements = el.querySelectorAll('li > a > img');
            imgElements.forEach((img) => {
              const src = (img as HTMLImageElement).src;
              if (src && !images.includes(src)) {
                images.push(src);
              }
            });
          });
        }
      } catch (e) {
        console.error('Error extracting from slick-track:', e);
      }

      return images;
    });

    // If we found images using the slick-track approach, return them
    if (slickTrackImages.length > 0) {
      return slickTrackImages;
    }

    // Otherwise, fall back to other selectors
    return await page.evaluate(() => {
      const images: string[] = [];

      try {
        // Try other common selectors for image galleries
        const selectors = [
          '.asset_body img',
          '.gallery img',
          '.property-images img',
          '.slider img',
          '.carousel img',
          '.photo img',
          '.property-gallery img',
          '.listing-images img',
          // Add slick-related selectors as alternatives
          '.slick-slide img',
          '.slick-list img'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(img => {
              const src = (img as HTMLImageElement).src;
              if (src && !images.includes(src)) {
                images.push(src);
              }
            });

            if (images.length > 0) break;
          }
        }

        // If no images found with specific selectors, look for any reasonable image
        if (images.length === 0) {
          const allImages = document.querySelectorAll('img');
          allImages.forEach(img => {
            const src = (img as HTMLImageElement).src;
            // Only include images that are likely property photos (not icons, etc.)
            if (src &&
              (src.includes('/upload/') ||
                src.includes('/property/') ||
                src.includes('/listing/') ||
                src.includes('/images/')) &&
              !images.includes(src)) {
              images.push(src);
            }
          });
        }
      } catch (e) {
        console.error('Error extracting listing images:', e);
      }

      return images;
    });
  } catch (error) {
    console.error('Error in extractListingImagesFromPage:', error);
    return [];
  }
}

const CHAOS_DELETE_COUNT = 1;

export async function compareAndGenerateNewListings(scrapedData: any) {
    // Step 2: Load existing data and find new listings
    console.log('\n=== STEP 2: IDENTIFYING NEW LISTINGS ===');

    // Load existing data from batch_test_results.json
    let existingData: Record<string, any> = {};
    try {
      existingData = await readListings(true);
      console.log(`Loaded existing data with ${Object.keys(existingData).length} listings`);
    } catch (error) {
      console.warn("Could not load batch_test_results.json, assuming no existing data", error);
      return error
    }

    if (process.env.NODE_ENV === 'development' && process.env.CHAOS_MODE === 'true') {
      // delete 4 random properties from existingData
      const keys = Object.keys(existingData);
      if (keys.length > 1) {
        console.log(`CHAOS MODE: Randomly removing ${CHAOS_DELETE_COUNT} properties to simulate new listings`);
        for (let i = 0; i < CHAOS_DELETE_COUNT; i++) {
          const randomIndex = Math.floor(Math.random() * keys.length);
          const keyToDelete = keys.splice(randomIndex, 1)[0];
          console.log(`CHAOS MODE: Deleting property: ${keyToDelete}`);
          delete existingData[keyToDelete];
        }
      } else {
        console.log("CHAOS MODE: Not enough properties to delete");
      }
    }

    // Create a Set of original Japanese addresses for efficient lookup
    const existingJapaneseAddresses = new Set<string>();
    for (const key in existingData) {
      if (existingData[key].original && existingData[key].original.address) {
        existingJapaneseAddresses.add(existingData[key].original.address);
      }
    }
    console.log(`Found ${existingJapaneseAddresses.size} unique Japanese addresses in existing data`);

    // Transform the arrays into address-keyed objects, but only for NEW listings
    const transformedData: Record<string, any> = {};
    const newAddresses: string[] = [];
    const newAddressIndexes: number[] = [];

    // Identify new entries
    for (let i = 0; i < scrapedData.addresses.length; i++) {
      const address = scrapedData.addresses[i];
      if (!address) continue;

      // Check if this address is new
      if (!existingJapaneseAddresses.has(address)) {
        newAddresses.push(address);
        newAddressIndexes.push(i);

        // Create an object for each new listing
        let key = address;
        let counter = 1;
        while (transformedData[key]) {
          counter++;
          key = `${address} (${counter})`;
        }

        transformedData[key] = {
          tags: scrapedData.tags[i] || "",
          listingDetail: scrapedData.listingDetail[i] || "",
          price: scrapedData.prices[i] || 0,
          layout: scrapedData.layout[i] || "",
          buildSqMeters: scrapedData.buildSqMeters[i] || "",
          landSqMeters: scrapedData.landSqMeters[i] || "",
          listingDetailUrl: scrapedData.listingDetailUrl[i] || "",
          buildDate: scrapedData.buildDate[i] || "",
          isSold: scrapedData.isSold[i] || false,
          original: {
            address: scrapedData.original.addresses[i] || "",
            tags: scrapedData.original.tags[i] || "",
            listingDetail: scrapedData.original.listingDetail[i] || "",
            price: scrapedData.original.prices[i] || "",
            layout: scrapedData.original.layout[i] || "",
            buildDate: scrapedData.original.buildDate[i] || ""
          }
        };
      }
    }

    console.log(`\nFound ${newAddresses.length} new listings that weren't in the existing data.`);

    if (newAddresses.length === 0) {
      console.log("No new listings to process. Exiting workflow.");
      return {};
    }

    // Log the new addresses for reference
    console.log("New addresses:");
    newAddresses.forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });

    // Step 3: Write only new listings to new_output.json for detail processing
    console.log('\n=== STEP 3: PREPARING NEW LISTINGS FOR DETAIL PROCESSING ===');
    console.log('transformedData', transformedData);
    return transformedData
}

// Add this new function to run the optimized workflow
async function runFullWorkflow() {
  console.log('=== STARTING OPTIMIZED LISTING SCRAPE WORKFLOW ===');
  console.log('This will scrape all listings but only process NEW details');

  try {
    // Step 1: Scrape all listings from all pages
    console.log('\n=== STEP 1: SCRAPING ALL LISTINGS FROM ALL PAGES ===');
    const scrapedData = await scrapeAllListings();

    if (!scrapedData) {
      console.error("No data was scraped. Exiting workflow.");
      return;
    }

    console.log(`Total listings scraped: ${scrapedData.addresses.length}`);

    // Step 4: Process listing details (which includes translation)
    // This step will enrich the listings and translate them during the enrichment
    console.log('\n=== STEP 4: PROCESSING DETAILS FOR NEW LISTINGS (INCLUDES TRANSLATION) ===');

    try {
      // Process listing details with the transformed data directly
      const enrichedData = await initProcessListingDetails(transformedData);

      if (enrichedData) {
        // Step 4b: After enrichment and translation, copy the translated_listings.json back to new_output.json
        console.log('\n=== STEP 4b: COPYING TRANSLATED DATA TO NEW_OUTPUT.JSON ===');

        try {
          // Read the translated data (which now has translated address keys)
          const translatedDataRaw = await fs.promises.readFile("translated_listings.json", "utf-8");
          const translatedData = JSON.parse(translatedDataRaw);

          console.log(`Read ${Object.keys(translatedData).length} translated listings from translated_listings.json`);

          // Step 4c: Generate creative content for the listings
          console.log('\n=== STEP 4c: GENERATING CREATIVE CONTENT FOR LISTINGS ===');
          let enhancedData = translatedData;

          try {
            // Generate creative content for the listings
            enhancedData = await generateListingCreatives(translatedData);
            console.log(`Successfully generated creative content for listings`);
          } catch (error) {
            console.error("Error generating creative content:", error);
            console.log("Continuing with original translated data");
          }

          // Write the enhanced data back to new_output.json to be used in the merge
          await fs.promises.writeFile(
            "new_output.json",
            JSON.stringify(enhancedData, null, 2),
            "utf-8",
          );

          console.log(`Successfully updated new_output.json with enriched and creative content`);
        } catch (error) {
          console.error("Error processing translated data or generating creative content:", error);
        }
      }
    } catch (error) {
      console.error("Error processing listing details:", error);
    }

    // Step 5: Merge the enriched and translated results with batch_test_results.json
    console.log('\n=== STEP 5: MERGING WITH BATCH_TEST_RESULTS.JSON ===');
    try {
      const result = await mergeListings();
      if (result) {
        console.log(`Merge complete! Added ${result.addedCount}, updated ${result.updatedCount}, total: ${result.totalCount}`);
      } else {
        console.log('Merge complete, but no result statistics returned');
      }
    } catch (error) {
      console.error('Error running merge process:', error);
    }

    console.log('\n=== OPTIMIZED WORKFLOW COMPLETE ===');
    console.log(`Processed ${newAddresses.length} new listings and merged them into batch_test_results.json`);

  } catch (error) {
    console.error("Error in optimized workflow:", error);
  }
}

translate.engine = "google"; // Set translation engine to Google Translate
// translate.key = 'YOUR_GOOGLE_API_KEY'; // Optionally set your Google API key

/**
 * Generates creative content for listings using Anthropic API
 * @param listings Record of enriched and translated listings
 * @returns The enhanced listings with creative content added
 */
export async function generateListingCreatives(
  listings: Record<string, any>
): Promise<Record<string, any>> {
  console.log("\n=== GENERATING CREATIVE CONTENT FOR LISTINGS ===");

  if (Object.keys(listings).length === 0) {
    console.log("No listings to process for creative content generation");
    return listings;
  }

  try {
    console.log(`Generating creative content for ${Object.keys(listings).length} listings...`);

    // Create a pure copy of the listings to avoid mutation issues
    const enhancedListings = JSON.parse(JSON.stringify(listings));

    // Step 1: Generate property titles
    console.log("Generating property titles...");

    try {
      // Format listings for the title generator
      const propertyListingsForTitles = Object.entries(listings).map(([key, listing]: [string, any]) => {
        return {
          address: key,
          price: listing.price,
          layout: listing.layout,
          buildSqMeters: listing.buildSqMeters,
          landSqMeters: listing.landSqMeters,
          listingDetail: listing.listingDetail,
          buildDate: listing.buildDate,
          facilities: listing.facilities,
          schools: listing.schools,
          coordinates: listing.coordinates,
          aboutProperty: listing.aboutProperty,
          listingImages: listing.listingImages,
        };
      });

      // Import needed for dynamically importing the Anthropic API functions
      // const { generateTitles } = await import("../../../../server/anthropic/api");
      const { generateTitles } = {
        generateTitles: (a: any) => {
          return {
            titles: ["Title 1", "Title 2", "Title 3"]
          }
        }
      }

      // Generate titles
      const titleResponse = await generateTitles(propertyListingsForTitles);

      // Match titles with their respective listings
      if (titleResponse?.titles && titleResponse.titles.length === propertyListingsForTitles.length) {
        Object.keys(enhancedListings).forEach((key, index) => {
          if (!enhancedListings[key].creatives) {
            enhancedListings[key].creatives = {};
          }
          enhancedListings[key].creatives.propertyTitle = titleResponse.titles[index];
        });

        console.log(`Successfully generated ${titleResponse.titles.length} property titles`);
      } else {
        console.error("Title count mismatch with property count");
      }
    } catch (error) {
      console.error("Error generating titles:", error);
    }

    // Step 2: Generate captions and hashtags
    try {
      console.log("Generating property captions and hashtags...");

      // Import needed for dynamically importing the Anthropic API functions
      // const { generateBatchCaptions } = await import("../../../../server/anthropic/api");
      const { generateBatchCaptions } = {
        generateBatchCaptions: (a: any) => {
          return {
            captions: ["Caption 1", "Caption 2", "Caption 3"]
          }
        }
      }

      const captionResponse = await generateBatchCaptions(enhancedListings);

      // Add captions and hashtags to the respective listings
      for (const [address, content] of Object.entries(captionResponse)) {
        if (enhancedListings[address]) {
          if (!enhancedListings[address].creatives) {
            enhancedListings[address].creatives = {};
          }
          // Fix type conversion by properly handling the content
          if (Array.isArray(content)) {
            // Handle array case (defensive coding)
            enhancedListings[address].creatives.propertyCaption = content[0] || '';
            enhancedListings[address].creatives.hashTags = content.slice(1) || [];
          } else {
            // Handle object case
            const typedContent = content as { caption: string; hashtags: string[] };
            enhancedListings[address].creatives.propertyCaption = typedContent.caption;
            enhancedListings[address].creatives.hashTags = typedContent.hashtags;
          }
        }
      }

      console.log(`Successfully generated captions and hashtags for ${Object.keys(captionResponse).length} properties`);
    } catch (error) {
      console.error("Error generating captions:", error);
    }

    // Step 3: Generate short descriptions
    try {
      console.log("Generating short descriptions...");

      // Import needed for dynamically importing the Anthropic API functions
      // const { generateShortDescriptions } = await import("../../../../server/anthropic/api");
      const { generateShortDescriptions } = {
        generateShortDescriptions: (a: any) => {
          return {
            shortDescriptions: ["Short Description 1", "Short Description 2", "Short Description 3"]
          }
        }
      }

      const descriptionResponse = await generateShortDescriptions(enhancedListings);

      // Add short descriptions to the respective listings
      for (const [address, content] of Object.entries(descriptionResponse)) {
        if (enhancedListings[address]) {
          if (!enhancedListings[address].creatives) {
            enhancedListings[address].creatives = {};
          }
          // Fix type conversion by properly handling the content
          if (Array.isArray(content)) {
            // Handle array case (defensive coding)
            enhancedListings[address].creatives.shortDescription = content[0] || '';
          } else {
            // Handle object case
            const typedContent = content as { shortDescription: string };
            enhancedListings[address].creatives.shortDescription = typedContent.shortDescription;
          }
        }
      }

      console.log(`Successfully generated short descriptions for ${Object.keys(descriptionResponse).length} properties`);
    } catch (error) {
      console.error("Error generating short descriptions:", error);
    }

    // Save a copy of the creatives data separately for potential future use
    await fs.promises.writeFile(
      "listing_creatives.json",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(enhancedListings).map(([key, listing]) => [
            key,
            // Fix the unknown type by adding proper type assertion
            (listing as any).creatives || {}
          ])
        ),
        null,
        2
      ),
      "utf-8"
    );

    console.log("All creative content generated successfully");
    return enhancedListings;
  } catch (error) {
    console.error("Error generating creative content:", error);
    // Return the original listings if there was an error
    return listings;
  }
}