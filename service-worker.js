// OneWindow - force all tabs to stay in one window
// Jerry Kindall <engyrus@gmail.com>

// Mainly for use with Kiwi Browser on Android, which recently inherited from Chrome for Android the ability
// to have multiple windows open.  When exactly this happens is unclear to me and I hate having to go close
// and combine the windows.  Also, the tools for managing windows are crappy at best at this stage.  Since
// Kiwi supports Chrome extensions I figured I'd roll my own to move tabs that open in a new window to the
// already-existing one.  There's some weirdness in this code based on occasional error messages I'd get
// about trying to move tabs while they were already being moved, which would leave windows open sometimes.
// The workaround of retrying after 100 ms when an error occurs moving tabs seems to have solved that.

// our logging function for easy commenting out
function log(msg) {
    // console.log(msg);
}

// gather tabs to the main window. if no main window is established, use window ID passed in
async function gather_tabs(a_window_id, tries, post_func) {
    tries = tries || 0;
    log(`gather tabs given window ${a_window_id}`);
    let { main_window_id } = await chrome.storage.session.get("main_window_id");
    if (main_window_id === undefined) {
        log("main window not defined");
        if (a_window_id !== undefined) {
            log(`using window ${a_window_id} as main window`);
            main_window_id = a_window_id
            await chrome.storage.session.set({ main_window_id: main_window_id });
        } else {
            log(`no main window has been set`);
        }
    }
    if (main_window_id !== undefined) {
        log(`gathering tabs from other windows to main window`);
        let index = a_window_id === main_window_id ? 0 : -1;
        for (let w of await chrome.windows.getAll()) {
            log(`looking at window ${w.id}`);
            if (w.id !== main_window_id) {
                let w_tabs = (await chrome.tabs.query({windowId: w.id})).map(t => t.id).filter(t => t !== undefined);
                log(`moving tabs ${w_tabs} to window ${main_window_id}`);
                try {
                    chrome.tabs.move(w_tabs, {index: index, windowId: main_window_id});
                } catch (e) {
                    log(`unable to gather tabs, will try again in 100ms; try ${tries}`);
                    if (tries < 5) {
                        setTimeout(() => {
                            gather_tabs(main_window_id, tries + 1)
                        }, 100, post_func);
                    }
                    return;
                }
                // try to close window we just moved windows from. 
                // usually it won't be there because it auto-closed when the last tab was moved
                try {
                    chrome.windows.remove(w.id);
                } catch { 
                    // ignore this error
                }
                if (post_func !== undefined) {
                    await post_func();
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
            chrome.storage.session.set({ main_window_id: undefined }); // don't need to await this
        }
    }
);

// When new tab is opened, gather it and all other tabs to main window
chrome.tabs.onCreated.addListener(
    async (this_tab) => {
        log("tabs.onCreated");
        const this_window_id = this_tab.windowId;
        setTimeout(() => {
            gather_tabs(this_window_id, 0, async () => {
                log(`focusing current tab in main window`);
                const current_window = await chrome.windows.getLastFocused();
                let { main_window_id } = await chrome.storage.session.get("main_window_id");
                if (main_window_id !== undefined) {
                    if (current_window.id !== this_window_id) {
                        await chrome.windows.update(current_window.id, {focused: true});
                    }
                    const current_tab = await chrome.tabs.query({active: true, windowId: main_window_id});
                    if (current_tab.id !== this_tab.id) {
                        chrome.tabs.update(this_tab.id, {active: true});    // don't need to await this
                    }
                }
            })
        }, 1);
    }
);

log("loaded OneWindow");

// Gather tabs from other windows into the main window when extension is loaded/enabled
(async () => {
    log("gather windows at init");
    const current_window = await chrome.windows.getLastFocused();
    gather_tabs(current_window.id);
})();
