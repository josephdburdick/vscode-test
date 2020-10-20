/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { Button, IButtonOptions } from 'vs/bAse/browser/ui/button/button';
import { FindInput, IFindInputOptions } from 'vs/bAse/browser/ui/findinput/findInput';
import { ReplAceInput } from 'vs/bAse/browser/ui/findinput/replAceInput';
import { IMessAge, InputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Action } from 'vs/bAse/common/Actions';
import { DelAyer } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { CONTEXT_FIND_WIDGET_NOT_VISIBLE } from 'vs/editor/contrib/find/findModel';
import * As nls from 'vs/nls';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ContextKeyExpr, IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ISeArchConfigurAtionProperties } from 'vs/workbench/services/seArch/common/seArch';
import { AttAchFindReplAceInputBoxStyler, AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ContextScopedFindInput, ContextScopedReplAceInput } from 'vs/plAtform/browser/contextScopedHistoryWidget';
import { AppendKeyBindingLAbel, isSeArchViewFocused, getSeArchView } from 'vs/workbench/contrib/seArch/browser/seArchActions';
import * As ConstAnts from 'vs/workbench/contrib/seArch/common/constAnts';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { Checkbox } from 'vs/bAse/browser/ui/checkbox/checkbox';
import { IViewsService } from 'vs/workbench/common/views';
import { seArchReplAceAllIcon, seArchHideReplAceIcon, seArchShowContextIcon, seArchShowReplAceIcon } from 'vs/workbench/contrib/seArch/browser/seArchIcons';

/** Specified in seArchview.css */
export const SingleLineInputHeight = 24;

export interfAce ISeArchWidgetOptions {
	vAlue?: string;
	replAceVAlue?: string;
	isRegex?: booleAn;
	isCAseSensitive?: booleAn;
	isWholeWords?: booleAn;
	seArchHistory?: string[];
	replAceHistory?: string[];
	preserveCAse?: booleAn;
	_hideReplAceToggle?: booleAn; // TODO: SeArch Editor's replAce experience
	showContextToggle?: booleAn;
}

clAss ReplAceAllAction extends Action {

	stAtic reAdonly ID: string = 'seArch.Action.replAceAll';

	constructor(privAte _seArchWidget: SeArchWidget) {
		super(ReplAceAllAction.ID, '', seArchReplAceAllIcon.clAssNAmes, fAlse);
	}

	set seArchWidget(seArchWidget: SeArchWidget) {
		this._seArchWidget = seArchWidget;
	}

	run(): Promise<Any> {
		if (this._seArchWidget) {
			return this._seArchWidget.triggerReplAceAll();
		}
		return Promise.resolve(null);
	}
}

const ctrlKeyMod = (isMAcintosh ? KeyMod.WinCtrl : KeyMod.CtrlCmd);

function stopPropAgAtionForMultiLineUpwArds(event: IKeyboArdEvent, vAlue: string, textAreA: HTMLTextAreAElement | null) {
	const isMultiline = !!vAlue.mAtch(/\n/);
	if (textAreA && (isMultiline || textAreA.clientHeight > SingleLineInputHeight) && textAreA.selectionStArt > 0) {
		event.stopPropAgAtion();
		return;
	}
}

function stopPropAgAtionForMultiLineDownwArds(event: IKeyboArdEvent, vAlue: string, textAreA: HTMLTextAreAElement | null) {
	const isMultiline = !!vAlue.mAtch(/\n/);
	if (textAreA && (isMultiline || textAreA.clientHeight > SingleLineInputHeight) && textAreA.selectionEnd < textAreA.vAlue.length) {
		event.stopPropAgAtion();
		return;
	}
}

export clAss SeArchWidget extends Widget {
	privAte stAtic reAdonly INPUT_MAX_HEIGHT = 134;

	privAte stAtic reAdonly REPLACE_ALL_DISABLED_LABEL = nls.locAlize('seArch.Action.replAceAll.disAbled.lAbel', "ReplAce All (Submit SeArch to EnAble)");
	privAte stAtic reAdonly REPLACE_ALL_ENABLED_LABEL = (keyBindingService2: IKeybindingService): string => {
		const kb = keyBindingService2.lookupKeybinding(ReplAceAllAction.ID);
		return AppendKeyBindingLAbel(nls.locAlize('seArch.Action.replAceAll.enAbled.lAbel', "ReplAce All"), kb, keyBindingService2);
	};

	domNode!: HTMLElement;

	seArchInput!: FindInput;
	seArchInputFocusTrAcker!: dom.IFocusTrAcker;
	privAte seArchInputBoxFocused: IContextKey<booleAn>;

	privAte replAceContAiner!: HTMLElement;
	replAceInput!: ReplAceInput;
	replAceInputFocusTrAcker!: dom.IFocusTrAcker;
	privAte replAceInputBoxFocused: IContextKey<booleAn>;
	privAte toggleReplAceButton!: Button;
	privAte replAceAllAction!: ReplAceAllAction;
	privAte replAceActive: IContextKey<booleAn>;
	privAte replAceActionBAr!: ActionBAr;
	privAte _replAceHistoryDelAyer: DelAyer<void>;
	privAte ignoreGlobAlFindBufferOnNextFocus = fAlse;
	privAte previousGlobAlFindBufferVAlue: string | null = null;

	privAte _onSeArchSubmit = this._register(new Emitter<{ triggeredOnType: booleAn, delAy: number }>());
	reAdonly onSeArchSubmit: Event<{ triggeredOnType: booleAn, delAy: number }> = this._onSeArchSubmit.event;

	privAte _onSeArchCAncel = this._register(new Emitter<{ focus: booleAn }>());
	reAdonly onSeArchCAncel: Event<{ focus: booleAn }> = this._onSeArchCAncel.event;

	privAte _onReplAceToggled = this._register(new Emitter<void>());
	reAdonly onReplAceToggled: Event<void> = this._onReplAceToggled.event;

	privAte _onReplAceStAteChAnge = this._register(new Emitter<booleAn>());
	reAdonly onReplAceStAteChAnge: Event<booleAn> = this._onReplAceStAteChAnge.event;

	privAte _onPreserveCAseChAnge = this._register(new Emitter<booleAn>());
	reAdonly onPreserveCAseChAnge: Event<booleAn> = this._onPreserveCAseChAnge.event;

	privAte _onReplAceVAlueChAnged = this._register(new Emitter<void>());
	reAdonly onReplAceVAlueChAnged: Event<void> = this._onReplAceVAlueChAnged.event;

	privAte _onReplAceAll = this._register(new Emitter<void>());
	reAdonly onReplAceAll: Event<void> = this._onReplAceAll.event;

	privAte _onBlur = this._register(new Emitter<void>());
	reAdonly onBlur: Event<void> = this._onBlur.event;

	privAte _onDidHeightChAnge = this._register(new Emitter<void>());
	reAdonly onDidHeightChAnge: Event<void> = this._onDidHeightChAnge.event;

	privAte reAdonly _onDidToggleContext = new Emitter<void>();
	reAdonly onDidToggleContext: Event<void> = this._onDidToggleContext.event;

	privAte showContextCheckbox!: Checkbox;
	privAte contextLinesInput!: InputBox;

	constructor(
		contAiner: HTMLElement,
		options: ISeArchWidgetOptions,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IKeybindingService privAte reAdonly keyBindingService: IKeybindingService,
		@IClipboArdService privAte reAdonly clipboArdServce: IClipboArdService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IAccessibilityService privAte reAdonly AccessibilityService: IAccessibilityService
	) {
		super();
		this.replAceActive = ConstAnts.ReplAceActiveKey.bindTo(this.contextKeyService);
		this.seArchInputBoxFocused = ConstAnts.SeArchInputBoxFocusedKey.bindTo(this.contextKeyService);
		this.replAceInputBoxFocused = ConstAnts.ReplAceInputBoxFocusedKey.bindTo(this.contextKeyService);

		this._replAceHistoryDelAyer = new DelAyer<void>(500);

		this.render(contAiner, options);

		this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('editor.AccessibilitySupport')) {
				this.updAteAccessibilitySupport();
			}
		});
		this.AccessibilityService.onDidChAngeScreenReAderOptimized(() => this.updAteAccessibilitySupport());
		this.updAteAccessibilitySupport();
	}

	focus(select: booleAn = true, focusReplAce: booleAn = fAlse, suppressGlobAlSeArchBuffer = fAlse): void {
		this.ignoreGlobAlFindBufferOnNextFocus = suppressGlobAlSeArchBuffer;

		if (focusReplAce && this.isReplAceShown()) {
			this.replAceInput.focus();
			if (select) {
				this.replAceInput.select();
			}
		} else {
			this.seArchInput.focus();
			if (select) {
				this.seArchInput.select();
			}
		}
	}

	setWidth(width: number) {
		this.seArchInput.inputBox.lAyout();
		this.replAceInput.width = width - 28;
		this.replAceInput.inputBox.lAyout();
	}

	cleAr() {
		this.seArchInput.cleAr();
		this.replAceInput.setVAlue('');
		this.setReplAceAllActionStAte(fAlse);
	}

	isReplAceShown(): booleAn {
		return !this.replAceContAiner.clAssList.contAins('disAbled');
	}

	isReplAceActive(): booleAn {
		return !!this.replAceActive.get();
	}

	getReplAceVAlue(): string {
		return this.replAceInput.getVAlue();
	}

	toggleReplAce(show?: booleAn): void {
		if (show === undefined || show !== this.isReplAceShown()) {
			this.onToggleReplAceButton();
		}
	}

	getSeArchHistory(): string[] {
		return this.seArchInput.inputBox.getHistory();
	}

	getReplAceHistory(): string[] {
		return this.replAceInput.inputBox.getHistory();
	}

	cleArHistory(): void {
		this.seArchInput.inputBox.cleArHistory();
	}

	showNextSeArchTerm() {
		this.seArchInput.inputBox.showNextVAlue();
	}

	showPreviousSeArchTerm() {
		this.seArchInput.inputBox.showPreviousVAlue();
	}

	showNextReplAceTerm() {
		this.replAceInput.inputBox.showNextVAlue();
	}

	showPreviousReplAceTerm() {
		this.replAceInput.inputBox.showPreviousVAlue();
	}

	seArchInputHAsFocus(): booleAn {
		return !!this.seArchInputBoxFocused.get();
	}

	replAceInputHAsFocus(): booleAn {
		return this.replAceInput.inputBox.hAsFocus();
	}

	focusReplAceAllAction(): void {
		this.replAceActionBAr.focus(true);
	}

	focusRegexAction(): void {
		this.seArchInput.focusOnRegex();
	}

	privAte render(contAiner: HTMLElement, options: ISeArchWidgetOptions): void {
		this.domNode = dom.Append(contAiner, dom.$('.seArch-widget'));
		this.domNode.style.position = 'relAtive';

		if (!options._hideReplAceToggle) {
			this.renderToggleReplAceButton(this.domNode);
		}

		this.renderSeArchInput(this.domNode, options);
		this.renderReplAceInput(this.domNode, options);
	}

	privAte updAteAccessibilitySupport(): void {
		this.seArchInput.setFocusInputOnOptionClick(!this.AccessibilityService.isScreenReAderOptimized());
	}

	privAte renderToggleReplAceButton(pArent: HTMLElement): void {
		const opts: IButtonOptions = {
			buttonBAckground: undefined,
			buttonBorder: undefined,
			buttonForeground: undefined,
			buttonHoverBAckground: undefined
		};
		this.toggleReplAceButton = this._register(new Button(pArent, opts));
		this.toggleReplAceButton.element.setAttribute('AriA-expAnded', 'fAlse');
		this.toggleReplAceButton.element.clAssList.Add(...seArchHideReplAceIcon.clAssNAmesArrAy);
		this.toggleReplAceButton.icon = 'toggle-replAce-button';
		// TODO@joh need to dispose this listener eventuAlly
		this.toggleReplAceButton.onDidClick(() => this.onToggleReplAceButton());
		this.toggleReplAceButton.element.title = nls.locAlize('seArch.replAce.toggle.button.title', "Toggle ReplAce");
	}

	privAte renderSeArchInput(pArent: HTMLElement, options: ISeArchWidgetOptions): void {
		const inputOptions: IFindInputOptions = {
			lAbel: nls.locAlize('lAbel.SeArch', 'SeArch: Type SeArch Term And press Enter to seArch'),
			vAlidAtion: (vAlue: string) => this.vAlidAteSeArchInput(vAlue),
			plAceholder: nls.locAlize('seArch.plAceHolder', "SeArch"),
			AppendCAseSensitiveLAbel: AppendKeyBindingLAbel('', this.keyBindingService.lookupKeybinding(ConstAnts.ToggleCAseSensitiveCommAndId), this.keyBindingService),
			AppendWholeWordsLAbel: AppendKeyBindingLAbel('', this.keyBindingService.lookupKeybinding(ConstAnts.ToggleWholeWordCommAndId), this.keyBindingService),
			AppendRegexLAbel: AppendKeyBindingLAbel('', this.keyBindingService.lookupKeybinding(ConstAnts.ToggleRegexCommAndId), this.keyBindingService),
			history: options.seArchHistory,
			flexibleHeight: true,
			flexibleMAxHeight: SeArchWidget.INPUT_MAX_HEIGHT
		};

		const seArchInputContAiner = dom.Append(pArent, dom.$('.seArch-contAiner.input-box'));
		this.seArchInput = this._register(new ContextScopedFindInput(seArchInputContAiner, this.contextViewService, inputOptions, this.contextKeyService, true));
		this._register(AttAchFindReplAceInputBoxStyler(this.seArchInput, this.themeService));
		this.seArchInput.onKeyDown((keyboArdEvent: IKeyboArdEvent) => this.onSeArchInputKeyDown(keyboArdEvent));
		this.seArchInput.setVAlue(options.vAlue || '');
		this.seArchInput.setRegex(!!options.isRegex);
		this.seArchInput.setCAseSensitive(!!options.isCAseSensitive);
		this.seArchInput.setWholeWords(!!options.isWholeWords);
		this._register(this.seArchInput.onCAseSensitiveKeyDown((keyboArdEvent: IKeyboArdEvent) => this.onCAseSensitiveKeyDown(keyboArdEvent)));
		this._register(this.seArchInput.onRegexKeyDown((keyboArdEvent: IKeyboArdEvent) => this.onRegexKeyDown(keyboArdEvent)));
		this._register(this.seArchInput.inputBox.onDidChAnge(() => this.onSeArchInputChAnged()));
		this._register(this.seArchInput.inputBox.onDidHeightChAnge(() => this._onDidHeightChAnge.fire()));

		this._register(this.onReplAceVAlueChAnged(() => {
			this._replAceHistoryDelAyer.trigger(() => this.replAceInput.inputBox.AddToHistory());
		}));

		this.seArchInputFocusTrAcker = this._register(dom.trAckFocus(this.seArchInput.inputBox.inputElement));
		this._register(this.seArchInputFocusTrAcker.onDidFocus(Async () => {
			this.seArchInputBoxFocused.set(true);

			const useGlobAlFindBuffer = this.seArchConfigurAtion.globAlFindClipboArd;
			if (!this.ignoreGlobAlFindBufferOnNextFocus && useGlobAlFindBuffer) {
				const globAlBufferText = AwAit this.clipboArdServce.reAdFindText();
				if (this.previousGlobAlFindBufferVAlue !== globAlBufferText) {
					this.seArchInput.inputBox.AddToHistory();
					this.seArchInput.setVAlue(globAlBufferText);
					this.seArchInput.select();
				}

				this.previousGlobAlFindBufferVAlue = globAlBufferText;
			}

			this.ignoreGlobAlFindBufferOnNextFocus = fAlse;
		}));
		this._register(this.seArchInputFocusTrAcker.onDidBlur(() => this.seArchInputBoxFocused.set(fAlse)));


		this.showContextCheckbox = new Checkbox({ isChecked: fAlse, title: nls.locAlize('showContext', "Show Context"), icon: seArchShowContextIcon });
		this._register(this.showContextCheckbox.onChAnge(() => this.onContextLinesChAnged()));

		if (options.showContextToggle) {
			this.contextLinesInput = new InputBox(seArchInputContAiner, this.contextViewService, { type: 'number' });
			this.contextLinesInput.element.clAssList.Add('context-lines-input');
			this.contextLinesInput.vAlue = '' + (this.configurAtionService.getVAlue<ISeArchConfigurAtionProperties>('seArch').seArchEditor.defAultNumberOfContextLines ?? 1);
			this._register(this.contextLinesInput.onDidChAnge(() => this.onContextLinesChAnged()));
			this._register(AttAchInputBoxStyler(this.contextLinesInput, this.themeService));
			dom.Append(seArchInputContAiner, this.showContextCheckbox.domNode);
		}
	}

	privAte onContextLinesChAnged() {
		this.domNode.clAssList.toggle('show-context', this.showContextCheckbox.checked);
		this._onDidToggleContext.fire();

		if (this.contextLinesInput.vAlue.includes('-')) {
			this.contextLinesInput.vAlue = '0';
		}

		this._onDidToggleContext.fire();
	}

	public setContextLines(lines: number) {
		if (!this.contextLinesInput) { return; }
		if (lines === 0) {
			this.showContextCheckbox.checked = fAlse;
		} else {
			this.showContextCheckbox.checked = true;
			this.contextLinesInput.vAlue = '' + lines;
		}
		this.domNode.clAssList.toggle('show-context', this.showContextCheckbox.checked);
	}

	privAte renderReplAceInput(pArent: HTMLElement, options: ISeArchWidgetOptions): void {
		this.replAceContAiner = dom.Append(pArent, dom.$('.replAce-contAiner.disAbled'));
		const replAceBox = dom.Append(this.replAceContAiner, dom.$('.replAce-input'));

		this.replAceInput = this._register(new ContextScopedReplAceInput(replAceBox, this.contextViewService, {
			lAbel: nls.locAlize('lAbel.ReplAce', 'ReplAce: Type replAce term And press Enter to preview'),
			plAceholder: nls.locAlize('seArch.replAce.plAceHolder', "ReplAce"),
			AppendPreserveCAseLAbel: AppendKeyBindingLAbel('', this.keyBindingService.lookupKeybinding(ConstAnts.TogglePreserveCAseId), this.keyBindingService),
			history: options.replAceHistory,
			flexibleHeight: true,
			flexibleMAxHeight: SeArchWidget.INPUT_MAX_HEIGHT
		}, this.contextKeyService, true));

		this._register(this.replAceInput.onDidOptionChAnge(viAKeyboArd => {
			if (!viAKeyboArd) {
				this._onPreserveCAseChAnge.fire(this.replAceInput.getPreserveCAse());
			}
		}));

		this._register(AttAchFindReplAceInputBoxStyler(this.replAceInput, this.themeService));
		this.replAceInput.onKeyDown((keyboArdEvent) => this.onReplAceInputKeyDown(keyboArdEvent));
		this.replAceInput.setVAlue(options.replAceVAlue || '');
		this._register(this.replAceInput.inputBox.onDidChAnge(() => this._onReplAceVAlueChAnged.fire()));
		this._register(this.replAceInput.inputBox.onDidHeightChAnge(() => this._onDidHeightChAnge.fire()));

		this.replAceAllAction = new ReplAceAllAction(this);
		this.replAceAllAction.lAbel = SeArchWidget.REPLACE_ALL_DISABLED_LABEL;
		this.replAceActionBAr = this._register(new ActionBAr(this.replAceContAiner));
		this.replAceActionBAr.push([this.replAceAllAction], { icon: true, lAbel: fAlse });
		this.onkeydown(this.replAceActionBAr.domNode, (keyboArdEvent) => this.onReplAceActionbArKeyDown(keyboArdEvent));

		this.replAceInputFocusTrAcker = this._register(dom.trAckFocus(this.replAceInput.inputBox.inputElement));
		this._register(this.replAceInputFocusTrAcker.onDidFocus(() => this.replAceInputBoxFocused.set(true)));
		this._register(this.replAceInputFocusTrAcker.onDidBlur(() => this.replAceInputBoxFocused.set(fAlse)));
		this._register(this.replAceInput.onPreserveCAseKeyDown((keyboArdEvent: IKeyboArdEvent) => this.onPreserveCAseKeyDown(keyboArdEvent)));
	}

	triggerReplAceAll(): Promise<Any> {
		this._onReplAceAll.fire();
		return Promise.resolve(null);
	}

	privAte onToggleReplAceButton(): void {
		this.replAceContAiner.clAssList.toggle('disAbled');
		if (this.isReplAceShown()) {
			this.toggleReplAceButton.element.clAssList.remove(...seArchHideReplAceIcon.clAssNAmesArrAy);
			this.toggleReplAceButton.element.clAssList.Add(...seArchShowReplAceIcon.clAssNAmesArrAy);
		} else {
			this.toggleReplAceButton.element.clAssList.remove(...seArchShowReplAceIcon.clAssNAmesArrAy);
			this.toggleReplAceButton.element.clAssList.Add(...seArchHideReplAceIcon.clAssNAmesArrAy);
		}
		this.toggleReplAceButton.element.setAttribute('AriA-expAnded', this.isReplAceShown() ? 'true' : 'fAlse');
		this.updAteReplAceActiveStAte();
		this._onReplAceToggled.fire();
	}

	setVAlue(vAlue: string) {
		this.seArchInput.setVAlue(vAlue);
	}

	setReplAceAllActionStAte(enAbled: booleAn): void {
		if (this.replAceAllAction.enAbled !== enAbled) {
			this.replAceAllAction.enAbled = enAbled;
			this.replAceAllAction.lAbel = enAbled ? SeArchWidget.REPLACE_ALL_ENABLED_LABEL(this.keyBindingService) : SeArchWidget.REPLACE_ALL_DISABLED_LABEL;
			this.updAteReplAceActiveStAte();
		}
	}

	privAte updAteReplAceActiveStAte(): void {
		const currentStAte = this.isReplAceActive();
		const newStAte = this.isReplAceShown() && this.replAceAllAction.enAbled;
		if (currentStAte !== newStAte) {
			this.replAceActive.set(newStAte);
			this._onReplAceStAteChAnge.fire(newStAte);
			this.replAceInput.inputBox.lAyout();
		}
	}

	privAte vAlidAteSeArchInput(vAlue: string): IMessAge | null {
		if (vAlue.length === 0) {
			return null;
		}
		if (!this.seArchInput.getRegex()) {
			return null;
		}
		try {
			new RegExp(vAlue, 'u');
		} cAtch (e) {
			return { content: e.messAge };
		}

		return null;
	}

	privAte onSeArchInputChAnged(): void {
		this.seArchInput.cleArMessAge();
		this.setReplAceAllActionStAte(fAlse);

		if (this.seArchConfigurAtion.seArchOnType) {
			if (this.seArchInput.getRegex()) {
				try {
					const regex = new RegExp(this.seArchInput.getVAlue(), 'ug');
					const mAtchienessHeuristic = `
								~!@#$%^&*()_+
								\`1234567890-=
								qwertyuiop[]\\
								QWERTYUIOP{}|
								Asdfghjkl;'
								ASDFGHJKL:"
								zxcvbnm,./
								ZXCVBNM<>? `.mAtch(regex)?.length ?? 0;

					const delAyMultiplier =
						mAtchienessHeuristic < 50 ? 1 :
							mAtchienessHeuristic < 100 ? 5 : // expressions like `.` or `\w`
								10; // only things mAtching empty string

					this.submitSeArch(true, this.seArchConfigurAtion.seArchOnTypeDebouncePeriod * delAyMultiplier);
				} cAtch {
					// pAss
				}
			} else {
				this.submitSeArch(true, this.seArchConfigurAtion.seArchOnTypeDebouncePeriod);
			}
		}
	}

	privAte onSeArchInputKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(ctrlKeyMod | KeyCode.Enter)) {
			this.seArchInput.inputBox.insertAtCursor('\n');
			keyboArdEvent.preventDefAult();
		}

		if (keyboArdEvent.equAls(KeyCode.Enter)) {
			this.seArchInput.onSeArchSubmit();
			this.submitSeArch();
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyCode.EscApe)) {
			this._onSeArchCAncel.fire({ focus: true });
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyCode.TAb)) {
			if (this.isReplAceShown()) {
				this.replAceInput.focus();
			} else {
				this.seArchInput.focusOnCAseSensitive();
			}
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyCode.UpArrow)) {
			stopPropAgAtionForMultiLineUpwArds(keyboArdEvent, this.seArchInput.getVAlue(), this.seArchInput.domNode.querySelector('textAreA'));
		}

		else if (keyboArdEvent.equAls(KeyCode.DownArrow)) {
			stopPropAgAtionForMultiLineDownwArds(keyboArdEvent, this.seArchInput.getVAlue(), this.seArchInput.domNode.querySelector('textAreA'));
		}
	}

	privAte onCAseSensitiveKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(KeyMod.Shift | KeyCode.TAb)) {
			if (this.isReplAceShown()) {
				this.replAceInput.focus();
				keyboArdEvent.preventDefAult();
			}
		}
	}

	privAte onRegexKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(KeyCode.TAb)) {
			if (this.isReplAceShown()) {
				this.replAceInput.focusOnPreserve();
				keyboArdEvent.preventDefAult();
			}
		}
	}

	privAte onPreserveCAseKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(KeyCode.TAb)) {
			if (this.isReplAceActive()) {
				this.focusReplAceAllAction();
			} else {
				this._onBlur.fire();
			}
			keyboArdEvent.preventDefAult();
		}
		else if (KeyMod.Shift | KeyCode.TAb) {
			this.focusRegexAction();
			keyboArdEvent.preventDefAult();
		}
	}

	privAte onReplAceInputKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(ctrlKeyMod | KeyCode.Enter)) {
			this.replAceInput.inputBox.insertAtCursor('\n');
			keyboArdEvent.preventDefAult();
		}

		if (keyboArdEvent.equAls(KeyCode.Enter)) {
			this.submitSeArch();
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyCode.TAb)) {
			this.seArchInput.focusOnCAseSensitive();
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyMod.Shift | KeyCode.TAb)) {
			this.seArchInput.focus();
			keyboArdEvent.preventDefAult();
		}

		else if (keyboArdEvent.equAls(KeyCode.UpArrow)) {
			stopPropAgAtionForMultiLineUpwArds(keyboArdEvent, this.replAceInput.getVAlue(), this.replAceInput.domNode.querySelector('textAreA'));
		}

		else if (keyboArdEvent.equAls(KeyCode.DownArrow)) {
			stopPropAgAtionForMultiLineDownwArds(keyboArdEvent, this.replAceInput.getVAlue(), this.replAceInput.domNode.querySelector('textAreA'));
		}
	}

	privAte onReplAceActionbArKeyDown(keyboArdEvent: IKeyboArdEvent) {
		if (keyboArdEvent.equAls(KeyMod.Shift | KeyCode.TAb)) {
			this.focusRegexAction();
			keyboArdEvent.preventDefAult();
		}
	}

	privAte Async submitSeArch(triggeredOnType = fAlse, delAy: number = 0): Promise<void> {
		this.seArchInput.vAlidAte();
		if (!this.seArchInput.inputBox.isInputVAlid()) {
			return;
		}

		const vAlue = this.seArchInput.getVAlue();
		const useGlobAlFindBuffer = this.seArchConfigurAtion.globAlFindClipboArd;
		if (vAlue && useGlobAlFindBuffer) {
			AwAit this.clipboArdServce.writeFindText(vAlue);
		}
		this._onSeArchSubmit.fire({ triggeredOnType, delAy });
	}

	getContextLines() {
		return this.showContextCheckbox.checked ? +this.contextLinesInput.vAlue : 0;
	}

	modifyContextLines(increAse: booleAn) {
		const current = +this.contextLinesInput.vAlue;
		const modified = current + (increAse ? 1 : -1);
		this.showContextCheckbox.checked = modified !== 0;
		this.contextLinesInput.vAlue = '' + modified;
	}

	toggleContextLines() {
		this.showContextCheckbox.checked = !this.showContextCheckbox.checked;
		this.onContextLinesChAnged();
	}

	dispose(): void {
		this.setReplAceAllActionStAte(fAlse);
		super.dispose();
	}

	privAte get seArchConfigurAtion(): ISeArchConfigurAtionProperties {
		return this.configurAtionService.getVAlue<ISeArchConfigurAtionProperties>('seArch');
	}
}

export function registerContributions() {
	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: ReplAceAllAction.ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.ReplAceActiveKey, CONTEXT_FIND_WIDGET_NOT_VISIBLE),
		primAry: KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.Enter,
		hAndler: Accessor => {
			const viewsService = Accessor.get(IViewsService);
			if (isSeArchViewFocused(viewsService)) {
				const seArchView = getSeArchView(viewsService);
				if (seArchView) {
					new ReplAceAllAction(seArchView.seArchAndReplAceWidget).run();
				}
			}
		}
	});
}
