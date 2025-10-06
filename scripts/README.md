# Scripts

This directory contains Python scripts for generating language configuration and syntax highlighting files for the Jamkit VS Code extension.

## Scripts

### generate-language.py

Generates language configuration files from templates.

**Usage:**
```bash
./scripts/generate-language.py <language>
```

**Parameters:**
- `<language>`: Language identifier (sbss, sbml, or bon)

**What it does:**
- Reads template from `templates/<language>-configuration.template.json`
- Replaces `__WORD_PATTERN__` placeholder with a dynamically built regex pattern
- Outputs to `languages/<language>-configuration.json`

**Word Pattern:**
The script generates a regex pattern that matches:
- Property names and values: `[\w-]+(@(verso|recto))?`
- Variables: `\$[A-Z_][A-Z0-9_]*`

### generate-syntax.py

Generates TextMate grammar files for syntax highlighting from templates.

**Usage:**
```bash
./scripts/generate-syntax.py <language>
```

**Parameters:**
- `<language>`: Language identifier (sbss, sbml, or bon)

**What it does:**
- Reads template from `templates/<language>.tmLanguage.template.json`
- Replaces pattern placeholders with generated regex patterns:
  - `__PROP_LIST_PATTERNS__`: Property pairs with `=` separator and `,` terminator
  - `__PROP_GROUP_PATTERNS__`: Property pairs with `:` separator and `;` terminator
  - `__INLINE_PROP_LIST_PATTERNS__`: Inline property list patterns
  - `__EXPRESSION_PATTERNS__`: Expression patterns (variables, operators, lengths)
- Replaces style placeholders with TextMate scope names
- Outputs to `syntaxes/<language>.tmLanguage.json`

**Supported Syntax Elements:**
- SBSS-specific: imports, conditionals (if/elif/else/end), selectors
- SBML-specific: imports, sections (begin/end), conditionals, objects, styles, anchors
- Common: property names/values, variables, operators, lengths, comments

## Automated Build

These scripts are invoked automatically via the makefile:

```bash
# Generate all language files
make

# Generate specific language
make languages/sbss-configuration.json
make syntaxes/sbml.tmLanguage.json

# Clean generated files
make clean
```

See the root [makefile](../makefile) for the complete build configuration.

## Development Workflow

1. Edit templates in `templates/` directory
2. Run `make` to regenerate language and syntax files
3. Generated files should not be edited directly
4. Always commit both templates and generated files together
