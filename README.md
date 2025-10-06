# Jamkit for Visual Studio Code

<img src="https://user-images.githubusercontent.com/1925108/212315307-d1e3e715-9a3d-48d8-b1e8-b8fe117bdf12.gif" width="600" />

A Visual Studio Code extension that provides comprehensive language support for Jamkit development, including syntax highlighting, IntelliSense, diagnostics, and more for SBML, SBSS, and BON languages.

## Features

### Language Support
- **SBML** (Smart Book Markup Language) - `.sbml` files
- **SBSS** (Smart Book Style Sheet) - `.sbss` files
- **BON** (Bookjam Object Notation) - `.bon` files

### Core Features
- **Syntax Highlighting** - TextMate grammar-based syntax coloring for all three languages
- **IntelliSense** - Code completion for properties, values, variables, and assets
- **Diagnostics** - Real-time error detection and validation
- **Color Picker** - Visual color picker for color values in SBML and SBSS
- **Variable Support** - Variable definition tracking and reference resolution
- **Asset References** - Asset path resolution and validation
- **Script Name Cache** - Script name tracking across files

## Getting Started

### Installation

Install from the VS Code marketplace or build from source.

### Development Setup

If you're running the extension for development:

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Generate language configuration and syntax files
make
```

Then select `Run > Run Without Debugging` in VS Code. A new VS Code window will launch with the extension loaded.

### Watch Mode

For continuous development:

```bash
npm run watch
```

This will automatically recompile TypeScript files when changes are detected.

## Building

### Prerequisites

Install the `vsce` command-line tool:

```bash
npm install --global @vscode/vsce
```

### Create VSIX Package

```bash
make package
```

This command will:
1. Generate language configuration files from templates
2. Generate syntax highlighting files from templates
3. Compile TypeScript code
4. Package everything into a `.vsix` file

Example output:
```bash
./scripts/generate-syntax.py sbml
./scripts/generate-syntax.py sbss
./scripts/generate-syntax.py bon
./scripts/generate-language.py sbml
./scripts/generate-language.py sbss
./scripts/generate-language.py bon
vsce package
Executing prepublish script 'npm run vscode:prepublish'...

> vscode-jamkit@0.2.2 vscode:prepublish
> npm run compile

> vscode-jamkit@0.2.2 compile
> tsc -p ./

DONE  Packaged: /Users/hanyeol/Projects/io.jamkit/vscode-jamkit/vscode-jamkit-0.2.2.vsix (XX files, XX.XXKB)
```

## Project Structure

```
vscode-jamkit/
├── src/                          # TypeScript source files
│   ├── extension.ts              # Extension entry point
│   ├── JamkitExtension.ts        # Main extension class
│   ├── SbmlSyntaxAnalyser.ts     # SBML syntax analysis
│   ├── SbssSyntaxAnalyser.ts     # SBSS syntax analysis
│   ├── SbmlCompletionHandler.ts  # SBML IntelliSense
│   ├── SbssCompletionHandler.ts  # SBSS IntelliSense
│   ├── PropConfigStore.ts        # Property configuration management
│   ├── VariableCache.ts          # Variable tracking
│   ├── ScriptNameCache.ts        # Script name tracking
│   └── AssetRepository.ts        # Asset management
├── scripts/                      # Python build scripts
│   ├── generate-language.py      # Generate language configs
│   └── generate-syntax.py        # Generate syntax files
├── templates/                    # Language definition templates
│   ├── *.tmLanguage.template.json    # Syntax templates
│   └── *-configuration.template.json # Language config templates
├── languages/                    # Generated language configs
├── syntaxes/                     # Generated TextMate grammars
├── out/                          # Compiled JavaScript (generated)
├── makefile                      # Build automation
├── package.json                  # Extension manifest
└── tsconfig.json                 # TypeScript configuration
```

## Development Workflow

### Modifying Language Definitions

Language configurations and syntax highlighting are generated from templates:

1. Edit templates in [templates/](templates/) directory
2. Run `make` to regenerate files in `languages/` and `syntaxes/`
3. Test changes by running the extension in debug mode
4. Commit both template and generated files

**Important**: Never edit generated files directly. Always modify templates and regenerate.

See [scripts/README.md](scripts/README.md) for detailed documentation on the generation process.

### Testing

```bash
# Run tests (requires compilation first)
npm run test

# Or use pretest to compile and test
npm run pretest && npm run test
```

## Architecture

The extension follows a modular architecture:

1. **Extension Entry** ([src/extension.ts](src/extension.ts)) - VS Code activation
2. **Extension Core** ([src/JamkitExtension.ts](src/JamkitExtension.ts)) - Initializes subsystems
3. **Caching Layer** - Variables, script names, assets, property configs
4. **Language Services** - Syntax analysis, completion, diagnostics
5. **Context Parsing** - Understanding code structure and context

### Initialization Sequence

```
extension.activate()
  └─> JamkitExtension.init()
       ├─> VariableCache.init()
       ├─> ScriptNameCache.init()
       ├─> PropConfigStore.init()
       ├─> AssetRepository.init()
       ├─> SbssCompletionHandler.init()
       └─> SbmlCompletionHandler.init()
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Resources

- [Repository](https://github.com/bookjam/vscode-jamkit)
- [Issues](https://github.com/bookjam/vscode-jamkit/issues)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)

## License

See [LICENSE](LICENSE) file for details.
