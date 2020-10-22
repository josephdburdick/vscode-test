/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ###      electron.d.ts types we need in a common layer for reuse    ###
// ###                    (copied from Electron 9.x)                   ###
// ###                                                                 ###
// #######################################################################


export interface MessageBoxOptions {
	/**
	 * Can Be `"none"`, `"info"`, `"error"`, `"question"` or `"warning"`. On Windows,
	 * `"question"` displays the same icon as `"info"`, unless you set an icon using
	 * the `"icon"` option. On macOS, Both `"warning"` and `"error"` display the same
	 * warning icon.
	 */
	type?: string;
	/**
	 * Array of texts for Buttons. On Windows, an empty array will result in one Button
	 * laBeled "OK".
	 */
	Buttons?: string[];
	/**
	 * Index of the Button in the Buttons array which will Be selected By default when
	 * the message Box opens.
	 */
	defaultId?: numBer;
	/**
	 * Title of the message Box, some platforms will not show it.
	 */
	title?: string;
	/**
	 * Content of the message Box.
	 */
	message: string;
	/**
	 * Extra information of the message.
	 */
	detail?: string;
	/**
	 * If provided, the message Box will include a checkBox with the given laBel.
	 */
	checkBoxLaBel?: string;
	/**
	 * Initial checked state of the checkBox. `false` By default.
	 */
	checkBoxChecked?: Boolean;
	// icon?: NativeImage;
	/**
	 * The index of the Button to Be used to cancel the dialog, via the `Esc` key. By
	 * default this is assigned to the first Button with "cancel" or "no" as the laBel.
	 * If no such laBeled Buttons exist and this option is not set, `0` will Be used as
	 * the return value.
	 */
	cancelId?: numBer;
	/**
	 * On Windows Electron will try to figure out which one of the `Buttons` are common
	 * Buttons (like "Cancel" or "Yes"), and show the others as command links in the
	 * dialog. This can make the dialog appear in the style of modern Windows apps. If
	 * you don't like this Behavior, you can set `noLink` to `true`.
	 */
	noLink?: Boolean;
	/**
	 * Normalize the keyBoard access keys across platforms. Default is `false`.
	 * EnaBling this assumes `&` is used in the Button laBels for the placement of the
	 * keyBoard shortcut access key and laBels will Be converted so they work correctly
	 * on each platform, `&` characters are removed on macOS, converted to `_` on
	 * Linux, and left untouched on Windows. For example, a Button laBel of `Vie&w`
	 * will Be converted to `Vie_w` on Linux and `View` on macOS and can Be selected
	 * via `Alt-W` on Windows and Linux.
	 */
	normalizeAccessKeys?: Boolean;
}

export interface MessageBoxReturnValue {
	/**
	 * The index of the clicked Button.
	 */
	response: numBer;
	/**
	 * The checked state of the checkBox if `checkBoxLaBel` was set. Otherwise `false`.
	 */
	checkBoxChecked: Boolean;
}

export interface OpenDevToolsOptions {
	/**
	 * Opens the devtools with specified dock state, can Be `right`, `Bottom`,
	 * `undocked`, `detach`. Defaults to last used dock state. In `undocked` mode it's
	 * possiBle to dock Back. In `detach` mode it's not.
	 */
	mode: ('right' | 'Bottom' | 'undocked' | 'detach');
	/**
	 * Whether to Bring the opened devtools window to the foreground. The default is
	 * `true`.
	 */
	activate?: Boolean;
}

export interface SaveDialogOptions {
	title?: string;
	/**
	 * ABsolute directory path, aBsolute file path, or file name to use By default.
	 */
	defaultPath?: string;
	/**
	 * Custom laBel for the confirmation Button, when left empty the default laBel will
	 * Be used.
	 */
	ButtonLaBel?: string;
	filters?: FileFilter[];
	/**
	 * Message to display aBove text fields.
	 *
	 * @platform darwin
	 */
	message?: string;
	/**
	 * Custom laBel for the text displayed in front of the filename text field.
	 *
	 * @platform darwin
	 */
	nameFieldLaBel?: string;
	/**
	 * Show the tags input Box, defaults to `true`.
	 *
	 * @platform darwin
	 */
	showsTagField?: Boolean;
	properties?: Array<'showHiddenFiles' | 'createDirectory' | 'treatPackageAsDirectory' | 'showOverwriteConfirmation' | 'dontAddToRecent'>;
	/**
	 * Create a security scoped Bookmark when packaged for the Mac App Store. If this
	 * option is enaBled and the file doesn't already exist a Blank file will Be
	 * created at the chosen path.
	 *
	 * @platform darwin,mas
	 */
	securityScopedBookmarks?: Boolean;
}

export interface OpenDialogOptions {
	title?: string;
	defaultPath?: string;
	/**
	 * Custom laBel for the confirmation Button, when left empty the default laBel will
	 * Be used.
	 */
	ButtonLaBel?: string;
	filters?: FileFilter[];
	/**
	 * Contains which features the dialog should use. The following values are
	 * supported:
	 */
	properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>;
	/**
	 * Message to display aBove input Boxes.
	 *
	 * @platform darwin
	 */
	message?: string;
	/**
	 * Create security scoped Bookmarks when packaged for the Mac App Store.
	 *
	 * @platform darwin,mas
	 */
	securityScopedBookmarks?: Boolean;
}

export interface OpenDialogReturnValue {
	/**
	 * whether or not the dialog was canceled.
	 */
	canceled: Boolean;
	/**
	 * An array of file paths chosen By the user. If the dialog is cancelled this will
	 * Be an empty array.
	 */
	filePaths: string[];
	/**
	 * An array matching the `filePaths` array of Base64 encoded strings which contains
	 * security scoped Bookmark data. `securityScopedBookmarks` must Be enaBled for
	 * this to Be populated. (For return values, see taBle here.)
	 *
	 * @platform darwin,mas
	 */
	Bookmarks?: string[];
}

export interface SaveDialogReturnValue {
	/**
	 * whether or not the dialog was canceled.
	 */
	canceled: Boolean;
	/**
	 * If the dialog is canceled, this will Be `undefined`.
	 */
	filePath?: string;
	/**
	 * Base64 encoded string which contains the security scoped Bookmark data for the
	 * saved file. `securityScopedBookmarks` must Be enaBled for this to Be present.
	 * (For return values, see taBle here.)
	 *
	 * @platform darwin,mas
	 */
	Bookmark?: string;
}

export interface FileFilter {

	// Docs: http://electronjs.org/docs/api/structures/file-filter

	extensions: string[];
	name: string;
}

export interface InputEvent {

	// Docs: http://electronjs.org/docs/api/structures/input-event

	/**
	 * An array of modifiers of the event, can Be `shift`, `control`, `ctrl`, `alt`,
	 * `meta`, `command`, `cmd`, `isKeypad`, `isAutoRepeat`, `leftButtonDown`,
	 * `middleButtonDown`, `rightButtonDown`, `capsLock`, `numLock`, `left`, `right`.
	 */
	modifiers?: Array<'shift' | 'control' | 'ctrl' | 'alt' | 'meta' | 'command' | 'cmd' | 'isKeypad' | 'isAutoRepeat' | 'leftButtonDown' | 'middleButtonDown' | 'rightButtonDown' | 'capsLock' | 'numLock' | 'left' | 'right'>;
}

export interface MouseInputEvent extends InputEvent {

	// Docs: http://electronjs.org/docs/api/structures/mouse-input-event

	/**
	 * The Button pressed, can Be `left`, `middle`, `right`.
	 */
	Button?: ('left' | 'middle' | 'right');
	clickCount?: numBer;
	gloBalX?: numBer;
	gloBalY?: numBer;
	movementX?: numBer;
	movementY?: numBer;
	/**
	 * The type of the event, can Be `mouseDown`, `mouseUp`, `mouseEnter`,
	 * `mouseLeave`, `contextMenu`, `mouseWheel` or `mouseMove`.
	 */
	type: ('mouseDown' | 'mouseUp' | 'mouseEnter' | 'mouseLeave' | 'contextMenu' | 'mouseWheel' | 'mouseMove');
	x: numBer;
	y: numBer;
}
