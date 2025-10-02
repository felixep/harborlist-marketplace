#!/usr/bin/env node

/**
 * Fix Diagram Layouts
 * 
 * This script replaces complex, messy Mermaid diagrams with clean, 
 * well-structured ones that render properly.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Clean architecture diagram
const cleanArchitectureDiagram = `\`\`\`mermaid
flowchart TD
    %% External Users
    Users[👥 Users] --> CDN[🌐 Cloudflare CDN<br/>Global Edge Network]
    
    %% Frontend Applications
    CDN --> WebApp[⚛️ React 18 SPA<br/>Public Marketplace]
    CDN --> AdminApp[👤 Admin Dashboard<br/>Management Portal]
    
    %% API Gateway
    WebApp --> API[🚪 API Gateway<br/>REST Endpoints]
    AdminApp --> API
    
    %% Microservices (arranged in logical groups)
    API --> AuthSvc[🔐 Auth Service<br/>JWT & MFA]
    API --> ListingSvc[🚢 Listing Service<br/>CRUD Operations]
    API --> AdminSvc[👤 Admin Service<br/>User Management]
    
    API --> MediaSvc[📸 Media Service<br/>Image Processing]
    API --> EmailSvc[📧 Email Service<br/>Notifications]
    API --> StatsSvc[📊 Stats Service<br/>Analytics]
    
    %% Data Storage
    AuthSvc --> DynamoDB[(🗄️ DynamoDB<br/>NoSQL Database)]
    ListingSvc --> DynamoDB
    AdminSvc --> DynamoDB
    StatsSvc --> DynamoDB
    
    MediaSvc --> S3[(📦 S3 Storage<br/>Media & Static Files)]
    
    %% Security & Monitoring
    AuthSvc --> Secrets[🔐 Secrets Manager]
    
    AuthSvc --> CloudWatch[📊 CloudWatch<br/>Monitoring & Logs]
    ListingSvc --> CloudWatch
    AdminSvc --> CloudWatch
    MediaSvc --> CloudWatch
    EmailSvc --> CloudWatch
    StatsSvc --> CloudWatch
    
    %% Clean styling for better visual hierarchy
    style Users fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style CDN fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style WebApp fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style AdminApp fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style API fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    style AuthSvc fill:#ffebee,stroke:#c62828,stroke-width:2px
    style ListingSvc fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    style AdminSvc fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style MediaSvc fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    style EmailSvc fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    style StatsSvc fill:#fce4ec,stroke:#ad1457,stroke-width:2px
    
    style DynamoDB fill:#e8f5e8,stroke:#388e3c,stroke-width:3px
    style S3 fill:#fff8e1,stroke:#f9a825,stroke-width:3px
    style Secrets fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style CloudWatch fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
\`\`\``;

function fixArchitectureFile() {
  console.log(`${colors.blue}Fixing architecture diagrams...${colors.reset}`);
  
  const filePath = 'docs/architecture/README.md';
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Find and replace the problematic main architecture diagram
  const architectureStart = content.indexOf('### **Complete System Architecture Overview**');
  if (architectureStart !== -1) {
    // Find the end of this section (next ### or end of file)
    let architectureEnd = content.indexOf('### **Database Architecture & Table Relationships**', architectureStart);
    if (architectureEnd === -1) {
      architectureEnd = content.length;
    }
    
    const beforeSection = content.substring(0, architectureStart);
    const afterSection = content.substring(architectureEnd);
    
    const newSection = `### **Complete System Architecture Overview**

${cleanArchitectureDiagram}

`;
    
    content = beforeSection + newSection + afterSection;
    modified = true;
    
    console.log(`    ${colors.green}✓ Replaced main architecture diagram${colors.reset}`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`    ${colors.green}✓ Fixed architecture diagrams${colors.reset}`);
    return 1;
  } else {
    console.log(`    ${colors.cyan}No changes needed${colors.reset}`);
    return 0;
  }
}

function removeExtraEndStatements() {
  console.log(`${colors.blue}Removing extra 'end' statements...${colors.reset}`);
  
  const files = [
    'docs/architecture/README.md',
    'docs/architecture/api-architecture.md',
    'docs/architecture/infrastructure-deployment.md',
    'docs/architecture/performance-monitoring.md',
    'docs/backend/README.md',
    'docs/frontend/README.md',
    'docs/operations/README.md',
    'docs/security/README.md',
    'docs/tools/README.md'
  ];
  
  let totalFixes = 0;
  
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\\n');
    let modified = false;
    
    let inMermaidBlock = false;
    let diagramType = null;
    let subgraphCount = 0;
    let endCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine === '```mermaid') {
        inMermaidBlock = true;
        diagramType = null;
        subgraphCount = 0;
        endCount = 0;
      } else if (trimmedLine === '```' && inMermaidBlock) {
        // End of Mermaid block - check for extra ends
        if (endCount > subgraphCount) {
          console.log(`    ${colors.yellow}Found ${endCount - subgraphCount} extra 'end' statements in ${filePath}${colors.reset}`);
        }
        inMermaidBlock = false;
        diagramType = null;
      } else if (inMermaidBlock && !diagramType && trimmedLine) {
        diagramType = trimmedLine.split(/\\s+/)[0];
      } else if (inMermaidBlock && diagramType) {
        if (diagramType === 'graph' || diagramType === 'flowchart') {
          if (trimmedLine.startsWith('subgraph')) {
            subgraphCount++;
          } else if (trimmedLine === 'end') {
            endCount++;
            // If we have more ends than subgraphs, remove this end
            if (endCount > subgraphCount) {
              lines[i] = '';
              modified = true;
              totalFixes++;
            }
          }
        }
      }
    }
    
    if (modified) {
      // Clean up empty lines
      const cleanedLines = lines.filter((line, index) => {
        if (line === '') {
          // Keep empty line if it's not between two non-empty lines in a Mermaid block
          const prevLine = index > 0 ? lines[index - 1].trim() : '';
          const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : '';
          return !(prevLine && nextLine);
        }
        return true;
      });
      
      fs.writeFileSync(filePath, cleanedLines.join('\n'));
      console.log(`    ${colors.green}✓ Cleaned up ${filePath}${colors.reset}`);
    }
  }
  
  return totalFixes;
}

function main() {
  console.log(`${colors.bold}${colors.cyan}Fix Diagram Layouts${colors.reset}`);
  console.log(`${colors.cyan}Replacing complex diagrams with clean, well-structured ones...${colors.reset}\n`);
  
  const architectureFixes = fixArchitectureFile();
  const endFixes = removeExtraEndStatements();
  
  const totalFixes = architectureFixes + endFixes;
  
  console.log(`\n${colors.bold}${colors.cyan}=== LAYOUT FIX SUMMARY ===${colors.reset}`);
  console.log(`Architecture diagrams fixed: ${colors.green}${architectureFixes}${colors.reset}`);
  console.log(`Extra 'end' statements removed: ${colors.green}${endFixes}${colors.reset}`);
  console.log(`Total fixes applied: ${colors.green}${totalFixes}${colors.reset}`);
  
  if (totalFixes > 0) {
    console.log(`\n${colors.green}${colors.bold}Layout fixes applied!${colors.reset}`);
    console.log(`${colors.yellow}Run the render test to verify all diagrams now display correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.cyan}No layout fixes needed.${colors.reset}`);
  }
}

if (require.main === module) {
  main();
}