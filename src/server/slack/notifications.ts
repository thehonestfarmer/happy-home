const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackError(message: string, jobName: string, details: Record<string, any> = {}) {
  const WEBHOOK_URL = process.env.SLACK_ERROR_URL;
  if (!WEBHOOK_URL) {
    console.error('SLACK_ERROR_URL is not configured');
    return false;
  }
  
  const payload = {
    attachments: [{
      color: '#ff0000',
      pretext: `Job Report: ${jobName}`,
      text: message,
    }]
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Send a notification to Slack with job-specific colors
 * @param message The message to send
 * @param jobName The name of the job (determines the color)
 * @param status 'success', 'warning', or 'info' to indicate the type of notification
 * @param details Additional details to include in the notification
 */
async function sendSlackNotification(
  message: string, 
  jobName: string, 
  status: 'success' | 'warning' | 'info' = 'info', 
  details: Record<string, any> = {}
) {
    if (!WEBHOOK_URL) {
        console.error('SLACK_WEBHOOK_URL is not configured');
        return false;
    }
    
    // Job-specific colors
    const jobColors: Record<string, string> = {
      'Trigger Update': '#1E88E5', // Blue
      'Update Coords': '#8E24AA',  // Purple
      'Default': '#757575'         // Gray
    };

    // Status colors
    const statusColors: Record<string, string> = {
      'success': '#36a64f', // Green
      'warning': '#FFA000', // Amber
      'info': '#607D8B'     // Blue Gray
    };
    
    // Use job color as base, with status influence
    const baseColor = jobColors[jobName] || jobColors['Default'];
    const statusColor = statusColors[status];
    
    // Use status color for success/warning, but job color for info
    const color = status === 'info' ? baseColor : statusColor;
    
    const payload = {
      attachments: [{
        color,
        pretext: `Job Report: ${jobName}`,
        text: message,
        fields: Object.entries(details).map(([title, value]) => ({
          title,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          short: false
        })),
        footer: "OdieGai Cron System",
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error('Failed to send Slack notification:', await response.text());
      }
      
      return response.ok;
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      return false;
    }
  }
  
  export { sendSlackNotification };