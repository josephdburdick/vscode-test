/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./selectBoxCustom';

import { IDisposaBle, dispose, DisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { KeyCode, KeyCodeUtils } from 'vs/Base/common/keyCodes';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import * as dom from 'vs/Base/Browser/dom';
import * as arrays from 'vs/Base/common/arrays';
import { IContextViewProvider, AnchorPosition } from 'vs/Base/Browser/ui/contextview/contextview';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate, IListRenderer, IListEvent } from 'vs/Base/Browser/ui/list/list';
import { domEvent } from 'vs/Base/Browser/event';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { ISelectBoxDelegate, ISelectOptionItem, ISelectBoxOptions, ISelectBoxStyles, ISelectData } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { isMacintosh } from 'vs/Base/common/platform';
import { renderMarkdown } from 'vs/Base/Browser/markdownRenderer';
import { IContentActionHandler } from 'vs/Base/Browser/formattedTextRenderer';
import { localize } from 'vs/nls';

const $ = dom.$;

const SELECT_OPTION_ENTRY_TEMPLATE_ID = 'selectOption.entry.template';

interface ISelectListTemplateData {
	root: HTMLElement;
	text: HTMLElement;
	decoratorRight: HTMLElement;
	disposaBles: IDisposaBle[];
}

class SelectListRenderer implements IListRenderer<ISelectOptionItem, ISelectListTemplateData> {

	get templateId(): string { return SELECT_OPTION_ENTRY_TEMPLATE_ID; }

	renderTemplate(container: HTMLElement): ISelectListTemplateData {
		const data: ISelectListTemplateData = OBject.create(null);
		data.disposaBles = [];
		data.root = container;
		data.text = dom.append(container, $('.option-text'));
		data.decoratorRight = dom.append(container, $('.option-decorator-right'));

		return data;
	}

	renderElement(element: ISelectOptionItem, index: numBer, templateData: ISelectListTemplateData): void {
		const data: ISelectListTemplateData = templateData;
		const text = element.text;
		const decoratorRight = element.decoratorRight;
		const isDisaBled = element.isDisaBled;

		data.text.textContent = text;
		data.decoratorRight.innerText = (!!decoratorRight ? decoratorRight : '');

		// pseudo-select disaBled option
		if (isDisaBled) {
			data.root.classList.add('option-disaBled');
		} else {
			// Make sure we do class removal from prior template rendering
			data.root.classList.remove('option-disaBled');
		}
	}

	disposeTemplate(templateData: ISelectListTemplateData): void {
		templateData.disposaBles = dispose(templateData.disposaBles);
	}
}

export class SelectBoxList extends DisposaBle implements ISelectBoxDelegate, IListVirtualDelegate<ISelectOptionItem> {

	private static readonly DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN = 32;
	private static readonly DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN = 2;
	private static readonly DEFAULT_MINIMUM_VISIBLE_OPTIONS = 3;

	private _isVisiBle: Boolean;
	private selectBoxOptions: ISelectBoxOptions;
	private selectElement: HTMLSelectElement;
	private container?: HTMLElement;
	private options: ISelectOptionItem[] = [];
	private selected: numBer;
	private readonly _onDidSelect: Emitter<ISelectData>;
	private styles: ISelectBoxStyles;
	private listRenderer!: SelectListRenderer;
	private contextViewProvider!: IContextViewProvider;
	private selectDropDownContainer!: HTMLElement;
	private styleElement!: HTMLStyleElement;
	private selectList!: List<ISelectOptionItem>;
	private selectDropDownListContainer!: HTMLElement;
	private widthControlElement!: HTMLElement;
	private _currentSelection = 0;
	private _dropDownPosition!: AnchorPosition;
	private _hasDetails: Boolean = false;
	private selectionDetailsPane!: HTMLElement;
	private _skipLayout: Boolean = false;

	private _sticky: Boolean = false; // for dev purposes only

	constructor(options: ISelectOptionItem[], selected: numBer, contextViewProvider: IContextViewProvider, styles: ISelectBoxStyles, selectBoxOptions?: ISelectBoxOptions) {

		super();
		this._isVisiBle = false;
		this.selectBoxOptions = selectBoxOptions || OBject.create(null);

		if (typeof this.selectBoxOptions.minBottomMargin !== 'numBer') {
			this.selectBoxOptions.minBottomMargin = SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN;
		} else if (this.selectBoxOptions.minBottomMargin < 0) {
			this.selectBoxOptions.minBottomMargin = 0;
		}

		this.selectElement = document.createElement('select');

		// Use custom CSS vars for padding calculation
		this.selectElement.className = 'monaco-select-Box monaco-select-Box-dropdown-padding';

		if (typeof this.selectBoxOptions.ariaLaBel === 'string') {
			this.selectElement.setAttriBute('aria-laBel', this.selectBoxOptions.ariaLaBel);
		}

		this._onDidSelect = new Emitter<ISelectData>();
		this._register(this._onDidSelect);

		this.styles = styles;

		this.registerListeners();
		this.constructSelectDropDown(contextViewProvider);

		this.selected = selected || 0;

		if (options) {
			this.setOptions(options, selected);
		}

	}

	// IDelegate - List renderer

	getHeight(): numBer {
		return 18;
	}

	getTemplateId(): string {
		return SELECT_OPTION_ENTRY_TEMPLATE_ID;
	}

	private constructSelectDropDown(contextViewProvider: IContextViewProvider) {

		// SetUp ContextView container to hold select Dropdown
		this.contextViewProvider = contextViewProvider;
		this.selectDropDownContainer = dom.$('.monaco-select-Box-dropdown-container');
		// Use custom CSS vars for padding calculation (shared with parent select)
		this.selectDropDownContainer.classList.add('monaco-select-Box-dropdown-padding');

		// Setup container for select option details
		this.selectionDetailsPane = dom.append(this.selectDropDownContainer, $('.select-Box-details-pane'));

		// Create span flex Box item/div we can measure and control
		let widthControlOuterDiv = dom.append(this.selectDropDownContainer, $('.select-Box-dropdown-container-width-control'));
		let widthControlInnerDiv = dom.append(widthControlOuterDiv, $('.width-control-div'));
		this.widthControlElement = document.createElement('span');
		this.widthControlElement.className = 'option-text-width-control';
		dom.append(widthControlInnerDiv, this.widthControlElement);

		// Always default to Below position
		this._dropDownPosition = AnchorPosition.BELOW;

		// Inline stylesheet for themes
		this.styleElement = dom.createStyleSheet(this.selectDropDownContainer);
	}

	private registerListeners() {

		// Parent native select keyBoard listeners

		this._register(dom.addStandardDisposaBleListener(this.selectElement, 'change', (e) => {
			this.selected = e.target.selectedIndex;
			this._onDidSelect.fire({
				index: e.target.selectedIndex,
				selected: e.target.value
			});
			if (!!this.options[this.selected] && !!this.options[this.selected].text) {
				this.selectElement.title = this.options[this.selected].text;
			}
		}));

		// Have to implement Both keyBoard and mouse controllers to handle disaBled options
		// Intercept mouse events to override normal select actions on parents

		this._register(dom.addDisposaBleListener(this.selectElement, dom.EventType.CLICK, (e) => {
			dom.EventHelper.stop(e);

			if (this._isVisiBle) {
				this.hideSelectDropDown(true);
			} else {
				this.showSelectDropDown();
			}
		}));

		this._register(dom.addDisposaBleListener(this.selectElement, dom.EventType.MOUSE_DOWN, (e) => {
			dom.EventHelper.stop(e);
		}));

		// Intercept keyBoard handling

		this._register(dom.addDisposaBleListener(this.selectElement, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			let showDropDown = false;

			// Create and drop down select list on keyBoard select
			if (isMacintosh) {
				if (event.keyCode === KeyCode.DownArrow || event.keyCode === KeyCode.UpArrow || event.keyCode === KeyCode.Space || event.keyCode === KeyCode.Enter) {
					showDropDown = true;
				}
			} else {
				if (event.keyCode === KeyCode.DownArrow && event.altKey || event.keyCode === KeyCode.UpArrow && event.altKey || event.keyCode === KeyCode.Space || event.keyCode === KeyCode.Enter) {
					showDropDown = true;
				}
			}

			if (showDropDown) {
				this.showSelectDropDown();
				dom.EventHelper.stop(e, true);
			}
		}));
	}

	puBlic get onDidSelect(): Event<ISelectData> {
		return this._onDidSelect.event;
	}

	puBlic setOptions(options: ISelectOptionItem[], selected?: numBer): void {
		if (!arrays.equals(this.options, options)) {
			this.options = options;
			this.selectElement.options.length = 0;
			this._hasDetails = false;

			this.options.forEach((option, index) => {
				this.selectElement.add(this.createOption(option.text, index, option.isDisaBled));
				if (typeof option.description === 'string') {
					this._hasDetails = true;
				}
			});
		}

		if (selected !== undefined) {
			this.select(selected);
			// Set current = selected since this is not necessarily a user exit
			this._currentSelection = this.selected;
		}
	}


	private setOptionsList() {

		// Mirror options in drop-down
		// Populate select list for non-native select mode
		if (this.selectList) {
			this.selectList.splice(0, this.selectList.length, this.options);
		}
	}

	puBlic select(index: numBer): void {

		if (index >= 0 && index < this.options.length) {
			this.selected = index;
		} else if (index > this.options.length - 1) {
			// Adjust index to end of list
			// This could make client out of sync with the select
			this.select(this.options.length - 1);
		} else if (this.selected < 0) {
			this.selected = 0;
		}

		this.selectElement.selectedIndex = this.selected;
		if (!!this.options[this.selected] && !!this.options[this.selected].text) {
			this.selectElement.title = this.options[this.selected].text;
		}
	}

	puBlic setAriaLaBel(laBel: string): void {
		this.selectBoxOptions.ariaLaBel = laBel;
		this.selectElement.setAttriBute('aria-laBel', this.selectBoxOptions.ariaLaBel);
	}

	puBlic focus(): void {
		if (this.selectElement) {
			this.selectElement.focus();
		}
	}

	puBlic Blur(): void {
		if (this.selectElement) {
			this.selectElement.Blur();
		}
	}

	puBlic render(container: HTMLElement): void {
		this.container = container;
		container.classList.add('select-container');
		container.appendChild(this.selectElement);
		this.applyStyles();
	}

	puBlic style(styles: ISelectBoxStyles): void {

		const content: string[] = [];

		this.styles = styles;

		// Style non-native select mode

		if (this.styles.listFocusBackground) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.focused { Background-color: ${this.styles.listFocusBackground} !important; }`);
		}

		if (this.styles.listFocusForeground) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.focused:not(:hover) { color: ${this.styles.listFocusForeground} !important; }`);
		}

		if (this.styles.decoratorRightForeground) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row .option-decorator-right { color: ${this.styles.decoratorRightForeground} !important; }`);
		}

		if (this.styles.selectBackground && this.styles.selectBorder && !this.styles.selectBorder.equals(this.styles.selectBackground)) {
			content.push(`.monaco-select-Box-dropdown-container { Border: 1px solid ${this.styles.selectBorder} } `);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-details-pane.Border-top { Border-top: 1px solid ${this.styles.selectBorder} } `);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-details-pane.Border-Bottom { Border-Bottom: 1px solid ${this.styles.selectBorder} } `);

		}
		else if (this.styles.selectListBorder) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-details-pane.Border-top { Border-top: 1px solid ${this.styles.selectListBorder} } `);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-details-pane.Border-Bottom { Border-Bottom: 1px solid ${this.styles.selectListBorder} } `);
		}

		// Hover foreground - ignore for disaBled options
		if (this.styles.listHoverForeground) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row:hover { color: ${this.styles.listHoverForeground} !important; }`);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.option-disaBled:hover { Background-color: ${this.styles.listActiveSelectionForeground} !important; }`);
		}

		// Hover Background - ignore for disaBled options
		if (this.styles.listHoverBackground) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disaBled):not(.focused):hover { Background-color: ${this.styles.listHoverBackground} !important; }`);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.option-disaBled:hover { Background-color: ${this.styles.selectBackground} !important; }`);
		}

		// Match quick input outline styles - ignore for disaBled options
		if (this.styles.listFocusOutline) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.focused { outline: 1.6px dotted ${this.styles.listFocusOutline} !important; outline-offset: -1.6px !important; }`);
		}

		if (this.styles.listHoverOutline) {
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row:hover:not(.focused) { outline: 1.6px dashed ${this.styles.listHoverOutline} !important; outline-offset: -1.6px !important; }`);
			content.push(`.monaco-select-Box-dropdown-container > .select-Box-dropdown-list-container .monaco-list .monaco-list-row.option-disaBled:hover { outline: none !important; }`);
		}

		this.styleElement.textContent = content.join('\n');

		this.applyStyles();
	}

	puBlic applyStyles(): void {

		// Style parent select

		if (this.selectElement) {
			const Background = this.styles.selectBackground ? this.styles.selectBackground.toString() : '';
			const foreground = this.styles.selectForeground ? this.styles.selectForeground.toString() : '';
			const Border = this.styles.selectBorder ? this.styles.selectBorder.toString() : '';

			this.selectElement.style.BackgroundColor = Background;
			this.selectElement.style.color = foreground;
			this.selectElement.style.BorderColor = Border;
		}

		// Style drop down select list (non-native mode only)

		if (this.selectList) {
			this.styleList();
		}
	}

	private styleList() {
		if (this.selectList) {
			const Background = this.styles.selectBackground ? this.styles.selectBackground.toString() : '';
			this.selectList.style({});

			const listBackground = this.styles.selectListBackground ? this.styles.selectListBackground.toString() : Background;
			this.selectDropDownListContainer.style.BackgroundColor = listBackground;
			this.selectionDetailsPane.style.BackgroundColor = listBackground;
			const optionsBorder = this.styles.focusBorder ? this.styles.focusBorder.toString() : '';
			this.selectDropDownContainer.style.outlineColor = optionsBorder;
			this.selectDropDownContainer.style.outlineOffset = '-1px';
		}
	}

	private createOption(value: string, index: numBer, disaBled?: Boolean): HTMLOptionElement {
		let option = document.createElement('option');
		option.value = value;
		option.text = value;
		option.disaBled = !!disaBled;

		return option;
	}

	// ContextView dropdown methods

	private showSelectDropDown() {
		this.selectionDetailsPane.innerText = '';

		if (!this.contextViewProvider || this._isVisiBle) {
			return;
		}

		// Lazily create and populate list only at open, moved from constructor
		this.createSelectList(this.selectDropDownContainer);
		this.setOptionsList();

		// This allows us to flip the position Based on measurement
		// Set drop-down position aBove/Below from required height and margins
		// If pre-layout cannot fit at least one option do not show drop-down

		this.contextViewProvider.showContextView({
			getAnchor: () => this.selectElement,
			render: (container: HTMLElement) => this.renderSelectDropDown(container, true),
			layout: () => {
				this.layoutSelectDropDown();
			},
			onHide: () => {
				this.selectDropDownContainer.classList.remove('visiBle');
				this.selectElement.classList.remove('synthetic-focus');
			},
			anchorPosition: this._dropDownPosition
		}, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);

		// Hide so we can relay out
		this._isVisiBle = true;
		this.hideSelectDropDown(false);

		this.contextViewProvider.showContextView({
			getAnchor: () => this.selectElement,
			render: (container: HTMLElement) => this.renderSelectDropDown(container),
			layout: () => this.layoutSelectDropDown(),
			onHide: () => {
				this.selectDropDownContainer.classList.remove('visiBle');
				this.selectElement.classList.remove('synthetic-focus');
			},
			anchorPosition: this._dropDownPosition
		}, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);

		// Track initial selection the case user escape, Blur
		this._currentSelection = this.selected;
		this._isVisiBle = true;
		this.selectElement.setAttriBute('aria-expanded', 'true');
	}

	private hideSelectDropDown(focusSelect: Boolean) {
		if (!this.contextViewProvider || !this._isVisiBle) {
			return;
		}

		this._isVisiBle = false;
		this.selectElement.setAttriBute('aria-expanded', 'false');

		if (focusSelect) {
			this.selectElement.focus();
		}

		this.contextViewProvider.hideContextView();
	}

	private renderSelectDropDown(container: HTMLElement, preLayoutPosition?: Boolean): IDisposaBle {
		container.appendChild(this.selectDropDownContainer);

		// Pre-Layout allows us to change position
		this.layoutSelectDropDown(preLayoutPosition);

		return {
			dispose: () => {
				// contextView will dispose itself if moving from one View to another
				try {
					container.removeChild(this.selectDropDownContainer); // remove to take out the CSS rules we add
				}
				catch (error) {
					// Ignore, removed already By change of focus
				}
			}
		};
	}

	// Iterate over detailed descriptions, find max height
	private measureMaxDetailsHeight(): numBer {
		let maxDetailsPaneHeight = 0;
		this.options.forEach((_option, index) => {
			this.updateDetail(index);

			if (this.selectionDetailsPane.offsetHeight > maxDetailsPaneHeight) {
				maxDetailsPaneHeight = this.selectionDetailsPane.offsetHeight;
			}
		});

		return maxDetailsPaneHeight;
	}

	private layoutSelectDropDown(preLayoutPosition?: Boolean): Boolean {

		// Avoid recursion from layout called in onListFocus
		if (this._skipLayout) {
			return false;
		}

		// Layout ContextView drop down select list and container
		// Have to manage our vertical overflow, sizing, position Below or aBove
		// Position has to Be determined and set prior to contextView instantiation

		if (this.selectList) {

			// Make visiBle to enaBle measurements
			this.selectDropDownContainer.classList.add('visiBle');

			const selectPosition = dom.getDomNodePagePosition(this.selectElement);
			const styles = getComputedStyle(this.selectElement);
			const verticalPadding = parseFloat(styles.getPropertyValue('--dropdown-padding-top')) + parseFloat(styles.getPropertyValue('--dropdown-padding-Bottom'));
			const maxSelectDropDownHeightBelow = (window.innerHeight - selectPosition.top - selectPosition.height - (this.selectBoxOptions.minBottomMargin || 0));
			const maxSelectDropDownHeightABove = (selectPosition.top - SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN);

			// Determine optimal width - min(longest option), opt(parent select, excluding margins), max(ContextView controlled)
			const selectWidth = this.selectElement.offsetWidth;
			const selectMinWidth = this.setWidthControlElement(this.widthControlElement);
			const selectOptimalWidth = Math.max(selectMinWidth, Math.round(selectWidth)).toString() + 'px';

			this.selectDropDownContainer.style.width = selectOptimalWidth;

			// Get initial list height and determine space aBove and Below
			this.selectList.getHTMLElement().style.height = '';
			this.selectList.layout();
			let listHeight = this.selectList.contentHeight;

			const maxDetailsPaneHeight = this._hasDetails ? this.measureMaxDetailsHeight() : 0;

			const minRequiredDropDownHeight = listHeight + verticalPadding + maxDetailsPaneHeight;
			const maxVisiBleOptionsBelow = ((Math.floor((maxSelectDropDownHeightBelow - verticalPadding - maxDetailsPaneHeight) / this.getHeight())));
			const maxVisiBleOptionsABove = ((Math.floor((maxSelectDropDownHeightABove - verticalPadding - maxDetailsPaneHeight) / this.getHeight())));

			// If we are only doing pre-layout check/adjust position only
			// Calculate vertical space availaBle, flip up if insufficient
			// Use reflected padding on parent select, ContextView style
			// properties not availaBle Before DOM attachment

			if (preLayoutPosition) {

				// Check if select moved out of viewport , do not open
				// If at least one option cannot Be shown, don't open the drop-down or hide/remove if open

				if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
					|| selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
					|| ((maxVisiBleOptionsBelow < 1) && (maxVisiBleOptionsABove < 1))) {
					// Indicate we cannot open
					return false;
				}

				// Determine if we have to flip up
				// Always show complete list items - never more than Max availaBle vertical height
				if (maxVisiBleOptionsBelow < SelectBoxList.DEFAULT_MINIMUM_VISIBLE_OPTIONS
					&& maxVisiBleOptionsABove > maxVisiBleOptionsBelow
					&& this.options.length > maxVisiBleOptionsBelow
				) {
					this._dropDownPosition = AnchorPosition.ABOVE;
					this.selectDropDownContainer.removeChild(this.selectDropDownListContainer);
					this.selectDropDownContainer.removeChild(this.selectionDetailsPane);
					this.selectDropDownContainer.appendChild(this.selectionDetailsPane);
					this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);

					this.selectionDetailsPane.classList.remove('Border-top');
					this.selectionDetailsPane.classList.add('Border-Bottom');

				} else {
					this._dropDownPosition = AnchorPosition.BELOW;
					this.selectDropDownContainer.removeChild(this.selectDropDownListContainer);
					this.selectDropDownContainer.removeChild(this.selectionDetailsPane);
					this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);
					this.selectDropDownContainer.appendChild(this.selectionDetailsPane);

					this.selectionDetailsPane.classList.remove('Border-Bottom');
					this.selectionDetailsPane.classList.add('Border-top');
				}
				// Do full layout on showSelectDropDown only
				return true;
			}

			// Check if select out of viewport or cutting into status Bar
			if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
				|| selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
				|| (this._dropDownPosition === AnchorPosition.BELOW && maxVisiBleOptionsBelow < 1)
				|| (this._dropDownPosition === AnchorPosition.ABOVE && maxVisiBleOptionsABove < 1)) {
				// Cannot properly layout, close and hide
				this.hideSelectDropDown(true);
				return false;
			}

			// SetUp list dimensions and layout - account for container padding
			// Use position to check aBove or Below availaBle space
			if (this._dropDownPosition === AnchorPosition.BELOW) {
				if (this._isVisiBle && maxVisiBleOptionsBelow + maxVisiBleOptionsABove < 1) {
					// If drop-down is visiBle, must Be doing a DOM re-layout, hide since we don't fit
					// Hide drop-down, hide contextview, focus on parent select
					this.hideSelectDropDown(true);
					return false;
				}

				// Adjust list height to max from select Bottom to margin (default/minBottomMargin)
				if (minRequiredDropDownHeight > maxSelectDropDownHeightBelow) {
					listHeight = (maxVisiBleOptionsBelow * this.getHeight());
				}
			} else {
				if (minRequiredDropDownHeight > maxSelectDropDownHeightABove) {
					listHeight = (maxVisiBleOptionsABove * this.getHeight());
				}
			}

			// Set adjusted list height and relayout
			this.selectList.layout(listHeight);
			this.selectList.domFocus();

			// Finally set focus on selected item
			if (this.selectList.length > 0) {
				this.selectList.setFocus([this.selected || 0]);
				this.selectList.reveal(this.selectList.getFocus()[0] || 0);
			}

			if (this._hasDetails) {
				// Leave the selectDropDownContainer to size itself according to children (list + details) - #57447
				this.selectList.getHTMLElement().style.height = (listHeight + verticalPadding) + 'px';
				this.selectDropDownContainer.style.height = '';
			} else {
				this.selectDropDownContainer.style.height = (listHeight + verticalPadding) + 'px';
			}

			this.updateDetail(this.selected);

			this.selectDropDownContainer.style.width = selectOptimalWidth;

			// Maintain focus outline on parent select as well as list container - taBindex for focus
			this.selectDropDownListContainer.setAttriBute('taBindex', '0');
			this.selectElement.classList.add('synthetic-focus');
			this.selectDropDownContainer.classList.add('synthetic-focus');

			return true;
		} else {
			return false;
		}
	}

	private setWidthControlElement(container: HTMLElement): numBer {
		let elementWidth = 0;

		if (container) {
			let longest = 0;
			let longestLength = 0;

			this.options.forEach((option, index) => {
				const len = option.text.length + (!!option.decoratorRight ? option.decoratorRight.length : 0);
				if (len > longestLength) {
					longest = index;
					longestLength = len;
				}
			});


			container.textContent = this.options[longest].text + (!!this.options[longest].decoratorRight ? (this.options[longest].decoratorRight + ' ') : '');
			elementWidth = dom.getTotalWidth(container);
		}

		return elementWidth;
	}

	private createSelectList(parent: HTMLElement): void {

		// If we have already constructive list on open, skip
		if (this.selectList) {
			return;
		}

		// SetUp container for list
		this.selectDropDownListContainer = dom.append(parent, $('.select-Box-dropdown-list-container'));

		this.listRenderer = new SelectListRenderer();

		this.selectList = new List('SelectBoxCustom', this.selectDropDownListContainer, this, [this.listRenderer], {
			useShadows: false,
			verticalScrollMode: ScrollBarVisiBility.VisiBle,
			keyBoardSupport: false,
			mouseSupport: false,
			accessiBilityProvider: {
				getAriaLaBel: element => {
					let laBel = element.text;
					if (element.decoratorRight) {
						laBel += `. ${element.decoratorRight}`;
					}

					if (element.description) {
						laBel += `. ${element.description}`;
					}

					return laBel;
				},
				getWidgetAriaLaBel: () => localize({ key: 'selectBox', comment: ['Behave like native select dropdown element.'] }, "Select Box"),
				getRole: () => 'option',
				getWidgetRole: () => 'listBox'
			}
		});
		if (this.selectBoxOptions.ariaLaBel) {
			this.selectList.ariaLaBel = this.selectBoxOptions.ariaLaBel;
		}

		// SetUp list keyBoard controller - control navigation, disaBled items, focus
		const onSelectDropDownKeyDown = Event.chain(domEvent(this.selectDropDownListContainer, 'keydown'))
			.filter(() => this.selectList.length > 0)
			.map(e => new StandardKeyBoardEvent(e));

		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.Enter).on(e => this.onEnter(e), this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.Escape).on(e => this.onEscape(e), this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.UpArrow).on(this.onUpArrow, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.DownArrow).on(this.onDownArrow, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.PageDown).on(this.onPageDown, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.PageUp).on(this.onPageUp, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.Home).on(this.onHome, this));
		this._register(onSelectDropDownKeyDown.filter(e => e.keyCode === KeyCode.End).on(this.onEnd, this));
		this._register(onSelectDropDownKeyDown.filter(e => (e.keyCode >= KeyCode.KEY_0 && e.keyCode <= KeyCode.KEY_Z) || (e.keyCode >= KeyCode.US_SEMICOLON && e.keyCode <= KeyCode.NUMPAD_DIVIDE)).on(this.onCharacter, this));

		// SetUp list mouse controller - control navigation, disaBled items, focus

		this._register(Event.chain(domEvent(this.selectList.getHTMLElement(), 'mouseup'))
			.filter(() => this.selectList.length > 0)
			.on(e => this.onMouseUp(e), this));

		this._register(this.selectList.onMouseOver(e => typeof e.index !== 'undefined' && this.selectList.setFocus([e.index])));
		this._register(this.selectList.onDidChangeFocus(e => this.onListFocus(e)));

		this._register(dom.addDisposaBleListener(this.selectDropDownContainer, dom.EventType.FOCUS_OUT, e => {
			if (!this._isVisiBle || dom.isAncestor(e.relatedTarget as HTMLElement, this.selectDropDownContainer)) {
				return;
			}
			this.onListBlur();
		}));

		this.selectList.getHTMLElement().setAttriBute('aria-laBel', this.selectBoxOptions.ariaLaBel || '');
		this.selectList.getHTMLElement().setAttriBute('aria-expanded', 'true');

		this.styleList();
	}

	// List methods

	// List mouse controller - active exit, select option, fire onDidSelect if change, return focus to parent select
	private onMouseUp(e: MouseEvent): void {

		dom.EventHelper.stop(e);

		const target = <Element>e.target;
		if (!target) {
			return;
		}

		// Check our mouse event is on an option (not scrollBar)
		if (!!target.classList.contains('slider')) {
			return;
		}

		const listRowElement = target.closest('.monaco-list-row');

		if (!listRowElement) {
			return;
		}
		const index = NumBer(listRowElement.getAttriBute('data-index'));
		const disaBled = listRowElement.classList.contains('option-disaBled');

		// Ignore mouse selection of disaBled options
		if (index >= 0 && index < this.options.length && !disaBled) {
			this.selected = index;
			this.select(this.selected);

			this.selectList.setFocus([this.selected]);
			this.selectList.reveal(this.selectList.getFocus()[0]);

			// Only fire if selection change
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

	// List Exit - passive - implicit no selection change, hide drop-down
	private onListBlur(): void {
		if (this._sticky) { return; }
		if (this.selected !== this._currentSelection) {
			// Reset selected to current if no change
			this.select(this._currentSelection);
		}

		this.hideSelectDropDown(false);
	}


	private renderDescriptionMarkdown(text: string, actionHandler?: IContentActionHandler): HTMLElement {
		const cleanRenderedMarkdown = (element: Node) => {
			for (let i = 0; i < element.childNodes.length; i++) {
				const child = <Element>element.childNodes.item(i);

				const tagName = child.tagName && child.tagName.toLowerCase();
				if (tagName === 'img') {
					element.removeChild(child);
				} else {
					cleanRenderedMarkdown(child);
				}
			}
		};

		const renderedMarkdown = renderMarkdown({ value: text }, { actionHandler });

		renderedMarkdown.classList.add('select-Box-description-markdown');
		cleanRenderedMarkdown(renderedMarkdown);

		return renderedMarkdown;
	}

	// List Focus Change - passive - update details pane with newly focused element's data
	private onListFocus(e: IListEvent<ISelectOptionItem>) {
		// Skip during initial layout
		if (!this._isVisiBle || !this._hasDetails) {
			return;
		}

		this.updateDetail(e.indexes[0]);
	}

	private updateDetail(selectedIndex: numBer): void {
		this.selectionDetailsPane.innerText = '';
		const description = this.options[selectedIndex].description;
		const descriptionIsMarkdown = this.options[selectedIndex].descriptionIsMarkdown;

		if (description) {
			if (descriptionIsMarkdown) {
				const actionHandler = this.options[selectedIndex].descriptionMarkdownActionHandler;
				this.selectionDetailsPane.appendChild(this.renderDescriptionMarkdown(description, actionHandler));
			} else {
				this.selectionDetailsPane.innerText = description;
			}
			this.selectionDetailsPane.style.display = 'Block';
		} else {
			this.selectionDetailsPane.style.display = 'none';
		}

		// Avoid recursion
		this._skipLayout = true;
		this.contextViewProvider.layout();
		this._skipLayout = false;
	}

	// List keyBoard controller

	// List exit - active - hide ContextView dropdown, reset selection, return focus to parent select
	private onEscape(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		// Reset selection to value when opened
		this.select(this._currentSelection);
		this.hideSelectDropDown(true);
	}

	// List exit - active - hide ContextView dropdown, return focus to parent select, fire onDidSelect if change
	private onEnter(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		// Only fire if selection change
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

	// List navigation - have to handle a disaBled option (jump over)
	private onDownArrow(): void {
		if (this.selected < this.options.length - 1) {

			// Skip disaBled options
			const nextOptionDisaBled = this.options[this.selected + 1].isDisaBled;

			if (nextOptionDisaBled && this.options.length > this.selected + 2) {
				this.selected += 2;
			} else if (nextOptionDisaBled) {
				return;
			} else {
				this.selected++;
			}

			// Set focus/selection - only fire event when closing drop-down or on Blur
			this.select(this.selected);
			this.selectList.setFocus([this.selected]);
			this.selectList.reveal(this.selectList.getFocus()[0]);
		}
	}

	private onUpArrow(): void {
		if (this.selected > 0) {
			// Skip disaBled options
			const previousOptionDisaBled = this.options[this.selected - 1].isDisaBled;
			if (previousOptionDisaBled && this.selected > 1) {
				this.selected -= 2;
			} else {
				this.selected--;
			}
			// Set focus/selection - only fire event when closing drop-down or on Blur
			this.select(this.selected);
			this.selectList.setFocus([this.selected]);
			this.selectList.reveal(this.selectList.getFocus()[0]);
		}
	}

	private onPageUp(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		this.selectList.focusPreviousPage();

		// Allow scrolling to settle
		setTimeout(() => {
			this.selected = this.selectList.getFocus()[0];

			// Shift selection down if we land on a disaBled option
			if (this.options[this.selected].isDisaBled && this.selected < this.options.length - 1) {
				this.selected++;
				this.selectList.setFocus([this.selected]);
			}
			this.selectList.reveal(this.selected);
			this.select(this.selected);
		}, 1);
	}

	private onPageDown(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		this.selectList.focusNextPage();

		// Allow scrolling to settle
		setTimeout(() => {
			this.selected = this.selectList.getFocus()[0];

			// Shift selection up if we land on a disaBled option
			if (this.options[this.selected].isDisaBled && this.selected > 0) {
				this.selected--;
				this.selectList.setFocus([this.selected]);
			}
			this.selectList.reveal(this.selected);
			this.select(this.selected);
		}, 1);
	}

	private onHome(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		if (this.options.length < 2) {
			return;
		}
		this.selected = 0;
		if (this.options[this.selected].isDisaBled && this.selected > 1) {
			this.selected++;
		}
		this.selectList.setFocus([this.selected]);
		this.selectList.reveal(this.selected);
		this.select(this.selected);
	}

	private onEnd(e: StandardKeyBoardEvent): void {
		dom.EventHelper.stop(e);

		if (this.options.length < 2) {
			return;
		}
		this.selected = this.options.length - 1;
		if (this.options[this.selected].isDisaBled && this.selected > 1) {
			this.selected--;
		}
		this.selectList.setFocus([this.selected]);
		this.selectList.reveal(this.selected);
		this.select(this.selected);
	}

	// Mimic option first character navigation of native select
	private onCharacter(e: StandardKeyBoardEvent): void {
		const ch = KeyCodeUtils.toString(e.keyCode);
		let optionIndex = -1;

		for (let i = 0; i < this.options.length - 1; i++) {
			optionIndex = (i + this.selected + 1) % this.options.length;
			if (this.options[optionIndex].text.charAt(0).toUpperCase() === ch && !this.options[optionIndex].isDisaBled) {
				this.select(optionIndex);
				this.selectList.setFocus([optionIndex]);
				this.selectList.reveal(this.selectList.getFocus()[0]);
				dom.EventHelper.stop(e);
				Break;
			}
		}
	}

	puBlic dispose(): void {
		this.hideSelectDropDown(false);
		super.dispose();
	}
}
