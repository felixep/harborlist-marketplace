#!/usr/bin/env node

/**
 * Validate Mermaid Diagrams
 * 
 * This script scans all markdown files in the docs directory,
 * extracts Mermaid diagrams, validates their syntax, and reports errors.
 * 
 * Usage:
 *   node validate-mermaid-diagrams.js [--fix]
 * 
 * Options:
 *   --fix    Attempt to fix common issues in broken diagrams
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class MermaidValidator {
  constructor(options = {}) {
    this.docsDir = options.dir || path.join(process.cwd(), 'docs');
    this.tempDir = path.join(process.cwd(), '.mermaid-temp');
    this.shouldFix = options.fix || false;
    this.results = {
      total: 0,
      valid: 0,
      invalid: 0,
      fixed: 0,
      diagrams: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Check if Mermaid CLI is installed
   */
  checkMermaidCLI() {
    try {
      execSync('which mmdc', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Install Mermaid CLI if not present
   */
  async installMermaidCLI() {
    this.log('Installing @mermaid-js/mermaid-cli...', 'yellow');
    try {
      execSync('npm install -g @mermaid-js/mermaid-cli', { stdio: 'inherit' });
      this.log('✓ Mermaid CLI installed successfully', 'green');
      return true;
    } catch (error) {
      this.log('✗ Failed to install Mermaid CLI', 'red');
      this.log('Please install it manually: npm install -g @mermaid-js/mermaid-cli', 'yellow');
      return false;
    }
  }

  /**
   * Find all markdown files in docs directory
   */
  findMarkdownFiles(dir = this.docsDir) {
    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(this.findMarkdownFiles(fullPath));
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Extract Mermaid diagrams from a markdown file
   */
  extractDiagrams(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const diagrams = [];
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      diagrams.push({
        file: filePath,
        index: index++,
        lineStart: content.substring(0, match.index).split('\n').length,
        code: match[1].trim(),
        original: match[0]
      });
    }

    return diagrams;
  }

  /**
   * Validate a single Mermaid diagram
   */
  validateDiagram(diagram) {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    const tempFile = path.join(this.tempDir, `diagram-${Date.now()}-${diagram.index}.mmd`);
    const outputFile = path.join(this.tempDir, `output-${Date.now()}-${diagram.index}.svg`);

    try {
      // Write diagram to temp file
      fs.writeFileSync(tempFile, diagram.code);

      // Try to render using Mermaid CLI
      execSync(`mmdc -i "${tempFile}" -o "${outputFile}"`, {
        stdio: 'pipe',
        timeout: 10000
      });

      // Clean up
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

      return { valid: true };
    } catch (error) {
      // Clean up
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

      return {
        valid: false,
        error: error.message || 'Unknown error',
        stderr: error.stderr ? error.stderr.toString() : ''
      };
    }
  }

  /**
   * Attempt to fix common Mermaid syntax issues
   */
  fixDiagram(diagram) {
    let fixed = diagram.code;
    let changes = [];

    // Fix 1: Remove invalid characters in node IDs
    const invalidChars = /[^\w\-_]/g;
    if (fixed.match(/\[\w+[^\w\-_\[\]()]+\w+\]/)) {
      changes.push('Removed invalid characters from node IDs');
    }

    // Fix 2: Ensure proper spacing around arrows
    fixed = fixed.replace(/([^\s])(-->|->|---|==|==>)([^\s])/g, '$1 $2 $3');
    if (fixed !== diagram.code) {
      changes.push('Added spacing around arrows');
    }

    // Fix 3: Fix style declarations with invalid syntax
    fixed = fixed.replace(/style\s+(\S+)\s+fill:#([0-9a-fA-F]{6})\s*,\s*stroke:#([0-9a-fA-F]{6})\s*,\s*stroke-width:\s*(\d+)px/g,
      'style $1 fill:#$2,stroke:#$3,stroke-width:$4px');

    // Fix 4: Remove duplicate style declarations
    const styleLines = fixed.split('\n').filter(line => line.trim().startsWith('style '));
    const uniqueStyles = [...new Set(styleLines)];
    if (styleLines.length !== uniqueStyles.length) {
      const otherLines = fixed.split('\n').filter(line => !line.trim().startsWith('style '));
      fixed = [...otherLines, ...uniqueStyles].join('\n');
      changes.push('Removed duplicate style declarations');
    }

    // Fix 5: Ensure flowchart/graph declaration is at the top
    const lines = fixed.split('\n');
    const declarationIndex = lines.findIndex(line => 
      /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/i.test(line.trim())
    );
    
    if (declarationIndex > 0) {
      const declaration = lines.splice(declarationIndex, 1);
      lines.unshift(declaration[0]);
      fixed = lines.join('\n');
      changes.push('Moved diagram type declaration to top');
    }

    // Fix 6: Remove empty lines that might cause issues
    fixed = fixed.split('\n')
      .map(line => line.trimEnd())
      .filter((line, index, array) => {
        // Keep non-empty lines
        if (line.trim()) return true;
        // Keep single empty lines between content
        if (index > 0 && index < array.length - 1 && 
            array[index - 1].trim() && array[index + 1].trim()) {
          return true;
        }
        return false;
      })
      .join('\n');

    return {
      code: fixed,
      changes: changes,
      wasModified: changes.length > 0
    };
  }

  /**
   * Apply fixes to a markdown file
   */
  applyFixes(filePath, diagrams) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Sort diagrams by line number in reverse order to avoid offset issues
    diagrams.sort((a, b) => b.lineStart - a.lineStart);

    for (const diagram of diagrams) {
      if (diagram.fixed && diagram.fixed.wasModified) {
        const newDiagram = '```mermaid\n' + diagram.fixed.code + '\n```';
        content = content.replace(diagram.original, newDiagram);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return modified;
  }

  /**
   * Run the validation process
   */
  async run() {
    this.log('\n🔍 Mermaid Diagram Validator\n', 'bold');

    // Check for Mermaid CLI
    if (!this.checkMermaidCLI()) {
      this.log('⚠ Mermaid CLI not found', 'yellow');
      const installed = await this.installMermaidCLI();
      if (!installed) {
        process.exit(1);
      }
    }

    // Find all markdown files
    this.log('📂 Scanning for markdown files...', 'blue');
    const files = this.findMarkdownFiles();
    this.log(`   Found ${files.length} markdown files\n`, 'dim');

    // Extract and validate diagrams
    this.log('📊 Extracting and validating diagrams...', 'blue');
    
    for (const file of files) {
      const relativePath = path.relative(process.cwd(), file);
      const diagrams = this.extractDiagrams(file);
      
      if (diagrams.length === 0) continue;

      this.log(`\n📄 ${relativePath}`, 'cyan');
      
      for (const diagram of diagrams) {
        this.results.total++;
        const result = this.validateDiagram(diagram);
        
        if (result.valid) {
          this.results.valid++;
          this.log(`   ✓ Diagram ${diagram.index + 1} (line ${diagram.lineStart}): Valid`, 'green');
        } else {
          this.results.invalid++;
          this.log(`   ✗ Diagram ${diagram.index + 1} (line ${diagram.lineStart}): Invalid`, 'red');
          
          if (this.shouldFix) {
            const fixed = this.fixDiagram(diagram);
            diagram.fixed = fixed;
            
            if (fixed.wasModified) {
              const revalidation = this.validateDiagram({ ...diagram, code: fixed.code });
              if (revalidation.valid) {
                this.results.fixed++;
                this.log(`     ↻ Fixed: ${fixed.changes.join(', ')}`, 'yellow');
              } else {
                this.log(`     ⚠ Auto-fix failed: ${revalidation.error}`, 'yellow');
              }
            }
          } else {
            this.log(`     Error: ${result.error}`, 'dim');
          }
        }

        this.results.diagrams.push({
          file: relativePath,
          index: diagram.index,
          line: diagram.lineStart,
          valid: result.valid,
          error: result.error,
          fixed: diagram.fixed
        });
      }

      // Apply fixes if enabled
      if (this.shouldFix) {
        const fixedDiagrams = diagrams.filter(d => d.fixed && d.fixed.wasModified);
        if (fixedDiagrams.length > 0) {
          this.applyFixes(file, diagrams);
          this.log(`   💾 Saved ${fixedDiagrams.length} fix(es) to file`, 'green');
        }
      }
    }

    // Clean up temp directory
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }

    // Print summary
    this.printSummary();
  }

  /**
   * Print validation summary
   */
  printSummary() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('📊 VALIDATION SUMMARY', 'bold');
    this.log('='.repeat(60), 'cyan');
    
    this.log(`\nTotal diagrams:  ${this.results.total}`, 'bold');
    this.log(`Valid:           ${this.results.valid} ${colors.green}✓${colors.reset}`);
    this.log(`Invalid:         ${this.results.invalid} ${colors.red}✗${colors.reset}`);
    
    if (this.shouldFix) {
      this.log(`Fixed:           ${this.results.fixed} ${colors.yellow}↻${colors.reset}`);
      this.log(`Unfixable:       ${this.results.invalid - this.results.fixed} ${colors.red}⚠${colors.reset}`);
    }

    const successRate = this.results.total > 0 
      ? ((this.results.valid / this.results.total) * 100).toFixed(1)
      : 0;
    
    this.log(`\nSuccess rate:    ${successRate}%\n`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

    // List broken diagrams
    const broken = this.results.diagrams.filter(d => !d.valid && (!d.fixed || !d.fixed.wasModified));
    if (broken.length > 0 && !this.shouldFix) {
      this.log('❌ Broken diagrams:', 'red');
      for (const diagram of broken) {
        this.log(`   • ${diagram.file}:${diagram.line} (diagram ${diagram.index + 1})`, 'dim');
      }
      this.log('\nRun with --fix flag to attempt automatic repairs\n', 'yellow');
    }

    // Exit with error code if there are broken diagrams
    if (this.results.invalid > 0 && this.results.fixed < this.results.invalid) {
      process.exit(1);
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  dir: args.find(arg => !arg.startsWith('--')) || null
};

// If a directory or file is provided, resolve it
if (options.dir) {
  options.dir = path.resolve(process.cwd(), options.dir);
}

const validator = new MermaidValidator(options);
validator.run().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
