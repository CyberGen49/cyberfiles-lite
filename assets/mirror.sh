
# This script downloads remote assets
# Links to fonts are made absolute

download() {
    wget -q --show-progress -O $1 https://src.simplecyber.org/$2
}

download base.css v2/base.css
sed -i "s/\/fonts\//https:\/\/src.simplecyber.org\/fonts\//" base.css
download themes.css v2/themes.css
download base.js v2/base.js
download lib/prism.min.js lib/prism.min.js
download lib/dayjs.min.js lib/dayjs.min.js
download lib/dayjs.advancedFormat.js lib/dayjs.advancedFormat.js
download lib/focus-trap.min.js lib/focus-trap.min.js
download lib/tabbable.min.js lib/tabbable.min.js