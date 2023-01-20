# Jamkit Tools

<img src="https://user-images.githubusercontent.com/1925108/212315307-d1e3e715-9a3d-48d8-b1e8-b8fe117bdf12.gif" width="600" />

## Features

- Syntax highlighting for SBML & SBSS
- Auto-completion
   - well-known property values
- Diagnostics
   - Error for invalid value for well-known property
   - Error for dangling `=end` in *.sbml
   - Warning `=begin` / `=end` tag mismatch in *.sbml

## TODO

- Auto-completion
   - Directives
   - Property names
   - Trigger suggestion via word characters (currently, triggered only via ':' & '=')
- Diagnostics
   - import file check - exists?, is sbss?, ...
   - if/elif/else/end match in *.sbss
   - ...
- Code Actions
   - All possible fixes for diagnostics
- Addition syntax highlighting via extension
