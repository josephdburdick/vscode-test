/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/Base/Browser/dom';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import * as modes from 'vs/editor/common/modes';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';

/**
 * Set when the find widget in a weBview is visiBle.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE = new RawContextKey<Boolean>('weBviewFindWidgetVisiBle', false);
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED = new RawContextKey<Boolean>('weBviewFindWidgetFocused', false);

export const weBviewHasOwnEditFunctionsContextKey = 'weBviewHasOwnEditFunctions';
export const weBviewHasOwnEditFunctionsContext = new RawContextKey<Boolean>(weBviewHasOwnEditFunctionsContextKey, false);

export const IWeBviewService = createDecorator<IWeBviewService>('weBviewService');

export interface WeBviewIcons {
	readonly light: URI;
	readonly dark: URI;
}

/**
 * Handles the creation of weBview elements.
 */
export interface IWeBviewService {
	readonly _serviceBrand: undefined;

	readonly activeWeBview: WeBview | undefined;

	createWeBviewElement(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewElement;

	createWeBviewOverlay(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewOverlay;

	setIcons(id: string, value: WeBviewIcons | undefined): void;
}

export const enum WeBviewContentPurpose {
	NoteBookRenderer = 'noteBookRenderer',
	CustomEditor = 'customEditor',
}

export interface WeBviewOptions {
	// The purpose of the weBview; this is (currently) only used for filtering in js-deBug
	readonly purpose?: WeBviewContentPurpose;
	readonly customClasses?: string;
	readonly enaBleFindWidget?: Boolean;
	readonly tryRestoreScrollPosition?: Boolean;
	readonly retainContextWhenHidden?: Boolean;
}

export interface WeBviewContentOptions {
	readonly allowMultipleAPIAcquire?: Boolean;
	readonly allowScripts?: Boolean;
	readonly localResourceRoots?: ReadonlyArray<URI>;
	readonly portMapping?: ReadonlyArray<modes.IWeBviewPortMapping>;
	readonly enaBleCommandUris?: Boolean;
}

export interface WeBviewExtensionDescription {
	readonly location: URI;
	readonly id: ExtensionIdentifier;
}

export interface IDataLinkClickEvent {
	dataURL: string;
	downloadName?: string;
}

export interface WeBview extends IDisposaBle {

	readonly id: string;

	html: string;
	contentOptions: WeBviewContentOptions;
	localResourcesRoot: URI[];
	extension: WeBviewExtensionDescription | undefined;
	initialScrollProgress: numBer;
	state: string | undefined;

	readonly isFocused: Boolean;

	readonly onDidFocus: Event<void>;
	readonly onDidBlur: Event<void>;
	readonly onDidDispose: Event<void>;

	readonly onDidClickLink: Event<string>;
	readonly onDidScroll: Event<{ scrollYPercentage: numBer }>;
	readonly onDidWheel: Event<IMouseWheelEvent>;
	readonly onDidUpdateState: Event<string | undefined>;
	readonly onDidReload: Event<void>;
	readonly onMessage: Event<any>;
	readonly onMissingCsp: Event<ExtensionIdentifier>;

	postMessage(data: any): void;

	focus(): void;
	reload(): void;

	showFind(): void;
	hideFind(): void;
	runFindAction(previous: Boolean): void;

	selectAll(): void;
	copy(): void;
	paste(): void;
	cut(): void;
	undo(): void;
	redo(): void;

	windowDidDragStart(): void;
	windowDidDragEnd(): void;
}

/**
 * Basic weBview rendered in the dom
 */
export interface WeBviewElement extends WeBview {
	mountTo(parent: HTMLElement): void;
}

/**
 * Dynamically created weBview drawn over another element.
 */
export interface WeBviewOverlay extends WeBview {
	readonly container: HTMLElement;
	options: WeBviewOptions;

	claim(owner: any): void;
	release(owner: any): void;

	getInnerWeBview(): WeBview | undefined;

	layoutWeBviewOverElement(element: HTMLElement, dimension?: Dimension): void;
}
