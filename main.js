
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookie = require('cookie');
const ejs = require('ejs');
const mime = require('mime');
const htmlParser = require('node-html-parser');
const dayjs = require('dayjs');
const archiver = require('archiver');
const sharp = require('sharp');
const ffmpegExtractFrame = require('ffmpeg-extract-frame');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');
const utils = require('web-resources');
const { marked } = require('marked');
const prismLangs = require(path.join(__dirname, `prism-lang-exts.json`));
const fileTypes = require(path.join(__dirname, `file-types.json`));
loadLanguages();

function iconFromExt(filePath) {
    const ext = path.extname(filePath).substring(1).trim();
    const mimeType = mime.getType(ext) || '';
    if (filePath.toLowerCase().match(/readme.md$/))
        return 'info';
    if (ext.match(/^(txt|osu)$/gi))
        return 'text_snippet';
    if (ext.match(/^(md|markdown)$/))
        return 'description';
    if (prismLangs[ext])
        return 'code';
    if (mimeType.match(/^application\/(zip|x-gzip|x-bzip2|x-tar|x-7z-compressed|x-rar-compressed)$/gi) || ext.match(/^(osk|osb)$/gi))
        return 'folder_zip';
    if (mimeType.match(/^application\/pdf$/gi))
        return 'picture_as_pdf';
    if (mimeType.match(/^video\/.*$/gi))
        return 'movie';
    if (mimeType.match(/^text\/.*$/gi))
        return 'text_snippet';
    if (mimeType.match(/^audio\/.*$/gi))
        return 'headphones';
    if (mimeType.match(/^image\/.*$/gi))
        return 'image';
    if (mimeType.match(/^application\/.*$/gi))
        return 'widgets';
    return 'draft';
}

function typeFromExt(filePath) {
    const ext = path.extname(filePath).substring(1).toLowerCase();
    if (ext)
        return fileTypes[ext] || `${ext.toUpperCase()} File`;
    else
        return `File`;
}

const themes = require('./themes.json');

const sortOrder = {
    name: {
        f: (a, b) => {
            return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        },
        display: 'Name'
    },
    mtime: {
        f: (a, b) => {
            return a.mtime-b.mtime
        },
        display: 'Date'
    },
    type: {
        f: (a, b) => {
            return a.ext.localeCompare(b.ext, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        },
        display: 'Type'
    },
    size: {
        f: (a, b) => {
            return a.size-b.size
        },
        display: 'Size'
    }
};

/**
 * @typedef CyberFilesLiteOptions
 * @type {object}
 * @property {string} [root] A directory path to serve as the root of your file index. 
 * 
 * Defaults to the directory of the parent module.
 * 
 * Relative paths are relative to the directory of the parent module.
 * 
 * @property {string} [data_dir] A separate directory where thumbnails should be stored to prevent them from being deleted when updating. A `thumbs` directory will be created inside this directory.
 * 
 * Defaults to where `cyberfiles-lite` is installed.
 * 
 * Relative paths are relative to `cyberfiles-lite`'s installation directory.
 * 
 * @property {string} [site_name] The name of this file index, used in various places around the site.
 * 
 * Defaults to `"CyberFiles Lite"`
 * 
 * @property {string} [icon] A URL to use as the tab icon for the file index.
 * 
 * Defaults to one of the built-in themed icons: `?asset=icons/icon-<theme>.svg`
 * 
 * @property {string} [theme] A theme to use for the file index. This value must be the same as one of the keys in `themes.json`.
 * 
 * Defaults to `"darkmuted"`
 * 
 * @property {string[]} [index_files] An array of file names to checked for and sent when a directory is accessed. If one of these files exist in a directory, they'll be sent instead of the file index.
 * 
 * Defaults to `[ "index.html" ]`
 * 
 * @property {string[]} [hide_patterns] An array of RegEx strings to be checked against the absolute file/directory path of each request. If the pattern matches, the file/directory will be hidden from view.
 * 
 * Defaults to `[ /\/(\.|_).*?(\/|$)/ ]`, which will hide all files and directories whose paths contain a node/segment starting with `.` or `_`.
 * 
 * When storing these options in JSON, be sure to escape backslashes when escaping other characters.
 * 
 * @property {boolean} [handle_404] If `true`, CyberFiles Lite will handle requests for nonexistent paths (error 404s) and show the user an error page. If `false`, `next()` will be called, passing control to the next middleware.
 * 
 * Defaults to `false`
 * 
 * @property {boolean} [get_dir_sizes] If `true`, the index will recurse through directories to get and display their total sizes. This will impact performance with lots of files.
 * 
 * Defaults to `false`
 * 
 * @property {boolean} [make_thumbs] If `true`, thumbnails to show in the index will be generated for image and video files. `ffmpeg` needs to be installed for video thumbnail generation.
 * 
 * Defaults to `false`
 * 
 * @property {boolean} [auto_view] If this and `make_thumbs` are `true`, and if more than 50% (or the value of `auto_view_threshold`) of the files in a directory have thumbnails, the directory will automatically be switched to `tiles` view.
 * 
 * Defaults to `true`
 * 
 * @property {number} [auto_view_threshold] A float between 0 and 1, representing the percentage of files in a directory that need to have thumbnails for the directory to be switched to `tiles` view.
 * 
 * Defaults to `0.5`
 * 
 * @property {boolean} [show_path_subfolders] If `true`, you'll be able to view the subfolders of a directory when you right-click on it in the path bar. This might affect performance in large directories.
 * 
 * Defaults to `true`
 * 
 * @property {boolean} [debug] If `true`, debug messages will be logged to the console.
 * 
 * Defaults to `false`
 */

/**
 * Get a handler for CyberFiles Lite
 * @param {CyberFilesLiteOptions} opts Options for the file index
 */
module.exports = (opts = {}) => {
    const __dirnameParent = path.dirname(require.main.filename);
    // Set default options
    if (!opts.root) opts.root = __dirnameParent;
    if (!path.isAbsolute(opts.root)) opts.root = path.join(__dirnameParent, opts.root);
    opts.root = path.normalize(opts.root);
    const defaultHidePatterns = [ /\/(\.|_).*?(\/|$)/ ];
    if (!opts.data_dir) opts.data_dir = __dirname;
    if (!path.isAbsolute(opts.data_dir)) opts.data_dir = path.join(__dirname, opts.data_dir);
    opts.data_dir = path.normalize(opts.data_dir);
    if (!opts.hide_patterns) opts.hide_patterns = defaultHidePatterns;
    else opts.hide_patterns.unshift(...defaultHidePatterns);
    if (!opts.index_files) opts.index_files = [ 'index.html' ];
    if (!opts.theme) opts.theme = 'darkmuted';
    const theme = themes[opts.theme];
    if (!theme) throw new Error(`[CyberFiles] Invalid theme! Make sure your provided theme matches one of the keys in themes.json.`);
    if (!opts.icon) opts.icon = `?asset=icons/icon-${opts.theme}.svg`;
    if (!opts.site_name) opts.site_name = `CyberFiles Lite`;
    if (opts.handle_404 == undefined) opts.handle_404 = false;
    if (opts.get_dir_sizes == undefined) opts.get_dir_sizes = false;
    if (opts.make_thumbs == undefined) opts.make_thumbs = false;
    if (opts.auto_view == undefined) opts.auto_view = true;
    if (!opts.auto_view_threshold) opts.auto_view_threshold = 0.5;
    if (opts.show_path_subfolders == undefined) opts.show_path_subfolders = true;
    const logDebug = (...params) => {
        if (opts.debug) console.log(`[CyberFiles]`, ...params);
    }
    logDebug(`Debug logs are enabled`);
    logDebug(`Configuration:`, opts);
    // Set variables
    const sessions = {};
    const thumbQueue = [];
    const thumbHandlers = {};
    const thumbsDir = path.join(opts.data_dir, 'thumbs');
    const thumbMapFile = path.join(opts.data_dir, 'thumbs', `thumb-map-${crypto.createHash('md5').update(opts.root).digest('hex')}.json`);
    logDebug(`Thumbs directory:`, thumbsDir);
    logDebug(`Thumbs map file:`, thumbMapFile);
    let thumbMap = {};
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir);
    if (fs.existsSync(thumbMapFile)) {
        thumbMap = require(thumbMapFile);
        logDebug(`Loaded`, Object.keys(thumbMap).length, `entries from thumb map`);
    } else logDebug(`Starting a fresh thumb map`);
    // Delete old or unused sessions
    setInterval(() => {
        const now = Date.now();
        for (const id in sessions) {
            const session = sessions[id];
            if (now-session.lastRequestTime > 1000*60*15 && session.requestCount == 1) {
                logDebug(`Deleting unused session`, id);
                delete sessions[id];
            }
            if (now-session.lastRequestTime > 1000*60*60*24*2) {
                logDebug(`Deleting old session`, id);
                delete sessions[id];
            }
        }
    }, 1000);
    // Checks of a file path should be hidden
    // As determined by opts.hide_patterns
    const isPathHidden = filePath => {
        for (const pattern of opts.hide_patterns) {
            const regex = new RegExp(pattern);
            if (filePath.match(regex)) {
                return true;
            }
        }
        // Deem the file path hidden if we don't have read access
        try {
            fs.accessSync(path.join(opts.root, filePath), fs.constants.R_OK);
        } catch (error) {
            console.error(error);
            return true;
        }
        return false;
    }
    // Get the total size of a folder
    const getFolderSize = basePathAbs => {
        logDebug(`Getting total size of`, basePathAbs);
        let totalSize = 0;
        const recurse = (pathAbs) => {
            const files = fs.readdirSync(pathAbs);
            for (const name of files) {
                const filePathAbs = path.join(pathAbs, name);
                const filePathRel = path.join('/', filePathAbs.replace(opts.root, ''));
                if (isPathHidden(filePathRel)) continue;
                const stats = fs.statSync(filePathAbs);
                if (stats.isDirectory()) {
                    recurse(filePathAbs);
                    continue;
                }
                totalSize += stats.size;
            }
        }
        recurse(basePathAbs);
        return totalSize;
    }
    // Get details about a file
    const getFileObject = async(filePathAbs, filePathRel, folderSizes = opts.get_dir_sizes) => {
        // If this file should be hidden, return false
        let isHidden = isPathHidden(filePathRel);
        if (isHidden) return false;
        // Get file stats
        const stats = fs.statSync(filePathAbs);
        const ext = path.extname(filePathAbs).substring(1).toLowerCase();
        const isDir = stats.isDirectory();
        // Create file object
        const file = {
            name: path.basename(filePathAbs),
            path: encodeURI(filePathRel),
            isDir: stats.isDirectory(),
            mtime: stats.mtimeMs,
            icon: 'folder',
            ext: ext,
            type: 'Folder'
        };
        // Add more to file object if it's not a directory
        if (!isDir) {
            file.type = typeFromExt(filePathAbs);
            file.size = stats.size;
            file.sizeHuman = utils.formatSize(stats.size),
            file.icon = iconFromExt(filePathAbs),
            file.shouldRender = true;
            file.hasThumb = false;
            if (ext.match(/^(png|jpg|jpeg|gif|webp|mp4|mov|webm)$/) && opts.make_thumbs) {
                file.hasThumb = true;
                const mapEntry = thumbMap[filePathAbs];
                if (!mapEntry || mapEntry.mtime !== file.mtime) {
                    thumbQueuePaths.push(filePathAbs);
                    thumbQueue.push({
                        path: filePathAbs,
                        mtime: file.mtime
                    });
                }
            }
        }
        // Add things for only folders
        if (isDir) {
            if (folderSizes) {
                const size = getFolderSize(filePathAbs);
                file.size = size;
                file.sizeHuman = utils.formatSize(file.size);
            }
        }
        return file;
    }
    // Get the names of the subfolders of a folder
    const getSubfolders = (folderPathAbs, folderPathRel) => {
        if (!fs.existsSync(folderPathAbs) || isPathHidden(folderPathRel))
            return [];
        const sourceStats = fs.statSync(folderPathAbs);
        if (!sourceStats.isDirectory()) return [];
        const subfolders = fs.readdirSync(folderPathAbs).filter(name => {
            const stats = fs.statSync(path.join(folderPathAbs, name));
            return stats.isDirectory() && !isPathHidden(path.join(folderPathRel, name));
        });
        subfolders.sort((a, b) => a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: 'base'
        }));
        return subfolders;
    }
    // Extract starting text from Markdown HTML
    const getTextFromMarkdownHTML = html => {
        logDebug(`Extracting text from markdown file`);
        const el = htmlParser.parse(html);
        const children = el.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li');
        let isParagraphFound = false;
        let content = [];
        for (const child of children) {
            let text = child.textContent.trim().replace(/\n/g, ' ');
            if (child.tagName.match(/(p|li)/gi) && text) {
                isParagraphFound = true;
                if (child.tagName == 'LI') text += ',';
                content.push(text);
            }
            if (isParagraphFound && child.tagName !== 'P') break;
        }
        content = content.join(' ');
        const words = content.split(' ').filter(String);
        content = '';
        for (const word of words) {
            if (content.length > 250) {
                content = `${content.trim()}...`
                break;
            }
            content += `${word} `;
        }
        return content;
    };
    // Handle zipping directories
    const handleZip = async(pathRel, req, res) => {
        pathRel = path.join(pathRel, req.query.zip);
        const pathAbs = path.join(opts.root, pathRel);
        logDebug(`Scanning files of`, pathAbs, `for zip`);
        if (!fs.existsSync(pathAbs) || isPathHidden(pathRel))
            return res.end(`This directory doesn't exist.`);
        if (!fs.statSync(pathAbs).isDirectory())
            return res.end(`This isn't a directory.`);
        const files = [];
        const getFiles = folderPathRel => {
            const folderPathAbs = path.join(opts.root, folderPathRel);
            const fileList = fs.readdirSync(folderPathAbs);
            for (const name of fileList) {
                const filePathRel = path.join(folderPathRel, name);
                if (isPathHidden(filePathRel)) continue;
                const filePathAbs = path.join(folderPathAbs, name);
                const stats = fs.statSync(filePathAbs);
                if (stats.isDirectory()) {
                    getFiles(path.join(folderPathRel, name));
                    continue;
                }
                const file = {
                    pathRel: filePathRel.replace(pathRel, ''),
                    pathAbs: filePathAbs
                };
                files.push(file);
            }
        };
        getFiles(pathRel);
        const archive = archiver('zip');
        res.setHeader('content-type', 'application/zip');
        archive.pipe(res);
        for (const file of files) {
            logDebug(`Zipping`, file.pathRel);
            archive.file(file.pathAbs, { name: file.pathRel });
        }
        await archive.finalize();
    };
    // Handle thumbnail generation
    let thumbsInProgress = 0;
    const thumbQueuePaths = [];
    setInterval(async() => {
        if (thumbsInProgress > 3 || thumbQueue.length == 0) return;
        thumbsInProgress++;
        try {
            const entry = thumbQueue.shift();
            const filePath = entry.path;
            let tmpPath = '';
            const thumbName = `${utils.randomHex()}.png`;
            const thumbPath = path.join(thumbsDir, thumbName);
            if ((mime.getType(filePath) || '').match(/^video\/.*/)) {
                logDebug(`Extracting video frame from`, filePath);
                tmpPath = path.join(thumbsDir, `tmp-${utils.randomHex()}.png`);
                await ffmpegExtractFrame({
                    input: filePath,
                    output: tmpPath,
                    offset: 1000
                });
            }
            logDebug(`Generating thumbnail for`, tmpPath || filePath);
            const meta = await sharp(tmpPath || filePath).metadata();
            if (!meta.width || !meta.height) return;
            const isVertical = (meta.height > meta.width);
            const resizeOpts = {};
            (isVertical) ? resizeOpts.height = 128 : resizeOpts.width = 128;
            await sharp(tmpPath || filePath).resize(resizeOpts).toFile(thumbPath);
            if (tmpPath) fs.unlinkSync(tmpPath);
            thumbMap[filePath] = { name: thumbName, mtime: entry.mtime };
            fs.writeFileSync(thumbMapFile, JSON.stringify(thumbMap));
            thumbQueuePaths.splice(thumbQueuePaths.indexOf(entry.path), 1);
            if (thumbHandlers[filePath]) {
                thumbHandlers[filePath](thumbPath);
                delete thumbHandlers[filePath];
            }
        } catch (error) {
            logDebug(`Error while generating thumbnail:`, error);
        }
        thumbsInProgress--;
    }, 100);
    // Handle thumbnail requests
    const handleThumb = (pathRel, req, res) => {
        const filePathRel = path.join(pathRel, req.query.thumb);
        const filePathAbs = path.join(opts.root, filePathRel);
        if (thumbMap[filePathAbs]) {
            res.sendFile(path.join(thumbsDir, thumbMap[filePathAbs].name));
        } else if (thumbQueuePaths.includes(filePathAbs)) {
            res.setHeader('content-type', 'image/png');
            thumbHandlers[filePathAbs] = image => {
                res.sendFile(image);
            };
        } else {
            res.status(404).end(`404 Not Found`);
        }
    };
    /** @type {express.RequestHandler} */
    return async(req, res, next) => {
        if (req.method == 'HEAD') return res.json({ success: true });
        const startTime = Date.now();
        try {
            decodeURI(req.path);
        } catch (error) {
            return res.status(400).end(`400 Bad Request`);
        }
        const pathRel = path.normalize(decodeURI(req.path));
        const pathAbs = path.join(opts.root, pathRel);
        // If this is a zip request, handle it
        if (req.query.zip) return handleZip(pathRel, req, res);
        // If this is a thumbnail request, handle it
        if (req.query.thumb) return handleThumb(pathRel, req, res);
        // Parse session cookie
        const cookies = cookie.parse(req.headers.cookie || '');
        let sessionId = '';
        if (cookies['cyberfiles-session'])
            sessionId = cookies['cyberfiles-session'];
        if (!sessions[sessionId]) {
            sessionId = utils.randomHex(32);
            sessions[sessionId] = {
                requestCount: 0,
                dir: {}
            };
            logDebug(`Created new session`, sessionId);
        }
        const session = sessions[sessionId];
        session.requestCount++;
        session.lastRequestTime = Date.now();
        // Set session cookie
        res.setHeader('set-cookie', cookie.serialize('cyberfiles-session', sessionId, {
            expires: 0,
            path: '/'
        }));
        // For debugging, return session data as JSON if requested
        if (req.query.session) return res.json(session);
        // Redirect without query params
        const redirect = () => {
            res.redirect(pathRel);
        };
        // Update session if parameters are supplied
        let isSessionChanged = false;
        if (req.query.sort) {
            const values = Object.keys(sortOrder);
            if (values.includes(req.query.sort)) {
                session.dir[pathRel] = session.dir[pathRel] || {};
                session.dir[pathRel].order = req.query.sort;
                isSessionChanged = true;
                logDebug(`Session`, sessionId, `set sort order to`, req.query.sort, `in`, pathRel);
            }
        }
        if (req.query.direction) {
            const values = [ 'asc', 'desc' ];
            if (values.includes(req.query.direction)) {
                session.dir[pathRel] = session.dir[pathRel] || {};
                session.dir[pathRel].direction = req.query.direction;
                isSessionChanged = true;
                logDebug(`Session`, sessionId, `set sort direction to`, req.query.direction, `in`, pathRel);
            }
        }
        if (req.query.view) {
            const values = [ 'list', 'tiles' ];
            if (values.includes(req.query.view)) {
                session.dir[pathRel] = session.dir[pathRel] || {};
                session.dir[pathRel].view = req.query.view;
                isSessionChanged = true;
                logDebug(`Session`, sessionId, `set view to`, req.query.view, `in`, pathRel);
            }
        }
        if (isSessionChanged) return redirect();
        const sessionDir = session.dir[pathRel] || {};
        // Build data object
        let data = {
            files: false,
            readme: false,
            previewType: false,
            dirName: pathRel.split('/').filter(String).reverse()[0] || 'Root',
            icon: opts.icon,
            theme: opts.theme,
            themes: themes,
            site_name: opts.site_name,
            site_name_meta: opts.site_name,
            theme_color: themes[opts.theme].themeColor,
            error: false,
        };
        // Handle rendering
        const render = async() => {
            res.setHeader('content-type', 'text/html');
            res.end(await ejs.renderFile(path.join(__dirname, 'assets/index.ejs'), data));
        }
        // Handle 404s
        const send404 = () => {
            if (!opts.handle_404)
                return next();
            data.error = 404;
            data.desc = `This file or directory doesn't exist!`;
            data.dirName = 'Error 404';
            res.status(404);
            return render();
        };
        // If this is an asset request, handle it
        if (req.query.asset) {
            const filePathRel = path.normalize(req.query.asset);
            const filePath = path.join(__dirname, 'assets', filePathRel);
            if (!fs.existsSync(filePath)) return res.status(404).end();
            return res.sendFile(filePath);
        }
        // Build file path tree
        const tree = [{
            name: opts.site_name,
            path: '/',
            dirs: opts.show_path_subfolders ? getSubfolders(opts.root, '/') : []
        }];
        const parts = pathRel.split('/').filter(String);
        for (const part of parts) {
            const partPath = path.join(tree[tree.length-1].path, part);
            const partPathAbs = path.join(opts.root, partPath);
            const item = {
                name: part,
                path: partPath,
                dirs: opts.show_path_subfolders ? getSubfolders(partPathAbs, partPath) : []
            };
            tree.push(item);
        }
        tree[tree.length-1].path = '';
        data.tree = tree;
        // If this path is hidden, return 404
        if (isPathHidden(pathRel)) return send404();
        // If the path doesn't exist, return 404
        if (!fs.existsSync(pathAbs)) return send404();
        // Save if the file is a directory
        const dirStats = fs.statSync(pathAbs);
        const isDir = dirStats.isDirectory();
        // If we aren't at the root, change meta site name
        if (tree.length > 2 && opts.site_name.length < 64) {
            let tmp = [...parts];
            tmp.pop();
            const getSiteName = () => `${opts.site_name} > ${tmp.join(' > ')}`;
            while (getSiteName() > 64) tmp.shift();
            data.site_name_meta = getSiteName();
        }
        // If the file isn't a directory...
        if (!isDir) {
            // If we aren't rendering, send the file
            if (!req.query.render) {
                logDebug(`Handling raw request for`, pathAbs);
                return res.sendFile(pathAbs);
            }
            // Get file details
            logDebug(`Getting file details for`, pathAbs);
            const file = await getFileObject(pathAbs, pathRel);
            // Get file list
            const dirAbs = path.dirname(pathAbs);
            const dirRel = path.dirname(pathRel);
            logDebug(`Scanning directory`, dirAbs);
            const fileList = fs.readdirSync(dirAbs);
            const files = [];
            for (const name of fileList) {
                const filePathAbs = path.join(dirAbs, name);
                const filePathRel = path.join(dirRel, name);
                const file = await getFileObject(filePathAbs, filePathRel, false);
                if (file && !file.isDir) files.push(file);
            }
            const sessionDir = session.dir[dirRel] || {};
            files.sort(sortOrder[sessionDir.order || 'name'].f);
            if (sessionDir.direction == 'desc') files.reverse();
            // Get current file index
            let currentFileIndex = 0;
            let i = 0;
            for (const entry of files) {
                if (entry.name == file.name) {
                    currentFileIndex = i;
                    break;
                }
                i++;
            }
            // Set render data
            data.file = file;
            data.filePrev = files[currentFileIndex-1] || files[files.length-1];
            data.fileNext = files[currentFileIndex+1] || files[0];
            data.currentFileIndex = currentFileIndex+1;
            data.fileCount = files.length;
            data.desc = [
                `Type: ${file.type}`,
                `Modified: ${dayjs(file.mtime).format(`MMM D, YYYY`)}`,
                `Size: ${file.sizeHuman}`
            ].join('\n');
            data.path = encodeURI(pathRel);
            // Markdown files
            if (file.ext.match(/^(md|markdown)$/)) {
                data.previewType = 'markdown';
                data.html = marked.parse(fs.readFileSync(pathAbs).toString());
                data.desc = getTextFromMarkdownHTML(data.html)
                return render();
            // Images
            } else if (file.ext.match(/^(png|jpg|jpeg|gif|webp)$/)) {
                data.previewType = 'image';
                return render();
            // Videos
            } else if (file.ext.match(/^(mp4|webm|mov)$/)) {
                data.previewType = 'video';
                return render();
            // Audio files
            } else if (file.ext.match(/^(mp3|weba|ogg|m4a)$/)) {
                data.previewType = 'audio';
                return render();
            // Text files
            } else if (prismLangs[file.ext] && file.size < (1024*512)) {
                data.previewType = 'text';
                data.language = prismLangs[file.ext];
                const contents = fs.readFileSync(pathAbs).toString();
                try {
                    data.text = Prism.highlight(contents, Prism.languages[data.language], data.language).trim();
                } catch (error) {
                    console.error(`Error syntax highlighting ${pathAbs}:`, error);
                    data.text = utils.escapeHTML(contents.trim());
                }
                return render();
            // Everything else
            } else {
                data.previewType = 'default';
                return render();
            }
        }
        // Send index file if it exists
        const fileList = fs.readdirSync(pathAbs);
        for (const name of opts.index_files) {
            if (fileList.includes(name)) {
                logDebug(`Sending index file`, pathAbs);
                return res.sendFile(path.join(pathAbs, name));
            }
        }
        // Get and iterate through directory contents
        logDebug(`Scanning directory`, pathAbs);
        let totalSize = 0;
        let readme = false;
        const filesWorking = { files: [], dirs: [] };
        for (const name of fileList) {
            // Get paths
            const filePathAbs = path.join(pathAbs, name);
            const filePathRel = path.join(pathRel, name);
            // Get file details
            const file = await getFileObject(filePathAbs, filePathRel);
            if (!file) continue;
            if (parseInt(file.size))
                totalSize += file.size;
            // Add file to list
            filesWorking[(file.isDir) ? 'dirs':'files'].push(file);
            // If this is a readme file, save it
            if (name.toLowerCase().match('readme.md'))
                readme = { pathAbs: filePathAbs, pathRel: filePathRel };
        }
        // Sort directories and files
        logDebug(`Sorting files`);
        const sort = sessionDir.order || 'name';
        const isDescending = (sessionDir.direction == 'desc') ? true : false;
        filesWorking.dirs.sort(sortOrder[sort].f);
        filesWorking.files.sort(sortOrder[sort].f);
        if (isDescending) {
            filesWorking.dirs.reverse();
            filesWorking.files.reverse();
        }
        data.sort = {
            order: sortOrder[sort],
            descending: isDescending
        };
        // Set view
        const isViewSetByUser = (sessionDir.view) ? true : false;
        data.view = sessionDir.view || 'list';
        // If the view isn't manually set
        if (opts.auto_view && !isViewSetByUser) {
            // Count the number of files with thumbnails
            let countFilesWithThumbs = 0;
            for (const file of filesWorking.files) {
                if (file.hasThumb) countFilesWithThumbs++;
            }
            // If more than 50% of the files have thumbs, set view to tiles
            if ((countFilesWithThumbs/filesWorking.files.length) > opts.auto_view_threshold) {
                logDebug(countFilesWithThumbs, 'of', filesWorking.files.length, `have thumbs, using tiles view`);
                data.view = 'tiles';
            }
        }
        // Combine files and directories
        const files = [ ...filesWorking.dirs, ...filesWorking.files ];
        // Add "up" entry if we aren't at the root
        if (tree.length > 1) {
            files.unshift({
                name: `Up to ${tree[tree.length-2].name}...`,
                isDir: true,
                path: tree[tree.length-2].path,
                icon: 'arrow_upward'
            });
        }
        // Set files object
        data.files = files;
        // Compile stats
        data.stats = {
            count: { files: filesWorking.files.length, dirs: filesWorking.dirs.length },
            totalSize: totalSize,
            totalSizeHuman: utils.formatSize(totalSize),
            totalSizeIncludesSubdirs: opts.get_dir_sizes,
            mtime: dirStats.mtimeMs,
            duration: Math.round(Date.now()-startTime)
        };
        // Count files and dirs and make a human-readable string
        let tmp = [];
        if (data.stats.count.dirs > 0)
            tmp.push(`${data.stats.count.dirs} ${(data.stats.count.dirs == 1) ? 'folder':'folders'}`);
        if (data.stats.count.files > 0)
            tmp.push(`${data.stats.count.files} ${(data.stats.count.files == 1) ? 'file':'files'}`);
        if (tmp.length == 0) tmp.push(`0 files`);
        data.stats.count_string = tmp.join(' and ');
        // Set meta description
        data.desc = `Browse ${data.stats.count_string} in this directory.`;
        // If a readme file exists
        if (readme) {
            // Parse readme
            data.readme = {
                html: marked.parse(fs.readFileSync(readme.pathAbs).toString()),
                path: readme.pathRel
            };
            // Change meta description to readme contents
            const text = getTextFromMarkdownHTML(data.readme.html);
            if (text) data.desc = text;
        }
        return render();
    };
};