import * as postmark from 'postmark';
import type { Opening } from '~/types';

if (!process.env.POSTMARK_API_KEY) {
  throw new Error('Missing POSTMARK_API_KEY environment variable');
}

if (!process.env.ORIGIN) {
  throw new Error('Missing ORIGIN environment variable');
}

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

function groupOpeningsByFacility(openings: Opening[]): Record<string, Opening[]> {
  const grouped: Record<string, Opening[]> = {};
  
  openings.forEach(opening => {
    if (!grouped[opening.facility]) {
      grouped[opening.facility] = [];
    }
    grouped[opening.facility].push(opening);
  });

  return grouped;
}

function groupOpeningsByStartTime(openings: Opening[]): Record<string, Opening[]> {
  const grouped: Record<string, Opening[]> = {};
  
  openings.forEach(opening => {
    const key = opening.startDatetime.toISOString();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(opening);
  });

  return grouped;
}

function generateEmailContent(openings: Opening[], email: string): { subject: string; htmlBody: string } {
  const openingsByFacility = groupOpeningsByFacility(openings);
  const facilities = Object.keys(openingsByFacility);
    
  let htmlBody = '<h2> new court openings! </h2>';
  
  facilities.forEach(facility => {
    const facilityOpenings = openingsByFacility[facility];
    htmlBody += `<h3>${facility}</h3>`;
    htmlBody += '<ul>';
    
    // Group openings by start time
    const openingsByTime = groupOpeningsByStartTime(facilityOpenings);
    
    // Sort by start time
    Object.entries(openingsByTime)
      .sort(([timeA], [timeB]) => new Date(timeA).getTime() - new Date(timeB).getTime())
      .forEach(([startTime, timeOpenings]) => {
        const start = new Date(startTime);
        const formatDate = start.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        const formatTime = start.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        });
        
        // Get unique durations and sort them
        const durations = [...new Set(timeOpenings.map(o => o.durationMinutes))]
          .sort((a, b) => a - b)
          .map(mins => `${mins}m`)
          .join(', ');
        
        htmlBody += `<li>${formatDate} at ${formatTime} (${durations})</li>`;
      });
    
    htmlBody += '</ul>';
  });

  // Add unsubscribe link at the bottom
  const unsubscribeUrl = `${process.env.ORIGIN}/api/unsubscribe?email=${encodeURIComponent(email)}`;
  htmlBody += `
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #eee;">
      <div> xoxo </div>
      <div><a href="${unsubscribeUrl}" style="color: #5286fa;">unsubscribe</a></div>
    </div>
  `;

  htmlBody = '<div style="padding-left: 1rem; padding-top: 0.5rem;">' + htmlBody + '</div>';
  return { subject: 'new court openings!', htmlBody };
}

export async function sendOpeningNotifications(openingsByEmail: Record<string, Opening[]>): Promise<void> {
  // Send one email per person with all their openings across facilities
  const emailPromises = Object.entries(openingsByEmail).map(async ([email, openings]) => {
    if (openings.length === 0) return;
    
    const { subject, htmlBody } = generateEmailContent(openings, email);
    
    try {
      await client.sendEmail({
        From: 'hello@mckaren.app',
        To: email,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound'
      });
      console.log(`Sent notification email to ${email} for ${openings.length} openings`);
    } catch (error) {
      console.error(`Failed to send notification email to ${email}:`, error);
      throw error;
    }
  });
  
  await Promise.all(emailPromises);
}
