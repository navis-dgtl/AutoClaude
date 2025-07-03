#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { readFile, writeFile, mkdir, access, readdir, stat, rename, copyFile, rm, rmdir } from "fs/promises";
import { join, dirname, resolve, extname, basename } from "path";
import { fileURLToPath } from "url";
import { platform, homedir } from "os";
import cron from "node-cron";
import chokidar from "chokidar";
import { glob } from "glob";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced configuration with environment variable expansion
const expandPath = (path) => {
  if (!path) return path;
  return path
    .replace(/\$HOME/g, homedir())
    .replace(/\${HOME}/g, homedir())
    .replace(/~/g, homedir());
};

const parseAllowedDirectories = (dirs) => {
  const defaultDirs = [
    join(homedir(), "Desktop"),
    join(homedir(), "Documents"), 
    join(homedir(), "Downloads")
  ];
  
  // Handle command line arguments from directory picker
  if (process.argv.length > 2) {
    // Arguments come after the script name
    const cliDirs = process.argv.slice(2).filter(arg => arg && arg.trim());
    if (cliDirs.length > 0) {
      return cliDirs.map(expandPath);
    }
  }
  
  // Fall back to environment variable
  if (typeof dirs === 'string') {
    return dirs.split(',').map(d => expandPath(d.trim()));
  }
  
  return dirs ? dirs.map(expandPath) : defaultDirs;
};
const CONFIG = {
  MAX_EXECUTION_TIME: (process.env.AUTOCLAUDE_MAX_EXECUTION_TIME ? 
    parseInt(process.env.AUTOCLAUDE_MAX_EXECUTION_TIME) * 1000 : 300000),
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  LOG_RETENTION_DAYS: process.env.AUTOCLAUDE_LOG_RETENTION_DAYS ? 
    parseInt(process.env.AUTOCLAUDE_LOG_RETENTION_DAYS) : 30,
  DATA_DIR: expandPath(process.env.AUTOCLAUDE_DATA_DIR) || join(__dirname, "..", "data"),
  LOGS_DIR: expandPath(process.env.AUTOCLAUDE_LOGS_DIR) || join(__dirname, "..", "logs"),
  ALLOWED_DIRECTORIES: parseAllowedDirectories(process.env.AUTOCLAUDE_ALLOWED_DIRS),
  ENABLE_SYSTEM_COMMANDS: process.env.AUTOCLAUDE_ENABLE_SYSTEM_COMMANDS === "true",
  MAX_EXECUTION_HISTORY: 1000, // Prevent memory leak
  MAX_CONCURRENT_WORKFLOWS: 10 // Limit concurrent executions
};

// Natural Language Parser for workflow creation
class NaturalLanguageParser {
  constructor() {
    this.patterns = {
      // Time patterns
      schedule: {
        daily: /\b(daily|every day|each day)\b/i,
        hourly: /\b(hourly|every hour|each hour)\b/i,
        weekly: /\b(weekly|every week|each week)\b/i,
        monthly: /\b(monthly|every month|each month)\b/i,
        time: /\b(at|@)\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\b/i,
        cron: /\b(\d+\s+\d+\s+\d+\s+\d+\s+\d+)\b/,
        specific: /\b(on|every)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
      },
      // File operation patterns  
      fileOps: {
        move: /\b(move|relocate|transfer)\b/i,
        copy: /\b(copy|duplicate|backup)\b/i,
        delete: /\b(delete|remove|clean|clear)\b/i,
        create: /\b(create|make|new)\s+(folder|directory)\b/i,
        archive: /\b(archive|zip|compress)\b/i
      },
      // Target patterns
      targets: {
        screenshots: /\b(screenshot|screen\s*shot|screen\s*capture)\b/i,
        images: /\b(image|photo|picture|jpg|jpeg|png|gif)\b/i,
        documents: /\b(document|pdf|doc|docx|txt)\b/i,
        downloads: /\b(download|downloaded)\b/i,
        desktop: /\b(desktop)\b/i,
        oldFiles: /\b(old|older than|days old)\b/i
      },
      // Condition patterns
      conditions: {
        ifExists: /\b(if exists|when exists)\b/i,
        ifOlder: /\b(older than|more than)\s*(\d+)\s*(day|hour|week|month)/i,
        ifPattern: /\b(matching|with pattern|like)\b/i
      }
    };
  }
  parse(request) {
    const result = {
      triggers: [],
      steps: [],
      name: "",
      description: request
    };

    // Extract schedule triggers
    const scheduleTrigger = this.parseSchedule(request);
    if (scheduleTrigger) {
      result.triggers.push(scheduleTrigger);
    }

    // Extract file operations
    const fileOps = this.parseFileOperations(request);
    result.steps.push(...fileOps);

    // Generate workflow name
    result.name = this.generateWorkflowName(request);

    return result;
  }

  parseSchedule(text) {
    const schedule = this.patterns.schedule;
    
    if (schedule.daily.test(text)) {
      const timeMatch = text.match(schedule.time);
      if (timeMatch) {
        const hour = parseInt(timeMatch[2]);
        const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        const isPM = /pm/i.test(timeMatch[4] || '');
        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
        return {
          type: "schedule",
          cron: `${minute} ${hour24} * * *`,
          description: `Daily at ${hour}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`
        };
      }
      return {
        type: "schedule", 
        cron: "0 9 * * *",
        description: "Daily at 9:00 AM"
      };
    }
    
    if (schedule.hourly.test(text)) {
      return {
        type: "schedule",
        cron: "0 * * * *",
        description: "Every hour"
      };
    }

    if (schedule.weekly.test(text)) {
      const dayMatch = text.match(schedule.specific);
      if (dayMatch) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(dayMatch[2].toLowerCase());
        return {
          type: "schedule",
          cron: `0 9 * * ${dayIndex}`,
          description: `Weekly on ${dayMatch[2]}`
        };
      }
    }

    return null;
  }
  parseFileOperations(text) {
    const steps = [];
    const fileOps = this.patterns.fileOps;
    const targets = this.patterns.targets;
    
    // Determine operation type
    let operation = "move"; // default
    if (fileOps.copy.test(text)) operation = "copy";
    else if (fileOps.delete.test(text)) operation = "delete";
    else if (fileOps.create.test(text)) operation = "create_directory";
    else if (fileOps.archive.test(text)) operation = "archive";
    
    // Determine file patterns
    const patterns = [];
    if (targets.screenshots.test(text)) {
      patterns.push("*.png", "*.jpg", "*screenshot*.*");
    }
    if (targets.images.test(text)) {
      patterns.push("*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.webp");
    }
    if (targets.documents.test(text)) {
      patterns.push("*.pdf", "*.doc", "*.docx", "*.txt");
    }
    
    // Determine source and destination
    let source = join(homedir(), "Desktop"); // default
    let destination = join(homedir(), "Documents");
    
    if (targets.desktop.test(text)) {
      source = join(homedir(), "Desktop");
    } else if (targets.downloads.test(text)) {
      source = join(homedir(), "Downloads");
    }
    
    // Extract destination folder names from text - handle subdirectories
    const folderMatch = text.match(/to\s+(?:a\s+)?([\/\w\s]+?)\s+folder/i);
    if (folderMatch) {
      const folderPath = folderMatch[1].trim();
      
      // Check if it's a path with subdirectories
      if (folderPath.includes('/')) {
        // Handle paths like "Documents/Screenshots"
        const parts = folderPath.split('/').map(p => p.trim());
        if (parts[0].toLowerCase() === 'documents') {
          destination = join(homedir(), ...parts);
        } else {
          destination = join(homedir(), "Documents", ...parts);
        }
      } else {
        // Single folder name - check common locations
        const folderName = folderPath;
        
        // Check if it's referencing a known location
        if (folderName.toLowerCase() === 'documents') {
          destination = join(homedir(), "Documents");
        } else if (folderName.toLowerCase() === 'pictures' || folderName.toLowerCase() === 'photos') {
          destination = join(homedir(), "Pictures");
        } else if (folderName.toLowerCase() === 'downloads') {
          destination = join(homedir(), "Downloads");
        } else {
          // Assume it's a subfolder in Documents
          destination = join(homedir(), "Documents", folderName);
        }
      }
    }
    
    // Also check for patterns like "Documents/Screenshots" or "in Documents"
    const inFolderMatch = text.match(/(?:in|into)\s+([\/\w\s]+?)(?:\s+folder)?(?:\s|$)/i);
    if (inFolderMatch && !folderMatch) {
      const path = inFolderMatch[1].trim();
      if (path.toLowerCase().includes('documents')) {
        // Extract subfolder after Documents
        const subfolderMatch = path.match(/documents[\/\s]+(\w+)/i);
        if (subfolderMatch) {
          destination = join(homedir(), "Documents", subfolderMatch[1]);
        }
      }
    }
    
    // Create step
    if (patterns.length > 0) {
      for (const pattern of patterns) {
        steps.push({
          id: uuidv4(),
          type: "file_operation",
          operation,
          source,
          destination,
          pattern,
          description: `${operation} ${pattern} files from ${basename(source)} to ${basename(destination)}`
        });
      }
    } else if (operation === "create_directory") {
      steps.push({
        id: uuidv4(),
        type: "file_operation", 
        operation,
        source: destination,
        description: `Create directory ${basename(destination)}`
      });
    }
    
    return steps;
  }
  generateWorkflowName(text) {
    // Extract key action words for name
    const actions = [];
    if (/move/i.test(text)) actions.push("Move");
    if (/copy/i.test(text)) actions.push("Copy");
    if (/delete/i.test(text)) actions.push("Delete");
    if (/archive/i.test(text)) actions.push("Archive");
    
    const targets = [];
    if (/screenshot/i.test(text)) targets.push("Screenshots");
    if (/image|photo/i.test(text)) targets.push("Images");
    if (/document|pdf/i.test(text)) targets.push("Documents");
    if (/download/i.test(text)) targets.push("Downloads");
    
    const timing = [];
    if (/daily/i.test(text)) timing.push("Daily");
    if (/hourly/i.test(text)) timing.push("Hourly");
    if (/weekly/i.test(text)) timing.push("Weekly");
    
    const parts = [...timing, ...actions, ...targets];
    return parts.length > 0 ? parts.join(" ") : "Custom Workflow";
  }
}

class AutoClaudeServer {
  constructor() {
    this.server = new Server(
      {
        name: "autoclaude",
        version: "1.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.workflows = new Map();
    this.scheduledJobs = new Map();
    this.fileWatchers = new Map();
    this.executionHistory = [];
    this.activeProcesses = new Map();
    this.executionQueue = [];
    this.isExecuting = false;

    // Natural language parser
    this.nlParser = new NaturalLanguageParser();

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    this.setupDirectories();
    this.loadWorkflows();
    this.setupHandlers();
    this.startHistoryCleanup();
  }
  async shutdown() {
    console.error("Shutting down AutoClaude...");
    
    // Stop all scheduled jobs
    for (const [key, job] of this.scheduledJobs.entries()) {
      if (job.stop) job.stop();
      if (job.destroy) job.destroy();
      if (job.timeout) clearTimeout(job.timeout);
    }
    
    // Close all file watchers
    for (const [key, watcher] of this.fileWatchers.entries()) {
      await watcher.close();
    }
    
    // Kill all active processes
    for (const [id, proc] of this.activeProcesses.entries()) {
      proc.kill('SIGTERM');
    }
    
    // Save current state
    await this.saveWorkflows();
    
    process.exit(0);
  }

  startHistoryCleanup() {
    // Clean up old execution history every hour
    setInterval(() => {
      const cutoff = Date.now() - (CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      this.executionHistory = this.executionHistory.filter(exec => 
        new Date(exec.startTime).getTime() > cutoff
      );
      
      // Also limit by count
      if (this.executionHistory.length > CONFIG.MAX_EXECUTION_HISTORY) {
        this.executionHistory = this.executionHistory.slice(-CONFIG.MAX_EXECUTION_HISTORY);
      }
    }, 60 * 60 * 1000);
  }

  async setupDirectories() {
    try {
      await mkdir(CONFIG.DATA_DIR, { recursive: true });
      await mkdir(CONFIG.LOGS_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to create directories:", error);
    }
  }

  async loadWorkflows() {
    try {
      const workflowsFile = join(CONFIG.DATA_DIR, "workflows.json");
      await access(workflowsFile);
      const data = await readFile(workflowsFile, "utf8");
      const workflows = JSON.parse(data);
      
      // Load workflows first
      for (const workflow of workflows) {
        this.workflows.set(workflow.id, workflow);
      }
      
      // Then setup triggers
      for (const workflow of workflows) {
        if (workflow.enabled && workflow.triggers) {
          await this.setupTriggers(workflow);
        }
      }
    } catch (error) {
      console.log("No existing workflows found, starting fresh");
    }
  }
  async saveWorkflows() {
    try {
      const workflowsArray = Array.from(this.workflows.values());
      const workflowsFile = join(CONFIG.DATA_DIR, "workflows.json");
      await writeFile(workflowsFile, JSON.stringify(workflowsArray, null, 2));
    } catch (error) {
      console.error("Failed to save workflows:", error);
    }
  }

  async setupTriggers(workflow) {
    for (const trigger of workflow.triggers) {
      try {
        switch (trigger.type) {
          case "schedule":
            this.setupScheduleTrigger(workflow.id, trigger);
            break;
          case "file_event":
            await this.setupFileEventTrigger(workflow.id, trigger);
            break;
          case "time_based":
            this.setupTimeBasedTrigger(workflow.id, trigger);
            break;
        }
      } catch (error) {
        console.error(`Failed to setup trigger for workflow ${workflow.id}:`, error);
      }
    }
  }

  setupScheduleTrigger(workflowId, trigger) {
    if (cron.validate(trigger.cron)) {
      const job = cron.schedule(trigger.cron, () => {
        this.enqueueWorkflow(workflowId, { trigger: "schedule", cron: trigger.cron });
      }, { scheduled: false });
      
      job.start();
      this.scheduledJobs.set(`${workflowId}_${trigger.id || uuidv4()}`, job);
    }
  }
  async setupFileEventTrigger(workflowId, trigger) {
    const watcher = chokidar.watch(trigger.path, {
      ignored: trigger.ignored || /(^|[\/\\])\../,
      persistent: true,
      usePolling: trigger.usePolling || false
    });

    watcher.on(trigger.event, (path) => {
      this.enqueueWorkflow(workflowId, { 
        trigger: "file_event", 
        event: trigger.event, 
        path 
      });
    });

    this.fileWatchers.set(`${workflowId}_${trigger.id || uuidv4()}`, watcher);
  }

  setupTimeBasedTrigger(workflowId, trigger) {
    const delay = new Date(trigger.datetime) - new Date();
    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.enqueueWorkflow(workflowId, { trigger: "time_based", datetime: trigger.datetime });
      }, delay);
      
      this.scheduledJobs.set(`${workflowId}_${trigger.id || uuidv4()}`, { timeout });
    }
  }

  // Queue system to prevent concurrent execution issues
  async enqueueWorkflow(workflowId, context = {}) {
    this.executionQueue.push({ workflowId, context });
    
    if (!this.isExecuting) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.executionQueue.length === 0 || this.isExecuting) {
      return;
    }
    
    this.isExecuting = true;
    
    while (this.executionQueue.length > 0) {
      const { workflowId, context } = this.executionQueue.shift();
      
      // Check concurrent execution limit
      const runningCount = this.executionHistory.filter(e => e.status === "running").length;
      if (runningCount < CONFIG.MAX_CONCURRENT_WORKFLOWS) {
        await this.executeWorkflow(workflowId, context);
      } else {
        // Put it back in queue
        this.executionQueue.unshift({ workflowId, context });
        break;
      }
    }
    
    this.isExecuting = false;
  }
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      return;
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      workflowName: workflow.name,
      startTime: new Date().toISOString(),
      context,
      steps: [],
      status: "running"
    };

    this.executionHistory.push(execution);
    await this.logExecution(execution, "Workflow execution started");

    try {
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, context, executionId);
        execution.steps.push(stepResult);
        
        if (stepResult.status === "failed" && step.onError !== "continue") {
          execution.status = "failed";
          execution.error = stepResult.error;
          break;
        }
      }

      if (execution.status === "running") {
        execution.status = "completed";
      }
    } catch (error) {
      execution.status = "failed";
      execution.error = error.message;
    }

    execution.endTime = new Date().toISOString();
    execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
    
    await this.logExecution(execution, `Workflow execution ${execution.status}`);
  }

  async executeStep(step, context, executionId) {
    const stepExecution = {
      stepId: step.id,
      stepType: step.type,
      startTime: new Date().toISOString(),
      status: "running"
    };

    try {
      switch (step.type) {
        case "file_operation":
          await this.executeFileOperation(step, context);
          break;
        case "command":
          if (!CONFIG.ENABLE_SYSTEM_COMMANDS) {
            throw new Error("System commands are disabled");
          }
          await this.executeCommand(step, context, executionId);
          break;
        case "condition":
          const conditionResult = await this.evaluateCondition(step.condition, context);
          if (!conditionResult && step.onFalse === "stop") {
            stepExecution.status = "skipped";
            return stepExecution;
          }
          break;
        case "loop":
          await this.executeLoop(step, context, executionId);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepExecution.status = "completed";
    } catch (error) {
      stepExecution.status = "failed";
      stepExecution.error = error.message;
    }

    stepExecution.endTime = new Date().toISOString();
    stepExecution.duration = new Date(stepExecution.endTime) - new Date(stepExecution.startTime);
    
    return stepExecution;
  }
  async executeFileOperation(step, context) {
    const { operation, source, destination, pattern, options = {} } = step;
    
    // Validate paths
    if (source && !this.isPathAllowed(source)) {
      throw new Error(`Access denied to path: ${source}`);
    }
    if (destination && !this.isPathAllowed(destination)) {
      throw new Error(`Access denied to path: ${destination}`);
    }

    switch (operation) {
      case "move":
        await this.moveFiles(source, destination, pattern);
        break;
      case "copy":
        await this.copyFiles(source, destination, pattern);
        break;
      case "delete":
        await this.deleteFiles(source, pattern);
        break;
      case "create_directory":
        await mkdir(source, { recursive: true });
        break;
      case "archive":
        await this.archiveFiles(source, destination, options);
        break;
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }
  async executeCommand(step, context, executionId) {
    const { command, args = [], workingDirectory, timeout = CONFIG.MAX_EXECUTION_TIME } = step;
    
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout
      });

      this.activeProcesses.set(executionId, process);

      let stdout = "";
      let stderr = "";

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        this.activeProcesses.delete(executionId);
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(executionId);
        reject(error);
      });
    });
  }

  // Cross-platform file operations using Node.js built-ins
  async moveFiles(source, destination, pattern) {
    const files = pattern ? await glob(pattern, { cwd: source }) : [source];
    
    for (const file of files) {
      const srcPath = pattern ? join(source, file) : file;
      // Fix: Ensure destination is treated as a directory when pattern is used
      let destPath;
      if (pattern) {
        // When moving multiple files, destination should be a directory
        destPath = join(destination, basename(file));
      } else {
        // When moving a single file, check if destination is a directory
        try {
          const destStats = await stat(destination);
          if (destStats.isDirectory()) {
            destPath = join(destination, basename(srcPath));
          } else {
            destPath = destination;
          }
        } catch (error) {
          // Destination doesn't exist, treat as target filename
          destPath = destination;
        }
      }
      
      try {
        // Ensure destination directory exists (including subdirectories)
        await mkdir(dirname(destPath), { recursive: true });
        await rename(srcPath, destPath);
      } catch (error) {
        if (error.code === 'EXDEV') {
          // Cross-device move, copy then delete
          await copyFile(srcPath, destPath);
          await rm(srcPath);
        } else {
          throw error;
        }
      }
    }
  }
  async copyFiles(source, destination, pattern) {
    const files = pattern ? await glob(pattern, { cwd: source }) : [source];
    
    for (const file of files) {
      const srcPath = pattern ? join(source, file) : file;
      const destPath = pattern ? join(destination, basename(file)) : destination;
      
      await mkdir(dirname(destPath), { recursive: true });
      
      const stats = await stat(srcPath);
      if (stats.isDirectory()) {
        // Recursive directory copy
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  async copyDirectory(src, dest) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }
  async deleteFiles(source, pattern) {
    const files = pattern ? await glob(pattern, { cwd: source }) : [source];
    
    for (const file of files) {
      const filePath = pattern ? join(source, file) : file;
      
      const stats = await stat(filePath);
      if (stats.isDirectory()) {
        await rm(filePath, { recursive: true, force: true });
      } else {
        await rm(filePath, { force: true });
      }
    }
  }

  async archiveFiles(source, destination, options) {
    // TODO: Implement archive functionality
    throw new Error("Archive functionality not yet implemented");
  }

  async evaluateCondition(condition, context) {
    // TODO: Implement condition evaluation
    return true;
  }

  async executeLoop(loop, context, executionId) {
    // TODO: Implement loop functionality
    throw new Error("Loop functionality not yet implemented");
  }

  isPathAllowed(path) {
    const resolvedPath = resolve(path);
    const normalizedPath = resolvedPath.toLowerCase();
    
    // Additional security checks
    if (normalizedPath.includes('..')) {
      return false;
    }
    
    return CONFIG.ALLOWED_DIRECTORIES.some(allowedDir => {
      const normalizedAllowed = resolve(allowedDir).toLowerCase();
      return normalizedPath.startsWith(normalizedAllowed);
    });
  }

  async logExecution(execution, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      executionId: execution.id,
      workflowId: execution.workflowId,
      message,
      execution: JSON.stringify(execution, null, 2)
    };

    const logFile = join(CONFIG.LOGS_DIR, `autoclaude-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await writeFile(logFile, logLine, { flag: 'a' });
    } catch (error) {
      console.error("Failed to write log:", error);
    }
  }
  validateWorkflow(workflow) {
    const errors = [];
    
    // Validate required fields
    if (!workflow.name) {
      errors.push("Workflow name is required");
    }
    
    // Validate triggers
    if (workflow.triggers && workflow.triggers.length > 0) {
      for (const trigger of workflow.triggers) {
        if (!trigger.type) {
          errors.push("Trigger type is required");
        }
        
        if (trigger.type === 'schedule' && trigger.cron) {
          if (!cron.validate(trigger.cron)) {
            errors.push(`Invalid cron expression: ${trigger.cron}`);
          }
        }
        
        if (trigger.type === 'file_event' && !trigger.path) {
          errors.push("File event trigger requires a path");
        }
      }
    }
    
    // Validate steps
    if (workflow.steps && workflow.steps.length > 0) {
      for (const step of workflow.steps) {
        if (!step.type) {
          errors.push("Step type is required");
        }
        
        if (step.type === 'file_operation') {
          if (!step.operation) {
            errors.push("File operation type is required");
          }
          if (!step.source && step.operation !== 'create_directory') {
            errors.push("File operation source is required");
          }
        }
      }
    }
    
    return errors;
  }
  setupHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_workflow",
            description: "Create a new automation workflow from natural language description",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "Workflow name" },
                description: { type: "string", description: "Natural language description of what to automate" },
                triggers: {
                  type: "array",
                  description: "When the workflow should run",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["schedule", "file_event", "time_based"] },
                      cron: { type: "string", description: "Cron expression for schedule triggers" },
                      path: { type: "string", description: "Path to watch for file events" },
                      event: { type: "string", enum: ["add", "change", "unlink"], description: "File event type" },
                      datetime: { type: "string", description: "ISO datetime for time-based triggers" }
                    }
                  }
                }
              },
              required: ["name", "description"]
            }
          },
          {
            name: "create_workflow_from_nlp",
            description: "Create a complete workflow from natural language, including triggers and steps",
            inputSchema: {
              type: "object", 
              properties: {
                request: { type: "string", description: "Natural language automation request" }
              },
              required: ["request"]
            }
          },          {
            name: "list_workflows",
            description: "List all automation workflows",
            inputSchema: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["all", "enabled", "disabled"], default: "all" }
              }
            }
          },
          {
            name: "enable_workflow",
            description: "Enable a workflow to start running",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Workflow ID" }
              },
              required: ["workflowId"]
            }
          },
          {
            name: "disable_workflow",
            description: "Disable a workflow to stop it from running",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Workflow ID" }
              },
              required: ["workflowId"]
            }
          },
          {
            name: "delete_workflow",
            description: "Delete a workflow permanently",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Workflow ID" }
              },
              required: ["workflowId"]
            }
          },
          {
            name: "execute_workflow",
            description: "Manually execute a workflow now",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Workflow ID" }
              },
              required: ["workflowId"]
            }
          },
          {
            name: "get_execution_history",
            description: "Get workflow execution history and logs",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Filter by workflow ID (optional)" },
                limit: { type: "integer", default: 50, description: "Maximum number of executions to return" }
              }
            }
          },
          {
            name: "update_workflow",
            description: "Update an existing workflow's steps or configuration",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: { type: "string", description: "Workflow ID" },
                steps: { type: "array", description: "New workflow steps" },
                triggers: { type: "array", description: "New workflow triggers" }
              },
              required: ["workflowId"]
            }
          }
        ]
      };
    });
    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "create_workflow":
            return await this.createWorkflow(args);
          case "create_workflow_from_nlp":
            return await this.createWorkflowFromNLP(args);
          case "list_workflows":
            return await this.listWorkflows(args);
          case "enable_workflow":
            return await this.enableWorkflow(args);
          case "disable_workflow":
            return await this.disableWorkflow(args);
          case "delete_workflow":
            return await this.deleteWorkflow(args);
          case "execute_workflow":
            return await this.manualExecuteWorkflow(args);
          case "get_execution_history":
            return await this.getExecutionHistory(args);
          case "update_workflow":
            return await this.updateWorkflow(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }
  async createWorkflow(args) {
    const { name, description, triggers = [] } = args;
    
    const workflow = {
      id: uuidv4(),
      name,
      description,
      triggers,
      steps: [], // Will be populated by natural language processing
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate workflow
    const errors = this.validateWorkflow(workflow);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.join(', ')}`);
    }

    this.workflows.set(workflow.id, workflow);
    await this.saveWorkflows();

    return {
      content: [
        {
          type: "text",
          text: `Created workflow "${name}" with ID: ${workflow.id}\n\nNext, use create_workflow_from_nlp to add steps based on your description: "${description}"`
        }
      ]
    };
  }

  async createWorkflowFromNLP(args) {
    const { request } = args;
    
    // Parse natural language request
    const parsed = this.nlParser.parse(request);
    
    // Create workflow with parsed data
    const workflow = {
      id: uuidv4(),
      name: parsed.name,
      description: parsed.description,
      triggers: parsed.triggers,
      steps: parsed.steps,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate
    const errors = this.validateWorkflow(workflow);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.join(', ')}`);
    }

    this.workflows.set(workflow.id, workflow);
    await this.saveWorkflows();

    // Generate detailed response
    let response = `✅ Created workflow "${workflow.name}" (ID: ${workflow.id})\n\n`;
    
    if (workflow.triggers.length > 0) {
      response += "📅 **Triggers:**\n";
      for (const trigger of workflow.triggers) {
        if (trigger.type === "schedule") {
          response += `  • Schedule: ${trigger.description || trigger.cron}\n`;
        } else if (trigger.type === "file_event") {
          response += `  • File event: ${trigger.event} on ${trigger.path}\n`;
        }
      }
      response += "\n";
    }
    
    if (workflow.steps.length > 0) {
      response += "📋 **Steps:**\n";
      for (const step of workflow.steps) {
        response += `  ${workflow.steps.indexOf(step) + 1}. ${step.description || step.type}\n`;
      }
      response += "\n";
    }
    
    response += "Use 'enable_workflow' to activate this automation.";

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
  async updateWorkflow(args) {
    const { workflowId, steps, triggers } = args;
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Update workflow
    if (steps) {
      workflow.steps = steps;
    }
    if (triggers) {
      // Clean up old triggers if workflow is enabled
      if (workflow.enabled) {
        await this.disableWorkflow({ workflowId });
        workflow.triggers = triggers;
        await this.enableWorkflow({ workflowId });
      } else {
        workflow.triggers = triggers;
      }
    }
    
    workflow.updatedAt = new Date().toISOString();
    
    // Validate
    const errors = this.validateWorkflow(workflow);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.join(', ')}`);
    }
    
    await this.saveWorkflows();

    return {
      content: [
        {
          type: "text",
          text: `Updated workflow "${workflow.name}" (${workflowId})`
        }
      ]
    };
  }
  async listWorkflows(args) {
    const { status = "all" } = args;
    const workflows = Array.from(this.workflows.values());
    
    const filtered = status === "all" ? workflows : 
                    workflows.filter(w => status === "enabled" ? w.enabled : !w.enabled);

    if (filtered.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No ${status === "all" ? "" : status} workflows found.\n\nCreate your first workflow with: create_workflow_from_nlp`
          }
        ]
      };
    }

    const workflowList = filtered.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      enabled: w.enabled,
      triggers: w.triggers ? w.triggers.length : 0,
      steps: w.steps ? w.steps.length : 0,
      createdAt: w.createdAt
    }));

    let response = `Found ${workflowList.length} workflow${workflowList.length === 1 ? '' : 's'}:\n\n`;
    
    for (const w of workflowList) {
      response += `📋 **${w.name}** (${w.id})\n`;
      response += `   Status: ${w.enabled ? '✅ Enabled' : '⏸️ Disabled'}\n`;
      response += `   Triggers: ${w.triggers} | Steps: ${w.steps}\n`;
      response += `   Created: ${new Date(w.createdAt).toLocaleString()}\n\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
  async enableWorkflow(args) {
    const { workflowId } = args;
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.enabled) {
      return {
        content: [
          {
            type: "text",
            text: `Workflow "${workflow.name}" is already enabled`
          }
        ]
      };
    }

    workflow.enabled = true;
    workflow.updatedAt = new Date().toISOString();
    
    await this.setupTriggers(workflow);
    await this.saveWorkflows();

    return {
      content: [
        {
          type: "text",
          text: `✅ Enabled workflow "${workflow.name}" (${workflowId})`
        }
      ]
    };
  }
  async disableWorkflow(args) {
    const { workflowId } = args;
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      return {
        content: [
          {
            type: "text",
            text: `Workflow "${workflow.name}" is already disabled`
          }
        ]
      };
    }

    workflow.enabled = false;
    workflow.updatedAt = new Date().toISOString();
    
    // Clean up triggers
    for (const [key, job] of this.scheduledJobs.entries()) {
      if (key.startsWith(workflowId)) {
        if (job.stop) job.stop();
        if (job.destroy) job.destroy();
        if (job.timeout) clearTimeout(job.timeout);
        this.scheduledJobs.delete(key);
      }
    }

    for (const [key, watcher] of this.fileWatchers.entries()) {
      if (key.startsWith(workflowId)) {
        await watcher.close();
        this.fileWatchers.delete(key);
      }
    }

    await this.saveWorkflows();

    return {
      content: [
        {
          type: "text",
          text: `⏸️ Disabled workflow "${workflow.name}" (${workflowId})`
        }
      ]
    };
  }
  async deleteWorkflow(args) {
    const { workflowId } = args;
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Disable first to clean up triggers
    if (workflow.enabled) {
      await this.disableWorkflow(args);
    }
    
    this.workflows.delete(workflowId);
    await this.saveWorkflows();

    return {
      content: [
        {
          type: "text",
          text: `🗑️ Deleted workflow "${workflow.name}" (${workflowId})`
        }
      ]
    };
  }
  async manualExecuteWorkflow(args) {
    const { workflowId } = args;
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error(`Workflow "${workflow.name}" has no steps to execute`);
    }

    // Enqueue for execution
    this.enqueueWorkflow(workflowId, { trigger: "manual" });

    return {
      content: [
        {
          type: "text",
          text: `▶️ Started manual execution of workflow "${workflow.name}" (${workflowId})`
        }
      ]
    };
  }
  async getExecutionHistory(args) {
    const { workflowId, limit = 50 } = args;
    
    let history = this.executionHistory;
    if (workflowId) {
      history = history.filter(h => h.workflowId === workflowId);
    }

    history = history.slice(-limit).reverse(); // Most recent first

    if (history.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: workflowId ? 
              `No execution history found for workflow ${workflowId}` :
              `No execution history found. Run a workflow to see its history.`
          }
        ]
      };
    }

    const summary = history.map(h => ({
      id: h.id,
      workflowName: h.workflowName,
      status: h.status,
      startTime: h.startTime,
      duration: h.duration,
      stepsCompleted: h.steps ? h.steps.filter(s => s.status === 'completed').length : 0,
      totalSteps: h.steps ? h.steps.length : 0,
      error: h.error
    }));

    let response = `📊 Execution history (${summary.length} entries):\n\n`;
    
    for (const h of summary) {
      const statusIcon = h.status === 'completed' ? '✅' : 
                        h.status === 'failed' ? '❌' : '⏳';
      
      response += `${statusIcon} **${h.workflowName}**\n`;
      response += `   Status: ${h.status.toUpperCase()}\n`;
      response += `   Started: ${new Date(h.startTime).toLocaleString()}\n`;
      response += `   Duration: ${h.duration ? `${h.duration}ms` : 'N/A'}\n`;
      response += `   Steps: ${h.stepsCompleted}/${h.totalSteps}\n`;
      if (h.error) {
        response += `   Error: ${h.error}\n`;
      }
      response += `\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
}
// Start the server
const autoClaudeServer = new AutoClaudeServer();
const transport = new StdioServerTransport();
autoClaudeServer.server.connect(transport);

console.error("AutoClaude Automation & Workflow Manager running...");
console.error(`Data directory: ${CONFIG.DATA_DIR}`);
console.error(`Logs directory: ${CONFIG.LOGS_DIR}`);
console.error(`System commands enabled: ${CONFIG.ENABLE_SYSTEM_COMMANDS}`);
console.error(`Platform: ${platform()}`);
console.error(`Allowed directories: ${CONFIG.ALLOWED_DIRECTORIES.join(', ')}`);