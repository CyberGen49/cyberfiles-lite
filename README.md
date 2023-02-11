
# CyberFiles Lite
A (not-so) bare-bones file index built to work with Node.js Express and look like GitHub's file browser.

![CyberFiles Light promotional image](/promo.png)

## Features
* Easy and portable setup
* A minimalistic, modern, and responsive design
* Customizable themes with several built-in options
* Choose the root of your file index
* Use RegEx to hide (and prevent access to) certain files and directories
* Serve directory index files (like `index.html`) automatically
* Render a directory's README.md file below the file list
    * The contents of the README are also shown in that directory's link preview when sent on platforms like Discord
* View text files, images, videos, and audio files without leaving your browser
    * Text files of [certain formats](/prism-lang-exts.json) are syntax-highlighted
    * Videos and audio files use embedded players provided by [@CyberGen49/web-resources](https://github.com/CyberGen49/web-resources) (undocumented)
* Use the automatically-generated table of contents button to quickly jump to headings in markdown files
* Conveniently move between files in the file viewer using the next/previous arrows
* Change the sort order of a directory
* Filter files in a directory just by pressing Ctrl + F
* View the file extension breakdown of a directory in the **File info** pane
* Quickly download whole directories as zip files
* See image previews before clicking with thumbnails
* Get a better look at your files with tile view
    * Directories where more than 50% of the contents have thumbnails will use tile view automatically (see [auto_view](#boolean-auto_view) and [auto_view_threshold](#number-auto_view_threshold))
* Add to your existing [ExpressJS](https://github.com/expressjs/express) projects

## Running CyberFiles Lite standalone
If your main goal is to get a simple file index up and running, a standalone CyberFiles Lite installation is the way to go!

### Preparation
First, install [git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/en/download/) (tested and working on `v18.12.1`).

Next, create or choose a directory where the files you want to serve are stored. Open your terminal, and `cd` into it:

```bash
cd /path/to/my/files
```

### Installation

Now, we'll download CyberFiles Lite. The easiest way to do this is to clone the repository. This will place all of the code into a new folder.

```bash
git clone https://github.com/CyberGen49/cyberfiles-lite.git
```

Once git has finished cloning the repo, we'll rename the folder, adding an underscore at the beginning. This will hide the folder by default on the website, preventing users from entering it. After renaming, we'll `cd` into it.

```bash
mv ./cyberfiles-lite ./_cyberfiles
cd ./_cyberfiles
```

Next, we'll install all of CyberFiles Lite's dependencies from `npm`:

```bash
npm i
```

With everything set up, we can make sure it all works by starting the server:

```bash
npm start
```

At this point, assuming no errors occurred during any of the previous steps, you should be able to view your files by visiting http://localhost:8080.

### Configuration

From this point, you can edit `server-config.yml` to change various settings for the server and CyberFiles Lite. The server configuration file is split into two sections:

```json
{
    "cyberfiles": {
        "...": "..."
    },
    "server": {
        "...": "..."
    }
}
```

The `cyberfiles` section contains options for CyberFiles Lite itself. Descriptions of these options can be found [below](#options).

The `server` section contains options specific to the standalone server:

#### Number `port`
The port on which to host the server. Note that ports below 1000 may require root/administrator permissions.

Default: `8080`

#### String `ip_header`
The HTTP header containing the client's IP address, used only for logging to the console.

Default: `req.socket.remoteAddress`

**Don't forget to restart your server after changing any of these settings.**

## Adding CyberFiles Lite to an existing project
If you have an existing ExpressJS project, you can add CyberFiles lite to it so your users can see directory listings on pages that don't have index files. 

### Installation
Start by installing the package with `npm`:

```bash
npm i cyberfiles-lite
```

Then, require it in your project:

```js
const cyberfiles = require('cyberfiles-lite');
```

The module exports a single, default function. This function only takes an optional `opts` parameter, which is an object containing any number of the options listed [below](#options), and returns an Express request handler.

### Setup
Add CyberFiles Lite as an Express middleware by `use`ing it:

```js
// Where express is initialized and set to `srv`
srv.use(cyberfiles());
```

Without any options, the root of the file index will be set to the current directory (see the [root](#string-root) option). CyberFiles will serve static file URLs as expected, so additional handlers (like `express.static()`) aren't necessary, assuming the files aren't hidden by one of your configured [hide_patterns](#string-or-regexp-hide_patterns).

By default, CyberFiles will respond with a directory's `index.html` file if it exists (see the [index_files](#string-index_files) option).

### Example
This is about the simplest your server needs to be to get things working:

```js
const express = require('express');
const cyberfiles = require('cyberfiles-lite');

const port = 8080;
const srv = express();
srv.use(cyberfiles());
srv.listen(port, () => console.log(`Listening on port ${port}`));
```

## Options
These are all the configuration options for CyberFiles Lite.

### String `root`
A directory path to serve as the root of your file index.

Default: The directory of the parent module

Relative paths are relative to the directory of the parent module.

### String `data_dir`
A separate directory where thumbnails should be stored to prevent them from being deleted when updating. A `thumbs` directory will be created inside this directory.

Default: `cyberfiles-lite`'s installation directory

Relative paths are relative to `cyberfiles-lite`'s installation directory.

### String `site_name`
The name of this file index, used in various places around the site.

Default: `"CyberFiles Lite"`

### String `icon`
A URL to use as the tab icon for the file index.

Default: `"?asset=icon.png"`

### Number `theme`
A theme to use for the file index. This value must be the same as one of the keys in [`themes.json`](/themes.json).

Default: `"darkmuted"`

### String[] `index_files`
An array of file names to checked for and sent when a directory is accessed. If one of these files exist in a directory, they'll be sent instead of the file index.

Default: `[ "index.html" ]`

### String[] or RegExp[] `hide_patterns`
An array of RegEx strings to be checked against the relative file/directory path of each request. If the pattern matches, the file/directory will be hidden from view.

The default will hide all files and directories whose paths contain a node starting with `.` or `_`.

If storing these options in JSON, be sure to escape backslashes when escaping other characters.

Default: `[ /\/(\.|_).*?(\/|$)/ ]`

### Boolean `handle_404`
If `true`, CyberFiles Lite will handle requests for nonexistent paths (error 404s) and show the user an error page. If `false`, `next()` will be called, passing control to the next middleware.

Default: `false`

### Boolean `get_dir_sizes`
If `true`, we'll get the total size of directories and display them. This will increase load times, especially with lots of files.

Default: `false`

### Boolean `make_thumbs`
If `true`, thumbnails to show in the index will be generated for image and video files. `ffmpeg` needs to be installed for video thumbnail generation.

Default: `false`

Thumbnails are stored in a `thumbs` folder inside of the module folder. So reinstalling the module will most likely wipe all stored thumbnail information.

Each instance of CyberFiles has its own `thumb-map-*.json` file inside of the thumbs folder, where the `*` is an MD5 hash of that instance's root (as set by [opts.root](#string-root), but normalized). These thumb map files contain a property for each absolute file path, and each property contains the associated thumbnail file name, along with the file's modification time.

The server's thumb map file is loaded into memory on startup and rewritten whenever changes are made. Don't make manual changes to these files.

### Boolean `auto_view`
If this and `make_thumbs` are `true`, and if more than 50% (or the value of `auto_view_threshold`) of the files in a directory have thumbnails, the directory will automatically be switched to `tiles` view.

Default: `true`

### Number `auto_view_threshold`
A float between 0 and 1, representing the percentage of files in a directory that need to have thumbnails for the directory to be switched to `tiles` view.

Defaults to `0.5`

### Boolean `debug`
If `true`, debug messages will be logged to the console.

Default: `false`

## Other projects that make this one possible
CyberFiles Lite wouldn't be here without these amazing projects:
* [Express](https://github.com/expressjs/express)
* [EJS](https://ejs.co/)
* [Marked](https://marked.js.org/)
* [Day.js](https://day.js.org/)
* [Prism](https://prismjs.com/)