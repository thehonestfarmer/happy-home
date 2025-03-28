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

async function sendSlackNotification(message: string, jobName: string, success: boolean, details: Record<string, any> = {}) {
    if (!WEBHOOK_URL) {
        console.error('SLACK_WEBHOOK_URL is not configured');
        return false;
    }
    
    const color = success ? '#36a64f' : '#ff0000';
    
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