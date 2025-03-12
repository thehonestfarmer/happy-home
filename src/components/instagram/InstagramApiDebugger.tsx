import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * A debugging component to help troubleshoot Instagram API connection issues
 */
export default function InstagramApiDebugger() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<{
    token: boolean;
    accountId: boolean;
    sampleImageUrl?: {
      url: string;
      valid: boolean;
      error?: string;
    };
    error?: string;
    details?: string;
  } | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/admin/instagram/debug', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        token: false,
        accountId: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="bg-yellow-50">
        <CardTitle className="text-yellow-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Instagram API Connection Troubleshooter
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Helps diagnose Instagram API connection issues
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        {results && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Access Token:</span>
              {results.token ? (
                <div className="text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" /> Available
                </div>
              ) : (
                <div className="text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> Missing or Invalid
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Business Account ID:</span>
              {results.accountId ? (
                <div className="text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" /> Available
                </div>
              ) : (
                <div className="text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> Missing or Invalid
                </div>
              )}
            </div>
            
            {results.sampleImageUrl && (
              <div className="mt-2">
                <div className="font-medium mb-1">Sample Image URL:</div>
                <div className={`flex items-center ${results.sampleImageUrl.valid ? "text-green-600" : "text-red-600"}`}>
                  {results.sampleImageUrl.valid ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" /> Accessible
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-1" /> Not accessible
                    </>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 break-all mt-1">
                  URL: {results.sampleImageUrl.url}
                </div>
                
                {results.sampleImageUrl.error && (
                  <div className="text-xs text-red-500 mt-1">
                    Error: {results.sampleImageUrl.error}
                  </div>
                )}
                
                <div className="text-xs mt-1 text-gray-700">
                  Note: Instagram requires that image URLs be publicly accessible (no authentication)
                </div>
              </div>
            )}
            
            {results.error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-700 text-sm mt-2">
                <div className="font-medium">Error:</div>
                <div>{results.error}</div>
              </div>
            )}
            
            {results.details && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-blue-700 text-sm mt-2">
                <div className="font-medium">Details:</div>
                <div className="whitespace-pre-wrap">{results.details}</div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-sm text-gray-500 mb-4">
          <p>Common issues with Instagram API uploads:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Access token is invalid or expired</li>
            <li>Access token doesn't have proper permissions</li>
            <li>Image URLs are not publicly accessible</li>
            <li>Image formats not supported (Instagram supports JPG, PNG)</li>
            <li>Instagram API rate limits exceeded</li>
          </ul>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="image-urls">
            <AccordionTrigger className="text-sm font-medium">
              Common Image URL Issues
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-2">
              <p>Instagram requires that image URLs meet these requirements:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Publicly accessible</strong> - The URL must be accessible without authentication</li>
                <li><strong>Direct image links</strong> - URLs should point directly to image files, not to HTML pages</li>
                <li><strong>Proper formats</strong> - Only JPG and PNG files are supported</li>
                <li><strong>File size</strong> - Images should be under 8MB</li>
                <li><strong>CORS enabled</strong> - The server hosting the images must allow cross-origin requests</li>
              </ul>
              <p className="mt-2 text-xs">If your images are served from a private network, S3 with private ACLs, or require cookies/authentication, Instagram won't be able to access them.</p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="access-token">
            <AccordionTrigger className="text-sm font-medium">
              Access Token Troubleshooting
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-2">
              <p>Instagram access tokens can have several issues:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Expiration</strong> - Tokens can expire after 60 days</li>
                <li><strong>Permissions</strong> - The token needs proper scopes (instagram_basic, instagram_content_publish)</li>
                <li><strong>Rate limiting</strong> - Instagram limits API calls (25 per hour for publishing)</li>
                <li><strong>Business account requirement</strong> - Only Instagram business accounts can publish via API</li>
              </ul>
              <p className="mt-2 text-xs">To generate a new token, you'll need to use the Facebook Developer Console and connect to your Instagram Business Account.</p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="api-errors">
            <AccordionTrigger className="text-sm font-medium">
              Common Instagram API Error Codes
            </AccordionTrigger>
            <AccordionContent className="text-sm">
              <div className="grid gap-2">
                <div>
                  <div className="font-medium">Error 190</div>
                  <div className="text-xs">Invalid or expired access token</div>
                </div>
                <div>
                  <div className="font-medium">Error 4</div>
                  <div className="text-xs">Rate limit exceeded</div>
                </div>
                <div>
                  <div className="font-medium">Error 10</div>
                  <div className="text-xs">Application does not have permission</div>
                </div>
                <div>
                  <div className="font-medium">Error 100</div>
                  <div className="text-xs">Invalid parameter (including inaccessible image URLs)</div>
                </div>
                <div>
                  <div className="font-medium">Error 200</div>
                  <div className="text-xs">Permission issue with the app or account</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="debug-steps">
            <AccordionTrigger className="text-sm font-medium">
              Debugging Steps
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-2">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Verify access token is valid using the check above</li>
                <li>Test if image URL is publicly accessible (open in incognito browser)</li>
                <li>Check image format and file size (must be JPG or PNG under 8MB)</li>
                <li>Ensure the Instagram account is a Business account</li>
                <li>Verify API permissions include <code>instagram_basic</code> and <code>instagram_content_publish</code></li>
                <li>Check server logs for detailed API error responses</li>
              </ol>
              <p className="mt-2 text-xs">If all else fails, regenerate the access token through the Facebook Developer Console.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={checkConnection} 
          disabled={isChecking}
          variant="outline"
          className="w-full"
        >
          {isChecking ? 'Checking...' : 'Check Instagram API Connection'}
        </Button>
      </CardFooter>
    </Card>
  );
}