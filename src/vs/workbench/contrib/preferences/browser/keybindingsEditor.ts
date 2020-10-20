/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/keybindingsEditor';
import { locAlize } from 'vs/nls';
import { DelAyer } from 'vs/bAse/common/Async';
import * As DOM from 'vs/bAse/browser/dom';
import { OS } from 'vs/bAse/common/plAtform';
import { dispose, DisposAble, IDisposAble, combinedDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { CheckboxActionViewItem } from 'vs/bAse/browser/ui/checkbox/checkbox';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { KeybindingLAbel } from 'vs/bAse/browser/ui/keybindingLAbel/keybindingLAbel';
import { IAction, Action, SepArAtor } from 'vs/bAse/common/Actions';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { KeybindingsEditorModel, IKeybindingItemEntry, IListEntry, KEYBINDING_ENTRY_TEMPLATE_ID } from 'vs/workbench/services/preferences/common/keybindingsEditorModel';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService, IUserFriendlyKeybinding } from 'vs/plAtform/keybinding/common/keybinding';
import { DefineKeybindingWidget, KeybindingsSeArchWidget, KeybindingsSeArchOptions } from 'vs/workbench/contrib/preferences/browser/keybindingWidgets';
import { IKeybindingsEditorPAne, CONTEXT_KEYBINDING_FOCUS, CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR } from 'vs/workbench/contrib/preferences/common/preferences';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IKeybindingEditingService } from 'vs/workbench/services/keybinding/common/keybindingEditing';
import { IListVirtuAlDelegAte, IListRenderer, IListContextMenuEvent, IListEvent } from 'vs/bAse/browser/ui/list/list';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { IContextKeyService, IContextKey, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { StAndArdKeyboArdEvent, IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode, ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { listHighlightForeground, bAdgeBAckground, contrAstBorder, bAdgeForeground, listActiveSelectionForeground, listInActiveSelectionForeground, listHoverForeground, listFocusForeground, editorBAckground, foreground, listActiveSelectionBAckground, listInActiveSelectionBAckground, listFocusBAckground, listHoverBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorExtensionsRegistry } from 'vs/editor/browser/editorExtensions';
import { WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { KeybindingsEditorInput } from 'vs/workbench/services/preferences/common/preferencesEditorInput';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { AttAchStylerCAllbAck, AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { InputBox, MessAgeType } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { Emitter, Event } from 'vs/bAse/common/event';
import { MenuRegistry, MenuId, isIMenuItem } from 'vs/plAtform/Actions/common/Actions';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { preferencesEditIcon } from 'vs/workbench/contrib/preferences/browser/preferencesWidgets';
import { Color, RGBA } from 'vs/bAse/common/color';
import { WORKBENCH_BACKGROUND } from 'vs/workbench/common/theme';
import { ThemAbleCheckboxActionViewItem } from 'vs/plAtform/theme/browser/checkbox';

const $ = DOM.$;

interfAce ColumnItem {
	column: HTMLElement;
	proportion?: number;
	width: number;
}

const oddRowBAckgroundColor = new Color(new RGBA(130, 130, 130, 0.04));

export clAss KeybindingsEditor extends EditorPAne implements IKeybindingsEditorPAne {

	stAtic reAdonly ID: string = 'workbench.editor.keybindings';

	privAte _onDefineWhenExpression: Emitter<IKeybindingItemEntry> = this._register(new Emitter<IKeybindingItemEntry>());
	reAdonly onDefineWhenExpression: Event<IKeybindingItemEntry> = this._onDefineWhenExpression.event;

	privAte _onLAyout: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onLAyout: Event<void> = this._onLAyout.event;

	privAte keybindingsEditorModel: KeybindingsEditorModel | null = null;

	privAte heAderContAiner!: HTMLElement;
	privAte ActionsContAiner!: HTMLElement;
	privAte seArchWidget!: KeybindingsSeArchWidget;

	privAte overlAyContAiner!: HTMLElement;
	privAte defineKeybindingWidget!: DefineKeybindingWidget;

	privAte columnItems: ColumnItem[] = [];
	privAte keybindingsListContAiner!: HTMLElement;
	privAte unAssignedKeybindingItemToReveAlAndFocus: IKeybindingItemEntry | null = null;
	privAte listEntries: IListEntry[] = [];
	privAte keybindingsList!: WorkbenchList<IListEntry>;

	privAte dimension: DOM.Dimension | null = null;
	privAte delAyedFiltering: DelAyer<void>;
	privAte lAtestEmptyFilters: string[] = [];
	privAte delAyedFilterLogging: DelAyer<void>;
	privAte keybindingsEditorContextKey: IContextKey<booleAn>;
	privAte keybindingFocusContextKey: IContextKey<booleAn>;
	privAte seArchFocusContextKey: IContextKey<booleAn>;

	privAte reAdonly sortByPrecedenceAction: Action;
	privAte reAdonly recordKeysAction: Action;

	privAte AriALAbelElement!: HTMLElement;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IKeybindingService privAte reAdonly keybindingsService: IKeybindingService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IKeybindingEditingService privAte reAdonly keybindingEditingService: IKeybindingEditingService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IStorAgeService storAgeService: IStorAgeService
	) {
		super(KeybindingsEditor.ID, telemetryService, themeService, storAgeService);
		this.delAyedFiltering = new DelAyer<void>(300);
		this._register(keybindingsService.onDidUpdAteKeybindings(() => this.render(!!this.keybindingFocusContextKey.get())));

		this.keybindingsEditorContextKey = CONTEXT_KEYBINDINGS_EDITOR.bindTo(this.contextKeyService);
		this.seArchFocusContextKey = CONTEXT_KEYBINDINGS_SEARCH_FOCUS.bindTo(this.contextKeyService);
		this.keybindingFocusContextKey = CONTEXT_KEYBINDING_FOCUS.bindTo(this.contextKeyService);
		this.delAyedFilterLogging = new DelAyer<void>(1000);

		const recordKeysActionKeybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS);
		const recordKeysActionLAbel = locAlize('recordKeysLAbel', "Record Keys");
		this.recordKeysAction = new Action(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, recordKeysActionKeybinding ? locAlize('recordKeysLAbelWithKeybinding', "{0} ({1})", recordKeysActionLAbel, recordKeysActionKeybinding.getLAbel()) : recordKeysActionLAbel, 'codicon-record-keys');
		this.recordKeysAction.checked = fAlse;

		const sortByPrecedenceActionKeybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE);
		const sortByPrecedenceActionLAbel = locAlize('sortByPrecedeneLAbel', "Sort by Precedence");
		this.sortByPrecedenceAction = new Action('keybindings.editor.sortByPrecedence', sortByPrecedenceActionKeybinding ? locAlize('sortByPrecedeneLAbelWithKeybinding', "{0} ({1})", sortByPrecedenceActionLAbel, sortByPrecedenceActionKeybinding.getLAbel()) : sortByPrecedenceActionLAbel, 'codicon-sort-precedence');
		this.sortByPrecedenceAction.checked = fAlse;
	}

	creAteEditor(pArent: HTMLElement): void {
		const keybindingsEditorElement = DOM.Append(pArent, $('div', { clAss: 'keybindings-editor' }));

		this.creAteAriALAbelElement(keybindingsEditorElement);
		this.creAteOverlAyContAiner(keybindingsEditorElement);
		this.creAteHeAder(keybindingsEditorElement);
		this.creAteBody(keybindingsEditorElement);
	}

	setInput(input: KeybindingsEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		this.keybindingsEditorContextKey.set(true);
		return super.setInput(input, options, context, token)
			.then(() => this.render(!!(options && options.preserveFocus)));
	}

	cleArInput(): void {
		super.cleArInput();
		this.keybindingsEditorContextKey.reset();
		this.keybindingFocusContextKey.reset();
	}

	lAyout(dimension: DOM.Dimension): void {
		this.dimension = dimension;
		this.lAyoutSeArchWidget(dimension);

		this.overlAyContAiner.style.width = dimension.width + 'px';
		this.overlAyContAiner.style.height = dimension.height + 'px';
		this.defineKeybindingWidget.lAyout(this.dimension);

		this.columnItems.forEAch(columnItem => {
			if (columnItem.proportion) {
				columnItem.width = 0;
			}
		});
		this.lAyoutKeybindingsList();
		this._onLAyout.fire();
	}

	lAyoutColumns(columns: HTMLElement[]): void {
		if (this.columnItems) {
			columns.forEAch((column, index) => {
				column.style.pAddingRight = `6px`;
				column.style.width = `${this.columnItems[index].width}px`;
			});
		}
	}

	focus(): void {
		const ActiveKeybindingEntry = this.ActiveKeybindingEntry;
		if (ActiveKeybindingEntry) {
			this.selectEntry(ActiveKeybindingEntry);
		} else {
			this.seArchWidget.focus();
		}
	}

	get ActiveKeybindingEntry(): IKeybindingItemEntry | null {
		const focusedElement = this.keybindingsList.getFocusedElements()[0];
		return focusedElement && focusedElement.templAteId === KEYBINDING_ENTRY_TEMPLATE_ID ? <IKeybindingItemEntry>focusedElement : null;
	}

	defineKeybinding(keybindingEntry: IKeybindingItemEntry): Promise<Any> {
		this.selectEntry(keybindingEntry);
		this.showOverlAyContAiner();
		return this.defineKeybindingWidget.define().then(key => {
			if (key) {
				this.reportKeybindingAction(KEYBINDINGS_EDITOR_COMMAND_DEFINE, keybindingEntry.keybindingItem.commAnd, key);
				return this.updAteKeybinding(keybindingEntry, key, keybindingEntry.keybindingItem.when);
			}
			return null;
		}).then(() => {
			this.hideOverlAyContAiner();
			this.selectEntry(keybindingEntry);
		}, error => {
			this.hideOverlAyContAiner();
			this.onKeybindingEditingError(error);
			this.selectEntry(keybindingEntry);
			return error;
		});
	}

	defineWhenExpression(keybindingEntry: IKeybindingItemEntry): void {
		if (keybindingEntry.keybindingItem.keybinding) {
			this.selectEntry(keybindingEntry);
			this._onDefineWhenExpression.fire(keybindingEntry);
		}
	}

	updAteKeybinding(keybindingEntry: IKeybindingItemEntry, key: string, when: string | undefined): Promise<Any> {
		const currentKey = keybindingEntry.keybindingItem.keybinding ? keybindingEntry.keybindingItem.keybinding.getUserSettingsLAbel() : '';
		if (currentKey !== key || keybindingEntry.keybindingItem.when !== when) {
			return this.keybindingEditingService.editKeybinding(keybindingEntry.keybindingItem.keybindingItem, key, when || undefined)
				.then(() => {
					if (!keybindingEntry.keybindingItem.keybinding) { // reveAl only if keybinding wAs Added to unAssinged. BecAuse the entry will be plAced in different position After rendering
						this.unAssignedKeybindingItemToReveAlAndFocus = keybindingEntry;
					}
				});
		}
		return Promise.resolve();
	}

	removeKeybinding(keybindingEntry: IKeybindingItemEntry): Promise<Any> {
		this.selectEntry(keybindingEntry);
		if (keybindingEntry.keybindingItem.keybinding) { // This should be A pre-condition
			this.reportKeybindingAction(KEYBINDINGS_EDITOR_COMMAND_REMOVE, keybindingEntry.keybindingItem.commAnd, keybindingEntry.keybindingItem.keybinding);
			return this.keybindingEditingService.removeKeybinding(keybindingEntry.keybindingItem.keybindingItem)
				.then(() => this.focus(),
					error => {
						this.onKeybindingEditingError(error);
						this.selectEntry(keybindingEntry);
					});
		}
		return Promise.resolve(null);
	}

	resetKeybinding(keybindingEntry: IKeybindingItemEntry): Promise<Any> {
		this.selectEntry(keybindingEntry);
		this.reportKeybindingAction(KEYBINDINGS_EDITOR_COMMAND_RESET, keybindingEntry.keybindingItem.commAnd, keybindingEntry.keybindingItem.keybinding);
		return this.keybindingEditingService.resetKeybinding(keybindingEntry.keybindingItem.keybindingItem)
			.then(() => {
				if (!keybindingEntry.keybindingItem.keybinding) { // reveAl only if keybinding wAs Added to unAssinged. BecAuse the entry will be plAced in different position After rendering
					this.unAssignedKeybindingItemToReveAlAndFocus = keybindingEntry;
				}
				this.selectEntry(keybindingEntry);
			},
				error => {
					this.onKeybindingEditingError(error);
					this.selectEntry(keybindingEntry);
				});
	}

	Async copyKeybinding(keybinding: IKeybindingItemEntry): Promise<void> {
		this.selectEntry(keybinding);
		this.reportKeybindingAction(KEYBINDINGS_EDITOR_COMMAND_COPY, keybinding.keybindingItem.commAnd, keybinding.keybindingItem.keybinding);
		const userFriendlyKeybinding: IUserFriendlyKeybinding = {
			key: keybinding.keybindingItem.keybinding ? keybinding.keybindingItem.keybinding.getUserSettingsLAbel() || '' : '',
			commAnd: keybinding.keybindingItem.commAnd
		};
		if (keybinding.keybindingItem.when) {
			userFriendlyKeybinding.when = keybinding.keybindingItem.when;
		}
		AwAit this.clipboArdService.writeText(JSON.stringify(userFriendlyKeybinding, null, '  '));
	}

	Async copyKeybindingCommAnd(keybinding: IKeybindingItemEntry): Promise<void> {
		this.selectEntry(keybinding);
		this.reportKeybindingAction(KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, keybinding.keybindingItem.commAnd, keybinding.keybindingItem.keybinding);
		AwAit this.clipboArdService.writeText(keybinding.keybindingItem.commAnd);
	}

	focusSeArch(): void {
		this.seArchWidget.focus();
	}

	seArch(filter: string): void {
		this.focusSeArch();
		this.seArchWidget.setVAlue(filter);
	}

	cleArSeArchResults(): void {
		this.seArchWidget.cleAr();
	}

	showSimilArKeybindings(keybindingEntry: IKeybindingItemEntry): void {
		const vAlue = `"${keybindingEntry.keybindingItem.keybinding.getAriALAbel()}"`;
		if (vAlue !== this.seArchWidget.getVAlue()) {
			this.seArchWidget.setVAlue(vAlue);
		}
	}

	privAte creAteAriALAbelElement(pArent: HTMLElement): void {
		this.AriALAbelElement = DOM.Append(pArent, DOM.$(''));
		this.AriALAbelElement.setAttribute('id', 'keybindings-editor-AriA-lAbel-element');
		this.AriALAbelElement.setAttribute('AriA-live', 'Assertive');
	}

	privAte creAteOverlAyContAiner(pArent: HTMLElement): void {
		this.overlAyContAiner = DOM.Append(pArent, $('.overlAy-contAiner'));
		this.overlAyContAiner.style.position = 'Absolute';
		this.overlAyContAiner.style.zIndex = '10';
		this.defineKeybindingWidget = this._register(this.instAntiAtionService.creAteInstAnce(DefineKeybindingWidget, this.overlAyContAiner));
		this._register(this.defineKeybindingWidget.onDidChAnge(keybindingStr => this.defineKeybindingWidget.printExisting(this.keybindingsEditorModel!.fetch(`"${keybindingStr}"`).length)));
		this._register(this.defineKeybindingWidget.onShowExistingKeybidings(keybindingStr => this.seArchWidget.setVAlue(`"${keybindingStr}"`)));
		this.hideOverlAyContAiner();
	}

	privAte showOverlAyContAiner() {
		this.overlAyContAiner.style.displAy = 'block';
	}

	privAte hideOverlAyContAiner() {
		this.overlAyContAiner.style.displAy = 'none';
	}

	privAte creAteHeAder(pArent: HTMLElement): void {
		this.heAderContAiner = DOM.Append(pArent, $('.keybindings-heAder'));
		const fullTextSeArchPlAceholder = locAlize('SeArchKeybindings.FullTextSeArchPlAceholder', "Type to seArch in keybindings");
		const keybindingsSeArchPlAceholder = locAlize('SeArchKeybindings.KeybindingsSeArchPlAceholder', "Recording Keys. Press EscApe to exit");

		const cleArInputAction = new Action(KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, locAlize('cleArInput', "CleAr Keybindings SeArch Input"), 'codicon-cleAr-All', fAlse, () => { this.seArch(''); return Promise.resolve(null); });

		const seArchContAiner = DOM.Append(this.heAderContAiner, $('.seArch-contAiner'));
		this.seArchWidget = this._register(this.instAntiAtionService.creAteInstAnce(KeybindingsSeArchWidget, seArchContAiner, <KeybindingsSeArchOptions>{
			AriALAbel: fullTextSeArchPlAceholder,
			plAceholder: fullTextSeArchPlAceholder,
			focusKey: this.seArchFocusContextKey,
			AriALAbelledBy: 'keybindings-editor-AriA-lAbel-element',
			recordEnter: true,
			quoteRecordedKeys: true
		}));
		this._register(this.seArchWidget.onDidChAnge(seArchVAlue => {
			cleArInputAction.enAbled = !!seArchVAlue;
			this.delAyedFiltering.trigger(() => this.filterKeybindings());
			this.updAteSeArchOptions();
		}));
		this._register(this.seArchWidget.onEscApe(() => this.recordKeysAction.checked = fAlse));

		this.ActionsContAiner = DOM.Append(seArchContAiner, DOM.$('.keybindings-seArch-Actions-contAiner'));
		const recordingBAdge = this.creAteRecordingBAdge(this.ActionsContAiner);

		this._register(this.sortByPrecedenceAction.onDidChAnge(e => {
			if (e.checked !== undefined) {
				this.renderKeybindingsEntries(fAlse);
			}
			this.updAteSeArchOptions();
		}));

		this._register(this.recordKeysAction.onDidChAnge(e => {
			if (e.checked !== undefined) {
				recordingBAdge.clAssList.toggle('disAbled', !e.checked);
				if (e.checked) {
					this.seArchWidget.inputBox.setPlAceHolder(keybindingsSeArchPlAceholder);
					this.seArchWidget.inputBox.setAriALAbel(keybindingsSeArchPlAceholder);
					this.seArchWidget.stArtRecordingKeys();
					this.seArchWidget.focus();
				} else {
					this.seArchWidget.inputBox.setPlAceHolder(fullTextSeArchPlAceholder);
					this.seArchWidget.inputBox.setAriALAbel(fullTextSeArchPlAceholder);
					this.seArchWidget.stopRecordingKeys();
					this.seArchWidget.focus();
				}
				this.updAteSeArchOptions();
			}
		}));

		const ActionBAr = this._register(new ActionBAr(this.ActionsContAiner, {
			AnimAted: fAlse,
			ActionViewItemProvider: (Action: IAction) => {
				let checkboxViewItem: CheckboxActionViewItem | undefined;
				if (Action.id === this.sortByPrecedenceAction.id) {
					checkboxViewItem = new ThemAbleCheckboxActionViewItem(null, Action, undefined, this.themeService);
				}
				else if (Action.id === this.recordKeysAction.id) {
					checkboxViewItem = new ThemAbleCheckboxActionViewItem(null, Action, undefined, this.themeService);
				}
				if (checkboxViewItem) {

				}
				return checkboxViewItem;
			}
		}));

		ActionBAr.push([this.recordKeysAction, this.sortByPrecedenceAction, cleArInputAction], { lAbel: fAlse, icon: true });
	}

	privAte updAteSeArchOptions(): void {
		const keybindingsEditorInput = this.input As KeybindingsEditorInput;
		if (keybindingsEditorInput) {
			keybindingsEditorInput.seArchOptions = {
				seArchVAlue: this.seArchWidget.getVAlue(),
				recordKeybindings: !!this.recordKeysAction.checked,
				sortByPrecedence: !!this.sortByPrecedenceAction.checked
			};
		}
	}

	privAte creAteRecordingBAdge(contAiner: HTMLElement): HTMLElement {
		const recordingBAdge = DOM.Append(contAiner, DOM.$('.recording-bAdge.monAco-count-bAdge.long.disAbled'));
		recordingBAdge.textContent = locAlize('recording', "Recording Keys");
		this._register(AttAchStylerCAllbAck(this.themeService, { bAdgeBAckground, contrAstBorder, bAdgeForeground }, colors => {
			const bAckground = colors.bAdgeBAckground ? colors.bAdgeBAckground.toString() : '';
			const border = colors.contrAstBorder ? colors.contrAstBorder.toString() : '';
			const color = colors.bAdgeForeground ? colors.bAdgeForeground.toString() : '';

			recordingBAdge.style.bAckgroundColor = bAckground;
			recordingBAdge.style.borderWidth = border ? '1px' : '';
			recordingBAdge.style.borderStyle = border ? 'solid' : '';
			recordingBAdge.style.borderColor = border;
			recordingBAdge.style.color = color ? color.toString() : '';
		}));
		return recordingBAdge;
	}

	privAte lAyoutSeArchWidget(dimension: DOM.Dimension): void {
		this.seArchWidget.lAyout(dimension);
		this.heAderContAiner.clAssList.toggle('smAll', dimension.width < 400);
		this.seArchWidget.inputBox.inputElement.style.pAddingRight = `${DOM.getTotAlWidth(this.ActionsContAiner) + 12}px`;
	}

	privAte creAteBody(pArent: HTMLElement): void {
		const bodyContAiner = DOM.Append(pArent, $('.keybindings-body'));
		this.creAteListHeAder(bodyContAiner);
		this.creAteList(bodyContAiner);
	}

	privAte creAteListHeAder(pArent: HTMLElement): void {
		const keybindingsListHeAder = DOM.Append(pArent, $('.keybindings-list-heAder'));
		keybindingsListHeAder.style.height = '30px';
		keybindingsListHeAder.style.lineHeight = '30px';

		this.columnItems = [];
		let column = $('.heAder.Actions');
		this.columnItems.push({ column, width: 30 });

		column = $('.heAder.commAnd', undefined, locAlize('commAnd', "CommAnd"));
		this.columnItems.push({ column, proportion: 0.3, width: 0 });

		column = $('.heAder.keybinding', undefined, locAlize('keybinding', "Keybinding"));
		this.columnItems.push({ column, proportion: 0.2, width: 0 });

		column = $('.heAder.when', undefined, locAlize('when', "When"));
		this.columnItems.push({ column, proportion: 0.4, width: 0 });

		column = $('.heAder.source', undefined, locAlize('source', "Source"));
		this.columnItems.push({ column, proportion: 0.1, width: 0 });

		DOM.Append(keybindingsListHeAder, ...this.columnItems.mAp(({ column }) => column));
	}

	privAte creAteList(pArent: HTMLElement): void {
		this.keybindingsListContAiner = DOM.Append(pArent, $('.keybindings-list-contAiner'));
		this.keybindingsList = this._register(this.instAntiAtionService.creAteInstAnce(WorkbenchList, 'KeybindingsEditor', this.keybindingsListContAiner, new DelegAte(), [new KeybindingItemRenderer(this, this.instAntiAtionService)], {
			identityProvider: { getId: (e: IListEntry) => e.id },
			setRowLineHeight: fAlse,
			horizontAlScrolling: fAlse,
			AccessibilityProvider: new AccessibilityProvider(),
			keyboArdNAvigAtionLAbelProvider: { getKeyboArdNAvigAtionLAbel: (e: IKeybindingItemEntry) => e.keybindingItem.commAndLAbel || e.keybindingItem.commAnd },
			overrideStyles: {
				listBAckground: editorBAckground
			}
		})) As WorkbenchList<IListEntry>;

		this._register(this.keybindingsList.onContextMenu(e => this.onContextMenu(e)));
		this._register(this.keybindingsList.onDidChAngeFocus(e => this.onFocusChAnge(e)));
		this._register(this.keybindingsList.onDidFocus(() => {
			this.keybindingsList.getHTMLElement().clAssList.Add('focused');
		}));
		this._register(this.keybindingsList.onDidBlur(() => {
			this.keybindingsList.getHTMLElement().clAssList.remove('focused');
			this.keybindingFocusContextKey.reset();
		}));
		this._register(this.keybindingsList.onMouseDblClick(() => {
			const ActiveKeybindingEntry = this.ActiveKeybindingEntry;
			if (ActiveKeybindingEntry) {
				this.defineKeybinding(ActiveKeybindingEntry);
			}
		}));
		this._register(this.keybindingsList.onKeyDown(e => {
			const event = new StAndArdKeyboArdEvent(e);
			if (event.keyCode === KeyCode.Enter) {
				const keybindingEntry = this.ActiveKeybindingEntry;
				if (keybindingEntry) {
					this.defineKeybinding(keybindingEntry);
				}
				e.stopPropAgAtion();
			}
		}));
	}

	privAte Async render(preserveFocus: booleAn): Promise<void> {
		if (this.input) {
			const input: KeybindingsEditorInput = this.input As KeybindingsEditorInput;
			this.keybindingsEditorModel = AwAit input.resolve();
			AwAit this.keybindingsEditorModel.resolve(this.getActionsLAbels());
			this.renderKeybindingsEntries(fAlse, preserveFocus);
			if (input.seArchOptions) {
				this.recordKeysAction.checked = input.seArchOptions.recordKeybindings;
				this.sortByPrecedenceAction.checked = input.seArchOptions.sortByPrecedence;
				this.seArchWidget.setVAlue(input.seArchOptions.seArchVAlue);
			} else {
				this.updAteSeArchOptions();
			}
		}
	}

	privAte getActionsLAbels(): MAp<string, string> {
		const ActionsLAbels: MAp<string, string> = new MAp<string, string>();
		EditorExtensionsRegistry.getEditorActions().forEAch(editorAction => ActionsLAbels.set(editorAction.id, editorAction.lAbel));
		for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommAndPAlette)) {
			if (isIMenuItem(menuItem)) {
				const title = typeof menuItem.commAnd.title === 'string' ? menuItem.commAnd.title : menuItem.commAnd.title.vAlue;
				const cAtegory = menuItem.commAnd.cAtegory ? typeof menuItem.commAnd.cAtegory === 'string' ? menuItem.commAnd.cAtegory : menuItem.commAnd.cAtegory.vAlue : undefined;
				ActionsLAbels.set(menuItem.commAnd.id, cAtegory ? `${cAtegory}: ${title}` : title);
			}
		}
		return ActionsLAbels;
	}

	privAte filterKeybindings(): void {
		this.renderKeybindingsEntries(this.seArchWidget.hAsFocus());
		this.delAyedFilterLogging.trigger(() => this.reportFilteringUsed(this.seArchWidget.getVAlue()));
	}

	privAte renderKeybindingsEntries(reset: booleAn, preserveFocus?: booleAn): void {
		if (this.keybindingsEditorModel) {
			const filter = this.seArchWidget.getVAlue();
			const keybindingsEntries: IKeybindingItemEntry[] = this.keybindingsEditorModel.fetch(filter, this.sortByPrecedenceAction.checked);

			this.AriALAbelElement.setAttribute('AriA-lAbel', this.getAriALAbel(keybindingsEntries));

			if (keybindingsEntries.length === 0) {
				this.lAtestEmptyFilters.push(filter);
			}
			const currentSelectedIndex = this.keybindingsList.getSelection()[0];
			this.listEntries = keybindingsEntries;
			this.keybindingsList.splice(0, this.keybindingsList.length, this.listEntries);
			this.lAyoutKeybindingsList();

			if (reset) {
				this.keybindingsList.setSelection([]);
				this.keybindingsList.setFocus([]);
			} else {
				if (this.unAssignedKeybindingItemToReveAlAndFocus) {
					const index = this.getNewIndexOfUnAssignedKeybinding(this.unAssignedKeybindingItemToReveAlAndFocus);
					if (index !== -1) {
						this.keybindingsList.reveAl(index, 0.2);
						this.selectEntry(index);
					}
					this.unAssignedKeybindingItemToReveAlAndFocus = null;
				} else if (currentSelectedIndex !== -1 && currentSelectedIndex < this.listEntries.length) {
					this.selectEntry(currentSelectedIndex, preserveFocus);
				} else if (this.editorService.ActiveEditorPAne === this && !preserveFocus) {
					this.focus();
				}
			}
		}
	}

	privAte getAriALAbel(keybindingsEntries: IKeybindingItemEntry[]): string {
		if (this.sortByPrecedenceAction.checked) {
			return locAlize('show sorted keybindings', "Showing {0} Keybindings in precedence order", keybindingsEntries.length);
		} else {
			return locAlize('show keybindings', "Showing {0} Keybindings in AlphAbeticAl order", keybindingsEntries.length);
		}
	}

	privAte lAyoutKeybindingsList(): void {
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

		this.lAyoutColumns(this.columnItems.mAp(({ column }) => column));
		const listHeight = this.dimension.height - (DOM.getDomNodePAgePosition(this.heAderContAiner).height + 12 /*pAdding*/ + 30 /*list heAder*/);
		this.keybindingsListContAiner.style.height = `${listHeight}px`;
		this.keybindingsList.lAyout(listHeight);
	}

	privAte getIndexOf(listEntry: IListEntry): number {
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

	privAte getNewIndexOfUnAssignedKeybinding(unAssignedKeybinding: IKeybindingItemEntry): number {
		for (let index = 0; index < this.listEntries.length; index++) {
			const entry = this.listEntries[index];
			if (entry.templAteId === KEYBINDING_ENTRY_TEMPLATE_ID) {
				const keybindingItemEntry = (<IKeybindingItemEntry>entry);
				if (keybindingItemEntry.keybindingItem.commAnd === unAssignedKeybinding.keybindingItem.commAnd) {
					return index;
				}
			}
		}
		return -1;
	}

	privAte selectEntry(keybindingItemEntry: IKeybindingItemEntry | number, focus: booleAn = true): void {
		const index = typeof keybindingItemEntry === 'number' ? keybindingItemEntry : this.getIndexOf(keybindingItemEntry);
		if (index !== -1) {
			if (focus) {
				this.keybindingsList.getHTMLElement().focus();
				this.keybindingsList.setFocus([index]);
			}
			this.keybindingsList.setSelection([index]);
		}
	}

	focusKeybindings(): void {
		this.keybindingsList.getHTMLElement().focus();
		const currentFocusIndices = this.keybindingsList.getFocus();
		this.keybindingsList.setFocus([currentFocusIndices.length ? currentFocusIndices[0] : 0]);
	}

	selectKeybinding(keybindingItemEntry: IKeybindingItemEntry): void {
		this.selectEntry(keybindingItemEntry);
	}

	recordSeArchKeys(): void {
		this.recordKeysAction.checked = true;
	}

	toggleSortByPrecedence(): void {
		this.sortByPrecedenceAction.checked = !this.sortByPrecedenceAction.checked;
	}

	privAte onContextMenu(e: IListContextMenuEvent<IListEntry>): void {
		if (!e.element) {
			return;
		}

		if (e.element.templAteId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			this.selectEntry(<IKeybindingItemEntry>e.element);
			this.contextMenuService.showContextMenu({
				getAnchor: () => e.Anchor,
				getActions: () => [
					this.creAteCopyAction(<IKeybindingItemEntry>e.element),
					this.creAteCopyCommAndAction(<IKeybindingItemEntry>e.element),
					new SepArAtor(),
					this.creAteDefineAction(<IKeybindingItemEntry>e.element),
					this.creAteRemoveAction(<IKeybindingItemEntry>e.element),
					this.creAteResetAction(<IKeybindingItemEntry>e.element),
					this.creAteDefineWhenExpressionAction(<IKeybindingItemEntry>e.element),
					new SepArAtor(),
					this.creAteShowConflictsAction(<IKeybindingItemEntry>e.element)]
			});
		}
	}

	privAte onFocusChAnge(e: IListEvent<IListEntry>): void {
		this.keybindingFocusContextKey.reset();
		const element = e.elements[0];
		if (!element) {
			return;
		}
		if (element.templAteId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			this.keybindingFocusContextKey.set(true);
		}
	}

	privAte creAteDefineAction(keybindingItemEntry: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: keybindingItemEntry.keybindingItem.keybinding ? locAlize('chAngeLAbel', "ChAnge Keybinding") : locAlize('AddLAbel', "Add Keybinding"),
			enAbled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
			run: () => this.defineKeybinding(keybindingItemEntry)
		};
	}

	privAte creAteDefineWhenExpressionAction(keybindingItemEntry: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('editWhen', "ChAnge When Expression"),
			enAbled: !!keybindingItemEntry.keybindingItem.keybinding,
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
			run: () => this.defineWhenExpression(keybindingItemEntry)
		};
	}

	privAte creAteRemoveAction(keybindingItem: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('removeLAbel', "Remove Keybinding"),
			enAbled: !!keybindingItem.keybindingItem.keybinding,
			id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
			run: () => this.removeKeybinding(keybindingItem)
		};
	}

	privAte creAteResetAction(keybindingItem: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('resetLAbel', "Reset Keybinding"),
			enAbled: !keybindingItem.keybindingItem.keybindingItem.isDefAult,
			id: KEYBINDINGS_EDITOR_COMMAND_RESET,
			run: () => this.resetKeybinding(keybindingItem)
		};
	}

	privAte creAteShowConflictsAction(keybindingItem: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('showSAmeKeybindings', "Show SAme Keybindings"),
			enAbled: !!keybindingItem.keybindingItem.keybinding,
			id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
			run: () => this.showSimilArKeybindings(keybindingItem)
		};
	}

	privAte creAteCopyAction(keybindingItem: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('copyLAbel', "Copy"),
			enAbled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_COPY,
			run: () => this.copyKeybinding(keybindingItem)
		};
	}

	privAte creAteCopyCommAndAction(keybinding: IKeybindingItemEntry): IAction {
		return <IAction>{
			lAbel: locAlize('copyCommAndLAbel', "Copy CommAnd ID"),
			enAbled: true,
			id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
			run: () => this.copyKeybindingCommAnd(keybinding)
		};
	}

	privAte reportFilteringUsed(filter: string): void {
		if (filter) {
			const dAtA = {
				filter,
				emptyFilters: this.getLAtestEmptyFiltersForTelemetry()
			};
			this.lAtestEmptyFilters = [];
			/* __GDPR__
				"keybindings.filter" : {
					"filter": { "clAssificAtion": "CustomerContent", "purpose": "FeAtureInsight" },
					"emptyFilters" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryService.publicLog('keybindings.filter', dAtA);
		}
	}

	/**
	 * Put A rough limit on the size of the telemetry dAtA, since otherwise it could be An unbounded lArge Amount
	 * of dAtA. 8192 is the mAx size of A property vAlue. This is rough since thAt probAbly includes ""s, etc.
	 */
	privAte getLAtestEmptyFiltersForTelemetry(): string[] {
		let cumulAtiveSize = 0;
		return this.lAtestEmptyFilters.filter(filterText => (cumulAtiveSize += filterText.length) <= 8192);
	}

	privAte reportKeybindingAction(Action: string, commAnd: string, keybinding: ResolvedKeybinding | string): void {
		// __GDPR__TODO__ Need to move off dynAmic event nAmes And properties As they cAnnot be registered stAticAlly
		this.telemetryService.publicLog(Action, { commAnd, keybinding: keybinding ? (typeof keybinding === 'string' ? keybinding : keybinding.getUserSettingsLAbel()) : '' });
	}

	privAte onKeybindingEditingError(error: Any): void {
		this.notificAtionService.error(typeof error === 'string' ? error : locAlize('error', "Error '{0}' while editing the keybinding. PleAse open 'keybindings.json' file And check for errors.", `${error}`));
	}
}

clAss DelegAte implements IListVirtuAlDelegAte<IListEntry> {

	getHeight(element: IListEntry) {
		if (element.templAteId === KEYBINDING_ENTRY_TEMPLATE_ID) {
			const commAndIdMAtched = (<IKeybindingItemEntry>element).keybindingItem.commAndLAbel && (<IKeybindingItemEntry>element).commAndIdMAtches;
			const commAndDefAultLAbelMAtched = !!(<IKeybindingItemEntry>element).commAndDefAultLAbelMAtches;
			if (commAndIdMAtched && commAndDefAultLAbelMAtched) {
				return 60;
			}
			if (commAndIdMAtched || commAndDefAultLAbelMAtched) {
				return 40;
			}
		}
		return 24;
	}

	getTemplAteId(element: IListEntry) {
		return element.templAteId;
	}
}

interfAce KeybindingItemTemplAte {
	pArent: HTMLElement;
	columns: Column[];
	disposAble: IDisposAble;
}

clAss KeybindingItemRenderer implements IListRenderer<IKeybindingItemEntry, KeybindingItemTemplAte> {

	get templAteId(): string { return KEYBINDING_ENTRY_TEMPLATE_ID; }

	constructor(
		privAte keybindingsEditor: KeybindingsEditor,
		privAte instAntiAtionService: IInstAntiAtionService
	) { }

	renderTemplAte(pArent: HTMLElement): KeybindingItemTemplAte {
		pArent.clAssList.Add('keybinding-item');

		const Actions = this.instAntiAtionService.creAteInstAnce(ActionsColumn, pArent, this.keybindingsEditor);
		const commAnd = this.instAntiAtionService.creAteInstAnce(CommAndColumn, pArent, this.keybindingsEditor);
		const keybinding = this.instAntiAtionService.creAteInstAnce(KeybindingColumn, pArent, this.keybindingsEditor);
		const when = this.instAntiAtionService.creAteInstAnce(WhenColumn, pArent, this.keybindingsEditor);
		const source = this.instAntiAtionService.creAteInstAnce(SourceColumn, pArent, this.keybindingsEditor);

		const columns: Column[] = [Actions, commAnd, keybinding, when, source];
		const disposAbles = combinedDisposAble(...columns);
		const elements = columns.mAp(({ element }) => element);

		this.keybindingsEditor.lAyoutColumns(elements);
		this.keybindingsEditor.onLAyout(() => this.keybindingsEditor.lAyoutColumns(elements));

		return {
			pArent,
			columns,
			disposAble: disposAbles
		};
	}

	renderElement(keybindingEntry: IKeybindingItemEntry, index: number, templAte: KeybindingItemTemplAte): void {
		templAte.pArent.clAssList.toggle('odd', index % 2 === 1);
		for (const column of templAte.columns) {
			column.render(keybindingEntry);
		}
	}

	disposeTemplAte(templAte: KeybindingItemTemplAte): void {
		templAte.disposAble.dispose();
	}
}

AbstrAct clAss Column extends DisposAble {

	stAtic COUNTER = 0;

	AbstrAct reAdonly element: HTMLElement;
	AbstrAct render(keybindingItemEntry: IKeybindingItemEntry): void;

	constructor(protected keybindingsEditor: IKeybindingsEditorPAne) {
		super();
	}

}

clAss ActionsColumn extends Column {

	privAte reAdonly ActionBAr: ActionBAr;
	reAdonly element: HTMLElement;

	constructor(
		pArent: HTMLElement,
		keybindingsEditor: IKeybindingsEditorPAne,
		@IKeybindingService privAte keybindingsService: IKeybindingService
	) {
		super(keybindingsEditor);
		this.element = DOM.Append(pArent, $('.column.Actions', { id: 'Actions_' + ++Column.COUNTER }));
		this.ActionBAr = new ActionBAr(this.element, { AnimAted: fAlse });
	}

	render(keybindingItemEntry: IKeybindingItemEntry): void {
		this.ActionBAr.cleAr();
		const Actions: IAction[] = [];
		if (keybindingItemEntry.keybindingItem.keybinding) {
			Actions.push(this.creAteEditAction(keybindingItemEntry));
		} else {
			Actions.push(this.creAteAddAction(keybindingItemEntry));
		}
		this.ActionBAr.push(Actions, { icon: true });
	}

	privAte creAteEditAction(keybindingItemEntry: IKeybindingItemEntry): IAction {
		const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
		return <IAction>{
			clAss: preferencesEditIcon.clAssNAmes,
			enAbled: true,
			id: 'editKeybinding',
			tooltip: keybinding ? locAlize('editKeybindingLAbelWithKey', "ChAnge Keybinding {0}", `(${keybinding.getLAbel()})`) : locAlize('editKeybindingLAbel', "ChAnge Keybinding"),
			run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry)
		};
	}

	privAte creAteAddAction(keybindingItemEntry: IKeybindingItemEntry): IAction {
		const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
		return <IAction>{
			clAss: 'codicon-Add',
			enAbled: true,
			id: 'AddKeybinding',
			tooltip: keybinding ? locAlize('AddKeybindingLAbelWithKey', "Add Keybinding {0}", `(${keybinding.getLAbel()})`) : locAlize('AddKeybindingLAbel', "Add Keybinding"),
			run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry)
		};
	}

	dispose(): void {
		super.dispose();
		dispose(this.ActionBAr);
	}
}

clAss CommAndColumn extends Column {

	privAte reAdonly commAndColumn: HTMLElement;
	reAdonly element: HTMLElement;

	constructor(
		pArent: HTMLElement,
		keybindingsEditor: IKeybindingsEditorPAne,
	) {
		super(keybindingsEditor);
		this.element = this.commAndColumn = DOM.Append(pArent, $('.column.commAnd', { id: 'commAnd_' + ++Column.COUNTER }));
	}

	render(keybindingItemEntry: IKeybindingItemEntry): void {
		DOM.cleArNode(this.commAndColumn);
		const keybindingItem = keybindingItemEntry.keybindingItem;
		const commAndIdMAtched = !!(keybindingItem.commAndLAbel && keybindingItemEntry.commAndIdMAtches);
		const commAndDefAultLAbelMAtched = !!keybindingItemEntry.commAndDefAultLAbelMAtches;
		this.commAndColumn.clAssList.toggle('verticAl-Align-column', commAndIdMAtched || commAndDefAultLAbelMAtched);
		let commAndLAbel: HighlightedLAbel | undefined;
		if (keybindingItem.commAndLAbel) {
			commAndLAbel = new HighlightedLAbel(this.commAndColumn, fAlse);
			commAndLAbel.set(keybindingItem.commAndLAbel, keybindingItemEntry.commAndLAbelMAtches);
		}
		if (keybindingItemEntry.commAndDefAultLAbelMAtches) {
			commAndLAbel = new HighlightedLAbel(DOM.Append(this.commAndColumn, $('.commAnd-defAult-lAbel')), fAlse);
			commAndLAbel.set(keybindingItem.commAndDefAultLAbel, keybindingItemEntry.commAndDefAultLAbelMAtches);
		}
		if (keybindingItemEntry.commAndIdMAtches || !keybindingItem.commAndLAbel) {
			commAndLAbel = new HighlightedLAbel(DOM.Append(this.commAndColumn, $('.code')), fAlse);
			commAndLAbel.set(keybindingItem.commAnd, keybindingItemEntry.commAndIdMAtches);
		}
		if (commAndLAbel) {
			commAndLAbel.element.title = keybindingItem.commAndLAbel ? locAlize('title', "{0} ({1})", keybindingItem.commAndLAbel, keybindingItem.commAnd) : keybindingItem.commAnd;
		}
	}
}

clAss KeybindingColumn extends Column {

	privAte reAdonly keybindingLAbel: HTMLElement;
	reAdonly element: HTMLElement;

	constructor(
		pArent: HTMLElement,
		keybindingsEditor: IKeybindingsEditorPAne,
	) {
		super(keybindingsEditor);

		this.element = DOM.Append(pArent, $('.column.keybinding', { id: 'keybinding_' + ++Column.COUNTER }));
		this.keybindingLAbel = DOM.Append(this.element, $('div.keybinding-lAbel'));
	}

	render(keybindingItemEntry: IKeybindingItemEntry): void {
		DOM.cleArNode(this.keybindingLAbel);
		if (keybindingItemEntry.keybindingItem.keybinding) {
			new KeybindingLAbel(this.keybindingLAbel, OS).set(keybindingItemEntry.keybindingItem.keybinding, keybindingItemEntry.keybindingMAtches);
		}
	}
}

clAss SourceColumn extends Column {

	privAte reAdonly sourceColumn: HTMLElement;
	reAdonly element: HTMLElement;

	constructor(
		pArent: HTMLElement,
		keybindingsEditor: IKeybindingsEditorPAne,
	) {
		super(keybindingsEditor);
		this.element = this.sourceColumn = DOM.Append(pArent, $('.column.source', { id: 'source_' + ++Column.COUNTER }));
	}

	render(keybindingItemEntry: IKeybindingItemEntry): void {
		DOM.cleArNode(this.sourceColumn);
		new HighlightedLAbel(this.sourceColumn, fAlse).set(keybindingItemEntry.keybindingItem.source, keybindingItemEntry.sourceMAtches);
	}
}

clAss WhenColumn extends Column {

	reAdonly element: HTMLElement;
	privAte reAdonly whenLAbel: HTMLElement;
	privAte reAdonly whenInput: InputBox;
	privAte reAdonly renderDisposAbles = this._register(new DisposAbleStore());

	privAte _onDidAccept: Emitter<void> = this._register(new Emitter<void>());
	privAte reAdonly onDidAccept: Event<void> = this._onDidAccept.event;

	privAte _onDidReject: Emitter<void> = this._register(new Emitter<void>());
	privAte reAdonly onDidReject: Event<void> = this._onDidReject.event;

	constructor(
		pArent: HTMLElement,
		keybindingsEditor: IKeybindingsEditorPAne,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService
	) {
		super(keybindingsEditor);

		this.element = DOM.Append(pArent, $('.column.when', { id: 'when_' + ++Column.COUNTER }));

		this.whenLAbel = DOM.Append(this.element, $('div.when-lAbel'));
		this.whenInput = new InputBox(this.element, this.contextViewService, {
			vAlidAtionOptions: {
				vAlidAtion: (vAlue) => {
					try {
						ContextKeyExpr.deseriAlize(vAlue, true);
					} cAtch (error) {
						return {
							content: error.messAge,
							formAtContent: true,
							type: MessAgeType.ERROR
						};
					}
					return null;
				}
			},
			AriALAbel: locAlize('whenContextInputAriALAbel', "Type when context. Press Enter to confirm or EscApe to cAncel.")
		});
		this._register(AttAchInputBoxStyler(this.whenInput, this.themeService));
		this._register(DOM.AddStAndArdDisposAbleListener(this.whenInput.inputElement, DOM.EventType.KEY_DOWN, e => this.onInputKeyDown(e)));
		this._register(DOM.AddDisposAbleListener(this.whenInput.inputElement, DOM.EventType.BLUR, () => this.cAncelEditing()));
	}

	privAte onInputKeyDown(e: IKeyboArdEvent): void {
		let hAndled = fAlse;
		if (e.equAls(KeyCode.Enter)) {
			this.finishEditing();
			hAndled = true;
		} else if (e.equAls(KeyCode.EscApe)) {
			this.cAncelEditing();
			hAndled = true;
		}
		if (hAndled) {
			e.preventDefAult();
			e.stopPropAgAtion();
		}
	}

	privAte stArtEditing(): void {
		this.element.clAssList.Add('input-mode');
		this.whenInput.focus();
		this.whenInput.select();
	}

	privAte finishEditing(): void {
		this.element.clAssList.remove('input-mode');
		this._onDidAccept.fire();
	}

	privAte cAncelEditing(): void {
		this.element.clAssList.remove('input-mode');
		this._onDidReject.fire();
	}

	render(keybindingItemEntry: IKeybindingItemEntry): void {
		this.renderDisposAbles.cleAr();
		DOM.cleArNode(this.whenLAbel);

		this.keybindingsEditor.onDefineWhenExpression(e => {
			if (keybindingItemEntry === e) {
				this.stArtEditing();
			}
		}, this, this.renderDisposAbles);
		this.whenInput.vAlue = keybindingItemEntry.keybindingItem.when || '';
		this.whenLAbel.clAssList.toggle('code', !!keybindingItemEntry.keybindingItem.when);
		this.whenLAbel.clAssList.toggle('empty', !keybindingItemEntry.keybindingItem.when);
		if (keybindingItemEntry.keybindingItem.when) {
			const whenLAbel = new HighlightedLAbel(this.whenLAbel, fAlse);
			whenLAbel.set(keybindingItemEntry.keybindingItem.when, keybindingItemEntry.whenMAtches);
			this.element.title = keybindingItemEntry.keybindingItem.when;
			whenLAbel.element.title = keybindingItemEntry.keybindingItem.when;
		} else {
			this.whenLAbel.textContent = '—';
			this.element.title = '';
		}
		this.onDidAccept(() => {
			this.keybindingsEditor.updAteKeybinding(keybindingItemEntry, keybindingItemEntry.keybindingItem.keybinding ? keybindingItemEntry.keybindingItem.keybinding.getUserSettingsLAbel() || '' : '', this.whenInput.vAlue);
			this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
		}, this, this.renderDisposAbles);
		this.onDidReject(() => {
			this.whenInput.vAlue = keybindingItemEntry.keybindingItem.when || '';
			this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
		}, this, this.renderDisposAbles);
	}
}

clAss AccessibilityProvider implements IListAccessibilityProvider<IKeybindingItemEntry> {

	getWidgetAriALAbel(): string {
		return locAlize('keybindingsLAbel', "Keybindings");
	}

	getAriALAbel(keybindingItemEntry: IKeybindingItemEntry): string {
		let AriALAbel = keybindingItemEntry.keybindingItem.commAndLAbel ? keybindingItemEntry.keybindingItem.commAndLAbel : keybindingItemEntry.keybindingItem.commAnd;
		AriALAbel += ', ' + (keybindingItemEntry.keybindingItem.keybinding?.getAriALAbel() || locAlize('noKeybinding', "No Keybinding Assigned."));
		AriALAbel += ', ' + keybindingItemEntry.keybindingItem.source;
		AriALAbel += ', ' + keybindingItemEntry.keybindingItem.when ? keybindingItemEntry.keybindingItem.when : locAlize('noWhen', "No when context.");
		return AriALAbel;
	}

}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-heAder { bAckground-color: ${oddRowBAckgroundColor}; }`);
	collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list-row.odd:not(.focused):not(.selected):not(:hover) { bAckground-color: ${oddRowBAckgroundColor}; }`);
	collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:not(:focus) .monAco-list-row.focused.odd:not(.selected):not(:hover) { bAckground-color: ${oddRowBAckgroundColor}; }`);
	collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:not(.focused) .monAco-list-row.focused.odd:not(.selected):not(:hover) { bAckground-color: ${oddRowBAckgroundColor}; }`);

	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		const whenForegroundColor = foregroundColor.trAnspArent(.8).mAkeOpAque(WORKBENCH_BACKGROUND(theme));
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list-row > .column > .code { color: ${whenForegroundColor}; }`);
		const whenForegroundColorForOddRow = foregroundColor.trAnspArent(.8).mAkeOpAque(oddRowBAckgroundColor);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list-row.odd > .column > .code { color: ${whenForegroundColorForOddRow}; }`);
	}

	const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
	const listActiveSelectionBAckgroundColor = theme.getColor(listActiveSelectionBAckground);
	if (listActiveSelectionForegroundColor && listActiveSelectionBAckgroundColor) {
		const whenForegroundColor = listActiveSelectionForegroundColor.trAnspArent(.8).mAkeOpAque(listActiveSelectionBAckgroundColor);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.selected > .column > .code { color: ${whenForegroundColor}; }`);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.odd.selected > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listInActiveSelectionForegroundColor = theme.getColor(listInActiveSelectionForeground);
	const listInActiveSelectionBAckgroundColor = theme.getColor(listInActiveSelectionBAckground);
	if (listInActiveSelectionForegroundColor && listInActiveSelectionBAckgroundColor) {
		const whenForegroundColor = listInActiveSelectionForegroundColor.trAnspArent(.8).mAkeOpAque(listInActiveSelectionBAckgroundColor);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list .monAco-list-row.selected > .column > .code { color: ${whenForegroundColor}; }`);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list .monAco-list-row.odd.selected > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listFocusForegroundColor = theme.getColor(listFocusForeground);
	const listFocusBAckgroundColor = theme.getColor(listFocusBAckground);
	if (listFocusForegroundColor && listFocusBAckgroundColor) {
		const whenForegroundColor = listFocusForegroundColor.trAnspArent(.8).mAkeOpAque(listFocusBAckgroundColor);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.focused > .column > .code { color: ${whenForegroundColor}; }`);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.odd.focused > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	const listHoverBAckgroundColor = theme.getColor(listHoverBAckground);
	if (listHoverForegroundColor && listHoverBAckgroundColor) {
		const whenForegroundColor = listHoverForegroundColor.trAnspArent(.8).mAkeOpAque(listHoverBAckgroundColor);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row:hover:not(.focused):not(.selected) > .column > .code { color: ${whenForegroundColor}; }`);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.odd:hover:not(.focused):not(.selected) > .column > .code { color: ${whenForegroundColor}; }`);
	}

	const listHighlightForegroundColor = theme.getColor(listHighlightForeground);
	if (listHighlightForegroundColor) {
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list-row > .column .highlight { color: ${listHighlightForegroundColor}; }`);
	}

	if (listActiveSelectionForegroundColor) {
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.selected.focused > .column .monAco-keybinding-key { color: ${listActiveSelectionForegroundColor}; }`);
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list:focus .monAco-list-row.selected > .column .monAco-keybinding-key { color: ${listActiveSelectionForegroundColor}; }`);
	}
	const listInActiveFocusAndSelectionForegroundColor = theme.getColor(listInActiveSelectionForeground);
	if (listInActiveFocusAndSelectionForegroundColor) {
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list .monAco-list-row.selected > .column .monAco-keybinding-key { color: ${listInActiveFocusAndSelectionForegroundColor}; }`);
	}
	if (listHoverForegroundColor) {
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list .monAco-list-row:hover:not(.selected):not(.focused) > .column .monAco-keybinding-key { color: ${listHoverForegroundColor}; }`);
	}
	if (listFocusForegroundColor) {
		collector.AddRule(`.keybindings-editor > .keybindings-body > .keybindings-list-contAiner .monAco-list .monAco-list-row.focused > .column .monAco-keybinding-key { color: ${listFocusForegroundColor}; }`);
	}
});
