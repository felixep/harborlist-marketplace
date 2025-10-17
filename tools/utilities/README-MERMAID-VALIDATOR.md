# Mermaid Diagram Validator

A comprehensive tool to validate and fix Mermaid diagrams across all documentation files.

## Overview

This script scans all markdown files in the `docs/` directory, extracts Mermaid diagrams, validates their syntax using the Mermaid CLI, and optionally fixes common issues.

## Features

- ✅ **Automatic Discovery**: Finds all markdown files and Mermaid diagrams automatically
- ✅ **Syntax Validation**: Uses Mermaid CLI to validate each diagram can be rendered
- ✅ **Detailed Reporting**: Shows which diagrams are valid/invalid with line numbers
- ✅ **Auto-Fix Capability**: Attempts to fix common syntax issues
- ✅ **Non-Destructive**: Only modifies files when `--fix` flag is used
- ✅ **Success Metrics**: Provides completion rate and success statistics

## Installation

The script will automatically install the Mermaid CLI if it's not already present:

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Usage

### Basic Validation (Read-only)

Scan all diagrams and report issues without making changes:

```bash
node tools/utilities/validate-mermaid-diagrams.js
```

### Validate and Fix

Scan diagrams and automatically fix common issues:

```bash
node tools/utilities/validate-mermaid-diagrams.js --fix
```

## Output Example

```
🔍 Mermaid Diagram Validator

📂 Scanning for markdown files...
   Found 79 markdown files

📊 Extracting and validating diagrams...

📄 docs/architecture/README.md
   ✓ Diagram 1 (line 63): Valid
   ✓ Diagram 2 (line 156): Valid
   ...

📄 docs/architecture/api-architecture.md
   ✓ Diagram 1 (line 7): Valid
   ✗ Diagram 2 (line 47): Invalid
     Error: Parse error on line 3...
   ...

============================================================
📊 VALIDATION SUMMARY
============================================================

Total diagrams:  56
Valid:           56 ✓
Invalid:         0 ✗

Success rate:    100.0%
```

## Common Issues Fixed

The auto-fix feature handles:

1. **Spacing around arrows**: Ensures proper spacing around `-->`, `->`, `---`, etc.
2. **Duplicate style declarations**: Removes redundant style statements
3. **Diagram type positioning**: Moves diagram type declaration to the top
4. **Empty line cleanup**: Removes problematic empty lines

## Issues Requiring Manual Fix

Some issues require manual intervention:

1. **Special characters in labels**: Parentheses `()`, brackets `[]`, slashes `/` in node labels
2. **Complex multi-line text**: `<br/>` tags with special formatting
3. **Invalid node IDs**: Characters that aren't alphanumeric, hyphen, or underscore

### Manual Fix Guidelines

When fixing manually:

- Wrap node labels containing special characters in double quotes: `Node["Label with (parens)"]`
- Replace parentheses with alternative text: `(Strict)` → `Strict` or use quotes
- Escape or avoid slashes in labels: `/path/` → `path` or `"path/to/file"`
- For curly braces in paths, wrap in quotes: `["/api/{id}"]`

## Fixed Issues in This Repository

The following diagrams were fixed during the initial run:

1. **docs/architecture/api-architecture.md:47**
   - Issue: Forward slashes and curly braces in route paths
   - Fix: Wrapped all labels in double quotes

2. **docs/architecture/infrastructure-deployment.md:7**
   - Issue: Parentheses in domain names like `(api-dev.harborlist.com)`
   - Fix: Changed to colons: `Custom Domain: api-dev.harborlist.com`

3. **docs/architecture/infrastructure-deployment.md:198**
   - Issue: Parentheses in `(Strict)` mode text
   - Fix: Removed parentheses: `Full Strict Mode`

4. **docs/architecture/infrastructure-deployment.md:322**
   - Issue: Brackets and slashes in folder names like `[account]` and `/listing-{id}/`
   - Fix: Changed to descriptive text: `listing-id folder`

5. **docs/backend/README.md:17**
   - Issue: Parentheses in `(Sharp)` library name
   - Fix: Changed to `with Sharp`

## Integration with CI/CD

You can integrate this into your CI/CD pipeline:

```bash
# In your GitHub Actions or other CI
node tools/utilities/validate-mermaid-diagrams.js
# Exit code 1 if any diagrams are invalid
```

## Related Tools

- **fix-diagram-layouts.js**: Legacy tool that replaces specific known broken diagrams
- This validator complements it by checking ALL diagrams systematically

## Tips

- Run validation after adding or modifying any Mermaid diagrams
- Use `--fix` flag carefully and review changes before committing
- Some complex diagrams may need manual simplification
- Keep node labels simple and avoid special characters when possible

## Troubleshooting

### Mermaid CLI Installation Issues

If automatic installation fails:

```bash
npm install -g @mermaid-js/mermaid-cli
```

### Validation Timeouts

Large or complex diagrams may timeout. The script has a 10-second timeout per diagram.

### False Positives

If a diagram validates but doesn't render correctly in GitHub:
- GitHub may use a different Mermaid version
- Try simplifying the diagram syntax
- Check GitHub's Mermaid documentation for supported features

## Current Status

✅ **All 56 diagrams in the repository are valid** (as of last run)

## Maintenance

Re-run this validator whenever:
- Adding new documentation with Mermaid diagrams
- Modifying existing diagrams
- Upgrading Mermaid CLI or dependencies
- Before major releases

---

**Created**: October 17, 2025  
**Last Updated**: October 17, 2025  
**Success Rate**: 100% (56/56 diagrams valid)
