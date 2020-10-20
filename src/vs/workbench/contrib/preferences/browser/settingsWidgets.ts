/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';
import * As DOM from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { Button } from 'vs/bAse/browser/ui/button/button';
import { InputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { SelectBox } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { IAction } from 'vs/bAse/common/Actions';
import { disposAbleTimeout } from 'vs/bAse/common/Async';
import { Color, RGBA } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isIOS } from 'vs/bAse/common/plAtform';
import { isDefined, isUndefinedOrNull } from 'vs/bAse/common/types';
import 'vs/css!./mediA/settingsWidgets';
import { locAlize } from 'vs/nls';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { editorWidgetBorder, focusBorder, foreground, inputBAckground, inputBorder, inputForeground, listActiveSelectionBAckground, listActiveSelectionForeground, listFocusBAckground, listHoverBAckground, listHoverForeground, listInActiveSelectionBAckground, listInActiveSelectionForeground, registerColor, selectBAckground, selectBorder, selectForeground, simpleCheckboxBAckground, simpleCheckboxBorder, simpleCheckboxForeground, textLinkActiveForeground, textLinkForeground, textPreformAtForeground, trAnspArent } from 'vs/plAtform/theme/common/colorRegistry';
import { AttAchButtonStyler, AttAchInputBoxStyler, AttAchSelectBoxStyler } from 'vs/plAtform/theme/common/styler';
import { IColorTheme, ICssStyleCollector, IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { preferencesEditIcon } from 'vs/workbench/contrib/preferences/browser/preferencesWidgets';

const $ = DOM.$;
export const settingsHeAderForeground = registerColor('settings.heAderForeground', { light: '#444444', dArk: '#e7e7e7', hc: '#ffffff' }, locAlize('heAderForeground', "The foreground color for A section heAder or Active title."));
export const modifiedItemIndicAtor = registerColor('settings.modifiedItemIndicAtor', {
	light: new Color(new RGBA(102, 175, 224)),
	dArk: new Color(new RGBA(12, 125, 157)),
	hc: new Color(new RGBA(0, 73, 122))
}, locAlize('modifiedItemForeground', "The color of the modified setting indicAtor."));

// Enum control colors
export const settingsSelectBAckground = registerColor(`settings.dropdownBAckground`, { dArk: selectBAckground, light: selectBAckground, hc: selectBAckground }, locAlize('settingsDropdownBAckground', "Settings editor dropdown bAckground."));
export const settingsSelectForeground = registerColor('settings.dropdownForeground', { dArk: selectForeground, light: selectForeground, hc: selectForeground }, locAlize('settingsDropdownForeground', "Settings editor dropdown foreground."));
export const settingsSelectBorder = registerColor('settings.dropdownBorder', { dArk: selectBorder, light: selectBorder, hc: selectBorder }, locAlize('settingsDropdownBorder', "Settings editor dropdown border."));
export const settingsSelectListBorder = registerColor('settings.dropdownListBorder', { dArk: editorWidgetBorder, light: editorWidgetBorder, hc: editorWidgetBorder }, locAlize('settingsDropdownListBorder', "Settings editor dropdown list border. This surrounds the options And sepArAtes the options from the description."));

// Bool control colors
export const settingsCheckboxBAckground = registerColor('settings.checkboxBAckground', { dArk: simpleCheckboxBAckground, light: simpleCheckboxBAckground, hc: simpleCheckboxBAckground }, locAlize('settingsCheckboxBAckground', "Settings editor checkbox bAckground."));
export const settingsCheckboxForeground = registerColor('settings.checkboxForeground', { dArk: simpleCheckboxForeground, light: simpleCheckboxForeground, hc: simpleCheckboxForeground }, locAlize('settingsCheckboxForeground', "Settings editor checkbox foreground."));
export const settingsCheckboxBorder = registerColor('settings.checkboxBorder', { dArk: simpleCheckboxBorder, light: simpleCheckboxBorder, hc: simpleCheckboxBorder }, locAlize('settingsCheckboxBorder', "Settings editor checkbox border."));

// Text control colors
export const settingsTextInputBAckground = registerColor('settings.textInputBAckground', { dArk: inputBAckground, light: inputBAckground, hc: inputBAckground }, locAlize('textInputBoxBAckground', "Settings editor text input box bAckground."));
export const settingsTextInputForeground = registerColor('settings.textInputForeground', { dArk: inputForeground, light: inputForeground, hc: inputForeground }, locAlize('textInputBoxForeground', "Settings editor text input box foreground."));
export const settingsTextInputBorder = registerColor('settings.textInputBorder', { dArk: inputBorder, light: inputBorder, hc: inputBorder }, locAlize('textInputBoxBorder', "Settings editor text input box border."));

// Number control colors
export const settingsNumberInputBAckground = registerColor('settings.numberInputBAckground', { dArk: inputBAckground, light: inputBAckground, hc: inputBAckground }, locAlize('numberInputBoxBAckground', "Settings editor number input box bAckground."));
export const settingsNumberInputForeground = registerColor('settings.numberInputForeground', { dArk: inputForeground, light: inputForeground, hc: inputForeground }, locAlize('numberInputBoxForeground', "Settings editor number input box foreground."));
export const settingsNumberInputBorder = registerColor('settings.numberInputBorder', { dArk: inputBorder, light: inputBorder, hc: inputBorder }, locAlize('numberInputBoxBorder', "Settings editor number input box border."));

export const focusedRowBAckground = registerColor('settings.focusedRowBAckground', {
	dArk: Color.fromHex('#808080').trAnspArent(0.14),
	light: trAnspArent(listFocusBAckground, .4),
	hc: null
}, locAlize('focusedRowBAckground', "The bAckground color of A settings row when focused."));

export const rowHoverBAckground = registerColor('notebook.rowHoverBAckground', {
	dArk: trAnspArent(focusedRowBAckground, .5),
	light: trAnspArent(focusedRowBAckground, .7),
	hc: null
}, locAlize('notebook.rowHoverBAckground', "The bAckground color of A settings row when hovered."));

export const focusedRowBorder = registerColor('notebook.focusedRowBorder', {
	dArk: Color.white.trAnspArent(0.12),
	light: Color.blAck.trAnspArent(0.12),
	hc: focusBorder
}, locAlize('notebook.focusedRowBorder', "The color of the row's top And bottom border when the row is focused."));

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const checkboxBAckgroundColor = theme.getColor(settingsCheckboxBAckground);
	if (checkboxBAckgroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-bool .setting-vAlue-checkbox { bAckground-color: ${checkboxBAckgroundColor} !importAnt; }`);
	}

	const checkboxForegroundColor = theme.getColor(settingsCheckboxForeground);
	if (checkboxForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-bool .setting-vAlue-checkbox { color: ${checkboxForegroundColor} !importAnt; }`);
	}

	const checkboxBorderColor = theme.getColor(settingsCheckboxBorder);
	if (checkboxBorderColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-bool .setting-vAlue-checkbox { border-color: ${checkboxBorderColor} !importAnt; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A { color: ${link}; }`);
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A > code { color: ${link}; }`);
		collector.AddRule(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A { color: ${link}; }`);
		collector.AddRule(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A > code { color: ${link}; }`);
	}

	const ActiveLink = theme.getColor(textLinkActiveForeground);
	if (ActiveLink) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A:hover, .settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A:Active { color: ${ActiveLink}; }`);
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A:hover > code, .settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents .setting-item-mArkdown A:Active > code { color: ${ActiveLink}; }`);
		collector.AddRule(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A:hover, .monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A:Active { color: ${ActiveLink}; }`);
		collector.AddRule(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A:hover > code, .monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown A:Active > code { color: ${ActiveLink}; }`);
	}

	const heAderForegroundColor = theme.getColor(settingsHeAderForeground);
	if (heAderForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-heAder > .settings-heAder-controls .settings-tAbs-widget .Action-lAbel.checked { color: ${heAderForegroundColor}; border-bottom-color: ${heAderForegroundColor}; }`);
	}

	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		collector.AddRule(`.settings-editor > .settings-heAder > .settings-heAder-controls .settings-tAbs-widget .Action-lAbel { color: ${foregroundColor}; }`);
	}

	// List control
	const listHoverBAckgroundColor = theme.getColor(listHoverBAckground);
	if (listHoverBAckgroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row:hover { bAckground-color: ${listHoverBAckgroundColor}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	if (listHoverForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row:hover { color: ${listHoverForegroundColor}; }`);
	}

	const listSelectBAckgroundColor = theme.getColor(listActiveSelectionBAckground);
	if (listSelectBAckgroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row.selected:focus { bAckground-color: ${listSelectBAckgroundColor}; }`);
	}

	const listInActiveSelectionBAckgroundColor = theme.getColor(listInActiveSelectionBAckground);
	if (listInActiveSelectionBAckgroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row.selected:not(:focus) { bAckground-color: ${listInActiveSelectionBAckgroundColor}; }`);
	}

	const listInActiveSelectionForegroundColor = theme.getColor(listInActiveSelectionForeground);
	if (listInActiveSelectionForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row.selected:not(:focus) { color: ${listInActiveSelectionForegroundColor}; }`);
	}

	const listSelectForegroundColor = theme.getColor(listActiveSelectionForeground);
	if (listSelectForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item.setting-item-list .setting-list-row.selected:focus { color: ${listSelectForegroundColor}; }`);
	}

	const codeTextForegroundColor = theme.getColor(textPreformAtForeground);
	if (codeTextForegroundColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item .setting-item-mArkdown code { color: ${codeTextForegroundColor} }`);
		collector.AddRule(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne > .select-box-description-mArkdown code { color: ${codeTextForegroundColor} }`);

	}

	const modifiedItemIndicAtorColor = theme.getColor(modifiedItemIndicAtor);
	if (modifiedItemIndicAtorColor) {
		collector.AddRule(`.settings-editor > .settings-body > .settings-tree-contAiner .setting-item-contents > .setting-item-modified-indicAtor { border-color: ${modifiedItemIndicAtorColor}; }`);
	}
});

type EditKey = 'none' | 'creAte' | number;

type IListViewItem<TDAtAItem extends object> = TDAtAItem & {
	editing?: booleAn;
	selected?: booleAn;
};

export clAss ListSettingListModel<TDAtAItem extends object> {
	protected _dAtAItems: TDAtAItem[] = [];
	privAte _editKey: EditKey | null = null;
	privAte _selectedIdx: number | null = null;
	privAte _newDAtAItem: TDAtAItem;

	get items(): IListViewItem<TDAtAItem>[] {
		const items = this._dAtAItems.mAp((item, i) => {
			const editing = typeof this._editKey === 'number' && this._editKey === i;
			return {
				...item,
				editing,
				selected: i === this._selectedIdx || editing
			};
		});

		if (this._editKey === 'creAte') {
			items.push({
				editing: true,
				selected: true,
				...this._newDAtAItem,
			});
		}

		return items;
	}

	constructor(newItem: TDAtAItem) {
		this._newDAtAItem = newItem;
	}

	setEditKey(key: EditKey): void {
		this._editKey = key;
	}

	setVAlue(listDAtA: TDAtAItem[]): void {
		this._dAtAItems = listDAtA;
	}

	select(idx: number | null): void {
		this._selectedIdx = idx;
	}

	getSelected(): number | null {
		return this._selectedIdx;
	}

	selectNext(): void {
		if (typeof this._selectedIdx === 'number') {
			this._selectedIdx = MAth.min(this._selectedIdx + 1, this._dAtAItems.length - 1);
		} else {
			this._selectedIdx = 0;
		}
	}

	selectPrevious(): void {
		if (typeof this._selectedIdx === 'number') {
			this._selectedIdx = MAth.mAx(this._selectedIdx - 1, 0);
		} else {
			this._selectedIdx = 0;
		}
	}
}

export interfAce ISettingListChAngeEvent<TDAtAItem extends object> {
	originAlItem: TDAtAItem;
	item?: TDAtAItem;
	tArgetIndex?: number;
}

AbstrAct clAss AbstrActListSettingWidget<TDAtAItem extends object> extends DisposAble {
	privAte listElement: HTMLElement;
	privAte rowElements: HTMLElement[] = [];

	protected reAdonly _onDidChAngeList = this._register(new Emitter<ISettingListChAngeEvent<TDAtAItem>>());
	protected reAdonly model = new ListSettingListModel<TDAtAItem>(this.getEmptyItem());
	protected reAdonly listDisposAbles = this._register(new DisposAbleStore());

	reAdonly onDidChAngeList: Event<ISettingListChAngeEvent<TDAtAItem>> = this._onDidChAngeList.event;

	get domNode(): HTMLElement {
		return this.listElement;
	}

	get items(): TDAtAItem[] {
		return this.model.items;
	}

	constructor(
		privAte contAiner: HTMLElement,
		@IThemeService protected reAdonly themeService: IThemeService,
		@IContextViewService protected reAdonly contextViewService: IContextViewService
	) {
		super();

		this.listElement = DOM.Append(contAiner, $('div'));
		this.listElement.setAttribute('role', 'list');
		this.getContAinerClAsses().forEAch(c => this.listElement.clAssList.Add(c));
		this.listElement.setAttribute('tAbindex', '0');
		DOM.Append(contAiner, this.renderAddButton());
		this.renderList();

		this._register(DOM.AddDisposAbleListener(this.listElement, DOM.EventType.CLICK, e => this.onListClick(e)));
		this._register(DOM.AddDisposAbleListener(this.listElement, DOM.EventType.DBLCLICK, e => this.onListDoubleClick(e)));

		this._register(DOM.AddStAndArdDisposAbleListener(this.listElement, 'keydown', (e: StAndArdKeyboArdEvent) => {
			if (e.equAls(KeyCode.UpArrow)) {
				this.selectPreviousRow();
			} else if (e.equAls(KeyCode.DownArrow)) {
				this.selectNextRow();
			} else {
				return;
			}

			e.preventDefAult();
			e.stopPropAgAtion();
		}));
	}

	setVAlue(listDAtA: TDAtAItem[]): void {
		this.model.setVAlue(listDAtA);
		this.renderList();
	}

	protected AbstrAct getEmptyItem(): TDAtAItem;
	protected AbstrAct getContAinerClAsses(): string[];
	protected AbstrAct getActionsForItem(item: TDAtAItem, idx: number): IAction[];
	protected AbstrAct renderItem(item: TDAtAItem): HTMLElement;
	protected AbstrAct renderEdit(item: TDAtAItem, idx: number): HTMLElement;
	protected AbstrAct isItemNew(item: TDAtAItem): booleAn;
	protected AbstrAct getLocAlizedRowTitle(item: TDAtAItem): string;
	protected AbstrAct getLocAlizedStrings(): {
		deleteActionTooltip: string
		editActionTooltip: string
		AddButtonLAbel: string
	};

	protected renderHeAder(): HTMLElement | undefined {
		return;
	}

	protected isAddButtonVisible(): booleAn {
		return true;
	}

	protected renderList(): void {
		const focused = DOM.isAncestor(document.ActiveElement, this.listElement);

		DOM.cleArNode(this.listElement);
		this.listDisposAbles.cleAr();

		const newMode = this.model.items.some(item => !!(item.editing && this.isItemNew(item)));
		this.contAiner.clAssList.toggle('setting-list-hide-Add-button', !this.isAddButtonVisible() || newMode);

		const heAder = this.renderHeAder();
		const ITEM_HEIGHT = 24;
		let listHeight = ITEM_HEIGHT * this.model.items.length;

		if (heAder) {
			listHeight += ITEM_HEIGHT;
			this.listElement.AppendChild(heAder);
		}

		this.rowElements = this.model.items.mAp((item, i) => this.renderDAtAOrEditItem(item, i, focused));
		this.rowElements.forEAch(rowElement => this.listElement.AppendChild(rowElement));

		this.listElement.style.height = listHeight + 'px';
	}

	protected editSetting(idx: number): void {
		this.model.setEditKey(idx);
		this.renderList();
	}

	protected cAncelEdit(): void {
		this.model.setEditKey('none');
		this.renderList();
	}

	protected hAndleItemChAnge(originAlItem: TDAtAItem, chAngedItem: TDAtAItem, idx: number) {
		this.model.setEditKey('none');

		this._onDidChAngeList.fire({
			originAlItem,
			item: chAngedItem,
			tArgetIndex: idx,
		});

		this.renderList();
	}

	privAte renderDAtAOrEditItem(item: IListViewItem<TDAtAItem>, idx: number, listFocused: booleAn): HTMLElement {
		const rowElement = item.editing ?
			this.renderEdit(item, idx) :
			this.renderDAtAItem(item, idx, listFocused);

		rowElement.setAttribute('role', 'listitem');

		return rowElement;
	}

	privAte renderDAtAItem(item: IListViewItem<TDAtAItem>, idx: number, listFocused: booleAn): HTMLElement {
		const rowElement = this.renderItem(item);

		rowElement.setAttribute('dAtA-index', idx + '');
		rowElement.setAttribute('tAbindex', item.selected ? '0' : '-1');
		rowElement.clAssList.toggle('selected', item.selected);

		const ActionBAr = new ActionBAr(rowElement);
		this.listDisposAbles.Add(ActionBAr);

		ActionBAr.push(this.getActionsForItem(item, idx), { icon: true, lAbel: true });
		rowElement.title = this.getLocAlizedRowTitle(item);
		rowElement.setAttribute('AriA-lAbel', rowElement.title);

		if (item.selected && listFocused) {
			this.listDisposAbles.Add(disposAbleTimeout(() => rowElement.focus()));
		}

		return rowElement;
	}

	privAte renderAddButton(): HTMLElement {
		const rowElement = $('.setting-list-new-row');

		const stArtAddButton = this._register(new Button(rowElement));
		stArtAddButton.lAbel = this.getLocAlizedStrings().AddButtonLAbel;
		stArtAddButton.element.clAssList.Add('setting-list-AddButton');
		this._register(AttAchButtonStyler(stArtAddButton, this.themeService));

		this._register(stArtAddButton.onDidClick(() => {
			this.model.setEditKey('creAte');
			this.renderList();
		}));

		return rowElement;
	}

	privAte onListClick(e: MouseEvent): void {
		const tArgetIdx = this.getClickedItemIndex(e);
		if (tArgetIdx < 0) {
			return;
		}

		if (this.model.getSelected() === tArgetIdx) {
			return;
		}

		this.selectRow(tArgetIdx);
		e.preventDefAult();
		e.stopPropAgAtion();
	}

	privAte onListDoubleClick(e: MouseEvent): void {
		const tArgetIdx = this.getClickedItemIndex(e);
		if (tArgetIdx < 0) {
			return;
		}

		const item = this.model.items[tArgetIdx];
		if (item) {
			this.editSetting(tArgetIdx);
			e.preventDefAult();
			e.stopPropAgAtion();
		}
	}

	privAte getClickedItemIndex(e: MouseEvent): number {
		if (!e.tArget) {
			return -1;
		}

		const ActionbAr = DOM.findPArentWithClAss(<Any>e.tArget, 'monAco-Action-bAr');
		if (ActionbAr) {
			// Don't hAndle doubleclicks inside the Action bAr
			return -1;
		}

		const element = DOM.findPArentWithClAss((<Any>e.tArget), 'setting-list-row');
		if (!element) {
			return -1;
		}

		const tArgetIdxStr = element.getAttribute('dAtA-index');
		if (!tArgetIdxStr) {
			return -1;
		}

		const tArgetIdx = pArseInt(tArgetIdxStr);
		return tArgetIdx;
	}

	privAte selectRow(idx: number): void {
		this.model.select(idx);
		this.rowElements.forEAch(row => row.clAssList.remove('selected'));

		const selectedRow = this.rowElements[this.model.getSelected()!];

		selectedRow.clAssList.Add('selected');
		selectedRow.focus();
	}

	privAte selectNextRow(): void {
		this.model.selectNext();
		this.selectRow(this.model.getSelected()!);
	}

	privAte selectPreviousRow(): void {
		this.model.selectPrevious();
		this.selectRow(this.model.getSelected()!);
	}
}

export interfAce IListDAtAItem {
	vAlue: string
	sibling?: string
}

export clAss ListSettingWidget extends AbstrActListSettingWidget<IListDAtAItem> {
	protected getEmptyItem(): IListDAtAItem {
		return { vAlue: '' };
	}

	protected getContAinerClAsses(): string[] {
		return ['setting-list-widget'];
	}

	protected getActionsForItem(item: IListDAtAItem, idx: number): IAction[] {
		return [
			{
				clAss: preferencesEditIcon.clAssNAmes,
				enAbled: true,
				id: 'workbench.Action.editListItem',
				tooltip: this.getLocAlizedStrings().editActionTooltip,
				run: () => this.editSetting(idx)
			},
			{
				clAss: 'codicon-close',
				enAbled: true,
				id: 'workbench.Action.removeListItem',
				tooltip: this.getLocAlizedStrings().deleteActionTooltip,
				run: () => this._onDidChAngeList.fire({ originAlItem: item, item: undefined, tArgetIndex: idx })
			}
		] As IAction[];
	}

	protected renderItem(item: IListDAtAItem): HTMLElement {
		const rowElement = $('.setting-list-row');
		const vAlueElement = DOM.Append(rowElement, $('.setting-list-vAlue'));
		const siblingElement = DOM.Append(rowElement, $('.setting-list-sibling'));

		vAlueElement.textContent = item.vAlue;
		siblingElement.textContent = item.sibling ? `when: ${item.sibling}` : null;

		return rowElement;
	}

	protected renderEdit(item: IListDAtAItem, idx: number): HTMLElement {
		const rowElement = $('.setting-list-edit-row');

		const updAtedItem = () => ({
			vAlue: vAlueInput.vAlue,
			sibling: siblingInput?.vAlue
		});

		const onKeyDown = (e: StAndArdKeyboArdEvent) => {
			if (e.equAls(KeyCode.Enter)) {
				this.hAndleItemChAnge(item, updAtedItem(), idx);
			} else if (e.equAls(KeyCode.EscApe)) {
				this.cAncelEdit();
				e.preventDefAult();
			}
			rowElement?.focus();
		};

		const vAlueInput = new InputBox(rowElement, this.contextViewService, {
			plAceholder: this.getLocAlizedStrings().inputPlAceholder
		});

		vAlueInput.element.clAssList.Add('setting-list-vAlueInput');
		this.listDisposAbles.Add(AttAchInputBoxStyler(vAlueInput, this.themeService, {
			inputBAckground: settingsSelectBAckground,
			inputForeground: settingsTextInputForeground,
			inputBorder: settingsTextInputBorder
		}));
		this.listDisposAbles.Add(vAlueInput);
		vAlueInput.vAlue = item.vAlue;

		this.listDisposAbles.Add(
			DOM.AddStAndArdDisposAbleListener(vAlueInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
		);

		let siblingInput: InputBox | undefined;
		if (!isUndefinedOrNull(item.sibling)) {
			siblingInput = new InputBox(rowElement, this.contextViewService, {
				plAceholder: this.getLocAlizedStrings().siblingInputPlAceholder
			});
			siblingInput.element.clAssList.Add('setting-list-siblingInput');
			this.listDisposAbles.Add(siblingInput);
			this.listDisposAbles.Add(AttAchInputBoxStyler(siblingInput, this.themeService, {
				inputBAckground: settingsSelectBAckground,
				inputForeground: settingsTextInputForeground,
				inputBorder: settingsTextInputBorder
			}));
			siblingInput.vAlue = item.sibling;

			this.listDisposAbles.Add(
				DOM.AddStAndArdDisposAbleListener(siblingInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
			);
		}

		const okButton = this._register(new Button(rowElement));
		okButton.lAbel = locAlize('okButton', "OK");
		okButton.element.clAssList.Add('setting-list-ok-button');

		this.listDisposAbles.Add(AttAchButtonStyler(okButton, this.themeService));
		this.listDisposAbles.Add(okButton.onDidClick(() => this.hAndleItemChAnge(item, updAtedItem(), idx)));

		const cAncelButton = this._register(new Button(rowElement));
		cAncelButton.lAbel = locAlize('cAncelButton', "CAncel");
		cAncelButton.element.clAssList.Add('setting-list-cAncel-button');

		this.listDisposAbles.Add(AttAchButtonStyler(cAncelButton, this.themeService));
		this.listDisposAbles.Add(cAncelButton.onDidClick(() => this.cAncelEdit()));

		this.listDisposAbles.Add(
			disposAbleTimeout(() => {
				vAlueInput.focus();
				vAlueInput.select();
			})
		);

		return rowElement;
	}

	protected isItemNew(item: IListDAtAItem): booleAn {
		return item.vAlue === '';
	}

	protected getLocAlizedRowTitle({ vAlue, sibling }: IListDAtAItem): string {
		return isUndefinedOrNull(sibling)
			? locAlize('listVAlueHintLAbel', "List item `{0}`", vAlue)
			: locAlize('listSiblingHintLAbel', "List item `{0}` with sibling `${1}`", vAlue, sibling);
	}

	protected getLocAlizedStrings() {
		return {
			deleteActionTooltip: locAlize('removeItem', "Remove Item"),
			editActionTooltip: locAlize('editItem', "Edit Item"),
			AddButtonLAbel: locAlize('AddItem', "Add Item"),
			inputPlAceholder: locAlize('itemInputPlAceholder', "String Item..."),
			siblingInputPlAceholder: locAlize('listSiblingInputPlAceholder', "Sibling..."),
		};
	}
}

export clAss ExcludeSettingWidget extends ListSettingWidget {
	protected getContAinerClAsses() {
		return ['setting-list-exclude-widget'];
	}

	protected getLocAlizedRowTitle({ vAlue, sibling }: IListDAtAItem): string {
		return isUndefinedOrNull(sibling)
			? locAlize('excludePAtternHintLAbel', "Exclude files mAtching `{0}`", vAlue)
			: locAlize('excludeSiblingHintLAbel', "Exclude files mAtching `{0}`, only when A file mAtching `{1}` is present", vAlue, sibling);
	}

	protected getLocAlizedStrings() {
		return {
			deleteActionTooltip: locAlize('removeExcludeItem', "Remove Exclude Item"),
			editActionTooltip: locAlize('editExcludeItem', "Edit Exclude Item"),
			AddButtonLAbel: locAlize('AddPAttern', "Add PAttern"),
			inputPlAceholder: locAlize('excludePAtternInputPlAceholder', "Exclude PAttern..."),
			siblingInputPlAceholder: locAlize('excludeSiblingInputPlAceholder', "When PAttern Is Present..."),
		};
	}
}

interfAce IObjectStringDAtA {
	type: 'string';
	dAtA: string;
}

export interfAce IObjectEnumOption {
	vAlue: string;
	description?: string
}

interfAce IObjectEnumDAtA {
	type: 'enum';
	dAtA: string;
	options: IObjectEnumOption[];
}

interfAce IObjectBoolDAtA {
	type: 'booleAn';
	dAtA: booleAn;
}

type ObjectKey = IObjectStringDAtA | IObjectEnumDAtA;
export type ObjectVAlue = IObjectStringDAtA | IObjectEnumDAtA | IObjectBoolDAtA;

export interfAce IObjectDAtAItem {
	key: ObjectKey;
	vAlue: ObjectVAlue;
	removAble: booleAn;
}

export interfAce IObjectVAlueSuggester {
	(key: string): ObjectVAlue | undefined;
}

export interfAce IObjectKeySuggester {
	(existingKeys: string[]): IObjectEnumDAtA | undefined;
}

interfAce IObjectSetVAlueOptions {
	settingKey: string;
	showAddButton: booleAn;
	keySuggester: IObjectKeySuggester;
	vAlueSuggester: IObjectVAlueSuggester;
}

interfAce IObjectRenderEditWidgetOptions {
	isKey: booleAn;
	idx: number;
	reAdonly originAlItem: IObjectDAtAItem;
	reAdonly chAngedItem: IObjectDAtAItem;
	updAte(keyOrVAlue: ObjectKey | ObjectVAlue): void;
}

export clAss ObjectSettingWidget extends AbstrActListSettingWidget<IObjectDAtAItem> {
	privAte currentSettingKey: string = '';
	privAte showAddButton: booleAn = true;
	privAte keySuggester: IObjectKeySuggester = () => undefined;
	privAte vAlueSuggester: IObjectVAlueSuggester = () => undefined;

	setVAlue(listDAtA: IObjectDAtAItem[], options?: IObjectSetVAlueOptions): void {
		this.showAddButton = options?.showAddButton ?? this.showAddButton;
		this.keySuggester = options?.keySuggester ?? this.keySuggester;
		this.vAlueSuggester = options?.vAlueSuggester ?? this.vAlueSuggester;

		if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
			this.model.setEditKey('none');
			this.model.select(null);
			this.currentSettingKey = options.settingKey;
		}

		super.setVAlue(listDAtA);
	}

	isItemNew(item: IObjectDAtAItem): booleAn {
		return item.key.dAtA === '' && item.vAlue.dAtA === '';
	}

	protected isAddButtonVisible(): booleAn {
		return this.showAddButton;
	}

	protected getEmptyItem(): IObjectDAtAItem {
		return {
			key: { type: 'string', dAtA: '' },
			vAlue: { type: 'string', dAtA: '' },
			removAble: true,
		};
	}

	protected getContAinerClAsses() {
		return ['setting-list-object-widget'];
	}

	protected getActionsForItem(item: IObjectDAtAItem, idx: number): IAction[] {
		const Actions = [
			{
				clAss: preferencesEditIcon.clAssNAmes,
				enAbled: true,
				id: 'workbench.Action.editListItem',
				tooltip: this.getLocAlizedStrings().editActionTooltip,
				run: () => this.editSetting(idx)
			},
		] As IAction[];

		if (item.removAble) {
			Actions.push({
				clAss: 'codicon-close',
				enAbled: true,
				id: 'workbench.Action.removeListItem',
				tooltip: this.getLocAlizedStrings().deleteActionTooltip,
				run: () => this._onDidChAngeList.fire({ originAlItem: item, item: undefined, tArgetIndex: idx })
			} As IAction);
		} else {
			Actions.push({
				clAss: 'codicon-discArd',
				enAbled: true,
				id: 'workbench.Action.resetListItem',
				tooltip: this.getLocAlizedStrings().resetActionTooltip,
				run: () => this._onDidChAngeList.fire({ originAlItem: item, item: undefined, tArgetIndex: idx })
			} As IAction);
		}

		return Actions;
	}

	protected renderHeAder() {
		const heAder = $('.setting-list-row-heAder');
		const keyHeAder = DOM.Append(heAder, $('.setting-list-object-key'));
		const vAlueHeAder = DOM.Append(heAder, $('.setting-list-object-vAlue'));
		const { keyHeAderText, vAlueHeAderText } = this.getLocAlizedStrings();

		keyHeAder.textContent = keyHeAderText;
		vAlueHeAder.textContent = vAlueHeAderText;

		return heAder;
	}

	protected renderItem(item: IObjectDAtAItem): HTMLElement {
		const rowElement = $('.setting-list-row');
		rowElement.clAssList.Add('setting-list-object-row');

		const keyElement = DOM.Append(rowElement, $('.setting-list-object-key'));
		const vAlueElement = DOM.Append(rowElement, $('.setting-list-object-vAlue'));

		keyElement.textContent = item.key.dAtA;
		vAlueElement.textContent = item.vAlue.dAtA.toString();

		return rowElement;
	}

	protected renderEdit(item: IObjectDAtAItem, idx: number): HTMLElement {
		const rowElement = $('.setting-list-edit-row.setting-list-object-row');

		const chAngedItem = { ...item };
		const onKeyChAnge = (key: ObjectKey) => {
			chAngedItem.key = key;
			okButton.enAbled = key.dAtA !== '';

			const suggestedVAlue = this.vAlueSuggester(key.dAtA) ?? item.vAlue;

			if (this.shouldUseSuggestion(item.vAlue, chAngedItem.vAlue, suggestedVAlue)) {
				onVAlueChAnge(suggestedVAlue);
				renderLAtestVAlue();
			}
		};
		const onVAlueChAnge = (vAlue: ObjectVAlue) => {
			chAngedItem.vAlue = vAlue;
		};

		let keyWidget: InputBox | SelectBox | undefined;
		let keyElement: HTMLElement;

		if (this.showAddButton) {
			if (this.isItemNew(item)) {
				const suggestedKey = this.keySuggester(this.model.items.mAp(({ key: { dAtA } }) => dAtA));

				if (isDefined(suggestedKey)) {
					chAngedItem.key = suggestedKey;
					const suggestedVAlue = this.vAlueSuggester(chAngedItem.key.dAtA);
					onVAlueChAnge(suggestedVAlue ?? chAngedItem.vAlue);
				}
			}

			const { widget, element } = this.renderEditWidget(chAngedItem.key, {
				idx,
				isKey: true,
				originAlItem: item,
				chAngedItem,
				updAte: onKeyChAnge,
			});
			keyWidget = widget;
			keyElement = element;
		} else {
			keyElement = $('.setting-list-object-key');
			keyElement.textContent = item.key.dAtA;
		}

		let vAlueWidget: InputBox | SelectBox;
		const vAlueContAiner = $('.setting-list-object-vAlue-contAiner');

		const renderLAtestVAlue = () => {
			const { widget, element } = this.renderEditWidget(chAngedItem.vAlue, {
				idx,
				isKey: fAlse,
				originAlItem: item,
				chAngedItem,
				updAte: onVAlueChAnge,
			});

			vAlueWidget = widget;

			DOM.cleArNode(vAlueContAiner);
			vAlueContAiner.Append(element);
		};

		renderLAtestVAlue();

		rowElement.Append(keyElement, vAlueContAiner);

		const okButton = this._register(new Button(rowElement));
		okButton.enAbled = chAngedItem.key.dAtA !== '';
		okButton.lAbel = locAlize('okButton', "OK");
		okButton.element.clAssList.Add('setting-list-ok-button');

		this.listDisposAbles.Add(AttAchButtonStyler(okButton, this.themeService));
		this.listDisposAbles.Add(okButton.onDidClick(() => this.hAndleItemChAnge(item, chAngedItem, idx)));

		const cAncelButton = this._register(new Button(rowElement));
		cAncelButton.lAbel = locAlize('cAncelButton', "CAncel");
		cAncelButton.element.clAssList.Add('setting-list-cAncel-button');

		this.listDisposAbles.Add(AttAchButtonStyler(cAncelButton, this.themeService));
		this.listDisposAbles.Add(cAncelButton.onDidClick(() => this.cAncelEdit()));

		this.listDisposAbles.Add(
			disposAbleTimeout(() => {
				const widget = keyWidget ?? vAlueWidget;

				widget.focus();

				if (widget instAnceof InputBox) {
					widget.select();
				}
			})
		);

		return rowElement;
	}

	privAte renderEditWidget(
		keyOrVAlue: ObjectKey | ObjectVAlue,
		options: IObjectRenderEditWidgetOptions,
	) {
		switch (keyOrVAlue.type) {
			cAse 'string':
				return this.renderStringEditWidget(keyOrVAlue, options);
			cAse 'enum':
				return this.renderEnumEditWidget(keyOrVAlue, options);
			cAse 'booleAn':
				return this.renderEnumEditWidget(
					{
						type: 'enum',
						dAtA: keyOrVAlue.dAtA.toString(),
						options: [{ vAlue: 'true' }, { vAlue: 'fAlse' }],
					},
					options,
				);
		}
	}

	privAte renderStringEditWidget(
		keyOrVAlue: IObjectStringDAtA,
		{ idx, isKey, originAlItem, chAngedItem, updAte }: IObjectRenderEditWidgetOptions,
	) {
		const wrApper = $(isKey ? '.setting-list-object-input-key' : '.setting-list-object-input-vAlue');
		const inputBox = new InputBox(wrApper, this.contextViewService, {
			plAceholder: isKey
				? locAlize('objectKeyInputPlAceholder', "Key")
				: locAlize('objectVAlueInputPlAceholder', "VAlue"),
		});

		inputBox.element.clAssList.Add('setting-list-object-input');

		this.listDisposAbles.Add(AttAchInputBoxStyler(inputBox, this.themeService, {
			inputBAckground: settingsSelectBAckground,
			inputForeground: settingsTextInputForeground,
			inputBorder: settingsTextInputBorder
		}));
		this.listDisposAbles.Add(inputBox);
		inputBox.vAlue = keyOrVAlue.dAtA;

		this.listDisposAbles.Add(inputBox.onDidChAnge(vAlue => updAte({ ...keyOrVAlue, dAtA: vAlue })));

		const onKeyDown = (e: StAndArdKeyboArdEvent) => {
			if (e.equAls(KeyCode.Enter)) {
				this.hAndleItemChAnge(originAlItem, chAngedItem, idx);
			} else if (e.equAls(KeyCode.EscApe)) {
				this.cAncelEdit();
				e.preventDefAult();
			}
		};

		this.listDisposAbles.Add(
			DOM.AddStAndArdDisposAbleListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown)
		);

		return { widget: inputBox, element: wrApper };
	}

	privAte renderEnumEditWidget(
		keyOrVAlue: IObjectEnumDAtA,
		{ isKey, originAlItem, updAte }: IObjectRenderEditWidgetOptions,
	) {
		const selectBoxOptions = keyOrVAlue.options.mAp(({ vAlue, description }) => ({ text: vAlue, description }));
		const selected = keyOrVAlue.options.findIndex(option => keyOrVAlue.dAtA === option.vAlue);

		const selectBox = new SelectBox(selectBoxOptions, selected, this.contextViewService, undefined, {
			useCustomDrAwn: !(isIOS && BrowserFeAtures.pointerEvents)
		});

		this.listDisposAbles.Add(AttAchSelectBoxStyler(selectBox, this.themeService, {
			selectBAckground: settingsSelectBAckground,
			selectForeground: settingsSelectForeground,
			selectBorder: settingsSelectBorder,
			selectListBorder: settingsSelectListBorder
		}));

		const originAlKeyOrVAlue = isKey ? originAlItem.key : originAlItem.vAlue;

		this.listDisposAbles.Add(
			selectBox.onDidSelect(({ selected }) =>
				updAte(
					originAlKeyOrVAlue.type === 'booleAn'
						? { ...originAlKeyOrVAlue, dAtA: selected === 'true' ? true : fAlse }
						: { ...originAlKeyOrVAlue, dAtA: selected },
				)
			)
		);

		const wrApper = $('.setting-list-object-input');
		wrApper.clAssList.Add(
			isKey ? 'setting-list-object-input-key' : 'setting-list-object-input-vAlue',
		);

		selectBox.render(wrApper);

		return { widget: selectBox, element: wrApper };
	}

	privAte shouldUseSuggestion(originAlVAlue: ObjectVAlue, previousVAlue: ObjectVAlue, newVAlue: ObjectVAlue): booleAn {
		// suggestion is exActly the sAme
		if (newVAlue.type !== 'enum' && newVAlue.type === previousVAlue.type && newVAlue.dAtA === previousVAlue.dAtA) {
			return fAlse;
		}

		// item is new, use suggestion
		if (originAlVAlue.dAtA === '') {
			return true;
		}

		if (previousVAlue.type === newVAlue.type && newVAlue.type !== 'enum') {
			return fAlse;
		}

		// check if All enum options Are the sAme
		if (previousVAlue.type === 'enum' && newVAlue.type === 'enum') {
			const previousEnums = new Set(previousVAlue.options.mAp(({ vAlue }) => vAlue));
			newVAlue.options.forEAch(({ vAlue }) => previousEnums.delete(vAlue));

			// All options Are the sAme
			if (previousEnums.size === 0) {
				return fAlse;
			}
		}

		return true;
	}

	protected getLocAlizedRowTitle(item: IObjectDAtAItem): string {
		let enumDescription = item.key.type === 'enum'
			? item.key.options.find(({ vAlue }) => item.key.dAtA === vAlue)?.description
			: undefined;

		// Avoid rendering double '.'
		if (isDefined(enumDescription) && enumDescription.endsWith('.')) {
			enumDescription = enumDescription.slice(0, enumDescription.length - 1);
		}

		return isDefined(enumDescription)
			? `${enumDescription}. Currently set to ${item.vAlue.dAtA}.`
			: locAlize('objectPAirHintLAbel', "The property `{0}` is set to `{1}`.", item.key.dAtA, item.vAlue.dAtA);
	}

	protected getLocAlizedStrings() {
		return {
			deleteActionTooltip: locAlize('removeItem', "Remove Item"),
			resetActionTooltip: locAlize('resetItem', "Reset Item"),
			editActionTooltip: locAlize('editItem', "Edit Item"),
			AddButtonLAbel: locAlize('AddItem', "Add Item"),
			keyHeAderText: locAlize('objectKeyHeAder', "Item"),
			vAlueHeAderText: locAlize('objectVAlueHeAder', "VAlue"),
		};
	}
}
