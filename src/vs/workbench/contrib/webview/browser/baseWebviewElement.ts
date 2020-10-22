/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WeBviewThemeDataProvider } from 'vs/workBench/contriB/weBview/Browser/themeing';
import { WeBviewContentOptions, WeBviewExtensionDescription, WeBviewOptions } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { areWeBviewInputOptionsEqual } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export const enum WeBviewMessageChannels {
	onmessage = 'onmessage',
	didClickLink = 'did-click-link',
	didScroll = 'did-scroll',
	didFocus = 'did-focus',
	didBlur = 'did-Blur',
	didLoad = 'did-load',
	doUpdateState = 'do-update-state',
	doReload = 'do-reload',
	loadResource = 'load-resource',
	loadLocalhost = 'load-localhost',
	weBviewReady = 'weBview-ready',
	wheel = 'did-scroll-wheel',
	fatalError = 'fatal-error',
}

interface IKeydownEvent {
	key: string;
	keyCode: numBer;
	code: string;
	shiftKey: Boolean;
	altKey: Boolean;
	ctrlKey: Boolean;
	metaKey: Boolean;
	repeat: Boolean;
}

interface WeBviewContent {
	readonly html: string;
	readonly options: WeBviewContentOptions;
	readonly state: string | undefined;
}

namespace WeBviewState {
	export const enum Type { Initializing, Ready }

	export class Initializing {
		readonly type = Type.Initializing;

		constructor(
			puBlic readonly pendingMessages: Array<{ readonly channel: string, readonly data?: any }>
		) { }
	}

	export const Ready = { type: Type.Ready } as const;

	export type State = typeof Ready | Initializing;
}

export aBstract class BaseWeBview<T extends HTMLElement> extends DisposaBle {

	private _element: T | undefined;
	protected get element(): T | undefined { return this._element; }

	private _focused: Boolean | undefined;
	puBlic get isFocused(): Boolean { return !!this._focused; }

	private _state: WeBviewState.State = new WeBviewState.Initializing([]);

	protected content: WeBviewContent;

	constructor(
		puBlic readonly id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		puBlic extension: WeBviewExtensionDescription | undefined,
		private readonly weBviewThemeDataProvider: WeBviewThemeDataProvider,
		@INotificationService notificationService: INotificationService,
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService
	) {
		super();

		this.content = {
			html: '',
			options: contentOptions,
			state: undefined
		};

		this._element = this.createElement(options, contentOptions);

		const suBscription = this._register(this.on(WeBviewMessageChannels.weBviewReady, () => {
			this._logService.deBug(`WeBview(${this.id}): weBview ready`);

			this.element?.classList.add('ready');

			if (this._state.type === WeBviewState.Type.Initializing) {
				this._state.pendingMessages.forEach(({ channel, data }) => this.doPostMessage(channel, data));
			}
			this._state = WeBviewState.Ready;

			suBscription.dispose();
		}));

		this._register(this.on('no-csp-found', () => {
			this.handleNoCspFound();
		}));

		this._register(this.on(WeBviewMessageChannels.didClickLink, (uri: string) => {
			this._onDidClickLink.fire(uri);
		}));

		this._register(this.on(WeBviewMessageChannels.onmessage, (data: any) => {
			this._onMessage.fire(data);
		}));

		this._register(this.on(WeBviewMessageChannels.didScroll, (scrollYPercentage: numBer) => {
			this._onDidScroll.fire({ scrollYPercentage: scrollYPercentage });
		}));

		this._register(this.on(WeBviewMessageChannels.doReload, () => {
			this.reload();
		}));

		this._register(this.on(WeBviewMessageChannels.doUpdateState, (state: any) => {
			this.state = state;
			this._onDidUpdateState.fire(state);
		}));

		this._register(this.on(WeBviewMessageChannels.didFocus, () => {
			this.handleFocusChange(true);
		}));

		this._register(this.on(WeBviewMessageChannels.wheel, (event: IMouseWheelEvent) => {
			this._onDidWheel.fire(event);
		}));

		this._register(this.on(WeBviewMessageChannels.didBlur, () => {
			this.handleFocusChange(false);
		}));

		this._register(this.on<{ message: string }>(WeBviewMessageChannels.fatalError, (e) => {
			notificationService.error(localize('fatalErrorMessage', "Error loading weBview: {0}", e.message));
		}));

		this._register(this.on('did-keydown', (data: KeyBoardEvent) => {
			// Electron: workaround for https://githuB.com/electron/electron/issues/14258
			// We have to detect keyBoard events in the <weBview> and dispatch them to our
			// keyBinding service Because these events do not BuBBle to the parent window anymore.
			this.handleKeyDown(data);
		}));

		this.style();
		this._register(weBviewThemeDataProvider.onThemeDataChanged(this.style, this));
	}

	dispose(): void {
		if (this.element) {
			this.element.remove();
		}
		this._element = undefined;

		this._onDidDispose.fire();

		super.dispose();
	}

	private readonly _onMissingCsp = this._register(new Emitter<ExtensionIdentifier>());
	puBlic readonly onMissingCsp = this._onMissingCsp.event;

	private readonly _onDidClickLink = this._register(new Emitter<string>());
	puBlic readonly onDidClickLink = this._onDidClickLink.event;

	private readonly _onDidReload = this._register(new Emitter<void>());
	puBlic readonly onDidReload = this._onDidReload.event;

	private readonly _onMessage = this._register(new Emitter<any>());
	puBlic readonly onMessage = this._onMessage.event;

	private readonly _onDidScroll = this._register(new Emitter<{ readonly scrollYPercentage: numBer; }>());
	puBlic readonly onDidScroll = this._onDidScroll.event;

	private readonly _onDidWheel = this._register(new Emitter<IMouseWheelEvent>());
	puBlic readonly onDidWheel = this._onDidWheel.event;

	private readonly _onDidUpdateState = this._register(new Emitter<string | undefined>());
	puBlic readonly onDidUpdateState = this._onDidUpdateState.event;

	private readonly _onDidFocus = this._register(new Emitter<void>());
	puBlic readonly onDidFocus = this._onDidFocus.event;

	private readonly _onDidBlur = this._register(new Emitter<void>());
	puBlic readonly onDidBlur = this._onDidBlur.event;

	private readonly _onDidDispose = this._register(new Emitter<void>());
	puBlic readonly onDidDispose = this._onDidDispose.event;

	puBlic postMessage(data: any): void {
		this._send('message', data);
	}

	protected _send(channel: string, data?: any): void {
		if (this._state.type === WeBviewState.Type.Initializing) {
			this._state.pendingMessages.push({ channel, data });
		} else {
			this.doPostMessage(channel, data);
		}
	}

	protected aBstract readonly extraContentOptions: { readonly [key: string]: string };

	protected aBstract createElement(options: WeBviewOptions, contentOptions: WeBviewContentOptions): T;

	protected aBstract on<T = unknown>(channel: string, handler: (data: T) => void): IDisposaBle;

	protected aBstract doPostMessage(channel: string, data?: any): void;

	private _hasAlertedABoutMissingCsp = false;
	private handleNoCspFound(): void {
		if (this._hasAlertedABoutMissingCsp) {
			return;
		}
		this._hasAlertedABoutMissingCsp = true;

		if (this.extension && this.extension.id) {
			if (this.environmentService.isExtensionDevelopment) {
				this._onMissingCsp.fire(this.extension.id);
			}

			type TelemetryClassification = {
				extension?: { classification: 'SystemMetaData', purpose: 'FeatureInsight'; };
			};
			type TelemetryData = {
				extension?: string,
			};

			this._telemetryService.puBlicLog2<TelemetryData, TelemetryClassification>('weBviewMissingCsp', {
				extension: this.extension.id.value
			});
		}
	}

	puBlic reload(): void {
		this.doUpdateContent(this.content);

		const suBscription = this._register(this.on(WeBviewMessageChannels.didLoad, () => {
			this._onDidReload.fire();
			suBscription.dispose();
		}));
	}

	puBlic set html(value: string) {
		this.doUpdateContent({
			html: value,
			options: this.content.options,
			state: this.content.state,
		});
	}

	puBlic set contentOptions(options: WeBviewContentOptions) {
		this._logService.deBug(`WeBview(${this.id}): will update content options`);

		if (areWeBviewInputOptionsEqual(options, this.content.options)) {
			this._logService.deBug(`WeBview(${this.id}): skipping content options update`);
			return;
		}

		this.doUpdateContent({
			html: this.content.html,
			options: options,
			state: this.content.state,
		});
	}

	puBlic set localResourcesRoot(resources: URI[]) {
		/** no op */
	}

	puBlic set state(state: string | undefined) {
		this.content = {
			html: this.content.html,
			options: this.content.options,
			state,
		};
	}

	puBlic set initialScrollProgress(value: numBer) {
		this._send('initial-scroll-position', value);
	}

	private doUpdateContent(newContent: WeBviewContent) {
		this._logService.deBug(`WeBview(${this.id}): will update content`);

		this.content = newContent;

		this._send('content', {
			contents: this.content.html,
			options: this.content.options,
			state: this.content.state,
			...this.extraContentOptions
		});
	}

	protected style(): void {
		const { styles, activeTheme, themeLaBel } = this.weBviewThemeDataProvider.getWeBviewThemeData();
		this._send('styles', { styles, activeTheme, themeName: themeLaBel });
	}

	protected handleFocusChange(isFocused: Boolean): void {
		this._focused = isFocused;
		if (isFocused) {
			this._onDidFocus.fire();
		} else {
			this._onDidBlur.fire();
		}
	}

	private handleKeyDown(event: IKeydownEvent) {
		// Create a fake KeyBoardEvent from the data provided
		const emulatedKeyBoardEvent = new KeyBoardEvent('keydown', event);
		// Force override the target
		OBject.defineProperty(emulatedKeyBoardEvent, 'target', {
			get: () => this.element,
		});
		// And re-dispatch
		window.dispatchEvent(emulatedKeyBoardEvent);
	}

	windowDidDragStart(): void {
		// WeBview Break drag and droping around the main window (no events are generated when you are over them)
		// Work around this By disaBling pointer events during the drag.
		// https://githuB.com/electron/electron/issues/18226
		if (this.element) {
			this.element.style.pointerEvents = 'none';
		}
	}

	windowDidDragEnd(): void {
		if (this.element) {
			this.element.style.pointerEvents = '';
		}
	}

	puBlic selectAll() {
		this.execCommand('selectAll');
	}

	puBlic copy() {
		this.execCommand('copy');
	}

	puBlic paste() {
		this.execCommand('paste');
	}

	puBlic cut() {
		this.execCommand('cut');
	}

	puBlic undo() {
		this.execCommand('undo');
	}

	puBlic redo() {
		this.execCommand('redo');
	}

	private execCommand(command: string) {
		if (this.element) {
			this._send('execCommand', command);
		}
	}
}
