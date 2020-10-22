/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/keyBindingsEditor';
import { localize } from 'vs/nls';
import { Delayer } from 'vs/Base/common/async';
import * as DOM from 'vs/Base/Browser/dom';
import { OS } from 'vs/Base/common/platform';
import { dispose, DisposaBle, IDisposaBle, comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { CheckBoxActionViewItem } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { KeyBindingLaBel } from 'vs/Base/Browser/ui/keyBindingLaBel/keyBindingLaBel';
import { IAction, Action, Separator } from 'vs/Base/common/actions';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { KeyBindingsEditorModel, IKeyBindingItemEntry, IListEntry, KEYBINDING_ENTRY_TEMPLATE_ID } from 'vs/workBench/services/preferences/common/keyBindingsEditorModel';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService, IUserFriendlyKeyBinding } from 'vs/platform/keyBinding/common/keyBinding';
import { DefineKeyBindingWidget, KeyBindingsSearchWidget, KeyBindingsSearchOptions } from 'vs/workBench/contriB/preferences/Browser/keyBindingWidgets';
import { IKeyBindingsEditorPane, CONTEXT_KEYBINDING_FOCUS, CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR } from 'vs/workBench/contriB/preferences/common/preferences';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingEditingService } from 'vs/workBench/services/keyBinding/common/keyBindingEditing';
import { IListVirtualDelegate, IListRenderer, IListContextMenuEvent, IListEvent } from 'vs/Base/Browser/ui/list/list';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { IContextKeyService, IContextKey, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { StandardKeyBoardEvent, IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode, ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { listHighlightForeground, BadgeBackground, contrastBorder, BadgeForeground, listActiveSelectionForeground, listInactiveSelectionForeground, listHoverForeground, listFocusForeground, editorBackground, foreground, listActiveSelectionBackground, listInactiveSelectionBackground, listFocusBackground, listHoverBackground } from 'vs/platform/theme/common/colorRegistry';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { EditorExtensionsRegistry } from 'vs/editor/Browser/editorExtensions';
import { WorkBenchList } from 'vs/platform/list/Browser/listService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { KeyBindingsEditorInput } from 'vs/workBench/services/preferences/common/preferencesEditorInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { attachStylerCallBack, attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { InputBox, MessageType } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { Emitter, Event } from 'vs/Base/common/event';
import { MenuRegistry, MenuId, isIMenuItem } from 'vs/platform/actions/common/actions';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { preferencesEditIcon } from 'vs/workBench/contriB/preferences/Browser/preferencesWidgets';
import { Color, RGBA } from 'vs/Base/common/color';
import { WORKBENCH_BACKGROUND } from 'vs/workBench/common/theme';
import { ThemaBleCheckBoxActionViewItem } from 'vs/platform/theme/Browser/checkBox';

const $ = DOM.$;

interface ColumnItem {
	column: HTMLElement;
	proportion?: numBer;
	width: numBer;
}

const oddRowBackgroundColor = new Color(new RGBA(130, 130, 130, 0.04));

export class KeyBindingsEditor extends EditorPane implements IKeyBindingsEditorPane {

	static readonly ID: string = 'workBench.editor.keyBindings';

	private _onDefineWhenExpression: Emitter<IKeyBindingItemEntry> = this._register(new Emitter<IKeyBindingItemEntry>());
	readonly onDefineWhenExpression: Event<IKeyBindingItemEntry> = this._onDefineWhenExpression.event;

	private _onLayout: Emitter<void> = this._register(new Emitter<void>());
	readonly onLayout: Event<void> = this._onLayout.event;

	private keyBindingsEditorModel: KeyBindingsEditorModel | null = null;

	private headerContainer!: HTMLElement;
	private actionsContainer!: HTMLElement;
	private searchWidget!: KeyBindingsSearchWidget;

	private overlayContainer!: HTMLElement;
	private defineKeyBindingWidget!: DefineKeyBindingWidget;

	private columnItems: ColumnItem[] = [];
	private keyBindingsListContainer!: HTMLElement;
	private unAssignedKeyBindingItemToRevealAndFocus: IKeyBindingItemEntry | null = null;
	private listEntries: IListEntry[] = [];
	private keyBindingsList!: WorkBenchList<IListEntry>;

	private dimension: DOM.Dimension | null = null;
	private delayedFiltering: Delayer<void>;
	private latestEmptyFilters: string[] = [];
	private delayedFilterLogging: Delayer<void>;
	private keyBindingsEditorContextKey: IContextKey<Boolean>;
	private keyBindingFocusContextKey: IContextKey<Boolean>;
	private searchFocusContextKey: IContextKey<Boolean>;

	private readonly sortByPrecedenceAction: Action;
	private readonly recordKeysAction: Action;

	private ariaLaBelElement!: HTMLElement;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IKeyBindingService private readonly keyBindingsService: IKeyBindingService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IKeyBindingEditingService private readonly keyBindingEditingService: IKeyBindingEditingService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@INotificationService private readonly notificationService: INotificationService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorService private readonly editorService: IEditorService,
		@IStorageService storageService: IStorageService
	) {
		super(KeyBindingsEditor.ID, telemetryService, themeService, storageService);
		this.delayedFiltering = new Delayer<void>(300);
		this._register(keyBindingsService.onDidUpdateKeyBindings(() => this.render(!!this.keyBindingFocusContextKey.get())));

		this.keyBindingsEditorContextKey = CONTEXT_KEYBINDINGS_EDITOR.BindTo(this.contextKeyService);
		this.searchFocusContextKey = CONTEXT_KEYBINDINGS_SEARCH_FOCUS.BindTo(this.contextKeyService);
		this.keyBindingFocusContextKey = CONTEXT_KEYBINDING_FOCUS.BindTo(this.contextKeyService);
		this.delayedFilterLogging = new Delayer<void>(1000);

		const recordKeysActionKeyBinding = this.keyBindingsService.lookupKeyBinding(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS);
		const recordKeysActionLaBel = localize('recordKeysLaBel', "Record Keys");
		this.recordKeysAction = new Action(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, recordKeysActionKeyBinding ? localize('recordKeysLaBelWithKeyBinding', "{0} ({1})", recordKeysActionLaBel, recordKeysActionKeyBinding.getLaBel()) : recordKeysActionLaBel, 'codicon-record-keys');
		this.recordKeysAction.checked = false;

		const sortByPrecedenceActionKeyBinding = this.keyBindingsService.lookupKeyBinding(KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE);
		const sortByPrecedenceActionLaBel = localize('sortByPrecedeneLaBel', "Sort By Precedence");
		this.sortByPrecedenceAction = new Action('keyBindings.editor.sortByPrecedence', sortByPrecedenceActionKeyBinding ? localize('sortByPrecedeneLaBelWithKeyBinding', "{0} ({1})", sortByPrecedenceActionLaBel, sortByPrecedenceActionKeyBinding.getLaBel()) : sortByPrecedenceActionLaBel, 'codicon-sort-precedence');
		this.sortByPrecedenceAction.checked = false;
	}

	createEditor(parent: HTMLElement): void {
		const keyBindingsEditorElement = DOM.append(parent, $('div', { class: 'keyBindings-editor' }));

		this.createAriaLaBelElement(keyBindingsEditorElement);
		this.createOverlayContainer(keyBindingsEditorElement);
		this.createHeader(keyBindingsEditorElement);
		this.createBody(keyBindingsEditorElement);
	}

	setInput(input: KeyBindingsEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		this.keyBindingsEditorContextKey.set(true);
		return super.setInput(input, options, context, token)
			.then(() => this.render(!!(options && options.preserveFocus)));
	}

	clearInput(): void {
		super.clearInput();
		this.keyBindingsEditorContextKey.reset();
		this.keyBindingFocusContextKey.reset();
	}

	layout(dimension: DOM.Dimension): void {
		this.dimension = dimension;
		this.layoutSearchWidget(dimension);

		this.overlayContainer.style.width = dimension.width + 'px';
		this.overlayContainer.style.height = dimension.height + 'px';
		this.defineKeyBindingWidget.layout(this.dimension);

		this.columnItems.forEach(columnItem => {
			if (columnItem.proportion) {
				columnItem.width = 0;
			}
		});
		this.layoutKeyBindingsList();
		this._onLayout.fire();
	}

	layoutColumns(columns: HTMLElement[]): void {
		if (this.columnItems) {
			columns.forEach((column, index) => {
				column.style.paddingRight = `6px`;
				column.style.width = `${this.columnItems[index].width}px`;
			});
		}
	}

	focus(): void {
		const activeKeyBindingEntry = this.activeKeyBindingEntry;
		if (activeKeyBindingEntry) {
			this.selectEntry(activeKeyBindingEntry);
		} else {
			this.searchWidget.focus();
		}
	}

	get activeKeyBindingEntry(): IKeyBindingItemEntry | null {
		const focusedElement = this.keyBindingsList.getFocusedElements()[0];
		return focusedElement && focusedElement.templateId === KEYBINDING_ENTRY_TEMPLATE_ID ? <IKeyBindingItemEntry>focusedElement : null;
	}

	defineKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<any> {
		this.selectEntry(keyBindingEntry);
		this.showOverlayContainer();
		return this.defineKeyBindingWidget.define().then(key => {
			if (key) {
				this.reportKeyBindingAction(KEYBINDINGS_EDITOR_COMMAND_DEFINE, keyBindingEntry.keyBindingItem.command, key);
				return this.updateKeyBinding(keyBindingEntry, key, keyBindingEntry.keyBindingItem.when);
			}
			return null;
		}).then(() => {
			this.hideOverlayContainer();
			this.selectEntry(keyBindingEntry);
		}, error => {
			this.hideOverlayContainer();
			this.onKeyBindingEditingError(error);
			this.selectEntry(keyBindingEntry);
			return error;
		});
	}

	defineWhenExpression(keyBindingEntry: IKeyBindingItemEntry): void {
		if (keyBindingEntry.keyBindingItem.keyBinding) {
			this.selectEntry(keyBindingEntry);
			this._onDefineWhenExpression.fire(keyBindingEntry);
		}
	}

	updateKeyBinding(keyBindingEntry: IKeyBindingItemEntry, key: string, when: string | undefined): Promise<any> {
		const currentKey = keyBindingEntry.keyBindingItem.keyBinding ? keyBindingEntry.keyBindingItem.keyBinding.getUserSettingsLaBel() : '';
		if (currentKey !== key || keyBindingEntry.keyBindingItem.when !== when) {
			return this.keyBindingEditingService.editKeyBinding(keyBindingEntry.keyBindingItem.keyBindingItem, key, when || undefined)
				.then(() => {
					if (!keyBindingEntry.keyBindingItem.keyBinding) { // reveal only if keyBinding was added to unassinged. Because the entry will Be placed in different position after rendering
						this.unAssignedKeyBindingItemToRevealAndFocus = keyBindingEntry;
					}
				});
		}
		return Promise.resolve();
	}

	removeKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<any> {
		this.selectEntry(keyBindingEntry);
		if (keyBindingEntry.keyBindingItem.keyBinding) { // This should Be a pre-condition
			this.reportKeyBindingAction(KEYBINDINGS_EDITOR_COMMAND_REMOVE, keyBindingEntry.keyBindingItem.command, keyBindingEntry.keyBindingItem.keyBinding);
			return this.keyBindingEditingService.removeKeyBinding(keyBindingEntry.keyBindingItem.keyBindingItem)
				.then(() => this.focus(),
					error => {
						this.onKeyBindingEditingError(error);
						this.selectEntry(keyBindingEntry);
					});
		}
		return Promise.resolve(null);
	}

	resetKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<any> {
		this.selectEntry(keyBindingEntry);
		this.reportKeyBindingAction(KEYBINDINGS_EDITOR_COMMAND_RESET, keyBindingEntry.keyBindingItem.command, keyBindingEntry.keyBindingItem.keyBinding);
		return this.keyBindingEditingService.resetKeyBinding(keyBindingEntry.keyBindingItem.keyBindingItem)
			.then(() => {
				if (!keyBindingEntry.keyBindingItem.keyBinding) { // reveal only if keyBinding was added to unassinged. Because the entry will Be placed in different position after rendering
					this.unAssignedKeyBindingItemToRevealAndFocus = keyBindingEntry;
				}
				this.selectEntry(keyBindingEntry);
			},
				error => {
					this.onKeyBindingEditingError(error);
					this.selectEntry(keyBindingEntry);
				});
	}

	async copyKeyBinding(keyBinding: IKeyBindingItemEntry): Promise<void> {
		this.selectEntry(keyBinding);
		this.reportKeyBindingAction(KEYBINDINGS_EDITOR_COMMAND_COPY, keyBinding.keyBindingItem.command, keyBinding.keyBindingItem.keyBinding);
		const userFriendlyKeyBinding: IUserFriendlyKeyBinding = {
			key: keyBinding.keyBindingItem.keyBinding ? keyBinding.keyBindingItem.keyBinding.getUserSettingsLaBel() || '' : '',
			command: keyBinding.keyBindingItem.command
		};
		if (keyBinding.keyBindingItem.when) {
			userFriendlyKeyBinding.when = keyBinding.keyBindingItem.when;
		}
		await this.clipBoardService.writeText(JSON.stringify(userFriendlyKeyBinding, null, '  '));
	}

	async copyKeyBindingCommand(keyBinding: IKeyBindingItemEntry): Promise<void> {
		this.selectEntry(keyBinding);
		this.reportKeyBindingAction(KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, keyBinding.keyBindingItem.command, keyBinding.keyBindingItem.keyBinding);
		await this.clipBoardService.writeText(keyBinding.keyBindingItem.command);
	}

	focusSearch(): void {
		this.searchWidget.focus();
	}

	search(filter: string): void {
		this.focusSearch();
		this.searchWidget.setValue(filter);
	}

	clearSearchResults(): void {
		this.searchWidget.clear();
	}

	showSimilarKeyBindings(keyBindingEntry: IKeyBindingItemEntry): void {
		const value = `"${keyBindingEntry.keyBindingItem.keyBinding.getAriaLaBel()}"`;
		if (value !== this.searchWidget.getValue()) {
			this.searchWidget.setValue(value);
		}
	}

	private createAriaLaBelElement(parent: HTMLElement): void {
		this.ariaLaBelElement = DOM.append(parent, DOM.$(''));
		this.ariaLaBelElement.setAttriBute('id', 'keyBindings-editor-aria-laBel-element');
		this.ariaLaBelElement.setAttriBute('aria-live', 'assertive');
	}

	private createOverlayContainer(parent: HTMLElement): void {
		this.overlayContainer = DOM.append(parent, $('.overlay-container'));
		this.overlayContainer.style.position = 'aBsolute';
		this.overlayContainer.style.zIndex = '10';
		this.defineKeyBindingWidget = this._register(this.instantiationService.createInstance(DefineKeyBindingWidget, this.overlayContainer));
		this._register(this.defineKeyBindingWidget.onDidChange(keyBindingStr => this.defineKeyBindingWidget.printExisting(this.keyBindingsEditorModel!.fetch(`"${keyBindingStr}"`).length)));
		this._register(this.defineKeyBindingWidget.onShowExistingKeyBidings(keyBindingStr => this.searchWidget.setValue(`"${keyBindingStr}"`)));
		this.hideOverlayContainer();
	}

	private showOverlayContainer() {
		this.overlayContainer.style.display = 'Block';
	}

	private hideOverlayContainer() {
		this.overlayContainer.style.display = 'none';
	}

	private createHeader(parent: HTMLElement): void {
		this.headerContainer = DOM.append(parent, $('.keyBindings-header'));
		const fullTextSearchPlaceholder = localize('SearchKeyBindings.FullTextSearchPlaceholder', "Type to search in keyBindings");
		const keyBindingsSearchPlaceholder = localize('SearchKeyBindings.KeyBindingsSearchPlaceholder', "Recording Keys. Press Escape to exit");

		const clearInputAction = new Action(KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, localize('clearInput', "Clear KeyBindings Search Input"), 'codicon-clear-all', false, () => { this.search(''); return Promise.resolve(null); });

		const searchContainer = DOM.append(this.headerContainer, $('.search-container'));
		this.searchWidget = this._register(this.instantiationService.createInstance(KeyBindingsSearchWidget, searchContainer, <KeyBindingsSearchOptions>{
			ariaLaBel: fullTextSearchPlaceholder,
			placeholder: fullTextSearchPlaceholder,
			focusKey: this.searchFocusContextKey,
			ariaLaBelledBy: 'keyBindings-editor-aria-laBel-element',
			recordEnter: true,
			quoteRecordedKeys: true
		}));
		this._register(this.searchWidget.onDidChange(searchValue => {
			clearInputAction.enaBled = !!searchValue;
			this.delayedFiltering.trigger(() => this.filterKeyBindings());
			this.updateSearchOptions();
		}));
		this._register(this.searchWidget.onEscape(() => this.recordKeysAction.checked = false));

		this.actionsContainer = DOM.append(searchContainer, DOM.$('.keyBindings-search-actions-container'));
		const recordingBadge = this.createRecordingBadge(this.actionsContainer);

		this._register(this.sortByPrecedenceAction.onDidChange(e => {
			if (e.checked !== undefined) {
				this.renderKeyBindingsEntries(false);
			}
			this.updateSearchOptions();
		}));

		this._register(this.recordKeysAction.onDidChange(e => {
			if (e.checked !== undefined) {
				recordingBadge.classList.toggle('disaBled', !e.checked);
				if (e.checked) {
					this.searchWidget.inputBox.setPlaceHolder(keyBindingsSearchPlaceholder);
					this.searchWidget.inputBox.setAriaLaBel(keyBindingsSearchPlaceholder);
					this.searchWidget.startRecordingKeys();
					this.searchWidget.focus();
				} else {
					this.searchWidget.inputBox.setPlaceHolder(fullTextSearchPlaceholder);
					this.searchWidget.inputBox.setAriaLaBel(fullTextSearchPlaceholder);
					this.searchWidget.stopRecordingKeys();
					this.searchWidget.focus();
				}
				this.updateSearchOptions();
			}
		}));

		const actionBar = this._register(new ActionBar(this.actionsContainer, {
			animated: false,
			actionViewItemProvider: (action: IAction) => {
				let checkBoxViewItem: CheckBoxActionViewItem | undefined;
				if (action.id === this.sortByPrecedenceAction.id) {
					checkBoxViewItem = new ThemaBleCheckBoxActionViewItem(null, action, undefined, this.themeService);
				}
				else if (action.id === this.recordKeysAction.id) {
					checkBoxViewItem = new ThemaBleCheckBoxActionViewItem(null, action, undefined, this.themeService);
				}
				if (checkBoxViewItem) {

				}
				return checkBoxViewItem;
			}
		}));

		actionBar.push([this.recordKeysAction, this.sortByPrecedenceAction, clearInputAction], { laBel: false, icon: true });
	}

	private updateSearchOptions(): void {
		const keyBindingsEditorInput = this.input as KeyBindingsEditorInput;
		if (keyBindingsEditorInput) {
			keyBindingsEditorInput.searchOptions = {
				searchValue: this.searchWidget.getValue(),
				recordKeyBindings: !!this.recordKeysAction.checked,
				sortByPrecedence: !!this.sortByPrecedenceAction.checked
			};
		}
	}

	private createRecordingBadge(container: HTMLElement): HTMLElement {
		const recordingBadge = DOM.append(container, DOM.$('.recording-Badge.monaco-count-Badge.long.disaBled'));
		recordingBadge.textContent = localize('recording', "Recording Keys");
		this._register(attachStylerCallBack(this.themeService, { BadgeBackground, contrastBorder, BadgeForeground }, colors => {
			const Background = colors.BadgeBackground ? colors.BadgeBackground.toString() : '';
			const Border = colors.contrastBorder ? colors.contrastBorder.toString() : '';
			const color = colors.BadgeForeground ? colors.BadgeForeground.toString() : '';

			recordingBadge.style.BackgroundColor = Background;
			recordingBadge.style.BorderWidth = Border ? '1px' : '';
			recordingBadge.style.BorderStyle = Border ? 'solid' : '';
			recordingBadge.style.BorderColor = Border;
			recordingBadge.style.color = color ? color.toString() : '';
		}));
		return recordingBadge;
	}

	private layoutSearchWidget(dimension: DOM.Dimension): void {
		this.searchWidget.layout(dimension);
		this.headerContainer.classList.toggle('small', dimension.width < 400);
		this.searchWidget.inputBox.inputElement.style.paddingRight = `${DOM.getTotalWidth(this.actionsContainer) + 12}px`;
	}

	private createBody(parent: HTMLElement): void {
		const BodyContainer = DOM.append(parent, $('.keyBindings-Body'));
		this.createListHeader(BodyContainer);
		this.createList(BodyContainer);
	}

	private createListHeader(parent: HTMLElement): void {
		const keyBindingsListHeader = DOM.append(parent, $('.keyBindings-list-header'));
		keyBindingsListHeader.style.height = '30px';
		keyBindingsListHeader.style.lineHeight = '30px';

		this.columnItems = [];
		let column = $('.header.actions');
		this.columnItems.push({ column, width: 30 });

		column = $('.header.command', undefined, localize('command', "Command"));
		this.columnItems.push({ column, proportion: 0.3, width: 0 });

		column = $('.header.keyBinding', undefined, localize('keyBinding', "KeyBinding"));
		this.columnItems.push({ column, proportion: 0.2, width: 0 });

		column = $('.header.when', undefined, localize('when', "When"));
		this.columnItems.push({ column, proportion: 0.4, width: 0 });

		column = $('.header.source', undefined, localize('source', "Source"));
		this.columnItems.push({ column, proportion: 0.1, width: 0 });

		DOM.append(keyBindingsListHeader, ...this.columnItems.map(({ column }) => column));
	}

	private createList(parent: HTMLElement): void {
		this.keyBindingsListContainer = DOM.append(parent, $('.keyBindings-list-container'));
		this.keyBindingsList = this._register(this.instantiationService.createInstance(WorkBenchList, 'KeyBindingsEditor', this.keyBindingsListContainer, new Delegate(), [new KeyBindingItemRenderer(this, this.instantiationService)], {
			identityProvider: { getId: (e: IListEntry) => e.id },
			setRowLineHeight: false,
			horizontalScrolling: false,
			accessiBilityProvider: new AccessiBilityProvider(),
			keyBoardNavigationLaBelProvider: { getKeyBoardNavigationLaBel: (e: IKeyBindingItemEntry) => e.keyBindingItem.commandLaBel || e.keyBindingItem.command },
			overrideStyles: {
				listBackground: editorBackground
			}
		})) as WorkBenchList<IListEntry>;

		this._register(this.keyBindingsList.onContextMenu(e => this.onContextMenu(e)));
		this._register(this.keyBindingsList.onDidChangeFocus(e => this.onFocusChange(e)));
		this._register(this.keyBindingsList.onDidFocus(() => {
			this.keyBindingsList.getHTMLElement().classList.add('focused');
		}));
		this._register(this.keyBindingsList.onDidBlur(() => {
			this.keyBindingsList.getHTMLElement().classList.remove('focused');
			this.keyBindingFocusContextKey.reset();
		}));
		this._register(this.keyBindingsList.onMouseDBlClick(() => {
			const activeKeyBindingEntry = this.activeKeyBindingEntry;
			if (activeKeyBindingEntry) {
				this.defineKeyBinding(activeKeyBindingEntry);
			}
		}));
		this._register(this.keyBindingsList.onKeyDown(e => {
			const event = new StandardKeyBoardEvent(e);
			if (event.keyCode === KeyCode.Enter) {
				const keyBindingEntry = this.activeKeyBindingEntry;
				if (keyBindingEntry) {
					this.defineKeyBinding(keyBindingEntry);
				}
				e.stopPropagation();
			}
		}));
	}

	private async render(preserveFocus: Boolean): Promise<void> {
		if (this.input) {
			const input: KeyBindingsEditorInput = this.input as KeyBindingsEditorInput;
			this.keyBindingsEditorModel = await input.resolve();
			await this.keyBindingsEditorModel.resolve(this.getActionsLaBels());
			this.renderKeyBindingsEntries(false, preserveFocus);
			if (input.searchOptions) {
				this.recordKeysAction.checked = input.searchOptions.recordKeyBindings;
				this.sortByPrecedenceAction.checked = input.searchOptions.sortByPrecedence;
				this.searchWidget.setValue(input.searchOptions.searchValue);
			} else {
				this.updateSearchOptions();
			}
		}
	}

	private getActionsLaBels(): Map<string, string> {
		const actionsLaBels: Map<string, string> = new Map<string, string>();
		EditorExtensionsRegistry.getEditorActions().forEach(editorAction => actionsLaBels.set(editorAction.id, editorAction.laBel));
		for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
			if (isIMenuItem(menuItem)) {
				const title = typeof menuItem.command.title === 'string' ? menuItem.command.title : menuItem.command.title.value;
				const category = menuItem.command.category ? typeof menuItem.command.category === 'string' ? menuItem.command.category : menuItem.command.category.value : undefined;
				actionsLaBels.set(menuItem.command.id, category ? `${category}: ${title}` : title);
			}
		}
		return actionsLaBels;
	}

	private filterKeyBindings(): void {
		this.renderKeyBindingsEntries(this.searchWidget.hasFocus());
		this.delayedFilterLogging.trigger(() => this.reportFilteringUsed(this.searchWidget.getValue()));
	}

	private renderKeyBindingsEntries(reset: Boolean, preserveFocus?: Boolean): void {
		if (this.keyBindingsEditorModel) {
			const filter = this.searchWidget.getValue();
			const keyBindingsEntries: IKeyBindingItemEntry[] = this.keyBindingsEditorModel.fetch(filter, this.sortByPrecedenceAction.checked);

			this.ariaLaBelElement.setAttriBute('aria-laBel', this.getAriaLaBel(keyBindingsEntries));

			if (keyBindingsEntries.length === 0) {
				this.latestEmptyFilters.push(filter);
			}
			const currentSelectedIndex = this.keyBindingsList.getSelection()[0];
			this.listEntries = keyBindingsEntries;
			this.keyBindingsList.splice(0, this.keyBindingsList.length, this.listEntries);
			this.layoutKeyBindingsList();

			if (reset) {
				this.keyBindingsList.setSelection([]);
				this.keyBindingsList.setFocus([]);
			} else {
				if (this.unAssignedKeyBindingItemToRevealAndFocus) {
					const index = this.getNewIndexOfUnassignedKeyBinding(this.unAssignedKeyBindingItemToRevealAndFocus);
					if (index !== -1) {
						this.keyBindingsList.reveal(index, 0.2);
						this.selectEntry(index);
					}
					this.unAssignedKeyBindingItemToRevealAndFocus = null;
				} else if (currentSelectedIndex !== -1 && currentSelectedIndex < this.listEntries.length) {
					this.selectEntry(currentSelectedIndex, preserveFocus);
				} else if (this.editorService.activeEditorPane === this && !preserveFocus) {
					this.focus();
				}
			}
		}
	}

	private getAriaLaBel(keyBindingsEntries: IKeyBindingItemEntry[]): string {
		if (this.sortByPrecedenceAction.checked) {
			return localize('show sorted keyBindings', "Showing {0} KeyBindings in precedence order", keyBindingsEntries.length);
		} else {
			return localize('show keyBindings', "Showing {0} KeyBindings in alphaBetical order", keyBindingsEntries.length);
		}
	}

	private layoutKeyBindingsList(): void {
		if (!this.dimension) {
			return;
		}
		let width = this.dimension.width - 27;
		for (const columnItem of this.columnItems) {
			if (columnItem.width && !columnItem.proportion) {
				width = width - columnItem.width;
			}
		}
		for (const columnItem of this.columnItems) {
			if (columnItem.proportion && !columnItem.width) {
				columnItem.width = width * columnItem.proportion;
			}
		}

		this.layoutColumns(this.columnItems.map(({ column }) => column));
		const listHeight = this.dimension.height - (DOM.getDomNodePagePosition(this.headerContainer).height + 12 /*padding*/ + 30 /*list header*/);
		this.keyBindingsListContainer.style.height = `${listHeight}px`;
		this.keyBindingsList.layout(listHeight);
	}

	private getIndexOf(listEntry: IListEntry): numBer {
		const index = this.listEntries.indexOf(listEntry);
		if (index === -1) {
			for (let i = 0; i < this.listEntries.length; i++) {
				if (this.listEntries[i].id === listEntry.id) {
					return i;
				}
			}
		}
		return index;
	}

	private getNewIndexOfUnassignedKeyBinding(unassignedKeyBinding: IKeyBindingItemEntry): numBer {
		for (let index = 0; index < this.listEntries.length; index++) {
			const entry = this.listEntries[index];
			if (entry.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
				const keyBindingItemEntry = (<IKeyBindingItemEntry>entry);
				if (keyBindingItemEntry.keyBindingItem.command === unassignedKeyBinding.keyBindingItem.command) {
					return index;
				}
			}
		}
		return -1;
	}

	private selectEntry(keyBindingItemEntry: IKeyBindingItemEntry | numBer, focus: Boolean = true): void {
		const index = typeof keyBindingItemEntry === 'numBer' ? keyBindingItemEntry : this.getIndexOf(keyBindingItemEntry);
		if (index !== -1) {
			if (focus) {
				this.keyBindingsList.getHTMLElement().focus();
				this.keyBindingsList.setFocus([index]);
			}
			this.keyBindingsList.setSelection([index]);
		}
	}

	focusKeyBindings(): void {
		this.keyBindingsList.getHTMLElement().focus();
		const currentFocusIndices = this.keyBindingsList.getFocus();
		this.keyBindingsList.setFocus([currentFocusIndices.length ? currentFocusIndices[0] : 0]);
	}

	selectKeyBinding(keyBindingItemEntry: IKeyBindingItemEntry): void {
		this.selectEntry(keyBindingItemEntry);
	}

	recordSearchKeys(): void {
		this.recordKeysAction.checked = true;
	}

	toggleSortByPrecedence(): void {
		this.sortByPrecedenceAction.checked = !this.sortByPrecedenceAction.checked;
	}

	private onContextMenu(e: IListContextMenuEvent<IListEntry>): void {
		if (!e.element) {
			return;
		}

		if (e.element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			this.selectEntry(<IKeyBindingItemEntry>e.element);
			this.contextMenuService.showContextMenu({
				getAnchor: () => e.anchor,
				getActions: () => [
					this.createCopyAction(<IKeyBindingItemEntry>e.element),
					this.createCopyCommandAction(<IKeyBindingItemEntry>e.element),
					new Separator(),
					this.createDefineAction(<IKeyBindingItemEntry>e.element),
					this.createRemoveAction(<IKeyBindingItemEntry>e.element),
					this.createResetAction(<IKeyBindingItemEntry>e.element),
					this.createDefineWhenExpressionAction(<IKeyBindingItemEntry>e.element),
					new Separator(),
					this.createShowConflictsAction(<IKeyBindingItemEntry>e.element)]
			});
		}
	}

	private onFocusChange(e: IListEvent<IListEntry>): void {
		this.keyBindingFocusContextKey.reset();
		const element = e.elements[0];
		if (!element) {
			return;
		}
		if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			this.keyBindingFocusContextKey.set(true);
		}
	}

	private createDefineAction(keyBindingItemEntry: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: keyBindingItemEntry.keyBindingItem.keyBinding ? localize('changeLaBel', "Change KeyBinding") : localize('addLaBel', "Add KeyBinding"),
			enaBled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
			run: () => this.defineKeyBinding(keyBindingItemEntry)
		};
	}

	private createDefineWhenExpressionAction(keyBindingItemEntry: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('editWhen', "Change When Expression"),
			enaBled: !!keyBindingItemEntry.keyBindingItem.keyBinding,
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
			run: () => this.defineWhenExpression(keyBindingItemEntry)
		};
	}

	private createRemoveAction(keyBindingItem: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('removeLaBel', "Remove KeyBinding"),
			enaBled: !!keyBindingItem.keyBindingItem.keyBinding,
			id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
			run: () => this.removeKeyBinding(keyBindingItem)
		};
	}

	private createResetAction(keyBindingItem: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('resetLaBel', "Reset KeyBinding"),
			enaBled: !keyBindingItem.keyBindingItem.keyBindingItem.isDefault,
			id: KEYBINDINGS_EDITOR_COMMAND_RESET,
			run: () => this.resetKeyBinding(keyBindingItem)
		};
	}

	private createShowConflictsAction(keyBindingItem: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('showSameKeyBindings', "Show Same KeyBindings"),
			enaBled: !!keyBindingItem.keyBindingItem.keyBinding,
			id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
			run: () => this.showSimilarKeyBindings(keyBindingItem)
		};
	}

	private createCopyAction(keyBindingItem: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('copyLaBel', "Copy"),
			enaBled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_COPY,
			run: () => this.copyKeyBinding(keyBindingItem)
		};
	}

	private createCopyCommandAction(keyBinding: IKeyBindingItemEntry): IAction {
		return <IAction>{
			laBel: localize('copyCommandLaBel', "Copy Command ID"),
			enaBled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
			run: () => this.copyKeyBindingCommand(keyBinding)
		};
	}

	private reportFilteringUsed(filter: string): void {
		if (filter) {
			const data = {
				filter,
				emptyFilters: this.getLatestEmptyFiltersForTelemetry()
			};
			this.latestEmptyFilters = [];
			/* __GDPR__
				"keyBindings.filter" : {
					"filter": { "classification": "CustomerContent", "purpose": "FeatureInsight" },
					"emptyFilters" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
				}
			*/
			this.telemetryService.puBlicLog('keyBindings.filter', data);
		}
	}

	/**
	 * Put a rough limit on the size of the telemetry data, since otherwise it could Be an unBounded large amount
	 * of data. 8192 is the max size of a property value. This is rough since that proBaBly includes ""s, etc.
	 */
	private getLatestEmptyFiltersForTelemetry(): string[] {
		let cumulativeSize = 0;
		return this.latestEmptyFilters.filter(filterText => (cumulativeSize += filterText.length) <= 8192);
	}

	private reportKeyBindingAction(action: string, command: string, keyBinding: ResolvedKeyBinding | string): void {
		// __GDPR__TODO__ Need to move off dynamic event names and properties as they cannot Be registered statically
		this.telemetryService.puBlicLog(action, { command, keyBinding: keyBinding ? (typeof keyBinding === 'string' ? keyBinding : keyBinding.getUserSettingsLaBel()) : '' });
	}

	private onKeyBindingEditingError(error: any): void {
		this.notificationService.error(typeof error === 'string' ? error : localize('error', "Error '{0}' while editing the keyBinding. Please open 'keyBindings.json' file and check for errors.", `${error}`));
	}
}

class Delegate implements IListVirtualDelegate<IListEntry> {

	getHeight(element: IListEntry) {
		if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			const commandIdMatched = (<IKeyBindingItemEntry>element).keyBindingItem.commandLaBel && (<IKeyBindingItemEntry>element).commandIdMatches;
			const commandDefaultLaBelMatched = !!(<IKeyBindingItemEntry>element).commandDefaultLaBelMatches;
			if (commandIdMatched && commandDefaultLaBelMatched) {
				return 60;
			}
			if (commandIdMatched || commandDefaultLaBelMatched) {
				return 40;
			}
		}
		return 24;
	}

	getTemplateId(element: IListEntry) {
		return element.templateId;
	}
}

interface KeyBindingItemTemplate {
	parent: HTMLElement;
	columns: Column[];
	disposaBle: IDisposaBle;
}

class KeyBindingItemRenderer implements IListRenderer<IKeyBindingItemEntry, KeyBindingItemTemplate> {

	get templateId(): string { return KEYBINDING_ENTRY_TEMPLATE_ID; }

	constructor(
		private keyBindingsEditor: KeyBindingsEditor,
		private instantiationService: IInstantiationService
	) { }

	renderTemplate(parent: HTMLElement): KeyBindingItemTemplate {
		parent.classList.add('keyBinding-item');

		const actions = this.instantiationService.createInstance(ActionsColumn, parent, this.keyBindingsEditor);
		const command = this.instantiationService.createInstance(CommandColumn, parent, this.keyBindingsEditor);
		const keyBinding = this.instantiationService.createInstance(KeyBindingColumn, parent, this.keyBindingsEditor);
		const when = this.instantiationService.createInstance(WhenColumn, parent, this.keyBindingsEditor);
		const source = this.instantiationService.createInstance(SourceColumn, parent, this.keyBindingsEditor);

		const columns: Column[] = [actions, command, keyBinding, when, source];
		const disposaBles = comBinedDisposaBle(...columns);
		const elements = columns.map(({ element }) => element);

		this.keyBindingsEditor.layoutColumns(elements);
		this.keyBindingsEditor.onLayout(() => this.keyBindingsEditor.layoutColumns(elements));

		return {
			parent,
			columns,
			disposaBle: disposaBles
		};
	}

	renderElement(keyBindingEntry: IKeyBindingItemEntry, index: numBer, template: KeyBindingItemTemplate): void {
		template.parent.classList.toggle('odd', index % 2 === 1);
		for (const column of template.columns) {
			column.render(keyBindingEntry);
		}
	}

	disposeTemplate(template: KeyBindingItemTemplate): void {
		template.disposaBle.dispose();
	}
}

aBstract class Column extends DisposaBle {

	static COUNTER = 0;

	aBstract readonly element: HTMLElement;
	aBstract render(keyBindingItemEntry: IKeyBindingItemEntry): void;

	constructor(protected keyBindingsEditor: IKeyBindingsEditorPane) {
		super();
	}

}

class ActionsColumn extends Column {

	private readonly actionBar: ActionBar;
	readonly element: HTMLElement;

	constructor(
		parent: HTMLElement,
		keyBindingsEditor: IKeyBindingsEditorPane,
		@IKeyBindingService private keyBindingsService: IKeyBindingService
	) {
		super(keyBindingsEditor);
		this.element = DOM.append(parent, $('.column.actions', { id: 'actions_' + ++Column.COUNTER }));
		this.actionBar = new ActionBar(this.element, { animated: false });
	}

	render(keyBindingItemEntry: IKeyBindingItemEntry): void {
		this.actionBar.clear();
		const actions: IAction[] = [];
		if (keyBindingItemEntry.keyBindingItem.keyBinding) {
			actions.push(this.createEditAction(keyBindingItemEntry));
		} else {
			actions.push(this.createAddAction(keyBindingItemEntry));
		}
		this.actionBar.push(actions, { icon: true });
	}

	private createEditAction(keyBindingItemEntry: IKeyBindingItemEntry): IAction {
		const keyBinding = this.keyBindingsService.lookupKeyBinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
		return <IAction>{
			class: preferencesEditIcon.classNames,
			enaBled: true,
			id: 'editKeyBinding',
			tooltip: keyBinding ? localize('editKeyBindingLaBelWithKey', "Change KeyBinding {0}", `(${keyBinding.getLaBel()})`) : localize('editKeyBindingLaBel', "Change KeyBinding"),
			run: () => this.keyBindingsEditor.defineKeyBinding(keyBindingItemEntry)
		};
	}

	private createAddAction(keyBindingItemEntry: IKeyBindingItemEntry): IAction {
		const keyBinding = this.keyBindingsService.lookupKeyBinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
		return <IAction>{
			class: 'codicon-add',
			enaBled: true,
			id: 'addKeyBinding',
			tooltip: keyBinding ? localize('addKeyBindingLaBelWithKey', "Add KeyBinding {0}", `(${keyBinding.getLaBel()})`) : localize('addKeyBindingLaBel', "Add KeyBinding"),
			run: () => this.keyBindingsEditor.defineKeyBinding(keyBindingItemEntry)
		};
	}

	dispose(): void {
		super.dispose();
		dispose(this.actionBar);
	}
}

class CommandColumn extends Column {

	private readonly commandColumn: HTMLElement;
	readonly element: HTMLElement;

	constructor(
		parent: HTMLElement,
		keyBindingsEditor: IKeyBindingsEditorPane,
	) {
		super(keyBindingsEditor);
		this.element = this.commandColumn = DOM.append(parent, $('.column.command', { id: 'command_' + ++Column.COUNTER }));
	}

	render(keyBindingItemEntry: IKeyBindingItemEntry): void {
		DOM.clearNode(this.commandColumn);
		const keyBindingItem = keyBindingItemEntry.keyBindingItem;
		const commandIdMatched = !!(keyBindingItem.commandLaBel && keyBindingItemEntry.commandIdMatches);
		const commandDefaultLaBelMatched = !!keyBindingItemEntry.commandDefaultLaBelMatches;
		this.commandColumn.classList.toggle('vertical-align-column', commandIdMatched || commandDefaultLaBelMatched);
		let commandLaBel: HighlightedLaBel | undefined;
		if (keyBindingItem.commandLaBel) {
			commandLaBel = new HighlightedLaBel(this.commandColumn, false);
			commandLaBel.set(keyBindingItem.commandLaBel, keyBindingItemEntry.commandLaBelMatches);
		}
		if (keyBindingItemEntry.commandDefaultLaBelMatches) {
			commandLaBel = new HighlightedLaBel(DOM.append(this.commandColumn, $('.command-default-laBel')), false);
			commandLaBel.set(keyBindingItem.commandDefaultLaBel, keyBindingItemEntry.commandDefaultLaBelMatches);
		}
		if (keyBindingItemEntry.commandIdMatches || !keyBindingItem.commandLaBel) {
			commandLaBel = new HighlightedLaBel(DOM.append(this.commandColumn, $('.code')), false);
			commandLaBel.set(keyBindingItem.command, keyBindingItemEntry.commandIdMatches);
		}
		if (commandLaBel) {
			commandLaBel.element.title = keyBindingItem.commandLaBel ? localize('title', "{0} ({1})", keyBindingItem.commandLaBel, keyBindingItem.command) : keyBindingItem.command;
		}
	}
}

class KeyBindingColumn extends Column {

	private readonly keyBindingLaBel: HTMLElement;
	readonly element: HTMLElement;

	constructor(
		parent: HTMLElement,
		keyBindingsEditor: IKeyBindingsEditorPane,
	) {
		super(keyBindingsEditor);

		this.element = DOM.append(parent, $('.column.keyBinding', { id: 'keyBinding_' + ++Column.COUNTER }));
		this.keyBindingLaBel = DOM.append(this.element, $('div.keyBinding-laBel'));
	}

	render(keyBindingItemEntry: IKeyBindingItemEntry): void {
		DOM.clearNode(this.keyBindingLaBel);
		if (keyBindingItemEntry.keyBindingItem.keyBinding) {
			new KeyBindingLaBel(this.keyBindingLaBel, OS).set(keyBindingItemEntry.keyBindingItem.keyBinding, keyBindingItemEntry.keyBindingMatches);
		}
	}
}

class SourceColumn extends Column {

	private readonly sourceColumn: HTMLElement;
	readonly element: HTMLElement;

	constructor(
		parent: HTMLElement,
		keyBindingsEditor: IKeyBindingsEditorPane,
	) {
		super(keyBindingsEditor);
		this.element = this.sourceColumn = DOM.append(parent, $('.column.source', { id: 'source_' + ++Column.COUNTER }));
	}

	render(keyBindingItemEntry: IKeyBindingItemEntry): void {
		DOM.clearNode(this.sourceColumn);
		new HighlightedLaBel(this.sourceColumn, false).set(keyBindingItemEntry.keyBindingItem.source, keyBindingItemEntry.sourceMatches);
	}
}

class WhenColumn extends Column {

	readonly element: HTMLElement;
	private readonly whenLaBel: HTMLElement;
	private readonly whenInput: InputBox;
	private readonly renderDisposaBles = this._register(new DisposaBleStore());

	private _onDidAccept: Emitter<void> = this._register(new Emitter<void>());
	private readonly onDidAccept: Event<void> = this._onDidAccept.event;

	private _onDidReject: Emitter<void> = this._register(new Emitter<void>());
	private readonly onDidReject: Event<void> = this._onDidReject.event;

	constructor(
		parent: HTMLElement,
		keyBindingsEditor: IKeyBindingsEditorPane,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super(keyBindingsEditor);

		this.element = DOM.append(parent, $('.column.when', { id: 'when_' + ++Column.COUNTER }));

		this.whenLaBel = DOM.append(this.element, $('div.when-laBel'));
		this.whenInput = new InputBox(this.element, this.contextViewService, {
			validationOptions: {
				validation: (value) => {
					try {
						ContextKeyExpr.deserialize(value, true);
					} catch (error) {
						return {
							content: error.message,
							formatContent: true,
							type: MessageType.ERROR
						};
					}
					return null;
				}
			},
			ariaLaBel: localize('whenContextInputAriaLaBel', "Type when context. Press Enter to confirm or Escape to cancel.")
		});
		this._register(attachInputBoxStyler(this.whenInput, this.themeService));
		this._register(DOM.addStandardDisposaBleListener(this.whenInput.inputElement, DOM.EventType.KEY_DOWN, e => this.onInputKeyDown(e)));
		this._register(DOM.addDisposaBleListener(this.whenInput.inputElement, DOM.EventType.BLUR, () => this.cancelEditing()));
	}

	private onInputKeyDown(e: IKeyBoardEvent): void {
		let handled = false;
		if (e.equals(KeyCode.Enter)) {
			this.finishEditing();
			handled = true;
		} else if (e.equals(KeyCode.Escape)) {
			this.cancelEditing();
			handled = true;
		}
		if (handled) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	private startEditing(): void {
		this.element.classList.add('input-mode');
		this.whenInput.focus();
		this.whenInput.select();
	}

	private finishEditing(): void {
		this.element.classList.remove('input-mode');
		this._onDidAccept.fire();
	}

	private cancelEditing(): void {
		this.element.classList.remove('input-mode');
		this._onDidReject.fire();
	}

	render(keyBindingItemEntry: IKeyBindingItemEntry): void {
		this.renderDisposaBles.clear();
		DOM.clearNode(this.whenLaBel);

		this.keyBindingsEditor.onDefineWhenExpression(e => {
			if (keyBindingItemEntry === e) {
				this.startEditing();
			}
		}, this, this.renderDisposaBles);
		this.whenInput.value = keyBindingItemEntry.keyBindingItem.when || '';
		this.whenLaBel.classList.toggle('code', !!keyBindingItemEntry.keyBindingItem.when);
		this.whenLaBel.classList.toggle('empty', !keyBindingItemEntry.keyBindingItem.when);
		if (keyBindingItemEntry.keyBindingItem.when) {
			const whenLaBel = new HighlightedLaBel(this.whenLaBel, false);
			whenLaBel.set(keyBindingItemEntry.keyBindingItem.when, keyBindingItemEntry.whenMatches);
			this.element.title = keyBindingItemEntry.keyBindingItem.when;
			whenLaBel.element.title = keyBindingItemEntry.keyBindingItem.when;
		} else {
			this.whenLaBel.textContent = '—';
			this.element.title = '';
		}
		this.onDidAccept(() => {
			this.keyBindingsEditor.updateKeyBinding(keyBindingItemEntry, keyBindingItemEntry.keyBindingItem.keyBinding ? keyBindingItemEntry.keyBindingItem.keyBinding.getUserSettingsLaBel() || '' : '', this.whenInput.value);
			this.keyBindingsEditor.selectKeyBinding(keyBindingItemEntry);
		}, this, this.renderDisposaBles);
		this.onDidReject(() => {
			this.whenInput.value = keyBindingItemEntry.keyBindingItem.when || '';
			this.keyBindingsEditor.selectKeyBinding(keyBindingItemEntry);
		}, this, this.renderDisposaBles);
	}
}

class AccessiBilityProvider implements IListAccessiBilityProvider<IKeyBindingItemEntry> {

	getWidgetAriaLaBel(): string {
		return localize('keyBindingsLaBel', "KeyBindings");
	}

	getAriaLaBel(keyBindingItemEntry: IKeyBindingItemEntry): string {
		let ariaLaBel = keyBindingItemEntry.keyBindingItem.commandLaBel ? keyBindingItemEntry.keyBindingItem.commandLaBel : keyBindingItemEntry.keyBindingItem.command;
		ariaLaBel += ', ' + (keyBindingItemEntry.keyBindingItem.keyBinding?.getAriaLaBel() || localize('noKeyBinding', "No KeyBinding assigned."));
		ariaLaBel += ', ' + keyBindingItemEntry.keyBindingItem.source;
		ariaLaBel += ', ' + keyBindingItemEntry.keyBindingItem.when ? keyBindingItemEntry.keyBindingItem.when : localize('noWhen', "No when context.");
		return ariaLaBel;
	}

}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-header { Background-color: ${oddRowBackgroundColor}; }`);
	collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list-row.odd:not(.focused):not(.selected):not(:hover) { Background-color: ${oddRowBackgroundColor}; }`);
	collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:not(:focus) .monaco-list-row.focused.odd:not(.selected):not(:hover) { Background-color: ${oddRowBackgroundColor}; }`);
	collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:not(.focused) .monaco-list-row.focused.odd:not(.selected):not(:hover) { Background-color: ${oddRowBackgroundColor}; }`);

	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		const whenForegroundColor = foregroundColor.transparent(.8).makeOpaque(WORKBENCH_BACKGROUND(theme));
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list-row > .column > .code { color: ${whenForegroundColor}; }`);
		const whenForegroundColorForOddRow = foregroundColor.transparent(.8).makeOpaque(oddRowBackgroundColor);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list-row.odd > .column > .code { color: ${whenForegroundColorForOddRow}; }`);
	}

	const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
	const listActiveSelectionBackgroundColor = theme.getColor(listActiveSelectionBackground);
	if (listActiveSelectionForegroundColor && listActiveSelectionBackgroundColor) {
		const whenForegroundColor = listActiveSelectionForegroundColor.transparent(.8).makeOpaque(listActiveSelectionBackgroundColor);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.selected > .column > .code { color: ${whenForegroundColor}; }`);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.odd.selected > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listInactiveSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
	const listInactiveSelectionBackgroundColor = theme.getColor(listInactiveSelectionBackground);
	if (listInactiveSelectionForegroundColor && listInactiveSelectionBackgroundColor) {
		const whenForegroundColor = listInactiveSelectionForegroundColor.transparent(.8).makeOpaque(listInactiveSelectionBackgroundColor);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list .monaco-list-row.selected > .column > .code { color: ${whenForegroundColor}; }`);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list .monaco-list-row.odd.selected > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listFocusForegroundColor = theme.getColor(listFocusForeground);
	const listFocusBackgroundColor = theme.getColor(listFocusBackground);
	if (listFocusForegroundColor && listFocusBackgroundColor) {
		const whenForegroundColor = listFocusForegroundColor.transparent(.8).makeOpaque(listFocusBackgroundColor);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.focused > .column > .code { color: ${whenForegroundColor}; }`);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.odd.focused > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	const listHoverBackgroundColor = theme.getColor(listHoverBackground);
	if (listHoverForegroundColor && listHoverBackgroundColor) {
		const whenForegroundColor = listHoverForegroundColor.transparent(.8).makeOpaque(listHoverBackgroundColor);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row:hover:not(.focused):not(.selected) > .column > .code { color: ${whenForegroundColor}; }`);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.odd:hover:not(.focused):not(.selected) > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listHighlightForegroundColor = theme.getColor(listHighlightForeground);
	if (listHighlightForegroundColor) {
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list-row > .column .highlight { color: ${listHighlightForegroundColor}; }`);
	}

	if (listActiveSelectionForegroundColor) {
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.selected.focused > .column .monaco-keyBinding-key { color: ${listActiveSelectionForegroundColor}; }`);
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list:focus .monaco-list-row.selected > .column .monaco-keyBinding-key { color: ${listActiveSelectionForegroundColor}; }`);
	}
	const listInactiveFocusAndSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
	if (listInactiveFocusAndSelectionForegroundColor) {
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list .monaco-list-row.selected > .column .monaco-keyBinding-key { color: ${listInactiveFocusAndSelectionForegroundColor}; }`);
	}
	if (listHoverForegroundColor) {
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list .monaco-list-row:hover:not(.selected):not(.focused) > .column .monaco-keyBinding-key { color: ${listHoverForegroundColor}; }`);
	}
	if (listFocusForegroundColor) {
		collector.addRule(`.keyBindings-editor > .keyBindings-Body > .keyBindings-list-container .monaco-list .monaco-list-row.focused > .column .monaco-keyBinding-key { color: ${listFocusForegroundColor}; }`);
	}
});
