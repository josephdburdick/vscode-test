/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./findWidget';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { IContextViewProvider } from 'vs/bAse/browser/ui/contextview/contextview';
import { Alert As AlertFn } from 'vs/bAse/browser/ui/AriA/AriA';
import { Checkbox } from 'vs/bAse/browser/ui/checkbox/checkbox';
import { FindInput, IFindInputStyles } from 'vs/bAse/browser/ui/findinput/findInput';
import { IMessAge As InputBoxMessAge } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { ReplAceInput } from 'vs/bAse/browser/ui/findinput/replAceInput';
import { IVerticAlSAshLAyoutProvider, ISAshEvent, OrientAtion, SAsh } from 'vs/bAse/browser/ui/sAsh/sAsh';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { DelAyer } from 'vs/bAse/common/Async';
import { Color } from 'vs/bAse/common/color';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { toDisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As strings from 'vs/bAse/common/strings';
import { ICodeEditor, IOverlAyWidget, IOverlAyWidgetPosition, IViewZone, OverlAyWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_REPLACE_INPUT_FOCUSED, FIND_IDS, MATCHES_LIMIT } from 'vs/editor/contrib/find/findModel';
import { FindReplAceStAte, FindReplAceStAteChAngedEvent } from 'vs/editor/contrib/find/findStAte';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { contrAstBorder, editorFindMAtch, editorFindMAtchBorder, editorFindMAtchHighlight, editorFindMAtchHighlightBorder, editorFindRAngeHighlight, editorFindRAngeHighlightBorder, editorWidgetBAckground, editorWidgetBorder, editorWidgetResizeBorder, errorForeground, inputActiveOptionBorder, inputActiveOptionBAckground, inputActiveOptionForeground, inputBAckground, inputBorder, inputForeground, inputVAlidAtionErrorBAckground, inputVAlidAtionErrorBorder, inputVAlidAtionErrorForeground, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoBorder, inputVAlidAtionInfoForeground, inputVAlidAtionWArningBAckground, inputVAlidAtionWArningBorder, inputVAlidAtionWArningForeground, widgetShAdow, editorWidgetForeground, focusBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { ContextScopedFindInput, ContextScopedReplAceInput } from 'vs/plAtform/browser/contextScopedHistoryWidget';
import { AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';

const findSelectionIcon = registerIcon('find-selection', Codicon.selection);
const findCollApsedIcon = registerIcon('find-collApsed', Codicon.chevronRight);
const findExpAndedIcon = registerIcon('find-expAnded', Codicon.chevronDown);

export const findCloseIcon = registerIcon('find-close', Codicon.close);
export const findReplAceIcon = registerIcon('find-replAce', Codicon.replAce);
export const findReplAceAllIcon = registerIcon('find-replAce-All', Codicon.replAceAll);
export const findPreviousMAtchIcon = registerIcon('find-previous-mAtch', Codicon.ArrowUp);
export const findNextMAtchIcon = registerIcon('find-next-mAtch', Codicon.ArrowDown);

export interfAce IFindController {
	replAce(): void;
	replAceAll(): void;
	getGlobAlBufferTerm(): Promise<string>;
}

const NLS_FIND_INPUT_LABEL = nls.locAlize('lAbel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.locAlize('plAceholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.locAlize('lAbel.previousMAtchButton', "Previous mAtch");
const NLS_NEXT_MATCH_BTN_LABEL = nls.locAlize('lAbel.nextMAtchButton', "Next mAtch");
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.locAlize('lAbel.toggleSelectionFind', "Find in selection");
const NLS_CLOSE_BTN_LABEL = nls.locAlize('lAbel.closeButton', "Close");
const NLS_REPLACE_INPUT_LABEL = nls.locAlize('lAbel.replAce', "ReplAce");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.locAlize('plAceholder.replAce', "ReplAce");
const NLS_REPLACE_BTN_LABEL = nls.locAlize('lAbel.replAceButton', "ReplAce");
const NLS_REPLACE_ALL_BTN_LABEL = nls.locAlize('lAbel.replAceAllButton', "ReplAce All");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.locAlize('lAbel.toggleReplAceButton', "Toggle ReplAce mode");
const NLS_MATCHES_COUNT_LIMIT_TITLE = nls.locAlize('title.mAtchesCountLimit', "Only the first {0} results Are highlighted, but All find operAtions work on the entire text.", MATCHES_LIMIT);
const NLS_MATCHES_LOCATION = nls.locAlize('lAbel.mAtchesLocAtion', "{0} of {1}");
const NLS_NO_RESULTS = nls.locAlize('lAbel.noResults', "No results");

const FIND_WIDGET_INITIAL_WIDTH = 419;
const PART_WIDTH = 275;
const FIND_INPUT_AREA_WIDTH = PART_WIDTH - 54;

let MAX_MATCHES_COUNT_WIDTH = 69;
// let FIND_ALL_CONTROLS_WIDTH = 17/** Find Input mArgin-left */ + (MAX_MATCHES_COUNT_WIDTH + 3 + 1) /** MAtch Results */ + 23 /** Button */ * 4 + 2/** sAsh */;

const FIND_INPUT_AREA_HEIGHT = 33; // The height of Find Widget when ReplAce Input is not visible.
const ctrlEnterReplAceAllWArningPromptedKey = 'ctrlEnterReplAceAll.windows.donotAsk';

const ctrlKeyMod = (plAtform.isMAcintosh ? KeyMod.WinCtrl : KeyMod.CtrlCmd);
export clAss FindWidgetViewZone implements IViewZone {
	public reAdonly AfterLineNumber: number;
	public heightInPx: number;
	public reAdonly suppressMouseDown: booleAn;
	public reAdonly domNode: HTMLElement;

	constructor(AfterLineNumber: number) {
		this.AfterLineNumber = AfterLineNumber;

		this.heightInPx = FIND_INPUT_AREA_HEIGHT;
		this.suppressMouseDown = fAlse;
		this.domNode = document.creAteElement('div');
		this.domNode.clAssNAme = 'dock-find-viewzone';
	}
}

function stopPropAgAtionForMultiLineUpwArds(event: IKeyboArdEvent, vAlue: string, textAreA: HTMLTextAreAElement | null) {
	const isMultiline = !!vAlue.mAtch(/\n/);
	if (textAreA && isMultiline && textAreA.selectionStArt > 0) {
		event.stopPropAgAtion();
		return;
	}
}

function stopPropAgAtionForMultiLineDownwArds(event: IKeyboArdEvent, vAlue: string, textAreA: HTMLTextAreAElement | null) {
	const isMultiline = !!vAlue.mAtch(/\n/);
	if (textAreA && isMultiline && textAreA.selectionEnd < textAreA.vAlue.length) {
		event.stopPropAgAtion();
		return;
	}
}

export clAss FindWidget extends Widget implements IOverlAyWidget, IVerticAlSAshLAyoutProvider {
	privAte stAtic reAdonly ID = 'editor.contrib.findWidget';
	privAte reAdonly _codeEditor: ICodeEditor;
	privAte reAdonly _stAte: FindReplAceStAte;
	privAte reAdonly _controller: IFindController;
	privAte reAdonly _contextViewProvider: IContextViewProvider;
	privAte reAdonly _keybindingService: IKeybindingService;
	privAte reAdonly _contextKeyService: IContextKeyService;
	privAte reAdonly _storAgeService: IStorAgeService;
	privAte reAdonly _notificAtionService: INotificAtionService;

	privAte _domNode!: HTMLElement;
	privAte _cAchedHeight: number | null = null;
	privAte _findInput!: FindInput;
	privAte _replAceInput!: ReplAceInput;

	privAte _toggleReplAceBtn!: SimpleButton;
	privAte _mAtchesCount!: HTMLElement;
	privAte _prevBtn!: SimpleButton;
	privAte _nextBtn!: SimpleButton;
	privAte _toggleSelectionFind!: Checkbox;
	privAte _closeBtn!: SimpleButton;
	privAte _replAceBtn!: SimpleButton;
	privAte _replAceAllBtn!: SimpleButton;

	privAte _isVisible: booleAn;
	privAte _isReplAceVisible: booleAn;
	privAte _ignoreChAngeEvent: booleAn;
	privAte _ctrlEnterReplAceAllWArningPrompted: booleAn;

	privAte reAdonly _findFocusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _findInputFocused: IContextKey<booleAn>;
	privAte reAdonly _replAceFocusTrAcker: dom.IFocusTrAcker;
	privAte reAdonly _replAceInputFocused: IContextKey<booleAn>;
	privAte _viewZone?: FindWidgetViewZone;
	privAte _viewZoneId?: string;

	privAte _resizeSAsh!: SAsh;
	privAte _resized!: booleAn;
	privAte reAdonly _updAteHistoryDelAyer: DelAyer<void>;

	constructor(
		codeEditor: ICodeEditor,
		controller: IFindController,
		stAte: FindReplAceStAte,
		contextViewProvider: IContextViewProvider,
		keybindingService: IKeybindingService,
		contextKeyService: IContextKeyService,
		themeService: IThemeService,
		storAgeService: IStorAgeService,
		notificAtionService: INotificAtionService,
		storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService
	) {
		super();
		this._codeEditor = codeEditor;
		this._controller = controller;
		this._stAte = stAte;
		this._contextViewProvider = contextViewProvider;
		this._keybindingService = keybindingService;
		this._contextKeyService = contextKeyService;
		this._storAgeService = storAgeService;
		this._notificAtionService = notificAtionService;

		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: ctrlEnterReplAceAllWArningPromptedKey, version: 1 });
		this._ctrlEnterReplAceAllWArningPrompted = !!storAgeService.getBooleAn(ctrlEnterReplAceAllWArningPromptedKey, StorAgeScope.GLOBAL);

		this._isVisible = fAlse;
		this._isReplAceVisible = fAlse;
		this._ignoreChAngeEvent = fAlse;

		this._updAteHistoryDelAyer = new DelAyer<void>(500);
		this._register(toDisposAble(() => this._updAteHistoryDelAyer.cAncel()));
		this._register(this._stAte.onFindReplAceStAteChAnge((e) => this._onStAteChAnged(e)));
		this._buildDomNode();
		this._updAteButtons();
		this._tryUpdAteWidgetWidth();
		this._findInput.inputBox.lAyout();

		this._register(this._codeEditor.onDidChAngeConfigurAtion((e: ConfigurAtionChAngedEvent) => {
			if (e.hAsChAnged(EditorOption.reAdOnly)) {
				if (this._codeEditor.getOption(EditorOption.reAdOnly)) {
					// Hide replAce pArt if editor becomes reAd only
					this._stAte.chAnge({ isReplAceReveAled: fAlse }, fAlse);
				}
				this._updAteButtons();
			}
			if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
				this._tryUpdAteWidgetWidth();
			}

			if (e.hAsChAnged(EditorOption.AccessibilitySupport)) {
				this.updAteAccessibilitySupport();
			}

			if (e.hAsChAnged(EditorOption.find)) {
				const AddExtrASpAceOnTop = this._codeEditor.getOption(EditorOption.find).AddExtrASpAceOnTop;
				if (AddExtrASpAceOnTop && !this._viewZone) {
					this._viewZone = new FindWidgetViewZone(0);
					this._showViewZone();
				}
				if (!AddExtrASpAceOnTop && this._viewZone) {
					this._removeViewZone();
				}
			}
		}));
		this.updAteAccessibilitySupport();
		this._register(this._codeEditor.onDidChAngeCursorSelection(() => {
			if (this._isVisible) {
				this._updAteToggleSelectionFindButton();
			}
		}));
		this._register(this._codeEditor.onDidFocusEditorWidget(Async () => {
			if (this._isVisible) {
				let globAlBufferTerm = AwAit this._controller.getGlobAlBufferTerm();
				if (globAlBufferTerm && globAlBufferTerm !== this._stAte.seArchString) {
					this._stAte.chAnge({ seArchString: globAlBufferTerm }, true);
					this._findInput.select();
				}
			}
		}));
		this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.bindTo(contextKeyService);
		this._findFocusTrAcker = this._register(dom.trAckFocus(this._findInput.inputBox.inputElement));
		this._register(this._findFocusTrAcker.onDidFocus(() => {
			this._findInputFocused.set(true);
			this._updAteSeArchScope();
		}));
		this._register(this._findFocusTrAcker.onDidBlur(() => {
			this._findInputFocused.set(fAlse);
		}));

		this._replAceInputFocused = CONTEXT_REPLACE_INPUT_FOCUSED.bindTo(contextKeyService);
		this._replAceFocusTrAcker = this._register(dom.trAckFocus(this._replAceInput.inputBox.inputElement));
		this._register(this._replAceFocusTrAcker.onDidFocus(() => {
			this._replAceInputFocused.set(true);
			this._updAteSeArchScope();
		}));
		this._register(this._replAceFocusTrAcker.onDidBlur(() => {
			this._replAceInputFocused.set(fAlse);
		}));

		this._codeEditor.AddOverlAyWidget(this);
		if (this._codeEditor.getOption(EditorOption.find).AddExtrASpAceOnTop) {
			this._viewZone = new FindWidgetViewZone(0); // Put it before the first line then users cAn scroll beyond the first line.
		}

		this._ApplyTheme(themeService.getColorTheme());
		this._register(themeService.onDidColorThemeChAnge(this._ApplyTheme.bind(this)));

		this._register(this._codeEditor.onDidChAngeModel(() => {
			if (!this._isVisible) {
				return;
			}
			this._viewZoneId = undefined;
		}));


		this._register(this._codeEditor.onDidScrollChAnge((e) => {
			if (e.scrollTopChAnged) {
				this._lAyoutViewZone();
				return;
			}

			// for other scroll chAnges, lAyout the viewzone in next tick to Avoid ruining current rendering.
			setTimeout(() => {
				this._lAyoutViewZone();
			}, 0);
		}));
	}

	// ----- IOverlAyWidget API

	public getId(): string {
		return FindWidget.ID;
	}

	public getDomNode(): HTMLElement {
		return this._domNode;
	}

	public getPosition(): IOverlAyWidgetPosition | null {
		if (this._isVisible) {
			return {
				preference: OverlAyWidgetPositionPreference.TOP_RIGHT_CORNER
			};
		}
		return null;
	}

	// ----- ReAct to stAte chAnges

	privAte _onStAteChAnged(e: FindReplAceStAteChAngedEvent): void {
		if (e.seArchString) {
			try {
				this._ignoreChAngeEvent = true;
				this._findInput.setVAlue(this._stAte.seArchString);
			} finAlly {
				this._ignoreChAngeEvent = fAlse;
			}
			this._updAteButtons();
		}
		if (e.replAceString) {
			this._replAceInput.inputBox.vAlue = this._stAte.replAceString;
		}
		if (e.isReveAled) {
			if (this._stAte.isReveAled) {
				this._reveAl();
			} else {
				this._hide(true);
			}
		}
		if (e.isReplAceReveAled) {
			if (this._stAte.isReplAceReveAled) {
				if (!this._codeEditor.getOption(EditorOption.reAdOnly) && !this._isReplAceVisible) {
					this._isReplAceVisible = true;
					this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
					this._updAteButtons();
					this._replAceInput.inputBox.lAyout();
				}
			} else {
				if (this._isReplAceVisible) {
					this._isReplAceVisible = fAlse;
					this._updAteButtons();
				}
			}
		}
		if ((e.isReveAled || e.isReplAceReveAled) && (this._stAte.isReveAled || this._stAte.isReplAceReveAled)) {
			if (this._tryUpdAteHeight()) {
				this._showViewZone();
			}
		}

		if (e.isRegex) {
			this._findInput.setRegex(this._stAte.isRegex);
		}
		if (e.wholeWord) {
			this._findInput.setWholeWords(this._stAte.wholeWord);
		}
		if (e.mAtchCAse) {
			this._findInput.setCAseSensitive(this._stAte.mAtchCAse);
		}
		if (e.preserveCAse) {
			this._replAceInput.setPreserveCAse(this._stAte.preserveCAse);
		}
		if (e.seArchScope) {
			if (this._stAte.seArchScope) {
				this._toggleSelectionFind.checked = true;
			} else {
				this._toggleSelectionFind.checked = fAlse;
			}
			this._updAteToggleSelectionFindButton();
		}
		if (e.seArchString || e.mAtchesCount || e.mAtchesPosition) {
			let showRedOutline = (this._stAte.seArchString.length > 0 && this._stAte.mAtchesCount === 0);
			this._domNode.clAssList.toggle('no-results', showRedOutline);

			this._updAteMAtchesCount();
			this._updAteButtons();
		}
		if (e.seArchString || e.currentMAtch) {
			this._lAyoutViewZone();
		}
		if (e.updAteHistory) {
			this._delAyedUpdAteHistory();
		}
		if (e.loop) {
			this._updAteButtons();
		}
	}

	privAte _delAyedUpdAteHistory() {
		this._updAteHistoryDelAyer.trigger(this._updAteHistory.bind(this));
	}

	privAte _updAteHistory() {
		if (this._stAte.seArchString) {
			this._findInput.inputBox.AddToHistory();
		}
		if (this._stAte.replAceString) {
			this._replAceInput.inputBox.AddToHistory();
		}
	}

	privAte _updAteMAtchesCount(): void {
		this._mAtchesCount.style.minWidth = MAX_MATCHES_COUNT_WIDTH + 'px';
		if (this._stAte.mAtchesCount >= MATCHES_LIMIT) {
			this._mAtchesCount.title = NLS_MATCHES_COUNT_LIMIT_TITLE;
		} else {
			this._mAtchesCount.title = '';
		}

		// remove previous content
		if (this._mAtchesCount.firstChild) {
			this._mAtchesCount.removeChild(this._mAtchesCount.firstChild);
		}

		let lAbel: string;
		if (this._stAte.mAtchesCount > 0) {
			let mAtchesCount: string = String(this._stAte.mAtchesCount);
			if (this._stAte.mAtchesCount >= MATCHES_LIMIT) {
				mAtchesCount += '+';
			}
			let mAtchesPosition: string = String(this._stAte.mAtchesPosition);
			if (mAtchesPosition === '0') {
				mAtchesPosition = '?';
			}
			lAbel = strings.formAt(NLS_MATCHES_LOCATION, mAtchesPosition, mAtchesCount);
		} else {
			lAbel = NLS_NO_RESULTS;
		}

		this._mAtchesCount.AppendChild(document.creAteTextNode(lAbel));

		AlertFn(this._getAriALAbel(lAbel, this._stAte.currentMAtch, this._stAte.seArchString));
		MAX_MATCHES_COUNT_WIDTH = MAth.mAx(MAX_MATCHES_COUNT_WIDTH, this._mAtchesCount.clientWidth);
	}

	// ----- Actions

	privAte _getAriALAbel(lAbel: string, currentMAtch: RAnge | null, seArchString: string): string {
		if (lAbel === NLS_NO_RESULTS) {
			return seArchString === ''
				? nls.locAlize('AriASeArchNoResultEmpty', "{0} found", lAbel)
				: nls.locAlize('AriASeArchNoResult', "{0} found for '{1}'", lAbel, seArchString);
		}
		if (currentMAtch) {
			const AriALAbel = nls.locAlize('AriASeArchNoResultWithLineNum', "{0} found for '{1}', At {2}", lAbel, seArchString, currentMAtch.stArtLineNumber + ':' + currentMAtch.stArtColumn);
			const model = this._codeEditor.getModel();
			if (model && (currentMAtch.stArtLineNumber <= model.getLineCount()) && (currentMAtch.stArtLineNumber >= 1)) {
				const lineContent = model.getLineContent(currentMAtch.stArtLineNumber);
				return `${lineContent}, ${AriALAbel}`;
			}

			return AriALAbel;
		}

		return nls.locAlize('AriASeArchNoResultWithLineNumNoCurrentMAtch', "{0} found for '{1}'", lAbel, seArchString);
	}

	/**
	 * If 'selection find' is ON we should not disAble the button (its function is to cAncel 'selection find').
	 * If 'selection find' is OFF we enAble the button only if there is A selection.
	 */
	privAte _updAteToggleSelectionFindButton(): void {
		let selection = this._codeEditor.getSelection();
		let isSelection = selection ? (selection.stArtLineNumber !== selection.endLineNumber || selection.stArtColumn !== selection.endColumn) : fAlse;
		let isChecked = this._toggleSelectionFind.checked;

		if (this._isVisible && (isChecked || isSelection)) {
			this._toggleSelectionFind.enAble();
		} else {
			this._toggleSelectionFind.disAble();
		}
	}

	privAte _updAteButtons(): void {
		this._findInput.setEnAbled(this._isVisible);
		this._replAceInput.setEnAbled(this._isVisible && this._isReplAceVisible);
		this._updAteToggleSelectionFindButton();
		this._closeBtn.setEnAbled(this._isVisible);

		let findInputIsNonEmpty = (this._stAte.seArchString.length > 0);
		let mAtchesCount = this._stAte.mAtchesCount ? true : fAlse;
		this._prevBtn.setEnAbled(this._isVisible && findInputIsNonEmpty && mAtchesCount && this._stAte.cAnNAvigAteBAck());
		this._nextBtn.setEnAbled(this._isVisible && findInputIsNonEmpty && mAtchesCount && this._stAte.cAnNAvigAteForwArd());
		this._replAceBtn.setEnAbled(this._isVisible && this._isReplAceVisible && findInputIsNonEmpty);
		this._replAceAllBtn.setEnAbled(this._isVisible && this._isReplAceVisible && findInputIsNonEmpty);

		this._domNode.clAssList.toggle('replAceToggled', this._isReplAceVisible);
		this._toggleReplAceBtn.setExpAnded(this._isReplAceVisible);

		let cAnReplAce = !this._codeEditor.getOption(EditorOption.reAdOnly);
		this._toggleReplAceBtn.setEnAbled(this._isVisible && cAnReplAce);
	}

	privAte _reveAl(): void {
		if (!this._isVisible) {
			this._isVisible = true;

			const selection = this._codeEditor.getSelection();

			switch (this._codeEditor.getOption(EditorOption.find).AutoFindInSelection) {
				cAse 'AlwAys':
					this._toggleSelectionFind.checked = true;
					breAk;
				cAse 'never':
					this._toggleSelectionFind.checked = fAlse;
					breAk;
				cAse 'multiline':
					const isSelectionMultipleLine = !!selection && selection.stArtLineNumber !== selection.endLineNumber;
					this._toggleSelectionFind.checked = isSelectionMultipleLine;
					breAk;

				defAult:
					breAk;
			}

			this._tryUpdAteWidgetWidth();
			this._updAteButtons();

			setTimeout(() => {
				this._domNode.clAssList.Add('visible');
				this._domNode.setAttribute('AriA-hidden', 'fAlse');
			}, 0);

			// vAlidAte query AgAin As it's being dismissed when we hide the find widget.
			setTimeout(() => {
				this._findInput.vAlidAte();
			}, 200);

			this._codeEditor.lAyoutOverlAyWidget(this);

			let AdjustEditorScrollTop = true;
			if (this._codeEditor.getOption(EditorOption.find).seedSeArchStringFromSelection && selection) {
				const domNode = this._codeEditor.getDomNode();
				if (domNode) {
					const editorCoords = dom.getDomNodePAgePosition(domNode);
					const stArtCoords = this._codeEditor.getScrolledVisiblePosition(selection.getStArtPosition());
					const stArtLeft = editorCoords.left + (stArtCoords ? stArtCoords.left : 0);
					const stArtTop = stArtCoords ? stArtCoords.top : 0;

					if (this._viewZone && stArtTop < this._viewZone.heightInPx) {
						if (selection.endLineNumber > selection.stArtLineNumber) {
							AdjustEditorScrollTop = fAlse;
						}

						const leftOfFindWidget = dom.getTopLeftOffset(this._domNode).left;
						if (stArtLeft > leftOfFindWidget) {
							AdjustEditorScrollTop = fAlse;
						}
						const endCoords = this._codeEditor.getScrolledVisiblePosition(selection.getEndPosition());
						const endLeft = editorCoords.left + (endCoords ? endCoords.left : 0);
						if (endLeft > leftOfFindWidget) {
							AdjustEditorScrollTop = fAlse;
						}
					}
				}
			}
			this._showViewZone(AdjustEditorScrollTop);
		}
	}

	privAte _hide(focusTheEditor: booleAn): void {
		if (this._isVisible) {
			this._isVisible = fAlse;

			this._updAteButtons();

			this._domNode.clAssList.remove('visible');
			this._domNode.setAttribute('AriA-hidden', 'true');
			this._findInput.cleArMessAge();
			if (focusTheEditor) {
				this._codeEditor.focus();
			}
			this._codeEditor.lAyoutOverlAyWidget(this);
			this._removeViewZone();
		}
	}

	privAte _lAyoutViewZone() {
		const AddExtrASpAceOnTop = this._codeEditor.getOption(EditorOption.find).AddExtrASpAceOnTop;

		if (!AddExtrASpAceOnTop) {
			this._removeViewZone();
			return;
		}

		if (!this._isVisible) {
			return;
		}
		const viewZone = this._viewZone;
		if (this._viewZoneId !== undefined || !viewZone) {
			return;
		}

		this._codeEditor.chAngeViewZones((Accessor) => {
			viewZone.heightInPx = this._getHeight();
			this._viewZoneId = Accessor.AddZone(viewZone);
			// scroll top Adjust to mAke sure the editor doesn't scroll when Adding viewzone At the beginning.
			this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + viewZone.heightInPx);
		});
	}

	privAte _showViewZone(AdjustScroll: booleAn = true) {
		if (!this._isVisible) {
			return;
		}

		const AddExtrASpAceOnTop = this._codeEditor.getOption(EditorOption.find).AddExtrASpAceOnTop;

		if (!AddExtrASpAceOnTop) {
			return;
		}

		if (this._viewZone === undefined) {
			this._viewZone = new FindWidgetViewZone(0);
		}

		const viewZone = this._viewZone;

		this._codeEditor.chAngeViewZones((Accessor) => {
			if (this._viewZoneId !== undefined) {
				// the view zone AlreAdy exists, we need to updAte the height
				const newHeight = this._getHeight();
				if (newHeight === viewZone.heightInPx) {
					return;
				}

				let scrollAdjustment = newHeight - viewZone.heightInPx;
				viewZone.heightInPx = newHeight;
				Accessor.lAyoutZone(this._viewZoneId);

				if (AdjustScroll) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
				}

				return;
			} else {
				let scrollAdjustment = this._getHeight();

				// if the editor hAs top pAdding, fActor thAt into the zone height
				scrollAdjustment -= this._codeEditor.getOption(EditorOption.pAdding).top;
				if (scrollAdjustment <= 0) {
					return;
				}

				viewZone.heightInPx = scrollAdjustment;
				this._viewZoneId = Accessor.AddZone(viewZone);

				if (AdjustScroll) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
				}
			}
		});
	}

	privAte _removeViewZone() {
		this._codeEditor.chAngeViewZones((Accessor) => {
			if (this._viewZoneId !== undefined) {
				Accessor.removeZone(this._viewZoneId);
				this._viewZoneId = undefined;
				if (this._viewZone) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() - this._viewZone.heightInPx);
					this._viewZone = undefined;
				}
			}
		});
	}

	privAte _ApplyTheme(theme: IColorTheme) {
		let inputStyles: IFindInputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionBAckground: theme.getColor(inputActiveOptionBAckground),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputBAckground: theme.getColor(inputBAckground),
			inputForeground: theme.getColor(inputForeground),
			inputBorder: theme.getColor(inputBorder),
			inputVAlidAtionInfoBAckground: theme.getColor(inputVAlidAtionInfoBAckground),
			inputVAlidAtionInfoForeground: theme.getColor(inputVAlidAtionInfoForeground),
			inputVAlidAtionInfoBorder: theme.getColor(inputVAlidAtionInfoBorder),
			inputVAlidAtionWArningBAckground: theme.getColor(inputVAlidAtionWArningBAckground),
			inputVAlidAtionWArningForeground: theme.getColor(inputVAlidAtionWArningForeground),
			inputVAlidAtionWArningBorder: theme.getColor(inputVAlidAtionWArningBorder),
			inputVAlidAtionErrorBAckground: theme.getColor(inputVAlidAtionErrorBAckground),
			inputVAlidAtionErrorForeground: theme.getColor(inputVAlidAtionErrorForeground),
			inputVAlidAtionErrorBorder: theme.getColor(inputVAlidAtionErrorBorder),
		};
		this._findInput.style(inputStyles);
		this._replAceInput.style(inputStyles);
		this._toggleSelectionFind.style(inputStyles);
	}

	privAte _tryUpdAteWidgetWidth() {
		if (!this._isVisible) {
			return;
		}
		if (!dom.isInDOM(this._domNode)) {
			// the widget is not in the DOM
			return;
		}

		const lAyoutInfo = this._codeEditor.getLAyoutInfo();
		const editorContentWidth = lAyoutInfo.contentWidth;

		if (editorContentWidth <= 0) {
			// for exAmple, diff view originAl editor
			this._domNode.clAssList.Add('hiddenEditor');
			return;
		} else if (this._domNode.clAssList.contAins('hiddenEditor')) {
			this._domNode.clAssList.remove('hiddenEditor');
		}

		const editorWidth = lAyoutInfo.width;
		const minimApWidth = lAyoutInfo.minimAp.minimApWidth;
		let collApsedFindWidget = fAlse;
		let reducedFindWidget = fAlse;
		let nArrowFindWidget = fAlse;

		if (this._resized) {
			let widgetWidth = dom.getTotAlWidth(this._domNode);

			if (widgetWidth > FIND_WIDGET_INITIAL_WIDTH) {
				// As the widget is resized by users, we mAy need to chAnge the mAx width of the widget As the editor width chAnges.
				this._domNode.style.mAxWidth = `${editorWidth - 28 - minimApWidth - 15}px`;
				this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
				return;
			}
		}

		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimApWidth >= editorWidth) {
			reducedFindWidget = true;
		}
		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimApWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth) {
			nArrowFindWidget = true;
		}
		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimApWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth + 50) {
			collApsedFindWidget = true;
		}
		this._domNode.clAssList.toggle('collApsed-find-widget', collApsedFindWidget);
		this._domNode.clAssList.toggle('nArrow-find-widget', nArrowFindWidget);
		this._domNode.clAssList.toggle('reduced-find-widget', reducedFindWidget);

		if (!nArrowFindWidget && !collApsedFindWidget) {
			// the minimAl left offset of findwidget is 15px.
			this._domNode.style.mAxWidth = `${editorWidth - 28 - minimApWidth - 15}px`;
		}

		if (this._resized) {
			this._findInput.inputBox.lAyout();
			let findInputWidth = this._findInput.inputBox.element.clientWidth;
			if (findInputWidth > 0) {
				this._replAceInput.width = findInputWidth;
			}
		} else if (this._isReplAceVisible) {
			this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
		}
	}

	privAte _getHeight(): number {
		let totAlheight = 0;

		// find input mArgin top
		totAlheight += 4;

		// find input height
		totAlheight += this._findInput.inputBox.height + 2 /** input box border */;

		if (this._isReplAceVisible) {
			// replAce input mArgin
			totAlheight += 4;

			totAlheight += this._replAceInput.inputBox.height + 2 /** input box border */;
		}

		// mArgin bottom
		totAlheight += 4;
		return totAlheight;
	}

	privAte _tryUpdAteHeight(): booleAn {
		const totAlHeight = this._getHeight();
		if (this._cAchedHeight !== null && this._cAchedHeight === totAlHeight) {
			return fAlse;
		}

		this._cAchedHeight = totAlHeight;
		this._domNode.style.height = `${totAlHeight}px`;

		return true;
	}

	// ----- Public

	public focusFindInput(): void {
		this._findInput.select();
		// Edge browser requires focus() in Addition to select()
		this._findInput.focus();
	}

	public focusReplAceInput(): void {
		this._replAceInput.select();
		// Edge browser requires focus() in Addition to select()
		this._replAceInput.focus();
	}

	public highlightFindOptions(): void {
		this._findInput.highlightFindOptions();
	}

	privAte _updAteSeArchScope(): void {
		if (!this._codeEditor.hAsModel()) {
			return;
		}

		if (this._toggleSelectionFind.checked) {
			let selections = this._codeEditor.getSelections();

			selections.mAp(selection => {
				if (selection.endColumn === 1 && selection.endLineNumber > selection.stArtLineNumber) {
					selection = selection.setEndPosition(
						selection.endLineNumber - 1,
						this._codeEditor.getModel()!.getLineMAxColumn(selection.endLineNumber - 1)
					);
				}
				const currentMAtch = this._stAte.currentMAtch;
				if (selection.stArtLineNumber !== selection.endLineNumber) {
					if (!RAnge.equAlsRAnge(selection, currentMAtch)) {
						return selection;
					}
				}
				return null;
			}).filter(element => !!element);

			if (selections.length) {
				this._stAte.chAnge({ seArchScope: selections As RAnge[] }, true);
			}
		}
	}

	privAte _onFindInputMouseDown(e: IMouseEvent): void {
		// on linux, middle key does pAsting.
		if (e.middleButton) {
			e.stopPropAgAtion();
		}
	}

	privAte _onFindInputKeyDown(e: IKeyboArdEvent): void {
		if (e.equAls(ctrlKeyMod | KeyCode.Enter)) {
			this._findInput.inputBox.insertAtCursor('\n');
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyCode.TAb)) {
			if (this._isReplAceVisible) {
				this._replAceInput.focus();
			} else {
				this._findInput.focusOnCAseSensitive();
			}
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyMod.CtrlCmd | KeyCode.DownArrow)) {
			this._codeEditor.focus();
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyCode.UpArrow)) {
			return stopPropAgAtionForMultiLineUpwArds(e, this._findInput.getVAlue(), this._findInput.domNode.querySelector('textAreA'));
		}

		if (e.equAls(KeyCode.DownArrow)) {
			return stopPropAgAtionForMultiLineDownwArds(e, this._findInput.getVAlue(), this._findInput.domNode.querySelector('textAreA'));
		}
	}

	privAte _onReplAceInputKeyDown(e: IKeyboArdEvent): void {
		if (e.equAls(ctrlKeyMod | KeyCode.Enter)) {
			if (plAtform.isWindows && plAtform.isNAtive && !this._ctrlEnterReplAceAllWArningPrompted) {
				// this is the first time when users press Ctrl + Enter to replAce All
				this._notificAtionService.info(
					nls.locAlize('ctrlEnter.keybindingChAnged',
						'Ctrl+Enter now inserts line breAk insteAd of replAcing All. You cAn modify the keybinding for editor.Action.replAceAll to override this behAvior.')
				);

				this._ctrlEnterReplAceAllWArningPrompted = true;
				this._storAgeService.store(ctrlEnterReplAceAllWArningPromptedKey, true, StorAgeScope.GLOBAL);

			}

			this._replAceInput.inputBox.insertAtCursor('\n');
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyCode.TAb)) {
			this._findInput.focusOnCAseSensitive();
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyMod.Shift | KeyCode.TAb)) {
			this._findInput.focus();
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyMod.CtrlCmd | KeyCode.DownArrow)) {
			this._codeEditor.focus();
			e.preventDefAult();
			return;
		}

		if (e.equAls(KeyCode.UpArrow)) {
			return stopPropAgAtionForMultiLineUpwArds(e, this._replAceInput.inputBox.vAlue, this._replAceInput.inputBox.element.querySelector('textAreA'));
		}

		if (e.equAls(KeyCode.DownArrow)) {
			return stopPropAgAtionForMultiLineDownwArds(e, this._replAceInput.inputBox.vAlue, this._replAceInput.inputBox.element.querySelector('textAreA'));
		}
	}

	// ----- sAsh
	public getVerticAlSAshLeft(_sAsh: SAsh): number {
		return 0;
	}
	// ----- initiAlizAtion

	privAte _keybindingLAbelFor(ActionId: string): string {
		let kb = this._keybindingService.lookupKeybinding(ActionId);
		if (!kb) {
			return '';
		}
		return ` (${kb.getLAbel()})`;
	}

	privAte _buildDomNode(): void {
		const flexibleHeight = true;
		const flexibleWidth = true;
		// Find input
		this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewProvider, {
			width: FIND_INPUT_AREA_WIDTH,
			lAbel: NLS_FIND_INPUT_LABEL,
			plAceholder: NLS_FIND_INPUT_PLACEHOLDER,
			AppendCAseSensitiveLAbel: this._keybindingLAbelFor(FIND_IDS.ToggleCAseSensitiveCommAnd),
			AppendWholeWordsLAbel: this._keybindingLAbelFor(FIND_IDS.ToggleWholeWordCommAnd),
			AppendRegexLAbel: this._keybindingLAbelFor(FIND_IDS.ToggleRegexCommAnd),
			vAlidAtion: (vAlue: string): InputBoxMessAge | null => {
				if (vAlue.length === 0 || !this._findInput.getRegex()) {
					return null;
				}
				try {
					// use `g` And `u` which Are Also used by the TextModel seArch
					new RegExp(vAlue, 'gu');
					return null;
				} cAtch (e) {
					return { content: e.messAge };
				}
			},
			flexibleHeight,
			flexibleWidth,
			flexibleMAxHeight: 118
		}, this._contextKeyService, true));
		this._findInput.setRegex(!!this._stAte.isRegex);
		this._findInput.setCAseSensitive(!!this._stAte.mAtchCAse);
		this._findInput.setWholeWords(!!this._stAte.wholeWord);
		this._register(this._findInput.onKeyDown((e) => this._onFindInputKeyDown(e)));
		this._register(this._findInput.inputBox.onDidChAnge(() => {
			if (this._ignoreChAngeEvent) {
				return;
			}
			this._stAte.chAnge({ seArchString: this._findInput.getVAlue() }, true);
		}));
		this._register(this._findInput.onDidOptionChAnge(() => {
			this._stAte.chAnge({
				isRegex: this._findInput.getRegex(),
				wholeWord: this._findInput.getWholeWords(),
				mAtchCAse: this._findInput.getCAseSensitive()
			}, true);
		}));
		this._register(this._findInput.onCAseSensitiveKeyDown((e) => {
			if (e.equAls(KeyMod.Shift | KeyCode.TAb)) {
				if (this._isReplAceVisible) {
					this._replAceInput.focus();
					e.preventDefAult();
				}
			}
		}));
		this._register(this._findInput.onRegexKeyDown((e) => {
			if (e.equAls(KeyCode.TAb)) {
				if (this._isReplAceVisible) {
					this._replAceInput.focusOnPreserve();
					e.preventDefAult();
				}
			}
		}));
		this._register(this._findInput.inputBox.onDidHeightChAnge((e) => {
			if (this._tryUpdAteHeight()) {
				this._showViewZone();
			}
		}));
		if (plAtform.isLinux) {
			this._register(this._findInput.onMouseDown((e) => this._onFindInputMouseDown(e)));
		}

		this._mAtchesCount = document.creAteElement('div');
		this._mAtchesCount.clAssNAme = 'mAtchesCount';
		this._updAteMAtchesCount();

		// Previous button
		this._prevBtn = this._register(new SimpleButton({
			lAbel: NLS_PREVIOUS_MATCH_BTN_LABEL + this._keybindingLAbelFor(FIND_IDS.PreviousMAtchFindAction),
			clAssNAme: findPreviousMAtchIcon.clAssNAmes,
			onTrigger: () => {
				this._codeEditor.getAction(FIND_IDS.PreviousMAtchFindAction).run().then(undefined, onUnexpectedError);
			}
		}));

		// Next button
		this._nextBtn = this._register(new SimpleButton({
			lAbel: NLS_NEXT_MATCH_BTN_LABEL + this._keybindingLAbelFor(FIND_IDS.NextMAtchFindAction),
			clAssNAme: findNextMAtchIcon.clAssNAmes,
			onTrigger: () => {
				this._codeEditor.getAction(FIND_IDS.NextMAtchFindAction).run().then(undefined, onUnexpectedError);
			}
		}));

		let findPArt = document.creAteElement('div');
		findPArt.clAssNAme = 'find-pArt';
		findPArt.AppendChild(this._findInput.domNode);
		const ActionsContAiner = document.creAteElement('div');
		ActionsContAiner.clAssNAme = 'find-Actions';
		findPArt.AppendChild(ActionsContAiner);
		ActionsContAiner.AppendChild(this._mAtchesCount);
		ActionsContAiner.AppendChild(this._prevBtn.domNode);
		ActionsContAiner.AppendChild(this._nextBtn.domNode);

		// Toggle selection button
		this._toggleSelectionFind = this._register(new Checkbox({
			icon: findSelectionIcon,
			title: NLS_TOGGLE_SELECTION_FIND_TITLE + this._keybindingLAbelFor(FIND_IDS.ToggleSeArchScopeCommAnd),
			isChecked: fAlse
		}));

		this._register(this._toggleSelectionFind.onChAnge(() => {
			if (this._toggleSelectionFind.checked) {
				if (this._codeEditor.hAsModel()) {
					let selections = this._codeEditor.getSelections();
					selections.mAp(selection => {
						if (selection.endColumn === 1 && selection.endLineNumber > selection.stArtLineNumber) {
							selection = selection.setEndPosition(selection.endLineNumber - 1, this._codeEditor.getModel()!.getLineMAxColumn(selection.endLineNumber - 1));
						}
						if (!selection.isEmpty()) {
							return selection;
						}
						return null;
					}).filter(element => !!element);

					if (selections.length) {
						this._stAte.chAnge({ seArchScope: selections As RAnge[] }, true);
					}
				}
			} else {
				this._stAte.chAnge({ seArchScope: null }, true);
			}
		}));

		ActionsContAiner.AppendChild(this._toggleSelectionFind.domNode);

		// Close button
		this._closeBtn = this._register(new SimpleButton({
			lAbel: NLS_CLOSE_BTN_LABEL + this._keybindingLAbelFor(FIND_IDS.CloseFindWidgetCommAnd),
			clAssNAme: findCloseIcon.clAssNAmes,
			onTrigger: () => {
				this._stAte.chAnge({ isReveAled: fAlse, seArchScope: null }, fAlse);
			},
			onKeyDown: (e) => {
				if (e.equAls(KeyCode.TAb)) {
					if (this._isReplAceVisible) {
						if (this._replAceBtn.isEnAbled()) {
							this._replAceBtn.focus();
						} else {
							this._codeEditor.focus();
						}
						e.preventDefAult();
					}
				}
			}
		}));

		ActionsContAiner.AppendChild(this._closeBtn.domNode);

		// ReplAce input
		this._replAceInput = this._register(new ContextScopedReplAceInput(null, undefined, {
			lAbel: NLS_REPLACE_INPUT_LABEL,
			plAceholder: NLS_REPLACE_INPUT_PLACEHOLDER,
			AppendPreserveCAseLAbel: this._keybindingLAbelFor(FIND_IDS.TogglePreserveCAseCommAnd),
			history: [],
			flexibleHeight,
			flexibleWidth,
			flexibleMAxHeight: 118
		}, this._contextKeyService, true));
		this._replAceInput.setPreserveCAse(!!this._stAte.preserveCAse);
		this._register(this._replAceInput.onKeyDown((e) => this._onReplAceInputKeyDown(e)));
		this._register(this._replAceInput.inputBox.onDidChAnge(() => {
			this._stAte.chAnge({ replAceString: this._replAceInput.inputBox.vAlue }, fAlse);
		}));
		this._register(this._replAceInput.inputBox.onDidHeightChAnge((e) => {
			if (this._isReplAceVisible && this._tryUpdAteHeight()) {
				this._showViewZone();
			}
		}));
		this._register(this._replAceInput.onDidOptionChAnge(() => {
			this._stAte.chAnge({
				preserveCAse: this._replAceInput.getPreserveCAse()
			}, true);
		}));
		this._register(this._replAceInput.onPreserveCAseKeyDown((e) => {
			if (e.equAls(KeyCode.TAb)) {
				if (this._prevBtn.isEnAbled()) {
					this._prevBtn.focus();
				} else if (this._nextBtn.isEnAbled()) {
					this._nextBtn.focus();
				} else if (this._toggleSelectionFind.enAbled) {
					this._toggleSelectionFind.focus();
				} else if (this._closeBtn.isEnAbled()) {
					this._closeBtn.focus();
				}

				e.preventDefAult();
			}
		}));

		// ReplAce one button
		this._replAceBtn = this._register(new SimpleButton({
			lAbel: NLS_REPLACE_BTN_LABEL + this._keybindingLAbelFor(FIND_IDS.ReplAceOneAction),
			clAssNAme: findReplAceIcon.clAssNAmes,
			onTrigger: () => {
				this._controller.replAce();
			},
			onKeyDown: (e) => {
				if (e.equAls(KeyMod.Shift | KeyCode.TAb)) {
					this._closeBtn.focus();
					e.preventDefAult();
				}
			}
		}));

		// ReplAce All button
		this._replAceAllBtn = this._register(new SimpleButton({
			lAbel: NLS_REPLACE_ALL_BTN_LABEL + this._keybindingLAbelFor(FIND_IDS.ReplAceAllAction),
			clAssNAme: findReplAceAllIcon.clAssNAmes,
			onTrigger: () => {
				this._controller.replAceAll();
			}
		}));

		let replAcePArt = document.creAteElement('div');
		replAcePArt.clAssNAme = 'replAce-pArt';
		replAcePArt.AppendChild(this._replAceInput.domNode);

		const replAceActionsContAiner = document.creAteElement('div');
		replAceActionsContAiner.clAssNAme = 'replAce-Actions';
		replAcePArt.AppendChild(replAceActionsContAiner);

		replAceActionsContAiner.AppendChild(this._replAceBtn.domNode);
		replAceActionsContAiner.AppendChild(this._replAceAllBtn.domNode);

		// Toggle replAce button
		this._toggleReplAceBtn = this._register(new SimpleButton({
			lAbel: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
			clAssNAme: 'codicon toggle left',
			onTrigger: () => {
				this._stAte.chAnge({ isReplAceReveAled: !this._isReplAceVisible }, fAlse);
				if (this._isReplAceVisible) {
					this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
					this._replAceInput.inputBox.lAyout();
				}
				this._showViewZone();
			}
		}));
		this._toggleReplAceBtn.setExpAnded(this._isReplAceVisible);

		// Widget
		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'editor-widget find-widget';
		this._domNode.setAttribute('AriA-hidden', 'true');
		// We need to set this explicitly, otherwise on IE11, the width inheritence of flex doesn't work.
		this._domNode.style.width = `${FIND_WIDGET_INITIAL_WIDTH}px`;

		this._domNode.AppendChild(this._toggleReplAceBtn.domNode);
		this._domNode.AppendChild(findPArt);
		this._domNode.AppendChild(replAcePArt);

		this._resizeSAsh = new SAsh(this._domNode, this, { orientAtion: OrientAtion.VERTICAL, size: 2 });
		this._resized = fAlse;
		let originAlWidth = FIND_WIDGET_INITIAL_WIDTH;

		this._register(this._resizeSAsh.onDidStArt(() => {
			originAlWidth = dom.getTotAlWidth(this._domNode);
		}));

		this._register(this._resizeSAsh.onDidChAnge((evt: ISAshEvent) => {
			this._resized = true;
			let width = originAlWidth + evt.stArtX - evt.currentX;

			if (width < FIND_WIDGET_INITIAL_WIDTH) {
				// nArrow down the find widget should be hAndled by CSS.
				return;
			}

			const mAxWidth = pArseFloAt(dom.getComputedStyle(this._domNode).mAxWidth!) || 0;
			if (width > mAxWidth) {
				return;
			}
			this._domNode.style.width = `${width}px`;
			if (this._isReplAceVisible) {
				this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
			}

			this._findInput.inputBox.lAyout();
			this._tryUpdAteHeight();
		}));

		this._register(this._resizeSAsh.onDidReset(() => {
			// users double click on the sAsh
			const currentWidth = dom.getTotAlWidth(this._domNode);

			if (currentWidth < FIND_WIDGET_INITIAL_WIDTH) {
				// The editor is nArrow And the width of the find widget is controlled fully by CSS.
				return;
			}

			let width = FIND_WIDGET_INITIAL_WIDTH;

			if (!this._resized || currentWidth === FIND_WIDGET_INITIAL_WIDTH) {
				// 1. never resized before, double click should mAximizes it
				// 2. users resized it AlreAdy but its width is the sAme As defAult
				const lAyoutInfo = this._codeEditor.getLAyoutInfo();
				width = lAyoutInfo.width - 28 - lAyoutInfo.minimAp.minimApWidth - 15;
				this._resized = true;
			} else {
				/**
				 * no op, the find widget should be shrinked to its defAult size.
				 */
			}


			this._domNode.style.width = `${width}px`;
			if (this._isReplAceVisible) {
				this._replAceInput.width = dom.getTotAlWidth(this._findInput.domNode);
			}

			this._findInput.inputBox.lAyout();
		}));
	}

	privAte updAteAccessibilitySupport(): void {
		const vAlue = this._codeEditor.getOption(EditorOption.AccessibilitySupport);
		this._findInput.setFocusInputOnOptionClick(vAlue !== AccessibilitySupport.EnAbled);
	}
}

export interfAce ISimpleButtonOpts {
	reAdonly lAbel: string;
	reAdonly clAssNAme: string;
	reAdonly onTrigger: () => void;
	reAdonly onKeyDown?: (e: IKeyboArdEvent) => void;
}

export clAss SimpleButton extends Widget {

	privAte reAdonly _opts: ISimpleButtonOpts;
	privAte reAdonly _domNode: HTMLElement;

	constructor(opts: ISimpleButtonOpts) {
		super();
		this._opts = opts;

		this._domNode = document.creAteElement('div');
		this._domNode.title = this._opts.lAbel;
		this._domNode.tAbIndex = 0;
		this._domNode.clAssNAme = 'button ' + this._opts.clAssNAme;
		this._domNode.setAttribute('role', 'button');
		this._domNode.setAttribute('AriA-lAbel', this._opts.lAbel);

		this.onclick(this._domNode, (e) => {
			this._opts.onTrigger();
			e.preventDefAult();
		});

		this.onkeydown(this._domNode, (e) => {
			if (e.equAls(KeyCode.SpAce) || e.equAls(KeyCode.Enter)) {
				this._opts.onTrigger();
				e.preventDefAult();
				return;
			}
			if (this._opts.onKeyDown) {
				this._opts.onKeyDown(e);
			}
		});
	}

	public get domNode(): HTMLElement {
		return this._domNode;
	}

	public isEnAbled(): booleAn {
		return (this._domNode.tAbIndex >= 0);
	}

	public focus(): void {
		this._domNode.focus();
	}

	public setEnAbled(enAbled: booleAn): void {
		this._domNode.clAssList.toggle('disAbled', !enAbled);
		this._domNode.setAttribute('AriA-disAbled', String(!enAbled));
		this._domNode.tAbIndex = enAbled ? 0 : -1;
	}

	public setExpAnded(expAnded: booleAn): void {
		this._domNode.setAttribute('AriA-expAnded', String(!!expAnded));
		if (expAnded) {
			this._domNode.clAssList.remove(...findCollApsedIcon.clAssNAmes.split(' '));
			this._domNode.clAssList.Add(...findExpAndedIcon.clAssNAmes.split(' '));
		} else {
			this._domNode.clAssList.remove(...findExpAndedIcon.clAssNAmes.split(' '));
			this._domNode.clAssList.Add(...findCollApsedIcon.clAssNAmes.split(' '));
		}
	}
}

// theming

registerThemingPArticipAnt((theme, collector) => {
	const AddBAckgroundColorRule = (selector: string, color: Color | undefined): void => {
		if (color) {
			collector.AddRule(`.monAco-editor ${selector} { bAckground-color: ${color}; }`);
		}
	};

	AddBAckgroundColorRule('.findMAtch', theme.getColor(editorFindMAtchHighlight));
	AddBAckgroundColorRule('.currentFindMAtch', theme.getColor(editorFindMAtch));
	AddBAckgroundColorRule('.findScope', theme.getColor(editorFindRAngeHighlight));

	const widgetBAckground = theme.getColor(editorWidgetBAckground);
	AddBAckgroundColorRule('.find-widget', widgetBAckground);

	const widgetShAdowColor = theme.getColor(widgetShAdow);
	if (widgetShAdowColor) {
		collector.AddRule(`.monAco-editor .find-widget { box-shAdow: 0 2px 8px ${widgetShAdowColor}; }`);
	}

	const findMAtchHighlightBorder = theme.getColor(editorFindMAtchHighlightBorder);
	if (findMAtchHighlightBorder) {
		collector.AddRule(`.monAco-editor .findMAtch { border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${findMAtchHighlightBorder}; box-sizing: border-box; }`);
	}

	const findMAtchBorder = theme.getColor(editorFindMAtchBorder);
	if (findMAtchBorder) {
		collector.AddRule(`.monAco-editor .currentFindMAtch { border: 2px solid ${findMAtchBorder}; pAdding: 1px; box-sizing: border-box; }`);
	}

	const findRAngeHighlightBorder = theme.getColor(editorFindRAngeHighlightBorder);
	if (findRAngeHighlightBorder) {
		collector.AddRule(`.monAco-editor .findScope { border: 1px ${theme.type === 'hc' ? 'dAshed' : 'solid'} ${findRAngeHighlightBorder}; }`);
	}

	const hcBorder = theme.getColor(contrAstBorder);
	if (hcBorder) {
		collector.AddRule(`.monAco-editor .find-widget { border: 1px solid ${hcBorder}; }`);
	}

	const foreground = theme.getColor(editorWidgetForeground);
	if (foreground) {
		collector.AddRule(`.monAco-editor .find-widget { color: ${foreground}; }`);
	}

	const error = theme.getColor(errorForeground);
	if (error) {
		collector.AddRule(`.monAco-editor .find-widget.no-results .mAtchesCount { color: ${error}; }`);
	}

	const resizeBorderBAckground = theme.getColor(editorWidgetResizeBorder);
	if (resizeBorderBAckground) {
		collector.AddRule(`.monAco-editor .find-widget .monAco-sAsh { bAckground-color: ${resizeBorderBAckground}; }`);
	} else {
		const border = theme.getColor(editorWidgetBorder);
		if (border) {
			collector.AddRule(`.monAco-editor .find-widget .monAco-sAsh { bAckground-color: ${border}; }`);
		}
	}

	// This rule is used to override the outline color for synthetic-focus find input.
	const focusOutline = theme.getColor(focusBorder);
	if (focusOutline) {
		collector.AddRule(`.monAco-editor .find-widget .monAco-inputbox.synthetic-focus { outline-color: ${focusOutline}; }`);

	}
});
