# AutoClaude Example Workflows

These example workflows demonstrate how to use AutoClaude with natural language.

## 1. Daily Screenshot Organization

**Natural language request:**
"Move all screenshots from my Desktop to a Screenshots folder in Documents every day at 9 AM"

**What it creates:**
- Schedule trigger: Daily at 9 AM
- File operation: Move *.png files from Desktop to Documents/Screenshots

## 2. Weekly Downloads Cleanup

**Natural language request:**
"Every Sunday at midnight, move files older than 7 days from Downloads to an Archive folder"

**What it creates:**
- Schedule trigger: Weekly on Sunday at midnight
- File operation: Move old files from Downloads to Documents/Archive

## 3. Photo Organization

**Natural language request:**
"Every hour, copy new photos from Desktop to Pictures folder"

**What it creates:**
- Schedule trigger: Every hour
- File operation: Copy image files (jpg, png, gif) from Desktop to Pictures

## 4. Document Backup

**Natural language request:**
"Daily at 6 PM, copy all PDF documents from Desktop to a Backup folder"

**What it creates:**
- Schedule trigger: Daily at 6 PM
- File operation: Copy *.pdf files from Desktop to Documents/Backup

## 5. Temporary Files Cleanup

**Natural language request:**
"Delete all files matching *temp* or *tmp* from Downloads folder daily"

**What it creates:**
- Schedule trigger: Daily
- File operation: Delete temporary files from Downloads

## Usage in Claude

1. Open Claude Desktop with AutoClaude extension installed
2. Say: "I want to [your automation request]"
3. Claude will use the AutoClaude extension to create the workflow
4. Enable the workflow when ready
5. Monitor execution with "show execution history"

## Example Commands

```
# Create a workflow
"Create an automation that moves screenshots from Desktop to Documents daily at 9 AM"

# List workflows
"Show me all my workflows"

# Enable a workflow
"Enable the screenshot organization workflow"

# Check execution history
"Show execution history for my workflows"

# Manual execution
"Run the screenshot workflow now"
```
