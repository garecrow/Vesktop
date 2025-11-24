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

function getOverlayUrl() {
    const branch = Settings.store.discordBranch;
    const subdomain = branch === "canary" || branch === "ptb" ? `${branch}.` : "";

    return `https://${subdomain}discord.com/app`;
}

function buildOverlayOptions(): BrowserWindowConstructorOptions {
    const primaryDisplay = screen.getPrimaryDisplay();
    const width = Math.min(primaryDisplay.workAreaSize.width, 1280);
    const height = Math.min(primaryDisplay.workAreaSize.height, 720);

    return {
        width,
        height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        show: false,
        skipTaskbar: true,
        resizable: true,
        hasShadow: false,
        backgroundColor: "#00000000",
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

function createOverlayWindow() {
    if (overlayWin) return overlayWin;

    overlayWin = new BrowserWindow(buildOverlayOptions());
    overlayWin.webContents.setUserAgent(BrowserUserAgent);
    overlayWin.setMenuBarVisibility(false);
    overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWin.loadURL(getOverlayUrl());

    overlayWin.on("closed", () => {
        overlayWin = undefined;
    });

    return overlayWin;
}

export function showOverlayWindow() {
    const win = overlayWin ?? createOverlayWindow();
    win.showInactive();
    win.focus();
    return win;
}

export function hideOverlayWindow() {
    overlayWin?.hide();
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
}
