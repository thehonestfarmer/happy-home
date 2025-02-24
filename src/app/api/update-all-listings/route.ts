import { NextResponse } from 'next/server';
import translate from "translate";
import puppeteer from 'puppeteer';
import { scrapingQueue } from '@/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { translateText } from '../cron/update-listings/scrape-listings';

// Initialize listings.json if it doesn't exist
const initListingsFile = async () => {
    const filePath = path.join(process.cwd(), 'listings.json');
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, JSON.stringify({ listings: {} }, null, 2));
    }
};

// Add function to check for duplicates
const checkForDuplicate = (data: any, englishAddress: string) => {
    return Object.values(data.listings).some(
        (listing: any) => listing.englishAddress === englishAddress
    );
};

// Simplified job tracking
let activeJobs = new Set<string>();

// Configure concurrency settings
const PROCESSOR_CONCURRENCY = 3; // Number of concurrent job processors
const PAGE_CONCURRENCY = 2;      // Number of pages to scrape simultaneously

if (scrapingQueue) {
    // Minimal, essential logging for job lifecycle
    scrapingQueue.on('completed', (job) => {
        console.log(`✓ Job ${job.id} completed`);
        activeJobs.delete(job.id!.toString());
    });

    scrapingQueue.on('failed', (job, err) => {
        console.error(`✗ Job ${job?.id} failed:`, err.message);
        if (job?.id) activeJobs.delete(job.id.toString());
    });

    scrapingQueue.on('retrying', (job, err) => {
        console.log(`↻ Job ${job?.id} retrying:`, err.message);
    });

    // Add concurrency to the processor
    scrapingQueue.process(PROCESSOR_CONCURRENCY, async (job) => {
        const { listingUrl, address } = job.data;
        const browser = await puppeteer.launch({ headless: true });
        
        try {
            const page = await browser.newPage();
            await page.goto(listingUrl, { waitUntil: 'networkidle0' });

            const listingImages = await page.$$eval(".slick-track", (elements) => {
                const images = elements
                    .map((el) => {
                        const list = el.querySelectorAll("li > a > img") ?? [];
                        return Array.from(list).map((li) => li.src);
                    })
                    .flat();
                return images;
            });

            let details = await page.evaluate(() => {
                const recommendedPoints = document.querySelector('.recommend_txt dd p')?.textContent?.trim();
                return recommendedPoints?.split("\n")
                    .join("")
                    .split("★")
                    .map((s) => s.trim())
                    .filter(Boolean);
            });
            details = await Promise.all(details?.map(async (s) => await translateText(s)) ?? []);

            const isDetailSoldPresent = await page
                .$eval("div.detail_sold", () => true)
                .catch(() => false);

            const filePath = path.join(process.cwd(), 'listings.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);

            const englishAddress = await translateText(address);
            const isDuplicate = checkForDuplicate(data, englishAddress);

            const listingData = {
                ...job.data,
                details,
                listingImages,
                englishAddress,
                originalAddress: address,
                scrapedAt: new Date().toISOString(),
                isDetailSoldPresent,
                isDuplicate,
                id: undefined
            };

            const addressKey = englishAddress
                .trim()
                .replace(/[,\s]+/g, '_')
                .replace(/[^\w\-]/g, '');

            data.listings[addressKey] = listingData;
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));

            return listingData;
        } finally {
            await browser.close();
        }
    });
}

// Add function to check if listing already exists
const checkListingExists = async (address: string) => {
    const filePath = path.join(process.cwd(), 'listings.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Translate address first
    const englishAddress = await translateText(address);
    
    // Check if this address exists in any form
    return Object.values(data.listings).some(
        (listing: any) => listing.englishAddress === englishAddress
    );
};

// Add function to retry failed jobs
const retryFailedJobs = async () => {
    if (!scrapingQueue) return;

    const failedJobs = await scrapingQueue.getFailed();
    
    if (failedJobs.length === 0) {
        console.log('No failed jobs to retry');
        return;
    }

    console.log(`Found ${failedJobs.length} failed jobs to retry`);

    for (const job of failedJobs) {
        try {
            await job.retry();
            console.log(`✓ Retried job ${job.id}`);
            // Wait for the retried job to complete
            await new Promise((resolve) => {
                const checkInterval = setInterval(async () => {
                    const jobState = await job.getState();
                    if (jobState !== 'active' && jobState !== 'waiting') {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 1000);
            });
        } catch (error) {
            console.error(`✗ Failed to retry job ${job.id}:`, 
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
};

async function scrapeListingsFromPage(pageUrl: string) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let listingsLength = 0;

    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        const listings = await page.$$eval("#bukken_list li", (items) =>
            items.map((item) => {
                const linkEl = item.querySelector("a");
                const priceEl = item.querySelector("ul li:nth-child(1)");
                const floorPlanEl = item.querySelector("ul li:nth-child(2)");
                const addressEl = item.querySelector("ul li:nth-child(3)");
                const landAreaEl = item.querySelector("ul li:nth-child(6)");
                const buildAreaEl = item.querySelector("ul li:nth-child(7)");

                if (!linkEl) {
                    return null;
                }

                // Clean up address text
                const addressText = addressEl?.textContent?.trim() || '';
                const cleanAddress = addressText
                    .replace(/^住居表示\s*/i, '')  // Remove "Address" prefix
                    .replace(/^\n+|\n+$/g, '')    // Remove leading/trailing newlines
                    .trim();

                // Clean up floor plan text
                const floorPlanText = floorPlanEl?.textContent?.trim() || '';
                const cleanFloorPlan = floorPlanText
                    .replace(/^間取り\s*/i, '') // Remove "Floor plan" prefix
                    .replace(/^\n+|\n+$/g, '')      // Remove leading/trailing newlines
                    .trim();

                // Clean up price text
                const priceText = priceEl?.textContent?.trim() || '';
                const cleanPrice = priceText
                    .replace(/^総額\s*/i, '') // Remove "Price" prefix
                    .replace(/^\n+|\n+$/g, '')
                    .trim();

                // Clean up land area text
                const landAreaText = landAreaEl?.textContent?.trim() || '';
                const cleanLandArea = landAreaText
                    .replace(/^土地面積\s*/i, '') // Remove "Land area" prefix
                    .replace(/^\n+|\n+$/g, '')
                    .trim();

                // Clean up build area text
                const buildAreaText = buildAreaEl?.textContent?.trim() || '';
                const cleanBuildArea = buildAreaText
                    .replace(/^建物面積\s*/i, '') // Remove "Building area" prefix
                    .replace(/^\n+|\n+$/g, '')
                    .trim();

                return {
                    listingUrl: linkEl.href,
                    address: cleanAddress,
                    floorPlan: cleanFloorPlan,
                    price: cleanPrice,
                    landArea: cleanLandArea,
                    buildArea: cleanBuildArea
                };
            }).filter((listing) => listing !== null)
        );

        // Process listings from the page
        if (scrapingQueue && listings.length > 0) {
            for (const listing of listings) {
                try {
                    // Check if listing already exists
                    const exists = await checkListingExists(listing.address);
                    
                    if (!exists) {
                        const job = await scrapingQueue.add(listing, {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 2000
                            }
                        });
                        activeJobs.add(job.id.toString());
                        listingsLength++;
                        console.log(`Added new listing: ${listing.address}`);
                    } else {
                        console.log(`Skipping existing listing: ${listing.address}`);
                    }
                } catch (error: unknown) {
                    console.error("Failed to queue listing:", 
                        error instanceof Error ? error.message : 'Unknown error'
                    );
                }
            }
        }

        return listingsLength;
    } finally {
        await browser.close();
    }
}

// Add connection check function
async function checkQueueConnection() {
    if (!scrapingQueue) {
        throw new Error('Queue not initialized');
    }

    try {
        // Check if we can ping Redis
        await scrapingQueue.client.ping();
        console.log('Successfully connected to Redis');

        // Get queue health
        const counts = await scrapingQueue.getJobCounts();
        console.log('Current queue status:', counts);

        return true;
    } catch (error) {
        console.error('Queue connection check failed:', error);
        throw error;
    }
}

// Helper function to process pages in parallel
async function scrapePages(startPage: number, endPage: number) {
    const pagePromises = [];
    
    for (let page = startPage; page <= endPage; page++) {
        const pageUrl = "https://www.shiawasehome-reuse.com/?bukken=jsearch&shub=1&shu=&ros=&eki=&ken=00&sik=&kalc=&kahc=&kalb=0&kahb=&hof=&tik=0&mel=0&meh=0&tochimel=0&tochimeh=0&bukkenpage=&paged={PAGE}&so=date&ord=d&s="
            .replace('{PAGE}', page.toString());
        
        pagePromises.push(scrapeListingsFromPage(pageUrl));
        
        // Add a small delay between starting each page scrape
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return Promise.all(pagePromises);
}

export async function GET() {
    try {
        await initListingsFile();
        let totalListings = 0;
        
        // Process pages in batches for controlled parallelism
        for (let batchStart = 1; batchStart <= 6; batchStart += PAGE_CONCURRENCY) {
            const batchEnd = Math.min(batchStart + PAGE_CONCURRENCY - 1, 6);
            console.log(`Processing pages ${batchStart}-${batchEnd}`);
            
            const listingsCounts = await scrapePages(batchStart, batchEnd);
            totalListings += listingsCounts.reduce((sum, count) => sum + count, 0);
            
            if (batchEnd < 6) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Wait for all initial jobs to complete
        if (activeJobs.size > 0) {
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (activeJobs.size === 0) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 1000);
            });
        }

        // Retry any failed jobs
        await retryFailedJobs();

        return NextResponse.json({
            success: true,
            message: `Processed ${totalListings} new listings and retried failed jobs`,
        });
    } catch (error: unknown) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process listings'
        }, { status: 500 });
    }
} 