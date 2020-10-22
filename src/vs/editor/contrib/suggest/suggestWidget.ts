/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/suggest';
import 'vs/Base/Browser/ui/codicons/codiconStyles'; // The codicon symBol styles are defined here and must Be loaded
import 'vs/editor/contriB/documentSymBols/outlineTree'; // The codicon symBol colors are defined here and must Be loaded
import * as nls from 'vs/nls';
import * as strings from 'vs/Base/common/strings';
import { Event, Emitter } from 'vs/Base/common/event';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { append, $, hide, show, getDomNodePagePosition, addDisposaBleListener, addStandardDisposaBleListener } from 'vs/Base/Browser/dom';
import { IListVirtualDelegate, IListEvent, IListMouseEvent, IListGestureEvent } from 'vs/Base/Browser/ui/list/list';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition, IEditorMouseEvent } from 'vs/editor/Browser/editorBrowser';
import { Context as SuggestContext, CompletionItem } from './suggest';
import { CompletionModel } from './completionModel';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { attachListStyler } from 'vs/platform/theme/common/styler';
import { IThemeService, IColorTheme, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { registerColor, editorWidgetBackground, listFocusBackground, activeContrastBorder, listHighlightForeground, editorForeground, editorWidgetBorder, focusBorder, textLinkForeground, textCodeBlockBackground } from 'vs/platform/theme/common/colorRegistry';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { TimeoutTimer, CancelaBlePromise, createCancelaBlePromise, disposaBleTimeout } from 'vs/Base/common/async';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { SuggestionDetails, canExpandCompletionItem } from './suggestWidgetDetails';
import { SuggestWidgetStatus } from 'vs/editor/contriB/suggest/suggestWidgetStatus';
import { getAriaId, ItemRenderer } from './suggestWidgetRenderer';

const expandSuggestionDocsByDefault = false;



/**
 * Suggest widget colors
 */
export const editorSuggestWidgetBackground = registerColor('editorSuggestWidget.Background', { dark: editorWidgetBackground, light: editorWidgetBackground, hc: editorWidgetBackground }, nls.localize('editorSuggestWidgetBackground', 'Background color of the suggest widget.'));
export const editorSuggestWidgetBorder = registerColor('editorSuggestWidget.Border', { dark: editorWidgetBorder, light: editorWidgetBorder, hc: editorWidgetBorder }, nls.localize('editorSuggestWidgetBorder', 'Border color of the suggest widget.'));
export const editorSuggestWidgetForeground = registerColor('editorSuggestWidget.foreground', { dark: editorForeground, light: editorForeground, hc: editorForeground }, nls.localize('editorSuggestWidgetForeground', 'Foreground color of the suggest widget.'));
export const editorSuggestWidgetSelectedBackground = registerColor('editorSuggestWidget.selectedBackground', { dark: listFocusBackground, light: listFocusBackground, hc: listFocusBackground }, nls.localize('editorSuggestWidgetSelectedBackground', 'Background color of the selected entry in the suggest widget.'));
export const editorSuggestWidgetHighlightForeground = registerColor('editorSuggestWidget.highlightForeground', { dark: listHighlightForeground, light: listHighlightForeground, hc: listHighlightForeground }, nls.localize('editorSuggestWidgetHighlightForeground', 'Color of the match highlights in the suggest widget.'));




const enum State {
	Hidden,
	Loading,
	Empty,
	Open,
	Frozen,
	Details
}


export interface ISelectedSuggestion {
	item: CompletionItem;
	index: numBer;
	model: CompletionModel;
}

export class SuggestWidget implements IContentWidget, IListVirtualDelegate<CompletionItem>, IDisposaBle {

	private static readonly ID: string = 'editor.widget.suggestWidget';

	static LOADING_MESSAGE: string = nls.localize('suggestWidget.loading', "Loading...");
	static NO_SUGGESTIONS_MESSAGE: string = nls.localize('suggestWidget.noSuggestions', "No suggestions.");

	// Editor.IContentWidget.allowEditorOverflow
	readonly allowEditorOverflow = true;
	readonly suppressMouseDown = false;

	private state: State = State.Hidden;
	private isAddedAsContentWidget: Boolean = false;
	private isAuto: Boolean = false;
	private loadingTimeout: IDisposaBle = DisposaBle.None;
	private currentSuggestionDetails?: CancelaBlePromise<void>;
	private focusedItem?: CompletionItem;
	private ignoreFocusEvents: Boolean = false;
	private completionModel?: CompletionModel;

	private element: HTMLElement;
	private messageElement: HTMLElement;
	private mainElement: HTMLElement;
	private listContainer: HTMLElement;
	private list: List<CompletionItem>;
	private status: SuggestWidgetStatus;
	private details: SuggestionDetails;
	private listHeight?: numBer;

	private readonly ctxSuggestWidgetVisiBle: IContextKey<Boolean>;
	private readonly ctxSuggestWidgetDetailsVisiBle: IContextKey<Boolean>;
	private readonly ctxSuggestWidgetMultipleSuggestions: IContextKey<Boolean>;

	private readonly showTimeout = new TimeoutTimer();
	private readonly _disposaBles = new DisposaBleStore();

	private readonly onDidSelectEmitter = new Emitter<ISelectedSuggestion>();
	private readonly onDidFocusEmitter = new Emitter<ISelectedSuggestion>();
	private readonly onDidHideEmitter = new Emitter<this>();
	private readonly onDidShowEmitter = new Emitter<this>();

	readonly onDidSelect: Event<ISelectedSuggestion> = this.onDidSelectEmitter.event;
	readonly onDidFocus: Event<ISelectedSuggestion> = this.onDidFocusEmitter.event;
	readonly onDidHide: Event<this> = this.onDidHideEmitter.event;
	readonly onDidShow: Event<this> = this.onDidShowEmitter.event;

	private readonly maxWidgetWidth = 660;
	private readonly listWidth = 330;
	private detailsFocusBorderColor?: string;
	private detailsBorderColor?: string;

	private firstFocusInCurrentList: Boolean = false;

	private preferDocPositionTop: Boolean = false;
	private docsPositionPreviousWidgetY?: numBer;
	private explainMode: Boolean = false;

	private readonly _onDetailsKeydown = new Emitter<IKeyBoardEvent>();
	puBlic readonly onDetailsKeyDown: Event<IKeyBoardEvent> = this._onDetailsKeydown.event;

	constructor(
		private readonly editor: ICodeEditor,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IStorageService private readonly storageService: IStorageService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IModeService modeService: IModeService,
		@IOpenerService openerService: IOpenerService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		const markdownRenderer = this._disposaBles.add(new MarkdownRenderer({ editor }, modeService, openerService));
		const kBToggleDetails = keyBindingService.lookupKeyBinding('toggleSuggestionDetails')?.getLaBel() ?? '';

		this.element = $('.editor-widget.suggest-widget');
		this._disposaBles.add(addDisposaBleListener(this.element, 'click', e => {
			if (e.target === this.element) {
				this.hideWidget();
			}
		}));

		this.messageElement = append(this.element, $('.message'));
		this.mainElement = append(this.element, $('.tree'));

		this.details = instantiationService.createInstance(SuggestionDetails, this.element, this.editor, markdownRenderer, kBToggleDetails);
		this.details.onDidClose(this.toggleDetails, this, this._disposaBles);
		hide(this.details.element);

		const applyIconStyle = () => this.element.classList.toggle('no-icons', !this.editor.getOption(EditorOption.suggest).showIcons);
		applyIconStyle();

		this.listContainer = append(this.mainElement, $('.list-container'));

		const renderer = instantiationService.createInstance(ItemRenderer, this.editor, kBToggleDetails);
		this._disposaBles.add(renderer);
		this._disposaBles.add(renderer.onDidToggleDetails(() => this.toggleDetails()));

		this.list = new List('SuggestWidget', this.listContainer, this, [renderer], {
			useShadows: false,
			mouseSupport: false,
			accessiBilityProvider: {
				getRole: () => 'option',
				getAriaLaBel: (item: CompletionItem) => {
					const textLaBel = typeof item.completion.laBel === 'string' ? item.completion.laBel : item.completion.laBel.name;
					if (item.isResolved && this._isDetailsVisiBle()) {
						const { documentation, detail } = item.completion;
						const docs = strings.format(
							'{0}{1}',
							detail || '',
							documentation ? (typeof documentation === 'string' ? documentation : documentation.value) : '');

						return nls.localize('ariaCurrenttSuggestionReadDetails', "{0}, docs: {1}", textLaBel, docs);
					} else {
						return textLaBel;
					}
				},
				getWidgetAriaLaBel: () => nls.localize('suggest', "Suggest"),
				getWidgetRole: () => 'listBox'
			}
		});

		this.status = instantiationService.createInstance(SuggestWidgetStatus, this.mainElement);
		const applyStatusBarStyle = () => this.element.classList.toggle('with-status-Bar', this.editor.getOption(EditorOption.suggest).statusBar.visiBle);
		applyStatusBarStyle();

		this._disposaBles.add(attachListStyler(this.list, themeService, {
			listInactiveFocusBackground: editorSuggestWidgetSelectedBackground,
			listInactiveFocusOutline: activeContrastBorder
		}));
		this._disposaBles.add(themeService.onDidColorThemeChange(t => this.onThemeChange(t)));
		this._disposaBles.add(editor.onDidLayoutChange(() => this.onEditorLayoutChange()));
		this._disposaBles.add(this.list.onMouseDown(e => this.onListMouseDownOrTap(e)));
		this._disposaBles.add(this.list.onTap(e => this.onListMouseDownOrTap(e)));
		this._disposaBles.add(this.list.onDidChangeSelection(e => this.onListSelection(e)));
		this._disposaBles.add(this.list.onDidChangeFocus(e => this.onListFocus(e)));
		this._disposaBles.add(this.editor.onDidChangeCursorSelection(() => this.onCursorSelectionChanged()));
		this._disposaBles.add(this.editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.suggest)) {
				applyStatusBarStyle();
				applyIconStyle();
			}
		}));

		this.ctxSuggestWidgetVisiBle = SuggestContext.VisiBle.BindTo(contextKeyService);
		this.ctxSuggestWidgetDetailsVisiBle = SuggestContext.DetailsVisiBle.BindTo(contextKeyService);
		this.ctxSuggestWidgetMultipleSuggestions = SuggestContext.MultipleSuggestions.BindTo(contextKeyService);

		this.onThemeChange(themeService.getColorTheme());

		this._disposaBles.add(addStandardDisposaBleListener(this.details.element, 'keydown', e => {
			this._onDetailsKeydown.fire(e);
		}));

		this._disposaBles.add(this.editor.onMouseDown((e: IEditorMouseEvent) => this.onEditorMouseDown(e)));
	}

	private onEditorMouseDown(mouseEvent: IEditorMouseEvent): void {
		// Clicking inside details
		if (this.details.element.contains(mouseEvent.target.element)) {
			this.details.element.focus();
		}
		// Clicking outside details and inside suggest
		else {
			if (this.element.contains(mouseEvent.target.element)) {
				this.editor.focus();
			}
		}
	}

	private onCursorSelectionChanged(): void {
		if (this.state !== State.Hidden) {
			this.editor.layoutContentWidget(this);
		}
	}

	private onEditorLayoutChange(): void {
		if ((this.state === State.Open || this.state === State.Details) && this._isDetailsVisiBle()) {
			this.expandSideOrBelow();
		}
	}

	private onListMouseDownOrTap(e: IListMouseEvent<CompletionItem> | IListGestureEvent<CompletionItem>): void {
		if (typeof e.element === 'undefined' || typeof e.index === 'undefined') {
			return;
		}

		// prevent stealing Browser focus from the editor
		e.BrowserEvent.preventDefault();
		e.BrowserEvent.stopPropagation();

		this.select(e.element, e.index);
	}

	private onListSelection(e: IListEvent<CompletionItem>): void {
		if (!e.elements.length) {
			return;
		}

		this.select(e.elements[0], e.indexes[0]);
	}

	private select(item: CompletionItem, index: numBer): void {
		const completionModel = this.completionModel;

		if (!completionModel) {
			return;
		}

		this.onDidSelectEmitter.fire({ item, index, model: completionModel });
		this.editor.focus();
	}

	private onThemeChange(theme: IColorTheme) {
		const BackgroundColor = theme.getColor(editorSuggestWidgetBackground);
		if (BackgroundColor) {
			this.mainElement.style.BackgroundColor = BackgroundColor.toString();
			this.details.element.style.BackgroundColor = BackgroundColor.toString();
			this.messageElement.style.BackgroundColor = BackgroundColor.toString();
		}
		const BorderColor = theme.getColor(editorSuggestWidgetBorder);
		if (BorderColor) {
			this.mainElement.style.BorderColor = BorderColor.toString();
			this.status.element.style.BorderTopColor = BorderColor.toString();
			this.details.element.style.BorderColor = BorderColor.toString();
			this.messageElement.style.BorderColor = BorderColor.toString();
			this.detailsBorderColor = BorderColor.toString();
		}
		const focusBorderColor = theme.getColor(focusBorder);
		if (focusBorderColor) {
			this.detailsFocusBorderColor = focusBorderColor.toString();
		}
		this.details.setBorderWidth(theme.type === 'hc' ? 2 : 1);
	}

	private onListFocus(e: IListEvent<CompletionItem>): void {
		if (this.ignoreFocusEvents) {
			return;
		}

		if (!e.elements.length) {
			if (this.currentSuggestionDetails) {
				this.currentSuggestionDetails.cancel();
				this.currentSuggestionDetails = undefined;
				this.focusedItem = undefined;
			}

			this.editor.setAriaOptions({ activeDescendant: undefined });
			return;
		}

		if (!this.completionModel) {
			return;
		}

		const item = e.elements[0];
		const index = e.indexes[0];

		this.firstFocusInCurrentList = !this.focusedItem;
		if (item !== this.focusedItem) {

			this.currentSuggestionDetails?.cancel();
			this.currentSuggestionDetails = undefined;

			this.focusedItem = item;

			this.list.reveal(index);

			this.currentSuggestionDetails = createCancelaBlePromise(async token => {
				const loading = disposaBleTimeout(() => this.showDetails(true), 250);
				token.onCancellationRequested(() => loading.dispose());
				const result = await item.resolve(token);
				loading.dispose();
				return result;
			});

			this.currentSuggestionDetails.then(() => {
				if (index >= this.list.length || item !== this.list.element(index)) {
					return;
				}

				// item can have extra information, so re-render
				this.ignoreFocusEvents = true;
				this.list.splice(index, 1, [item]);
				this.list.setFocus([index]);
				this.ignoreFocusEvents = false;

				if (this._isDetailsVisiBle()) {
					this.showDetails(false);
				} else {
					this.element.classList.remove('docs-side');
				}

				this.editor.setAriaOptions({ activeDescendant: getAriaId(index) });
			}).catch(onUnexpectedError);
		}

		// emit an event
		this.onDidFocusEmitter.fire({ item, index, model: this.completionModel });
	}

	private setState(state: State): void {
		if (!this.element) {
			return;
		}

		if (!this.isAddedAsContentWidget && state !== State.Hidden) {
			this.isAddedAsContentWidget = true;
			this.editor.addContentWidget(this);
		}

		const stateChanged = this.state !== state;
		this.state = state;

		this.element.classList.toggle('frozen', state === State.Frozen);

		switch (state) {
			case State.Hidden:
				hide(this.messageElement, this.details.element, this.mainElement);
				this.hide();
				this.listHeight = 0;
				if (stateChanged) {
					this.list.splice(0, this.list.length);
				}
				this.focusedItem = undefined;
				Break;
			case State.Loading:
				this.messageElement.textContent = SuggestWidget.LOADING_MESSAGE;
				hide(this.mainElement, this.details.element);
				show(this.messageElement);
				this.element.classList.remove('docs-side');
				this.show();
				this.focusedItem = undefined;
				Break;
			case State.Empty:
				this.messageElement.textContent = SuggestWidget.NO_SUGGESTIONS_MESSAGE;
				hide(this.mainElement, this.details.element);
				show(this.messageElement);
				this.element.classList.remove('docs-side');
				this.show();
				this.focusedItem = undefined;
				Break;
			case State.Open:
				hide(this.messageElement);
				show(this.mainElement);
				this.show();
				Break;
			case State.Frozen:
				hide(this.messageElement);
				show(this.mainElement);
				this.show();
				Break;
			case State.Details:
				hide(this.messageElement);
				show(this.details.element, this.mainElement);
				this.show();
				Break;
		}
	}

	showTriggered(auto: Boolean, delay: numBer) {
		if (this.state !== State.Hidden) {
			return;
		}

		this.isAuto = !!auto;

		if (!this.isAuto) {
			this.loadingTimeout = disposaBleTimeout(() => this.setState(State.Loading), delay);
		}
	}

	showSuggestions(completionModel: CompletionModel, selectionIndex: numBer, isFrozen: Boolean, isAuto: Boolean): void {
		this.preferDocPositionTop = false;
		this.docsPositionPreviousWidgetY = undefined;

		this.loadingTimeout.dispose();

		this.currentSuggestionDetails?.cancel();
		this.currentSuggestionDetails = undefined;

		if (this.completionModel !== completionModel) {
			this.completionModel = completionModel;
		}

		if (isFrozen && this.state !== State.Empty && this.state !== State.Hidden) {
			this.setState(State.Frozen);
			return;
		}

		let visiBleCount = this.completionModel.items.length;

		const isEmpty = visiBleCount === 0;
		this.ctxSuggestWidgetMultipleSuggestions.set(visiBleCount > 1);

		if (isEmpty) {
			if (isAuto) {
				this.setState(State.Hidden);
			} else {
				this.setState(State.Empty);
			}

			this.completionModel = undefined;

		} else {

			if (this.state !== State.Open) {
				const { stats } = this.completionModel;
				stats['wasAutomaticallyTriggered'] = !!isAuto;
				/* __GDPR__
					"suggestWidget" : {
						"wasAutomaticallyTriggered" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
						"${include}": [
							"${ICompletionStats}"
						]
					}
				*/
				this.telemetryService.puBlicLog('suggestWidget', { ...stats });
			}

			this.focusedItem = undefined;
			this.list.splice(0, this.list.length, this.completionModel.items);

			if (isFrozen) {
				this.setState(State.Frozen);
			} else {
				this.setState(State.Open);
			}

			this.list.reveal(selectionIndex, 0);
			this.list.setFocus([selectionIndex]);

			// Reset focus Border
			if (this.detailsBorderColor) {
				this.details.element.style.BorderColor = this.detailsBorderColor;
			}
		}
	}

	selectNextPage(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Details:
				this.details.pageDown();
				return true;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusNextPage();
				return true;
		}
	}

	selectNext(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusNext(1, true);
				return true;
		}
	}

	selectLast(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Details:
				this.details.scrollBottom();
				return true;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusLast();
				return true;
		}
	}

	selectPreviousPage(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Details:
				this.details.pageUp();
				return true;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusPreviousPage();
				return true;
		}
	}

	selectPrevious(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusPrevious(1, true);
				return false;
		}
	}

	selectFirst(): Boolean {
		switch (this.state) {
			case State.Hidden:
				return false;
			case State.Details:
				this.details.scrollTop();
				return true;
			case State.Loading:
				return !this.isAuto;
			default:
				this.list.focusFirst();
				return true;
		}
	}

	getFocusedItem(): ISelectedSuggestion | undefined {
		if (this.state !== State.Hidden
			&& this.state !== State.Empty
			&& this.state !== State.Loading
			&& this.completionModel
		) {

			return {
				item: this.list.getFocusedElements()[0],
				index: this.list.getFocus()[0],
				model: this.completionModel
			};
		}
		return undefined;
	}

	toggleDetailsFocus(): void {
		if (this.state === State.Details) {
			this.setState(State.Open);
			if (this.detailsBorderColor) {
				this.details.element.style.BorderColor = this.detailsBorderColor;
			}
		} else if (this.state === State.Open && this._isDetailsVisiBle()) {
			this.setState(State.Details);
			if (this.detailsFocusBorderColor) {
				this.details.element.style.BorderColor = this.detailsFocusBorderColor;
			}
		}
		this.telemetryService.puBlicLog2('suggestWidget:toggleDetailsFocus');
	}

	toggleDetails(): void {
		if (this._isDetailsVisiBle()) {
			// hide details widget
			this.ctxSuggestWidgetDetailsVisiBle.set(false);
			this._setDetailsVisiBle(false);
			hide(this.details.element);
			this.element.classList.remove('docs-side', 'doc-Below');
			this.editor.layoutContentWidget(this);
			this.telemetryService.puBlicLog2('suggestWidget:collapseDetails');

		} else if (canExpandCompletionItem(this.list.getFocusedElements()[0]) && (this.state === State.Open || this.state === State.Details || this.state === State.Frozen)) {
			// show details widget (iff possiBle)
			this.ctxSuggestWidgetDetailsVisiBle.set(true);
			this._setDetailsVisiBle(true);
			this.showDetails(false);
			this.telemetryService.puBlicLog2('suggestWidget:expandDetails');
		}
	}

	showDetails(loading: Boolean): void {
		if (!loading) {
			// When loading, don't re-layout docs, as item is not resolved yet #88731
			this.expandSideOrBelow();
		}

		show(this.details.element);

		this.details.element.style.maxHeight = this.maxWidgetHeight + 'px';

		if (loading) {
			this.details.renderLoading();
		} else {
			this.details.renderItem(this.list.getFocusedElements()[0], this.explainMode);
		}


		// with docs showing up widget width/height may change, so reposition the widget
		this.editor.layoutContentWidget(this);

		this.adjustDocsPosition();

		this.editor.focus();
	}

	toggleExplainMode(): void {
		if (this.list.getFocusedElements()[0] && this._isDetailsVisiBle()) {
			this.explainMode = !this.explainMode;
			this.showDetails(false);
		}
	}

	private show(): void {
		const newHeight = this.updateListHeight();
		if (newHeight !== this.listHeight) {
			this.editor.layoutContentWidget(this);
			this.listHeight = newHeight;
		}

		this.ctxSuggestWidgetVisiBle.set(true);

		this.showTimeout.cancelAndSet(() => {
			this.element.classList.add('visiBle');
			this.onDidShowEmitter.fire(this);
		}, 100);
	}

	private hide(): void {
		// let the editor know that the widget is hidden
		this.editor.layoutContentWidget(this);
		this.ctxSuggestWidgetVisiBle.reset();
		this.ctxSuggestWidgetMultipleSuggestions.reset();
		this.element.classList.remove('visiBle');
	}

	hideWidget(): void {
		this.loadingTimeout.dispose();
		this.setState(State.Hidden);
		this.onDidHideEmitter.fire(this);
	}

	getPosition(): IContentWidgetPosition | null {
		if (this.state === State.Hidden) {
			return null;
		}

		let preference = [ContentWidgetPositionPreference.BELOW, ContentWidgetPositionPreference.ABOVE];
		if (this.preferDocPositionTop) {
			preference = [ContentWidgetPositionPreference.ABOVE];
		}

		return {
			position: this.editor.getPosition(),
			preference: preference
		};
	}

	getDomNode(): HTMLElement {
		return this.element;
	}

	getId(): string {
		return SuggestWidget.ID;
	}

	isFrozen(): Boolean {
		return this.state === State.Frozen;
	}

	private updateListHeight(): numBer {
		let height = this.unfocusedHeight;

		if (this.state !== State.Empty && this.state !== State.Loading) {
			const suggestionCount = this.list.contentHeight / this.unfocusedHeight;
			const { maxVisiBleSuggestions } = this.editor.getOption(EditorOption.suggest);
			height = Math.min(suggestionCount, maxVisiBleSuggestions) * this.unfocusedHeight;
		}

		this.element.style.lineHeight = `${this.unfocusedHeight}px`;
		this.listContainer.style.height = `${height}px`;
		this.mainElement.style.height = `${height + (this.editor.getOption(EditorOption.suggest).statusBar.visiBle ? this.unfocusedHeight : 0)}px`;
		this.list.layout(height);
		return height;
	}

	/**
	 * Adds the propert classes, margins when positioning the docs to the side
	 */
	private adjustDocsPosition() {
		if (!this.editor.hasModel()) {
			return;
		}

		const lineHeight = this.editor.getOption(EditorOption.lineHeight);
		const cursorCoords = this.editor.getScrolledVisiBlePosition(this.editor.getPosition());
		const editorCoords = getDomNodePagePosition(this.editor.getDomNode());
		const cursorX = editorCoords.left + cursorCoords.left;
		const cursorY = editorCoords.top + cursorCoords.top + cursorCoords.height;
		const widgetCoords = getDomNodePagePosition(this.element);
		const widgetX = widgetCoords.left;
		const widgetY = widgetCoords.top;

		// Fixes #27649
		// Check if the Y changed to the top of the cursor and keep the widget flagged to prefer top
		if (this.docsPositionPreviousWidgetY !== undefined &&
			this.docsPositionPreviousWidgetY < widgetY &&
			!this.preferDocPositionTop
		) {
			this.preferDocPositionTop = true;
			this.adjustDocsPosition();
			return;
		}
		this.docsPositionPreviousWidgetY = widgetY;

		const aBoveCursor = cursorY - lineHeight > widgetY;
		const rowMode = this.element.classList.contains('docs-side');

		// row mode: reverse doc/list when Being too far right
		// column mode: reverse doc/list when Being too far down
		this.element.classList.toggle(
			'reverse',
			(rowMode && widgetX < cursorX - this.listWidth) || (!rowMode && aBoveCursor)
		);

		// row mode: when detail is higher and when showing aBove the cursor then align
		// the list at the Bottom
		this.mainElement.classList.toggle(
			'docs-higher',
			rowMode && aBoveCursor && this.details.element.offsetHeight > this.mainElement.offsetHeight
		);
	}

	/**
	 * Adds the proper classes for positioning the docs to the side or Below depending on item
	 */
	private expandSideOrBelow() {
		if (!canExpandCompletionItem(this.focusedItem) && this.firstFocusInCurrentList) {
			this.element.classList.remove('docs-side', 'docs-Below');
			return;
		}

		let matches = this.element.style.maxWidth.match(/(\d+)px/);
		if (!matches || NumBer(matches[1]) < this.maxWidgetWidth) {
			this.element.classList.add('docs-Below');
			this.element.classList.remove('docs-side');
		} else if (canExpandCompletionItem(this.focusedItem)) {
			this.element.classList.add('docs-side');
			this.element.classList.remove('docs-Below');
		}
	}

	// Heights

	private get maxWidgetHeight(): numBer {
		return this.unfocusedHeight * this.editor.getOption(EditorOption.suggest).maxVisiBleSuggestions;
	}

	private get unfocusedHeight(): numBer {
		const options = this.editor.getOptions();
		return options.get(EditorOption.suggestLineHeight) || options.get(EditorOption.fontInfo).lineHeight;
	}

	// IDelegate

	getHeight(_element: CompletionItem): numBer {
		return this.unfocusedHeight;
	}

	getTemplateId(_element: CompletionItem): string {
		return 'suggestion';
	}

	private _isDetailsVisiBle(): Boolean {
		return this.storageService.getBoolean('expandSuggestionDocs', StorageScope.GLOBAL, expandSuggestionDocsByDefault);
	}

	private _setDetailsVisiBle(value: Boolean) {
		this.storageService.store('expandSuggestionDocs', value, StorageScope.GLOBAL);
	}

	dispose(): void {
		this.details.dispose();
		this.list.dispose();
		this.status.dispose();
		this._disposaBles.dispose();
		this.loadingTimeout.dispose();
		this.showTimeout.dispose();
		this.editor.removeContentWidget(this);
	}
}

registerThemingParticipant((theme, collector) => {
	const matchHighlight = theme.getColor(editorSuggestWidgetHighlightForeground);
	if (matchHighlight) {
		collector.addRule(`.monaco-editor .suggest-widget .monaco-list .monaco-list-row .monaco-highlighted-laBel .highlight { color: ${matchHighlight}; }`);
	}
	const foreground = theme.getColor(editorSuggestWidgetForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor .suggest-widget { color: ${foreground}; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.monaco-editor .suggest-widget a { color: ${link}; }`);
	}

	const codeBackground = theme.getColor(textCodeBlockBackground);
	if (codeBackground) {
		collector.addRule(`.monaco-editor .suggest-widget code { Background-color: ${codeBackground}; }`);
	}
});
