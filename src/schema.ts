// Canonical distributable JSON schema is schemas/evidence-1.0.0.schema.json.
export const evidenceSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/zof/evidence/1.0.0/schema.json",
  "title": "Portable verification evidence 1.0.0",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "createdAt": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$"
    },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "repository": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 1024
            },
            {
              "type": "null"
            }
          ]
        },
        "commit": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 200
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "repository",
        "commit"
      ]
    },
    "tool": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "version": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        }
      },
      "required": [
        "name",
        "version"
      ]
    },
    "type": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "execution": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "status": {
          "enum": [
            "completed",
            "partial",
            "missing",
            "error"
          ]
        },
        "result": {
          "enum": [
            "pass",
            "fail",
            "unknown"
          ]
        }
      },
      "required": [
        "status",
        "result"
      ]
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "severity": {
            "enum": [
              "info",
              "low",
              "medium",
              "high",
              "critical"
            ]
          },
          "message": {
            "type": "string",
            "minLength": 1,
            "maxLength": 4096
          },
          "path": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024,
            "pattern": "^(?!/)(?!.*(?:^|/)\\.\\.?(/|$))(?!.*//)(?!.*[/]$)[^\\\\\\u0000-\\u001f\\u007f:%?#]+$"
          },
          "line": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100000000
          }
        },
        "required": [
          "id",
          "severity",
          "message"
        ]
      },
      "maxItems": 10000
    },
    "tests": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          "status": {
            "enum": [
              "passed",
              "failed",
              "skipped",
              "error"
            ]
          },
          "durationMs": {
            "type": "number",
            "minimum": 0,
            "maximum": 1000000000000
          }
        },
        "required": [
          "name",
          "status"
        ]
      },
      "maxItems": 10000
    },
    "artifacts": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "path": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1024,
            "pattern": "^(?!/)(?!.*(?:^|/)\\.\\.?(/|$))(?!.*//)(?!.*[/]$)[^\\\\\\u0000-\\u001f\\u007f:%?#]+$"
          },
          "mediaType": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "sizeBytes": {
            "type": "integer",
            "minimum": 0,
            "maximum": 1000000000000
          },
          "sha256": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          }
        },
        "required": [
          "name",
          "path"
        ]
      },
      "maxItems": 1000
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "producer": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "runId": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "workflow": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      },
      "required": []
    },
    "integrity": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "algorithm": {
          "const": "sha256"
        },
        "digest": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        }
      },
      "required": [
        "algorithm",
        "digest"
      ]
    },
    "signatures": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "algorithm": {
            "const": "ed25519"
          },
          "keyId": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "value": {
            "type": "string",
            "pattern": "^[A-Za-z0-9+/]{86}==$"
          }
        },
        "required": [
          "algorithm",
          "keyId",
          "value"
        ]
      },
      "maxItems": 100
    },
    "policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "result": {
          "enum": [
            "pass",
            "fail",
            "unknown"
          ]
        },
        "rules": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 200
              },
              "result": {
                "enum": [
                  "pass",
                  "fail",
                  "unknown"
                ]
              }
            },
            "required": [
              "id",
              "result"
            ]
          },
          "maxItems": 10000
        }
      },
      "required": [
        "result",
        "rules"
      ]
    },
    "environment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "os": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "architecture": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "runtime": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "ci": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        }
      },
      "required": []
    },
    "extensions": {
      "type": "object",
      "maxProperties": 100,
      "propertyNames": {
        "pattern": "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$"
      },
      "additionalProperties": {
        "$ref": "#/$defs/jsonValue"
      }
    }
  },
  "required": [
    "schemaVersion",
    "id",
    "createdAt",
    "source",
    "tool",
    "type",
    "execution",
    "findings",
    "tests",
    "artifacts"
  ],
  "$defs": {
    "jsonValue": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "boolean"
        },
        {
          "type": "number"
        },
        {
          "type": "string",
          "maxLength": 4096
        },
        {
          "type": "array",
          "items": {
            "$ref": "#/$defs/jsonValue"
          },
          "maxItems": 1000
        },
        {
          "type": "object",
          "maxProperties": 100,
          "additionalProperties": {
            "$ref": "#/$defs/jsonValue"
          }
        }
      ]
    }
  }
} as const;
