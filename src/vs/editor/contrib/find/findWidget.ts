/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./findWidget';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { alert as alertFn } from 'vs/Base/Browser/ui/aria/aria';
import { CheckBox } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { FindInput, IFindInputStyles } from 'vs/Base/Browser/ui/findinput/findInput';
import { IMessage as InputBoxMessage } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { ReplaceInput } from 'vs/Base/Browser/ui/findinput/replaceInput';
import { IVerticalSashLayoutProvider, ISashEvent, Orientation, Sash } from 'vs/Base/Browser/ui/sash/sash';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Delayer } from 'vs/Base/common/async';
import { Color } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { toDisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition, IViewZone, OverlayWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Range } from 'vs/editor/common/core/range';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_REPLACE_INPUT_FOCUSED, FIND_IDS, MATCHES_LIMIT } from 'vs/editor/contriB/find/findModel';
import { FindReplaceState, FindReplaceStateChangedEvent } from 'vs/editor/contriB/find/findState';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { contrastBorder, editorFindMatch, editorFindMatchBorder, editorFindMatchHighlight, editorFindMatchHighlightBorder, editorFindRangeHighlight, editorFindRangeHighlightBorder, editorWidgetBackground, editorWidgetBorder, editorWidgetResizeBorder, errorForeground, inputActiveOptionBorder, inputActiveOptionBackground, inputActiveOptionForeground, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, inputValidationInfoBackground, inputValidationInfoBorder, inputValidationInfoForeground, inputValidationWarningBackground, inputValidationWarningBorder, inputValidationWarningForeground, widgetShadow, editorWidgetForeground, focusBorder } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { ContextScopedFindInput, ContextScopedReplaceInput } from 'vs/platform/Browser/contextScopedHistoryWidget';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';

const findSelectionIcon = registerIcon('find-selection', Codicon.selection);
const findCollapsedIcon = registerIcon('find-collapsed', Codicon.chevronRight);
const findExpandedIcon = registerIcon('find-expanded', Codicon.chevronDown);

export const findCloseIcon = registerIcon('find-close', Codicon.close);
export const findReplaceIcon = registerIcon('find-replace', Codicon.replace);
export const findReplaceAllIcon = registerIcon('find-replace-all', Codicon.replaceAll);
export const findPreviousMatchIcon = registerIcon('find-previous-match', Codicon.arrowUp);
export const findNextMatchIcon = registerIcon('find-next-match', Codicon.arrowDown);

export interface IFindController {
	replace(): void;
	replaceAll(): void;
	getGloBalBufferTerm(): Promise<string>;
}

const NLS_FIND_INPUT_LABEL = nls.localize('laBel.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('laBel.previousMatchButton', "Previous match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('laBel.nextMatchButton', "Next match");
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.localize('laBel.toggleSelectionFind', "Find in selection");
const NLS_CLOSE_BTN_LABEL = nls.localize('laBel.closeButton', "Close");
const NLS_REPLACE_INPUT_LABEL = nls.localize('laBel.replace', "Replace");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', "Replace");
const NLS_REPLACE_BTN_LABEL = nls.localize('laBel.replaceButton', "Replace");
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('laBel.replaceAllButton', "Replace All");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('laBel.toggleReplaceButton', "Toggle Replace mode");
const NLS_MATCHES_COUNT_LIMIT_TITLE = nls.localize('title.matchesCountLimit', "Only the first {0} results are highlighted, But all find operations work on the entire text.", MATCHES_LIMIT);
const NLS_MATCHES_LOCATION = nls.localize('laBel.matchesLocation', "{0} of {1}");
const NLS_NO_RESULTS = nls.localize('laBel.noResults', "No results");

const FIND_WIDGET_INITIAL_WIDTH = 419;
const PART_WIDTH = 275;
const FIND_INPUT_AREA_WIDTH = PART_WIDTH - 54;

let MAX_MATCHES_COUNT_WIDTH = 69;
// let FIND_ALL_CONTROLS_WIDTH = 17/** Find Input margin-left */ + (MAX_MATCHES_COUNT_WIDTH + 3 + 1) /** Match Results */ + 23 /** Button */ * 4 + 2/** sash */;

const FIND_INPUT_AREA_HEIGHT = 33; // The height of Find Widget when Replace Input is not visiBle.
const ctrlEnterReplaceAllWarningPromptedKey = 'ctrlEnterReplaceAll.windows.donotask';

const ctrlKeyMod = (platform.isMacintosh ? KeyMod.WinCtrl : KeyMod.CtrlCmd);
export class FindWidgetViewZone implements IViewZone {
	puBlic readonly afterLineNumBer: numBer;
	puBlic heightInPx: numBer;
	puBlic readonly suppressMouseDown: Boolean;
	puBlic readonly domNode: HTMLElement;

	constructor(afterLineNumBer: numBer) {
		this.afterLineNumBer = afterLineNumBer;

		this.heightInPx = FIND_INPUT_AREA_HEIGHT;
		this.suppressMouseDown = false;
		this.domNode = document.createElement('div');
		this.domNode.className = 'dock-find-viewzone';
	}
}

function stopPropagationForMultiLineUpwards(event: IKeyBoardEvent, value: string, textarea: HTMLTextAreaElement | null) {
	const isMultiline = !!value.match(/\n/);
	if (textarea && isMultiline && textarea.selectionStart > 0) {
		event.stopPropagation();
		return;
	}
}

function stopPropagationForMultiLineDownwards(event: IKeyBoardEvent, value: string, textarea: HTMLTextAreaElement | null) {
	const isMultiline = !!value.match(/\n/);
	if (textarea && isMultiline && textarea.selectionEnd < textarea.value.length) {
		event.stopPropagation();
		return;
	}
}

export class FindWidget extends Widget implements IOverlayWidget, IVerticalSashLayoutProvider {
	private static readonly ID = 'editor.contriB.findWidget';
	private readonly _codeEditor: ICodeEditor;
	private readonly _state: FindReplaceState;
	private readonly _controller: IFindController;
	private readonly _contextViewProvider: IContextViewProvider;
	private readonly _keyBindingService: IKeyBindingService;
	private readonly _contextKeyService: IContextKeyService;
	private readonly _storageService: IStorageService;
	private readonly _notificationService: INotificationService;

	private _domNode!: HTMLElement;
	private _cachedHeight: numBer | null = null;
	private _findInput!: FindInput;
	private _replaceInput!: ReplaceInput;

	private _toggleReplaceBtn!: SimpleButton;
	private _matchesCount!: HTMLElement;
	private _prevBtn!: SimpleButton;
	private _nextBtn!: SimpleButton;
	private _toggleSelectionFind!: CheckBox;
	private _closeBtn!: SimpleButton;
	private _replaceBtn!: SimpleButton;
	private _replaceAllBtn!: SimpleButton;

	private _isVisiBle: Boolean;
	private _isReplaceVisiBle: Boolean;
	private _ignoreChangeEvent: Boolean;
	private _ctrlEnterReplaceAllWarningPrompted: Boolean;

	private readonly _findFocusTracker: dom.IFocusTracker;
	private readonly _findInputFocused: IContextKey<Boolean>;
	private readonly _replaceFocusTracker: dom.IFocusTracker;
	private readonly _replaceInputFocused: IContextKey<Boolean>;
	private _viewZone?: FindWidgetViewZone;
	private _viewZoneId?: string;

	private _resizeSash!: Sash;
	private _resized!: Boolean;
	private readonly _updateHistoryDelayer: Delayer<void>;

	constructor(
		codeEditor: ICodeEditor,
		controller: IFindController,
		state: FindReplaceState,
		contextViewProvider: IContextViewProvider,
		keyBindingService: IKeyBindingService,
		contextKeyService: IContextKeyService,
		themeService: IThemeService,
		storageService: IStorageService,
		notificationService: INotificationService,
		storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super();
		this._codeEditor = codeEditor;
		this._controller = controller;
		this._state = state;
		this._contextViewProvider = contextViewProvider;
		this._keyBindingService = keyBindingService;
		this._contextKeyService = contextKeyService;
		this._storageService = storageService;
		this._notificationService = notificationService;

		storageKeysSyncRegistryService.registerStorageKey({ key: ctrlEnterReplaceAllWarningPromptedKey, version: 1 });
		this._ctrlEnterReplaceAllWarningPrompted = !!storageService.getBoolean(ctrlEnterReplaceAllWarningPromptedKey, StorageScope.GLOBAL);

		this._isVisiBle = false;
		this._isReplaceVisiBle = false;
		this._ignoreChangeEvent = false;

		this._updateHistoryDelayer = new Delayer<void>(500);
		this._register(toDisposaBle(() => this._updateHistoryDelayer.cancel()));
		this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
		this._BuildDomNode();
		this._updateButtons();
		this._tryUpdateWidgetWidth();
		this._findInput.inputBox.layout();

		this._register(this._codeEditor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.readOnly)) {
				if (this._codeEditor.getOption(EditorOption.readOnly)) {
					// Hide replace part if editor Becomes read only
					this._state.change({ isReplaceRevealed: false }, false);
				}
				this._updateButtons();
			}
			if (e.hasChanged(EditorOption.layoutInfo)) {
				this._tryUpdateWidgetWidth();
			}

			if (e.hasChanged(EditorOption.accessiBilitySupport)) {
				this.updateAccessiBilitySupport();
			}

			if (e.hasChanged(EditorOption.find)) {
				const addExtraSpaceOnTop = this._codeEditor.getOption(EditorOption.find).addExtraSpaceOnTop;
				if (addExtraSpaceOnTop && !this._viewZone) {
					this._viewZone = new FindWidgetViewZone(0);
					this._showViewZone();
				}
				if (!addExtraSpaceOnTop && this._viewZone) {
					this._removeViewZone();
				}
			}
		}));
		this.updateAccessiBilitySupport();
		this._register(this._codeEditor.onDidChangeCursorSelection(() => {
			if (this._isVisiBle) {
				this._updateToggleSelectionFindButton();
			}
		}));
		this._register(this._codeEditor.onDidFocusEditorWidget(async () => {
			if (this._isVisiBle) {
				let gloBalBufferTerm = await this._controller.getGloBalBufferTerm();
				if (gloBalBufferTerm && gloBalBufferTerm !== this._state.searchString) {
					this._state.change({ searchString: gloBalBufferTerm }, true);
					this._findInput.select();
				}
			}
		}));
		this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.BindTo(contextKeyService);
		this._findFocusTracker = this._register(dom.trackFocus(this._findInput.inputBox.inputElement));
		this._register(this._findFocusTracker.onDidFocus(() => {
			this._findInputFocused.set(true);
			this._updateSearchScope();
		}));
		this._register(this._findFocusTracker.onDidBlur(() => {
			this._findInputFocused.set(false);
		}));

		this._replaceInputFocused = CONTEXT_REPLACE_INPUT_FOCUSED.BindTo(contextKeyService);
		this._replaceFocusTracker = this._register(dom.trackFocus(this._replaceInput.inputBox.inputElement));
		this._register(this._replaceFocusTracker.onDidFocus(() => {
			this._replaceInputFocused.set(true);
			this._updateSearchScope();
		}));
		this._register(this._replaceFocusTracker.onDidBlur(() => {
			this._replaceInputFocused.set(false);
		}));

		this._codeEditor.addOverlayWidget(this);
		if (this._codeEditor.getOption(EditorOption.find).addExtraSpaceOnTop) {
			this._viewZone = new FindWidgetViewZone(0); // Put it Before the first line then users can scroll Beyond the first line.
		}

		this._applyTheme(themeService.getColorTheme());
		this._register(themeService.onDidColorThemeChange(this._applyTheme.Bind(this)));

		this._register(this._codeEditor.onDidChangeModel(() => {
			if (!this._isVisiBle) {
				return;
			}
			this._viewZoneId = undefined;
		}));


		this._register(this._codeEditor.onDidScrollChange((e) => {
			if (e.scrollTopChanged) {
				this._layoutViewZone();
				return;
			}

			// for other scroll changes, layout the viewzone in next tick to avoid ruining current rendering.
			setTimeout(() => {
				this._layoutViewZone();
			}, 0);
		}));
	}

	// ----- IOverlayWidget API

	puBlic getId(): string {
		return FindWidget.ID;
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic getPosition(): IOverlayWidgetPosition | null {
		if (this._isVisiBle) {
			return {
				preference: OverlayWidgetPositionPreference.TOP_RIGHT_CORNER
			};
		}
		return null;
	}

	// ----- React to state changes

	private _onStateChanged(e: FindReplaceStateChangedEvent): void {
		if (e.searchString) {
			try {
				this._ignoreChangeEvent = true;
				this._findInput.setValue(this._state.searchString);
			} finally {
				this._ignoreChangeEvent = false;
			}
			this._updateButtons();
		}
		if (e.replaceString) {
			this._replaceInput.inputBox.value = this._state.replaceString;
		}
		if (e.isRevealed) {
			if (this._state.isRevealed) {
				this._reveal();
			} else {
				this._hide(true);
			}
		}
		if (e.isReplaceRevealed) {
			if (this._state.isReplaceRevealed) {
				if (!this._codeEditor.getOption(EditorOption.readOnly) && !this._isReplaceVisiBle) {
					this._isReplaceVisiBle = true;
					this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
					this._updateButtons();
					this._replaceInput.inputBox.layout();
				}
			} else {
				if (this._isReplaceVisiBle) {
					this._isReplaceVisiBle = false;
					this._updateButtons();
				}
			}
		}
		if ((e.isRevealed || e.isReplaceRevealed) && (this._state.isRevealed || this._state.isReplaceRevealed)) {
			if (this._tryUpdateHeight()) {
				this._showViewZone();
			}
		}

		if (e.isRegex) {
			this._findInput.setRegex(this._state.isRegex);
		}
		if (e.wholeWord) {
			this._findInput.setWholeWords(this._state.wholeWord);
		}
		if (e.matchCase) {
			this._findInput.setCaseSensitive(this._state.matchCase);
		}
		if (e.preserveCase) {
			this._replaceInput.setPreserveCase(this._state.preserveCase);
		}
		if (e.searchScope) {
			if (this._state.searchScope) {
				this._toggleSelectionFind.checked = true;
			} else {
				this._toggleSelectionFind.checked = false;
			}
			this._updateToggleSelectionFindButton();
		}
		if (e.searchString || e.matchesCount || e.matchesPosition) {
			let showRedOutline = (this._state.searchString.length > 0 && this._state.matchesCount === 0);
			this._domNode.classList.toggle('no-results', showRedOutline);

			this._updateMatchesCount();
			this._updateButtons();
		}
		if (e.searchString || e.currentMatch) {
			this._layoutViewZone();
		}
		if (e.updateHistory) {
			this._delayedUpdateHistory();
		}
		if (e.loop) {
			this._updateButtons();
		}
	}

	private _delayedUpdateHistory() {
		this._updateHistoryDelayer.trigger(this._updateHistory.Bind(this));
	}

	private _updateHistory() {
		if (this._state.searchString) {
			this._findInput.inputBox.addToHistory();
		}
		if (this._state.replaceString) {
			this._replaceInput.inputBox.addToHistory();
		}
	}

	private _updateMatchesCount(): void {
		this._matchesCount.style.minWidth = MAX_MATCHES_COUNT_WIDTH + 'px';
		if (this._state.matchesCount >= MATCHES_LIMIT) {
			this._matchesCount.title = NLS_MATCHES_COUNT_LIMIT_TITLE;
		} else {
			this._matchesCount.title = '';
		}

		// remove previous content
		if (this._matchesCount.firstChild) {
			this._matchesCount.removeChild(this._matchesCount.firstChild);
		}

		let laBel: string;
		if (this._state.matchesCount > 0) {
			let matchesCount: string = String(this._state.matchesCount);
			if (this._state.matchesCount >= MATCHES_LIMIT) {
				matchesCount += '+';
			}
			let matchesPosition: string = String(this._state.matchesPosition);
			if (matchesPosition === '0') {
				matchesPosition = '?';
			}
			laBel = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
		} else {
			laBel = NLS_NO_RESULTS;
		}

		this._matchesCount.appendChild(document.createTextNode(laBel));

		alertFn(this._getAriaLaBel(laBel, this._state.currentMatch, this._state.searchString));
		MAX_MATCHES_COUNT_WIDTH = Math.max(MAX_MATCHES_COUNT_WIDTH, this._matchesCount.clientWidth);
	}

	// ----- actions

	private _getAriaLaBel(laBel: string, currentMatch: Range | null, searchString: string): string {
		if (laBel === NLS_NO_RESULTS) {
			return searchString === ''
				? nls.localize('ariaSearchNoResultEmpty', "{0} found", laBel)
				: nls.localize('ariaSearchNoResult', "{0} found for '{1}'", laBel, searchString);
		}
		if (currentMatch) {
			const ariaLaBel = nls.localize('ariaSearchNoResultWithLineNum', "{0} found for '{1}', at {2}", laBel, searchString, currentMatch.startLineNumBer + ':' + currentMatch.startColumn);
			const model = this._codeEditor.getModel();
			if (model && (currentMatch.startLineNumBer <= model.getLineCount()) && (currentMatch.startLineNumBer >= 1)) {
				const lineContent = model.getLineContent(currentMatch.startLineNumBer);
				return `${lineContent}, ${ariaLaBel}`;
			}

			return ariaLaBel;
		}

		return nls.localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", laBel, searchString);
	}

	/**
	 * If 'selection find' is ON we should not disaBle the Button (its function is to cancel 'selection find').
	 * If 'selection find' is OFF we enaBle the Button only if there is a selection.
	 */
	private _updateToggleSelectionFindButton(): void {
		let selection = this._codeEditor.getSelection();
		let isSelection = selection ? (selection.startLineNumBer !== selection.endLineNumBer || selection.startColumn !== selection.endColumn) : false;
		let isChecked = this._toggleSelectionFind.checked;

		if (this._isVisiBle && (isChecked || isSelection)) {
			this._toggleSelectionFind.enaBle();
		} else {
			this._toggleSelectionFind.disaBle();
		}
	}

	private _updateButtons(): void {
		this._findInput.setEnaBled(this._isVisiBle);
		this._replaceInput.setEnaBled(this._isVisiBle && this._isReplaceVisiBle);
		this._updateToggleSelectionFindButton();
		this._closeBtn.setEnaBled(this._isVisiBle);

		let findInputIsNonEmpty = (this._state.searchString.length > 0);
		let matchesCount = this._state.matchesCount ? true : false;
		this._prevBtn.setEnaBled(this._isVisiBle && findInputIsNonEmpty && matchesCount && this._state.canNavigateBack());
		this._nextBtn.setEnaBled(this._isVisiBle && findInputIsNonEmpty && matchesCount && this._state.canNavigateForward());
		this._replaceBtn.setEnaBled(this._isVisiBle && this._isReplaceVisiBle && findInputIsNonEmpty);
		this._replaceAllBtn.setEnaBled(this._isVisiBle && this._isReplaceVisiBle && findInputIsNonEmpty);

		this._domNode.classList.toggle('replaceToggled', this._isReplaceVisiBle);
		this._toggleReplaceBtn.setExpanded(this._isReplaceVisiBle);

		let canReplace = !this._codeEditor.getOption(EditorOption.readOnly);
		this._toggleReplaceBtn.setEnaBled(this._isVisiBle && canReplace);
	}

	private _reveal(): void {
		if (!this._isVisiBle) {
			this._isVisiBle = true;

			const selection = this._codeEditor.getSelection();

			switch (this._codeEditor.getOption(EditorOption.find).autoFindInSelection) {
				case 'always':
					this._toggleSelectionFind.checked = true;
					Break;
				case 'never':
					this._toggleSelectionFind.checked = false;
					Break;
				case 'multiline':
					const isSelectionMultipleLine = !!selection && selection.startLineNumBer !== selection.endLineNumBer;
					this._toggleSelectionFind.checked = isSelectionMultipleLine;
					Break;

				default:
					Break;
			}

			this._tryUpdateWidgetWidth();
			this._updateButtons();

			setTimeout(() => {
				this._domNode.classList.add('visiBle');
				this._domNode.setAttriBute('aria-hidden', 'false');
			}, 0);

			// validate query again as it's Being dismissed when we hide the find widget.
			setTimeout(() => {
				this._findInput.validate();
			}, 200);

			this._codeEditor.layoutOverlayWidget(this);

			let adjustEditorScrollTop = true;
			if (this._codeEditor.getOption(EditorOption.find).seedSearchStringFromSelection && selection) {
				const domNode = this._codeEditor.getDomNode();
				if (domNode) {
					const editorCoords = dom.getDomNodePagePosition(domNode);
					const startCoords = this._codeEditor.getScrolledVisiBlePosition(selection.getStartPosition());
					const startLeft = editorCoords.left + (startCoords ? startCoords.left : 0);
					const startTop = startCoords ? startCoords.top : 0;

					if (this._viewZone && startTop < this._viewZone.heightInPx) {
						if (selection.endLineNumBer > selection.startLineNumBer) {
							adjustEditorScrollTop = false;
						}

						const leftOfFindWidget = dom.getTopLeftOffset(this._domNode).left;
						if (startLeft > leftOfFindWidget) {
							adjustEditorScrollTop = false;
						}
						const endCoords = this._codeEditor.getScrolledVisiBlePosition(selection.getEndPosition());
						const endLeft = editorCoords.left + (endCoords ? endCoords.left : 0);
						if (endLeft > leftOfFindWidget) {
							adjustEditorScrollTop = false;
						}
					}
				}
			}
			this._showViewZone(adjustEditorScrollTop);
		}
	}

	private _hide(focusTheEditor: Boolean): void {
		if (this._isVisiBle) {
			this._isVisiBle = false;

			this._updateButtons();

			this._domNode.classList.remove('visiBle');
			this._domNode.setAttriBute('aria-hidden', 'true');
			this._findInput.clearMessage();
			if (focusTheEditor) {
				this._codeEditor.focus();
			}
			this._codeEditor.layoutOverlayWidget(this);
			this._removeViewZone();
		}
	}

	private _layoutViewZone() {
		const addExtraSpaceOnTop = this._codeEditor.getOption(EditorOption.find).addExtraSpaceOnTop;

		if (!addExtraSpaceOnTop) {
			this._removeViewZone();
			return;
		}

		if (!this._isVisiBle) {
			return;
		}
		const viewZone = this._viewZone;
		if (this._viewZoneId !== undefined || !viewZone) {
			return;
		}

		this._codeEditor.changeViewZones((accessor) => {
			viewZone.heightInPx = this._getHeight();
			this._viewZoneId = accessor.addZone(viewZone);
			// scroll top adjust to make sure the editor doesn't scroll when adding viewzone at the Beginning.
			this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + viewZone.heightInPx);
		});
	}

	private _showViewZone(adjustScroll: Boolean = true) {
		if (!this._isVisiBle) {
			return;
		}

		const addExtraSpaceOnTop = this._codeEditor.getOption(EditorOption.find).addExtraSpaceOnTop;

		if (!addExtraSpaceOnTop) {
			return;
		}

		if (this._viewZone === undefined) {
			this._viewZone = new FindWidgetViewZone(0);
		}

		const viewZone = this._viewZone;

		this._codeEditor.changeViewZones((accessor) => {
			if (this._viewZoneId !== undefined) {
				// the view zone already exists, we need to update the height
				const newHeight = this._getHeight();
				if (newHeight === viewZone.heightInPx) {
					return;
				}

				let scrollAdjustment = newHeight - viewZone.heightInPx;
				viewZone.heightInPx = newHeight;
				accessor.layoutZone(this._viewZoneId);

				if (adjustScroll) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
				}

				return;
			} else {
				let scrollAdjustment = this._getHeight();

				// if the editor has top padding, factor that into the zone height
				scrollAdjustment -= this._codeEditor.getOption(EditorOption.padding).top;
				if (scrollAdjustment <= 0) {
					return;
				}

				viewZone.heightInPx = scrollAdjustment;
				this._viewZoneId = accessor.addZone(viewZone);

				if (adjustScroll) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
				}
			}
		});
	}

	private _removeViewZone() {
		this._codeEditor.changeViewZones((accessor) => {
			if (this._viewZoneId !== undefined) {
				accessor.removeZone(this._viewZoneId);
				this._viewZoneId = undefined;
				if (this._viewZone) {
					this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() - this._viewZone.heightInPx);
					this._viewZone = undefined;
				}
			}
		});
	}

	private _applyTheme(theme: IColorTheme) {
		let inputStyles: IFindInputStyles = {
			inputActiveOptionBorder: theme.getColor(inputActiveOptionBorder),
			inputActiveOptionBackground: theme.getColor(inputActiveOptionBackground),
			inputActiveOptionForeground: theme.getColor(inputActiveOptionForeground),
			inputBackground: theme.getColor(inputBackground),
			inputForeground: theme.getColor(inputForeground),
			inputBorder: theme.getColor(inputBorder),
			inputValidationInfoBackground: theme.getColor(inputValidationInfoBackground),
			inputValidationInfoForeground: theme.getColor(inputValidationInfoForeground),
			inputValidationInfoBorder: theme.getColor(inputValidationInfoBorder),
			inputValidationWarningBackground: theme.getColor(inputValidationWarningBackground),
			inputValidationWarningForeground: theme.getColor(inputValidationWarningForeground),
			inputValidationWarningBorder: theme.getColor(inputValidationWarningBorder),
			inputValidationErrorBackground: theme.getColor(inputValidationErrorBackground),
			inputValidationErrorForeground: theme.getColor(inputValidationErrorForeground),
			inputValidationErrorBorder: theme.getColor(inputValidationErrorBorder),
		};
		this._findInput.style(inputStyles);
		this._replaceInput.style(inputStyles);
		this._toggleSelectionFind.style(inputStyles);
	}

	private _tryUpdateWidgetWidth() {
		if (!this._isVisiBle) {
			return;
		}
		if (!dom.isInDOM(this._domNode)) {
			// the widget is not in the DOM
			return;
		}

		const layoutInfo = this._codeEditor.getLayoutInfo();
		const editorContentWidth = layoutInfo.contentWidth;

		if (editorContentWidth <= 0) {
			// for example, diff view original editor
			this._domNode.classList.add('hiddenEditor');
			return;
		} else if (this._domNode.classList.contains('hiddenEditor')) {
			this._domNode.classList.remove('hiddenEditor');
		}

		const editorWidth = layoutInfo.width;
		const minimapWidth = layoutInfo.minimap.minimapWidth;
		let collapsedFindWidget = false;
		let reducedFindWidget = false;
		let narrowFindWidget = false;

		if (this._resized) {
			let widgetWidth = dom.getTotalWidth(this._domNode);

			if (widgetWidth > FIND_WIDGET_INITIAL_WIDTH) {
				// as the widget is resized By users, we may need to change the max width of the widget as the editor width changes.
				this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
				this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
				return;
			}
		}

		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth >= editorWidth) {
			reducedFindWidget = true;
		}
		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth) {
			narrowFindWidget = true;
		}
		if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth + 50) {
			collapsedFindWidget = true;
		}
		this._domNode.classList.toggle('collapsed-find-widget', collapsedFindWidget);
		this._domNode.classList.toggle('narrow-find-widget', narrowFindWidget);
		this._domNode.classList.toggle('reduced-find-widget', reducedFindWidget);

		if (!narrowFindWidget && !collapsedFindWidget) {
			// the minimal left offset of findwidget is 15px.
			this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
		}

		if (this._resized) {
			this._findInput.inputBox.layout();
			let findInputWidth = this._findInput.inputBox.element.clientWidth;
			if (findInputWidth > 0) {
				this._replaceInput.width = findInputWidth;
			}
		} else if (this._isReplaceVisiBle) {
			this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
		}
	}

	private _getHeight(): numBer {
		let totalheight = 0;

		// find input margin top
		totalheight += 4;

		// find input height
		totalheight += this._findInput.inputBox.height + 2 /** input Box Border */;

		if (this._isReplaceVisiBle) {
			// replace input margin
			totalheight += 4;

			totalheight += this._replaceInput.inputBox.height + 2 /** input Box Border */;
		}

		// margin Bottom
		totalheight += 4;
		return totalheight;
	}

	private _tryUpdateHeight(): Boolean {
		const totalHeight = this._getHeight();
		if (this._cachedHeight !== null && this._cachedHeight === totalHeight) {
			return false;
		}

		this._cachedHeight = totalHeight;
		this._domNode.style.height = `${totalHeight}px`;

		return true;
	}

	// ----- PuBlic

	puBlic focusFindInput(): void {
		this._findInput.select();
		// Edge Browser requires focus() in addition to select()
		this._findInput.focus();
	}

	puBlic focusReplaceInput(): void {
		this._replaceInput.select();
		// Edge Browser requires focus() in addition to select()
		this._replaceInput.focus();
	}

	puBlic highlightFindOptions(): void {
		this._findInput.highlightFindOptions();
	}

	private _updateSearchScope(): void {
		if (!this._codeEditor.hasModel()) {
			return;
		}

		if (this._toggleSelectionFind.checked) {
			let selections = this._codeEditor.getSelections();

			selections.map(selection => {
				if (selection.endColumn === 1 && selection.endLineNumBer > selection.startLineNumBer) {
					selection = selection.setEndPosition(
						selection.endLineNumBer - 1,
						this._codeEditor.getModel()!.getLineMaxColumn(selection.endLineNumBer - 1)
					);
				}
				const currentMatch = this._state.currentMatch;
				if (selection.startLineNumBer !== selection.endLineNumBer) {
					if (!Range.equalsRange(selection, currentMatch)) {
						return selection;
					}
				}
				return null;
			}).filter(element => !!element);

			if (selections.length) {
				this._state.change({ searchScope: selections as Range[] }, true);
			}
		}
	}

	private _onFindInputMouseDown(e: IMouseEvent): void {
		// on linux, middle key does pasting.
		if (e.middleButton) {
			e.stopPropagation();
		}
	}

	private _onFindInputKeyDown(e: IKeyBoardEvent): void {
		if (e.equals(ctrlKeyMod | KeyCode.Enter)) {
			this._findInput.inputBox.insertAtCursor('\n');
			e.preventDefault();
			return;
		}

		if (e.equals(KeyCode.TaB)) {
			if (this._isReplaceVisiBle) {
				this._replaceInput.focus();
			} else {
				this._findInput.focusOnCaseSensitive();
			}
			e.preventDefault();
			return;
		}

		if (e.equals(KeyMod.CtrlCmd | KeyCode.DownArrow)) {
			this._codeEditor.focus();
			e.preventDefault();
			return;
		}

		if (e.equals(KeyCode.UpArrow)) {
			return stopPropagationForMultiLineUpwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
		}

		if (e.equals(KeyCode.DownArrow)) {
			return stopPropagationForMultiLineDownwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
		}
	}

	private _onReplaceInputKeyDown(e: IKeyBoardEvent): void {
		if (e.equals(ctrlKeyMod | KeyCode.Enter)) {
			if (platform.isWindows && platform.isNative && !this._ctrlEnterReplaceAllWarningPrompted) {
				// this is the first time when users press Ctrl + Enter to replace all
				this._notificationService.info(
					nls.localize('ctrlEnter.keyBindingChanged',
						'Ctrl+Enter now inserts line Break instead of replacing all. You can modify the keyBinding for editor.action.replaceAll to override this Behavior.')
				);

				this._ctrlEnterReplaceAllWarningPrompted = true;
				this._storageService.store(ctrlEnterReplaceAllWarningPromptedKey, true, StorageScope.GLOBAL);

			}

			this._replaceInput.inputBox.insertAtCursor('\n');
			e.preventDefault();
			return;
		}

		if (e.equals(KeyCode.TaB)) {
			this._findInput.focusOnCaseSensitive();
			e.preventDefault();
			return;
		}

		if (e.equals(KeyMod.Shift | KeyCode.TaB)) {
			this._findInput.focus();
			e.preventDefault();
			return;
		}

		if (e.equals(KeyMod.CtrlCmd | KeyCode.DownArrow)) {
			this._codeEditor.focus();
			e.preventDefault();
			return;
		}

		if (e.equals(KeyCode.UpArrow)) {
			return stopPropagationForMultiLineUpwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
		}

		if (e.equals(KeyCode.DownArrow)) {
			return stopPropagationForMultiLineDownwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
		}
	}

	// ----- sash
	puBlic getVerticalSashLeft(_sash: Sash): numBer {
		return 0;
	}
	// ----- initialization

	private _keyBindingLaBelFor(actionId: string): string {
		let kB = this._keyBindingService.lookupKeyBinding(actionId);
		if (!kB) {
			return '';
		}
		return ` (${kB.getLaBel()})`;
	}

	private _BuildDomNode(): void {
		const flexiBleHeight = true;
		const flexiBleWidth = true;
		// Find input
		this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewProvider, {
			width: FIND_INPUT_AREA_WIDTH,
			laBel: NLS_FIND_INPUT_LABEL,
			placeholder: NLS_FIND_INPUT_PLACEHOLDER,
			appendCaseSensitiveLaBel: this._keyBindingLaBelFor(FIND_IDS.ToggleCaseSensitiveCommand),
			appendWholeWordsLaBel: this._keyBindingLaBelFor(FIND_IDS.ToggleWholeWordCommand),
			appendRegexLaBel: this._keyBindingLaBelFor(FIND_IDS.ToggleRegexCommand),
			validation: (value: string): InputBoxMessage | null => {
				if (value.length === 0 || !this._findInput.getRegex()) {
					return null;
				}
				try {
					// use `g` and `u` which are also used By the TextModel search
					new RegExp(value, 'gu');
					return null;
				} catch (e) {
					return { content: e.message };
				}
			},
			flexiBleHeight,
			flexiBleWidth,
			flexiBleMaxHeight: 118
		}, this._contextKeyService, true));
		this._findInput.setRegex(!!this._state.isRegex);
		this._findInput.setCaseSensitive(!!this._state.matchCase);
		this._findInput.setWholeWords(!!this._state.wholeWord);
		this._register(this._findInput.onKeyDown((e) => this._onFindInputKeyDown(e)));
		this._register(this._findInput.inputBox.onDidChange(() => {
			if (this._ignoreChangeEvent) {
				return;
			}
			this._state.change({ searchString: this._findInput.getValue() }, true);
		}));
		this._register(this._findInput.onDidOptionChange(() => {
			this._state.change({
				isRegex: this._findInput.getRegex(),
				wholeWord: this._findInput.getWholeWords(),
				matchCase: this._findInput.getCaseSensitive()
			}, true);
		}));
		this._register(this._findInput.onCaseSensitiveKeyDown((e) => {
			if (e.equals(KeyMod.Shift | KeyCode.TaB)) {
				if (this._isReplaceVisiBle) {
					this._replaceInput.focus();
					e.preventDefault();
				}
			}
		}));
		this._register(this._findInput.onRegexKeyDown((e) => {
			if (e.equals(KeyCode.TaB)) {
				if (this._isReplaceVisiBle) {
					this._replaceInput.focusOnPreserve();
					e.preventDefault();
				}
			}
		}));
		this._register(this._findInput.inputBox.onDidHeightChange((e) => {
			if (this._tryUpdateHeight()) {
				this._showViewZone();
			}
		}));
		if (platform.isLinux) {
			this._register(this._findInput.onMouseDown((e) => this._onFindInputMouseDown(e)));
		}

		this._matchesCount = document.createElement('div');
		this._matchesCount.className = 'matchesCount';
		this._updateMatchesCount();

		// Previous Button
		this._prevBtn = this._register(new SimpleButton({
			laBel: NLS_PREVIOUS_MATCH_BTN_LABEL + this._keyBindingLaBelFor(FIND_IDS.PreviousMatchFindAction),
			className: findPreviousMatchIcon.classNames,
			onTrigger: () => {
				this._codeEditor.getAction(FIND_IDS.PreviousMatchFindAction).run().then(undefined, onUnexpectedError);
			}
		}));

		// Next Button
		this._nextBtn = this._register(new SimpleButton({
			laBel: NLS_NEXT_MATCH_BTN_LABEL + this._keyBindingLaBelFor(FIND_IDS.NextMatchFindAction),
			className: findNextMatchIcon.classNames,
			onTrigger: () => {
				this._codeEditor.getAction(FIND_IDS.NextMatchFindAction).run().then(undefined, onUnexpectedError);
			}
		}));

		let findPart = document.createElement('div');
		findPart.className = 'find-part';
		findPart.appendChild(this._findInput.domNode);
		const actionsContainer = document.createElement('div');
		actionsContainer.className = 'find-actions';
		findPart.appendChild(actionsContainer);
		actionsContainer.appendChild(this._matchesCount);
		actionsContainer.appendChild(this._prevBtn.domNode);
		actionsContainer.appendChild(this._nextBtn.domNode);

		// Toggle selection Button
		this._toggleSelectionFind = this._register(new CheckBox({
			icon: findSelectionIcon,
			title: NLS_TOGGLE_SELECTION_FIND_TITLE + this._keyBindingLaBelFor(FIND_IDS.ToggleSearchScopeCommand),
			isChecked: false
		}));

		this._register(this._toggleSelectionFind.onChange(() => {
			if (this._toggleSelectionFind.checked) {
				if (this._codeEditor.hasModel()) {
					let selections = this._codeEditor.getSelections();
					selections.map(selection => {
						if (selection.endColumn === 1 && selection.endLineNumBer > selection.startLineNumBer) {
							selection = selection.setEndPosition(selection.endLineNumBer - 1, this._codeEditor.getModel()!.getLineMaxColumn(selection.endLineNumBer - 1));
						}
						if (!selection.isEmpty()) {
							return selection;
						}
						return null;
					}).filter(element => !!element);

					if (selections.length) {
						this._state.change({ searchScope: selections as Range[] }, true);
					}
				}
			} else {
				this._state.change({ searchScope: null }, true);
			}
		}));

		actionsContainer.appendChild(this._toggleSelectionFind.domNode);

		// Close Button
		this._closeBtn = this._register(new SimpleButton({
			laBel: NLS_CLOSE_BTN_LABEL + this._keyBindingLaBelFor(FIND_IDS.CloseFindWidgetCommand),
			className: findCloseIcon.classNames,
			onTrigger: () => {
				this._state.change({ isRevealed: false, searchScope: null }, false);
			},
			onKeyDown: (e) => {
				if (e.equals(KeyCode.TaB)) {
					if (this._isReplaceVisiBle) {
						if (this._replaceBtn.isEnaBled()) {
							this._replaceBtn.focus();
						} else {
							this._codeEditor.focus();
						}
						e.preventDefault();
					}
				}
			}
		}));

		actionsContainer.appendChild(this._closeBtn.domNode);

		// Replace input
		this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
			laBel: NLS_REPLACE_INPUT_LABEL,
			placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
			appendPreserveCaseLaBel: this._keyBindingLaBelFor(FIND_IDS.TogglePreserveCaseCommand),
			history: [],
			flexiBleHeight,
			flexiBleWidth,
			flexiBleMaxHeight: 118
		}, this._contextKeyService, true));
		this._replaceInput.setPreserveCase(!!this._state.preserveCase);
		this._register(this._replaceInput.onKeyDown((e) => this._onReplaceInputKeyDown(e)));
		this._register(this._replaceInput.inputBox.onDidChange(() => {
			this._state.change({ replaceString: this._replaceInput.inputBox.value }, false);
		}));
		this._register(this._replaceInput.inputBox.onDidHeightChange((e) => {
			if (this._isReplaceVisiBle && this._tryUpdateHeight()) {
				this._showViewZone();
			}
		}));
		this._register(this._replaceInput.onDidOptionChange(() => {
			this._state.change({
				preserveCase: this._replaceInput.getPreserveCase()
			}, true);
		}));
		this._register(this._replaceInput.onPreserveCaseKeyDown((e) => {
			if (e.equals(KeyCode.TaB)) {
				if (this._prevBtn.isEnaBled()) {
					this._prevBtn.focus();
				} else if (this._nextBtn.isEnaBled()) {
					this._nextBtn.focus();
				} else if (this._toggleSelectionFind.enaBled) {
					this._toggleSelectionFind.focus();
				} else if (this._closeBtn.isEnaBled()) {
					this._closeBtn.focus();
				}

				e.preventDefault();
			}
		}));

		// Replace one Button
		this._replaceBtn = this._register(new SimpleButton({
			laBel: NLS_REPLACE_BTN_LABEL + this._keyBindingLaBelFor(FIND_IDS.ReplaceOneAction),
			className: findReplaceIcon.classNames,
			onTrigger: () => {
				this._controller.replace();
			},
			onKeyDown: (e) => {
				if (e.equals(KeyMod.Shift | KeyCode.TaB)) {
					this._closeBtn.focus();
					e.preventDefault();
				}
			}
		}));

		// Replace all Button
		this._replaceAllBtn = this._register(new SimpleButton({
			laBel: NLS_REPLACE_ALL_BTN_LABEL + this._keyBindingLaBelFor(FIND_IDS.ReplaceAllAction),
			className: findReplaceAllIcon.classNames,
			onTrigger: () => {
				this._controller.replaceAll();
			}
		}));

		let replacePart = document.createElement('div');
		replacePart.className = 'replace-part';
		replacePart.appendChild(this._replaceInput.domNode);

		const replaceActionsContainer = document.createElement('div');
		replaceActionsContainer.className = 'replace-actions';
		replacePart.appendChild(replaceActionsContainer);

		replaceActionsContainer.appendChild(this._replaceBtn.domNode);
		replaceActionsContainer.appendChild(this._replaceAllBtn.domNode);

		// Toggle replace Button
		this._toggleReplaceBtn = this._register(new SimpleButton({
			laBel: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
			className: 'codicon toggle left',
			onTrigger: () => {
				this._state.change({ isReplaceRevealed: !this._isReplaceVisiBle }, false);
				if (this._isReplaceVisiBle) {
					this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
					this._replaceInput.inputBox.layout();
				}
				this._showViewZone();
			}
		}));
		this._toggleReplaceBtn.setExpanded(this._isReplaceVisiBle);

		// Widget
		this._domNode = document.createElement('div');
		this._domNode.className = 'editor-widget find-widget';
		this._domNode.setAttriBute('aria-hidden', 'true');
		// We need to set this explicitly, otherwise on IE11, the width inheritence of flex doesn't work.
		this._domNode.style.width = `${FIND_WIDGET_INITIAL_WIDTH}px`;

		this._domNode.appendChild(this._toggleReplaceBtn.domNode);
		this._domNode.appendChild(findPart);
		this._domNode.appendChild(replacePart);

		this._resizeSash = new Sash(this._domNode, this, { orientation: Orientation.VERTICAL, size: 2 });
		this._resized = false;
		let originalWidth = FIND_WIDGET_INITIAL_WIDTH;

		this._register(this._resizeSash.onDidStart(() => {
			originalWidth = dom.getTotalWidth(this._domNode);
		}));

		this._register(this._resizeSash.onDidChange((evt: ISashEvent) => {
			this._resized = true;
			let width = originalWidth + evt.startX - evt.currentX;

			if (width < FIND_WIDGET_INITIAL_WIDTH) {
				// narrow down the find widget should Be handled By CSS.
				return;
			}

			const maxWidth = parseFloat(dom.getComputedStyle(this._domNode).maxWidth!) || 0;
			if (width > maxWidth) {
				return;
			}
			this._domNode.style.width = `${width}px`;
			if (this._isReplaceVisiBle) {
				this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
			}

			this._findInput.inputBox.layout();
			this._tryUpdateHeight();
		}));

		this._register(this._resizeSash.onDidReset(() => {
			// users douBle click on the sash
			const currentWidth = dom.getTotalWidth(this._domNode);

			if (currentWidth < FIND_WIDGET_INITIAL_WIDTH) {
				// The editor is narrow and the width of the find widget is controlled fully By CSS.
				return;
			}

			let width = FIND_WIDGET_INITIAL_WIDTH;

			if (!this._resized || currentWidth === FIND_WIDGET_INITIAL_WIDTH) {
				// 1. never resized Before, douBle click should maximizes it
				// 2. users resized it already But its width is the same as default
				const layoutInfo = this._codeEditor.getLayoutInfo();
				width = layoutInfo.width - 28 - layoutInfo.minimap.minimapWidth - 15;
				this._resized = true;
			} else {
				/**
				 * no op, the find widget should Be shrinked to its default size.
				 */
			}


			this._domNode.style.width = `${width}px`;
			if (this._isReplaceVisiBle) {
				this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
			}

			this._findInput.inputBox.layout();
		}));
	}

	private updateAccessiBilitySupport(): void {
		const value = this._codeEditor.getOption(EditorOption.accessiBilitySupport);
		this._findInput.setFocusInputOnOptionClick(value !== AccessiBilitySupport.EnaBled);
	}
}

export interface ISimpleButtonOpts {
	readonly laBel: string;
	readonly className: string;
	readonly onTrigger: () => void;
	readonly onKeyDown?: (e: IKeyBoardEvent) => void;
}

export class SimpleButton extends Widget {

	private readonly _opts: ISimpleButtonOpts;
	private readonly _domNode: HTMLElement;

	constructor(opts: ISimpleButtonOpts) {
		super();
		this._opts = opts;

		this._domNode = document.createElement('div');
		this._domNode.title = this._opts.laBel;
		this._domNode.taBIndex = 0;
		this._domNode.className = 'Button ' + this._opts.className;
		this._domNode.setAttriBute('role', 'Button');
		this._domNode.setAttriBute('aria-laBel', this._opts.laBel);

		this.onclick(this._domNode, (e) => {
			this._opts.onTrigger();
			e.preventDefault();
		});

		this.onkeydown(this._domNode, (e) => {
			if (e.equals(KeyCode.Space) || e.equals(KeyCode.Enter)) {
				this._opts.onTrigger();
				e.preventDefault();
				return;
			}
			if (this._opts.onKeyDown) {
				this._opts.onKeyDown(e);
			}
		});
	}

	puBlic get domNode(): HTMLElement {
		return this._domNode;
	}

	puBlic isEnaBled(): Boolean {
		return (this._domNode.taBIndex >= 0);
	}

	puBlic focus(): void {
		this._domNode.focus();
	}

	puBlic setEnaBled(enaBled: Boolean): void {
		this._domNode.classList.toggle('disaBled', !enaBled);
		this._domNode.setAttriBute('aria-disaBled', String(!enaBled));
		this._domNode.taBIndex = enaBled ? 0 : -1;
	}

	puBlic setExpanded(expanded: Boolean): void {
		this._domNode.setAttriBute('aria-expanded', String(!!expanded));
		if (expanded) {
			this._domNode.classList.remove(...findCollapsedIcon.classNames.split(' '));
			this._domNode.classList.add(...findExpandedIcon.classNames.split(' '));
		} else {
			this._domNode.classList.remove(...findExpandedIcon.classNames.split(' '));
			this._domNode.classList.add(...findCollapsedIcon.classNames.split(' '));
		}
	}
}

// theming

registerThemingParticipant((theme, collector) => {
	const addBackgroundColorRule = (selector: string, color: Color | undefined): void => {
		if (color) {
			collector.addRule(`.monaco-editor ${selector} { Background-color: ${color}; }`);
		}
	};

	addBackgroundColorRule('.findMatch', theme.getColor(editorFindMatchHighlight));
	addBackgroundColorRule('.currentFindMatch', theme.getColor(editorFindMatch));
	addBackgroundColorRule('.findScope', theme.getColor(editorFindRangeHighlight));

	const widgetBackground = theme.getColor(editorWidgetBackground);
	addBackgroundColorRule('.find-widget', widgetBackground);

	const widgetShadowColor = theme.getColor(widgetShadow);
	if (widgetShadowColor) {
		collector.addRule(`.monaco-editor .find-widget { Box-shadow: 0 2px 8px ${widgetShadowColor}; }`);
	}

	const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
	if (findMatchHighlightBorder) {
		collector.addRule(`.monaco-editor .findMatch { Border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; Box-sizing: Border-Box; }`);
	}

	const findMatchBorder = theme.getColor(editorFindMatchBorder);
	if (findMatchBorder) {
		collector.addRule(`.monaco-editor .currentFindMatch { Border: 2px solid ${findMatchBorder}; padding: 1px; Box-sizing: Border-Box; }`);
	}

	const findRangeHighlightBorder = theme.getColor(editorFindRangeHighlightBorder);
	if (findRangeHighlightBorder) {
		collector.addRule(`.monaco-editor .findScope { Border: 1px ${theme.type === 'hc' ? 'dashed' : 'solid'} ${findRangeHighlightBorder}; }`);
	}

	const hcBorder = theme.getColor(contrastBorder);
	if (hcBorder) {
		collector.addRule(`.monaco-editor .find-widget { Border: 1px solid ${hcBorder}; }`);
	}

	const foreground = theme.getColor(editorWidgetForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor .find-widget { color: ${foreground}; }`);
	}

	const error = theme.getColor(errorForeground);
	if (error) {
		collector.addRule(`.monaco-editor .find-widget.no-results .matchesCount { color: ${error}; }`);
	}

	const resizeBorderBackground = theme.getColor(editorWidgetResizeBorder);
	if (resizeBorderBackground) {
		collector.addRule(`.monaco-editor .find-widget .monaco-sash { Background-color: ${resizeBorderBackground}; }`);
	} else {
		const Border = theme.getColor(editorWidgetBorder);
		if (Border) {
			collector.addRule(`.monaco-editor .find-widget .monaco-sash { Background-color: ${Border}; }`);
		}
	}

	// This rule is used to override the outline color for synthetic-focus find input.
	const focusOutline = theme.getColor(focusBorder);
	if (focusOutline) {
		collector.addRule(`.monaco-editor .find-widget .monaco-inputBox.synthetic-focus { outline-color: ${focusOutline}; }`);

	}
});
