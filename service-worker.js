// OneWindow - force all tabs into one window
// Jerry Kindall <engyrus@gmail.com> v1.4.2

// Created for use with Kiwi Browser on Android, which inherited from Chrome for Android the ability
// to have multiple windows open. When exactly this happens is unclear to me and I hated having to go close
// and combine the windows. I figured I'd roll my own extension to move tabs that open in a new window to the
// already-existing one. There's some weirdness in this code based on occasional error messages I'd get
// about trying to move tabs while they were already being moved, which would leave windows open sometimes.
// The workaround of retrying after 100 ms when an error occurs moving tabs seems to have solved that.
// Works for Chrome-based browsers on the desktop too.

// our logging function for easy commenting out
function log(msg) {
  // console.log(msg);
}

// gather tabs to the main window. if no main window is established, use window ID passed in
async function gather_tabs(a_window_id, tries, post_func) {
    tries = tries || 0;
    log(`gather tabs given window ${a_window_id}`);
    let windows = await chrome.windows.getAll();
    let { main_window_id } = await chrome.storage.session.get("main_window_id");
    if (main_window_id !== undefined && !windows.some(w => w.id === main_window_id && w.type === "normal")) {
        main_window_id = undefined;
    }
    if (main_window_id === undefined) {
        log("main window not defined");
        if (a_window_id !== undefined && windows.some(w => w.id === a_window_id && w.type === "normal")) {
            log(`using window ${a_window_id} as main window`);
            main_window_id = a_window_id;
            await chrome.storage.session.set({ main_window_id: main_window_id });
        } else {
            log(`no main window has been set`);
        }
    }
    if (main_window_id !== undefined) {
        log(`gathering tabs from other windows to main window`);
        let index = a_window_id === main_window_id ? 0 : -1;
        let protocols = /^(https?|chrome|file):/;   // only tabs that use these protocols (not extension windows)
        for (let w of windows) {
            log(`looking at window ${w.id}`);
            if (w.id !== main_window_id && w.type === "normal") {
                let w_tabs = (await chrome.tabs.query({windowId: w.id})).filter(
                    t => t.id !== undefined && protocols.test(t.pendingUrl || t.url)).map(t => t.id);
                if (w_tabs.length > 0) {
                    log(`moving tabs ${w_tabs} to window ${main_window_id}`);
                    try {
                        await chrome.tabs.move(w_tabs, {index: index, windowId: main_window_id});
                    } catch (e) {
                        log(`unable to gather tabs, will try again in 100ms; try ${tries}`);
                        if (tries < 5) {
                            setTimeout(() => {
                                gather_tabs(main_window_id, tries + 1, post_func);
                            }, 100);
                        }
                        return;
                    }
                    if (post_func) {
                        await post_func();
                    }
                }
            } else {
                log(`... this is the main window`);
            }
        }
    }
}

// When main window is closed, invalidate the stored main window
chrome.windows.onRemoved.addListener(
    async (this_window_id) => {
        log("windows.onRemoved");
        const { main_window_id } = await chrome.storage.session.get("main_window_id");
        if (this_window_id === main_window_id) {
            await chrome.storage.session.remove("main_window_id");
        }
    }
);

// When new tab is opened, gather it and all other tabs to main window
chrome.tabs.onCreated.addListener(
    (this_tab) => {
        log("tabs.onCreated");
        const this_window_id = this_tab.windowId;
        setTimeout(() => {
            gather_tabs(this_window_id, 0, async () => {
                log(`focusing current tab in main window`);
                try {
                    const current_window = await chrome.windows.getLastFocused();
                    let { main_window_id } = await chrome.storage.session.get("main_window_id");
                    if (main_window_id !== undefined) {
                        if (current_window.id !== main_window_id) {
                            await chrome.windows.update(main_window_id, {focused: true});
                        }
                        const [current_tab] = await chrome.tabs.query({active: true, windowId: main_window_id});
                        if (current_tab?.id !== this_tab.id) {
                            await chrome.tabs.update(this_tab.id, {active: true});
                        }
                    }
                } catch (e) {
                    log(`unable to focus tab in main window: ${e}`);
                }
            });
        }, 1);
    }
);

log("loaded OneWindow");

// Gather tabs from other windows into the main window when extension is loaded/enabled
(async () => {
    log("gather windows at init");
    try {
        const current_window = await chrome.windows.getLastFocused();
        await gather_tabs(current_window.id);
    } catch (e) {
        log(`unable to gather windows at init: ${e}`);
    }
})();
