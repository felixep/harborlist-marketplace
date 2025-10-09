# Email Verification Setup - Local Development

## Overview

The HarborList application now includes email verification for user registration. This document explains how the email system works in both local development and production environments.

## Architecture

### Local Development (Docker Compose)
- **Email Service**: SMTP4Dev
- **Port**: 5000 (Web UI), 2525 (SMTP)
- **URL**: https://mail.local.harborlist.com or http://localhost:5000
- **Configuration**: Automatically configured in docker-compose.local.yml

### Production/Staging (AWS)
- **Email Service**: Amazon SES
- **Configuration**: Environment variables for AWS credentials and region

## Local Development Setup

### 1. Start the Development Environment

```bash
# Start all services including smtp4dev
docker-compose -f docker-compose.local.yml up --build

# Or with enhanced profile for Traefik
docker-compose -f docker-compose.local.yml --profile enhanced up --build
```

### 2. Access the Email Interface

- **Web UI**: Open https://mail.local.harborlist.com (with Traefik) or http://localhost:5000
- **SMTP Server**: smtp4dev:2525 (internal Docker network)

### 3. Test Email Verification

1. Register a new user at https://local.harborlist.com/register
2. Check the SMTP4Dev web interface for the verification email
3. Click the verification link in the email
4. User account will be activated and they can log in

## Environment Variables

### Local Development (Docker Compose)
```env
# SMTP Configuration (set in docker-compose.local.yml)
SMTP_HOST=smtp4dev
SMTP_PORT=25
SMTP_SECURE=false
FROM_EMAIL=noreply@harborlist.local
FRONTEND_URL=https://local.harborlist.com
```

### Production/Staging (AWS)
```env
# SES Configuration (set in infrastructure deployment)
AWS_REGION=us-east-1
FROM_EMAIL=noreply@harborlist.com
FRONTEND_URL=https://harborlist.com

# SMTP_HOST should NOT be set in production - this triggers SES usage
```

## Email Templates

The system includes responsive HTML email templates for:

1. **Email Verification**: Welcome email with verification link
2. **Password Reset**: Security-focused reset email (future feature)

Templates are automatically styled with:
- HarborList branding
- Maritime theme colors
- Mobile-responsive design
- Fallback text versions

## Flow Diagram

### Registration with Email Verification

```
User Registration
       ↓
 Create User Account
  (status: pending_verification)
       ↓
 Send Verification Email
  (via SMTP4Dev/SES)
       ↓
  User Clicks Link
       ↓
 Verify Email Token
       ↓
Update User Status
  (status: active)
       ↓
  User Can Login
```

## API Endpoints

### New Authentication Endpoints

```typescript
POST /auth/verify-email
Body: { token: string }
Response: { message: string, user: User }

POST /auth/resend-verification  
Body: { email: string }
Response: { message: string }
```

### Updated Registration Response

```typescript
POST /auth/register
Response: {
  message: string,
  user: User,
  requiresVerification: true  // New field
}
```

## Frontend Changes

### New Pages
- `/verify-email` - Email verification page
- `/registration-success` - Post-registration instructions

### Updated Components
- Registration form redirects to success page
- Login form shows verification help for unverified accounts
- New error handling for verification states

## Troubleshooting

### Email Not Sending (Local)
1. Check if smtp4dev container is running: `docker-compose ps`
2. Check logs: `docker-compose logs smtp4dev`
3. Verify SMTP_HOST environment variable is set to `smtp4dev`

### Email Not Appearing in SMTP4Dev
1. Check backend logs: `docker-compose logs backend`
2. Verify SMTP configuration in docker-compose.local.yml
3. Check that FROM_EMAIL is set correctly

### Verification Link Not Working
1. Ensure FRONTEND_URL matches your local setup
2. Check that the token hasn't expired (24 hours)
3. Verify the verify-email endpoint is working

### Production SES Issues
1. Verify AWS credentials and region
2. Check SES sending limits and reputation
3. Ensure FROM_EMAIL domain is verified in SES
4. Check CloudWatch logs for detailed error messages

## Future Enhancements

- [ ] Email template customization system
- [ ] Multi-language email templates
- [ ] Email delivery tracking and analytics
- [ ] Advanced email preferences for users
- [ ] Integration with marketing email platforms