
const baseUrl = `${window.location.protocol}//${window.location.host}`;

async function main() {
    if (_qs('#path'))
        _qs('#path').scrollLeft = _qs('#path').scrollWidth;

    const getDateFull = timestamp => {
        const time = dayjs(timestamp);
        return `${time.format(`MMM D YYYY`)} at ${time.format(`h:mm A`)}`;
    };
    const updateTimes = () => {
        for (const el of _qsa('[data-timestamp]')) {
            const timestamp = parseInt(el.dataset.timestamp);
            if (!timestamp) continue;
            el.innerText = getRelativeDate(timestamp);
        }
    };
    updateTimes();
    setInterval(updateTimes, 1000 * 60);

    for (const el of _qsa('#fileList .fileEntry')) {
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
            <span style="color: var(--f80)">${name}</span>
            ${(type) ? `<br>Type: ${type}` : ''}
            ${(modified) ? `<br>Modified: ${modified}` : ''}
            ${(size && size !== '-') ? `<br>Size: ${size}` : ''}
            ${(icon == 'arrow_upward') ? '' : `<br><small>Click to ${action}</small>`}
            <br><small>Right-click for more options...</small>
        `;
        on(el, 'contextmenu', (e) => {
            if (e.shiftKey) return;
            e.preventDefault();
            const data = [];
            if (isDir) {
                data.push({
                    type: 'item',
                    icon: 'content_copy',
                    name: 'Copy folder URL',
                    action: () => window.navigator.clipboard.writeText(`${baseUrl}${el.dataset.path}`)
                });
                data.push({ type: 'sep' });
                data.push({
                    type: 'item',
                    icon: 'download',
                    name: 'Download as zip',
                    action: () => {
                        downloadFile(`?zip=./${encodeURI(name)}`, `${name}.zip`);
                    }
                });
            } else {
                if (shouldRender) data.push({
                    type: 'item',
                    icon: 'content_copy',
                    name: 'Copy file viewer URL',
                    tooltip: `Copies a link that allows anyone to view this file in their browser. This is ideal for sharing the file with others.`,
                    action: () => window.navigator.clipboard.writeText(`${baseUrl}${el.dataset.path}?render=true`)
                });
                data.push({
                    type: 'item',
                    icon: 'content_copy',
                    name: 'Copy raw file URL',
                    tooltip: `Copies a link that leads directly to this file, not a viewable page. This is ideal if you're adding a link to this file in code, or for direct downloading.`,
                    action: () => window.navigator.clipboard.writeText(`${baseUrl}${el.dataset.path}`)
                });
                data.push({ type: 'sep' });
                data.push({
                    type: 'item',
                    icon: 'download',
                    name: 'Download file',
                    action: () => downloadFile(el.dataset.path)
                });
            }
            data.push({ type: 'sep' });
            data.push({
                type: 'item',
                icon: 'open_in_new',
                name: 'Open in new tab...',
                action: () => window.open(el.href, '_blank')
            });
            if (icon == 'arrow_upward') data.splice(0, data.length-1);
            showContext(data);
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
            const unloadedImages = [...$$('img[data-src]:not([src])')];
            unloadedImages.forEach(img => {
                const viewportTop = document.documentElement.scrollTop;
                const viewportBottom = document.documentElement.scrollTop+window.innerHeight;
                const elTop = img.offsetTop;
                if (elTop > viewportTop-300 && elTop < viewportBottom+300) {
                    img.src = img.dataset.src;
                }
            });
        }, 50);
    };
    lazyLoadImages();
    on(window, ['resize', 'orientationChange'], lazyLoadImages);
    on(document, 'scroll', () => {
        lazyLoadImages();
        const cardHeaders = $$('.card .header');
        for (const header of cardHeaders) {
            const headerTop = header.getBoundingClientRect().top;
            if (headerTop <= 0)
                header.classList.add('sticky');
            else
            header.classList.remove('sticky');
        }
    });

    const markdownContainer = _qs(`.card[data-preview-type="markdown"]`);
    if (markdownContainer) {
        Prism.highlightAll();
        const head = _qs('.header', markdownContainer);
        const body = _qs('.body', markdownContainer);
        const idEls = _qsa('[id]', body);
        let data = [];
        let levels = [];
        // Build table of contents
        for (const el of idEls) {
            const tagName = el.tagName.toLowerCase();
            if (!tagName.toLowerCase().match(/^(h1|h2|h3|h4|h5|h6)$/))
                continue;
            data.push({
                type: 'item',
                name: el.innerText,
                action: async () => {
                    await sleep(100);
                    window.location.hash = `#${el.id}`;
                    setTimeout(() => {
                        window.scrollTo(0, window.scrollY-50);
                    }, 100);
                }
            });
            levels.push(tagName.replace('h', ''));
        }
        if (data.length > 0) {
            const el = document.createElement('button');
            el.classList = `btn alt2 small noShadow iconOnly`;
            el.title = `Table of contents`;
            el.innerHTML = `<div class="icon">segment</div>`;
            on(el, 'click', () => {
                const id = showContext(data);
                const items = _qsa(`.item`, _id(id));
                let i = 0;
                for (const item of items) {
                    const level = levels[i];
                    const label = _qs('.label', item);
                    label.style.paddingLeft = `${(level - 1) * 15}px`;
                    let colour = `var(--f80)`;
                    if (level == 2) colour = `var(--f90)`;
                    if (level == 3) colour = `var(--b95)`;
                    if (level == 4) colour = `var(--b85)`;
                    if (level == 5) colour = `var(--b75)`;
                    if (level == 6) colour = `var(--b70)`;
                    label.style.color = colour;
                    i++;
                }
            });
            _qs(`.flex-grow`, head).insertAdjacentElement(`beforebegin`, el);
        }
        // Determine if we need to show the scroll button
        const scrollButton = $('#scrollButton');
        const fileList = $('#fileList');
        const fileListCard = $('#fileListCard');
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
        const data = [];
        for (const order of orders) {
            data.push({
                type: 'item',
                name: order.name,
                action: async () => window.location.href = `?sort=${order.id}&direction=${order.dir.toString()}`
            });
        }
        showContext(data);
    });

    if ($('#dirView')) on($('#dirView'), 'click', () => {
        const currentView = $('#dirView').dataset.currentView;
        let newView;
        if (currentView == 'list') newView = 'tiles';
        if (currentView == 'tiles') newView = 'list';
        window.location.href = `?view=${newView}`;
    });

    if ($('#dirShare')) on($('#dirShare'), 'click', () => {
        showContext([{
            type: 'item',
            icon: 'content_copy',
            name: `Copy folder URL`,
            action: () => window.navigator.clipboard.writeText(`${baseUrl}${window.location.pathname}`)
        }]);
    });

    if ($('#dirDownload')) on($('#dirDownload'), 'click', () => {
        const name = `${[...$$('#path .part')].pop().innerText}.zip`;
        downloadFile(`?zip=./`, name);
    });

    if ($('#dirMenu')) on($('#dirMenu'), 'click', () => {
        showContext([{
            type: 'item',
            icon: $('#dirView .icon').innerText,
            name: `Change folder view`,
            action: () => $('#dirView').click()
        }, { type: 'sep' }, {
            type: 'item',
            icon: 'share',
            name: `Share this folder...`,
            action: () => $('#dirShare').click()
        }, { type: 'sep' }, {
            type: 'item',
            icon: 'download',
            name: `Download as zip`,
            action: () => $('#dirDownload').click()
        }]);
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
                    const name = $('.name div', file).innerText.toLowerCase();
                    if (name.match(input) || !input) {
                        file.style.display = '';
                        foundCount++;
                    } else file.style.display = 'none';
                }
                $('#searchNoneFound').style.display = 'none';
                if (foundCount == 0) {
                    $('#searchNoneFound').style.display = '';
                }
            }, clamp(files.length, 0, 500));
        });
    }

    if ($('#shareFile')) on($('#shareFile'), 'click', () => {
        showContext([{
            type: 'item',
            icon: 'content_copy',
            name: 'Copy file viewer URL',
            tooltip: `Copies a link that allows anyone to view this file in their browser. This is ideal for sharing the file with others.`,
            action: () => window.navigator.clipboard.writeText(`${baseUrl}${window.location.pathname}?render=true`)
        }, {
            type: 'item',
            icon: 'content_copy',
            name: 'Copy raw file URL',
            tooltip: `Copies a link that leads directly to this file, not a viewable page. This is ideal if you're adding a link to this file in code, or for direct downloading.`,
            action: () => window.navigator.clipboard.writeText(`${baseUrl}${window.location.pathname}`)
        }]);
    });

    for (const el of _qsa('[data-video-url]')) {
        el.src = `https://src.simplecyber.org/video/?hue=${document.body.style.getPropertyValue('--fgHue')}&nameOnlyFullscreen=true&url=${baseUrl}${el.dataset.videoUrl}`;
        console.log(el.src);
    }

    for (const el of _qsa('[data-audio-url]')) {
        el.src = `https://src.simplecyber.org/audio/?hue=${document.body.style.getPropertyValue('--fgHue')}&url=${baseUrl}${el.dataset.audioUrl}`;
        console.log(el.src);
    }

    const hash = window.location.hash;
    window.location.hash = '#';
    setTimeout(() => {
        window.location.hash = hash;
        window.scrollTo(0, window.scrollY-50);
        lazyLoadImages();
    }, 100);
}

window.addEventListener('DOMContentLoaded', main);