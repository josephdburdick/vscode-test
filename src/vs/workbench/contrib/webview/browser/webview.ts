/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/bAse/browser/dom';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import * As modes from 'vs/editor/common/modes';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';

/**
 * Set when the find widget in A webview is visible.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE = new RAwContextKey<booleAn>('webviewFindWidgetVisible', fAlse);
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED = new RAwContextKey<booleAn>('webviewFindWidgetFocused', fAlse);

export const webviewHAsOwnEditFunctionsContextKey = 'webviewHAsOwnEditFunctions';
export const webviewHAsOwnEditFunctionsContext = new RAwContextKey<booleAn>(webviewHAsOwnEditFunctionsContextKey, fAlse);

export const IWebviewService = creAteDecorAtor<IWebviewService>('webviewService');

export interfAce WebviewIcons {
	reAdonly light: URI;
	reAdonly dArk: URI;
}

/**
 * HAndles the creAtion of webview elements.
 */
export interfAce IWebviewService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly ActiveWebview: Webview | undefined;

	creAteWebviewElement(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): WebviewElement;

	creAteWebviewOverlAy(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): WebviewOverlAy;

	setIcons(id: string, vAlue: WebviewIcons | undefined): void;
}

export const enum WebviewContentPurpose {
	NotebookRenderer = 'notebookRenderer',
	CustomEditor = 'customEditor',
}

export interfAce WebviewOptions {
	// The purpose of the webview; this is (currently) only used for filtering in js-debug
	reAdonly purpose?: WebviewContentPurpose;
	reAdonly customClAsses?: string;
	reAdonly enAbleFindWidget?: booleAn;
	reAdonly tryRestoreScrollPosition?: booleAn;
	reAdonly retAinContextWhenHidden?: booleAn;
}

export interfAce WebviewContentOptions {
	reAdonly AllowMultipleAPIAcquire?: booleAn;
	reAdonly AllowScripts?: booleAn;
	reAdonly locAlResourceRoots?: ReAdonlyArrAy<URI>;
	reAdonly portMApping?: ReAdonlyArrAy<modes.IWebviewPortMApping>;
	reAdonly enAbleCommAndUris?: booleAn;
}

export interfAce WebviewExtensionDescription {
	reAdonly locAtion: URI;
	reAdonly id: ExtensionIdentifier;
}

export interfAce IDAtALinkClickEvent {
	dAtAURL: string;
	downloAdNAme?: string;
}

export interfAce Webview extends IDisposAble {

	reAdonly id: string;

	html: string;
	contentOptions: WebviewContentOptions;
	locAlResourcesRoot: URI[];
	extension: WebviewExtensionDescription | undefined;
	initiAlScrollProgress: number;
	stAte: string | undefined;

	reAdonly isFocused: booleAn;

	reAdonly onDidFocus: Event<void>;
	reAdonly onDidBlur: Event<void>;
	reAdonly onDidDispose: Event<void>;

	reAdonly onDidClickLink: Event<string>;
	reAdonly onDidScroll: Event<{ scrollYPercentAge: number }>;
	reAdonly onDidWheel: Event<IMouseWheelEvent>;
	reAdonly onDidUpdAteStAte: Event<string | undefined>;
	reAdonly onDidReloAd: Event<void>;
	reAdonly onMessAge: Event<Any>;
	reAdonly onMissingCsp: Event<ExtensionIdentifier>;

	postMessAge(dAtA: Any): void;

	focus(): void;
	reloAd(): void;

	showFind(): void;
	hideFind(): void;
	runFindAction(previous: booleAn): void;

	selectAll(): void;
	copy(): void;
	pAste(): void;
	cut(): void;
	undo(): void;
	redo(): void;

	windowDidDrAgStArt(): void;
	windowDidDrAgEnd(): void;
}

/**
 * BAsic webview rendered in the dom
 */
export interfAce WebviewElement extends Webview {
	mountTo(pArent: HTMLElement): void;
}

/**
 * DynAmicAlly creAted webview drAwn over Another element.
 */
export interfAce WebviewOverlAy extends Webview {
	reAdonly contAiner: HTMLElement;
	options: WebviewOptions;

	clAim(owner: Any): void;
	releAse(owner: Any): void;

	getInnerWebview(): Webview | undefined;

	lAyoutWebviewOverElement(element: HTMLElement, dimension?: Dimension): void;
}
