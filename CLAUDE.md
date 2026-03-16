# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Apifox Helper is a VS Code extension that parses Spring Boot Controller files and generates OpenAPI documentation that can be uploaded to Apifox. It uses ANTLR4 to parse Java source files and extract API endpoint information.

## Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package the extension (.vsix file)
npm run package

# Publish to VS Code marketplace
npm run publish
```

## Architecture

### Entry Point
- `src/extension.ts` - VS Code extension activation, registers all commands and the API tree view

### Parser Module (`src/parser/`)
- `SpringControllerParser.ts` - Orchestrates parsing, finds Java files via `vscode.workspace.findFiles("**/src/main/java/**/*.java")`
- `SpringControllerListener.ts` - ANTLR4 listener that walks the parse tree and extracts:
  - `@RestController` classes and their `@RequestMapping` base paths
  - HTTP method annotations (`@GetMapping`, `@PostMapping`, etc.)
  - Method parameters with `@PathVariable`, `@RequestParam`, `@RequestBody`
  - Class schemas for DTOs/response types
- `JavaLexer.ts`, `JavaParser.ts` - Generated ANTLR4 lexer/parser
- `OpenAPIGenerator.ts` - Builds OpenAPI spec during tree walking
- `CommentListener.ts` - Extracts comments from Java source

### Services (`src/services/`)
- `ApifoxService.ts` - Uploads OpenAPI spec to Apifox API (`https://api.apifox.cn/v1/projects/{projectId}/import-openapi`)
- `ConfigService.ts` - Manages Apifox credentials stored in `.spring-api-helper.json` in workspace root

### Providers (`src/providers/`)
- `ApiTreeProvider.ts` - Tree view showing APIs grouped by folder (from `@apiFolder` comment annotation)
- `ApiDocumentProvider.ts` - Webview for document preview

### Converters (`src/converters/`)
- `OpenAPIConverter.ts` - Converts `ApiEndpoint[]` to OpenAPI 3.0.1 spec

### Types (`src/types/index.ts`)
- `ApiEndpoint` - Core interface representing a parsed API with path, method, parameters, location

## Key Patterns

### Apifox Folder Annotation
Use `@apiFolder <folder-name>` in class-level Javadoc to organize APIs in the tree view:
```java
/**
 * @apiFolder User Management
 */
@RestController
@RequestMapping("/api/users")
public class UserController { }
```

### Java Type Mapping
`SpringControllerListener.mapJavaTypeToOpenAPI()` maps Java types to OpenAPI types. Extend this for custom types.

### Location Tracking
Each `ApiEndpoint` includes `location: { filePath, line, character }` for "Go to Definition" functionality.

## Configuration

The extension stores Apifox configuration in `.spring-api-helper.json`:
```json
{
  "apiKey": "Bearer token",
  "projectId": "project-id",
  "projectName": "Project Name"
}
```

## Debugging

Press F5 in VS Code to launch the extension in a new Extension Development Host window. The extension activates on startup (`onStartupFinished`).