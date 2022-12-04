
# CyberFiles Lite
A bare-bones file index built to work with Node.js Express and look like GitHub's file browser.

### Features
* Easy and portable setup
* Choose the root of your file index
* Use RegEx to hide certain files and directories
* Serve directory index files (like `index.html`) automatically
* Add README.md files to directories to see their contents below the file list
* View text files, images, and videos without leaving your browser
    * Text files of [certain formats](/prism-lang-exts.json) are syntax-highlighted
    * Videos use a custom-made video player
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

## Adding CyberFiles Lite to an existing project
**This project is not yet available on npm**



## Options
These are all the configuration options for CyberFiles Lite.

### String `root`
A directory path to serve as the root of your file index. Defaults to the current directory.

Default: The current directory

### String `icon`
A URL to use as the tab icon for the file index.

Default: `undefined`

### String[] `index_files`
An array of file names to checked for and sent when a directory is accessed. If one of these files exist in a directory, they'll be sent instead of the file index.

Default: `[ index.html ]`

### String[] or RegExp[] `hide_patterns`
An array of RegEx strings to be checked against the relative file/directory path of each request. If the pattern matches, the file/directory will be hidden from view.

The default will hide all files and directories whose paths contain a node starting with `.` or `_`.

If storing these options in JSON, be sure to escape backslashes when escaping other characters.

Default: `[ /\/(\.|_).*?(\/|$)/ ]`