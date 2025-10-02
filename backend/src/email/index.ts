import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { db } from '../shared/database';
import { createResponse, createErrorResponse, parseBody, validateRequired, sanitizeString, validateEmail, generateId } from '../shared/utils';

const sesClient = new SESClient({ region: process.env.AWS_REGION });
const FROM_EMAIL = process.env.FROM_EMAIL!;

interface ContactRequest {
  listingId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
  inquiryType?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${event.httpMethod} not allowed`, requestId);
    }

    const contactData = parseBody<ContactRequest>(event);
    
    // Validate required fields
    validateRequired(contactData, ['listingId', 'senderName', 'senderEmail', 'message']);

    // Validate email format
    if (!validateEmail(contactData.senderEmail)) {
      return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email address format', requestId);
    }

    // Get listing details
    const listing = await db.getListing(contactData.listingId);
    if (!listing) {
      return createErrorResponse(404, 'LISTING_NOT_FOUND', 'Listing not found', requestId);
    }

    // Get owner details
    const owner = await db.getUser(listing.ownerId);
    if (!owner || !owner.email) {
      return createErrorResponse(404, 'OWNER_NOT_FOUND', 'Listing owner not found', requestId);
    }

    // Send email to owner
    const messageId = await sendContactEmail(contactData, listing, owner.email);

    return createResponse(200, {
      messageId,
      status: 'sent',
      message: 'Your message has been sent to the boat owner',
    });
  } catch (error) {
    console.error('Email service error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message, requestId);
      }
      if (error.message.includes('Invalid JSON')) {
        return createErrorResponse(400, 'INVALID_REQUEST', error.message, requestId);
      }
    }

    return createErrorResponse(500, 'EMAIL_ERROR', 'Failed to send message', requestId);
  }
};

async function sendContactEmail(
  contactData: ContactRequest,
  listing: any,
  ownerEmail: string
): Promise<string> {
  const messageId = generateId();
  
  const subject = `New Inquiry About Your Boat: ${listing.title}`;
  
  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">New Inquiry About Your Boat Listing</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">${listing.title}</h3>
            <p><strong>Price:</strong> $${listing.price.toLocaleString()}</p>
            <p><strong>Year:</strong> ${listing.boatDetails.year}</p>
            <p><strong>Length:</strong> ${listing.boatDetails.length} ft</p>
            <p><strong>Location:</strong> ${listing.location.city}, ${listing.location.state}</p>
          </div>

          <h3>Message from Potential Buyer:</h3>
          <div style="background-color: #ffffff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0;">
            <p><strong>From:</strong> ${sanitizeString(contactData.senderName)}</p>
            <p><strong>Email:</strong> ${contactData.senderEmail}</p>
            ${contactData.senderPhone ? `<p><strong>Phone:</strong> ${sanitizeString(contactData.senderPhone)}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
            <p>${sanitizeString(contactData.message).replace(/\n/g, '<br>')}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">How to Respond:</h4>
            <p>Reply directly to this email to contact the interested buyer. Your email address will be shared with them when you reply.</p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Safety Tips:</h4>
            <ul>
              <li>Always meet potential buyers in a public place</li>
              <li>Verify the buyer's identity before sharing personal information</li>
              <li>Be cautious of unusual payment methods or requests</li>
              <li>Trust your instincts - if something feels wrong, it probably is</li>
            </ul>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #6b7280;">
            This message was sent through BoatListings.com. 
            <br>Message ID: ${messageId}
            <br>Listing ID: ${listing.listingId}
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
New Inquiry About Your Boat Listing

Boat: ${listing.title}
Price: $${listing.price.toLocaleString()}
Year: ${listing.boatDetails.year}
Length: ${listing.boatDetails.length} ft
Location: ${listing.location.city}, ${listing.location.state}

Message from: ${contactData.senderName}
Email: ${contactData.senderEmail}
${contactData.senderPhone ? `Phone: ${contactData.senderPhone}` : ''}

Message:
${contactData.message}

---
Reply directly to this email to contact the buyer.
Message ID: ${messageId}
Listing ID: ${listing.listingId}
  `;

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [ownerEmail],
    },
    ReplyToAddresses: [contactData.senderEmail],
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
    Tags: [
      {
        Name: 'MessageType',
        Value: 'ContactInquiry',
      },
      {
        Name: 'ListingId',
        Value: listing.listingId,
      },
    ],
  });

  await sesClient.send(command);
  return messageId;
}
