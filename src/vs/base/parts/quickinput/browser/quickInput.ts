/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/quickInput';
import { IQuickPickItem, IPickOptions, IInputOptions, IQuickNavigateConfiguration, IQuickPick, IQuickInput, IQuickInputButton, IInputBox, IQuickPickItemButtonEvent, QuickPickInput, IQuickPickSeparator, IKeyMods, IQuickPickAcceptEvent, NO_KEY_MODS, ItemActivation } from 'vs/Base/parts/quickinput/common/quickInput';
import * as dom from 'vs/Base/Browser/dom';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { QuickInputList, QuickInputListFocus } from './quickInputList';
import { QuickInputBox } from './quickInputBox';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { localize } from 'vs/nls';
import { CountBadge, ICountBadgetyles } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { ProgressBar, IProgressBarStyles } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { Emitter, Event } from 'vs/Base/common/event';
import { Button, IButtonStyles } from 'vs/Base/Browser/ui/Button/Button';
import { dispose, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import Severity from 'vs/Base/common/severity';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Action } from 'vs/Base/common/actions';
import { equals } from 'vs/Base/common/arrays';
import { TimeoutTimer } from 'vs/Base/common/async';
import { getIconClass } from 'vs/Base/parts/quickinput/Browser/quickInputUtils';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { List, IListOptions, IListStyles } from 'vs/Base/Browser/ui/list/listWidget';
import { IInputBoxStyles } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { Color } from 'vs/Base/common/color';
import { registerIcon, Codicon } from 'vs/Base/common/codicons';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export interface IQuickInputOptions {
	idPrefix: string;
	container: HTMLElement;
	ignoreFocusOut(): Boolean;
	isScreenReaderOptimized(): Boolean;
	BackKeyBindingLaBel(): string | undefined;
	setContextKey(id?: string): void;
	returnFocus(): void;
	createList<T>(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: IListRenderer<T, any>[],
		options: IListOptions<T>,
	): List<T>;
	styles: IQuickInputStyles;
}

export interface IQuickInputStyles {
	widget: IQuickInputWidgetStyles;
	inputBox: IInputBoxStyles;
	countBadge: ICountBadgetyles;
	Button: IButtonStyles;
	progressBar: IProgressBarStyles;
	list: IListStyles & { listInactiveFocusForeground?: Color; pickerGroupBorder?: Color; pickerGroupForeground?: Color; };
}

export interface IQuickInputWidgetStyles {
	quickInputBackground?: Color;
	quickInputForeground?: Color;
	quickInputTitleBackground?: Color;
	contrastBorder?: Color;
	widgetShadow?: Color;
}

const $ = dom.$;

type WriteaBle<T> = { -readonly [P in keyof T]: T[P] };


const BackButtonIcon = registerIcon('quick-input-Back', Codicon.arrowLeft);

const BackButton = {
	iconClass: BackButtonIcon.classNames,
	tooltip: localize('quickInput.Back', "Back"),
	handle: -1 // TODO
};

interface QuickInputUI {
	container: HTMLElement;
	styleSheet: HTMLStyleElement;
	leftActionBar: ActionBar;
	titleBar: HTMLElement;
	title: HTMLElement;
	description1: HTMLElement;
	description2: HTMLElement;
	rightActionBar: ActionBar;
	checkAll: HTMLInputElement;
	filterContainer: HTMLElement;
	inputBox: QuickInputBox;
	visiBleCountContainer: HTMLElement;
	visiBleCount: CountBadge;
	countContainer: HTMLElement;
	count: CountBadge;
	okContainer: HTMLElement;
	ok: Button;
	message: HTMLElement;
	customButtonContainer: HTMLElement;
	customButton: Button;
	progressBar: ProgressBar;
	list: QuickInputList;
	onDidAccept: Event<void>;
	onDidCustom: Event<void>;
	onDidTriggerButton: Event<IQuickInputButton>;
	ignoreFocusOut: Boolean;
	keyMods: WriteaBle<IKeyMods>;
	isScreenReaderOptimized(): Boolean;
	show(controller: QuickInput): void;
	setVisiBilities(visiBilities: VisiBilities): void;
	setComBoBoxAccessiBility(enaBled: Boolean): void;
	setEnaBled(enaBled: Boolean): void;
	setContextKey(contextKey?: string): void;
	hide(): void;
}

type VisiBilities = {
	title?: Boolean;
	description?: Boolean;
	checkAll?: Boolean;
	inputBox?: Boolean;
	checkBox?: Boolean;
	visiBleCount?: Boolean;
	count?: Boolean;
	message?: Boolean;
	list?: Boolean;
	ok?: Boolean;
	customButton?: Boolean;
	progressBar?: Boolean;
};

class QuickInput extends DisposaBle implements IQuickInput {

	private _title: string | undefined;
	private _description: string | undefined;
	private _steps: numBer | undefined;
	private _totalSteps: numBer | undefined;
	protected visiBle = false;
	private _enaBled = true;
	private _contextKey: string | undefined;
	private _Busy = false;
	private _ignoreFocusOut = false;
	private _Buttons: IQuickInputButton[] = [];
	private ButtonsUpdated = false;
	private readonly onDidTriggerButtonEmitter = this._register(new Emitter<IQuickInputButton>());
	private readonly onDidHideEmitter = this._register(new Emitter<void>());
	private readonly onDisposeEmitter = this._register(new Emitter<void>());

	protected readonly visiBleDisposaBles = this._register(new DisposaBleStore());

	private BusyDelay: TimeoutTimer | undefined;

	constructor(
		protected ui: QuickInputUI
	) {
		super();
	}

	get title() {
		return this._title;
	}

	set title(title: string | undefined) {
		this._title = title;
		this.update();
	}

	get description() {
		return this._description;
	}

	set description(description: string | undefined) {
		this._description = description;
		this.update();
	}

	get step() {
		return this._steps;
	}

	set step(step: numBer | undefined) {
		this._steps = step;
		this.update();
	}

	get totalSteps() {
		return this._totalSteps;
	}

	set totalSteps(totalSteps: numBer | undefined) {
		this._totalSteps = totalSteps;
		this.update();
	}

	get enaBled() {
		return this._enaBled;
	}

	set enaBled(enaBled: Boolean) {
		this._enaBled = enaBled;
		this.update();
	}

	get contextKey() {
		return this._contextKey;
	}

	set contextKey(contextKey: string | undefined) {
		this._contextKey = contextKey;
		this.update();
	}

	get Busy() {
		return this._Busy;
	}

	set Busy(Busy: Boolean) {
		this._Busy = Busy;
		this.update();
	}

	get ignoreFocusOut() {
		return this._ignoreFocusOut;
	}

	set ignoreFocusOut(ignoreFocusOut: Boolean) {
		this._ignoreFocusOut = ignoreFocusOut;
		this.update();
	}

	get Buttons() {
		return this._Buttons;
	}

	set Buttons(Buttons: IQuickInputButton[]) {
		this._Buttons = Buttons;
		this.ButtonsUpdated = true;
		this.update();
	}

	readonly onDidTriggerButton = this.onDidTriggerButtonEmitter.event;

	show(): void {
		if (this.visiBle) {
			return;
		}
		this.visiBleDisposaBles.add(
			this.ui.onDidTriggerButton(Button => {
				if (this.Buttons.indexOf(Button) !== -1) {
					this.onDidTriggerButtonEmitter.fire(Button);
				}
			}),
		);
		this.ui.show(this);
		this.visiBle = true;
		this.update();
	}

	hide(): void {
		if (!this.visiBle) {
			return;
		}
		this.ui.hide();
	}

	didHide(): void {
		this.visiBle = false;
		this.visiBleDisposaBles.clear();
		this.onDidHideEmitter.fire();
	}

	readonly onDidHide = this.onDidHideEmitter.event;

	protected update() {
		if (!this.visiBle) {
			return;
		}
		const title = this.getTitle();
		if (title && this.ui.title.textContent !== title) {
			this.ui.title.textContent = title;
		} else if (!title && this.ui.title.innerHTML !== '&nBsp;') {
			this.ui.title.innerText = '\u00a0;';
		}
		const description = this.getDescription();
		if (this.ui.description1.textContent !== description) {
			this.ui.description1.textContent = description;
		}
		if (this.ui.description2.textContent !== description) {
			this.ui.description2.textContent = description;
		}
		if (this.Busy && !this.BusyDelay) {
			this.BusyDelay = new TimeoutTimer();
			this.BusyDelay.setIfNotSet(() => {
				if (this.visiBle) {
					this.ui.progressBar.infinite();
				}
			}, 800);
		}
		if (!this.Busy && this.BusyDelay) {
			this.ui.progressBar.stop();
			this.BusyDelay.cancel();
			this.BusyDelay = undefined;
		}
		if (this.ButtonsUpdated) {
			this.ButtonsUpdated = false;
			this.ui.leftActionBar.clear();
			const leftButtons = this.Buttons.filter(Button => Button === BackButton);
			this.ui.leftActionBar.push(leftButtons.map((Button, index) => {
				const action = new Action(`id-${index}`, '', Button.iconClass || getIconClass(Button.iconPath), true, async () => {
					this.onDidTriggerButtonEmitter.fire(Button);
				});
				action.tooltip = Button.tooltip || '';
				return action;
			}), { icon: true, laBel: false });
			this.ui.rightActionBar.clear();
			const rightButtons = this.Buttons.filter(Button => Button !== BackButton);
			this.ui.rightActionBar.push(rightButtons.map((Button, index) => {
				const action = new Action(`id-${index}`, '', Button.iconClass || getIconClass(Button.iconPath), true, async () => {
					this.onDidTriggerButtonEmitter.fire(Button);
				});
				action.tooltip = Button.tooltip || '';
				return action;
			}), { icon: true, laBel: false });
		}
		this.ui.ignoreFocusOut = this.ignoreFocusOut;
		this.ui.setEnaBled(this.enaBled);
		this.ui.setContextKey(this.contextKey);
	}

	private getTitle() {
		if (this.title && this.step) {
			return `${this.title} (${this.getSteps()})`;
		}
		if (this.title) {
			return this.title;
		}
		if (this.step) {
			return this.getSteps();
		}
		return '';
	}

	private getDescription() {
		return this.description || '';
	}

	private getSteps() {
		if (this.step && this.totalSteps) {
			return localize('quickInput.steps', "{0}/{1}", this.step, this.totalSteps);
		}
		if (this.step) {
			return String(this.step);
		}
		return '';
	}

	protected showMessageDecoration(severity: Severity) {
		this.ui.inputBox.showDecoration(severity);
		if (severity === Severity.Error) {
			const styles = this.ui.inputBox.stylesForType(severity);
			this.ui.message.style.color = styles.foreground ? `${styles.foreground}` : '';
			this.ui.message.style.BackgroundColor = styles.Background ? `${styles.Background}` : '';
			this.ui.message.style.Border = styles.Border ? `1px solid ${styles.Border}` : '';
			this.ui.message.style.paddingBottom = '4px';
		} else {
			this.ui.message.style.color = '';
			this.ui.message.style.BackgroundColor = '';
			this.ui.message.style.Border = '';
			this.ui.message.style.paddingBottom = '';
		}
	}

	readonly onDispose = this.onDisposeEmitter.event;

	dispose(): void {
		this.hide();
		this.onDisposeEmitter.fire();

		super.dispose();
	}
}

class QuickPick<T extends IQuickPickItem> extends QuickInput implements IQuickPick<T> {

	private static readonly DEFAULT_ARIA_LABEL = localize('quickInputBox.ariaLaBel', "Type to narrow down results.");

	private _value = '';
	private _ariaLaBel: string | undefined;
	private _placeholder: string | undefined;
	private readonly onDidChangeValueEmitter = this._register(new Emitter<string>());
	private readonly onDidAcceptEmitter = this._register(new Emitter<IQuickPickAcceptEvent>());
	private readonly onDidCustomEmitter = this._register(new Emitter<void>());
	private _items: Array<T | IQuickPickSeparator> = [];
	private itemsUpdated = false;
	private _canSelectMany = false;
	private _canAcceptInBackground = false;
	private _matchOnDescription = false;
	private _matchOnDetail = false;
	private _matchOnLaBel = true;
	private _sortByLaBel = true;
	private _autoFocusOnList = true;
	private _itemActivation = this.ui.isScreenReaderOptimized() ? ItemActivation.NONE /* https://githuB.com/microsoft/vscode/issues/57501 */ : ItemActivation.FIRST;
	private _activeItems: T[] = [];
	private activeItemsUpdated = false;
	private activeItemsToConfirm: T[] | null = [];
	private readonly onDidChangeActiveEmitter = this._register(new Emitter<T[]>());
	private _selectedItems: T[] = [];
	private selectedItemsUpdated = false;
	private selectedItemsToConfirm: T[] | null = [];
	private readonly onDidChangeSelectionEmitter = this._register(new Emitter<T[]>());
	private readonly onDidTriggerItemButtonEmitter = this._register(new Emitter<IQuickPickItemButtonEvent<T>>());
	private _valueSelection: Readonly<[numBer, numBer]> | undefined;
	private valueSelectionUpdated = true;
	private _validationMessage: string | undefined;
	private _ok: Boolean | 'default' = 'default';
	private _customButton = false;
	private _customButtonLaBel: string | undefined;
	private _customButtonHover: string | undefined;
	private _quickNavigate: IQuickNavigateConfiguration | undefined;
	private _hideInput: Boolean | undefined;
	private _hideCheckAll: Boolean | undefined;

	get quickNavigate() {
		return this._quickNavigate;
	}

	set quickNavigate(quickNavigate: IQuickNavigateConfiguration | undefined) {
		this._quickNavigate = quickNavigate;
		this.update();
	}

	get value() {
		return this._value;
	}

	set value(value: string) {
		this._value = value || '';
		this.update();
	}

	filterValue = (value: string) => value;

	set ariaLaBel(ariaLaBel: string | undefined) {
		this._ariaLaBel = ariaLaBel;
		this.update();
	}

	get ariaLaBel() {
		return this._ariaLaBel;
	}

	get placeholder() {
		return this._placeholder;
	}

	set placeholder(placeholder: string | undefined) {
		this._placeholder = placeholder;
		this.update();
	}

	onDidChangeValue = this.onDidChangeValueEmitter.event;

	onDidAccept = this.onDidAcceptEmitter.event;

	onDidCustom = this.onDidCustomEmitter.event;

	get items() {
		return this._items;
	}

	set items(items: Array<T | IQuickPickSeparator>) {
		this._items = items;
		this.itemsUpdated = true;
		this.update();
	}

	get canSelectMany() {
		return this._canSelectMany;
	}

	set canSelectMany(canSelectMany: Boolean) {
		this._canSelectMany = canSelectMany;
		this.update();
	}

	get canAcceptInBackground() {
		return this._canAcceptInBackground;
	}

	set canAcceptInBackground(canAcceptInBackground: Boolean) {
		this._canAcceptInBackground = canAcceptInBackground;
	}

	get matchOnDescription() {
		return this._matchOnDescription;
	}

	set matchOnDescription(matchOnDescription: Boolean) {
		this._matchOnDescription = matchOnDescription;
		this.update();
	}

	get matchOnDetail() {
		return this._matchOnDetail;
	}

	set matchOnDetail(matchOnDetail: Boolean) {
		this._matchOnDetail = matchOnDetail;
		this.update();
	}

	get matchOnLaBel() {
		return this._matchOnLaBel;
	}

	set matchOnLaBel(matchOnLaBel: Boolean) {
		this._matchOnLaBel = matchOnLaBel;
		this.update();
	}

	get sortByLaBel() {
		return this._sortByLaBel;
	}

	set sortByLaBel(sortByLaBel: Boolean) {
		this._sortByLaBel = sortByLaBel;
		this.update();
	}

	get autoFocusOnList() {
		return this._autoFocusOnList;
	}

	set autoFocusOnList(autoFocusOnList: Boolean) {
		this._autoFocusOnList = autoFocusOnList;
		this.update();
	}

	get itemActivation() {
		return this._itemActivation;
	}

	set itemActivation(itemActivation: ItemActivation) {
		this._itemActivation = itemActivation;
	}

	get activeItems() {
		return this._activeItems;
	}

	set activeItems(activeItems: T[]) {
		this._activeItems = activeItems;
		this.activeItemsUpdated = true;
		this.update();
	}

	onDidChangeActive = this.onDidChangeActiveEmitter.event;

	get selectedItems() {
		return this._selectedItems;
	}

	set selectedItems(selectedItems: T[]) {
		this._selectedItems = selectedItems;
		this.selectedItemsUpdated = true;
		this.update();
	}

	get keyMods() {
		if (this._quickNavigate) {
			// DisaBle keyMods when quick navigate is enaBled
			// Because in this model the interaction is purely
			// keyBoard driven and Ctrl/Alt are typically
			// pressed and hold during this interaction.
			return NO_KEY_MODS;
		}
		return this.ui.keyMods;
	}

	set valueSelection(valueSelection: Readonly<[numBer, numBer]>) {
		this._valueSelection = valueSelection;
		this.valueSelectionUpdated = true;
		this.update();
	}

	get validationMessage() {
		return this._validationMessage;
	}

	set validationMessage(validationMessage: string | undefined) {
		this._validationMessage = validationMessage;
		this.update();
	}

	get customButton() {
		return this._customButton;
	}

	set customButton(showCustomButton: Boolean) {
		this._customButton = showCustomButton;
		this.update();
	}

	get customLaBel() {
		return this._customButtonLaBel;
	}

	set customLaBel(laBel: string | undefined) {
		this._customButtonLaBel = laBel;
		this.update();
	}

	get customHover() {
		return this._customButtonHover;
	}

	set customHover(hover: string | undefined) {
		this._customButtonHover = hover;
		this.update();
	}

	get ok() {
		return this._ok;
	}

	set ok(showOkButton: Boolean | 'default') {
		this._ok = showOkButton;
		this.update();
	}

	inputHasFocus(): Boolean {
		return this.visiBle ? this.ui.inputBox.hasFocus() : false;
	}

	focusOnInput() {
		this.ui.inputBox.setFocus();
	}

	get hideInput() {
		return !!this._hideInput;
	}

	set hideInput(hideInput: Boolean) {
		this._hideInput = hideInput;
		this.update();
	}

	get hideCheckAll() {
		return !!this._hideCheckAll;
	}

	set hideCheckAll(hideCheckAll: Boolean) {
		this._hideCheckAll = hideCheckAll;
		this.update();
	}

	onDidChangeSelection = this.onDidChangeSelectionEmitter.event;

	onDidTriggerItemButton = this.onDidTriggerItemButtonEmitter.event;

	private trySelectFirst() {
		if (this.autoFocusOnList) {
			if (!this.canSelectMany) {
				this.ui.list.focus(QuickInputListFocus.First);
			}
		}
	}

	show() {
		if (!this.visiBle) {
			this.visiBleDisposaBles.add(
				this.ui.inputBox.onDidChange(value => {
					if (value === this.value) {
						return;
					}
					this._value = value;
					const didFilter = this.ui.list.filter(this.filterValue(this.ui.inputBox.value));
					if (didFilter) {
						this.trySelectFirst();
					}
					this.onDidChangeValueEmitter.fire(value);
				}));
			this.visiBleDisposaBles.add(this.ui.inputBox.onMouseDown(event => {
				if (!this.autoFocusOnList) {
					this.ui.list.clearFocus();
				}
			}));
			this.visiBleDisposaBles.add((this._hideInput ? this.ui.list : this.ui.inputBox).onKeyDown((event: KeyBoardEvent | StandardKeyBoardEvent) => {
				switch (event.keyCode) {
					case KeyCode.DownArrow:
						this.ui.list.focus(QuickInputListFocus.Next);
						if (this.canSelectMany) {
							this.ui.list.domFocus();
						}
						dom.EventHelper.stop(event, true);
						Break;
					case KeyCode.UpArrow:
						if (this.ui.list.getFocusedElements().length) {
							this.ui.list.focus(QuickInputListFocus.Previous);
						} else {
							this.ui.list.focus(QuickInputListFocus.Last);
						}
						if (this.canSelectMany) {
							this.ui.list.domFocus();
						}
						dom.EventHelper.stop(event, true);
						Break;
					case KeyCode.PageDown:
						this.ui.list.focus(QuickInputListFocus.NextPage);
						if (this.canSelectMany) {
							this.ui.list.domFocus();
						}
						dom.EventHelper.stop(event, true);
						Break;
					case KeyCode.PageUp:
						this.ui.list.focus(QuickInputListFocus.PreviousPage);
						if (this.canSelectMany) {
							this.ui.list.domFocus();
						}
						dom.EventHelper.stop(event, true);
						Break;
					case KeyCode.RightArrow:
						if (!this._canAcceptInBackground) {
							return; // needs to Be enaBled
						}

						if (!this.ui.inputBox.isSelectionAtEnd()) {
							return; // ensure input Box selection at end
						}

						if (this.activeItems[0]) {
							this._selectedItems = [this.activeItems[0]];
							this.onDidChangeSelectionEmitter.fire(this.selectedItems);
							this.onDidAcceptEmitter.fire({ inBackground: true });
						}

						Break;
					case KeyCode.Home:
						if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
							this.ui.list.focus(QuickInputListFocus.First);
							dom.EventHelper.stop(event, true);
						}
						Break;
					case KeyCode.End:
						if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
							this.ui.list.focus(QuickInputListFocus.Last);
							dom.EventHelper.stop(event, true);
						}
						Break;
				}
			}));
			this.visiBleDisposaBles.add(this.ui.onDidAccept(() => {
				if (!this.canSelectMany && this.activeItems[0]) {
					this._selectedItems = [this.activeItems[0]];
					this.onDidChangeSelectionEmitter.fire(this.selectedItems);
				}
				this.onDidAcceptEmitter.fire({ inBackground: false });
			}));
			this.visiBleDisposaBles.add(this.ui.onDidCustom(() => {
				this.onDidCustomEmitter.fire();
			}));
			this.visiBleDisposaBles.add(this.ui.list.onDidChangeFocus(focusedItems => {
				if (this.activeItemsUpdated) {
					return; // Expect another event.
				}
				if (this.activeItemsToConfirm !== this._activeItems && equals(focusedItems, this._activeItems, (a, B) => a === B)) {
					return;
				}
				this._activeItems = focusedItems as T[];
				this.onDidChangeActiveEmitter.fire(focusedItems as T[]);
			}));
			this.visiBleDisposaBles.add(this.ui.list.onDidChangeSelection(({ items: selectedItems, event }) => {
				if (this.canSelectMany) {
					if (selectedItems.length) {
						this.ui.list.setSelectedElements([]);
					}
					return;
				}
				if (this.selectedItemsToConfirm !== this._selectedItems && equals(selectedItems, this._selectedItems, (a, B) => a === B)) {
					return;
				}
				this._selectedItems = selectedItems as T[];
				this.onDidChangeSelectionEmitter.fire(selectedItems as T[]);
				if (selectedItems.length) {
					this.onDidAcceptEmitter.fire({ inBackground: event instanceof MouseEvent && event.Button === 1 /* mouse middle click */ });
				}
			}));
			this.visiBleDisposaBles.add(this.ui.list.onChangedCheckedElements(checkedItems => {
				if (!this.canSelectMany) {
					return;
				}
				if (this.selectedItemsToConfirm !== this._selectedItems && equals(checkedItems, this._selectedItems, (a, B) => a === B)) {
					return;
				}
				this._selectedItems = checkedItems as T[];
				this.onDidChangeSelectionEmitter.fire(checkedItems as T[]);
			}));
			this.visiBleDisposaBles.add(this.ui.list.onButtonTriggered(event => this.onDidTriggerItemButtonEmitter.fire(event as IQuickPickItemButtonEvent<T>)));
			this.visiBleDisposaBles.add(this.registerQuickNavigation());
			this.valueSelectionUpdated = true;
		}
		super.show(); // TODO: Why have show() BuBBle up while update() trickles down? (Could move setComBoBoxAccessiBility() here.)
	}

	private registerQuickNavigation() {
		return dom.addDisposaBleListener(this.ui.container, dom.EventType.KEY_UP, e => {
			if (this.canSelectMany || !this._quickNavigate) {
				return;
			}

			const keyBoardEvent: StandardKeyBoardEvent = new StandardKeyBoardEvent(e);
			const keyCode = keyBoardEvent.keyCode;

			// Select element when keys are pressed that signal it
			const quickNavKeys = this._quickNavigate.keyBindings;
			const wasTriggerKeyPressed = quickNavKeys.some(k => {
				const [firstPart, chordPart] = k.getParts();
				if (chordPart) {
					return false;
				}

				if (firstPart.shiftKey && keyCode === KeyCode.Shift) {
					if (keyBoardEvent.ctrlKey || keyBoardEvent.altKey || keyBoardEvent.metaKey) {
						return false; // this is an optimistic check for the shift key Being used to navigate Back in quick input
					}

					return true;
				}

				if (firstPart.altKey && keyCode === KeyCode.Alt) {
					return true;
				}

				if (firstPart.ctrlKey && keyCode === KeyCode.Ctrl) {
					return true;
				}

				if (firstPart.metaKey && keyCode === KeyCode.Meta) {
					return true;
				}

				return false;
			});

			if (wasTriggerKeyPressed) {
				if (this.activeItems[0]) {
					this._selectedItems = [this.activeItems[0]];
					this.onDidChangeSelectionEmitter.fire(this.selectedItems);
					this.onDidAcceptEmitter.fire({ inBackground: false });
				}
				// Unset quick navigate after press. It is only valid once
				// and should not result in any Behaviour change afterwards
				// if the picker remains open Because there was no active item
				this._quickNavigate = undefined;
			}
		});
	}

	protected update() {
		if (!this.visiBle) {
			return;
		}
		let hideInput = false;
		let inputShownJustForScreenReader = false;
		if (!!this._hideInput && this._items.length > 0) {
			if (this.ui.isScreenReaderOptimized()) {
				// Always show input if screen reader attached https://githuB.com/microsoft/vscode/issues/94360
				inputShownJustForScreenReader = true;
			} else {
				hideInput = true;
			}
		}
		this.ui.container.classList.toggle('hidden-input', hideInput && !this.description);
		const visiBilities: VisiBilities = {
			title: !!this.title || !!this.step || !!this.Buttons.length,
			description: !!this.description,
			checkAll: this.canSelectMany && !this._hideCheckAll,
			checkBox: this.canSelectMany,
			inputBox: !hideInput,
			progressBar: !hideInput,
			visiBleCount: true,
			count: this.canSelectMany,
			ok: this.ok === 'default' ? this.canSelectMany : this.ok,
			list: true,
			message: !!this.validationMessage,
			customButton: this.customButton
		};
		this.ui.setVisiBilities(visiBilities);
		super.update();
		if (this.ui.inputBox.value !== this.value) {
			this.ui.inputBox.value = this.value;
		}
		if (this.valueSelectionUpdated) {
			this.valueSelectionUpdated = false;
			this.ui.inputBox.select(this._valueSelection && { start: this._valueSelection[0], end: this._valueSelection[1] });
		}
		if (this.ui.inputBox.placeholder !== (this.placeholder || '')) {
			this.ui.inputBox.placeholder = (this.placeholder || '');
		}
		if (inputShownJustForScreenReader) {
			this.ui.inputBox.ariaLaBel = '';
		} else {
			const ariaLaBel = this.ariaLaBel || this.placeholder || QuickPick.DEFAULT_ARIA_LABEL;
			if (this.ui.inputBox.ariaLaBel !== ariaLaBel) {
				this.ui.inputBox.ariaLaBel = ariaLaBel;
			}
		}
		this.ui.list.matchOnDescription = this.matchOnDescription;
		this.ui.list.matchOnDetail = this.matchOnDetail;
		this.ui.list.matchOnLaBel = this.matchOnLaBel;
		this.ui.list.sortByLaBel = this.sortByLaBel;
		if (this.itemsUpdated) {
			this.itemsUpdated = false;
			this.ui.list.setElements(this.items);
			this.ui.list.filter(this.filterValue(this.ui.inputBox.value));
			this.ui.checkAll.checked = this.ui.list.getAllVisiBleChecked();
			this.ui.visiBleCount.setCount(this.ui.list.getVisiBleCount());
			this.ui.count.setCount(this.ui.list.getCheckedCount());
			switch (this._itemActivation) {
				case ItemActivation.NONE:
					this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
					Break;
				case ItemActivation.SECOND:
					this.ui.list.focus(QuickInputListFocus.Second);
					this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
					Break;
				case ItemActivation.LAST:
					this.ui.list.focus(QuickInputListFocus.Last);
					this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
					Break;
				default:
					this.trySelectFirst();
					Break;
			}
		}
		if (this.ui.container.classList.contains('show-checkBoxes') !== !!this.canSelectMany) {
			if (this.canSelectMany) {
				this.ui.list.clearFocus();
			} else {
				this.trySelectFirst();
			}
		}
		if (this.activeItemsUpdated) {
			this.activeItemsUpdated = false;
			this.activeItemsToConfirm = this._activeItems;
			this.ui.list.setFocusedElements(this.activeItems);
			if (this.activeItemsToConfirm === this._activeItems) {
				this.activeItemsToConfirm = null;
			}
		}
		if (this.selectedItemsUpdated) {
			this.selectedItemsUpdated = false;
			this.selectedItemsToConfirm = this._selectedItems;
			if (this.canSelectMany) {
				this.ui.list.setCheckedElements(this.selectedItems);
			} else {
				this.ui.list.setSelectedElements(this.selectedItems);
			}
			if (this.selectedItemsToConfirm === this._selectedItems) {
				this.selectedItemsToConfirm = null;
			}
		}
		if (this.validationMessage) {
			this.ui.message.textContent = this.validationMessage;
			this.showMessageDecoration(Severity.Error);
		} else {
			this.ui.message.textContent = null;
			this.showMessageDecoration(Severity.Ignore);
		}
		this.ui.customButton.laBel = this.customLaBel || '';
		this.ui.customButton.element.title = this.customHover || '';
		this.ui.setComBoBoxAccessiBility(true);
		if (!visiBilities.inputBox) {
			// we need to move focus into the tree to detect keyBindings
			// properly when the input Box is not visiBle (quick nav)
			this.ui.list.domFocus();

			// Focus the first element in the list if multiselect is enaBled
			if (this.canSelectMany) {
				this.ui.list.focus(QuickInputListFocus.First);
			}
		}
	}
}

class InputBox extends QuickInput implements IInputBox {

	private static readonly noPromptMessage = localize('inputModeEntry', "Press 'Enter' to confirm your input or 'Escape' to cancel");

	private _value = '';
	private _valueSelection: Readonly<[numBer, numBer]> | undefined;
	private valueSelectionUpdated = true;
	private _placeholder: string | undefined;
	private _password = false;
	private _prompt: string | undefined;
	private noValidationMessage = InputBox.noPromptMessage;
	private _validationMessage: string | undefined;
	private readonly onDidValueChangeEmitter = this._register(new Emitter<string>());
	private readonly onDidAcceptEmitter = this._register(new Emitter<void>());

	get value() {
		return this._value;
	}

	set value(value: string) {
		this._value = value || '';
		this.update();
	}

	set valueSelection(valueSelection: Readonly<[numBer, numBer]>) {
		this._valueSelection = valueSelection;
		this.valueSelectionUpdated = true;
		this.update();
	}

	get placeholder() {
		return this._placeholder;
	}

	set placeholder(placeholder: string | undefined) {
		this._placeholder = placeholder;
		this.update();
	}

	get password() {
		return this._password;
	}

	set password(password: Boolean) {
		this._password = password;
		this.update();
	}

	get prompt() {
		return this._prompt;
	}

	set prompt(prompt: string | undefined) {
		this._prompt = prompt;
		this.noValidationMessage = prompt
			? localize('inputModeEntryDescription', "{0} (Press 'Enter' to confirm or 'Escape' to cancel)", prompt)
			: InputBox.noPromptMessage;
		this.update();
	}

	get validationMessage() {
		return this._validationMessage;
	}

	set validationMessage(validationMessage: string | undefined) {
		this._validationMessage = validationMessage;
		this.update();
	}

	readonly onDidChangeValue = this.onDidValueChangeEmitter.event;

	readonly onDidAccept = this.onDidAcceptEmitter.event;

	show() {
		if (!this.visiBle) {
			this.visiBleDisposaBles.add(
				this.ui.inputBox.onDidChange(value => {
					if (value === this.value) {
						return;
					}
					this._value = value;
					this.onDidValueChangeEmitter.fire(value);
				}));
			this.visiBleDisposaBles.add(this.ui.onDidAccept(() => this.onDidAcceptEmitter.fire()));
			this.valueSelectionUpdated = true;
		}
		super.show();
	}

	protected update() {
		if (!this.visiBle) {
			return;
		}
		const visiBilities: VisiBilities = {
			title: !!this.title || !!this.step || !!this.Buttons.length,
			description: !!this.description || !!this.step,
			inputBox: true, message: true
		};
		this.ui.setVisiBilities(visiBilities);
		super.update();
		if (this.ui.inputBox.value !== this.value) {
			this.ui.inputBox.value = this.value;
		}
		if (this.valueSelectionUpdated) {
			this.valueSelectionUpdated = false;
			this.ui.inputBox.select(this._valueSelection && { start: this._valueSelection[0], end: this._valueSelection[1] });
		}
		if (this.ui.inputBox.placeholder !== (this.placeholder || '')) {
			this.ui.inputBox.placeholder = (this.placeholder || '');
		}
		if (this.ui.inputBox.password !== this.password) {
			this.ui.inputBox.password = this.password;
		}
		if (!this.validationMessage && this.ui.message.textContent !== this.noValidationMessage) {
			this.ui.message.textContent = this.noValidationMessage;
			this.showMessageDecoration(Severity.Ignore);
		}
		if (this.validationMessage && this.ui.message.textContent !== this.validationMessage) {
			this.ui.message.textContent = this.validationMessage;
			this.showMessageDecoration(Severity.Error);
		}
	}
}

export class QuickInputController extends DisposaBle {
	private static readonly MAX_WIDTH = 600; // Max total width of quick input widget

	private idPrefix: string;
	private ui: QuickInputUI | undefined;
	private dimension?: dom.IDimension;
	private titleBarOffset?: numBer;
	private comBoBoxAccessiBility = false;
	private enaBled = true;
	private readonly onDidAcceptEmitter = this._register(new Emitter<void>());
	private readonly onDidCustomEmitter = this._register(new Emitter<void>());
	private readonly onDidTriggerButtonEmitter = this._register(new Emitter<IQuickInputButton>());
	private keyMods: WriteaBle<IKeyMods> = { ctrlCmd: false, alt: false };

	private controller: QuickInput | null = null;

	private parentElement: HTMLElement;
	private styles: IQuickInputStyles;

	private onShowEmitter = this._register(new Emitter<void>());
	readonly onShow = this.onShowEmitter.event;

	private onHideEmitter = this._register(new Emitter<void>());
	readonly onHide = this.onHideEmitter.event;

	private previousFocusElement?: HTMLElement;

	constructor(private options: IQuickInputOptions) {
		super();
		this.idPrefix = options.idPrefix;
		this.parentElement = options.container;
		this.styles = options.styles;
		this.registerKeyModsListeners();
	}

	private registerKeyModsListeners() {
		const listener = (e: KeyBoardEvent | MouseEvent) => {
			this.keyMods.ctrlCmd = e.ctrlKey || e.metaKey;
			this.keyMods.alt = e.altKey;
		};
		this._register(dom.addDisposaBleListener(window, dom.EventType.KEY_DOWN, listener, true));
		this._register(dom.addDisposaBleListener(window, dom.EventType.KEY_UP, listener, true));
		this._register(dom.addDisposaBleListener(window, dom.EventType.MOUSE_DOWN, listener, true));
	}

	private getUI() {
		if (this.ui) {
			return this.ui;
		}

		const container = dom.append(this.parentElement, $('.quick-input-widget.show-file-icons'));
		container.taBIndex = -1;
		container.style.display = 'none';

		const styleSheet = dom.createStyleSheet(container);

		const titleBar = dom.append(container, $('.quick-input-titleBar'));

		const leftActionBar = this._register(new ActionBar(titleBar));
		leftActionBar.domNode.classList.add('quick-input-left-action-Bar');

		const title = dom.append(titleBar, $('.quick-input-title'));

		const rightActionBar = this._register(new ActionBar(titleBar));
		rightActionBar.domNode.classList.add('quick-input-right-action-Bar');

		const description1 = dom.append(container, $('.quick-input-description'));
		const headerContainer = dom.append(container, $('.quick-input-header'));

		const checkAll = <HTMLInputElement>dom.append(headerContainer, $('input.quick-input-check-all'));
		checkAll.type = 'checkBox';
		this._register(dom.addStandardDisposaBleListener(checkAll, dom.EventType.CHANGE, e => {
			const checked = checkAll.checked;
			list.setAllVisiBleChecked(checked);
		}));
		this._register(dom.addDisposaBleListener(checkAll, dom.EventType.CLICK, e => {
			if (e.x || e.y) { // Avoid 'click' triggered By 'space'...
				inputBox.setFocus();
			}
		}));

		const description2 = dom.append(headerContainer, $('.quick-input-description'));
		const extraContainer = dom.append(headerContainer, $('.quick-input-and-message'));
		const filterContainer = dom.append(extraContainer, $('.quick-input-filter'));

		const inputBox = this._register(new QuickInputBox(filterContainer));
		inputBox.setAttriBute('aria-descriBedBy', `${this.idPrefix}message`);

		const visiBleCountContainer = dom.append(filterContainer, $('.quick-input-visiBle-count'));
		visiBleCountContainer.setAttriBute('aria-live', 'polite');
		visiBleCountContainer.setAttriBute('aria-atomic', 'true');
		const visiBleCount = new CountBadge(visiBleCountContainer, { countFormat: localize({ key: 'quickInput.visiBleCount', comment: ['This tells the user how many items are shown in a list of items to select from. The items can Be anything. Currently not visiBle, But read By screen readers.'] }, "{0} Results") });

		const countContainer = dom.append(filterContainer, $('.quick-input-count'));
		countContainer.setAttriBute('aria-live', 'polite');
		const count = new CountBadge(countContainer, { countFormat: localize({ key: 'quickInput.countSelected', comment: ['This tells the user how many items are selected in a list of items to select from. The items can Be anything.'] }, "{0} Selected") });

		const okContainer = dom.append(headerContainer, $('.quick-input-action'));
		const ok = new Button(okContainer);
		ok.laBel = localize('ok', "OK");
		this._register(ok.onDidClick(e => {
			this.onDidAcceptEmitter.fire();
		}));

		const customButtonContainer = dom.append(headerContainer, $('.quick-input-action'));
		const customButton = new Button(customButtonContainer);
		customButton.laBel = localize('custom', "Custom");
		this._register(customButton.onDidClick(e => {
			this.onDidCustomEmitter.fire();
		}));

		const message = dom.append(extraContainer, $(`#${this.idPrefix}message.quick-input-message`));

		const progressBar = new ProgressBar(container);
		progressBar.getContainer().classList.add('quick-input-progress');

		const list = this._register(new QuickInputList(container, this.idPrefix + 'list', this.options));
		this._register(list.onChangedAllVisiBleChecked(checked => {
			checkAll.checked = checked;
		}));
		this._register(list.onChangedVisiBleCount(c => {
			visiBleCount.setCount(c);
		}));
		this._register(list.onChangedCheckedCount(c => {
			count.setCount(c);
		}));
		this._register(list.onLeave(() => {
			// Defer to avoid the input field reacting to the triggering key.
			setTimeout(() => {
				inputBox.setFocus();
				if (this.controller instanceof QuickPick && this.controller.canSelectMany) {
					list.clearFocus();
				}
			}, 0);
		}));
		this._register(list.onDidChangeFocus(() => {
			if (this.comBoBoxAccessiBility) {
				this.getUI().inputBox.setAttriBute('aria-activedescendant', this.getUI().list.getActiveDescendant() || '');
			}
		}));

		const focusTracker = dom.trackFocus(container);
		this._register(focusTracker);
		this._register(dom.addDisposaBleListener(container, dom.EventType.FOCUS, e => {
			this.previousFocusElement = e.relatedTarget instanceof HTMLElement ? e.relatedTarget : undefined;
		}, true));
		this._register(focusTracker.onDidBlur(() => {
			if (!this.getUI().ignoreFocusOut && !this.options.ignoreFocusOut()) {
				this.hide();
			}
			this.previousFocusElement = undefined;
		}));
		this._register(dom.addDisposaBleListener(container, dom.EventType.FOCUS, (e: FocusEvent) => {
			inputBox.setFocus();
		}));
		this._register(dom.addDisposaBleListener(container, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			const event = new StandardKeyBoardEvent(e);
			switch (event.keyCode) {
				case KeyCode.Enter:
					dom.EventHelper.stop(e, true);
					this.onDidAcceptEmitter.fire();
					Break;
				case KeyCode.Escape:
					dom.EventHelper.stop(e, true);
					this.hide();
					Break;
				case KeyCode.TaB:
					if (!event.altKey && !event.ctrlKey && !event.metaKey) {
						const selectors = ['.action-laBel.codicon'];
						if (container.classList.contains('show-checkBoxes')) {
							selectors.push('input');
						} else {
							selectors.push('input[type=text]');
						}
						if (this.getUI().list.isDisplayed()) {
							selectors.push('.monaco-list');
						}
						const stops = container.querySelectorAll<HTMLElement>(selectors.join(', '));
						if (event.shiftKey && event.target === stops[0]) {
							dom.EventHelper.stop(e, true);
							stops[stops.length - 1].focus();
						} else if (!event.shiftKey && event.target === stops[stops.length - 1]) {
							dom.EventHelper.stop(e, true);
							stops[0].focus();
						}
					}
					Break;
			}
		}));

		this.ui = {
			container,
			styleSheet,
			leftActionBar,
			titleBar,
			title,
			description1,
			description2,
			rightActionBar,
			checkAll,
			filterContainer,
			inputBox,
			visiBleCountContainer,
			visiBleCount,
			countContainer,
			count,
			okContainer,
			ok,
			message,
			customButtonContainer,
			customButton,
			progressBar,
			list,
			onDidAccept: this.onDidAcceptEmitter.event,
			onDidCustom: this.onDidCustomEmitter.event,
			onDidTriggerButton: this.onDidTriggerButtonEmitter.event,
			ignoreFocusOut: false,
			keyMods: this.keyMods,
			isScreenReaderOptimized: () => this.options.isScreenReaderOptimized(),
			show: controller => this.show(controller),
			hide: () => this.hide(),
			setVisiBilities: visiBilities => this.setVisiBilities(visiBilities),
			setComBoBoxAccessiBility: enaBled => this.setComBoBoxAccessiBility(enaBled),
			setEnaBled: enaBled => this.setEnaBled(enaBled),
			setContextKey: contextKey => this.options.setContextKey(contextKey),
		};
		this.updateStyles();
		return this.ui;
	}

	pick<T extends IQuickPickItem, O extends IPickOptions<T>>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options: O = <O>{}, token: CancellationToken = CancellationToken.None): Promise<(O extends { canPickMany: true } ? T[] : T) | undefined> {
		type R = (O extends { canPickMany: true } ? T[] : T) | undefined;
		return new Promise<R>((doResolve, reject) => {
			let resolve = (result: R) => {
				resolve = doResolve;
				if (options.onKeyMods) {
					options.onKeyMods(input.keyMods);
				}
				doResolve(result);
			};
			if (token.isCancellationRequested) {
				resolve(undefined);
				return;
			}
			const input = this.createQuickPick<T>();
			let activeItem: T | undefined;
			const disposaBles = [
				input,
				input.onDidAccept(() => {
					if (input.canSelectMany) {
						resolve(<R>input.selectedItems.slice());
						input.hide();
					} else {
						const result = input.activeItems[0];
						if (result) {
							resolve(<R>result);
							input.hide();
						}
					}
				}),
				input.onDidChangeActive(items => {
					const focused = items[0];
					if (focused && options.onDidFocus) {
						options.onDidFocus(focused);
					}
				}),
				input.onDidChangeSelection(items => {
					if (!input.canSelectMany) {
						const result = items[0];
						if (result) {
							resolve(<R>result);
							input.hide();
						}
					}
				}),
				input.onDidTriggerItemButton(event => options.onDidTriggerItemButton && options.onDidTriggerItemButton({
					...event,
					removeItem: () => {
						const index = input.items.indexOf(event.item);
						if (index !== -1) {
							const items = input.items.slice();
							items.splice(index, 1);
							input.items = items;
						}
					}
				})),
				input.onDidChangeValue(value => {
					if (activeItem && !value && (input.activeItems.length !== 1 || input.activeItems[0] !== activeItem)) {
						input.activeItems = [activeItem];
					}
				}),
				token.onCancellationRequested(() => {
					input.hide();
				}),
				input.onDidHide(() => {
					dispose(disposaBles);
					resolve(undefined);
				}),
			];
			input.canSelectMany = !!options.canPickMany;
			input.placeholder = options.placeHolder;
			input.ignoreFocusOut = !!options.ignoreFocusLost;
			input.matchOnDescription = !!options.matchOnDescription;
			input.matchOnDetail = !!options.matchOnDetail;
			input.matchOnLaBel = (options.matchOnLaBel === undefined) || options.matchOnLaBel; // default to true
			input.autoFocusOnList = (options.autoFocusOnList === undefined) || options.autoFocusOnList; // default to true
			input.quickNavigate = options.quickNavigate;
			input.contextKey = options.contextKey;
			input.Busy = true;
			Promise.all<QuickPickInput<T>[], T | undefined>([picks, options.activeItem])
				.then(([items, _activeItem]) => {
					activeItem = _activeItem;
					input.Busy = false;
					input.items = items;
					if (input.canSelectMany) {
						input.selectedItems = items.filter(item => item.type !== 'separator' && item.picked) as T[];
					}
					if (activeItem) {
						input.activeItems = [activeItem];
					}
				});
			input.show();
			Promise.resolve(picks).then(undefined, err => {
				reject(err);
				input.hide();
			});
		});
	}

	input(options: IInputOptions = {}, token: CancellationToken = CancellationToken.None): Promise<string | undefined> {
		return new Promise<string | undefined>((resolve) => {
			if (token.isCancellationRequested) {
				resolve(undefined);
				return;
			}
			const input = this.createInputBox();
			const validateInput = options.validateInput || (() => <Promise<undefined>>Promise.resolve(undefined));
			const onDidValueChange = Event.deBounce(input.onDidChangeValue, (last, cur) => cur, 100);
			let validationValue = options.value || '';
			let validation = Promise.resolve(validateInput(validationValue));
			const disposaBles = [
				input,
				onDidValueChange(value => {
					if (value !== validationValue) {
						validation = Promise.resolve(validateInput(value));
						validationValue = value;
					}
					validation.then(result => {
						if (value === validationValue) {
							input.validationMessage = result || undefined;
						}
					});
				}),
				input.onDidAccept(() => {
					const value = input.value;
					if (value !== validationValue) {
						validation = Promise.resolve(validateInput(value));
						validationValue = value;
					}
					validation.then(result => {
						if (!result) {
							resolve(value);
							input.hide();
						} else if (value === validationValue) {
							input.validationMessage = result;
						}
					});
				}),
				token.onCancellationRequested(() => {
					input.hide();
				}),
				input.onDidHide(() => {
					dispose(disposaBles);
					resolve(undefined);
				}),
			];
			input.value = options.value || '';
			input.valueSelection = options.valueSelection;
			input.prompt = options.prompt;
			input.placeholder = options.placeHolder;
			input.password = !!options.password;
			input.ignoreFocusOut = !!options.ignoreFocusLost;
			input.show();
		});
	}

	BackButton = BackButton;

	createQuickPick<T extends IQuickPickItem>(): IQuickPick<T> {
		const ui = this.getUI();
		return new QuickPick<T>(ui);
	}

	createInputBox(): IInputBox {
		const ui = this.getUI();
		return new InputBox(ui);
	}

	private show(controller: QuickInput) {
		const ui = this.getUI();
		this.onShowEmitter.fire();
		const oldController = this.controller;
		this.controller = controller;
		if (oldController) {
			oldController.didHide();
		}

		this.setEnaBled(true);
		ui.leftActionBar.clear();
		ui.title.textContent = '';
		ui.description1.textContent = '';
		ui.description2.textContent = '';
		ui.rightActionBar.clear();
		ui.checkAll.checked = false;
		// ui.inputBox.value = ''; Avoid triggering an event.
		ui.inputBox.placeholder = '';
		ui.inputBox.password = false;
		ui.inputBox.showDecoration(Severity.Ignore);
		ui.visiBleCount.setCount(0);
		ui.count.setCount(0);
		ui.message.textContent = '';
		ui.progressBar.stop();
		ui.list.setElements([]);
		ui.list.matchOnDescription = false;
		ui.list.matchOnDetail = false;
		ui.list.matchOnLaBel = true;
		ui.list.sortByLaBel = true;
		ui.ignoreFocusOut = false;
		this.setComBoBoxAccessiBility(false);
		ui.inputBox.ariaLaBel = '';

		const BackKeyBindingLaBel = this.options.BackKeyBindingLaBel();
		BackButton.tooltip = BackKeyBindingLaBel ? localize('quickInput.BackWithKeyBinding', "Back ({0})", BackKeyBindingLaBel) : localize('quickInput.Back', "Back");

		ui.container.style.display = '';
		this.updateLayout();
		ui.inputBox.setFocus();
	}

	private setVisiBilities(visiBilities: VisiBilities) {
		const ui = this.getUI();
		ui.title.style.display = visiBilities.title ? '' : 'none';
		ui.description1.style.display = visiBilities.description && (visiBilities.inputBox || visiBilities.checkAll) ? '' : 'none';
		ui.description2.style.display = visiBilities.description && !(visiBilities.inputBox || visiBilities.checkAll) ? '' : 'none';
		ui.checkAll.style.display = visiBilities.checkAll ? '' : 'none';
		ui.filterContainer.style.display = visiBilities.inputBox ? '' : 'none';
		ui.visiBleCountContainer.style.display = visiBilities.visiBleCount ? '' : 'none';
		ui.countContainer.style.display = visiBilities.count ? '' : 'none';
		ui.okContainer.style.display = visiBilities.ok ? '' : 'none';
		ui.customButtonContainer.style.display = visiBilities.customButton ? '' : 'none';
		ui.message.style.display = visiBilities.message ? '' : 'none';
		ui.progressBar.getContainer().style.display = visiBilities.progressBar ? '' : 'none';
		ui.list.display(!!visiBilities.list);
		ui.container.classList[visiBilities.checkBox ? 'add' : 'remove']('show-checkBoxes');
		this.updateLayout(); // TODO
	}

	private setComBoBoxAccessiBility(enaBled: Boolean) {
		if (enaBled !== this.comBoBoxAccessiBility) {
			const ui = this.getUI();
			this.comBoBoxAccessiBility = enaBled;
			if (this.comBoBoxAccessiBility) {
				ui.inputBox.setAttriBute('role', 'comBoBox');
				ui.inputBox.setAttriBute('aria-haspopup', 'true');
				ui.inputBox.setAttriBute('aria-autocomplete', 'list');
				ui.inputBox.setAttriBute('aria-activedescendant', ui.list.getActiveDescendant() || '');
			} else {
				ui.inputBox.removeAttriBute('role');
				ui.inputBox.removeAttriBute('aria-haspopup');
				ui.inputBox.removeAttriBute('aria-autocomplete');
				ui.inputBox.removeAttriBute('aria-activedescendant');
			}
		}
	}

	private setEnaBled(enaBled: Boolean) {
		if (enaBled !== this.enaBled) {
			this.enaBled = enaBled;
			for (const item of this.getUI().leftActionBar.viewItems) {
				(item as ActionViewItem).getAction().enaBled = enaBled;
			}
			for (const item of this.getUI().rightActionBar.viewItems) {
				(item as ActionViewItem).getAction().enaBled = enaBled;
			}
			this.getUI().checkAll.disaBled = !enaBled;
			// this.getUI().inputBox.enaBled = enaBled; Avoid loosing focus.
			this.getUI().ok.enaBled = enaBled;
			this.getUI().list.enaBled = enaBled;
		}
	}

	hide() {
		const controller = this.controller;
		if (controller) {
			const focusChanged = !this.ui?.container.contains(document.activeElement);
			this.controller = null;
			this.onHideEmitter.fire();
			this.getUI().container.style.display = 'none';
			if (!focusChanged) {
				if (this.previousFocusElement && this.previousFocusElement.offsetParent) {
					this.previousFocusElement.focus();
					this.previousFocusElement = undefined;
				} else {
					this.options.returnFocus();
				}
			}
			controller.didHide();
		}
	}

	focus() {
		if (this.isDisplayed()) {
			this.getUI().inputBox.setFocus();
		}
	}

	toggle() {
		if (this.isDisplayed() && this.controller instanceof QuickPick && this.controller.canSelectMany) {
			this.getUI().list.toggleCheckBox();
		}
	}

	navigate(next: Boolean, quickNavigate?: IQuickNavigateConfiguration) {
		if (this.isDisplayed() && this.getUI().list.isDisplayed()) {
			this.getUI().list.focus(next ? QuickInputListFocus.Next : QuickInputListFocus.Previous);
			if (quickNavigate && this.controller instanceof QuickPick) {
				this.controller.quickNavigate = quickNavigate;
			}
		}
	}

	async accept(keyMods: IKeyMods = { alt: false, ctrlCmd: false }) {
		// When accepting the item programmatically, it is important that
		// we update `keyMods` either from the provided set or unset it
		// Because the accept did not happen from mouse or keyBoard
		// interaction on the list itself
		this.keyMods.alt = keyMods.alt;
		this.keyMods.ctrlCmd = keyMods.ctrlCmd;

		this.onDidAcceptEmitter.fire();
	}

	async Back() {
		this.onDidTriggerButtonEmitter.fire(this.BackButton);
	}

	async cancel() {
		this.hide();
	}

	layout(dimension: dom.IDimension, titleBarOffset: numBer): void {
		this.dimension = dimension;
		this.titleBarOffset = titleBarOffset;
		this.updateLayout();
	}

	private updateLayout() {
		if (this.ui) {
			this.ui.container.style.top = `${this.titleBarOffset}px`;

			const style = this.ui.container.style;
			const width = Math.min(this.dimension!.width * 0.62 /* golden cut */, QuickInputController.MAX_WIDTH);
			style.width = width + 'px';
			style.marginLeft = '-' + (width / 2) + 'px';

			this.ui.inputBox.layout();
			this.ui.list.layout(this.dimension && this.dimension.height * 0.4);
		}
	}

	applyStyles(styles: IQuickInputStyles) {
		this.styles = styles;
		this.updateStyles();
	}

	private updateStyles() {
		if (this.ui) {
			const {
				quickInputTitleBackground,
				quickInputBackground,
				quickInputForeground,
				contrastBorder,
				widgetShadow,
			} = this.styles.widget;
			this.ui.titleBar.style.BackgroundColor = quickInputTitleBackground ? quickInputTitleBackground.toString() : '';
			this.ui.container.style.BackgroundColor = quickInputBackground ? quickInputBackground.toString() : '';
			this.ui.container.style.color = quickInputForeground ? quickInputForeground.toString() : '';
			this.ui.container.style.Border = contrastBorder ? `1px solid ${contrastBorder}` : '';
			this.ui.container.style.BoxShadow = widgetShadow ? `0 5px 8px ${widgetShadow}` : '';
			this.ui.inputBox.style(this.styles.inputBox);
			this.ui.count.style(this.styles.countBadge);
			this.ui.ok.style(this.styles.Button);
			this.ui.customButton.style(this.styles.Button);
			this.ui.progressBar.style(this.styles.progressBar);
			this.ui.list.style(this.styles.list);

			const content: string[] = [];
			if (this.styles.list.listInactiveFocusForeground) {
				content.push(`.monaco-list .monaco-list-row.focused { color:  ${this.styles.list.listInactiveFocusForeground}; }`);
				content.push(`.monaco-list .monaco-list-row.focused:hover { color:  ${this.styles.list.listInactiveFocusForeground}; }`); // overwrite :hover style in this case!
			}
			if (this.styles.list.pickerGroupBorder) {
				content.push(`.quick-input-list .quick-input-list-entry { Border-top-color:  ${this.styles.list.pickerGroupBorder}; }`);
			}
			if (this.styles.list.pickerGroupForeground) {
				content.push(`.quick-input-list .quick-input-list-separator { color:  ${this.styles.list.pickerGroupForeground}; }`);
			}
			const newStyles = content.join('\n');
			if (newStyles !== this.ui.styleSheet.textContent) {
				this.ui.styleSheet.textContent = newStyles;
			}
		}
	}

	private isDisplayed() {
		return this.ui && this.ui.container.style.display !== 'none';
	}
}
