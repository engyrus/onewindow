# OneWindow

*An extension for Chromium-based browsers that forces all tabs into a single window*

I wrote this extension for use with [Kiwi Browser](https://kiwibrowser.com/), an Android Chromium-based browser that supports extensions, but it should work with any Chromium-based browser, including desktop browsers.

Chrome for Android opens links from external apps in new windows and Kiwi Browser inherited this behavior. Sometimes Kiwi doesn't show the right window, uBlock origin's element picker doesn't work right because it's looking in another window, etc. All in all, Kiwi doesn't seem too happy to support multiple windows at the moment.

Absent any chrome://flags (or native) setting to disable this feature, I wrote this extension that forces all tabs to open in a single window: one window is designated the main window, and any new tabs that are created in some other window are moved to that window.

To it install it in Kiwi:

- Download the OneWindow.crx file from Releases here
- In Kiwi, Menu > Extensions
- Click "+ (from .zip/.crx/.user.js)" button
- Choose the OneWindow.crx file you downloaded.

Reddit thread: https://www.reddit.com/r/kiwibrowser/comments/1861zpw/oc_extension_to_keep_all_your_tabs_in_one_window/
