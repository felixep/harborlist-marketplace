#!/usr/bin/env node

/**
 * Update Cost Tracking Script
 * Updates the monthly cost tracking file with actual costs
 */

const fs = require('fs');
const path = require('path');

const totalCost = process.argv[2];
if (!totalCost) {
  console.error('Usage: node update-cost-tracking.js <total_cost>');
  process.exit(1);
}

const currentMonth = new Date().toISOString().slice(0, 7);
const fileName = `cost-tracking-${currentMonth}.json`;
const filePath = path.join(__dirname, '..', 'reports', fileName);

if (!fs.existsSync(filePath)) {
  console.error(`Cost tracking file not found: ${fileName}`);
  process.exit(1);
}

const trackingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
trackingData.actualCosts.total = parseFloat(totalCost);
trackingData.lastUpdated = new Date().toISOString();

fs.writeFileSync(filePath, JSON.stringify(trackingData, null, 2));
console.log(`📊 Updated cost tracking: $${totalCost}`);
