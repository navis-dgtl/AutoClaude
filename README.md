# AutoClaude - Automation & Workflow Manager (v1.1.0)

## 🤖 Natural Language Automation for Claude Desktop

AutoClaude transforms your automation ideas into working workflows using natural language. Simply describe what you want to automate, and Claude will create, schedule, and manage the automation for you.

### 🆕 What's New in v1.1.0
- **✅ Full Natural Language Processing**: Actually converts your requests into executable workflows
- **✅ Cross-Platform Support**: Works on Windows, macOS, and Linux
- **✅ Enhanced Security**: Better path validation and memory management
- **✅ Improved Error Handling**: Graceful failures with detailed error messages
- **✅ Queue System**: Prevents concurrent execution conflicts
- **✅ Auto-cleanup**: Prevents memory leaks with automatic history management

## ✨ Features

### 🤖 Natural Language Workflow Creation
- Describe what you want to automate in plain English
- Claude interprets your intent and creates the workflow
- No coding or complex configuration required

### 🎯 Event-Driven Triggers
- **Schedule-based**: Cron-style scheduling (daily, hourly, custom)
- **File System Events**: Monitor file creation, modification, deletion
- **Time-based**: Specific datetime triggers, intervals
- **System Events**: Application launch/close

### 🔧 Powerful Actions
- **File Operations**: Move, copy, delete, create, archive files
- **Directory Management**: Organize folders, create backups
- **Command Execution**: Run terminal commands and scripts
- **Conditional Logic**: If/then/else branching
- **Loops**: For-each and while loops with safety limits
- **Data Processing**: Transform files, parse content

### 🔒 Privacy & Security
- All automation runs locally - no cloud dependencies
- Configurable directory access restrictions
- No sensitive data leaves your machine
- Full control over what workflows can access

### 📊 Management & Monitoring
- Execution history and logs
- Real-time workflow status
- Error handling and recovery
- Performance metrics

## 🚀 Quick Start

### Installation

1. Download the AutoClaude extension (.dxt file)
2. Double-click to install in Claude Desktop
3. Configure your preferences in the extension settings

### Your First Automation

Try saying: *"I want an automation that moves all screenshots from my Desktop to a Screenshots folder in Documents every day at 9 AM"*

Claude will:
1. Analyze your request
2. Create the workflow structure
3. Set up the daily schedule
4. Configure the file operations
5. Enable the automation

## 📋 Example Automations

### Daily File Organization
```
"Move all files older than 7 days from Downloads to Archive folder"
```

### Photo Management
```
"Every hour, move new photos from Desktop to Photos/YYYY/MM folder structure"
```

### Log Cleanup
```
"Delete log files older than 30 days from all project directories"
```

### Backup Automation
```
"Create a backup of my Documents folder every Sunday at midnight"
```

## 🛠 Available Tools

### Core Workflow Management
- `create_workflow` - Create new automation workflows
- `list_workflows` - View all your automations
- `enable_workflow` / `disable_workflow` - Control workflow execution
- `execute_workflow` - Run workflows manually
- `delete_workflow` - Remove workflows permanently

### Intelligence & Analysis
- `interpret_automation` - Convert natural language to structured workflows
- `get_execution_history` - View logs and execution history

## 🔧 Configuration

### Directory Access
Configure which directories AutoClaude can access:
- Default: Desktop, Documents, Downloads
- Customizable through extension settings
- Security-first approach with explicit permissions

### System Commands
- Disabled by default for security
- Enable in settings for advanced automations
- Requires explicit user consent

### Execution Limits
- Maximum execution time per step (default: 5 minutes)
- Log retention period (default: 30 days)
- Memory and resource limits

## 📖 Usage Guide

### 1. Natural Language Description
Start by describing what you want to automate:

```
"I need to organize my desktop every morning. Move all screenshots to a Screenshots folder, PDFs to Documents, and delete empty folders."
```

### 2. Workflow Creation
Claude will analyze your request and create a structured workflow:

```json
{
  "name": "Desktop Organization",
  "triggers": [
    { "type": "schedule", "cron": "0 9 * * *" }
  ],
  "steps": [
    { "type": "file_operation", "operation": "move", "pattern": "*.png" },
    { "type": "file_operation", "operation": "move", "pattern": "*.pdf" },
    { "type": "command", "command": "find", "args": ["-empty", "-type", "d", "-delete"] }
  ]
}
```

### 3. Review & Enable
- Review the generated workflow
- Modify if needed
- Enable to start automation

### 4. Monitor & Manage
- Check execution history
- View logs and performance
- Modify or disable as needed

## 🔐 Security & Privacy

### Local Execution
- All workflows run on your machine
- No data sent to external servers
- Complete control over your automations

### Access Controls
- Directory-based permissions
- Command execution restrictions
- Configurable security policies

### Audit Trail
- Complete execution logging
- Error tracking and debugging
- Performance monitoring

## 🚨 Safety Features

### Execution Limits
- Timeout protection for all operations
- Memory usage monitoring
- Resource consumption limits

### Error Handling
- Graceful failure recovery
- Detailed error reporting
- Rollback capabilities where possible

### Path Validation
- Strict directory access controls
- Protection against path traversal
- Safe file operation handling

## 📊 Monitoring & Logs

### Execution History
- Complete workflow execution records
- Step-by-step progress tracking
- Performance metrics and timing

### Error Reporting
- Detailed error messages
- Stack traces for debugging
- Recovery suggestions

### Log Management
- Automatic log rotation
- Configurable retention periods
- Searchable execution history

## 🛠 Development & Customization

### Workflow Structure
Workflows consist of:
- **Triggers**: When to run (schedule, file events, time-based)
- **Steps**: What to do (file ops, commands, conditions, loops)
- **Context**: Runtime variables and state

### Extensibility
- Plugin architecture for custom actions
- API for external integrations
- Webhook support for remote triggers

## 🤝 Contributing

AutoClaude is built with:
- Node.js and MCP (Model Context Protocol)
- Modern ES modules
- Security-first design
- Comprehensive error handling

### Development Setup
```bash
# Clone and install dependencies
npm install

# Validate extension
npm run validate

# Pack for distribution
npm run pack

# Test locally
npm run dev
```

## 📝 License

MIT License - See LICENSE file for details.

## 🆘 Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Complete API reference
- **Community**: Join discussions and share workflows

## Author

**Navis.Digital**
- Email: navis.dgtl@gmail.com
- GitHub: [@navis-dgtl](https://github.com/navis-dgtl)

---

## 🎯 Real-World Examples

### Screenshot Management
*"Every day at 9 AM, move all screenshots from Desktop to Documents/Screenshots with date folders"*

### Project Cleanup
*"Weekly, archive completed project folders and clean up temporary files"*

### Media Organization
*"Sort downloaded images by date and type into organized folder structures"*

### System Maintenance
*"Monthly cleanup of log files, cache directories, and temporary downloads"*

Start automating your digital life with natural language - just tell Claude what you want to happen! 🚀