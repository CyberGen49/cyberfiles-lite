
const baseUrl = window.location.origin;

dayjs.extend(window.dayjs_plugin_advancedFormat);

async function main() {
    if ($('#path'))
        $('#path').scrollLeft = $('#path').scrollWidth;

    function clamp(num, min, max) {
        if (num < min) return min;
        if (num > max) return max;
        return num;
    }
    function downloadFile(url, name) {
        if (!name) name = url.split('/').reverse()[0];
        console.log(`Downloading: "${name}" ->`, url);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = name || url.split('/').reverse()[0];
        link.target = '_blank';
        document.body.appendChild(link);
        setTimeout(() => {
            link.click();
            setTimeout(() => {
                link.remove();
            }, 100);
        }, 100);
    }
    function on(el, type, callback) {
        if (!Array.isArray(type)) type = [type];
        type.forEach((type) => {
            el.addEventListener(type, callback);
        });
    }
    const getDateFull = (timestamp, mode = 0) => {
        const time = dayjs(timestamp);
        if (mode == 0)
            return `${time.format(`MMM D YYYY`)} at ${time.format(`h:mm A`)}`;
        if (mode == 1)
            return time.format(`dddd, MMMM D, YYYY, h:mm:ss A`);
    };
    function getRelativeDate(target, anchor = Date.now()) {
        const isFuture = (anchor-target < 0) ? true : false;
        let diff = Math.abs(anchor-target);
        diff = Math.round(diff/1000);
        if (diff < 120) // Less than 120 seconds
            return (isFuture) ? `In a moment` : `Moments ago`;
        diff = Math.round(diff/60);
        if (diff < 120) // Less than 120 minutes
            return (isFuture) ? `${diff} mins from now` : `${diff} mins ago`;
        diff = Math.round(diff/60);
        if (diff < 72) // Less than 72 hours
            return (isFuture) ? `${diff} hours from now` : `${diff} hours ago`;
        diff = Math.round(diff/24);
        const days = diff;
        if (diff < 90) // Less than 90 days
            return (isFuture) ? `${diff} days from now` : `${diff} days ago`;
        diff = Math.round(diff/30.43685);
        if (diff < 36) // Less than 36 months
            return (isFuture) ? `${diff} months from now` : `${diff} months ago`;
        diff = Math.round(days/365.2422);
        return (isFuture) ? `${diff} years from now` : `${diff} years ago`;
    }
    const updateTimes = () => {
        for (const el of $$('[data-timestamp]')) {
            const timestamp = parseInt(el.dataset.timestamp);
            const mode = el.dataset.mode || 'relative';
            if (!timestamp) continue;
            if (mode == 'relative')
                el.innerText = getRelativeDate(timestamp);
            if (mode == 'absolute')
                el.innerText = getDateFull(timestamp);
            if (mode == 'absoluteLong')
                el.innerText = getDateFull(timestamp, 1);
        }
    };
    updateTimes();
    setInterval(updateTimes, 1000 * 60);

    const toasts = new ToastOverlay('left', 'bottom');
    const copyText = async(text) => {
        try {
            await window.navigator.clipboard.writeText(text);
            toasts.showToast(toast => toast
                .setIcon('content_copy')
                .setBodyHTML(`
                    <p>Copied text to clipboard.</p>
                `))
        } catch (error) {
            toasts.showToast(toast => toast
                .setIcon('error')
                .setBodyHTML(`
                    <p>Failed to copy text to clipboard! ${error}</p>
                    <p>Here's what we tried copying:</p>
                    <code>${text}</code>
                `)
                .setCloseDelay(0))
        }
    };

    const pathParts = $$('#path .part');
    const pathPartLast = pathParts[pathParts.length-1];
    for (const part of pathParts) {
        const pathHref = part.href || null;
        const dirs = JSON.parse($('.subfolders', part).innerText);
        const menu = new ContextMenuBuilder();
        if (part != pathPartLast) {
            for (const dir of dirs) {
                const item = new ContextMenuItemBuilder(menu)
                    .setIcon('folder')
                    .setLabel(dir)
                    .setClickHandler(() => window.location.href = `${pathHref}/${dir}`);
                item.elIcon.style.fontFamily = 'Material Symbols Filled Rounded';
                menu.addItem(() => item);
            }
            if (dirs.length > 0) {
                menu.addSeparator();
            }
        }
        menu.addItem(item => item
            .setIcon('content_copy')
            .setLabel('Copy folder URL')
            .setClickHandler(() => copyText(`${pathHref}`)));
        if (part != pathPartLast) {
            menu.addItem(item => item
                .setIcon('open_in_new')
                .setLabel('Open in new tab...')
                .setClickHandler(() => window.open(pathHref, '_blank')));
        }
        part.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            menu.showAtCursor();
        });
        if (part == pathPartLast) {
            part.addEventListener('click', (e) => {
                e.preventDefault();
            });
        }
        part.title = `Right-click for options...`;
    }

    for (const el of $$('#fileList .fileEntry')) {
        const icon = $('.icon', el).innerText;
        const name = el.dataset.name;
        const size = el.dataset.size;
        const modified = (el.dataset.mtime) ? getDateFull(parseInt(el.dataset.mtime)) : '';
        const type = el.dataset.type;
        const shouldRender = (el.dataset.shouldRender == 'true');
        const isDir = (el.dataset.isDir == 'true');
        let action = 'download this file';
        if (shouldRender) action = 'view this file';
        if (isDir) action = 'open this folder';
        el.title = `
            <span style="color: var(--f2)">${name}</span>
            ${(type) ? `<br>Type: ${type}` : ''}
            ${(modified) ? `<br>Modified: ${modified}` : ''}
            ${(size && size !== '-') ? `<br>Size: ${size}` : ''}
            ${(icon == 'arrow_upward') ? '' : `<br><small>Click to ${action}</small>`}
            <br><small>Right-click for more options...</small>
        `;
        on(el, 'contextmenu', (e) => {
            if (e.shiftKey) return;
            e.preventDefault();
            const isUp = icon == 'arrow_upward';
            const menu = new ContextMenuBuilder();
            if (isDir && !isUp) {
                menu.addItem(item => item
                    .setIcon('content_copy')
                    .setLabel('Copy folder URL')
                    .setClickHandler(() => copyText(`${baseUrl}${el.dataset.path}`)));
            } else if (!isUp) {
                if (shouldRender) menu.addItem(item => item
                    .setIcon('content_copy')
                    .setLabel('Copy file viewer URL')
                    .setTooltip(`Copies a link that allows anyone to view this file in their browser. This is ideal for sharing the file with others.`)
                    .setClickHandler(() => copyText(`${baseUrl}${el.dataset.path}?render=true`)));
                menu.addItem(item => item
                    .setIcon('content_copy')
                    .setLabel('Copy raw file URL')
                    .setTooltip(`Copies a link that leads directly to this file, not a viewable page. This is ideal if you're adding a link to this file in code, or for direct downloading.`)
                    .setClickHandler(() => copyText(`${baseUrl}${el.dataset.path}`)));
            }
            menu.addItem(item => item
                .setIcon('open_in_new')
                .setLabel('Open in new tab...')
                .setClickHandler(() => window.open(el.href, '_blank')));
            if (isDir && !isUp) {
                menu.addSeparator();
                menu.addItem(item => item
                    .setIcon('download')
                    .setLabel('Download as zip')
                    .setClickHandler(() => downloadFile(`?zip=./${encodeURI(name)}`, `${name}.zip`)));
            } else if (!isUp) {
                menu.addSeparator();
                menu.addItem(item => item
                    .setIcon('download')
                    .setLabel('Download file')
                    .setClickHandler(() => downloadFile(el.dataset.path)));
            }
            menu.showAtCursor();
        });
        if ($('.thumb', el)) {
            const thumb = $('.thumb', el);
            const loaded = () => {
                $('.icon', el).remove();
                thumb.classList.add('visible');
            };
            if (thumb.src && thumb.complete) loaded();
            else thumb.addEventListener('load', loaded);
        }
    }

    let lazyLoadTimeout;
    const lazyLoadImages = () => {
        clearTimeout(lazyLoadTimeout);
        lazyLoadTimeout = setTimeout(() => {
            const unloadedImages = $$('img[data-src]:not([src])');
            for (const img of unloadedImages) {
                const rect = img.getBoundingClientRect();
                const buffer = 300;
                if (rect.top < (window.innerHeight+buffer) && rect.bottom > -buffer) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
            }
        }, 50);
    };
    const cardHeaders = $$('.card .header');
    const cardFooters = $$('.card .footer');
    const onResizeOrientationChangeScroll = () => {
        lazyLoadImages();
        for (const header of cardHeaders) {
            const headerTop = header.getBoundingClientRect().top;
            header.classList.toggle('sticky', (headerTop <= 0));
        }
        for (const footer of cardFooters) {
            const footerBottom = footer.getBoundingClientRect().bottom;
            footer.classList.toggle('sticky', (footerBottom >= window.innerHeight));
        }
    };
    on(window, ['resize', 'orientationChange'], onResizeOrientationChangeScroll);
    on(document, 'scroll', onResizeOrientationChangeScroll);
    onResizeOrientationChangeScroll();

    const markdownContainer = $(`.card[data-preview-type="markdown"]`);
    if (markdownContainer) {
        Prism.highlightAll();
        const head = $('.header', markdownContainer);
        const body = $('.body', markdownContainer);
        const idEls = $$('[id]', body);
        const menu = new ContextMenuBuilder().setIconVisibility(false);
        // Build table of contents
        let shouldShow = false;
        for (const el of idEls) {
            const tagName = el.tagName.toLowerCase();
            if (!tagName.toLowerCase().match(/^(h1|h2|h3|h4|h5|h6)$/))
                continue;
            const item = new ContextMenuItemBuilder(menu)
                .setLabel(el.innerText)
                .setClickHandler(() => {
                    setTimeout(() => {
                        window.location.hash = `#${el.id}`;
                        setTimeout(() => {
                            window.scrollTo(0, window.scrollY-50);
                        }, 100);
                    }, 100);
                });
            const level = parseInt(tagName.replace('h', ''));
            item.el.style.marginLeft = `${20*(level-1)}px`;
            if (level == 4 || level == 5) item.el.style.marginLeft = 'var(--f2)';
            if (level == 6) item.el.style.marginLeft = 'var(--f3)';
            menu.addItem(() => item);
            shouldShow = true;
        }
        if (shouldShow) {
            const el = document.createElement('button');
            el.classList = `btn tertiary small iconOnly`;
            el.title = `Table of contents`;
            el.innerHTML = `<div class="icon">segment</div>`;
            el.style.marginRight = `12px`;
            el.addEventListener('click', () => menu.showAtElement(el));
            $(`.flex-grow`, head).insertAdjacentElement(`beforebegin`, el);
        }
        // Determine if we need to show the scroll button
        const scrollButton = $('#scrollButton');
        const fileList = $('#fileList');
        const fileListCard = $('#fileListCard');
        if (fileList) {
            let isScrollButtonVisible = false;
            const checkShowScrollButton = () => {
                if (fileList.getBoundingClientRect().height > window.innerHeight) {
                    if (!isScrollButtonVisible) {
                        scrollButton.classList.remove('hidden');
                        scrollButton.classList.remove('ani');
                        setTimeout(() => {
                            scrollButton.classList.add('ani');
                            isScrollButtonVisible = true;
                        }, 500);
                    }
                } else {
                    scrollButton.classList.add('hidden');
                    isScrollButtonVisible = false;
                }
                updateScrollButton();
            };
            const updateScrollButton = () => {
                if (body.getBoundingClientRect().top < window.innerHeight) {
                    $('.icon', scrollButton).innerText = 'arrow_upward';
                    scrollButton.title = 'Scroll up to view files';
                } else {
                    $('.icon', scrollButton).innerText = 'arrow_downward';
                    scrollButton.title = 'Scroll down to read README';
                }
            };
            checkShowScrollButton();
            on(window, 'resize', checkShowScrollButton);
            on(window, 'scroll', updateScrollButton);
            on(scrollButton, 'click', () => {
                if ($('.icon', scrollButton).innerText == 'arrow_downward')
                    head.scrollIntoView({ behavior: 'smooth' });
                else
                    fileListCard.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    if ($('#sort')) on($('#sort'), 'click', () => {
        const orders = [
            { name: 'A-Z', id: 'name', dir: 'asc' },
            { name: 'Z-A', id: 'name', dir: 'desc' },
            { name: 'Oldest to newest', id: 'mtime', dir: 'asc' },
            { name: 'Newest to oldest', id: 'mtime', dir: 'desc' },
            { name: 'Extension A-Z', id: 'type', dir: 'asc' },
            { name: 'Extension Z-A', id: 'type', dir: 'desc' },
            { name: 'Smallest to largest', id: 'size', dir: 'asc' },
            { name: 'Largest to smallest', id: 'size', dir: 'desc' },
        ];
        const menu = new ContextMenuBuilder();
        for (const order of orders) {
            menu.addItem(item => item
                .setLabel(order.name)
                .setClickHandler(() => window.location.href = `?sort=${order.id}&direction=${order.dir.toString()}`));
        }
        menu.setIconVisibility(false);
        menu.showAtElement($('#sort'));
    });

    if ($('#dirView')) on($('#dirView'), 'click', () => {
        const currentView = $('#dirView').dataset.currentView;
        let newView;
        if (currentView == 'list') newView = 'tiles';
        if (currentView == 'tiles') newView = 'list';
        window.location.href = `?view=${newView}`;
    });

    const shareMenu = new ContextMenuBuilder();
    const copyFolderURL = () => copyText(`${baseUrl}${window.location.pathname}`);
    if ($('#dirShare')) {
        shareMenu.addItem(item => item
            .setIcon('content_copy')
            .setLabel('Copy folder URL')
            .setClickHandler(copyFolderURL));
        on($('#dirShare'), 'click', () => shareMenu.showAtElement($('#dirShare')));
        on($('#infoDirShare'), 'click', copyFolderURL);
    }

    if ($('#dirDownload')) {
        const downloadFolderZip = () => {
            const name = `${[...$$('#path .part')].pop().innerText}.zip`;
            downloadFile(`?zip=./`, name);
        };
        on($('#dirDownload'), 'click', downloadFolderZip);
    }

    if ($('#dirMenu')) on($('#dirMenu'), 'click', () => {
        new ContextMenuBuilder()
            .addItem(item => item
                .setIcon($('#dirView .icon').innerText)
                .setLabel(`Change folder view`)
                .setClickHandler(() => $('#dirView').click()))
            .addSeparator()
            .addItem(item => item
                .setIcon('share')
                .setLabel(`Share this folder...`)
                .setClickHandler(() => shareMenu.showAtCursor()))
            .addSeparator()
            .addItem(item => item
                .setIcon('download')
                .setLabel(`Download as zip`)
                .setClickHandler(() => $('#dirDownload').click()))
            .showAtElement($('#dirMenu'));
    });

    if ($('#searchBtn')) {
        const head = $('#fileListHeader');
        const textbox = $('#searchInput');
        const files = $$('#fileList .fileEntry');
        let isSearching = false;
        let timeout;
        on($('#searchBtn'), 'click', () => {
            if (head.classList.contains('search')) {
                head.classList.remove('search');
                textbox.value = '';
                textbox.dispatchEvent(new Event('keydown'));
                isSearching = false;
            } else {
                head.classList.add('search');
                textbox.focus();
                isSearching = true;
            }
        });
        on(window, 'keydown', (e) => {
            if (e.ctrlKey && e.code == 'KeyF') {
                e.preventDefault();
                if (!isSearching) $('#searchBtn').click();
                textbox.focus();
            }
            if (e.code == 'Escape' && isSearching) {
                $('#searchBtn').click();
            }
        });
        on(textbox, 'keydown', (e) => {
            clearTimeout(timeout);
            setTimeout(() => {
                const input = textbox.value.trim().toLowerCase();
                let foundCount = 0;
                for (const file of files) {
                    if ($('.icon', file)) {
                        if ($('.icon', file).innerText == 'arrow_upward') continue;
                    }
                    const parent = file.parentNode;
                    const name = $('.name div', file).innerText.toLowerCase();
                    if (name.match(input) || !input) {
                        parent.style.display = '';
                        foundCount++;
                    } else parent.style.display = 'none';
                }
                $('#searchNoneFound').style.display = 'none';
                if (foundCount == 0) {
                    $('#searchNoneFound').style.display = '';
                }
            }, clamp(files.length, 0, 500));
        });
    }

    if ($('#shareFile')) {
        const copyPreviewURL = () => copyText(`${baseUrl}${window.location.pathname}?render=true`);
        const menu = new ContextMenuBuilder()
            .addItem(item => item
                .setIcon('content_copy')
                .setLabel('Copy file viewer URL')
                .setTooltip(`Copies a link that allows anyone to view this file in their browser. This is ideal for sharing the file with others.`)
                .setClickHandler(copyPreviewURL))
            .addItem(item => item
                .setIcon('content_copy')
                .setLabel('Copy raw file URL')
                .setTooltip(`Copies a link that leads directly to this file, not a viewable page. This is ideal if you're adding a link to this file in code, or for direct downloading.`)
                .setClickHandler(() => copyText(`${baseUrl}${window.location.pathname}`)));
        on($('#shareFile'), 'click', () => menu.showAtElement($('#shareFile')));
        on($('#infoShareFile'), 'click', copyPreviewURL);
    }

    for (const el of $$('[data-video-url]')) {
        el.src = `https://src.simplecyber.org/v2/video/?url=${baseUrl}${el.dataset.videoUrl}&titleOnlyFullscreen=true&autoplay=true&theme=${document.body.dataset.theme}`;
        console.log(el.src);
    }

    for (const el of $$('[data-audio-url]')) {
        el.src = `https://src.simplecyber.org/v2/audio/?url=${baseUrl}${el.dataset.audioUrl}&hideTitle=true&hideBorder=true&autoplay=true&theme=${document.body.dataset.theme}`;
        console.log(el.src);
    }

    $('#settingsOpen').addEventListener('click', () => {
        const popup = new PopupBuilder()
            .setTitle(`Settings`)
            .addAction(action => action.setLabel(`Done`).setIsPrimary(true))
            .setClickOutside(false)
            .addBodyHTML(`
                <p>These settings are saved in your browser and will only take effect on this device.</p>
                <h4>Theme</h4>
                <div class="row gap-10 flex-wrap">${(() => {
                    const html = [];
                    for (const id in themes) {
                        const theme = themes[id];
                        html.push(`
                            <button class="btn secondary small" data-theme="${id}" title="Theme ID: ${id}">
                                <div class="icon" style="display: none">done</div>
                                ${theme.name}
                            </button>
                        `);
                    }
                    return html.join('');
                })()}</div>
                <!-- <h5>Date format</h5>
                <div class="col gap-10">
                    <div style="max-width: 400px">
                        <label>Absolute short</label>
                        <input id="inputDateAbsShort" type="text" class="textbox" style="width: 100%" value="...">
                    </div>
                    <div style="max-width: 400px">
                        <label>Absolute long</label>
                        <input id="inputDateAbsLong" type="text" class="textbox" style="width: 100%" value="...">
                    </div>
                </div> -->
                <h4>Reset</h4>
                <div class="col gap-10">
                    <div class="row">
                        <button id="settingsReset" class="btn danger">
                            Reset settings
                        </button>
                    </div>
                    <small>This will reset all CyberFiles settings to their defaults.</small>
                </div>
            `);
        popup.show();
        const currentTheme = document.body.dataset.theme;
        const themeButtons = $$('button[data-theme]');
        $(`button[data-theme="${currentTheme}"] .icon`).style.display = '';
        $(`button[data-theme="${currentTheme}"]`).classList.remove('secondary');
        for (const btn of themeButtons) {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                setTheme(theme);
                for (const btn of themeButtons) {
                    btn.classList.add('secondary');
                    $('.icon', btn).style.display = 'none';
                }
                btn.classList.remove('secondary');
                $('.icon', btn).style.display = '';
            });
        }
        $('#settingsReset').addEventListener('click', () => {
            window.localStorage.clear();
            window.location.reload();
        });
    });

    const hash = window.location.hash;
    window.location.hash = '#';
    setTimeout(() => {
        window.location.hash = hash;
        window.scrollTo(0, window.scrollY-50);
        lazyLoadImages();
    }, 100);
}

window.addEventListener('DOMContentLoaded', main);