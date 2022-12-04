
const baseUrl = `${window.location.protocol}//${window.location.host}`;

window.addEventListener('load', () => {
    //_qs('#domain').innerText = window.location.hostname;
    if (_qs('#path'))
        _qs('#path').scrollLeft = _qs('#path').scrollWidth;
    const updateTimes = () => {
        for (const el of _qsa('[data-timestamp]')) {
            const timestamp = parseInt(el.dataset.timestamp);
            if (!timestamp) continue;
            el.innerText = getRelativeDate(timestamp);
            const time = dayjs(timestamp);
            el.dataset.dateFull = `${time.format(`MMM D YYYY`)} at ${time.format(`h:mm A`)}`;
        }
    };
    updateTimes();
    setInterval(updateTimes, 1000*60);
    for (const el of _qsa('[data-video-url]')) {
        el.src = `https://src.simplecyber.org/video/?hue=${document.body.style.getPropertyValue('--fgHue')}&nameOnlyFullscreen=true&url=${baseUrl}${el.dataset.videoUrl}`;
        console.log(el.src);
    }
    for (const el of _qsa('#fileList .fileEntry')) {
        const name = _qs('.name div', el).innerText;
        const size = _qs('.size', el).innerText;
        const modified = _qs('.modified', el).dataset.dateFull;
        const shouldRender = (el.dataset.shouldRender == 'true');
        const isDir = (el.dataset.isDir == 'true');
        let action = 'download this file';
        if (shouldRender) action = 'view this file';
        if (isDir) action = 'open this folder';
        el.title = `
            <span style="color: var(--f80)">${name}</span>
            ${(modified) ? `<br>Modified: ${modified}`:''}
            ${(size !== '-') ? `<br>Size: ${size}`:''}
            <br><small>Click to ${action}</small>
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
            } else {
                if (shouldRender) data.push({
                    type: 'item',
                    icon: 'content_copy',
                    name: 'Copy file viewer URL',
                    action: () => window.navigator.clipboard.writeText(`${baseUrl}${el.dataset.path}?render=true`)
                });
                data.push({
                    type: 'item',
                    icon: 'content_copy',
                    name: 'Copy raw file URL',
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
            showContext(data);
        });
    }
    const markdownContainer = _qs(`.card[data-preview-type="markdown"]`);
    if (markdownContainer) {
        Prism.highlightAll();
        const head = _qs('.header', markdownContainer);
        const body = _qs('.body', markdownContainer);
        const idEls = _qsa('[id]', body);
        let data = [];
        for (const el of idEls) {
            const tagName = el.tagName.toLowerCase();
            if (!tagName.toLowerCase().match(/^(h1|h2|h3|h4|h5|h6)$/))
                return;
            // const lnk = document.createElement('a');
            // lnk.classList = 'headerLink';
            // lnk.innerText = 'link';
            // lnk.href = `#${el.id}`;
            // lnk.title = `Anchor`;
            // el.insertAdjacentElement('afterbegin', lnk);
            data.push({
                type: 'item',
                icon: `format_${tagName}`,
                name: el.innerText,
                action: async() => {
                    await sleep(100);
                    window.location.hash = `#${el.id}`;
                }
            });
        }
        if (data.length > 0) {
            const el = document.createElement('button');
            el.classList = `btn alt2 small noShadow iconOnly`;
            el.title = `Table of contents`;
            el.innerHTML = `
                <div class="icon">segment</div>
            `;
            on(el, 'click', () => {
                showContext(data);
            });
            _qs(`.flex-grow`, head).insertAdjacentElement(`beforebegin`, el);
        }
    }
});