/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import * as DOM from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { InputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { SelectBox } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { IAction } from 'vs/Base/common/actions';
import { disposaBleTimeout } from 'vs/Base/common/async';
import { Color, RGBA } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isIOS } from 'vs/Base/common/platform';
import { isDefined, isUndefinedOrNull } from 'vs/Base/common/types';
import 'vs/css!./media/settingsWidgets';
import { localize } from 'vs/nls';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { editorWidgetBorder, focusBorder, foreground, inputBackground, inputBorder, inputForeground, listActiveSelectionBackground, listActiveSelectionForeground, listFocusBackground, listHoverBackground, listHoverForeground, listInactiveSelectionBackground, listInactiveSelectionForeground, registerColor, selectBackground, selectBorder, selectForeground, simpleCheckBoxBackground, simpleCheckBoxBorder, simpleCheckBoxForeground, textLinkActiveForeground, textLinkForeground, textPreformatForeground, transparent } from 'vs/platform/theme/common/colorRegistry';
import { attachButtonStyler, attachInputBoxStyler, attachSelectBoxStyler } from 'vs/platform/theme/common/styler';
import { IColorTheme, ICssStyleCollector, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { preferencesEditIcon } from 'vs/workBench/contriB/preferences/Browser/preferencesWidgets';

const $ = DOM.$;
export const settingsHeaderForeground = registerColor('settings.headerForeground', { light: '#444444', dark: '#e7e7e7', hc: '#ffffff' }, localize('headerForeground', "The foreground color for a section header or active title."));
export const modifiedItemIndicator = registerColor('settings.modifiedItemIndicator', {
	light: new Color(new RGBA(102, 175, 224)),
	dark: new Color(new RGBA(12, 125, 157)),
	hc: new Color(new RGBA(0, 73, 122))
}, localize('modifiedItemForeground', "The color of the modified setting indicator."));

// Enum control colors
export const settingsSelectBackground = registerColor(`settings.dropdownBackground`, { dark: selectBackground, light: selectBackground, hc: selectBackground }, localize('settingsDropdownBackground', "Settings editor dropdown Background."));
export const settingsSelectForeground = registerColor('settings.dropdownForeground', { dark: selectForeground, light: selectForeground, hc: selectForeground }, localize('settingsDropdownForeground', "Settings editor dropdown foreground."));
export const settingsSelectBorder = registerColor('settings.dropdownBorder', { dark: selectBorder, light: selectBorder, hc: selectBorder }, localize('settingsDropdownBorder', "Settings editor dropdown Border."));
export const settingsSelectListBorder = registerColor('settings.dropdownListBorder', { dark: editorWidgetBorder, light: editorWidgetBorder, hc: editorWidgetBorder }, localize('settingsDropdownListBorder', "Settings editor dropdown list Border. This surrounds the options and separates the options from the description."));

// Bool control colors
export const settingsCheckBoxBackground = registerColor('settings.checkBoxBackground', { dark: simpleCheckBoxBackground, light: simpleCheckBoxBackground, hc: simpleCheckBoxBackground }, localize('settingsCheckBoxBackground', "Settings editor checkBox Background."));
export const settingsCheckBoxForeground = registerColor('settings.checkBoxForeground', { dark: simpleCheckBoxForeground, light: simpleCheckBoxForeground, hc: simpleCheckBoxForeground }, localize('settingsCheckBoxForeground', "Settings editor checkBox foreground."));
export const settingsCheckBoxBorder = registerColor('settings.checkBoxBorder', { dark: simpleCheckBoxBorder, light: simpleCheckBoxBorder, hc: simpleCheckBoxBorder }, localize('settingsCheckBoxBorder', "Settings editor checkBox Border."));

// Text control colors
export const settingsTextInputBackground = registerColor('settings.textInputBackground', { dark: inputBackground, light: inputBackground, hc: inputBackground }, localize('textInputBoxBackground', "Settings editor text input Box Background."));
export const settingsTextInputForeground = registerColor('settings.textInputForeground', { dark: inputForeground, light: inputForeground, hc: inputForeground }, localize('textInputBoxForeground', "Settings editor text input Box foreground."));
export const settingsTextInputBorder = registerColor('settings.textInputBorder', { dark: inputBorder, light: inputBorder, hc: inputBorder }, localize('textInputBoxBorder', "Settings editor text input Box Border."));

// NumBer control colors
export const settingsNumBerInputBackground = registerColor('settings.numBerInputBackground', { dark: inputBackground, light: inputBackground, hc: inputBackground }, localize('numBerInputBoxBackground', "Settings editor numBer input Box Background."));
export const settingsNumBerInputForeground = registerColor('settings.numBerInputForeground', { dark: inputForeground, light: inputForeground, hc: inputForeground }, localize('numBerInputBoxForeground', "Settings editor numBer input Box foreground."));
export const settingsNumBerInputBorder = registerColor('settings.numBerInputBorder', { dark: inputBorder, light: inputBorder, hc: inputBorder }, localize('numBerInputBoxBorder', "Settings editor numBer input Box Border."));

export const focusedRowBackground = registerColor('settings.focusedRowBackground', {
	dark: Color.fromHex('#808080').transparent(0.14),
	light: transparent(listFocusBackground, .4),
	hc: null
}, localize('focusedRowBackground', "The Background color of a settings row when focused."));

export const rowHoverBackground = registerColor('noteBook.rowHoverBackground', {
	dark: transparent(focusedRowBackground, .5),
	light: transparent(focusedRowBackground, .7),
	hc: null
}, localize('noteBook.rowHoverBackground', "The Background color of a settings row when hovered."));

export const focusedRowBorder = registerColor('noteBook.focusedRowBorder', {
	dark: Color.white.transparent(0.12),
	light: Color.Black.transparent(0.12),
	hc: focusBorder
}, localize('noteBook.focusedRowBorder', "The color of the row's top and Bottom Border when the row is focused."));

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const checkBoxBackgroundColor = theme.getColor(settingsCheckBoxBackground);
	if (checkBoxBackgroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-Bool .setting-value-checkBox { Background-color: ${checkBoxBackgroundColor} !important; }`);
	}

	const checkBoxForegroundColor = theme.getColor(settingsCheckBoxForeground);
	if (checkBoxForegroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-Bool .setting-value-checkBox { color: ${checkBoxForegroundColor} !important; }`);
	}

	const checkBoxBorderColor = theme.getColor(settingsCheckBoxBorder);
	if (checkBoxBorderColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-Bool .setting-value-checkBox { Border-color: ${checkBoxBorderColor} !important; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a { color: ${link}; }`);
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a > code { color: ${link}; }`);
		collector.addRule(`.monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a { color: ${link}; }`);
		collector.addRule(`.monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a > code { color: ${link}; }`);
	}

	const activeLink = theme.getColor(textLinkActiveForeground);
	if (activeLink) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a:hover, .settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a:active { color: ${activeLink}; }`);
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a:hover > code, .settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a:active > code { color: ${activeLink}; }`);
		collector.addRule(`.monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a:hover, .monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a:active { color: ${activeLink}; }`);
		collector.addRule(`.monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a:hover > code, .monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown a:active > code { color: ${activeLink}; }`);
	}

	const headerForegroundColor = theme.getColor(settingsHeaderForeground);
	if (headerForegroundColor) {
		collector.addRule(`.settings-editor > .settings-header > .settings-header-controls .settings-taBs-widget .action-laBel.checked { color: ${headerForegroundColor}; Border-Bottom-color: ${headerForegroundColor}; }`);
	}

	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		collector.addRule(`.settings-editor > .settings-header > .settings-header-controls .settings-taBs-widget .action-laBel { color: ${foregroundColor}; }`);
	}

	// List control
	const listHoverBackgroundColor = theme.getColor(listHoverBackground);
	if (listHoverBackgroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row:hover { Background-color: ${listHoverBackgroundColor}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	if (listHoverForegroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row:hover { color: ${listHoverForegroundColor}; }`);
	}

	const listSelectBackgroundColor = theme.getColor(listActiveSelectionBackground);
	if (listSelectBackgroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row.selected:focus { Background-color: ${listSelectBackgroundColor}; }`);
	}

	const listInactiveSelectionBackgroundColor = theme.getColor(listInactiveSelectionBackground);
	if (listInactiveSelectionBackgroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row.selected:not(:focus) { Background-color: ${listInactiveSelectionBackgroundColor}; }`);
	}

	const listInactiveSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
	if (listInactiveSelectionForegroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row.selected:not(:focus) { color: ${listInactiveSelectionForegroundColor}; }`);
	}

	const listSelectForegroundColor = theme.getColor(listActiveSelectionForeground);
	if (listSelectForegroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.setting-item-list .setting-list-row.selected:focus { color: ${listSelectForegroundColor}; }`);
	}

	const codeTextForegroundColor = theme.getColor(textPreformatForeground);
	if (codeTextForegroundColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item .setting-item-markdown code { color: ${codeTextForegroundColor} }`);
		collector.addRule(`.monaco-select-Box-dropdown-container > .select-Box-details-pane > .select-Box-description-markdown code { color: ${codeTextForegroundColor} }`);

	}

	const modifiedItemIndicatorColor = theme.getColor(modifiedItemIndicator);
	if (modifiedItemIndicatorColor) {
		collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents > .setting-item-modified-indicator { Border-color: ${modifiedItemIndicatorColor}; }`);
	}
});

type EditKey = 'none' | 'create' | numBer;

type IListViewItem<TDataItem extends oBject> = TDataItem & {
	editing?: Boolean;
	selected?: Boolean;
};

export class ListSettingListModel<TDataItem extends oBject> {
	protected _dataItems: TDataItem[] = [];
	private _editKey: EditKey | null = null;
	private _selectedIdx: numBer | null = null;
	private _newDataItem: TDataItem;

	get items(): IListViewItem<TDataItem>[] {
		const items = this._dataItems.map((item, i) => {
			const editing = typeof this._editKey === 'numBer' && this._editKey === i;
			return {
				...item,
				editing,
				selected: i === this._selectedIdx || editing
			};
		});

		if (this._editKey === 'create') {
			items.push({
				editing: true,
				selected: true,
				...this._newDataItem,
			});
		}

		return items;
	}

	constructor(newItem: TDataItem) {
		this._newDataItem = newItem;
	}

	setEditKey(key: EditKey): void {
		this._editKey = key;
	}

	setValue(listData: TDataItem[]): void {
		this._dataItems = listData;
	}

	select(idx: numBer | null): void {
		this._selectedIdx = idx;
	}

	getSelected(): numBer | null {
		return this._selectedIdx;
	}

	selectNext(): void {
		if (typeof this._selectedIdx === 'numBer') {
			this._selectedIdx = Math.min(this._selectedIdx + 1, this._dataItems.length - 1);
		} else {
			this._selectedIdx = 0;
		}
	}

	selectPrevious(): void {
		if (typeof this._selectedIdx === 'numBer') {
			this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
		} else {
			this._selectedIdx = 0;
		}
	}
}

export interface ISettingListChangeEvent<TDataItem extends oBject> {
	originalItem: TDataItem;
	item?: TDataItem;
	targetIndex?: numBer;
}

aBstract class ABstractListSettingWidget<TDataItem extends oBject> extends DisposaBle {
	private listElement: HTMLElement;
	private rowElements: HTMLElement[] = [];

	protected readonly _onDidChangeList = this._register(new Emitter<ISettingListChangeEvent<TDataItem>>());
	protected readonly model = new ListSettingListModel<TDataItem>(this.getEmptyItem());
	protected readonly listDisposaBles = this._register(new DisposaBleStore());

	readonly onDidChangeList: Event<ISettingListChangeEvent<TDataItem>> = this._onDidChangeList.event;

	get domNode(): HTMLElement {
		return this.listElement;
	}

	get items(): TDataItem[] {
		return this.model.items;
	}

	constructor(
		private container: HTMLElement,
		@IThemeService protected readonly themeService: IThemeService,
		@IContextViewService protected readonly contextViewService: IContextViewService
	) {
		super();

		this.listElement = DOM.append(container, $('div'));
		this.listElement.setAttriBute('role', 'list');
		this.getContainerClasses().forEach(c => this.listElement.classList.add(c));
		this.listElement.setAttriBute('taBindex', '0');
		DOM.append(container, this.renderAddButton());
		this.renderList();

		this._register(DOM.addDisposaBleListener(this.listElement, DOM.EventType.CLICK, e => this.onListClick(e)));
		this._register(DOM.addDisposaBleListener(this.listElement, DOM.EventType.DBLCLICK, e => this.onListDouBleClick(e)));

		this._register(DOM.addStandardDisposaBleListener(this.listElement, 'keydown', (e: StandardKeyBoardEvent) => {
			if (e.equals(KeyCode.UpArrow)) {
				this.selectPreviousRow();
			} else if (e.equals(KeyCode.DownArrow)) {
				this.selectNextRow();
			} else {
				return;
			}

			e.preventDefault();
			e.stopPropagation();
		}));
	}

	setValue(listData: TDataItem[]): void {
		this.model.setValue(listData);
		this.renderList();
	}

	protected aBstract getEmptyItem(): TDataItem;
	protected aBstract getContainerClasses(): string[];
	protected aBstract getActionsForItem(item: TDataItem, idx: numBer): IAction[];
	protected aBstract renderItem(item: TDataItem): HTMLElement;
	protected aBstract renderEdit(item: TDataItem, idx: numBer): HTMLElement;
	protected aBstract isItemNew(item: TDataItem): Boolean;
	protected aBstract getLocalizedRowTitle(item: TDataItem): string;
	protected aBstract getLocalizedStrings(): {
		deleteActionTooltip: string
		editActionTooltip: string
		addButtonLaBel: string
	};

	protected renderHeader(): HTMLElement | undefined {
		return;
	}

	protected isAddButtonVisiBle(): Boolean {
		return true;
	}

	protected renderList(): void {
		const focused = DOM.isAncestor(document.activeElement, this.listElement);

		DOM.clearNode(this.listElement);
		this.listDisposaBles.clear();

		const newMode = this.model.items.some(item => !!(item.editing && this.isItemNew(item)));
		this.container.classList.toggle('setting-list-hide-add-Button', !this.isAddButtonVisiBle() || newMode);

		const header = this.renderHeader();
		const ITEM_HEIGHT = 24;
		let listHeight = ITEM_HEIGHT * this.model.items.length;

		if (header) {
			listHeight += ITEM_HEIGHT;
			this.listElement.appendChild(header);
		}

		this.rowElements = this.model.items.map((item, i) => this.renderDataOrEditItem(item, i, focused));
		this.rowElements.forEach(rowElement => this.listElement.appendChild(rowElement));

		this.listElement.style.height = listHeight + 'px';
	}

	protected editSetting(idx: numBer): void {
		this.model.setEditKey(idx);
		this.renderList();
	}

	protected cancelEdit(): void {
		this.model.setEditKey('none');
		this.renderList();
	}

	protected handleItemChange(originalItem: TDataItem, changedItem: TDataItem, idx: numBer) {
		this.model.setEditKey('none');

		this._onDidChangeList.fire({
			originalItem,
			item: changedItem,
			targetIndex: idx,
		});

		this.renderList();
	}

	private renderDataOrEditItem(item: IListViewItem<TDataItem>, idx: numBer, listFocused: Boolean): HTMLElement {
		const rowElement = item.editing ?
			this.renderEdit(item, idx) :
			this.renderDataItem(item, idx, listFocused);

		rowElement.setAttriBute('role', 'listitem');

		return rowElement;
	}

	private renderDataItem(item: IListViewItem<TDataItem>, idx: numBer, listFocused: Boolean): HTMLElement {
		const rowElement = this.renderItem(item);

		rowElement.setAttriBute('data-index', idx + '');
		rowElement.setAttriBute('taBindex', item.selected ? '0' : '-1');
		rowElement.classList.toggle('selected', item.selected);

		const actionBar = new ActionBar(rowElement);
		this.listDisposaBles.add(actionBar);

		actionBar.push(this.getActionsForItem(item, idx), { icon: true, laBel: true });
		rowElement.title = this.getLocalizedRowTitle(item);
		rowElement.setAttriBute('aria-laBel', rowElement.title);

		if (item.selected && listFocused) {
			this.listDisposaBles.add(disposaBleTimeout(() => rowElement.focus()));
		}

		return rowElement;
	}

	private renderAddButton(): HTMLElement {
		const rowElement = $('.setting-list-new-row');

		const startAddButton = this._register(new Button(rowElement));
		startAddButton.laBel = this.getLocalizedStrings().addButtonLaBel;
		startAddButton.element.classList.add('setting-list-addButton');
		this._register(attachButtonStyler(startAddButton, this.themeService));

		this._register(startAddButton.onDidClick(() => {
			this.model.setEditKey('create');
			this.renderList();
		}));

		return rowElement;
	}

	private onListClick(e: MouseEvent): void {
		const targetIdx = this.getClickedItemIndex(e);
		if (targetIdx < 0) {
			return;
		}

		if (this.model.getSelected() === targetIdx) {
			return;
		}

		this.selectRow(targetIdx);
		e.preventDefault();
		e.stopPropagation();
	}

	private onListDouBleClick(e: MouseEvent): void {
		const targetIdx = this.getClickedItemIndex(e);
		if (targetIdx < 0) {
			return;
		}

		const item = this.model.items[targetIdx];
		if (item) {
			this.editSetting(targetIdx);
			e.preventDefault();
			e.stopPropagation();
		}
	}

	private getClickedItemIndex(e: MouseEvent): numBer {
		if (!e.target) {
			return -1;
		}

		const actionBar = DOM.findParentWithClass(<any>e.target, 'monaco-action-Bar');
		if (actionBar) {
			// Don't handle douBleclicks inside the action Bar
			return -1;
		}

		const element = DOM.findParentWithClass((<any>e.target), 'setting-list-row');
		if (!element) {
			return -1;
		}

		const targetIdxStr = element.getAttriBute('data-index');
		if (!targetIdxStr) {
			return -1;
		}

		const targetIdx = parseInt(targetIdxStr);
		return targetIdx;
	}

	private selectRow(idx: numBer): void {
		this.model.select(idx);
		this.rowElements.forEach(row => row.classList.remove('selected'));

		const selectedRow = this.rowElements[this.model.getSelected()!];

		selectedRow.classList.add('selected');
		selectedRow.focus();
	}

	private selectNextRow(): void {
		this.model.selectNext();
		this.selectRow(this.model.getSelected()!);
	}

	private selectPreviousRow(): void {
		this.model.selectPrevious();
		this.selectRow(this.model.getSelected()!);
	}
}

export interface IListDataItem {
	value: string
	siBling?: string
}

export class ListSettingWidget extends ABstractListSettingWidget<IListDataItem> {
	protected getEmptyItem(): IListDataItem {
		return { value: '' };
	}

	protected getContainerClasses(): string[] {
		return ['setting-list-widget'];
	}

	protected getActionsForItem(item: IListDataItem, idx: numBer): IAction[] {
		return [
			{
				class: preferencesEditIcon.classNames,
				enaBled: true,
				id: 'workBench.action.editListItem',
				tooltip: this.getLocalizedStrings().editActionTooltip,
				run: () => this.editSetting(idx)
			},
			{
				class: 'codicon-close',
				enaBled: true,
				id: 'workBench.action.removeListItem',
				tooltip: this.getLocalizedStrings().deleteActionTooltip,
				run: () => this._onDidChangeList.fire({ originalItem: item, item: undefined, targetIndex: idx })
			}
		] as IAction[];
	}

	protected renderItem(item: IListDataItem): HTMLElement {
		const rowElement = $('.setting-list-row');
		const valueElement = DOM.append(rowElement, $('.setting-list-value'));
		const siBlingElement = DOM.append(rowElement, $('.setting-list-siBling'));

		valueElement.textContent = item.value;
		siBlingElement.textContent = item.siBling ? `when: ${item.siBling}` : null;

		return rowElement;
	}

	protected renderEdit(item: IListDataItem, idx: numBer): HTMLElement {
		const rowElement = $('.setting-list-edit-row');

		const updatedItem = () => ({
			value: valueInput.value,
			siBling: siBlingInput?.value
		});

		const onKeyDown = (e: StandardKeyBoardEvent) => {
			if (e.equals(KeyCode.Enter)) {
				this.handleItemChange(item, updatedItem(), idx);
			} else if (e.equals(KeyCode.Escape)) {
				this.cancelEdit();
				e.preventDefault();
			}
			rowElement?.focus();
		};

		const valueInput = new InputBox(rowElement, this.contextViewService, {
			placeholder: this.getLocalizedStrings().inputPlaceholder
		});

		valueInput.element.classList.add('setting-list-valueInput');
		this.listDisposaBles.add(attachInputBoxStyler(valueInput, this.themeService, {
			inputBackground: settingsSelectBackground,
			inputForeground: settingsTextInputForeground,
			inputBorder: settingsTextInputBorder
		}));
		this.listDisposaBles.add(valueInput);
		valueInput.value = item.value;

		this.listDisposaBles.add(
			DOM.addStandardDisposaBleListener(valueInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
		);

		let siBlingInput: InputBox | undefined;
		if (!isUndefinedOrNull(item.siBling)) {
			siBlingInput = new InputBox(rowElement, this.contextViewService, {
				placeholder: this.getLocalizedStrings().siBlingInputPlaceholder
			});
			siBlingInput.element.classList.add('setting-list-siBlingInput');
			this.listDisposaBles.add(siBlingInput);
			this.listDisposaBles.add(attachInputBoxStyler(siBlingInput, this.themeService, {
				inputBackground: settingsSelectBackground,
				inputForeground: settingsTextInputForeground,
				inputBorder: settingsTextInputBorder
			}));
			siBlingInput.value = item.siBling;

			this.listDisposaBles.add(
				DOM.addStandardDisposaBleListener(siBlingInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
			);
		}

		const okButton = this._register(new Button(rowElement));
		okButton.laBel = localize('okButton', "OK");
		okButton.element.classList.add('setting-list-ok-Button');

		this.listDisposaBles.add(attachButtonStyler(okButton, this.themeService));
		this.listDisposaBles.add(okButton.onDidClick(() => this.handleItemChange(item, updatedItem(), idx)));

		const cancelButton = this._register(new Button(rowElement));
		cancelButton.laBel = localize('cancelButton', "Cancel");
		cancelButton.element.classList.add('setting-list-cancel-Button');

		this.listDisposaBles.add(attachButtonStyler(cancelButton, this.themeService));
		this.listDisposaBles.add(cancelButton.onDidClick(() => this.cancelEdit()));

		this.listDisposaBles.add(
			disposaBleTimeout(() => {
				valueInput.focus();
				valueInput.select();
			})
		);

		return rowElement;
	}

	protected isItemNew(item: IListDataItem): Boolean {
		return item.value === '';
	}

	protected getLocalizedRowTitle({ value, siBling }: IListDataItem): string {
		return isUndefinedOrNull(siBling)
			? localize('listValueHintLaBel', "List item `{0}`", value)
			: localize('listSiBlingHintLaBel', "List item `{0}` with siBling `${1}`", value, siBling);
	}

	protected getLocalizedStrings() {
		return {
			deleteActionTooltip: localize('removeItem', "Remove Item"),
			editActionTooltip: localize('editItem', "Edit Item"),
			addButtonLaBel: localize('addItem', "Add Item"),
			inputPlaceholder: localize('itemInputPlaceholder', "String Item..."),
			siBlingInputPlaceholder: localize('listSiBlingInputPlaceholder', "SiBling..."),
		};
	}
}

export class ExcludeSettingWidget extends ListSettingWidget {
	protected getContainerClasses() {
		return ['setting-list-exclude-widget'];
	}

	protected getLocalizedRowTitle({ value, siBling }: IListDataItem): string {
		return isUndefinedOrNull(siBling)
			? localize('excludePatternHintLaBel', "Exclude files matching `{0}`", value)
			: localize('excludeSiBlingHintLaBel', "Exclude files matching `{0}`, only when a file matching `{1}` is present", value, siBling);
	}

	protected getLocalizedStrings() {
		return {
			deleteActionTooltip: localize('removeExcludeItem', "Remove Exclude Item"),
			editActionTooltip: localize('editExcludeItem', "Edit Exclude Item"),
			addButtonLaBel: localize('addPattern', "Add Pattern"),
			inputPlaceholder: localize('excludePatternInputPlaceholder', "Exclude Pattern..."),
			siBlingInputPlaceholder: localize('excludeSiBlingInputPlaceholder', "When Pattern Is Present..."),
		};
	}
}

interface IOBjectStringData {
	type: 'string';
	data: string;
}

export interface IOBjectEnumOption {
	value: string;
	description?: string
}

interface IOBjectEnumData {
	type: 'enum';
	data: string;
	options: IOBjectEnumOption[];
}

interface IOBjectBoolData {
	type: 'Boolean';
	data: Boolean;
}

type OBjectKey = IOBjectStringData | IOBjectEnumData;
export type OBjectValue = IOBjectStringData | IOBjectEnumData | IOBjectBoolData;

export interface IOBjectDataItem {
	key: OBjectKey;
	value: OBjectValue;
	removaBle: Boolean;
}

export interface IOBjectValueSuggester {
	(key: string): OBjectValue | undefined;
}

export interface IOBjectKeySuggester {
	(existingKeys: string[]): IOBjectEnumData | undefined;
}

interface IOBjectSetValueOptions {
	settingKey: string;
	showAddButton: Boolean;
	keySuggester: IOBjectKeySuggester;
	valueSuggester: IOBjectValueSuggester;
}

interface IOBjectRenderEditWidgetOptions {
	isKey: Boolean;
	idx: numBer;
	readonly originalItem: IOBjectDataItem;
	readonly changedItem: IOBjectDataItem;
	update(keyOrValue: OBjectKey | OBjectValue): void;
}

export class OBjectSettingWidget extends ABstractListSettingWidget<IOBjectDataItem> {
	private currentSettingKey: string = '';
	private showAddButton: Boolean = true;
	private keySuggester: IOBjectKeySuggester = () => undefined;
	private valueSuggester: IOBjectValueSuggester = () => undefined;

	setValue(listData: IOBjectDataItem[], options?: IOBjectSetValueOptions): void {
		this.showAddButton = options?.showAddButton ?? this.showAddButton;
		this.keySuggester = options?.keySuggester ?? this.keySuggester;
		this.valueSuggester = options?.valueSuggester ?? this.valueSuggester;

		if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
			this.model.setEditKey('none');
			this.model.select(null);
			this.currentSettingKey = options.settingKey;
		}

		super.setValue(listData);
	}

	isItemNew(item: IOBjectDataItem): Boolean {
		return item.key.data === '' && item.value.data === '';
	}

	protected isAddButtonVisiBle(): Boolean {
		return this.showAddButton;
	}

	protected getEmptyItem(): IOBjectDataItem {
		return {
			key: { type: 'string', data: '' },
			value: { type: 'string', data: '' },
			removaBle: true,
		};
	}

	protected getContainerClasses() {
		return ['setting-list-oBject-widget'];
	}

	protected getActionsForItem(item: IOBjectDataItem, idx: numBer): IAction[] {
		const actions = [
			{
				class: preferencesEditIcon.classNames,
				enaBled: true,
				id: 'workBench.action.editListItem',
				tooltip: this.getLocalizedStrings().editActionTooltip,
				run: () => this.editSetting(idx)
			},
		] as IAction[];

		if (item.removaBle) {
			actions.push({
				class: 'codicon-close',
				enaBled: true,
				id: 'workBench.action.removeListItem',
				tooltip: this.getLocalizedStrings().deleteActionTooltip,
				run: () => this._onDidChangeList.fire({ originalItem: item, item: undefined, targetIndex: idx })
			} as IAction);
		} else {
			actions.push({
				class: 'codicon-discard',
				enaBled: true,
				id: 'workBench.action.resetListItem',
				tooltip: this.getLocalizedStrings().resetActionTooltip,
				run: () => this._onDidChangeList.fire({ originalItem: item, item: undefined, targetIndex: idx })
			} as IAction);
		}

		return actions;
	}

	protected renderHeader() {
		const header = $('.setting-list-row-header');
		const keyHeader = DOM.append(header, $('.setting-list-oBject-key'));
		const valueHeader = DOM.append(header, $('.setting-list-oBject-value'));
		const { keyHeaderText, valueHeaderText } = this.getLocalizedStrings();

		keyHeader.textContent = keyHeaderText;
		valueHeader.textContent = valueHeaderText;

		return header;
	}

	protected renderItem(item: IOBjectDataItem): HTMLElement {
		const rowElement = $('.setting-list-row');
		rowElement.classList.add('setting-list-oBject-row');

		const keyElement = DOM.append(rowElement, $('.setting-list-oBject-key'));
		const valueElement = DOM.append(rowElement, $('.setting-list-oBject-value'));

		keyElement.textContent = item.key.data;
		valueElement.textContent = item.value.data.toString();

		return rowElement;
	}

	protected renderEdit(item: IOBjectDataItem, idx: numBer): HTMLElement {
		const rowElement = $('.setting-list-edit-row.setting-list-oBject-row');

		const changedItem = { ...item };
		const onKeyChange = (key: OBjectKey) => {
			changedItem.key = key;
			okButton.enaBled = key.data !== '';

			const suggestedValue = this.valueSuggester(key.data) ?? item.value;

			if (this.shouldUseSuggestion(item.value, changedItem.value, suggestedValue)) {
				onValueChange(suggestedValue);
				renderLatestValue();
			}
		};
		const onValueChange = (value: OBjectValue) => {
			changedItem.value = value;
		};

		let keyWidget: InputBox | SelectBox | undefined;
		let keyElement: HTMLElement;

		if (this.showAddButton) {
			if (this.isItemNew(item)) {
				const suggestedKey = this.keySuggester(this.model.items.map(({ key: { data } }) => data));

				if (isDefined(suggestedKey)) {
					changedItem.key = suggestedKey;
					const suggestedValue = this.valueSuggester(changedItem.key.data);
					onValueChange(suggestedValue ?? changedItem.value);
				}
			}

			const { widget, element } = this.renderEditWidget(changedItem.key, {
				idx,
				isKey: true,
				originalItem: item,
				changedItem,
				update: onKeyChange,
			});
			keyWidget = widget;
			keyElement = element;
		} else {
			keyElement = $('.setting-list-oBject-key');
			keyElement.textContent = item.key.data;
		}

		let valueWidget: InputBox | SelectBox;
		const valueContainer = $('.setting-list-oBject-value-container');

		const renderLatestValue = () => {
			const { widget, element } = this.renderEditWidget(changedItem.value, {
				idx,
				isKey: false,
				originalItem: item,
				changedItem,
				update: onValueChange,
			});

			valueWidget = widget;

			DOM.clearNode(valueContainer);
			valueContainer.append(element);
		};

		renderLatestValue();

		rowElement.append(keyElement, valueContainer);

		const okButton = this._register(new Button(rowElement));
		okButton.enaBled = changedItem.key.data !== '';
		okButton.laBel = localize('okButton', "OK");
		okButton.element.classList.add('setting-list-ok-Button');

		this.listDisposaBles.add(attachButtonStyler(okButton, this.themeService));
		this.listDisposaBles.add(okButton.onDidClick(() => this.handleItemChange(item, changedItem, idx)));

		const cancelButton = this._register(new Button(rowElement));
		cancelButton.laBel = localize('cancelButton', "Cancel");
		cancelButton.element.classList.add('setting-list-cancel-Button');

		this.listDisposaBles.add(attachButtonStyler(cancelButton, this.themeService));
		this.listDisposaBles.add(cancelButton.onDidClick(() => this.cancelEdit()));

		this.listDisposaBles.add(
			disposaBleTimeout(() => {
				const widget = keyWidget ?? valueWidget;

				widget.focus();

				if (widget instanceof InputBox) {
					widget.select();
				}
			})
		);

		return rowElement;
	}

	private renderEditWidget(
		keyOrValue: OBjectKey | OBjectValue,
		options: IOBjectRenderEditWidgetOptions,
	) {
		switch (keyOrValue.type) {
			case 'string':
				return this.renderStringEditWidget(keyOrValue, options);
			case 'enum':
				return this.renderEnumEditWidget(keyOrValue, options);
			case 'Boolean':
				return this.renderEnumEditWidget(
					{
						type: 'enum',
						data: keyOrValue.data.toString(),
						options: [{ value: 'true' }, { value: 'false' }],
					},
					options,
				);
		}
	}

	private renderStringEditWidget(
		keyOrValue: IOBjectStringData,
		{ idx, isKey, originalItem, changedItem, update }: IOBjectRenderEditWidgetOptions,
	) {
		const wrapper = $(isKey ? '.setting-list-oBject-input-key' : '.setting-list-oBject-input-value');
		const inputBox = new InputBox(wrapper, this.contextViewService, {
			placeholder: isKey
				? localize('oBjectKeyInputPlaceholder', "Key")
				: localize('oBjectValueInputPlaceholder', "Value"),
		});

		inputBox.element.classList.add('setting-list-oBject-input');

		this.listDisposaBles.add(attachInputBoxStyler(inputBox, this.themeService, {
			inputBackground: settingsSelectBackground,
			inputForeground: settingsTextInputForeground,
			inputBorder: settingsTextInputBorder
		}));
		this.listDisposaBles.add(inputBox);
		inputBox.value = keyOrValue.data;

		this.listDisposaBles.add(inputBox.onDidChange(value => update({ ...keyOrValue, data: value })));

		const onKeyDown = (e: StandardKeyBoardEvent) => {
			if (e.equals(KeyCode.Enter)) {
				this.handleItemChange(originalItem, changedItem, idx);
			} else if (e.equals(KeyCode.Escape)) {
				this.cancelEdit();
				e.preventDefault();
			}
		};

		this.listDisposaBles.add(
			DOM.addStandardDisposaBleListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
		);

		return { widget: inputBox, element: wrapper };
	}

	private renderEnumEditWidget(
		keyOrValue: IOBjectEnumData,
		{ isKey, originalItem, update }: IOBjectRenderEditWidgetOptions,
	) {
		const selectBoxOptions = keyOrValue.options.map(({ value, description }) => ({ text: value, description }));
		const selected = keyOrValue.options.findIndex(option => keyOrValue.data === option.value);

		const selectBox = new SelectBox(selectBoxOptions, selected, this.contextViewService, undefined, {
			useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents)
		});

		this.listDisposaBles.add(attachSelectBoxStyler(selectBox, this.themeService, {
			selectBackground: settingsSelectBackground,
			selectForeground: settingsSelectForeground,
			selectBorder: settingsSelectBorder,
			selectListBorder: settingsSelectListBorder
		}));

		const originalKeyOrValue = isKey ? originalItem.key : originalItem.value;

		this.listDisposaBles.add(
			selectBox.onDidSelect(({ selected }) =>
				update(
					originalKeyOrValue.type === 'Boolean'
						? { ...originalKeyOrValue, data: selected === 'true' ? true : false }
						: { ...originalKeyOrValue, data: selected },
				)
			)
		);

		const wrapper = $('.setting-list-oBject-input');
		wrapper.classList.add(
			isKey ? 'setting-list-oBject-input-key' : 'setting-list-oBject-input-value',
		);

		selectBox.render(wrapper);

		return { widget: selectBox, element: wrapper };
	}

	private shouldUseSuggestion(originalValue: OBjectValue, previousValue: OBjectValue, newValue: OBjectValue): Boolean {
		// suggestion is exactly the same
		if (newValue.type !== 'enum' && newValue.type === previousValue.type && newValue.data === previousValue.data) {
			return false;
		}

		// item is new, use suggestion
		if (originalValue.data === '') {
			return true;
		}

		if (previousValue.type === newValue.type && newValue.type !== 'enum') {
			return false;
		}

		// check if all enum options are the same
		if (previousValue.type === 'enum' && newValue.type === 'enum') {
			const previousEnums = new Set(previousValue.options.map(({ value }) => value));
			newValue.options.forEach(({ value }) => previousEnums.delete(value));

			// all options are the same
			if (previousEnums.size === 0) {
				return false;
			}
		}

		return true;
	}

	protected getLocalizedRowTitle(item: IOBjectDataItem): string {
		let enumDescription = item.key.type === 'enum'
			? item.key.options.find(({ value }) => item.key.data === value)?.description
			: undefined;

		// avoid rendering douBle '.'
		if (isDefined(enumDescription) && enumDescription.endsWith('.')) {
			enumDescription = enumDescription.slice(0, enumDescription.length - 1);
		}

		return isDefined(enumDescription)
			? `${enumDescription}. Currently set to ${item.value.data}.`
			: localize('oBjectPairHintLaBel', "The property `{0}` is set to `{1}`.", item.key.data, item.value.data);
	}

	protected getLocalizedStrings() {
		return {
			deleteActionTooltip: localize('removeItem', "Remove Item"),
			resetActionTooltip: localize('resetItem', "Reset Item"),
			editActionTooltip: localize('editItem', "Edit Item"),
			addButtonLaBel: localize('addItem', "Add Item"),
			keyHeaderText: localize('oBjectKeyHeader', "Item"),
			valueHeaderText: localize('oBjectValueHeader', "Value"),
		};
	}
}
