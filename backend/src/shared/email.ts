/**
 * @fileoverview Email service utility for HarborList
 * 
 * Provides a unified interface for sending emails using either:
 * - SMTP (for local development with smtp4dev)
 * - AWS SES (for production/staging environments)
 * 
 * The service automatically detects the environment and uses the appropriate
 * email provider based on configuration.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  tags?: { Name: string; Value: string }[];
}

/**
 * Email service class that handles both SMTP and SES
 */
export class EmailService {
  private sesClient?: SESClient;
  private smtpTransporter?: nodemailer.Transporter;
  private isLocalEnvironment: boolean;
  private fromEmail: string;

  constructor() {
    this.isLocalEnvironment = !!process.env.SMTP_HOST;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@harborlist.com';

    if (this.isLocalEnvironment) {
      this.initializeSMTP();
    } else {
      this.initializeSES();
    }
  }

  /**
   * Initialize SMTP transporter for local development
   */
  private initializeSMTP(): void {
    this.smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
      tls: {
        rejectUnauthorized: false // For local development
      }
    });

    console.log(`Email service initialized with SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  }

  /**
   * Initialize SES client for AWS environments
   */
  private initializeSES(): void {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.SES_ENDPOINT && {
        endpoint: process.env.SES_ENDPOINT,
      }),
    });

    console.log(`Email service initialized with SES in region: ${process.env.AWS_REGION || 'us-east-1'}`);
  }

  /**
   * Send email using the configured provider
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.isLocalEnvironment && this.smtpTransporter) {
      await this.sendViaSMTP(options);
    } else if (this.sesClient) {
      await this.sendViaSES(options);
    } else {
      throw new Error('Email service not properly initialized');
    }
  }

  /**
   * Send email via SMTP (local development)
   */
  private async sendViaSMTP(options: EmailOptions): Promise<void> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: options.from || this.fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      const result = await this.smtpTransporter.sendMail(mailOptions);
      console.log(`Email sent via SMTP to ${options.to}:`, result.messageId);
    } catch (error) {
      console.error('Error sending email via SMTP:', error);
      throw error;
    }
  }

  /**
   * Send email via AWS SES (production)
   */
  private async sendViaSES(options: EmailOptions): Promise<void> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const command = new SendEmailCommand({
      Source: options.from || this.fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        },
      },
      Tags: options.tags || [],
    });

    try {
      await this.sesClient.send(command);
      console.log(`Email sent via SES to ${options.to}`);
    } catch (error) {
      console.error('Error sending email via SES:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://harborlist.com';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const subject = 'Verify Your HarborList Account';
    
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to HarborList!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your maritime marketplace awaits</p>
          </div>
          
          <div style="padding: 40px 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${name},</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Thank you for signing up for HarborList! To start exploring boats and connecting with the maritime community, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;">
                Verify My Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #2563eb; word-break: break-all; margin-bottom: 25px;">
              ${verificationUrl}
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin-top: 0; color: #1e40af;">What's Next?</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Browse thousands of boats for sale</li>
                <li>Connect with boat owners and marine professionals</li>
                <li>List your own boats for sale</li>
                <li>Join our vibrant maritime community</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              This verification link will expire in 24 hours for security reasons.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              If you didn't create an account with HarborList, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              © ${new Date().getFullYear()} HarborList. All rights reserved.<br>
              This email was sent to ${email}
            </p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Welcome to HarborList!

Hi ${name},

Thank you for signing up for HarborList! To start exploring boats and connecting with the maritime community, please verify your email address.

Please click the following link to verify your account:
${verificationUrl}

What's Next?
- Browse thousands of boats for sale
- Connect with boat owners and marine professionals  
- List your own boats for sale
- Join our vibrant maritime community

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with HarborList, please ignore this email.

© ${new Date().getFullYear()} HarborList. All rights reserved.
This email was sent to ${email}
    `;

    await this.sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody,
      tags: [
        {
          Name: 'MessageType',
          Value: 'EmailVerification',
        },
      ],
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://harborlist.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your HarborList Password';
    
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">HarborList Account Security</p>
          </div>
          
          <div style="padding: 40px 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${name},</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              We received a request to reset your HarborList account password. 
              Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" 
                 style="background: #1e40af; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;">
                Reset My Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #2563eb; word-break: break-all; margin-bottom: 25px;">
              ${resetUrl}
            </p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
              <h4 style="margin-top: 0; color: #dc2626;">Security Notice</h4>
              <p style="margin: 0; font-size: 14px;">
                This password reset link will expire in 1 hour for security reasons.
                If you didn't request this reset, please ignore this email and your password will remain unchanged.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              © ${new Date().getFullYear()} HarborList. All rights reserved.<br>
              This email was sent to ${email}
            </p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Password Reset Request - HarborList

Hi ${name},

We received a request to reset your HarborList account password. 
Click the following link to create a new password:

${resetUrl}

SECURITY NOTICE:
This password reset link will expire in 1 hour for security reasons.
If you didn't request this reset, please ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} HarborList. All rights reserved.
This email was sent to ${email}
    `;

    await this.sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text: textBody,
      tags: [
        {
          Name: 'MessageType',
          Value: 'PasswordReset',
        },
      ],
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();