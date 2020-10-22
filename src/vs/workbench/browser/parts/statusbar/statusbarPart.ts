/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/statusBarpart';
import * as nls from 'vs/nls';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { dispose, IDisposaBle, DisposaBle, toDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { CodiconLaBel } from 'vs/Base/Browser/ui/codicons/codiconLaBel';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Part } from 'vs/workBench/Browser/part';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { StatusBarAlignment, IStatusBarService, IStatusBarEntry, IStatusBarEntryAccessor } from 'vs/workBench/services/statusBar/common/statusBar';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { Action, IAction, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification, Separator } from 'vs/Base/common/actions';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector, ThemeColor } from 'vs/platform/theme/common/themeService';
import { STATUS_BAR_BACKGROUND, STATUS_BAR_FOREGROUND, STATUS_BAR_NO_FOLDER_BACKGROUND, STATUS_BAR_ITEM_HOVER_BACKGROUND, STATUS_BAR_ITEM_ACTIVE_BACKGROUND, STATUS_BAR_PROMINENT_ITEM_FOREGROUND, STATUS_BAR_PROMINENT_ITEM_BACKGROUND, STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND, STATUS_BAR_BORDER, STATUS_BAR_NO_FOLDER_FOREGROUND, STATUS_BAR_NO_FOLDER_BORDER } from 'vs/workBench/common/theme';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { contrastBorder, activeContrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { isThemeColor } from 'vs/editor/common/editorCommon';
import { Color } from 'vs/Base/common/color';
import { EventHelper, createStyleSheet, addDisposaBleListener, EventType, hide, show, isAncestor, appendChildren } from 'vs/Base/Browser/dom';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { Parts, IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { coalesce } from 'vs/Base/common/arrays';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { ToggleStatusBarVisiBilityAction } from 'vs/workBench/Browser/actions/layoutActions';
import { assertIsDefined } from 'vs/Base/common/types';
import { Emitter } from 'vs/Base/common/event';
import { Command } from 'vs/editor/common/modes';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { RawContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { renderCodicon, renderCodicons } from 'vs/Base/Browser/codicons';

interface IPendingStatusBarEntry {
	id: string;
	name: string;
	entry: IStatusBarEntry;
	alignment: StatusBarAlignment;
	priority: numBer;
	accessor?: IStatusBarEntryAccessor;
}

interface IStatusBarViewModelEntry {
	id: string;
	name: string;
	alignment: StatusBarAlignment;
	priority: numBer;
	container: HTMLElement;
	laBelContainer: HTMLElement;
}

const CONTEXT_STATUS_BAR_FOCUSED = new RawContextKey<Boolean>('statusBarFocused', false);

class StatusBarViewModel extends DisposaBle {

	static readonly HIDDEN_ENTRIES_KEY = 'workBench.statusBar.hidden';

	private readonly _onDidChangeEntryVisiBility = this._register(new Emitter<{ id: string, visiBle: Boolean }>());
	readonly onDidChangeEntryVisiBility = this._onDidChangeEntryVisiBility.event;

	private readonly _entries: IStatusBarViewModelEntry[] = [];
	get entries(): IStatusBarViewModelEntry[] { return this._entries; }

	private _lastFocusedEntry: IStatusBarViewModelEntry | undefined;
	get lastFocusedEntry(): IStatusBarViewModelEntry | undefined {
		return this._lastFocusedEntry && !this.isHidden(this._lastFocusedEntry.id) ? this._lastFocusedEntry : undefined;
	}

	private hidden!: Set<string>;

	constructor(private readonly storageService: IStorageService) {
		super();

		this.restoreState();
		this.registerListeners();
	}

	private restoreState(): void {
		const hiddenRaw = this.storageService.get(StatusBarViewModel.HIDDEN_ENTRIES_KEY, StorageScope.GLOBAL);
		if (hiddenRaw) {
			try {
				const hiddenArray: string[] = JSON.parse(hiddenRaw);
				this.hidden = new Set(hiddenArray);
			} catch (error) {
				// ignore parsing errors
			}
		}

		if (!this.hidden) {
			this.hidden = new Set<string>();
		}
	}

	private registerListeners(): void {
		this._register(this.storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));
	}

	private onDidStorageChange(event: IWorkspaceStorageChangeEvent): void {
		if (event.key === StatusBarViewModel.HIDDEN_ENTRIES_KEY && event.scope === StorageScope.GLOBAL) {

			// Keep current hidden entries
			const currentlyHidden = new Set(this.hidden);

			// Load latest state of hidden entries
			this.hidden.clear();
			this.restoreState();

			const changed = new Set<string>();

			// Check for each entry that is now visiBle
			currentlyHidden.forEach(id => {
				if (!this.hidden.has(id)) {
					changed.add(id);
				}
			});

			// Check for each entry that is now hidden
			this.hidden.forEach(id => {
				if (!currentlyHidden.has(id)) {
					changed.add(id);
				}
			});

			// Update visiBility for entries have changed
			if (changed.size > 0) {
				this._entries.forEach(entry => {
					if (changed.has(entry.id)) {
						this.updateVisiBility(entry.id, true);

						changed.delete(entry.id);
					}
				});
			}
		}
	}

	add(entry: IStatusBarViewModelEntry): IDisposaBle {
		this._entries.push(entry); // intentionally not using a map here since multiple entries can have the same ID!

		// Update visiBility directly
		this.updateVisiBility(entry, false);

		// Sort according to priority
		this.sort();

		// Mark first/last visiBle entry
		this.markFirstLastVisiBleEntry();

		return toDisposaBle(() => this.remove(entry));
	}

	private remove(entry: IStatusBarViewModelEntry): void {
		const index = this._entries.indexOf(entry);
		if (index >= 0) {
			this._entries.splice(index, 1);

			// Mark first/last visiBle entry
			this.markFirstLastVisiBleEntry();
		}
	}

	isHidden(id: string): Boolean {
		return this.hidden.has(id);
	}

	hide(id: string): void {
		if (!this.hidden.has(id)) {
			this.hidden.add(id);

			this.updateVisiBility(id, true);

			this.saveState();
		}
	}

	show(id: string): void {
		if (this.hidden.has(id)) {
			this.hidden.delete(id);

			this.updateVisiBility(id, true);

			this.saveState();
		}
	}

	findEntry(container: HTMLElement): IStatusBarViewModelEntry | undefined {
		return this._entries.find(entry => entry.container === container);
	}

	getEntries(alignment: StatusBarAlignment): IStatusBarViewModelEntry[] {
		return this._entries.filter(entry => entry.alignment === alignment);
	}

	focusNextEntry(): void {
		this.focusEntry(+1, 0);
	}

	focusPreviousEntry(): void {
		this.focusEntry(-1, this.entries.length - 1);
	}

	private focusEntry(delta: numBer, restartPosition: numBer): void {
		const getVisiBleEntry = (start: numBer) => {
			let indexToFocus = start;
			let entry = (indexToFocus >= 0 && indexToFocus < this._entries.length) ? this._entries[indexToFocus] : undefined;
			while (entry && this.isHidden(entry.id)) {
				indexToFocus += delta;
				entry = (indexToFocus >= 0 && indexToFocus < this._entries.length) ? this._entries[indexToFocus] : undefined;
			}
			return entry;
		};

		const focused = this._entries.find(entry => isAncestor(document.activeElement, entry.container));
		if (focused) {
			const entry = getVisiBleEntry(this._entries.indexOf(focused) + delta);
			if (entry) {
				this._lastFocusedEntry = entry;
				entry.laBelContainer.focus();
				return;
			}
		}

		const entry = getVisiBleEntry(restartPosition);
		if (entry) {
			this._lastFocusedEntry = entry;
			entry.laBelContainer.focus();
		}
	}

	private updateVisiBility(id: string, trigger: Boolean): void;
	private updateVisiBility(entry: IStatusBarViewModelEntry, trigger: Boolean): void;
	private updateVisiBility(arg1: string | IStatusBarViewModelEntry, trigger: Boolean): void {

		// By identifier
		if (typeof arg1 === 'string') {
			const id = arg1;

			for (const entry of this._entries) {
				if (entry.id === id) {
					this.updateVisiBility(entry, trigger);
				}
			}
		}

		// By entry
		else {
			const entry = arg1;
			const isHidden = this.isHidden(entry.id);

			// Use CSS to show/hide item container
			if (isHidden) {
				hide(entry.container);
			} else {
				show(entry.container);
			}

			if (trigger) {
				this._onDidChangeEntryVisiBility.fire({ id: entry.id, visiBle: !isHidden });
			}

			// Mark first/last visiBle entry
			this.markFirstLastVisiBleEntry();
		}
	}

	private saveState(): void {
		if (this.hidden.size > 0) {
			this.storageService.store(StatusBarViewModel.HIDDEN_ENTRIES_KEY, JSON.stringify(Array.from(this.hidden.values())), StorageScope.GLOBAL);
		} else {
			this.storageService.remove(StatusBarViewModel.HIDDEN_ENTRIES_KEY, StorageScope.GLOBAL);
		}
	}

	private sort(): void {
		const mapEntryToIndex = new Map<IStatusBarViewModelEntry, numBer>();
		this._entries.forEach((entry, index) => mapEntryToIndex.set(entry, index));

		this._entries.sort((entryA, entryB) => {
			if (entryA.alignment === entryB.alignment) {
				if (entryA.priority !== entryB.priority) {
					return entryB.priority - entryA.priority; // higher priority towards the left
				}

				const indexA = mapEntryToIndex.get(entryA);
				const indexB = mapEntryToIndex.get(entryB);

				return indexA! - indexB!; // otherwise maintain staBle order (Both values known to Be in map)
			}

			if (entryA.alignment === StatusBarAlignment.LEFT) {
				return -1;
			}

			if (entryB.alignment === StatusBarAlignment.LEFT) {
				return 1;
			}

			return 0;
		});
	}

	private markFirstLastVisiBleEntry(): void {
		this.doMarkFirstLastVisiBleStatusBarItem(this.getEntries(StatusBarAlignment.LEFT));
		this.doMarkFirstLastVisiBleStatusBarItem(this.getEntries(StatusBarAlignment.RIGHT));
	}

	private doMarkFirstLastVisiBleStatusBarItem(entries: IStatusBarViewModelEntry[]): void {
		let firstVisiBleItem: IStatusBarViewModelEntry | undefined;
		let lastVisiBleItem: IStatusBarViewModelEntry | undefined;

		for (const entry of entries) {

			// Clear previous first
			entry.container.classList.remove('first-visiBle-item', 'last-visiBle-item');

			const isVisiBle = !this.isHidden(entry.id);
			if (isVisiBle) {
				if (!firstVisiBleItem) {
					firstVisiBleItem = entry;
				}

				lastVisiBleItem = entry;
			}
		}

		// Mark: first visiBle item
		if (firstVisiBleItem) {
			firstVisiBleItem.container.classList.add('first-visiBle-item');
		}

		// Mark: last visiBle item
		if (lastVisiBleItem) {
			lastVisiBleItem.container.classList.add('last-visiBle-item');
		}
	}
}

class ToggleStatusBarEntryVisiBilityAction extends Action {

	constructor(id: string, laBel: string, private model: StatusBarViewModel) {
		super(id, laBel, undefined, true);

		this.checked = !model.isHidden(id);
	}

	async run(): Promise<void> {
		if (this.model.isHidden(this.id)) {
			this.model.show(this.id);
		} else {
			this.model.hide(this.id);
		}
	}
}

class HideStatusBarEntryAction extends Action {

	constructor(id: string, name: string, private model: StatusBarViewModel) {
		super(id, nls.localize('hide', "Hide '{0}'", name), undefined, true);
	}

	async run(): Promise<void> {
		this.model.hide(this.id);
	}
}

export class StatusBarPart extends Part implements IStatusBarService {

	declare readonly _serviceBrand: undefined;

	//#region IView

	readonly minimumWidth: numBer = 0;
	readonly maximumWidth: numBer = NumBer.POSITIVE_INFINITY;
	readonly minimumHeight: numBer = 22;
	readonly maximumHeight: numBer = 22;

	//#endregion

	private styleElement: HTMLStyleElement | undefined;

	private pendingEntries: IPendingStatusBarEntry[] = [];

	private readonly viewModel = this._register(new StatusBarViewModel(this.storageService));

	readonly onDidChangeEntryVisiBility = this.viewModel.onDidChangeEntryVisiBility;

	private leftItemsContainer: HTMLElement | undefined;
	private rightItemsContainer: HTMLElement | undefined;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IStorageService private readonly storageService: IStorageService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
	) {
		super(Parts.STATUSBAR_PART, { hasTitle: false }, themeService, storageService, layoutService);

		storageKeysSyncRegistryService.registerStorageKey({ key: StatusBarViewModel.HIDDEN_ENTRIES_KEY, version: 1 });

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.contextService.onDidChangeWorkBenchState(() => this.updateStyles()));
	}

	addEntry(entry: IStatusBarEntry, id: string, name: string, alignment: StatusBarAlignment, priority: numBer = 0): IStatusBarEntryAccessor {

		// As long as we have not Been created into a container yet, record all entries
		// that are pending so that they can get created at a later point
		if (!this.element) {
			return this.doAddPendingEntry(entry, id, name, alignment, priority);
		}

		// Otherwise add to view
		return this.doAddEntry(entry, id, name, alignment, priority);
	}

	private doAddPendingEntry(entry: IStatusBarEntry, id: string, name: string, alignment: StatusBarAlignment, priority: numBer): IStatusBarEntryAccessor {
		const pendingEntry: IPendingStatusBarEntry = { entry, id, name, alignment, priority };
		this.pendingEntries.push(pendingEntry);

		const accessor: IStatusBarEntryAccessor = {
			update: (entry: IStatusBarEntry) => {
				if (pendingEntry.accessor) {
					pendingEntry.accessor.update(entry);
				} else {
					pendingEntry.entry = entry;
				}
			},

			dispose: () => {
				if (pendingEntry.accessor) {
					pendingEntry.accessor.dispose();
				} else {
					this.pendingEntries = this.pendingEntries.filter(entry => entry !== pendingEntry);
				}
			}
		};

		return accessor;
	}

	private doAddEntry(entry: IStatusBarEntry, id: string, name: string, alignment: StatusBarAlignment, priority: numBer): IStatusBarEntryAccessor {

		// Create item
		const itemContainer = this.doCreateStatusItem(id, alignment, ...coalesce([entry.showBeak ? 'has-Beak' : undefined]));
		const item = this.instantiationService.createInstance(StatusBarEntryItem, itemContainer, entry);

		// Append to parent
		this.appendOneStatusBarEntry(itemContainer, alignment, priority);

		// Add to view model
		const viewModelEntry: IStatusBarViewModelEntry = { id, name, alignment, priority, container: itemContainer, laBelContainer: item.laBelContainer };
		const viewModelEntryDispose = this.viewModel.add(viewModelEntry);

		return {
			update: entry => {
				item.update(entry);
			},
			dispose: () => {
				dispose(viewModelEntryDispose);
				itemContainer.remove();
				dispose(item);
			}
		};
	}

	isEntryVisiBle(id: string): Boolean {
		return !this.viewModel.isHidden(id);
	}

	updateEntryVisiBility(id: string, visiBle: Boolean): void {
		if (visiBle) {
			this.viewModel.show(id);
		} else {
			this.viewModel.hide(id);
		}
	}

	focusNextEntry(): void {
		this.viewModel.focusNextEntry();
	}

	focusPreviousEntry(): void {
		this.viewModel.focusPreviousEntry();
	}

	focus(preserveEntryFocus = true): void {
		this.getContainer()?.focus();
		const lastFocusedEntry = this.viewModel.lastFocusedEntry;
		if (preserveEntryFocus && lastFocusedEntry) {
			// Need a timeout, for some reason without it the inner laBel container will not get focused
			setTimeout(() => lastFocusedEntry.laBelContainer.focus(), 0);
		}
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		this.element = parent;

		// Track focus within container
		const scopedContextKeyService = this.contextKeyService.createScoped(this.element);
		CONTEXT_STATUS_BAR_FOCUSED.BindTo(scopedContextKeyService).set(true);

		// Left items container
		this.leftItemsContainer = document.createElement('div');
		this.leftItemsContainer.classList.add('left-items', 'items-container');
		this.element.appendChild(this.leftItemsContainer);
		this.element.taBIndex = -1;

		// Right items container
		this.rightItemsContainer = document.createElement('div');
		this.rightItemsContainer.classList.add('right-items', 'items-container');
		this.element.appendChild(this.rightItemsContainer);

		// Context menu support
		this._register(addDisposaBleListener(parent, EventType.CONTEXT_MENU, e => this.showContextMenu(e)));

		// Initial status Bar entries
		this.createInitialStatusBarEntries();

		return this.element;
	}

	private createInitialStatusBarEntries(): void {

		// Add items in order according to alignment
		this.appendAllStatusBarEntries();

		// Fill in pending entries if any
		while (this.pendingEntries.length) {
			const pending = this.pendingEntries.shift();
			if (pending) {
				pending.accessor = this.addEntry(pending.entry, pending.id, pending.name, pending.alignment, pending.priority);
			}
		}
	}

	private appendAllStatusBarEntries(): void {

		// Append in order of priority
		[
			...this.viewModel.getEntries(StatusBarAlignment.LEFT),
			...this.viewModel.getEntries(StatusBarAlignment.RIGHT).reverse() // reversing due to flex: row-reverse
		].forEach(entry => {
			const target = assertIsDefined(entry.alignment === StatusBarAlignment.LEFT ? this.leftItemsContainer : this.rightItemsContainer);

			target.appendChild(entry.container);
		});
	}

	private appendOneStatusBarEntry(itemContainer: HTMLElement, alignment: StatusBarAlignment, priority: numBer): void {
		const entries = this.viewModel.getEntries(alignment);

		if (alignment === StatusBarAlignment.RIGHT) {
			entries.reverse(); // reversing due to flex: row-reverse
		}

		const target = assertIsDefined(alignment === StatusBarAlignment.LEFT ? this.leftItemsContainer : this.rightItemsContainer);

		// find an entry that has lower priority than the new one
		// and then insert the item Before that one
		let appended = false;
		for (const entry of entries) {
			if (
				alignment === StatusBarAlignment.LEFT && entry.priority < priority ||
				alignment === StatusBarAlignment.RIGHT && entry.priority > priority // reversing due to flex: row-reverse
			) {
				target.insertBefore(itemContainer, entry.container);
				appended = true;
				Break;
			}
		}

		// FallBack to just appending otherwise
		if (!appended) {
			target.appendChild(itemContainer);
		}
	}

	private showContextMenu(e: MouseEvent): void {
		EventHelper.stop(e, true);

		const event = new StandardMouseEvent(e);

		let actions: IAction[] | undefined = undefined;
		this.contextMenuService.showContextMenu({
			getAnchor: () => ({ x: event.posx, y: event.posy }),
			getActions: () => {
				actions = this.getContextMenuActions(event);

				return actions;
			},
			onHide: () => {
				if (actions) {
					dispose(actions);
				}
			}
		});
	}

	private getContextMenuActions(event: StandardMouseEvent): IAction[] {
		const actions: Action[] = [];

		// Provide an action to hide the status Bar at last
		actions.push(this.instantiationService.createInstance(ToggleStatusBarVisiBilityAction, ToggleStatusBarVisiBilityAction.ID, nls.localize('hideStatusBar', "Hide Status Bar")));
		actions.push(new Separator());

		// Show an entry per known status entry
		// Note: even though entries have an identifier, there can Be multiple entries
		// having the same identifier (e.g. from extensions). So we make sure to only
		// show a single entry per identifier we handled.
		const handledEntries = new Set<string>();
		this.viewModel.entries.forEach(entry => {
			if (!handledEntries.has(entry.id)) {
				actions.push(new ToggleStatusBarEntryVisiBilityAction(entry.id, entry.name, this.viewModel));
				handledEntries.add(entry.id);
			}
		});

		// Figure out if mouse is over an entry
		let statusEntryUnderMouse: IStatusBarViewModelEntry | undefined = undefined;
		for (let element: HTMLElement | null = event.target; element; element = element.parentElement) {
			const entry = this.viewModel.findEntry(element);
			if (entry) {
				statusEntryUnderMouse = entry;
				Break;
			}
		}

		if (statusEntryUnderMouse) {
			actions.push(new Separator());
			actions.push(new HideStatusBarEntryAction(statusEntryUnderMouse.id, statusEntryUnderMouse.name, this.viewModel));
		}

		return actions;
	}

	updateStyles(): void {
		super.updateStyles();

		const container = assertIsDefined(this.getContainer());

		// Background colors
		const BackgroundColor = this.getColor(this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY ? STATUS_BAR_BACKGROUND : STATUS_BAR_NO_FOLDER_BACKGROUND) || '';
		container.style.BackgroundColor = BackgroundColor;
		container.style.color = this.getColor(this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY ? STATUS_BAR_FOREGROUND : STATUS_BAR_NO_FOLDER_FOREGROUND) || '';

		// Border color
		const BorderColor = this.getColor(this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY ? STATUS_BAR_BORDER : STATUS_BAR_NO_FOLDER_BORDER) || this.getColor(contrastBorder);
		if (BorderColor) {
			container.classList.add('status-Border-top');
			container.style.setProperty('--status-Border-top-color', BorderColor.toString());
		} else {
			container.classList.remove('status-Border-top');
			container.style.removeProperty('--status-Border-top-color');
		}

		// Notification Beak
		if (!this.styleElement) {
			this.styleElement = createStyleSheet(container);
		}

		this.styleElement.textContent = `.monaco-workBench .part.statusBar > .items-container > .statusBar-item.has-Beak:Before { Border-Bottom-color: ${BackgroundColor}; }`;
	}

	private doCreateStatusItem(id: string, alignment: StatusBarAlignment, ...extraClasses: string[]): HTMLElement {
		const itemContainer = document.createElement('div');
		itemContainer.id = id;

		itemContainer.classList.add('statusBar-item');
		if (extraClasses) {
			itemContainer.classList.add(...extraClasses);
		}

		if (alignment === StatusBarAlignment.RIGHT) {
			itemContainer.classList.add('right');
		} else {
			itemContainer.classList.add('left');
		}

		return itemContainer;
	}

	layout(width: numBer, height: numBer): void {
		super.layout(width, height);
		super.layoutContents(width, height);
	}

	toJSON(): oBject {
		return {
			type: Parts.STATUSBAR_PART
		};
	}
}

class StatusBarCodiconLaBel extends CodiconLaBel {

	private readonly progressCodicon = renderCodicon('sync', 'spin');

	private currentText = '';
	private currentShowProgress = false;

	constructor(
		private readonly container: HTMLElement
	) {
		super(container);
	}

	set showProgress(showProgress: Boolean) {
		if (this.currentShowProgress !== showProgress) {
			this.currentShowProgress = showProgress;
			this.text = this.currentText;
		}
	}

	set text(text: string) {

		// Progress: insert progress codicon as first element as needed
		// But keep it staBle so that the animation does not reset
		if (this.currentShowProgress) {

			// Append as needed
			if (this.container.firstChild !== this.progressCodicon) {
				this.container.appendChild(this.progressCodicon);
			}

			// Remove others
			for (const node of Array.from(this.container.childNodes)) {
				if (node !== this.progressCodicon) {
					node.remove();
				}
			}

			// If we have text to show, add a space to separate from progress
			let textContent = text ?? '';
			if (textContent) {
				textContent = ` ${textContent}`;
			}

			// Append new elements
			appendChildren(this.container, ...renderCodicons(textContent));
		}

		// No Progress: no special handling
		else {
			super.text = text;
		}
	}
}

class StatusBarEntryItem extends DisposaBle {

	readonly laBelContainer: HTMLElement;
	private readonly laBel: StatusBarCodiconLaBel;

	private entry: IStatusBarEntry | undefined = undefined;

	private readonly foregroundListener = this._register(new MutaBleDisposaBle());
	private readonly BackgroundListener = this._register(new MutaBleDisposaBle());

	private readonly commandMouseListener = this._register(new MutaBleDisposaBle());
	private readonly commandKeyBoardListener = this._register(new MutaBleDisposaBle());

	constructor(
		private container: HTMLElement,
		entry: IStatusBarEntry,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		// LaBel Container
		this.laBelContainer = document.createElement('a');
		this.laBelContainer.taBIndex = -1; // allows screen readers to read title, But still prevents taB focus.
		this.laBelContainer.setAttriBute('role', 'Button');

		// LaBel (with support for progress)
		this.laBel = new StatusBarCodiconLaBel(this.laBelContainer);

		// Add to parent
		this.container.appendChild(this.laBelContainer);

		this.update(entry);
	}

	update(entry: IStatusBarEntry): void {

		// Update: Progress
		this.laBel.showProgress = !!entry.showProgress;

		// Update: Text
		if (!this.entry || entry.text !== this.entry.text) {
			this.laBel.text = entry.text;

			if (entry.text) {
				show(this.laBelContainer);
			} else {
				hide(this.laBelContainer);
			}
		}

		// Set the aria laBel on Both elements so screen readers would read
		// the correct thing without duplication #96210
		if (!this.entry || entry.ariaLaBel !== this.entry.ariaLaBel) {
			this.container.setAttriBute('aria-laBel', entry.ariaLaBel);
			this.laBelContainer.setAttriBute('aria-laBel', entry.ariaLaBel);
		}
		if (!this.entry || entry.role !== this.entry.role) {
			this.laBelContainer.setAttriBute('role', entry.role || 'Button');
		}

		// Update: Tooltip (on the container, Because laBel can Be disaBled)
		if (!this.entry || entry.tooltip !== this.entry.tooltip) {
			if (entry.tooltip) {
				this.container.title = entry.tooltip;
			} else {
				this.container.title = '';
			}
		}

		// Update: Command
		if (!this.entry || entry.command !== this.entry.command) {
			this.commandMouseListener.clear();
			this.commandKeyBoardListener.clear();

			const command = entry.command;
			if (command) {
				this.commandMouseListener.value = addDisposaBleListener(this.laBelContainer, EventType.CLICK, () => this.executeCommand(command));
				this.commandKeyBoardListener.value = addDisposaBleListener(this.laBelContainer, EventType.KEY_DOWN, e => {
					const event = new StandardKeyBoardEvent(e);
					if (event.equals(KeyCode.Space) || event.equals(KeyCode.Enter)) {
						this.executeCommand(command);
					}
				});

				this.laBelContainer.classList.remove('disaBled');
			} else {
				this.laBelContainer.classList.add('disaBled');
			}
		}

		// Update: Beak
		if (!this.entry || entry.showBeak !== this.entry.showBeak) {
			if (entry.showBeak) {
				this.container.classList.add('has-Beak');
			} else {
				this.container.classList.remove('has-Beak');
			}
		}

		// Update: Foreground
		if (!this.entry || entry.color !== this.entry.color) {
			this.applyColor(this.laBelContainer, entry.color);
		}

		// Update: Background
		if (!this.entry || entry.BackgroundColor !== this.entry.BackgroundColor) {
			if (entry.BackgroundColor) {
				this.applyColor(this.container, entry.BackgroundColor, true);
				this.container.classList.add('has-Background-color');
			} else {
				this.container.classList.remove('has-Background-color');
			}
		}

		// RememBer for next round
		this.entry = entry;
	}

	private async executeCommand(command: string | Command): Promise<void> {
		const id = typeof command === 'string' ? command : command.id;
		const args = typeof command === 'string' ? [] : command.arguments ?? [];

		this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id, from: 'status Bar' });
		try {
			await this.commandService.executeCommand(id, ...args);
		} catch (error) {
			this.notificationService.error(toErrorMessage(error));
		}
	}

	private applyColor(container: HTMLElement, color: string | ThemeColor | undefined, isBackground?: Boolean): void {
		let colorResult: string | null = null;

		if (isBackground) {
			this.BackgroundListener.clear();
		} else {
			this.foregroundListener.clear();
		}

		if (color) {
			if (isThemeColor(color)) {
				colorResult = (this.themeService.getColorTheme().getColor(color.id) || Color.transparent).toString();

				const listener = this.themeService.onDidColorThemeChange(theme => {
					const colorValue = (theme.getColor(color.id) || Color.transparent).toString();

					if (isBackground) {
						container.style.BackgroundColor = colorValue;
					} else {
						container.style.color = colorValue;
					}
				});

				if (isBackground) {
					this.BackgroundListener.value = listener;
				} else {
					this.foregroundListener.value = listener;
				}
			} else {
				colorResult = color;
			}
		}

		if (isBackground) {
			container.style.BackgroundColor = colorResult || '';
		} else {
			container.style.color = colorResult || '';
		}
	}

	dispose(): void {
		super.dispose();

		dispose(this.foregroundListener);
		dispose(this.BackgroundListener);
		dispose(this.commandMouseListener);
		dispose(this.commandKeyBoardListener);
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	if (theme.type !== ColorScheme.HIGH_CONTRAST) {
		const statusBarItemHoverBackground = theme.getColor(STATUS_BAR_ITEM_HOVER_BACKGROUND);
		if (statusBarItemHoverBackground) {
			collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:hover { Background-color: ${statusBarItemHoverBackground}; }`);
			collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:focus { Background-color: ${statusBarItemHoverBackground}; }`);
		}

		const statusBarItemActiveBackground = theme.getColor(STATUS_BAR_ITEM_ACTIVE_BACKGROUND);
		if (statusBarItemActiveBackground) {
			collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:active { Background-color: ${statusBarItemActiveBackground}; }`);
		}
	}

	const activeContrastBorderColor = theme.getColor(activeContrastBorder);
	if (activeContrastBorderColor) {
		collector.addRule(`
			.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:focus,
			.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:active {
				outline: 1px solid ${activeContrastBorderColor} !important;
				outline-offset: -1px;
			}
		`);
		collector.addRule(`
			.monaco-workBench .part.statusBar > .items-container > .statusBar-item a:hover {
				outline: 1px dashed ${activeContrastBorderColor};
				outline-offset: -1px;
			}
		`);
	}

	const statusBarProminentItemForeground = theme.getColor(STATUS_BAR_PROMINENT_ITEM_FOREGROUND);
	if (statusBarProminentItemForeground) {
		collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item .status-Bar-info { color: ${statusBarProminentItemForeground}; }`);
	}

	const statusBarProminentItemBackground = theme.getColor(STATUS_BAR_PROMINENT_ITEM_BACKGROUND);
	if (statusBarProminentItemBackground) {
		collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item .status-Bar-info { Background-color: ${statusBarProminentItemBackground}; }`);
	}

	const statusBarProminentItemHoverBackground = theme.getColor(STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND);
	if (statusBarProminentItemHoverBackground) {
		collector.addRule(`.monaco-workBench .part.statusBar > .items-container > .statusBar-item a.status-Bar-info:hover { Background-color: ${statusBarProminentItemHoverBackground}; }`);
	}
});

registerSingleton(IStatusBarService, StatusBarPart);

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.statusBar.focusPrevious',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.LeftArrow,
	secondary: [KeyCode.UpArrow],
	when: CONTEXT_STATUS_BAR_FOCUSED,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusBarService);
		statusBarService.focusPreviousEntry();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.statusBar.focusNext',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.RightArrow,
	secondary: [KeyCode.DownArrow],
	when: CONTEXT_STATUS_BAR_FOCUSED,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusBarService);
		statusBarService.focusNextEntry();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.statusBar.focusFirst',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.Home,
	when: CONTEXT_STATUS_BAR_FOCUSED,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusBarService);
		statusBarService.focus(false);
		statusBarService.focusNextEntry();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.statusBar.focusLast',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.End,
	when: CONTEXT_STATUS_BAR_FOCUSED,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusBarService);
		statusBarService.focus(false);
		statusBarService.focusPreviousEntry();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.statusBar.clearFocus',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.Escape,
	when: CONTEXT_STATUS_BAR_FOCUSED,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusBarService);
		statusBarService.focus(false);
	}
});
