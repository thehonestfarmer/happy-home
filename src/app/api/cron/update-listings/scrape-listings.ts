import puppeteer from "puppeteer";
import translate from "translate";
import fs from "fs";

interface ScrapedResult {
  addresses: string[];
  tags: string[][];
  listingDetail: string[];
  prices: string[];
  layout: string[];
  buildSqMeters: string[];
  landSqMeters: string[];
}

translate.engine = "google"; // Set translation engine to Google Translate
// translate.key = 'YOUR_GOOGLE_API_KEY'; // Optionally set your Google API key

// The URL of the page to scrape
const url =
  "https://www-shiawasehome--reuse-com.translate.goog/?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=ja&_x_tr_pto=wapp"; // Replace with the actual URL

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

  // Format prices to title case
  result.prices = result.prices.map(price => 
    price ? toTitleCase(price) : price
  );

  return result;
}

export async function translateText(text: string): Promise<string> {
  return await translate(text, { from: "ja", to: "en" });
}

async function translateList(japaneseList: (string | string[])[]): Promise<string[]> {
  const translations = await Promise.all(
    japaneseList.map(async (text) => {
      if (Array.isArray(text)) {
        const translatedArray = await Promise.all(text.map(t => translateText(t)));
        return translatedArray.join(', ');
      }
      return await translateText(text);
    }),
  );

  return translations;
}

// Function to scrape the page using Puppeteer
export async function scrapePage(): Promise<ScrapedResult | null> {
  try {
    // Launch a new Puppeteer browser instance
    console.log("... launching puppeteer");
    const browser = await puppeteer.launch({ headless: true }); // Set to false if you want to see the browser
    console.log("... puppeteer launched");
    const page = await browser.newPage();
    console.log("... page created");

    // Navigate to the page
    await page.goto(url, { waitUntil: "networkidle0" }); // Ensure the page is fully loaded

    // Get the HTML content under the element with id "FOO"
    const fooContent = await page.$eval(
      "#newbukken",
      (element) => element.innerHTML,
    );

    let layout = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const shozaichi = item.querySelectorAll(".top_madori");
          return Array.from(shozaichi).map((el) => el.innerText.trim());
        })
        .flat(),
    );

    let prices = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const shozaichi = item.querySelectorAll(".top_price");
          return Array.from(shozaichi).map((el) => el.innerText.trim());
        })
        .flat(),
    );

    let landArea = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const elements = item.querySelectorAll(".top_menseki");
          return Array.from(elements).map((el) => el.innerText.trim());
        })
        .flat(),
    );

    // TODO: find the sold index so we can exclude them from being displayed
    // const sold = await page.$$eval("#fudo_top_r-2_1 li", (items) => {
    //   console.log(items.length, "length");
    //   return items
    //     .map((i, idx) => {
    //       const didSell = i.querySelectorAll(".archive_sold");
    //       return Array.from(didSell).map((i) => idx);
    //     })
    //     .flat();
    // });
    //
    // console.log(sold);

    let buildArea = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const elements = item.querySelectorAll(".top_tatemono");
          return Array.from(elements).map((el) => el.innerText.trim());
        })
        .flat(),
    );

    const newListings = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const shozaichi = item.querySelectorAll(".top_shozaichi");
          return Array.from(shozaichi).map((el) => el.innerText.trim());
        })
        .flat(),
    );

    const facilities = await page.$$eval("#fudo_top_r-2_1 li", (items) =>
      items
        .map((item) => {
          const link = item.querySelectorAll("a");

          const facility = item.querySelectorAll(
            "div.pickup_box.list > ul > div > ul",
          );
          return Array.from(facility)
            .map((el) => el.innerText.trim())
            .map((s) => ({
              tags: s.split("\n"),
              link: Array.from(link).map((e) => e.href)[0] || "",
            }));
        })
        .flat(),
    );

    const translations = await translateList(newListings);
    const tags = await translateList(facilities.map((i) => i.tags));
    layout = await translateList(layout);
    prices = await translateList(prices);

    const result = {
      addresses: translations.map(
        (i) =>
          i.split("Address: ")[1] ||
          i.split("Address display: ")[1] ||
          i.split("Address information: ")[1] ||
          i.toLowerCase().split("housing display: ")[1] ||
          i.toLowerCase().split("residential display: ")[1] ||
          i.toLowerCase().split("residential information: near ")[1] ||
          i.toLowerCase().split("residential information: ")[1] ||
          i.toLowerCase().split("residence: ")[1] || i
      ),
      tags,
      listingDetail: facilities.map((i) => i.link),
      prices: prices.map(
        (i) => 
          i.split("Total amount: ")[1] || i.split("Total: ")[1] || i.split("Total Amount: ")[1] || i,
      ),
      layout: layout.map((i) => i.split("Floor plan: ")[1] || i.split("Floor Plan: ")[1] || i),
      buildSqMeters: buildArea.map(
        (i) =>
          (i.split("建物面積: ")[1] || i.split("Building area: ")[1]).split(
            "m²",
          )[0],
      ),
      landSqMeters: landArea.map(
        (i) =>
          (i.split("土地面積: ")[1] || i.split("Land area: ")[1]).split(
            "m²",
          )[0],
      ),
    };

    // Format the result
    const formattedResult = formatListingData(result);

    // Close the browser
    await browser.close();
    return formattedResult;

    // do some stuff to write to a json file
  } catch (error) {
    console.error("Error scraping the page:", error);
    return null;
  }
}

async function getImagesFromChildPage() {
  // visit the a href of the first child given the selection
  //
  //
}

async function init() {
  try {
    const json = await scrapePage();
    // Write the JSON data to a file
    await fs.promises.writeFile(
      "output.json",
      JSON.stringify(json, null, 2),
      "utf-8",
    );
    console.log("Data successfully written to output.json");
  } catch (error) {
    console.error("Error writing to file:", error);
  }

  // writeZippedObjectsToListing(json)
}
