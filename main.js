
const fs = require('fs');
const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mime = require('mime');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');
const utils = require('web-resources');
const { marked } = require('marked');
const prismLangs = require('./prism-lang-exts.json');

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

/**
 * @typedef CyberFilesLiteOptions
 * @type {object}
 * @property {string} [root] A directory path to serve as the root of your file index. Defaults to the current directory.
 * 
 * @property {string} [icon] A URL to use as the tab icon for the file index.
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
    if (!opts.root) opts.root = __dirname;
    if (!path.isAbsolute(opts.root)) opts.root = path.join(__dirname, opts.root);
    if (!opts.hide_patterns) opts.hide_patterns = [ /\/(\.|_).*?(\/|$)/ ];
    if (!opts.index_files) opts.index_files = [ 'index.html' ];
    if (!opts.icon) opts.icon = `https://raw.githubusercontent.com/CyberGen49/cyberfiles-lite/main/assets/icon-circle.png`;
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
        if (isPathHidden(pathRel)) return res.status(404).end(`404 Not Found`)
        let data = {
            files: false,
            readme: false,
            previewType: false,
            dirName: pathRel.split('/').filter(String).reverse()[0] || 'Root',
            icon: opts.icon,
            // We want this thing to be self-contained
            css: `<style>\n${fs.readFileSync('./assets/index.css')}\n</style>`,
            js: `<script>\n${fs.readFileSync('./assets/index.js')}\n</script>`
        };
        data.title = `Index of ${data.dirName}`;
        // Handle rendering
        const render = async() => {
            res.end(await ejs.renderFile('./assets/index.ejs', data));
        }
        // Make sure file exists
        if (!fs.existsSync(pathAbs)) return res.status(404).end(`404 Not Found`);
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
        // If the file isn't a directory...
        const isDir = fs.statSync(pathAbs).isDirectory();
        if (!isDir) {
            if (!req.query.render) return res.sendFile(pathAbs);
            const ext = path.extname(pathAbs).substring(1).toLowerCase();
            data.desc = `Download this file or preview it right in your browser.`;
            data.path = encodeURI(pathRel);
            data.title = data.dirName;
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
        // Collect file details
        let totalSize = 0;
        let readme = false;
        const filesWorking = { files: [], dirs: [] };
        for (const name of fileList) {
            const filePathAbs = path.join(pathAbs, name);
            const filePathRel = path.join(pathRel, name);
            let isHidden = isPathHidden(filePathRel);
            if (isHidden) continue;
            const stats = fs.statSync(filePathAbs);
            const ext = path.extname(filePathAbs).substring(1).toLowerCase();
            const isDir = stats.isDirectory();
            const file = {
                name: name,
                path: encodeURI(filePathRel),
                isDir: stats.isDirectory(),
                mtime: stats.mtimeMs,
                icon: 'folder'
            };
            if (!isDir) {
                file.size = stats.size;
                file.sizeHuman = utils.formatSize(stats.size),
                file.icon = iconFromExt(filePathAbs),
                file.shouldRender = (ext.match(/^(md|markdown|mp4|png|jpg|jpeg|gif|webp|webm|mov)$/) || prismLangs[ext]) ? true : false,
                totalSize += stats.size;
            }
            filesWorking[(isDir) ? 'dirs':'files'].push(file);
            if (name.toLowerCase().match('readme.md'))
                readme = { pathAbs: filePathAbs, pathRel: filePathRel };
        }
        filesWorking.dirs.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
        filesWorking.files.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
        const files = [ ...filesWorking.dirs, ...filesWorking.files ];
        if (tree.length > 1) files.unshift({
            name: `Up to ${tree[tree.length-2].name}...`,
            isDir: true,
            path: tree[tree.length-2].path,
            icon: 'arrow_upward'
        });
        data.files = files;
        data.desc = `Browse ${files.length} file(s) in this directory.`;
        data.stats = {
            count: { files: filesWorking.files.length, dirs: filesWorking.dirs.length },
            totalSize: totalSize,
            duration: Math.round(Date.now()-startTime)
        };
        if (readme) data.readme = {
            html: marked.parse(fs.readFileSync(readme.pathAbs).toString()),
            path: readme.pathRel
        };
        return render();
    };
};