# AutoClaude Data Directory

This directory stores workflow definitions and runtime data.

## Files

- `workflows.json` - Persisted workflow definitions and configurations
- `config.json` - Extension configuration settings (created automatically)

## Structure

Workflows are stored as JSON objects with the following structure:

```json
{
  "id": "unique-workflow-id",
  "name": "Human-readable workflow name",
  "description": "Natural language description",
  "triggers": [
    {
      "type": "schedule|file_event|time_based",
      "cron": "0 9 * * *",
      "path": "/path/to/watch",
      "event": "add|change|unlink"
    }
  ],
  "steps": [
    {
      "id": "step-id",
      "type": "file_operation|command|condition|loop",
      "operation": "move|copy|delete|create_directory|archive",
      "source": "/source/path",
      "destination": "/destination/path",
      "pattern": "*.png"
    }
  ],
  "enabled": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

## Security

This directory should only contain workflow definitions and configuration.
No sensitive data like passwords or API keys should be stored here.