# Jamkit Tools

<img src="https://user-images.githubusercontent.com/1925108/212315307-d1e3e715-9a3d-48d8-b1e8-b8fe117bdf12.gif" width="600" />

## How To

### Run `vscode-jamkit`

If you're running it for the first time, run the following commands.
```bash
$ npm install        # install 3rd-party libraries
$ npm run compile    # transpile TypeScript code to JavaScript
```

Also, you might need to run the following commands if you pulled new changes from remote.
This (re)generates language rules and syntax coloring files.
```bash
$ make
```

Then select the menu: `Run` > `Run Without Debugging`. If successful, a new instance of VSCode will launch.

### Build `vsix` package

Install `vsce` command-line tool if you haven't already.
```bash
$ npm install --global @vscode/vsce
```
Run `vsce` via `make`.
```bash
$ make package
```

If the command was successful, you would see something like the following:
```bash
./scripts/generate-syntax.py sbss
./scripts/generate-syntax.py sbml
./scripts/generate-language.py sbss
./scripts/generate-language.py sbml
vsce package
Executing prepublish script 'npm run vscode:prepublish'...

> jamkit-tools@0.1.1 vscode:prepublish
> npm run compile

> jamkit-tools@0.1.1 compile
> tsc -p ./

DONE  Packaged: /Users/chanryu/Projects/vscode-jamkit/jamkit-tools-0.1.1.vsix (69 files, 55.91KB)
```

## TODO

- https://github.com/bookjam/vscode-jamkit/wiki/TODO
