# Source Code

This directory contains the TypeScript source code for the Jamkit VS Code extension. The code is organized into logical modules that handle syntax analysis, code completion, caching, and language services.

## Table of Contents

- [Entry Point](#entry-point)
- [Core Extension](#core-extension)
- [Syntax Analysis](#syntax-analysis)
- [Code Completion](#code-completion)
- [Context Parsing](#context-parsing)
- [Property System](#property-system)
- [Caching System](#caching-system)
- [Utilities](#utilities)
- [Architecture](#architecture)

## Entry Point

### extension.ts
**Purpose**: Extension activation entry point

- Exports `activate()` function called by VS Code
- Delegates to `JamkitExtension.init()`
- Minimal bootstrapping code

**Key Function**:
```typescript
export function activate(context: vscode.ExtensionContext)
```

## Core Extension

### JamkitExtension.ts
**Purpose**: Main extension orchestrator

**Responsibilities**:
- Initialize all subsystems (caches, completion handlers)
- Register language features (diagnostics, color provider)
- Manage document lifecycle events
- Coordinate syntax analysis

**Initialization Sequence**:
```
JamkitExtension.init()
  ├─> VariableCache.init()
  ├─> ScriptNameCache.init()
  ├─> PropConfigStore.init()
  ├─> AssetRepository.init()
  ├─> SbssCompletionHandler.init()
  └─> SbmlCompletionHandler.init()
```

**Features**:
- Document change tracking
- Real-time diagnostics
- Color picker for SBSS/SBML
- Active document management

**Key Methods**:
- `init()` - Initialize extension
- `setActiveDocument()` - Track active editor
- `analize()` - Run syntax analysis on document
- `clearDiagnostics()` - Clear diagnostic markers

## Syntax Analysis

### SyntaxAnalyser.ts
**Purpose**: Base class for syntax analysis

**Abstract Methods**:
- `analyse()` - Perform syntax analysis, return diagnostics
- `getColorInfomrations()` - Extract color information for color picker

### SbmlSyntaxAnalyser.ts
**Purpose**: SBML syntax analyzer

**Features**:
- Parse SBML structure (sections, objects, properties)
- Validate property names and values
- Extract color values for color picker
- Generate diagnostics for syntax errors
- Handle conditionals (`=if`, `=elif`, `=else`)
- Validate object types and property assignments

**Key Validations**:
- Property name validity
- Property value format
- Color format validation
- Required properties for object types
- Section structure

### SbssSyntaxAnalyser.ts
**Purpose**: SBSS syntax analyzer

**Features**:
- Parse SBSS selectors and style blocks
- Validate property-value pairs
- Extract color values
- Handle imports and conditionals
- Support both inline (`:`) and block (`{}`) styles

**Key Validations**:
- Selector syntax
- Property names and values
- Variable references
- Import statements

## Code Completion

### SbmlCompletionHandler.ts
**Purpose**: IntelliSense for SBML files

**Features**:
- Object type suggestions (`=object <type>`)
- Property name completion
- Property value completion (context-aware)
- Variable suggestions
- Asset filename suggestions
- Script function suggestions

**Trigger Characters**: `=`, `,`, `$`

**Context Detection**:
- Detect current object type
- Parse property context (name vs value)
- Provide relevant suggestions based on cursor position

### SbssCompletionHandler.ts
**Purpose**: IntelliSense for SBSS files

**Features**:
- Property name completion for selectors
- Property value suggestions
- Variable completion
- Style references

**Trigger Characters**: `:`, `,`, `$`

### PropCompletionItemProvider.ts
**Purpose**: Generic property completion provider

**Responsibilities**:
- Convert `PropValueSpec` to VS Code completion items
- Handle different value categories (`#color`, `#length`, `#function`, etc.)
- Generate completion items with appropriate icons

## Context Parsing

### ContextParser.ts
**Purpose**: Base class for parsing editing context

**Key Concepts**:
- **PropGroupContext**: Identifies property group (list or block)
- **PropNameContext**: Cursor is at property name position
- **PropValueContext**: Cursor is at property value position

**Abstract Method**:
- `parsePropGroupContext()` - Language-specific context detection

**Key Method**:
- `parsePropContext()` - Determine if cursor is at name or value position

### SbmlContextParser.ts
**Purpose**: Parse SBML editing context

**Features**:
- Detect section context (`=begin`, `=end`)
- Detect object context (`=object`, `=image`)
- Detect inline object context (`=(object ...)=`)
- Determine property target type

**Context Types**:
- Text content
- Section properties
- Block object properties
- Inline object properties

### SbssContextParser.ts
**Purpose**: Parse SBSS editing context

**Features**:
- Detect selector context
- Identify property groups (inline vs block)
- Determine property target type

## Property System

### PropConfigStore.ts
**Purpose**: Load and manage property configurations from JSON files

**Responsibilities**:
- Load attribute JSON files from [attributes/](../attributes/) directory
- Merge property configurations
- Provide property names for specific targets
- Provide property value specifications
- Handle special properties (script, sound)

**Property Resolution Order**:
- **Text**: `core.text.json` → `core.common.json`
- **Section**: `core.section.json` → `core.box.json` → `core.common.json`
- **Block Object**: `<type>.json` → `core.object.block.json` → `core.object.json` → `core.box.json` → `core.common.json`
- **Inline Object**: `<type>.json` → `core.object.inline.json` → `core.object.json` → `core.common.json`

**Special Handling**:
- Properties matching `script`, `script-when-*`, `*-script` → `#function`
- Properties matching `sound`, `sound-when-*` → `#sound-filename`

**Key Methods**:
- `init()` - Load all attribute files
- `getKnownObjectTypes()` - Return list of valid object types
- `getKnownPropNames()` - Return valid property names for target
- `getPropValueSpec()` - Return value specification for property

### PropValueSpec.ts
**Purpose**: Define and validate property value specifications

**Value Categories**:
- `#color` - Color values (hex, rgb, rgba)
- `#length` - Length units (pw, ph, cw, ch, %, etc.)
- `#4-sided-length` - Four-sided values (margin, padding)
- `#size` - Width/height pairs
- `#font-size` - Font size values
- `#font-family` - Font family names
- `#font` - Complete font specification
- `#image-filename` - Image file paths
- `#image-url` - Image URLs
- `#video-id` - Video identifiers
- `#sound-filename` - Sound file paths
- `#function` - JavaScript function names
- `#style-name` - Style references
- `#sbml-filename` - SBML file references
- `#json-filename` - JSON file references

**Features**:
- Value validation against patterns or enums
- Generate completion suggestions
- Merge multiple specifications
- Check asset existence
- Validate function names
- Validate color formats

**Key Methods**:
- `from()` - Create specification from JSON
- `verify()` - Validate a value
- `getSuggestions()` - Generate completion suggestions
- `merge()` - Merge two specifications

### PropTarget.ts
**Purpose**: Define property target types

**PropTargetKind Enum**:
- `Unknown` - Unknown target
- `Text` - Text content
- `Section` - Section block
- `BlockObject` - Block-level object
- `InlineObject` - Inline object

**PropTarget Interface**:
```typescript
interface PropTarget {
    kind: PropTargetKind;
    objectType?: string;  // e.g., "label", "image", "button"
}
```

### PropGroupParser.ts
**Purpose**: Parse property groups (lists and blocks)

**Parser Types**:
- **PropListParser**: Parse comma-separated properties (`prop=value, prop2=value2`)
- **PropBlockParser**: Parse semicolon-terminated properties (`prop: value; prop2: value2;`)

**Parse States**:
- `BeforeName` - Before property name
- `InName` - Inside property name
- `AfterName` - After property name
- `BeforeValue` - Before property value
- `InValue` - Inside property value
- `AfterValue` - After property value

**Key Methods**:
- `parse()` - Parse a line of text
- `getState()` - Get current parse state
- `getPropName()` - Get current property name

## Caching System

### VariableCache.ts
**Purpose**: Cache variable definitions from SBSS/SBML files

**Features**:
- Watch all `.sbss` and `.sbml` files in workspace
- Parse variable definitions (`$VARIABLE_NAME = value`)
- Provide variable names and values for completion
- Invalidate cache on file changes

**Key Methods**:
- `init()` - Initialize file watcher
- `getVariableNames()` - Get all variable names
- `getVariableValue()` - Get value of a variable
- `parseVariableDefinitions()` - Extract variables from document

### ScriptNameCache.ts
**Purpose**: Cache JavaScript function names

**Features**:
- Watch all `.js` files in workspace
- Use Acorn parser to extract top-level functions
- Support `function` declarations and `const/var` function expressions
- Provide function names for `#function` value suggestions
- Invalidate cache on file changes

**Function Types Detected**:
- `function foo() {}`
- `const foo = function() {}`
- `const foo = () => {}`

**Key Methods**:
- `init()` - Initialize file watcher
- `getTopLevelFunctionNames()` - Get functions for a document
- `parseFuncNames()` - Parse JavaScript AST for functions

### AssetRepository.ts
**Purpose**: Cache and enumerate asset files

**Asset Types**:
- `Image` - Image files (`Images/` directory)
- `Audio` - Audio files (`Audios/` directory)
- `Video` - Video files (`Videos/` directory)
- `Sound` - Sound effects (`Sounds/` directory)
- `Effect` - Effect files (`Effects/` directory)
- `Text` - Text files (`Texts/` directory)

**Features**:
- Watch asset directories for changes
- Enumerate files in current directory and project root
- Find project root via `catalog.bon` or `book.bon`
- Cache asset lists per directory

**Key Methods**:
- `init()` - Initialize file watcher
- `enumerateFileNames()` - Get asset files of specific type
- `getAssetDirPath()` - Find asset directory path

## Utilities

### utils.ts
**Purpose**: Common utility functions

**Color Utilities**:
- `isColorText()` - Check if string is valid color
- `toColor()` - Parse color string to VS Code Color object
- `toString()` - Convert Color to hex string

**String Utilities**:
- `unquote()` - Remove quotes and unescape string

**File Utilities**:
- `existsReferredFile()` - Check if referenced file exists
- `enumerateReferrableFiles()` - List files in same directory

**Supported Color Formats**:
- `#fff`, `#ffff` (3/4 digit hex)
- `#ffffff`, `#ffffffff` (6/8 digit hex)
- `rgb(128, 128, 128)`
- `rgba(128, 128, 128, 0.5)`

### patterns.ts
**Purpose**: Regular expression patterns for parsing

**SBML Patterns**:
- `SBML_PROP_LIST_PREFIX` - Match `=begin`, `=style`, `=object`, `=image`
- `SBML_COMMENT` - Match `=comment` lines
- `SBML_END` - Match `=end` directive
- `SBML_INLINE_OBJECT_PREFIX` - Match inline object syntax

**SBSS Patterns**:
- `SBSS_PROP_GROUP_PREFIX` - Match selector with `:` or `{`
- `SBSS_PROP_LIST_PREFIX` - Match selector with `:` (inline style)
- `SBSS_PROP_BLOCK_PREFIX` - Match selector with `{` (block style)
- `SBSS_PROP_BLOCK_SUFFIX` - Match `}` closing brace

**Functions**:
- `parseSbssVariableDefinition()` - Extract variable name and value

### Expression.ts
**Purpose**: Parse and evaluate Jamkit expressions

**Features**:
- Parse arithmetic expressions
- Parse comparison expressions
- Support variables (`$VARIABLE_NAME`)
- Support operators: `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `<=`, `>`, `>=`
- Support length units (pw, ph, cw, ch, %, etc.)
- Evaluate expressions with variable substitution

**Key Classes**:
- `Expression` - Base expression class
- `BinaryExpression` - Binary operations
- `UnaryExpression` - Unary operations
- `VariableExpression` - Variable references
- `LiteralExpression` - Literal values

**Key Functions**:
- `parseExpression()` - Parse expression from string
- `evaluate()` - Evaluate expression with context

## Architecture

### Data Flow

```
User Types
    ↓
VS Code Event (onDidChangeTextDocument, provideCompletionItems)
    ↓
JamkitExtension / CompletionHandler
    ↓
ContextParser (determine context)
    ↓
PropConfigStore (get valid properties)
    ↓
PropValueSpec (validate/suggest values)
    ↓
Caches (variables, functions, assets)
    ↓
VS Code UI (diagnostics, completions, color picker)
```

### Subsystem Dependencies

```
JamkitExtension
├─> VariableCache (variables)
├─> ScriptNameCache (functions)
├─> PropConfigStore (properties)
│   └─> PropValueSpec (value validation)
├─> AssetRepository (asset files)
├─> SbmlCompletionHandler
│   ├─> SbmlContextParser
│   ├─> PropConfigStore
│   └─> PropCompletionItemProvider
├─> SbssCompletionHandler
│   ├─> SbssContextParser
│   ├─> PropConfigStore
│   └─> PropCompletionItemProvider
├─> SbmlSyntaxAnalyser
│   └─> PropConfigStore
└─> SbssSyntaxAnalyser
    └─> PropConfigStore
```

### File Type Handling

| File Type | Syntax Analyser | Completion Handler | Context Parser |
|-----------|----------------|-------------------|----------------|
| `.sbml` | SbmlSyntaxAnalyser | SbmlCompletionHandler | SbmlContextParser |
| `.sbss` | SbssSyntaxAnalyser | SbssCompletionHandler | SbssContextParser |
| `.bon` | None | None | None |

BON files only have syntax highlighting (via TextMate grammar), no language services.

### Extension Points

To add a new language feature:

1. **Syntax Validation**: Add rules to `Sbml/SbssSyntaxAnalyser.ts`
2. **Code Completion**: Extend `Sbml/SbssCompletionHandler.ts`
3. **Property Types**: Add to [attributes/](../attributes/) JSON files
4. **Value Categories**: Extend `PropValueSpec.ts` with new category handling
5. **Asset Types**: Add to `AssetRepository.ts` and `AssetKind` enum

## Development Guidelines

### Adding a New Property Type

1. Add property to appropriate JSON file in [attributes/](../attributes/)
2. If new value category needed, update `PropValueSpec.ts`:
   - Add to `KNOWN_CATEGORIES`
   - Add validation in `verify()`
   - Add suggestions in `getSuggestions()`
3. Test with completion and validation

### Adding a New Object Type

1. Create `attributes/objects/<type>.json`
2. Define object-specific properties
3. Extension auto-loads on initialization
4. Test object type appears in completion

### Debugging Tips

- Use `console.log()` for debugging (visible in "Extension Host" output)
- Set breakpoints in TypeScript source
- Run extension with F5 (launches Extension Development Host)
- Check diagnostics in Problems panel
- Test completions with Ctrl+Space

### Testing Changes

1. Make code changes
2. Run `npm run compile` (or use watch mode)
3. Press F5 to launch Extension Development Host
4. Test in `.sbml` or `.sbss` files
5. Check output in "Extension Host" console

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Acorn JavaScript Parser](https://github.com/acornjs/acorn)
- [TextMate Grammars](https://macromates.com/manual/en/language_grammars)
