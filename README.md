# HTML to MD

A [Joplin](https://joplinapp.org/) plugin that bulk-converts HTML notes to Markdown.

Joplin lets individual notes be created or synced in as HTML rather than Markdown, but it has no built-in way to convert a whole notebook's worth of HTML notes back to Markdown in one go. This plugin adds that: pick a notebook, and every HTML note inside it (including sub-notebooks) is converted to Markdown in place.

## Features

- Adds a **Convert all HTML to MD** command under the **Tools** menu.
- Lets you pick any notebook from a hierarchical (indented) list.
- Recurses into all sub-notebooks of the selected notebook.
- Only touches notes whose markup language is HTML — Markdown notes are left untouched.
- Shows a confirmation screen with the number of notes found before converting anything.
- Converts HTML to Markdown using [Turndown](https://github.com/mixmark-io/turndown), then updates each note's body and sets its markup language to Markdown.
- Reports how many notes were converted and lists any errors encountered.

## Usage

1. In Joplin, go to **Tools > Convert all HTML to MD**.
2. Choose a notebook from the dropdown. All HTML notes in it and its sub-notebooks will be included.
3. Click **Next**, review the number of notes found, then click **Convert**.
4. A summary is shown once conversion finishes.

> **Note:** Conversion rewrites each note's body in place and cannot be undone from within the plugin. Joplin's note history (or your own backup/sync) can be used to recover a previous version if needed.

## Installation

1. Download the `.jpl` file from the [releases](https://github.com/SimonRundell/joplin.firstTest) page (or build it yourself, see below).
2. In Joplin, go to **Options > Plugins**, click the gear icon, and choose **Install from file**.
3. Select the downloaded `.jpl` file and restart Joplin.

## Development

This plugin is built with the standard [Joplin plugin generator](https://github.com/laurent22/generator-joplin) toolchain. For details on the project structure, build process, and publishing, see [GENERATOR_DOC.md](./GENERATOR_DOC.md).

Common commands:

```bash
npm install      # install dependencies
npm run dist      # build the plugin (output in /dist and /publish)
npm run updateVersion   # bump the patch version in package.json and manifest.json
```

## License

Released under Creative Commons NC-BY-SA 4.0.

## Author

Simon Rundell — [simonrundell.com](https://simonrundell.com)
