
const fs = require('fs');
const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mime = require('mime');
const htmlParser = require('node-html-parser');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');
const utils = require('web-resources');
const { marked } = require('marked');
const prismLangs = require(path.join(__dirname, `prism-lang-exts.json`));

loadLanguages();

function iconFromExt(filePath) {
    const ext = path.extname(filePath).substring(1).trim();
    const mimeType = mime.getType(ext) || '';
    if (filePath.toLowerCase().match(/readme.md$/))
        return 'info';
    if (ext == 'txt')
        return 'text_snippet';
    if (ext.match(/^(md|markdown)$/))
        return 'description';
    if (prismLangs[ext])
        return 'code';
    if (mimeType.match(/^application\/(zip|x-7z-compressed)$/gi))
        return 'archive';
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

// https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `${f(0)}${f(8)}${f(4)}`;
}

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
        display: 'Modified'
    },
    size: {
        f: (a, b) => {
            return a.size-b.size
        },
        display: 'Size'
    }
}

/**
 * @typedef CyberFilesLiteOptions
 * @type {object}
 * @property {string} [root] A directory path to serve as the root of your file index. Defaults to the current directory.
 * 
 * @property {string} [site_name] The name of this file index, used in various places around the site. Defaults to `CyberFiles Lite`.
 * 
 * @property {string} [icon] A URL to use as the tab icon for the file index.
 * 
 * @property {number} [hue] The hue to use as the accent colour around the file index, 0-360. Defaults to 210.
 * 
 * @property {string[]} [index_files] An array of file names to checked for and sent when a directory is accessed. If one of these files exist in a directory, they'll be sent instead of the file index.
 * 
 * Defaults to `[ 'index.html' ]`.
 * 
 * @property {string[]} [hide_patterns] An array of RegEx strings to be checked against the absolute file/directory path of each request. If the pattern matches, the file/directory will be hidden from view.
 * 
 * Defaults to `[ /\/(\.|_).*?(\/|$)/ ]`, which will hide all files and directories whose paths contain a node starting with `.` or `_`.
 * 
 * If storing these options in JSON, be sure to escape backslashes when escaping other characters.
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
    const defaultHidePatterns = [ /\/(\.|_).*?(\/|$)/ ];
    if (!opts.hide_patterns) opts.hide_patterns = defaultHidePatterns;
    else opts.hide_patterns.shift(...defaultHidePatterns);
    if (!opts.index_files) opts.index_files = [ 'index.html' ];
    if (!opts.icon) opts.icon = `https://raw.githubusercontent.com/CyberGen49/cyberfiles-lite/main/assets/icon-circle.png`;
    if (opts.hue === undefined) opts.hue = 210;
    if (!opts.site_name) opts.site_name = `CyberFiles Lite`;
    // Checks of a file path should be hidden
    // As determined by opts.hide_patterns
    const isPathHidden = filePath => {
        for (const pattern of opts.hide_patterns) {
            const regex = new RegExp(pattern);
            if (filePath.match(regex)) {
                return true;
            }
        }
        return false;
    }
    /** @type {express.RequestHandler} */
    return async(req, res, next) => {
        // Set constants and variables
        const startTime = Date.now();
        try {
            decodeURI(req.path);
        } catch (error) {
            return res.status(400).end(`400 Bad Request`);
        }
        const pathRel = path.normalize(decodeURI(req.path));
        const pathAbs = path.join(opts.root, pathRel);
        if (isPathHidden(pathRel)) return next();
        // Build data object
        let data = {
            files: false,
            readme: false,
            previewType: false,
            dirName: pathRel.split('/').filter(String).reverse()[0] || 'Root',
            icon: opts.icon,
            hue: opts.hue,
            site_name: opts.site_name,
            site_name_meta: opts.site_name,
            theme_color: '17181c',
            // We want this thing to be self-contained
            css: `<style>\n${fs.readFileSync(path.join(__dirname, `assets/index.css`))}\n</style>`,
            js: `<script>\n${fs.readFileSync(path.join(__dirname, `assets/index.js`))}\n</script>`
        };
        data.title = data.dirName;
        // Change theme colour if Discord is requesting
        if ((req.headers['user-agent'] || '').match(/DiscordBot/gi))
            data.theme_color = hslToHex(opts.hue, 75, 80);
        // Handle rendering
        const render = async() => {
            res.setHeader('content-type', 'text/html');
            res.end(await ejs.renderFile(path.join(__dirname, 'assets/index.ejs'), data));
        }
        // Make sure file exists
        if (!fs.existsSync(pathAbs)) return next();
        // Save if the file is a directory
        const isDir = fs.statSync(pathAbs).isDirectory();
        // Build file path tree
        const tree = [{ name: 'Root', path: '/' }];
        const parts = pathRel.split('/').filter(String);
        for (const part of parts) {
            const item = {
                name: part,
                path: path.join(tree[tree.length-1].path, part)
            };
            tree.push(item);
        }
        tree[tree.length-1].path = '';
        data.tree = tree;
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
            if (!req.query.render) return res.sendFile(pathAbs);
            const ext = path.extname(pathAbs).substring(1).toLowerCase();
            data.desc = `Download this file or preview it right in your browser.`;
            data.path = encodeURI(pathRel);
            if (ext.match(/^(md|markdown)$/)) {
                data.previewType = 'markdown';
                data.html = marked.parse(fs.readFileSync(pathAbs).toString());
                return render();
            } else if (ext.match(/^(png|jpg|jpeg|gif|webp)$/)) {
                data.previewType = 'image';
                return render();
            } else if (ext.match(/^(mp4|webm|mov)$/)) {
                data.previewType = 'video';
                return render();
            } else if (ext.match(/^(mp3|weba|ogg|m4a)$/)) {
                data.previewType = 'audio';
                return render();
            } else if (prismLangs[ext] && fs.statSync(pathAbs).size < (1024*512)) {
                data.previewType = 'text';
                data.language = prismLangs[ext];
                const contents = fs.readFileSync(pathAbs).toString();
                try {
                    data.text = Prism.highlight(contents, Prism.languages[data.language], data.language).trim();
                } catch (error) {
                    console.error(`Error syntax highlighting ${pathAbs}:`, error);
                    data.text = utils.escapeHTML(contents.trim());
                }
                return render();
            } else
                return res.sendFile(pathAbs);
        }
        // Send index file if it exists
        const fileList = fs.readdirSync(pathAbs);
        for (const name of opts.index_files) {
            if (fileList.includes(name))
                return res.sendFile(path.join(pathAbs, name));
        }
        // Get and iterate through directory contents
        let totalSize = 0;
        let readme = false;
        const filesWorking = { files: [], dirs: [] };
        for (const name of fileList) {
            // Get paths
            const filePathAbs = path.join(pathAbs, name);
            const filePathRel = path.join(pathRel, name);
            // If this file should be hidden, skip it
            let isHidden = isPathHidden(filePathRel);
            if (isHidden) continue;
            // Get file stats
            const stats = fs.statSync(filePathAbs);
            const ext = path.extname(filePathAbs).substring(1).toLowerCase();
            const isDir = stats.isDirectory();
            // Create file object
            const file = {
                name: name,
                path: encodeURI(filePathRel),
                isDir: stats.isDirectory(),
                mtime: stats.mtimeMs,
                icon: 'folder'
            };
            // Add more to file object if it's not a directory
            if (!isDir) {
                file.size = stats.size;
                file.sizeHuman = utils.formatSize(stats.size),
                file.icon = iconFromExt(filePathAbs),
                file.shouldRender = (ext.match(/^(md|markdown|mp4|png|jpg|jpeg|gif|webp|webm|mov|mp3|weba|ogg|m4a)$/) || prismLangs[ext]) ? true : false,
                totalSize += stats.size;
            }
            // Add file to list
            filesWorking[(isDir) ? 'dirs':'files'].push(file);
            // If this is a readme file, save it
            if (name.toLowerCase().match('readme.md'))
                readme = { pathAbs: filePathAbs, pathRel: filePathRel };
        }
        // Sort directories and files
        const sort = (sortOrder[req.query.sort]) ? req.query.sort : 'name';
        const isDescending = (req.query.desc) ? true : false;
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
        // Combine files and directories
        const files = [ ...filesWorking.dirs, ...filesWorking.files ];
        // If we aren't at the root
        if (tree.length > 1) {
            // Add "up" entry
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
            const getTextFromMarkdownHTML = html => {
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
            const text = getTextFromMarkdownHTML(data.readme.html);
            if (text) data.desc = text;
        }
        return render();
    };
};