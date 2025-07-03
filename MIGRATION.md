# AutoClaude Migration Guide

## Updating from v1.0.0 to v1.1.0

### Breaking Changes
None! The update is backward compatible. Your existing workflows will continue to work.

### New Features to Try

#### 1. Natural Language Workflow Creation
Instead of manually creating workflows, you can now use:
```
create_workflow_from_nlp with request: "Move screenshots from Desktop to Documents daily at 9 AM"
```

#### 2. Cross-Platform Support
The extension now works on:
- Windows
- macOS  
- Linux

No configuration changes needed - it automatically detects your platform.

### Recommended Actions

1. **Update your allowed directories** (if using environment variables):
   - Old: `/Users/john/Desktop`
   - New: `$HOME/Desktop` or `~/Desktop`

2. **Enable the new features**:
   - Natural language processing is automatic
   - Cross-platform support is automatic
   - Memory management is automatic

3. **Test your existing workflows**:
   - They should work without changes
   - File operations are now more reliable
   - Better error messages if something fails

### Configuration Updates

The extension now supports these environment variables:
- `AUTOCLAUDE_DATA_DIR` - Where to store workflow data
- `AUTOCLAUDE_LOGS_DIR` - Where to store logs
- `AUTOCLAUDE_ALLOWED_DIRS` - Comma-separated list of allowed directories
- `AUTOCLAUDE_MAX_EXECUTION_TIME` - Max seconds per step (default: 300)
- `AUTOCLAUDE_LOG_RETENTION_DAYS` - Days to keep logs (default: 30)
- `AUTOCLAUDE_ENABLE_SYSTEM_COMMANDS` - Allow system commands (default: false)

### Troubleshooting

If you experience issues after updating:

1. **Workflows not triggering**:
   - Disable and re-enable the workflow
   - Check the cron expression is valid

2. **File operations failing**:
   - Check directory permissions
   - Ensure paths are in allowed directories
   - Use absolute paths for reliability

3. **Memory issues**:
   - The new version automatically manages memory
   - Old execution history is cleaned up hourly
   - Maximum 1000 history entries kept

### Support

Report issues on GitHub: https://github.com/navis-dgtl/autoclaude-dxt
