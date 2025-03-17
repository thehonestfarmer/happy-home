"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Play, AlertCircle, Trash2 } from "lucide-react";

interface FailedJob {
  id: string;
  url: string;
  failedAt: string;
  reason: string;
  retryCount: number;
}

export default function ScraperPage() {
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isStartingScrape, setIsStartingScrape] = useState(false);
  const [workerCount, setWorkerCount] = useState(3); // Default worker count
  const { toast } = useToast();

  useEffect(() => {
    fetchFailedJobs();
  }, []);

  const fetchFailedJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const response = await fetch("/api/admin/listings/failed-jobs");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFailedJobs(data.jobs || []);
    } catch (error) {
      toast({
        title: "Error loading jobs",
        description: error instanceof Error ? error.message : "Failed to load failed jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Retry selected jobs
  const retrySelectedJobs = async () => {
    if (selectedJobs.length === 0) {
      toast({
        title: "No jobs selected",
        description: "Please select at least one job to retry",
      });
      return;
    }

    try {
      setIsRetrying(true);
      const response = await fetch("/api/admin/listings/failed-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobIds: selectedJobs,
          workerCount: workerCount 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      toast({
        title: "Retrying jobs",
        description: `Started retry process for ${selectedJobs.length} jobs with ${workerCount} workers`,
      });
      
      // Clear selection and refresh the list after a short delay
      setSelectedJobs([]);
      setTimeout(() => {
        fetchFailedJobs();
      }, 3000);
    } catch (error) {
      toast({
        title: "Error retrying jobs",
        description: error instanceof Error ? error.message : "Failed to retry jobs",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Clear all failed jobs
  const clearAllFailedJobs = async () => {
    if (!confirm("Are you sure you want to clear all failed jobs? This cannot be undone.")) {
      return;
    }

    try {
      setIsClearing(true);
      const response = await fetch("/api/admin/listings/failed-jobs", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setFailedJobs([]);
      setSelectedJobs([]);
      
      toast({
        title: "Jobs cleared",
        description: "All failed jobs have been cleared",
      });
    } catch (error) {
      toast({
        title: "Error clearing jobs",
        description: error instanceof Error ? error.message : "Failed to clear jobs",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Start a new scrape
  const startNewScrape = async () => {
    try {
      setIsStartingScrape(true);
      const response = await fetch("/api/cron/update-listings", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Scraping started",
        description: "A new scraping process has been initiated",
      });
    } catch (error) {
      toast({
        title: "Error starting scrape",
        description: error instanceof Error ? error.message : "Failed to start scraping",
        variant: "destructive",
      });
    } finally {
      setIsStartingScrape(false);
    }
  };

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    if (selectedJobs.includes(jobId)) {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    } else {
      setSelectedJobs([...selectedJobs, jobId]);
    }
  };

  // Select or deselect all jobs
  const selectAllJobs = () => {
    if (selectedJobs.length === failedJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(failedJobs.map(job => job.id));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Scraper Management</h1>
        <Link href="/admin">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="failed-jobs">
        <TabsList>
          <TabsTrigger value="failed-jobs">Failed Jobs</TabsTrigger>
          <TabsTrigger value="new-scrape">New Scrape</TabsTrigger>
        </TabsList>
        
        <TabsContent value="failed-jobs">
          <Card>
            <CardHeader>
              <CardTitle>Failed Jobs</CardTitle>
              <CardDescription>
                Jobs that failed during scraping. You can retry them or clear the list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJobs ? (
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading failed jobs...</p>
                </div>
              ) : failedJobs.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Failed Jobs</h3>
                  <p className="text-muted-foreground">All scraping jobs are running smoothly</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllJobs}
                    >
                      {selectedJobs.length === failedJobs.length ? "Deselect All" : "Select All"}
                    </Button>
                    
                    <div className="flex items-center space-x-2 ml-auto">
                      <Label htmlFor="worker-count" className="text-sm">Workers:</Label>
                      <Input
                        id="worker-count"
                        type="number"
                        min="1"
                        max="10"
                        value={workerCount}
                        onChange={(e) => setWorkerCount(Number(e.target.value))}
                        className="w-16 h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Select</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed At</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Retries</th>
                        </tr>
                      </thead>
                      <tbody className="bg-background divide-y divide-gray-200">
                        {failedJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-muted/50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedJobs.includes(job.id)}
                                onChange={() => toggleJobSelection(job.id)}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">{job.id.substring(0, 8)}...</td>
                            <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]">{job.url}</td>
                            <td className="px-4 py-2 text-xs">{formatDate(job.failedAt)}</td>
                            <td className="px-4 py-2 text-xs truncate max-w-[200px]">{job.reason}</td>
                            <td className="px-4 py-2 text-xs">{job.retryCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={clearAllFailedJobs}
                disabled={isClearing || failedJobs.length === 0}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </>
                )}
              </Button>
              
              <Button 
                onClick={retrySelectedJobs} 
                disabled={isRetrying || selectedJobs.length === 0}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Selected ({selectedJobs.length})
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="new-scrape">
          <Card>
            <CardHeader>
              <CardTitle>Start New Scrape</CardTitle>
              <CardDescription>
                Trigger a new scraping run to fetch the latest listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This will start a new scraping process to fetch the latest listings from the website.
                The process will run in the background and may take several minutes to complete.
              </p>
              <p className="mb-4">
                You can monitor the progress in the server logs. Failed jobs will appear in the Failed Jobs tab.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={startNewScrape}
                disabled={isStartingScrape}
                className="w-full"
              >
                {isStartingScrape ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 