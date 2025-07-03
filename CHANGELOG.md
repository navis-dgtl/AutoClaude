# AutoClaude Changelog

## Version 1.2.0 (Directory UI & Subdirectory Fix)

### ✨ New Features
1. **Directory Picker UI**
   - Changed from comma-separated text input to multiple directory picker
   - Each directory gets its own line with folder icon
   - Matches the UI pattern of the filesystem extension
   - Directories passed as command line arguments

### 🐛 Bug Fixes
1. **Subdirectory Creation Fixed**
   - Screenshots folder in Documents now properly created
   - Better path handling for nested directories
   - Supports patterns like "Documents/Screenshots" or "to Screenshots folder in Documents"
   - Automatically creates subdirectories with `recursive: true`

2. **Natural Language Parser Improvements**
   - Better recognition of subdirectory paths
   - Handles variations like:
     - "to Screenshots folder in Documents"
     - "to Documents/Screenshots"
     - "to a Screenshots folder"
   - Smart destination detection for common folders

3. **File Move Operation Enhanced**
   - Properly handles destination as directory vs filename
   - Creates intermediate directories as needed
   - Better error handling for cross-device moves

### 🔧 Technical Changes
1. **Configuration Updates**
   - Changed `allowed_directories` from string to directory type
   - Added `multiple: true` and `required: true` flags
   - Removed default paths (user must select)

2. **Server Updates**
   - Parse directories from command line arguments
   - Enhanced logging shows allowed directories
   - Better path expansion and validation

## Version 1.1.0 (Fixed Version)

### 🚨 Critical Fixes
1. **Implemented Natural Language Processing**
   - Added NaturalLanguageParser class that actually converts text to workflows
   - Supports scheduling patterns (daily, hourly, weekly, specific times)
   - Recognizes file operations (move, copy, delete, create, archive)
   - Identifies file types (screenshots, images, documents, downloads)
   - Generates appropriate workflow names and descriptions

2. **Cross-Platform File Operations**
   - Replaced Unix-specific commands (mv, cp, rm) with Node.js built-in functions
   - Uses fs.promises for all file operations
   - Handles cross-device moves properly
   - Works on Windows, macOS, and Linux

3. **Fixed Memory Leaks**
   - Added MAX_EXECUTION_HISTORY limit (1000 entries)
   - Automatic cleanup of old execution history
   - Proper cleanup of scheduled jobs and file watchers
   - Graceful shutdown handling

### 🐛 Bug Fixes
1. **Configuration Parsing**
   - Added environment variable expansion for paths
   - Supports $HOME, ${HOME}, and ~ notation
   - Properly handles comma-separated directory lists

2. **Workflow Loading Race Condition**
   - Loads all workflows first, then sets up triggers
   - Prevents triggers from firing before workflows are ready

3. **Process Management**
   - Added proper cleanup on shutdown
   - Kills active processes on SIGINT/SIGTERM
   - Closes file watchers properly

4. **Path Security**
   - Enhanced path validation
   - Prevents path traversal attacks
   - Case-insensitive path checking

### ✨ New Features
1. **Execution Queue System**
   - Prevents concurrent execution conflicts
   - Configurable MAX_CONCURRENT_WORKFLOWS limit
   - Queues workflows for sequential execution

2. **Workflow Validation**
   - Validates all workflow fields before saving
   - Checks cron expressions
   - Validates step configurations

3. **Enhanced Tool: create_workflow_from_nlp**
   - Single-step workflow creation from natural language
   - Automatically generates triggers and steps
   - Provides detailed feedback on created workflows

4. **Update Workflow Tool**
   - Allows updating existing workflow steps and triggers
   - Handles enabled/disabled state properly

5. **Better Error Responses**
   - Consistent error handling across all tools
   - User-friendly error messages
   - Prevents duplicate operations

### 🔧 Code Quality Improvements
1. **Modular Architecture**
   - Separated natural language parsing into its own class
   - Better separation of concerns
   - Cleaner code organization

2. **Proper Async/Await Usage**
   - Fixed promise handling throughout
   - No more callback hell
   - Better error propagation

3. **Enhanced Logging**
   - More descriptive console output
   - Shows platform information
   - Better execution tracking

### 📋 Known Limitations (Still TODO)
1. Archive functionality not implemented
2. Loop functionality not implemented  
3. Advanced condition evaluation not implemented
4. No webhook support yet
5. No plugin architecture yet

### 🔐 Security Enhancements
1. Directory access restrictions enforced
2. Command execution disabled by default
3. Path validation on all file operations
4. No shell injection vulnerabilities

### 📊 Performance Improvements
1. Efficient file operations using streams
2. Automatic history cleanup
3. Resource usage limits
4. Proper memory management

## Version 1.0.0 (Original)
- Initial release with basic workflow engine
- Manual workflow creation only
- Limited platform support
