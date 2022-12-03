
window.addEventListener('load', () => {
    _qs('#domain').innerText = window.location.hostname;
    if (_qs('#path'))
        _qs('#path').scrollLeft = _qs('#path').scrollWidth;
    const updateTimes = () => {
        for (const el of _qsa('[data-timestamp]')) {
            const timestamp = parseInt(el.dataset.timestamp);
            if (!timestamp) continue;
            el.innerText = getRelativeDate(timestamp);
            const time = dayjs(timestamp);
            el.title = `Last modified on ${time.format(`YYYY-MM-DD`)} at ${time.format(`HH:mm`)}`;
        }
    };
    updateTimes();
    setInterval(updateTimes, 1000*60);
    for (const el of _qsa('[data-video-url]')) {
        el.src = `https://src.simplecyber.org/video/?hue=210&nameOnlyFullscreen=true&url=${window.location.protocol}//${window.location.host}${el.dataset.videoUrl}`;
        console.log(el.src);
    }
});