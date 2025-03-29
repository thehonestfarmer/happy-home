import { NextResponse } from 'next/server';
import { sendSlackNotification, sendSlackError } from '@/server/slack/notifications';
import { readListings, writeListings, uploadListings } from '../update-listings/listings-manager';
import puppeteer from 'puppeteer';
import { Listing } from '../update-listings/types';
/**
* This route handler is designed to be called by Vercel Cron Jobs
* It verifies the Vercel signature (if present) and then calls the update-listings
* endpoint with the proper authentication
*/
/**
 * Checks if a page's main content matches the expected 404 error message in Japanese
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - Returns true if content matches the expected 404 page
 */
async function isJapanese404Page(url: string): Promise<boolean> {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Check if the main element with the expected class exists
        const mainElement = await page.$('main.main_contents');
        if (!mainElement) return false;

        // Check for the error section
        const errorSection = await page.$('main.main_contents section.error-404.not-found');
        if (!errorSection) return false;

        // Check for the main heading with the expected text
        const mainHeadingText = await page.evaluate(() => {
            const heading = document.querySelector('main.main_contents h1.page-title.main-heading');
            return heading ? heading.textContent : '';
        });

        if (mainHeadingText !== 'アクセスしようとしたページが見つかりません。') return false;

        // Check for the paragraph content
        const paragraphs = await page.evaluate(() => {
            const paragraphElements = document.querySelectorAll('main.main_contents .read_txt p');
            return Array.from(paragraphElements).map(p => p.textContent);
        });

        // Verify all three paragraphs exist with expected content
        if (paragraphs.length !== 3) return false;
        if (paragraphs[0] !== '幸せホームをご利用いただきましてありがとうございます。') return false;
        if (paragraphs[1] !== '誠に恐れ入りますが、アクセスしようとしたページがみつかりませんでした。') return false;
        if (paragraphs[2] !== 'お探しのページはすでに公開を終了しているか、アドレスが間違っている可能性がございます。') return false;

        // Check for the link back to home
        const linkText = await page.evaluate(() => {
            const link = document.querySelector('main.main_contents .contact-link a.hover.openhouse_link');
            return link ? link.textContent : '';
        });

        if (linkText !== '「幸せホーム」トップページ') return false;

        // If all checks pass, return true
        return true;

    } catch (error) {
        console.error('Error checking for Japanese 404 page:', error);
        return false;
    } finally {
        await browser.close();
    }
}

export async function updateCoords() {
    // we want to read the latest blob of data
    const currentListings = await readListings(true);
    // Filter properties with missing coordinates
    let propertiesWithMissingCoordinates: [string, Listing][] = Object.entries(currentListings)
        .filter(([_, property]) => !property.removed)
        .filter(([_, property]) => {
            // Check if coordinates are missing or null
            return (
                !property.coordinates ||
                property.coordinates.lat === null ||
                property.coordinates.long === null
            );
        });

    // just to track recently removed listings
    let removedListings: Listing[] = [];
    for (const [id, property] of propertiesWithMissingCoordinates) {
        const url = property.listingDetailUrl || property.listingDetail;
        const is404 = await isJapanese404Page(url);

        if (!property.address) {
            console.log(`Listing ${id} has no address`);
            continue;
        }

        if (!(property.address in currentListings)) {
            console.log(`Listing ${property.address} not found in current listings`);
            continue;
        } else if (is404) {
            console.log(`${url} is a 404 page`);
            currentListings[property.address].removed = true;
            removedListings.push(property);
        }
    }

    if (removedListings.length > 0) {
        try {
            await writeListings(currentListings);
            await uploadListings(currentListings);
            sendSlackNotification(
                `:sponge: Removed ${removedListings.length} listings\n\nURLs:\n${removedListings.map(p => p.listingDetailUrl || p.listingDetail).join('\n')}`,
                ':round_pushpin: Update Coords',
                'success'
            );
        } catch (error) {
            console.error('Error writing or uploading listings:', error);
            sendSlackError('Error writing or uploading listings', ':round_pushpin: Update Coords', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    if (propertiesWithMissingCoordinates.length > 0) {
        sendSlackNotification(
            `:mag: Found ${propertiesWithMissingCoordinates.length} properties with missing coordinates\n\nURLs:\n${propertiesWithMissingCoordinates.map(([_, p]) => p.listingDetailUrl || p.listingDetail).join('\n')}`,
            ':round_pushpin: Update Coords',
            'warning'
        );
    }

    if (removedListings.length === 0 && propertiesWithMissingCoordinates.length === 0) {
        sendSlackNotification(
            ' :saluting_face: No listings removed or found with missing coordinates',
            ':round_pushpin: Update Coords',
            'info'
        );
    }

}

export async function GET(request: Request) {
    console.log('Vercel Cron trigger received at', new Date().toISOString());
    sendSlackNotification(':robot_face: Starting update-coords cron job', ':round_pushpin: Update Coords', 'info');

    try {
        // Optional: Verify this request is from Vercel Cron using the Cron Secret
        // This adds another layer of security
        const cronSignature = request.headers.get('x-vercel-cron');
        const cronSecret = process.env.VERCEL_CRON_SECRET;

        if (cronSecret && (!cronSignature || cronSignature !== cronSecret)) {
            console.error('Invalid cron signature');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await updateCoords();

        // Return success response
        return NextResponse.json({
            success: true,
            message: "Listings updated successfully"
        });

    } catch (error) {
        console.error('Error in trigger-update route:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'; 