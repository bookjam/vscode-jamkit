# Attributes

This directory contains JSON configuration files that define properties (attributes) for SBML and SBSS languages. These files are used by the extension to provide IntelliSense, auto-completion, and validation for Jamkit properties.

## Directory Structure

```
attributes/
├── core.common.json          # Common properties (fonts, text styling)
├── core.box.json             # Box model properties (margin, padding, border)
├── core.section.json         # Section-specific properties
├── core.text.json            # Text-specific properties
├── core.object.json          # Base object properties
├── core.object.block.json    # Block object properties
├── core.object.inline.json   # Inline object properties
└── objects/                  # Object-type-specific properties
    ├── label.json
    ├── image.json
    ├── button.json
    ├── ... (50+ object types)
    └── _container.json
```

## Core Attribute Files

### core.common.json
Common properties shared across all elements:
- **Language**: `lang` (de, en, fr, es, etc.)
- **Font**: `font-weight`, `font-style`, `font-size`, `font-family`, `font-no-scale`
- **Text**: `text-orientation`, `text-color`, `text-decoration`
- **Style**: `style` (style name reference)

### core.box.json
Box model and layout properties:
- **Margin**: `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
- **Padding**: `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
- **Border**: `border-width`, `border-style`, `border-color`, `border-radius` (and sides)
- **Background**: `background-color`, `background-image`, `background-image-type`
- **Layout**: `width`, `height`, `position`, `gravity`, `align`
- **Flow**: `adaptive`, `flow`, `flow-mode`
- **Effects**: `box-shadow`

### core.section.json
Section-level properties for `=begin`/`=end` blocks:
- **Identification**: `id`, `title`, `toc`, `alt`
- **Page**: `page-title-color`, `page-number-color`, `page-header-hidden`, `page-footer-hidden`
- **Page Background**: `page-background`, `page-background-color`, `page-background-image`
- **Layout**: `rowspan`, `colspan`, `pack`, `clear`, `begin-new-page`
- **Display**: `display`, `writing-mode`, `page-side`
- **Text**: `text-align`, `text-justify`, `vertical-align`, `line-break-mode`
- **Spacing**: `line-height`, `line-spacing`, `paragraph-spacing`, `spacing`
- **Table**: `border-collapse`
- **Bullets**: `bullet-text-align`, `bullet-font-weight`, `bullet-font-style`, `bullet-font-size`
- **Behavior**: `shut-in-adaptives`, `control-touchable`, `dragging-enabled`
- **Special**: `action-when-touched`, `episode`, `reading-track`, `audio-track`, `exam`

### core.text.json
Text content properties:
- **Font**: `font-family`, `font-weight`, `font-style`, `font-size`, `font-no-scale`
- **Text**: `text-color`, `text-decoration`, `text-orientation`
- **Style**: `style` (style reference)

### core.object.json
Base properties for all objects (`=object`, `=image`):
- **Identification**: `id`, `reuse-id`, `group`, `peer-group`, `alt`
- **Actions**: `action`, `post-action`, `post-params`
- **Type**: `type` (cover, youtube, bgm, loading, etc.)
- **Messages**: `prompt`, `message`, `prompt-message`
- **Targets**: `owner`, `target`, `object`, `subview`, `event`
- **Appearance**: `alpha`, `hidden`, `content-background-color`, `content-border-*`
- **Size**: `width`, `height`, `max-width`, `min-width`, `max-height`, `min-height`
- **Transform**: `rotation`
- **Behavior**: `toggle`, `autoresizing`, `clips-to-bounds`, `ignore-touches`
- **State**: `saves-state`, `stake-key`
- **Dragging**: `draggable`, `offset`, `max-x`, `min-x`, `max-y`, `min-y`
- **Scroll**: `follows-scroll`, `follow-action`, `velocity-when-follow`
- **Keyboard**: `resizes-on-keyboard`, `moves-on-keyboard`
- **Lifecycle**: `hides-when-activate`, `hides-when-pause`, `suspends-when-reuse`
- **Display**: `indicator`, `uses-for-screenshot`, `constraint-disabled`
- **Navigation**: `has-own-title`, `navibar-title`, `params-when-selected`

### core.object.block.json
Additional properties for block-level objects:
- Currently minimal (mostly references core.object.json)

### core.object.inline.json
Additional properties for inline objects:
- Currently minimal (mostly references core.object.json)

## Object-Specific Attributes

The `objects/` directory contains property definitions for specific object types. Each file defines properties unique to that object type.

### Example: label.json
```json
{
    "text": "?",
    "waiting-text": "?",
    "font": "#font",
    "text-align": ["left", "right", "center"],
    "line-spacing": "?",
    "line-break-mode": ["word-wrap", "character-wrap", "tail-truncation", ...],
    "number-of-lines": {
        "value-pattern": "\\d",
        "suggestions": ["1", "2", "3", ...]
    },
    "text-color": "#color",
    "shadow-color": "#color",
    "content-padding": "#4-sided-length"
}
```

### Example: image.json
```json
{
    "filename": "#image-filename",
    "image-url": "#image-url",
    "video-id": "#video-id",
    "quality": ["low", "medium", "high"],
    "scale-mode": ["fill", "fit"],
    "default-image": "#image-filename",
    "content-size": "#size"
}
```

### Common Object Types
- **UI Controls**: `button`, `checkbox`, `choices`, `switch`, `slider`, `textfield`
- **Media**: `image`, `video`, `audio`, `animation`, `lottie`
- **Containers**: `list`, `table`, `scroll`, `stack`, `webview`
- **Navigation**: `navibar`, `tab`, `popup`, `subview`
- **Special**: `map`, `camera`, `chart`, `drawing`, `editor`

## Property Value Specifications

### Value Types

Properties can have different value type specifications:

#### 1. Fixed Value List (Array)
```json
"text-align": ["left", "right", "center"]
```
Only these exact values are valid.

#### 2. Reference Types (String starting with `#`)
```json
"text-color": "#color",
"filename": "#image-filename",
"font": "#font"
```
References a predefined value type (color, filename, font, etc.).

Common reference types:
- `#color` - Color values
- `#length` - Length units (pw, ph, cw, ch, %, etc.)
- `#4-sided-length` - Four-sided values (margin, padding)
- `#font-size` - Font size values
- `#font-family` - Font family names
- `#image-filename` - Image file paths
- `#image-url` - Image URLs
- `#sound-filename` - Sound file paths
- `#function` - Script function names
- `#style-name` - Style references
- `#size` - Size values (width, height)

#### 3. Pattern-Based (Object with value-pattern)
```json
"number-of-lines": {
    "value-pattern": "\\d",
    "suggestions": ["1", "2", "3", "4", "5"]
}
```
Value must match the regex pattern, with optional suggestions for auto-completion.

#### 4. Complex Object (Object with values and suggestions)
```json
"display": {
    "values": ["none", "section", "block", "list", "list-item", "table"],
    "suggestions": ["none", "block", "list", "list-item", "table"]
}
```
All values in `values` are valid, but only `suggestions` are shown in auto-completion.

#### 5. Free-Form (String with `?`)
```json
"id": "?",
"text": "?"
```
Any string value is accepted (no validation).

#### 6. TODO/Undefined
```json
"border-style": "// TODO: define value spec"
```
Property exists but value specification is not yet defined.

## Import Mechanism

Attribute files can import other files using the `@import` directive:

```json
{
    "@import": ["core.common.json", "core.box.json"],
    "property1": "value1",
    "property2": "value2"
}
```

This allows object-specific files to inherit common properties without duplication.

## Usage in Extension

The [PropConfigStore](../src/PropConfigStore.ts) loads these files at extension initialization:

1. **Load Phase**: Reads all `.json` files from `attributes/` and `attributes/objects/`
2. **Merge Phase**: Merges property specs into a global configuration
3. **Query Phase**: Provides property names and value specs based on context

### Property Resolution Order

When resolving properties for a specific target, the extension uses this hierarchy:

#### For Text
1. `core.text.json`
2. `core.common.json`

#### For Sections
1. `core.section.json`
2. `core.box.json`
3. `core.common.json`

#### For Block Objects (e.g., `=object label`)
1. `label.json` (object-specific)
2. `core.object.block.json`
3. `core.object.json`
4. `core.box.json`
5. `core.common.json`

#### For Inline Objects (e.g., `=(object image, ...)=`)
1. `image.json` (object-specific)
2. `core.object.inline.json`
3. `core.object.json`
4. `core.common.json`

### Special Property Handling

Some properties have special rules in [PropConfigStore.ts:126-132](../src/PropConfigStore.ts#L126):

- **Script properties**: Properties named `script`, `script-when-*`, or `*-script` automatically get `#function` spec
- **Sound properties**: Properties named `sound` or `sound-when-*` automatically get `#sound-filename` spec

## Modifying Attributes

### Adding a New Property

1. Determine the appropriate file(s) for the property
2. Add the property with its value specification
3. Test with the extension in debug mode
4. Verify auto-completion and validation work correctly

### Adding a New Object Type

1. Create `objects/<type>.json`
2. Define object-specific properties
3. The extension will automatically load it on next initialization
4. Object type will appear in auto-completion for `=object` and `=image`

### Testing Changes

1. Edit attribute JSON file
2. Reload VS Code window (`Developer: Reload Window`)
3. Test IntelliSense in `.sbml` or `.sbss` files
4. Verify property suggestions appear correctly
5. Verify value suggestions work as expected

## File Naming Conventions

- `core.*.json` - Core/base properties
- `*.json` (in objects/) - Object-type-specific properties
- `_*.json` - Utility files (not loaded as object types)

Files starting with `_` are skipped during object type enumeration ([PropConfigStore.ts:76](../src/PropConfigStore.ts#L76)).

## References

- [PropConfigStore.ts](../src/PropConfigStore.ts) - Loads and manages attribute configurations
- [PropValueSpec.ts](../src/PropValueSpec.ts) - Defines property value specifications
- [PropTarget.ts](../src/PropTarget.ts) - Defines property target types
- [SbmlCompletionHandler.ts](../src/SbmlCompletionHandler.ts) - Uses attributes for SBML IntelliSense
- [SbssCompletionHandler.ts](../src/SbssCompletionHandler.ts) - Uses attributes for SBSS IntelliSense
