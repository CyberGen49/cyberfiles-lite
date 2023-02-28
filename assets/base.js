
/**
 * A shortcut for `*.querySelector()`.
 * @param {string} id The target query selector
 * @param {HTMLElement} ancestor The ancestor element to start from
 * @returns {HTMLElement|undefined} The selected element
 */
function $(selector, ancestor = document) {
    return ancestor.querySelector(selector);
}
/**
 * A shortcut for `*.querySelectorAll()`.
 * @param {string} id The target query selector
 * @param {HTMLElement} ancestor The ancestor element to start from
 * @returns {NodeListOf<any>} The selected elements
 */
function $$(selector, ancestor = document) {
    return ancestor.querySelectorAll(selector);
}

/**
 * Positions an element at the given coordinates, ensuring it stays within the window.
 * @param {HTMLElement} element The element
 * @param {number} x Left
 * @param {number} y Top
 */
function positionElement(element, x, y) {
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    if (x + elementWidth > windowWidth) {
        x = x - elementWidth;
        if (x < 0) x = 0;
    }
    if (y + elementHeight > windowHeight) {
        y = y - elementHeight;
        if (y < 0) y = 0;
    }
    element.style.left = x + 'px';
    element.style.top = y + 'px';
}

/**
 * Builds a popup
 */
class PopupBuilder {
    #shouldEscapeClose = true;
    #elCont; #elTitle; #elBody; #elActions;
    constructor() {
        // Create container
        this.#elCont = document.createElement('div');
        this.#elCont.classList.add('popupCont');
        // Create popup element
        this.el = document.createElement('div');
        this.el.classList.add('popup');
        this.#elCont.appendChild(this.el);
        // Add title
        this.#elTitle = document.createElement('div');
        this.#elTitle.classList.add('title');
        this.#elTitle.innerText = 'Popup';
        this.el.appendChild(this.#elTitle);
        // Add body
        this.#elBody = document.createElement('div');
        this.#elBody.classList.add('body');
        this.el.appendChild(this.#elBody);
        // Add actions container
        this.#elActions = document.createElement('div');
        this.#elActions.classList.add('actions');
        this.el.appendChild(this.#elActions);
        // Set up listeners
        this.#elCont.addEventListener('click', () => {
            if (this.#shouldEscapeClose) this.hide();
        });
        this.el.addEventListener('click', e => e.stopPropagation());
        // Set up focus trap
        this.trap = null;
        try {
            this.trap = focusTrap.createFocusTrap(this.#elCont, {
                initialFocus: false,
                escapeDeactivates: false
            });
        } catch(error) {}
    }
    /**
     * Sets the title of the popup.
     * @param {string} title The title of the popup
     * @returns {PopupBuilder}
     */
    setTitle(title) {
        this.#elTitle.innerText = title;
        return this;
    }
    /**
     * Adds an HTML element to the body of the popup.
     * @param {HTMLElement} element The element
     * @returns {PopupBuilder}
     */
    addBody(element) {
        this.#elBody.appendChild(element);
        return this;
    }
    /**
     * Appends raw HTML to the body of the popup.
     * @param {string} html An HTML string
     * @returns {PopupBuilder}
     */
    addBodyHTML(html) {
        this.#elBody.insertAdjacentHTML('beforeend', html);
        return this;
    }
    /**
     * Sets if clicking outside the popup or pressing escape will close the popup. Defaults to `true`.
     * @param {boolean} shouldClose 
     * @returns {PopupBuilder}
     */
    setClickOutside(shouldClose) {
        this.#shouldEscapeClose = shouldClose;
        return this;
    }
    /**
     * Shows the popup.
     */
    show() {
        document.body.appendChild(this.#elCont);
        setTimeout(() => {
            this.#elCont.classList.add('visible');
            try {
                this.trap.activate();
            } catch (error) {
                console.warn(`Unable to trap focus inside popup. Make sure focus-trap and tabbable are available.`);
            }
        }, 1);
        return this;
    }
    /**
     * Hides the popup and removes it from the DOM.
     */
    hide() {
        this.#elCont.classList.remove('visible');
        try {
            this.trap.deactivate();
        } catch (error) {}
        setTimeout(() => {
            this.#elCont.parentNode.removeChild(this.#elCont);
        }, 200);
        return this;
    }
    /**
     * @callback PopupBuilderAddActionCallback
     * @param {PopupActionBuilder} actionBuilder An action builder to be modified and returned.
     */
    /**
     * Adds an action button to the bottom of the popup. These buttons are displayed from right to left.
     * @param {PopupBuilderAddActionCallback} callback A callback function that returns a `PopupActionBuilder` object. This callback is passed a new `PopupActionBuilder` object that can be modified and returned.
     */
    addAction(callback) {
        const builder = new PopupActionBuilder(this);
        const action = callback(builder);
        this.#elActions.appendChild(action.el);
        return this;
    }
}
/**
 * Builds a popup action button
 */
class PopupActionBuilder {
    #shouldClose = true;
    #onClick = () => {};
    /**
     * @param {PopupBuilder} parent The parent popup builder.
     */
    constructor(parent) {
        this.parent = parent;
        this.el = document.createElement('button');
        this.el.classList.add('btn', 'secondary');
        this.el.innerText = `Button`;
        this.el.addEventListener('click', () => {
            if (this.el.disabled) return;
            if (this.#shouldClose) parent.hide();
            this.#onClick();
        });
    }
    /**
     * Sets whether this action button should use the primary button style. Defaults to `false`.
     * @param {boolean} isPrimary
     * @returns {PopupActionBuilder}
     */
    setIsPrimary(isPrimary) {
        if (isPrimary) this.el.classList.remove('secondary');
        else this.el.classList.add('secondary');
        return this;
    }
    /**
     * Sets whether this action button should use the danger button style. Defaults to `false`.
     * @param {boolean} isDanger
     * @returns {PopupActionBuilder}
     */
    setIsDanger(isDanger) {
        if (isDanger) this.el.classList.add('danger');
        else this.el.classList.remove('danger');
        return this;
    }
    /**
     * Sets whether clicking this action should close the popup. Defaults to `true`.
     * @param {boolean} shouldClose 
     * @returns {PopupActionBuilder}
     */
    setShouldClose(shouldClose) {
        this.#shouldClose = shouldClose;
        return this;
    }
    /**
     * Sets the label of this action button.
     * @param {string} label The button's label
     * @returns {PopupActionBuilder}
     */
    setLabel(label) {
        this.el.innerText = label;
        return this;
    }
    /**
     * Disables the action button.
     * @returns {PopupActionBuilder}
     */
    disable() {
        this.el.disabled = true;
        return this;
    }
    /**
     * Enables the action button.
     * @returns {PopupActionBuilder}
     */
    enable() {
        this.el.disabled = false;
        return this;
    }
    /**
     * Sets a callback to be run when this action is clicked.
     * @param {callback} onClick The callback
     * @returns {PopupActionBuilder}
     */
    setClickHandler(onClick) {
        this.#onClick = onClick;
        return this;
    }
}

/**
 * Builds a context menu
 */
class ContextMenuBuilder {
    #elCont;
    constructor() {
        // Create container
        this.#elCont = document.createElement('div');
        this.#elCont.classList.add('contextCont');
        // Create popup element
        this.el = document.createElement('div');
        this.el.classList.add('context');
        this.#elCont.appendChild(this.el);
        // Hide when clicking outside
        this.#elCont.addEventListener('click', () => {
            this.hide();
        });
        this.el.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        // Create focus trap
        try {
            this.trap = focusTrap.createFocusTrap(this.#elCont, {
                initialFocus: false,
                escapeDeactivates: false
            });
        } catch(error) {}
    }
    /**
     * @callback ContextMenuBuilderAddItemCallback
     * @param {ContextMenuItemBuilder} itemBuilder An item builder to be modified and returned.
     */
    /**
     * Adds a clickable item to the context menu.
     * @param {ContextMenuBuilderAddItemCallback} callback A callback function that returns a `ContextMenuItemBuilder` object. This callback is passed a new `ContextMenuItemBuilder` object that can be modified and returned.
     * @returns {ContextMenuBuilder}
     */
    addItem(callback) {
        const builder = new ContextMenuItemBuilder(this);
        const item = callback(builder);
        this.el.appendChild(item.el);
        return this;
    }
    /**
     * Adds a separator to the context menu.
     * @returns {ContextMenuBuilder}
     */
    addSeparator() {
        const el = document.createElement('div');
        el.classList.add('separator');
        this.el.appendChild(el);
        return this;
    }
    /**
     * Sets if menu item icons should be shown. If `true`, the space an icon takes up is still visible even on items without set icons. If `false`, all item icons are hidden, regardless of whether they're set or not. Defaults to `true`.
     * @param {boolean} areVisible The new state
     * @returns {ContextMenuBuilder}
     */
    setIconVisibility(areVisible) {
        this.el.classList.toggle('hideIcons', !areVisible);
        return this;
    }
    /**
     * Shows the context menu at the specified fixed coordinates. This method is used by the other show methods.
     * @param {number} x Left
     * @param {number} y Top
     */
    showAtCoords(x, y) {
        document.body.appendChild(this.#elCont);
        setTimeout(() => {
            this.el.style.scale = '1';
            positionElement(this.el, x, y);
            this.el.style.scale = '';
            setTimeout(() => {
                this.#elCont.classList.add('ani');
                setTimeout(() => {
                    this.#elCont.classList.add('visible');
                    try {
                        this.trap.activate();
                    } catch (error) {
                        console.warn(`Unable to trap focus inside context menu. Make sure focus-trap and tabbable are available.`);
                    }
                }, 1);
            }, 10);
        }, 1);
        return this;
    }
    /**
     * Shows the context menu originating from the center of an HTML element.
     * @param {HTMLElement} el The target element
     * @returns {ContextMenuBuilder}
     */
    showAtElement(el) {
        const rect = el.getBoundingClientRect();
        return this.showAtCoords((rect.left+(rect.width/2)), (rect.top+(rect.height/2)));
    }
    /**
     * Shows the context menu at the current mouse position, or fixed in the top left if there hasn't been any mouse movement.
     * @returns {ContextMenuBuilder}
     */
    showAtCursor() {
        return this.showAtCoords(mouse.x+5, mouse.y);
    }
    /**
     * Hides the context menu and removes it from the DOM.
     */
    hide() {
        this.#elCont.classList.remove('visible');
        try {
            this.trap.deactivate();
        } catch (error) {}
        setTimeout(() => {
            this.#elCont.parentNode.removeChild(this.#elCont);
        }, 200);
        return this;
    }
}
/**
 * Builds a clickable context menu item
 */
class ContextMenuItemBuilder {
    #onClick = () => {};
    constructor(parent) {
        this.parent = parent;
        // Create item container
        this.el = document.createElement('button');
        this.el.classList.add('item');
        // Create icon
        this.elIcon = document.createElement('div');
        this.elIcon.classList.add('icon', 'hidden');
        this.el.appendChild(this.elIcon);
        // Create label
        this.elLabel = document.createElement('div');
        this.elLabel.classList.add('label');
        this.elLabel.innerText = `Item`;
        this.el.appendChild(this.elLabel);
        // Set up click handler
        this.el.addEventListener('click', () => {
            if (this.el.disabled) return;
            this.#onClick();
            parent.hide();
        });
    }
    /**
     * Sets the label for this menu item.
     * @param {string} label The item's label
     * @returns {ContextMenuItemBuilder}
     */
    setLabel(label) {
        this.elLabel.innerText = label;
        return this;
    }
    /**
     * Sets the icon for this item. If unset, no icon will be shown.
     * @param {string} icon A valid [Material Symbol](https://fonts.google.com/icons) string
     * 
     * To make sure you're getting the right symbol, click on the icon, go to the **Android** tab, and copy the string in the code block.
     * @returns {ContextMenuItemBuilder}
     */
    setIcon(icon) {
        this.elIcon.classList.remove('hidden');
        this.elIcon.innerText = icon;
        return this;
    }
    /**
     * Sets hover tooltip text for this item.
     * @param {string} text The tooltip text
     * @returns {ContextMenuItemBuilder}
     */
    setTooltip(text) {
        this.el.title = text;
        return this;
    }
    /**
     * Sets whether or not the icon and text of this item should be red.
     * @param {boolean} isDanger
     * @returns {ContextMenuItemBuilder}
     */
    setIsDanger(isDanger) {
        this.elIcon.classList.toggle('text-danger', isDanger);
        this.elLabel.classList.toggle('text-danger', isDanger);
        return this;
    }
    /**
     * Disables this menu item.
     * @returns {ContextMenuItemBuilder}
     */
    disable() {
        this.el.disabled = true;
        return this;
    }
    /**
     * Enables this menu item.
     * @returns {ContextMenuItemBuilder}
     */
    enable() {
        this.el.disabled = false;
        return this;
    }
    /**
     * Sets a callback to be run when this item is clicked.
     * @param {callback} onClick The callback
     * @returns {ContextMenuItemBuilder}
     */
    setClickHandler(onClick) {
        this.#onClick = onClick;
        return this;
    }
}

/**
 * Initializes a toast notification overlay container.
 */
class ToastOverlay {
    /**
     * @param {('left'|'center'|'right')} hAlign Horizontal alignment
     * @param {('top'|'bottom')} vAlign Vertical alignment
     */
    constructor(hAlign = 'left', vAlign = 'bottom') {
        this.el = document.createElement('div');
        this.el.classList.add('toastOverlay', 'col', 'gap-10');
        if (hAlign == 'left') this.el.classList.add('align-start');
        if (hAlign == 'center') this.el.classList.add('align-center');
        if (hAlign == 'right') this.el.classList.add('align-end');
        if (vAlign == 'top') this.el.classList.add('justify-start');
        if (vAlign == 'bottom') {
            this.el.classList.add('justify-start');
            this.el.style.flexDirection = 'column-reverse';
        }
        document.body.appendChild(this.el);
    }
    /**
     * @callback ToastOverlayShowCallback
     * @param {ToastBuilder} itemBuilder An item builder to be modified and returned.
     */
    /**
     * Shows a new toast notification.
     * @param {ToastOverlayShowCallback} callback A callback function that returns a `ToastBuilder` object. This callback is passed a new `ToastBuilder` object that can be modified and returned.
     * @returns {ToastOverlay}
     */
    showToast(callback) {
        const builder = new ToastBuilder(this);
        const toast = callback(builder);
        this.el.insertAdjacentElement('afterbegin', toast.el);
        setTimeout(() => {
            const delay = toast.el.dataset.delay;
            if (delay) setTimeout(() => {
                toast.close();
            }, delay);
            toast.el.classList.add('visible');
            if (delay) setTimeout(close, delay);
        }, 100);
        return this;
    }
}
/**
 * Builds a toast notification. This class is to be used alongside the `ToastOverlay` class.
 */
class ToastBuilder {
    constructor() {
        this.el = document.createElement('div');
        this.el.classList.add('toast', 'row', 'gap-10', 'align-center');
        this.elIcon = document.createElement('div');
        this.elIcon.classList.add('icon', 'hidden');
        this.el.appendChild(this.elIcon);
        this.elBody = document.createElement('div');
        this.elBody.classList.add('body');
        this.elBody.innerText = 'Toast notification';
        this.el.appendChild(this.elBody);
        this.elClose = document.createElement('button');
        this.elClose.classList.add('btn', 'secondary', 'iconOnly', 'small', 'close');
        this.elClose.innerHTML = '<div class="icon">close</div>';
        this.elClose.title = 'Dismiss';
        this.elClose.addEventListener('click', () => this.close());
        this.el.appendChild(this.elClose);
        this.el.dataset.delay = 5000;
    }
    /**
     * Sets the icon to show on the left of the toast.
     * @param {string} icon A valid [Material Symbol](https://fonts.google.com/icons) string
     * @returns {ToastBuilder}
     */
    setIcon(icon) {
        this.elIcon.classList.remove('hidden');
        this.elIcon.innerText = icon;
        return this;
    }
    /**
     * Sets the body of the toast.
     * @param {string} html The body HTML
     * @returns {ToastBuilder}
     */
    setBodyHTML(html) {
        this.elBody.innerHTML = html;
        return this;
    }
    /**
     * Sets the delay before the toast will automatically close after being shown. Set this to `0` to show the toast indefinitely (until the user closes it).
     * 
     * Default is `5000` (5 seconds).
     * @param {number} delayMs The delay in milliseconds.
     * @returns {ToastBuilder}
     */
    setCloseDelay(delayMs) {
        this.el.dataset.delay = delayMs;
        return this;
    }
    /**
     * Sets whether or not the toast can be closed by the user. Rather, this determines if the close button is visible or not.
     * @param {boolean} isCloseable
     * @returns {ToastBuilder}
     */
    setIsCloseable(isCloseable) {
        if (isCloseable) {
            this.elClose.style.display = '';
        } else {
            this.elClose.style.display = 'none';
        }
        return this;
    }
    /**
     * Closes the toast, assuming that it's visible.
     * @returns {ToastBuilder}
     */
    close() {
        this.el.classList.remove('visible');
        setTimeout(() => {
            if (!this.el.parentNode) return;
            this.el.parentNode.removeChild(this.el);
        }, 200);
        return this;
    }
}

// Continuously save mouse position
const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Handle dynamic changes
document.addEventListener('domChange', () => {
    // Get elements with a title attribute but no tooltip
    const els = $$('[title]:not([data-has-tooltip]):not([data-no-tooltip])');
    // Loop through 'em
    for (const el of els) {
        let isMouseOver = false;
        let timeout;
        // Create and append the tooltip
        const tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        document.body.appendChild(tooltip);
        // Remove original title
        let html = el.title;
        el.removeAttribute('title');
        // Hide the tooltip
        const hide = () => {
            clearTimeout(timeout);
            tooltip.classList.remove('visible');
        };
        // Show the tooltip
        const show = () => {
            hide();
            if (!el) return;
            if (el.title) html = el.title;
            el.removeAttribute('title');
            tooltip.innerHTML = html;
            timeout = setTimeout(() => {
                positionElement(tooltip, mouse.x+5, mouse.y);
                timeout = setTimeout(() => {
                    if (!isMouseOver) return;
                    tooltip.classList.add('visible');
                    timeout = setTimeout(() => {
                        hide();
                    }, 10000);
                }, 500);
            }, 200);
        };
        // On mouse move
        el.addEventListener('mousemove', () => {
            isMouseOver = true;
            show();
        });
        // On mouse leave
        el.addEventListener('mouseleave', () => {
            isMouseOver = false;
            hide();
        });
        // On mouse click
        el.addEventListener('click', () => {
            hide();
        });
        // Mark the tooltip as added
        el.dataset.hasTooltip = true;
    }

    // Get slider elements
    const sliders = $$('div.slider:not([data-modified])');
    // Loop through 'em
    for (const slider of sliders) {
        // Collect initial values
        const min = slider.dataset.min || 0;
        const max = slider.dataset.max || 100;
        const step = slider.dataset.step || 1;
        const value = slider.dataset.value || 0;
        const textbox = $(slider.dataset.textbox);
        const rangeId = slider.dataset.rangeId;
        const progId = slider.dataset.progId;
        // Create progress element
        const prog = document.createElement('progress');
        prog.min = min;
        prog.max = max;
        prog.value = value;
        prog.step = step;
        (progId) ? prog.id = progId : '';
        slider.appendChild(prog);
        // Create input element
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = value;
        input.step = step;
        (rangeId) ? input.id = rangeId : '';
        slider.appendChild(input);
        // Add event listeners
        input.addEventListener('input', () => {
            prog.value = input.value;
            if (textbox) textbox.value = input.value;
        });
        input.addEventListener('change', () => {
            prog.value = input.value;
            if (textbox) textbox.value = input.value;
        });
        prog.addEventListener('change', () => {
            input.value = prog.value;
            if (textbox) textbox.value = prog.value;
        });
        if (textbox) {
            textbox.type = 'number';
            textbox.min = min;
            textbox.max = max;
            textbox.step = step;
            textbox.value = value;
            textbox.addEventListener('input', () => {
                input.value = textbox.value;
                prog.value = textbox.value;
            });
            textbox.addEventListener('change', () => {
                input.value = textbox.value;
                prog.value = textbox.value;
            });
        }
        input.dispatchEvent(new Event('input'));
        // Mark the slider as added
        slider.dataset.modified = true;
    }

    // Get expandable textareas
    const textareas = $$('textarea[data-make-expandable]:not([data-modified])');
    // Loop through 'em
    for (const textarea of textareas) {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
        textarea.dataset.modified = true;
        textarea.dispatchEvent(new Event('input'));
        setInterval(() => textarea.dispatchEvent(new Event('input')), 1000);
    }
});
    
// Handle DOM mutations and dispatching the domChange event
const mutationObs = new MutationObserver(() => {
    document.dispatchEvent(new Event('domChange'));
});
mutationObs.observe(document.documentElement, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
    attributeOldValue: true,
    characterDataOldValue: true
});
window.addEventListener('domcontentloaded', () => {
    document.dispatchEvent(new Event('domChange'));
});