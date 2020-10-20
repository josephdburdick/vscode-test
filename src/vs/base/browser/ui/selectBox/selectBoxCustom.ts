/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./selectBoxCustom';

import { IDisposAble, dispose, DisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { KeyCode, KeyCodeUtils } from 'vs/bAse/common/keyCodes';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import * As dom from 'vs/bAse/browser/dom';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { IContextViewProvider, AnchorPosition } from 'vs/bAse/browser/ui/contextview/contextview';
import { List } from 'vs/bAse/browser/ui/list/listWidget';
import { IListVirtuAlDelegAte, IListRenderer, IListEvent } from 'vs/bAse/browser/ui/list/list';
import { domEvent } from 'vs/bAse/browser/event';
import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { ISelectBoxDelegAte, ISelectOptionItem, ISelectBoxOptions, ISelectBoxStyles, ISelectDAtA } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { renderMArkdown } from 'vs/bAse/browser/mArkdownRenderer';
import { IContentActionHAndler } from 'vs/bAse/browser/formAttedTextRenderer';
import { locAlize } from 'vs/nls';

const $ = dom.$;

const SELECT_OPTION_ENTRY_TEMPLATE_ID = 'selectOption.entry.templAte';

interfAce ISelectListTemplAteDAtA {
	root: HTMLElement;
	text: HTMLElement;
	decorAtorRight: HTMLElement;
	disposAbles: IDisposAble[];
}

clAss SelectListRenderer implements IListRenderer<ISelectOptionItem, ISelectListTemplAteDAtA> {

	get templAteId(): string { return SELECT_OPTION_ENTRY_TEMPLATE_ID; }

	renderTemplAte(contAiner: HTMLElement): ISelectListTemplAteDAtA {
		const dAtA: ISelectListTemplAteDAtA = Object.creAte(null);
		dAtA.disposAbles = [];
		dAtA.root = contAiner;
		dAtA.text = dom.Append(contAiner, $('.option-text'));
		dAtA.decorAtorRight = dom.Append(contAiner, $('.option-decorAtor-right'));

		return dAtA;
	}

	renderElement(element: ISelectOptionItem, index: number, templAteDAtA: ISelectListTemplAteDAtA): void {
		const dAtA: ISelectListTemplAteDAtA = templAteDAtA;
		const text = element.text;
		const decorAtorRight = element.decorAtorRight;
		const isDisAbled = element.isDisAbled;

		dAtA.text.textContent = text;
		dAtA.decorAtorRight.innerText = (!!decorAtorRight ? decorAtorRight : '');

		// pseudo-select disAbled option
		if (isDisAbled) {
			dAtA.root.clAssList.Add('option-disAbled');
		} else {
			// MAke sure we do clAss removAl from prior templAte rendering
			dAtA.root.clAssList.remove('option-disAbled');
		}
	}

	disposeTemplAte(templAteDAtA: ISelectListTemplAteDAtA): void {
		templAteDAtA.disposAbles = dispose(templAteDAtA.disposAbles);
	}
}

export clAss SelectBoxList extends DisposAble implements ISelectBoxDelegAte, IListVirtuAlDelegAte<ISelectOptionItem> {

	privAte stAtic reAdonly DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN = 32;
	privAte stAtic reAdonly DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN = 2;
	privAte stAtic reAdonly DEFAULT_MINIMUM_VISIBLE_OPTIONS = 3;

	privAte _isVisible: booleAn;
	privAte selectBoxOptions: ISelectBoxOptions;
	privAte selectElement: HTMLSelectElement;
	privAte contAiner?: HTMLElement;
	privAte options: ISelectOptionItem[] = [];
	privAte selected: number;
	privAte reAdonly _onDidSelect: Emitter<ISelectDAtA>;
	privAte styles: ISelectBoxStyles;
	privAte listRenderer!: SelectListRenderer;
	privAte contextViewProvider!: IContextViewProvider;
	privAte selectDropDownContAiner!: HTMLElement;
	privAte styleElement!: HTMLStyleElement;
	privAte selectList!: List<ISelectOptionItem>;
	privAte selectDropDownListContAiner!: HTMLElement;
	privAte widthControlElement!: HTMLElement;
	privAte _currentSelection = 0;
	privAte _dropDownPosition!: AnchorPosition;
	privAte _hAsDetAils: booleAn = fAlse;
	privAte selectionDetAilsPAne!: HTMLElement;
	privAte _skipLAyout: booleAn = fAlse;

	privAte _sticky: booleAn = fAlse; // for dev purposes only

	constructor(options: ISelectOptionItem[], selected: number, contextViewProvider: IContextViewProvider, styles: ISelectBoxStyles, selectBoxOptions?: ISelectBoxOptions) {

		super();
		this._isVisible = fAlse;
		this.selectBoxOptions = selectBoxOptions || Object.creAte(null);

		if (typeof this.selectBoxOptions.minBottomMArgin !== 'number') {
			this.selectBoxOptions.minBottomMArgin = SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN;
		} else if (this.selectBoxOptions.minBottomMArgin < 0) {
			this.selectBoxOptions.minBottomMArgin = 0;
		}

		this.selectElement = document.creAteElement('select');

		// Use custom CSS vArs for pAdding cAlculAtion
		this.selectElement.clAssNAme = 'monAco-select-box monAco-select-box-dropdown-pAdding';

		if (typeof this.selectBoxOptions.AriALAbel === 'string') {
			this.selectElement.setAttribute('AriA-lAbel', this.selectBoxOptions.AriALAbel);
		}

		this._onDidSelect = new Emitter<ISelectDAtA>();
		this._register(this._onDidSelect);

		this.styles = styles;

		this.registerListeners();
		this.constructSelectDropDown(contextViewProvider);

		this.selected = selected || 0;

		if (options) {
			this.setOptions(options, selected);
		}

	}

	// IDelegAte - List renderer

	getHeight(): number {
		return 18;
	}

	getTemplAteId(): string {
		return SELECT_OPTION_ENTRY_TEMPLATE_ID;
	}

	privAte constructSelectDropDown(contextViewProvider: IContextViewProvider) {

		// SetUp ContextView contAiner to hold select Dropdown
		this.contextViewProvider = contextViewProvider;
		this.selectDropDownContAiner = dom.$('.monAco-select-box-dropdown-contAiner');
		// Use custom CSS vArs for pAdding cAlculAtion (shAred with pArent select)
		this.selectDropDownContAiner.clAssList.Add('monAco-select-box-dropdown-pAdding');

		// Setup contAiner for select option detAils
		this.selectionDetAilsPAne = dom.Append(this.selectDropDownContAiner, $('.select-box-detAils-pAne'));

		// CreAte spAn flex box item/div we cAn meAsure And control
		let widthControlOuterDiv = dom.Append(this.selectDropDownContAiner, $('.select-box-dropdown-contAiner-width-control'));
		let widthControlInnerDiv = dom.Append(widthControlOuterDiv, $('.width-control-div'));
		this.widthControlElement = document.creAteElement('spAn');
		this.widthControlElement.clAssNAme = 'option-text-width-control';
		dom.Append(widthControlInnerDiv, this.widthControlElement);

		// AlwAys defAult to below position
		this._dropDownPosition = AnchorPosition.BELOW;

		// Inline stylesheet for themes
		this.styleElement = dom.creAteStyleSheet(this.selectDropDownContAiner);
	}

	privAte registerListeners() {

		// PArent nAtive select keyboArd listeners

		this._register(dom.AddStAndArdDisposAbleListener(this.selectElement, 'chAnge', (e) => {
			this.selected = e.tArget.selectedIndex;
			this._onDidSelect.fire({
				index: e.tArget.selectedIndex,
				selected: e.tArget.vAlue
			});
			if (!!this.options[this.selected] && !!this.options[this.selected].text) {
				this.selectElement.title = this.options[this.selected].text;
			}
		}));

		// HAve to implement both keyboArd And mouse controllers to hAndle disAbled options
		// Intercept mouse events to override normAl select Actions on pArents

		this._register(dom.AddDisposAbleListener(this.selectElement, dom.EventType.CLICK, (e) => {
			dom.EventHelper.stop(e);

			if (this._isVisible) {
				this.hideSelectDropDown(true);
			} else {
				this.showSelectDropDown();
			}
		}));

		this._register(dom.AddDisposAbleListener(this.selectElement, dom.EventType.MOUSE_DOWN, (e) => {
			dom.EventHelper.stop(e);
		}));

		// Intercept keyboArd hAndling

		this._register(dom.AddDisposAbleListener(this.selectElement, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => {
			const event = new StAndArdKeyboArdEvent(e);
			let showDropDown = fAlse;

			// CreAte And drop down select list on keyboArd select
			if (isMAcintosh) {
				if (event.keyCode === KeyCode.DownArrow || event.keyCode === KeyCode.UpArrow || event.keyCode === KeyCode.SpAce || event.keyCode === KeyCode.Enter) {
					showDropDown = true;
				}
			} else {
				if (event.keyCode === KeyCode.DownArrow && event.AltKey || event.keyCode === KeyCode.UpArrow && event.AltKey || event.keyCode === KeyCode.SpAce || event.keyCode === KeyCode.Enter) {
					showDropDown = true;
				}
			}

			if (showDropDown) {
				this.showSelectDropDown();
				dom.EventHelper.stop(e, true);
			}
		}));
	}

	public get onDidSelect(): Event<ISelectDAtA> {
		return this._onDidSelect.event;
	}

	public setOptions(options: ISelectOptionItem[], selected?: number): void {
		if (!ArrAys.equAls(this.options, options)) {
			this.options = options;
			this.selectElement.options.length = 0;
			this._hAsDetAils = fAlse;

			this.options.forEAch((option, index) => {
				this.selectElement.Add(this.creAteOption(option.text, index, option.isDisAbled));
				if (typeof option.description === 'string') {
					this._hAsDetAils = true;
				}
			});
		}

		if (selected !== undefined) {
			this.select(selected);
			// Set current = selected since this is not necessArily A user exit
			this._currentSelection = this.selected;
		}
	}


	privAte setOptionsList() {

		// Mirror options in drop-down
		// PopulAte select list for non-nAtive select mode
		if (this.selectList) {
			this.selectList.splice(0, this.selectList.length, this.options);
		}
	}

	public select(index: number): void {

		if (index >= 0 && index < this.options.length) {
			this.selected = index;
		} else if (index > this.options.length - 1) {
			// Adjust index to end of list
			// This could mAke client out of sync with the select
			this.select(this.options.length - 1);
		} else if (this.selected < 0) {
			this.selected = 0;
		}

		this.selectElement.selectedIndex = this.selected;
		if (!!this.options[this.selected] && !!this.options[this.selected].text) {
			this.selectElement.title = this.options[this.selected].text;
		}
	}

	public setAriALAbel(lAbel: string): void {
		this.selectBoxOptions.AriALAbel = lAbel;
		this.selectElement.setAttribute('AriA-lAbel', this.selectBoxOptions.AriALAbel);
	}

	public focus(): void {
		if (this.selectElement) {
			this.selectElement.focus();
		}
	}

	public blur(): void {
		if (this.selectElement) {
			this.selectElement.blur();
		}
	}

	public render(contAiner: HTMLElement): void {
		this.contAiner = contAiner;
		contAiner.clAssList.Add('select-contAiner');
		contAiner.AppendChild(this.selectElement);
		this.ApplyStyles();
	}

	public style(styles: ISelectBoxStyles): void {

		const content: string[] = [];

		this.styles = styles;

		// Style non-nAtive select mode

		if (this.styles.listFocusBAckground) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.focused { bAckground-color: ${this.styles.listFocusBAckground} !importAnt; }`);
		}

		if (this.styles.listFocusForeground) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.focused:not(:hover) { color: ${this.styles.listFocusForeground} !importAnt; }`);
		}

		if (this.styles.decorAtorRightForeground) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row .option-decorAtor-right { color: ${this.styles.decorAtorRightForeground} !importAnt; }`);
		}

		if (this.styles.selectBAckground && this.styles.selectBorder && !this.styles.selectBorder.equAls(this.styles.selectBAckground)) {
			content.push(`.monAco-select-box-dropdown-contAiner { border: 1px solid ${this.styles.selectBorder} } `);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne.border-top { border-top: 1px solid ${this.styles.selectBorder} } `);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne.border-bottom { border-bottom: 1px solid ${this.styles.selectBorder} } `);

		}
		else if (this.styles.selectListBorder) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne.border-top { border-top: 1px solid ${this.styles.selectListBorder} } `);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-detAils-pAne.border-bottom { border-bottom: 1px solid ${this.styles.selectListBorder} } `);
		}

		// Hover foreground - ignore for disAbled options
		if (this.styles.listHoverForeground) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row:hover { color: ${this.styles.listHoverForeground} !importAnt; }`);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.option-disAbled:hover { bAckground-color: ${this.styles.listActiveSelectionForeground} !importAnt; }`);
		}

		// Hover bAckground - ignore for disAbled options
		if (this.styles.listHoverBAckground) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row:not(.option-disAbled):not(.focused):hover { bAckground-color: ${this.styles.listHoverBAckground} !importAnt; }`);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.option-disAbled:hover { bAckground-color: ${this.styles.selectBAckground} !importAnt; }`);
		}

		// MAtch quick input outline styles - ignore for disAbled options
		if (this.styles.listFocusOutline) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.focused { outline: 1.6px dotted ${this.styles.listFocusOutline} !importAnt; outline-offset: -1.6px !importAnt; }`);
		}

		if (this.styles.listHoverOutline) {
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row:hover:not(.focused) { outline: 1.6px dAshed ${this.styles.listHoverOutline} !importAnt; outline-offset: -1.6px !importAnt; }`);
			content.push(`.monAco-select-box-dropdown-contAiner > .select-box-dropdown-list-contAiner .monAco-list .monAco-list-row.option-disAbled:hover { outline: none !importAnt; }`);
		}

		this.styleElement.textContent = content.join('\n');

		this.ApplyStyles();
	}

	public ApplyStyles(): void {

		// Style pArent select

		if (this.selectElement) {
			const bAckground = this.styles.selectBAckground ? this.styles.selectBAckground.toString() : '';
			const foreground = this.styles.selectForeground ? this.styles.selectForeground.toString() : '';
			const border = this.styles.selectBorder ? this.styles.selectBorder.toString() : '';

			this.selectElement.style.bAckgroundColor = bAckground;
			this.selectElement.style.color = foreground;
			this.selectElement.style.borderColor = border;
		}

		// Style drop down select list (non-nAtive mode only)

		if (this.selectList) {
			this.styleList();
		}
	}

	privAte styleList() {
		if (this.selectList) {
			const bAckground = this.styles.selectBAckground ? this.styles.selectBAckground.toString() : '';
			this.selectList.style({});

			const listBAckground = this.styles.selectListBAckground ? this.styles.selectListBAckground.toString() : bAckground;
			this.selectDropDownListContAiner.style.bAckgroundColor = listBAckground;
			this.selectionDetAilsPAne.style.bAckgroundColor = listBAckground;
			const optionsBorder = this.styles.focusBorder ? this.styles.focusBorder.toString() : '';
			this.selectDropDownContAiner.style.outlineColor = optionsBorder;
			this.selectDropDownContAiner.style.outlineOffset = '-1px';
		}
	}

	privAte creAteOption(vAlue: string, index: number, disAbled?: booleAn): HTMLOptionElement {
		let option = document.creAteElement('option');
		option.vAlue = vAlue;
		option.text = vAlue;
		option.disAbled = !!disAbled;

		return option;
	}

	// ContextView dropdown methods

	privAte showSelectDropDown() {
		this.selectionDetAilsPAne.innerText = '';

		if (!this.contextViewProvider || this._isVisible) {
			return;
		}

		// LAzily creAte And populAte list only At open, moved from constructor
		this.creAteSelectList(this.selectDropDownContAiner);
		this.setOptionsList();

		// This Allows us to flip the position bAsed on meAsurement
		// Set drop-down position Above/below from required height And mArgins
		// If pre-lAyout cAnnot fit At leAst one option do not show drop-down

		this.contextViewProvider.showContextView({
			getAnchor: () => this.selectElement,
			render: (contAiner: HTMLElement) => this.renderSelectDropDown(contAiner, true),
			lAyout: () => {
				this.lAyoutSelectDropDown();
			},
			onHide: () => {
				this.selectDropDownContAiner.clAssList.remove('visible');
				this.selectElement.clAssList.remove('synthetic-focus');
			},
			AnchorPosition: this._dropDownPosition
		}, this.selectBoxOptions.optionsAsChildren ? this.contAiner : undefined);

		// Hide so we cAn relAy out
		this._isVisible = true;
		this.hideSelectDropDown(fAlse);

		this.contextViewProvider.showContextView({
			getAnchor: () => this.selectElement,
			render: (contAiner: HTMLElement) => this.renderSelectDropDown(contAiner),
			lAyout: () => this.lAyoutSelectDropDown(),
			onHide: () => {
				this.selectDropDownContAiner.clAssList.remove('visible');
				this.selectElement.clAssList.remove('synthetic-focus');
			},
			AnchorPosition: this._dropDownPosition
		}, this.selectBoxOptions.optionsAsChildren ? this.contAiner : undefined);

		// TrAck initiAl selection the cAse user escApe, blur
		this._currentSelection = this.selected;
		this._isVisible = true;
		this.selectElement.setAttribute('AriA-expAnded', 'true');
	}

	privAte hideSelectDropDown(focusSelect: booleAn) {
		if (!this.contextViewProvider || !this._isVisible) {
			return;
		}

		this._isVisible = fAlse;
		this.selectElement.setAttribute('AriA-expAnded', 'fAlse');

		if (focusSelect) {
			this.selectElement.focus();
		}

		this.contextViewProvider.hideContextView();
	}

	privAte renderSelectDropDown(contAiner: HTMLElement, preLAyoutPosition?: booleAn): IDisposAble {
		contAiner.AppendChild(this.selectDropDownContAiner);

		// Pre-LAyout Allows us to chAnge position
		this.lAyoutSelectDropDown(preLAyoutPosition);

		return {
			dispose: () => {
				// contextView will dispose itself if moving from one View to Another
				try {
					contAiner.removeChild(this.selectDropDownContAiner); // remove to tAke out the CSS rules we Add
				}
				cAtch (error) {
					// Ignore, removed AlreAdy by chAnge of focus
				}
			}
		};
	}

	// IterAte over detAiled descriptions, find mAx height
	privAte meAsureMAxDetAilsHeight(): number {
		let mAxDetAilsPAneHeight = 0;
		this.options.forEAch((_option, index) => {
			this.updAteDetAil(index);

			if (this.selectionDetAilsPAne.offsetHeight > mAxDetAilsPAneHeight) {
				mAxDetAilsPAneHeight = this.selectionDetAilsPAne.offsetHeight;
			}
		});

		return mAxDetAilsPAneHeight;
	}

	privAte lAyoutSelectDropDown(preLAyoutPosition?: booleAn): booleAn {

		// Avoid recursion from lAyout cAlled in onListFocus
		if (this._skipLAyout) {
			return fAlse;
		}

		// LAyout ContextView drop down select list And contAiner
		// HAve to mAnAge our verticAl overflow, sizing, position below or Above
		// Position hAs to be determined And set prior to contextView instAntiAtion

		if (this.selectList) {

			// MAke visible to enAble meAsurements
			this.selectDropDownContAiner.clAssList.Add('visible');

			const selectPosition = dom.getDomNodePAgePosition(this.selectElement);
			const styles = getComputedStyle(this.selectElement);
			const verticAlPAdding = pArseFloAt(styles.getPropertyVAlue('--dropdown-pAdding-top')) + pArseFloAt(styles.getPropertyVAlue('--dropdown-pAdding-bottom'));
			const mAxSelectDropDownHeightBelow = (window.innerHeight - selectPosition.top - selectPosition.height - (this.selectBoxOptions.minBottomMArgin || 0));
			const mAxSelectDropDownHeightAbove = (selectPosition.top - SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN);

			// Determine optimAl width - min(longest option), opt(pArent select, excluding mArgins), mAx(ContextView controlled)
			const selectWidth = this.selectElement.offsetWidth;
			const selectMinWidth = this.setWidthControlElement(this.widthControlElement);
			const selectOptimAlWidth = MAth.mAx(selectMinWidth, MAth.round(selectWidth)).toString() + 'px';

			this.selectDropDownContAiner.style.width = selectOptimAlWidth;

			// Get initiAl list height And determine spAce Above And below
			this.selectList.getHTMLElement().style.height = '';
			this.selectList.lAyout();
			let listHeight = this.selectList.contentHeight;

			const mAxDetAilsPAneHeight = this._hAsDetAils ? this.meAsureMAxDetAilsHeight() : 0;

			const minRequiredDropDownHeight = listHeight + verticAlPAdding + mAxDetAilsPAneHeight;
			const mAxVisibleOptionsBelow = ((MAth.floor((mAxSelectDropDownHeightBelow - verticAlPAdding - mAxDetAilsPAneHeight) / this.getHeight())));
			const mAxVisibleOptionsAbove = ((MAth.floor((mAxSelectDropDownHeightAbove - verticAlPAdding - mAxDetAilsPAneHeight) / this.getHeight())));

			// If we Are only doing pre-lAyout check/Adjust position only
			// CAlculAte verticAl spAce AvAilAble, flip up if insufficient
			// Use reflected pAdding on pArent select, ContextView style
			// properties not AvAilAble before DOM AttAchment

			if (preLAyoutPosition) {

				// Check if select moved out of viewport , do not open
				// If At leAst one option cAnnot be shown, don't open the drop-down or hide/remove if open

				if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
					|| selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
					|| ((mAxVisibleOptionsBelow < 1) && (mAxVisibleOptionsAbove < 1))) {
					// IndicAte we cAnnot open
					return fAlse;
				}

				// Determine if we hAve to flip up
				// AlwAys show complete list items - never more thAn MAx AvAilAble verticAl height
				if (mAxVisibleOptionsBelow < SelectBoxList.DEFAULT_MINIMUM_VISIBLE_OPTIONS
					&& mAxVisibleOptionsAbove > mAxVisibleOptionsBelow
					&& this.options.length > mAxVisibleOptionsBelow
				) {
					this._dropDownPosition = AnchorPosition.ABOVE;
					this.selectDropDownContAiner.removeChild(this.selectDropDownListContAiner);
					this.selectDropDownContAiner.removeChild(this.selectionDetAilsPAne);
					this.selectDropDownContAiner.AppendChild(this.selectionDetAilsPAne);
					this.selectDropDownContAiner.AppendChild(this.selectDropDownListContAiner);

					this.selectionDetAilsPAne.clAssList.remove('border-top');
					this.selectionDetAilsPAne.clAssList.Add('border-bottom');

				} else {
					this._dropDownPosition = AnchorPosition.BELOW;
					this.selectDropDownContAiner.removeChild(this.selectDropDownListContAiner);
					this.selectDropDownContAiner.removeChild(this.selectionDetAilsPAne);
					this.selectDropDownContAiner.AppendChild(this.selectDropDownListContAiner);
					this.selectDropDownContAiner.AppendChild(this.selectionDetAilsPAne);

					this.selectionDetAilsPAne.clAssList.remove('border-bottom');
					this.selectionDetAilsPAne.clAssList.Add('border-top');
				}
				// Do full lAyout on showSelectDropDown only
				return true;
			}

			// Check if select out of viewport or cutting into stAtus bAr
			if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
				|| selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
				|| (this._dropDownPosition === AnchorPosition.BELOW && mAxVisibleOptionsBelow < 1)
				|| (this._dropDownPosition === AnchorPosition.ABOVE && mAxVisibleOptionsAbove < 1)) {
				// CAnnot properly lAyout, close And hide
				this.hideSelectDropDown(true);
				return fAlse;
			}

			// SetUp list dimensions And lAyout - Account for contAiner pAdding
			// Use position to check Above or below AvAilAble spAce
			if (this._dropDownPosition === AnchorPosition.BELOW) {
				if (this._isVisible && mAxVisibleOptionsBelow + mAxVisibleOptionsAbove < 1) {
					// If drop-down is visible, must be doing A DOM re-lAyout, hide since we don't fit
					// Hide drop-down, hide contextview, focus on pArent select
					this.hideSelectDropDown(true);
					return fAlse;
				}

				// Adjust list height to mAx from select bottom to mArgin (defAult/minBottomMArgin)
				if (minRequiredDropDownHeight > mAxSelectDropDownHeightBelow) {
					listHeight = (mAxVisibleOptionsBelow * this.getHeight());
				}
			} else {
				if (minRequiredDropDownHeight > mAxSelectDropDownHeightAbove) {
					listHeight = (mAxVisibleOptionsAbove * this.getHeight());
				}
			}

			// Set Adjusted list height And relAyout
			this.selectList.lAyout(listHeight);
			this.selectList.domFocus();

			// FinAlly set focus on selected item
			if (this.selectList.length > 0) {
				this.selectList.setFocus([this.selected || 0]);
				this.selectList.reveAl(this.selectList.getFocus()[0] || 0);
			}

			if (this._hAsDetAils) {
				// LeAve the selectDropDownContAiner to size itself According to children (list + detAils) - #57447
				this.selectList.getHTMLElement().style.height = (listHeight + verticAlPAdding) + 'px';
				this.selectDropDownContAiner.style.height = '';
			} else {
				this.selectDropDownContAiner.style.height = (listHeight + verticAlPAdding) + 'px';
			}

			this.updAteDetAil(this.selected);

			this.selectDropDownContAiner.style.width = selectOptimAlWidth;

			// MAintAin focus outline on pArent select As well As list contAiner - tAbindex for focus
			this.selectDropDownListContAiner.setAttribute('tAbindex', '0');
			this.selectElement.clAssList.Add('synthetic-focus');
			this.selectDropDownContAiner.clAssList.Add('synthetic-focus');

			return true;
		} else {
			return fAlse;
		}
	}

	privAte setWidthControlElement(contAiner: HTMLElement): number {
		let elementWidth = 0;

		if (contAiner) {
			let longest = 0;
			let longestLength = 0;

			this.options.forEAch((option, index) => {
				const len = option.text.length + (!!option.decorAtorRight ? option.decorAtorRight.length : 0);
				if (len > longestLength) {
					longest = index;
					longestLength = len;
				}
			});


			contAiner.textContent = this.options[longest].text + (!!this.options[longest].decorAtorRight ? (this.options[longest].decorAtorRight + ' ') : '');
			elementWidth = dom.getTotAlWidth(contAiner);
		}

		return elementWidth;
	}

	privAte creAteSelectList(pArent: HTMLElement): void {

		// If we hAve AlreAdy constructive list on open, skip
		if (this.selectList) {
			return;
		}

		// SetUp contAiner for list
		this.selectDropDownListContAiner = dom.Append(pArent, $('.select-box-dropdown-list-contAiner'));

		this.listRenderer = new SelectListRenderer();

		this.selectList = new List('SelectBoxCustom', this.selectDropDownListContAiner, this, [this.listRenderer], {
			useShAdows: fAlse,
			verticAlScrollMode: ScrollbArVisibility.Visible,
			keyboArdSupport: fAlse,
			mouseSupport: fAlse,
			AccessibilityProvider: {
				getAriALAbel: element => {
					let lAbel = element.text;
					if (element.decorAtorRight) {
						lAbel += `. ${element.decorAtorRight}`;
					}

					if (element.description) {
						lAbel += `. ${element.description}`;
					}

					return lAbel;
				},
				getWidgetAriALAbel: () => locAlize({ key: 'selectBox', comment: ['BehAve like nAtive select dropdown element.'] }, "Select Box"),
				getRole: () => 'option',
				getWidgetRole: () => 'listbox'
			}
		});
		if (this.selectBoxOptions.AriALAbel) {
			this.selectList.AriALAbel = this.selectBoxOptions.AriALAbel;
		}

		// SetUp list keyboArd controller - control nAvigAtion, disAbled items, focus
		const onSelectDropDownKeyDown = Event.chAin(domEvent(this.selectDropDownListContAiner, 'keydown'))
			.filter(() => this.selectList.length > 0)
			.mAp(e => new StAndArdKeyboArdEvent(e));

		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.Enter).on(e => this.onEnter(e), this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.EscApe).on(e => this.onEscApe(e), this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.UpArrow).on(this.onUpArrow, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.DownArrow).on(this.onDownArrow, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.PAgeDown).on(this.onPAgeDown, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.PAgeUp).on(this.onPAgeUp, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.Home).on(this.onHome, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.End).on(this.onEnd, this));
		this._register(onSelectDropDownKeyDown.filter(e => (e.keyCode >= KeyCode.KEY_0 && e.keyCode <= KeyCode.KEY_Z) || (e.keyCode >= KeyCode.US_SEMICOLON && e.keyCode <= KeyCode.NUMPAD_DIVIDE)).on(this.onChArActer, this));

		// SetUp list mouse controller - control nAvigAtion, disAbled items, focus

		this._register(Event.chAin(domEvent(this.selectList.getHTMLElement(), 'mouseup'))
			.filter(() => this.selectList.length > 0)
			.on(e => this.onMouseUp(e), this));

		this._register(this.selectList.onMouseOver(e => typeof e.index !== 'undefined' && this.selectList.setFocus([e.index])));
		this._register(this.selectList.onDidChAngeFocus(e => this.onListFocus(e)));

		this._register(dom.AddDisposAbleListener(this.selectDropDownContAiner, dom.EventType.FOCUS_OUT, e => {
			if (!this._isVisible || dom.isAncestor(e.relAtedTArget As HTMLElement, this.selectDropDownContAiner)) {
				return;
			}
			this.onListBlur();
		}));

		this.selectList.getHTMLElement().setAttribute('AriA-lAbel', this.selectBoxOptions.AriALAbel || '');
		this.selectList.getHTMLElement().setAttribute('AriA-expAnded', 'true');

		this.styleList();
	}

	// List methods

	// List mouse controller - Active exit, select option, fire onDidSelect if chAnge, return focus to pArent select
	privAte onMouseUp(e: MouseEvent): void {

		dom.EventHelper.stop(e);

		const tArget = <Element>e.tArget;
		if (!tArget) {
			return;
		}

		// Check our mouse event is on An option (not scrollbAr)
		if (!!tArget.clAssList.contAins('slider')) {
			return;
		}

		const listRowElement = tArget.closest('.monAco-list-row');

		if (!listRowElement) {
			return;
		}
		const index = Number(listRowElement.getAttribute('dAtA-index'));
		const disAbled = listRowElement.clAssList.contAins('option-disAbled');

		// Ignore mouse selection of disAbled options
		if (index >= 0 && index < this.options.length && !disAbled) {
			this.selected = index;
			this.select(this.selected);

			this.selectList.setFocus([this.selected]);
			this.selectList.reveAl(this.selectList.getFocus()[0]);

			// Only fire if selection chAnge
			if (this.selected !== this._currentSelection) {
				// Set current = selected
				this._currentSelection = this.selected;

				this._onDidSelect.fire({
					index: this.selectElement.selectedIndex,
					selected: this.options[this.selected].text

				});
				if (!!this.options[this.selected] && !!this.options[this.selected].text) {
					this.selectElement.title = this.options[this.selected].text;
				}
			}

			this.hideSelectDropDown(true);
		}
	}

	// List Exit - pAssive - implicit no selection chAnge, hide drop-down
	privAte onListBlur(): void {
		if (this._sticky) { return; }
		if (this.selected !== this._currentSelection) {
			// Reset selected to current if no chAnge
			this.select(this._currentSelection);
		}

		this.hideSelectDropDown(fAlse);
	}


	privAte renderDescriptionMArkdown(text: string, ActionHAndler?: IContentActionHAndler): HTMLElement {
		const cleAnRenderedMArkdown = (element: Node) => {
			for (let i = 0; i < element.childNodes.length; i++) {
				const child = <Element>element.childNodes.item(i);

				const tAgNAme = child.tAgNAme && child.tAgNAme.toLowerCAse();
				if (tAgNAme === 'img') {
					element.removeChild(child);
				} else {
					cleAnRenderedMArkdown(child);
				}
			}
		};

		const renderedMArkdown = renderMArkdown({ vAlue: text }, { ActionHAndler });

		renderedMArkdown.clAssList.Add('select-box-description-mArkdown');
		cleAnRenderedMArkdown(renderedMArkdown);

		return renderedMArkdown;
	}

	// List Focus ChAnge - pAssive - updAte detAils pAne with newly focused element's dAtA
	privAte onListFocus(e: IListEvent<ISelectOptionItem>) {
		// Skip during initiAl lAyout
		if (!this._isVisible || !this._hAsDetAils) {
			return;
		}

		this.updAteDetAil(e.indexes[0]);
	}

	privAte updAteDetAil(selectedIndex: number): void {
		this.selectionDetAilsPAne.innerText = '';
		const description = this.options[selectedIndex].description;
		const descriptionIsMArkdown = this.options[selectedIndex].descriptionIsMArkdown;

		if (description) {
			if (descriptionIsMArkdown) {
				const ActionHAndler = this.options[selectedIndex].descriptionMArkdownActionHAndler;
				this.selectionDetAilsPAne.AppendChild(this.renderDescriptionMArkdown(description, ActionHAndler));
			} else {
				this.selectionDetAilsPAne.innerText = description;
			}
			this.selectionDetAilsPAne.style.displAy = 'block';
		} else {
			this.selectionDetAilsPAne.style.displAy = 'none';
		}

		// Avoid recursion
		this._skipLAyout = true;
		this.contextViewProvider.lAyout();
		this._skipLAyout = fAlse;
	}

	// List keyboArd controller

	// List exit - Active - hide ContextView dropdown, reset selection, return focus to pArent select
	privAte onEscApe(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		// Reset selection to vAlue when opened
		this.select(this._currentSelection);
		this.hideSelectDropDown(true);
	}

	// List exit - Active - hide ContextView dropdown, return focus to pArent select, fire onDidSelect if chAnge
	privAte onEnter(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		// Only fire if selection chAnge
		if (this.selected !== this._currentSelection) {
			this._currentSelection = this.selected;
			this._onDidSelect.fire({
				index: this.selectElement.selectedIndex,
				selected: this.options[this.selected].text
			});
			if (!!this.options[this.selected] && !!this.options[this.selected].text) {
				this.selectElement.title = this.options[this.selected].text;
			}
		}

		this.hideSelectDropDown(true);
	}

	// List nAvigAtion - hAve to hAndle A disAbled option (jump over)
	privAte onDownArrow(): void {
		if (this.selected < this.options.length - 1) {

			// Skip disAbled options
			const nextOptionDisAbled = this.options[this.selected + 1].isDisAbled;

			if (nextOptionDisAbled && this.options.length > this.selected + 2) {
				this.selected += 2;
			} else if (nextOptionDisAbled) {
				return;
			} else {
				this.selected++;
			}

			// Set focus/selection - only fire event when closing drop-down or on blur
			this.select(this.selected);
			this.selectList.setFocus([this.selected]);
			this.selectList.reveAl(this.selectList.getFocus()[0]);
		}
	}

	privAte onUpArrow(): void {
		if (this.selected > 0) {
			// Skip disAbled options
			const previousOptionDisAbled = this.options[this.selected - 1].isDisAbled;
			if (previousOptionDisAbled && this.selected > 1) {
				this.selected -= 2;
			} else {
				this.selected--;
			}
			// Set focus/selection - only fire event when closing drop-down or on blur
			this.select(this.selected);
			this.selectList.setFocus([this.selected]);
			this.selectList.reveAl(this.selectList.getFocus()[0]);
		}
	}

	privAte onPAgeUp(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		this.selectList.focusPreviousPAge();

		// Allow scrolling to settle
		setTimeout(() => {
			this.selected = this.selectList.getFocus()[0];

			// Shift selection down if we lAnd on A disAbled option
			if (this.options[this.selected].isDisAbled && this.selected < this.options.length - 1) {
				this.selected++;
				this.selectList.setFocus([this.selected]);
			}
			this.selectList.reveAl(this.selected);
			this.select(this.selected);
		}, 1);
	}

	privAte onPAgeDown(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		this.selectList.focusNextPAge();

		// Allow scrolling to settle
		setTimeout(() => {
			this.selected = this.selectList.getFocus()[0];

			// Shift selection up if we lAnd on A disAbled option
			if (this.options[this.selected].isDisAbled && this.selected > 0) {
				this.selected--;
				this.selectList.setFocus([this.selected]);
			}
			this.selectList.reveAl(this.selected);
			this.select(this.selected);
		}, 1);
	}

	privAte onHome(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		if (this.options.length < 2) {
			return;
		}
		this.selected = 0;
		if (this.options[this.selected].isDisAbled && this.selected > 1) {
			this.selected++;
		}
		this.selectList.setFocus([this.selected]);
		this.selectList.reveAl(this.selected);
		this.select(this.selected);
	}

	privAte onEnd(e: StAndArdKeyboArdEvent): void {
		dom.EventHelper.stop(e);

		if (this.options.length < 2) {
			return;
		}
		this.selected = this.options.length - 1;
		if (this.options[this.selected].isDisAbled && this.selected > 1) {
			this.selected--;
		}
		this.selectList.setFocus([this.selected]);
		this.selectList.reveAl(this.selected);
		this.select(this.selected);
	}

	// Mimic option first chArActer nAvigAtion of nAtive select
	privAte onChArActer(e: StAndArdKeyboArdEvent): void {
		const ch = KeyCodeUtils.toString(e.keyCode);
		let optionIndex = -1;

		for (let i = 0; i < this.options.length - 1; i++) {
			optionIndex = (i + this.selected + 1) % this.options.length;
			if (this.options[optionIndex].text.chArAt(0).toUpperCAse() === ch && !this.options[optionIndex].isDisAbled) {
				this.select(optionIndex);
				this.selectList.setFocus([optionIndex]);
				this.selectList.reveAl(this.selectList.getFocus()[0]);
				dom.EventHelper.stop(e);
				breAk;
			}
		}
	}

	public dispose(): void {
		this.hideSelectDropDown(fAlse);
		super.dispose();
	}
}
