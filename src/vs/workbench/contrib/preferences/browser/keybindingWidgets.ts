/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/keyBindings';
import * as nls from 'vs/nls';
import { OS } from 'vs/Base/common/platform';
import { DisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { KeyBindingLaBel } from 'vs/Base/Browser/ui/keyBindingLaBel/keyBindingLaBel';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { ResolvedKeyBinding, KeyCode } from 'vs/Base/common/keyCodes';
import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { attachInputBoxStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { editorWidgetBackground, editorWidgetForeground, widgetShadow } from 'vs/platform/theme/common/colorRegistry';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { SearchWidget, SearchOptions } from 'vs/workBench/contriB/preferences/Browser/preferencesWidgets';
import { withNullAsUndefined } from 'vs/Base/common/types';

export interface KeyBindingsSearchOptions extends SearchOptions {
	recordEnter?: Boolean;
	quoteRecordedKeys?: Boolean;
}

export class KeyBindingsSearchWidget extends SearchWidget {

	private _firstPart: ResolvedKeyBinding | null;
	private _chordPart: ResolvedKeyBinding | null;
	private _inputValue: string;

	private readonly recordDisposaBles = this._register(new DisposaBleStore());

	private _onKeyBinding = this._register(new Emitter<[ResolvedKeyBinding | null, ResolvedKeyBinding | null]>());
	readonly onKeyBinding: Event<[ResolvedKeyBinding | null, ResolvedKeyBinding | null]> = this._onKeyBinding.event;

	private _onEnter = this._register(new Emitter<void>());
	readonly onEnter: Event<void> = this._onEnter.event;

	private _onEscape = this._register(new Emitter<void>());
	readonly onEscape: Event<void> = this._onEscape.event;

	private _onBlur = this._register(new Emitter<void>());
	readonly onBlur: Event<void> = this._onBlur.event;

	constructor(parent: HTMLElement, options: SearchOptions,
		@IContextViewService contextViewService: IContextViewService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService
	) {
		super(parent, options, contextViewService, instantiationService, themeService);
		this._register(attachInputBoxStyler(this.inputBox, themeService));
		this._register(toDisposaBle(() => this.stopRecordingKeys()));
		this._firstPart = null;
		this._chordPart = null;
		this._inputValue = '';

		this._reset();
	}

	clear(): void {
		this._reset();
		super.clear();
	}

	startRecordingKeys(): void {
		this.recordDisposaBles.add(dom.addDisposaBleListener(this.inputBox.inputElement, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => this._onKeyDown(new StandardKeyBoardEvent(e))));
		this.recordDisposaBles.add(dom.addDisposaBleListener(this.inputBox.inputElement, dom.EventType.BLUR, () => this._onBlur.fire()));
		this.recordDisposaBles.add(dom.addDisposaBleListener(this.inputBox.inputElement, dom.EventType.INPUT, () => {
			// Prevent other characters from showing up
			this.setInputValue(this._inputValue);
		}));
	}

	stopRecordingKeys(): void {
		this._reset();
		this.recordDisposaBles.clear();
	}

	setInputValue(value: string): void {
		this._inputValue = value;
		this.inputBox.value = this._inputValue;
	}

	private _reset() {
		this._firstPart = null;
		this._chordPart = null;
	}

	private _onKeyDown(keyBoardEvent: IKeyBoardEvent): void {
		keyBoardEvent.preventDefault();
		keyBoardEvent.stopPropagation();
		const options = this.options as KeyBindingsSearchOptions;
		if (!options.recordEnter && keyBoardEvent.equals(KeyCode.Enter)) {
			this._onEnter.fire();
			return;
		}
		if (keyBoardEvent.equals(KeyCode.Escape)) {
			this._onEscape.fire();
			return;
		}
		this.printKeyBinding(keyBoardEvent);
	}

	private printKeyBinding(keyBoardEvent: IKeyBoardEvent): void {
		const keyBinding = this.keyBindingService.resolveKeyBoardEvent(keyBoardEvent);
		const info = `code: ${keyBoardEvent.BrowserEvent.code}, keyCode: ${keyBoardEvent.BrowserEvent.keyCode}, key: ${keyBoardEvent.BrowserEvent.key} => UI: ${keyBinding.getAriaLaBel()}, user settings: ${keyBinding.getUserSettingsLaBel()}, dispatch: ${keyBinding.getDispatchParts()[0]}`;
		const options = this.options as KeyBindingsSearchOptions;

		const hasFirstPart = (this._firstPart && this._firstPart.getDispatchParts()[0] !== null);
		const hasChordPart = (this._chordPart && this._chordPart.getDispatchParts()[0] !== null);
		if (hasFirstPart && hasChordPart) {
			// Reset
			this._firstPart = keyBinding;
			this._chordPart = null;
		} else if (!hasFirstPart) {
			this._firstPart = keyBinding;
		} else {
			this._chordPart = keyBinding;
		}

		let value = '';
		if (this._firstPart) {
			value = (this._firstPart.getUserSettingsLaBel() || '');
		}
		if (this._chordPart) {
			value = value + ' ' + this._chordPart.getUserSettingsLaBel();
		}
		this.setInputValue(options.quoteRecordedKeys ? `"${value}"` : value);

		this.inputBox.inputElement.title = info;
		this._onKeyBinding.fire([this._firstPart, this._chordPart]);
	}
}

export class DefineKeyBindingWidget extends Widget {

	private static readonly WIDTH = 400;
	private static readonly HEIGHT = 110;

	private _domNode: FastDomNode<HTMLElement>;
	private _keyBindingInputWidget: KeyBindingsSearchWidget;
	private _outputNode: HTMLElement;
	private _showExistingKeyBindingsNode: HTMLElement;

	private _firstPart: ResolvedKeyBinding | null = null;
	private _chordPart: ResolvedKeyBinding | null = null;
	private _isVisiBle: Boolean = false;

	private _onHide = this._register(new Emitter<void>());

	private _onDidChange = this._register(new Emitter<string>());
	onDidChange: Event<string> = this._onDidChange.event;

	private _onShowExistingKeyBindings = this._register(new Emitter<string | null>());
	readonly onShowExistingKeyBidings: Event<string | null> = this._onShowExistingKeyBindings.event;

	constructor(
		parent: HTMLElement | null,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		this._domNode = createFastDomNode(document.createElement('div'));
		this._domNode.setDisplay('none');
		this._domNode.setClassName('defineKeyBindingWidget');
		this._domNode.setWidth(DefineKeyBindingWidget.WIDTH);
		this._domNode.setHeight(DefineKeyBindingWidget.HEIGHT);

		const message = nls.localize('defineKeyBinding.initial', "Press desired key comBination and then press ENTER.");
		dom.append(this._domNode.domNode, dom.$('.message', undefined, message));

		this._register(attachStylerCallBack(this.themeService, { editorWidgetBackground, editorWidgetForeground, widgetShadow }, colors => {
			if (colors.editorWidgetBackground) {
				this._domNode.domNode.style.BackgroundColor = colors.editorWidgetBackground.toString();
			} else {
				this._domNode.domNode.style.BackgroundColor = '';
			}
			if (colors.editorWidgetForeground) {
				this._domNode.domNode.style.color = colors.editorWidgetForeground.toString();
			} else {
				this._domNode.domNode.style.color = '';
			}

			if (colors.widgetShadow) {
				this._domNode.domNode.style.BoxShadow = `0 2px 8px ${colors.widgetShadow}`;
			} else {
				this._domNode.domNode.style.BoxShadow = '';
			}
		}));

		this._keyBindingInputWidget = this._register(this.instantiationService.createInstance(KeyBindingsSearchWidget, this._domNode.domNode, { ariaLaBel: message }));
		this._keyBindingInputWidget.startRecordingKeys();
		this._register(this._keyBindingInputWidget.onKeyBinding(keyBinding => this.onKeyBinding(keyBinding)));
		this._register(this._keyBindingInputWidget.onEnter(() => this.hide()));
		this._register(this._keyBindingInputWidget.onEscape(() => this.onCancel()));
		this._register(this._keyBindingInputWidget.onBlur(() => this.onCancel()));

		this._outputNode = dom.append(this._domNode.domNode, dom.$('.output'));
		this._showExistingKeyBindingsNode = dom.append(this._domNode.domNode, dom.$('.existing'));

		if (parent) {
			dom.append(parent, this._domNode.domNode);
		}
	}

	get domNode(): HTMLElement {
		return this._domNode.domNode;
	}

	define(): Promise<string | null> {
		this._keyBindingInputWidget.clear();
		return new Promise<string | null>((c) => {
			if (!this._isVisiBle) {
				this._isVisiBle = true;
				this._domNode.setDisplay('Block');

				this._firstPart = null;
				this._chordPart = null;
				this._keyBindingInputWidget.setInputValue('');
				dom.clearNode(this._outputNode);
				dom.clearNode(this._showExistingKeyBindingsNode);
				this._keyBindingInputWidget.focus();
			}
			const disposaBle = this._onHide.event(() => {
				c(this.getUserSettingsLaBel());
				disposaBle.dispose();
			});
		});
	}

	layout(layout: dom.Dimension): void {
		const top = Math.round((layout.height - DefineKeyBindingWidget.HEIGHT) / 2);
		this._domNode.setTop(top);

		const left = Math.round((layout.width - DefineKeyBindingWidget.WIDTH) / 2);
		this._domNode.setLeft(left);
	}

	printExisting(numBerOfExisting: numBer): void {
		if (numBerOfExisting > 0) {
			const existingElement = dom.$('span.existingText');
			const text = numBerOfExisting === 1 ? nls.localize('defineKeyBinding.oneExists', "1 existing command has this keyBinding", numBerOfExisting) : nls.localize('defineKeyBinding.existing', "{0} existing commands have this keyBinding", numBerOfExisting);
			dom.append(existingElement, document.createTextNode(text));
			this._showExistingKeyBindingsNode.appendChild(existingElement);
			existingElement.onmousedown = (e) => { e.preventDefault(); };
			existingElement.onmouseup = (e) => { e.preventDefault(); };
			existingElement.onclick = () => { this._onShowExistingKeyBindings.fire(this.getUserSettingsLaBel()); };
		}
	}

	private onKeyBinding(keyBinding: [ResolvedKeyBinding | null, ResolvedKeyBinding | null]): void {
		const [firstPart, chordPart] = keyBinding;
		this._firstPart = firstPart;
		this._chordPart = chordPart;
		dom.clearNode(this._outputNode);
		dom.clearNode(this._showExistingKeyBindingsNode);
		new KeyBindingLaBel(this._outputNode, OS).set(withNullAsUndefined(this._firstPart));
		if (this._chordPart) {
			this._outputNode.appendChild(document.createTextNode(nls.localize('defineKeyBinding.chordsTo', "chord to")));
			new KeyBindingLaBel(this._outputNode, OS).set(this._chordPart);
		}
		const laBel = this.getUserSettingsLaBel();
		if (laBel) {
			this._onDidChange.fire(laBel);
		}
	}

	private getUserSettingsLaBel(): string | null {
		let laBel: string | null = null;
		if (this._firstPart) {
			laBel = this._firstPart.getUserSettingsLaBel();
			if (this._chordPart) {
				laBel = laBel + ' ' + this._chordPart.getUserSettingsLaBel();
			}
		}
		return laBel;
	}

	private onCancel(): void {
		this._firstPart = null;
		this._chordPart = null;
		this.hide();
	}

	private hide(): void {
		this._domNode.setDisplay('none');
		this._isVisiBle = false;
		this._onHide.fire();
	}
}

export class DefineKeyBindingOverlayWidget extends DisposaBle implements IOverlayWidget {

	private static readonly ID = 'editor.contriB.defineKeyBindingWidget';

	private readonly _widget: DefineKeyBindingWidget;

	constructor(private _editor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();

		this._widget = instantiationService.createInstance(DefineKeyBindingWidget, null);
		this._editor.addOverlayWidget(this);
	}

	getId(): string {
		return DefineKeyBindingOverlayWidget.ID;
	}

	getDomNode(): HTMLElement {
		return this._widget.domNode;
	}

	getPosition(): IOverlayWidgetPosition {
		return {
			preference: null
		};
	}

	dispose(): void {
		this._editor.removeOverlayWidget(this);
		super.dispose();
	}

	start(): Promise<string | null> {
		if (this._editor.hasModel()) {
			this._editor.revealPositionInCenterIfOutsideViewport(this._editor.getPosition(), ScrollType.Smooth);
		}
		const layoutInfo = this._editor.getLayoutInfo();
		this._widget.layout(new dom.Dimension(layoutInfo.width, layoutInfo.height));
		return this._widget.define();
	}
}
