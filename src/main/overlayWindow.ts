/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, BrowserWindow, BrowserWindowConstructorOptions, globalShortcut, screen } from "electron";
import { join } from "path";

import { BrowserUserAgent } from "./constants";
import { Settings } from "./settings";

const OVERLAY_HOTKEY = "CommandOrControl+Shift+O";

let overlayWin: BrowserWindow | undefined;
const syncToPrimaryDisplay = () => overlayWin && syncOverlayBounds(overlayWin);

function getOverlayUrl() {
    const branch = Settings.store.discordBranch;
    const subdomain = branch === "canary" || branch === "ptb" ? `${branch}.` : "";

    return `https://${subdomain}discord.com/overlay`;
}

function buildOverlayOptions(): BrowserWindowConstructorOptions {
    const { bounds } = screen.getPrimaryDisplay();

    return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        fullscreenable: false,
        maximizable: false,
        minimizable: false,
        movable: false,
        resizable: false,
        enableLargerThanScreen: true,
        focusable: true,
        show: false,
        skipTaskbar: true,
        hasShadow: false,
        backgroundColor: "#00000000",
        type: "toolbar",
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            backgroundThrottling: false,
            devTools: true,
            nodeIntegration: false,
            sandbox: false
        }
    };
}

function syncOverlayBounds(win: BrowserWindow) {
    const { bounds } = screen.getPrimaryDisplay();

    win.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
    });
}

function createOverlayWindow() {
    if (overlayWin) return overlayWin;

    overlayWin = new BrowserWindow(buildOverlayOptions());
    overlayWin.setAlwaysOnTop(true, "screen-saver");
    overlayWin.webContents.setUserAgent(BrowserUserAgent);
    overlayWin.setMenuBarVisibility(false);
    overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWin.setIgnoreMouseEvents(true, { forward: true });
    overlayWin.loadURL(getOverlayUrl());

    screen.on("display-metrics-changed", syncToPrimaryDisplay);
    screen.on("display-added", syncToPrimaryDisplay);
    screen.on("display-removed", syncToPrimaryDisplay);

    overlayWin.on("closed", () => {
        overlayWin = undefined;
    });

    return overlayWin;
}

export function showOverlayWindow() {
    const win = overlayWin ?? createOverlayWindow();
    syncOverlayBounds(win);
    win.setIgnoreMouseEvents(false);
    win.showInactive();
    win.focus();
    return win;
}

export function hideOverlayWindow() {
    if (!overlayWin) return;

    overlayWin.hide();
    overlayWin.setIgnoreMouseEvents(true, { forward: true });
}

export function toggleOverlayWindow() {
    if (overlayWin?.isVisible()) {
        hideOverlayWindow();
        return false;
    }

    showOverlayWindow();
    return true;
}

export function registerOverlayShortcuts() {
    if (process.platform !== "linux") return;

    app.whenReady().then(() => {
        globalShortcut.register(OVERLAY_HOTKEY, toggleOverlayWindow);
    });

    app.on("will-quit", () => {
        globalShortcut.unregister(OVERLAY_HOTKEY);
    });
}

export function destroyOverlayWindow() {
    if (!overlayWin) return;

    overlayWin.destroy();
    overlayWin = undefined;

    screen.off("display-metrics-changed", syncToPrimaryDisplay);
    screen.off("display-added", syncToPrimaryDisplay);
    screen.off("display-removed", syncToPrimaryDisplay);
}
