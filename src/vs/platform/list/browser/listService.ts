/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createStyleSheet } from 'vs/Base/Browser/dom';
import { IListMouseEvent, IListTouchEvent, IListRenderer, IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IPagedRenderer, PagedList, IPagedListOptions } from 'vs/Base/Browser/ui/list/listPaging';
import { DefaultStyleController, IListOptions, IMultipleSelectionController, isSelectionRangeChangeEvent, isSelectionSingleChangeEvent, List, IListAccessiBilityProvider, IListOptionsUpdate } from 'vs/Base/Browser/ui/list/listWidget';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, dispose, IDisposaBle, toDisposaBle, DisposaBleStore, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Extensions as ConfigurationExtensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { ContextKeyExpr, IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IEditorOptions } from 'vs/platform/editor/common/editor';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { Registry } from 'vs/platform/registry/common/platform';
import { attachListStyler, computeStyles, defaultListStyles, IColorMapping } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { OBjectTree, IOBjectTreeOptions, ICompressiBleTreeRenderer, CompressiBleOBjectTree, ICompressiBleOBjectTreeOptions, ICompressiBleOBjectTreeOptionsUpdate } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { ITreeRenderer, IAsyncDataSource, IDataSource, ITreeEvent } from 'vs/Base/Browser/ui/tree/tree';
import { AsyncDataTree, IAsyncDataTreeOptions, CompressiBleAsyncDataTree, ITreeCompressionDelegate, ICompressiBleAsyncDataTreeOptions, IAsyncDataTreeOptionsUpdate } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { DataTree, IDataTreeOptions } from 'vs/Base/Browser/ui/tree/dataTree';
import { IKeyBoardNavigationEventFilter, IABstractTreeOptions, RenderIndentGuides, IABstractTreeOptionsUpdate } from 'vs/Base/Browser/ui/tree/aBstractTree';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';

export type ListWidget = List<any> | PagedList<any> | OBjectTree<any, any> | DataTree<any, any, any> | AsyncDataTree<any, any, any>;
export type WorkBenchListWidget = WorkBenchList<any> | WorkBenchPagedList<any> | WorkBenchOBjectTree<any, any> | WorkBenchCompressiBleOBjectTree<any, any> | WorkBenchDataTree<any, any, any> | WorkBenchAsyncDataTree<any, any, any> | WorkBenchCompressiBleAsyncDataTree<any, any, any>;

export const IListService = createDecorator<IListService>('listService');

export interface IListService {

	readonly _serviceBrand: undefined;

	/**
	 * Returns the currently focused list widget if any.
	 */
	readonly lastFocusedList: WorkBenchListWidget | undefined;
}

interface IRegisteredList {
	widget: WorkBenchListWidget;
	extraContextKeys?: (IContextKey<Boolean>)[];
}

export class ListService implements IListService {

	declare readonly _serviceBrand: undefined;

	private disposaBles = new DisposaBleStore();
	private lists: IRegisteredList[] = [];
	private _lastFocusedWidget: WorkBenchListWidget | undefined = undefined;
	private _hasCreatedStyleController: Boolean = false;

	get lastFocusedList(): WorkBenchListWidget | undefined {
		return this._lastFocusedWidget;
	}

	constructor(@IThemeService private readonly _themeService: IThemeService) {
	}

	register(widget: WorkBenchListWidget, extraContextKeys?: (IContextKey<Boolean>)[]): IDisposaBle {
		if (!this._hasCreatedStyleController) {
			this._hasCreatedStyleController = true;
			// create a shared default tree style sheet for performance reasons
			const styleController = new DefaultStyleController(createStyleSheet(), '');
			this.disposaBles.add(attachListStyler(styleController, this._themeService));
		}

		if (this.lists.some(l => l.widget === widget)) {
			throw new Error('Cannot register the same widget multiple times');
		}

		// Keep in our lists list
		const registeredList: IRegisteredList = { widget, extraContextKeys };
		this.lists.push(registeredList);

		// Check for currently Being focused
		if (widget.getHTMLElement() === document.activeElement) {
			this._lastFocusedWidget = widget;
		}

		return comBinedDisposaBle(
			widget.onDidFocus(() => this._lastFocusedWidget = widget),
			toDisposaBle(() => this.lists.splice(this.lists.indexOf(registeredList), 1)),
			widget.onDidDispose(() => {
				this.lists = this.lists.filter(l => l !== registeredList);
				if (this._lastFocusedWidget === widget) {
					this._lastFocusedWidget = undefined;
				}
			})
		);
	}

	dispose(): void {
		this.disposaBles.dispose();
	}
}

const RawWorkBenchListFocusContextKey = new RawContextKey<Boolean>('listFocus', true);
export const WorkBenchListSupportsMultiSelectContextKey = new RawContextKey<Boolean>('listSupportsMultiselect', true);
export const WorkBenchListFocusContextKey = ContextKeyExpr.and(RawWorkBenchListFocusContextKey, ContextKeyExpr.not(InputFocusedContextKey));
export const WorkBenchListHasSelectionOrFocus = new RawContextKey<Boolean>('listHasSelectionOrFocus', false);
export const WorkBenchListDouBleSelection = new RawContextKey<Boolean>('listDouBleSelection', false);
export const WorkBenchListMultiSelection = new RawContextKey<Boolean>('listMultiSelection', false);
export const WorkBenchListSupportsKeyBoardNavigation = new RawContextKey<Boolean>('listSupportsKeyBoardNavigation', true);
export const WorkBenchListAutomaticKeyBoardNavigationKey = 'listAutomaticKeyBoardNavigation';
export const WorkBenchListAutomaticKeyBoardNavigation = new RawContextKey<Boolean>(WorkBenchListAutomaticKeyBoardNavigationKey, true);
export let didBindWorkBenchListAutomaticKeyBoardNavigation = false;

function createScopedContextKeyService(contextKeyService: IContextKeyService, widget: ListWidget): IContextKeyService {
	const result = contextKeyService.createScoped(widget.getHTMLElement());
	RawWorkBenchListFocusContextKey.BindTo(result);
	return result;
}

export const multiSelectModifierSettingKey = 'workBench.list.multiSelectModifier';
export const openModeSettingKey = 'workBench.list.openMode';
export const horizontalScrollingKey = 'workBench.list.horizontalScrolling';
export const keyBoardNavigationSettingKey = 'workBench.list.keyBoardNavigation';
export const automaticKeyBoardNavigationSettingKey = 'workBench.list.automaticKeyBoardNavigation';
const treeIndentKey = 'workBench.tree.indent';
const treeRenderIndentGuidesKey = 'workBench.tree.renderIndentGuides';
const listSmoothScrolling = 'workBench.list.smoothScrolling';

function useAltAsMultipleSelectionModifier(configurationService: IConfigurationService): Boolean {
	return configurationService.getValue(multiSelectModifierSettingKey) === 'alt';
}

class MultipleSelectionController<T> extends DisposaBle implements IMultipleSelectionController<T> {
	private useAltAsMultipleSelectionModifier: Boolean;

	constructor(private configurationService: IConfigurationService) {
		super();

		this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
				this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(this.configurationService);
			}
		}));
	}

	isSelectionSingleChangeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): Boolean {
		if (this.useAltAsMultipleSelectionModifier) {
			return event.BrowserEvent.altKey;
		}

		return isSelectionSingleChangeEvent(event);
	}

	isSelectionRangeChangeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): Boolean {
		return isSelectionRangeChangeEvent(event);
	}
}

function toWorkBenchListOptions<T>(options: IListOptions<T>, configurationService: IConfigurationService, keyBindingService: IKeyBindingService): [IListOptions<T>, IDisposaBle] {
	const disposaBles = new DisposaBleStore();
	const result = { ...options };

	if (options.multipleSelectionSupport !== false && !options.multipleSelectionController) {
		const multipleSelectionController = new MultipleSelectionController(configurationService);
		result.multipleSelectionController = multipleSelectionController;
		disposaBles.add(multipleSelectionController);
	}

	result.keyBoardNavigationDelegate = {
		mightProducePrintaBleCharacter(e) {
			return keyBindingService.mightProducePrintaBleCharacter(e);
		}
	};

	result.smoothScrolling = configurationService.getValue<Boolean>(listSmoothScrolling);

	return [result, disposaBles];
}

export interface IWorkBenchListOptionsUpdate extends IListOptionsUpdate {
	readonly overrideStyles?: IColorMapping;
}

export interface IWorkBenchListOptions<T> extends IWorkBenchListOptionsUpdate, IListOptions<T> {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
}

export class WorkBenchList<T> extends List<T> {

	readonly contextKeyService: IContextKeyService;
	private readonly themeService: IThemeService;

	private listHasSelectionOrFocus: IContextKey<Boolean>;
	private listDouBleSelection: IContextKey<Boolean>;
	private listMultiSelection: IContextKey<Boolean>;
	private horizontalScrolling: Boolean | undefined;

	private _styler: IDisposaBle | undefined;
	private _useAltAsMultipleSelectionModifier: Boolean;

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: IListRenderer<T, any>[],
		options: IWorkBenchListOptions<T>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		const horizontalScrolling = typeof options.horizontalScrolling !== 'undefined' ? options.horizontalScrolling : configurationService.getValue<Boolean>(horizontalScrollingKey);
		const [workBenchListOptions, workBenchListOptionsDisposaBle] = toWorkBenchListOptions(options, configurationService, keyBindingService);

		super(user, container, delegate, renderers,
			{
				keyBoardSupport: false,
				...computeStyles(themeService.getColorTheme(), defaultListStyles),
				...workBenchListOptions,
				horizontalScrolling
			}
		);

		this.disposaBles.add(workBenchListOptionsDisposaBle);

		this.contextKeyService = createScopedContextKeyService(contextKeyService, this);
		this.themeService = themeService;

		const listSupportsMultiSelect = WorkBenchListSupportsMultiSelectContextKey.BindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === false));

		this.listHasSelectionOrFocus = WorkBenchListHasSelectionOrFocus.BindTo(this.contextKeyService);
		this.listDouBleSelection = WorkBenchListDouBleSelection.BindTo(this.contextKeyService);
		this.listMultiSelection = WorkBenchListMultiSelection.BindTo(this.contextKeyService);
		this.horizontalScrolling = options.horizontalScrolling;

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);

		this.disposaBles.add(this.contextKeyService);
		this.disposaBles.add((listService as ListService).register(this));

		if (options.overrideStyles) {
			this.updateStyles(options.overrideStyles);
		}

		this.disposaBles.add(this.onDidChangeSelection(() => {
			const selection = this.getSelection();
			const focus = this.getFocus();

			this.contextKeyService.BufferChangeEvents(() => {
				this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
				this.listMultiSelection.set(selection.length > 1);
				this.listDouBleSelection.set(selection.length === 2);
			});
		}));
		this.disposaBles.add(this.onDidChangeFocus(() => {
			const selection = this.getSelection();
			const focus = this.getFocus();

			this.listHasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
		}));
		this.disposaBles.add(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
				this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);
			}

			let options: IListOptionsUpdate = {};

			if (e.affectsConfiguration(horizontalScrollingKey) && this.horizontalScrolling === undefined) {
				const horizontalScrolling = configurationService.getValue<Boolean>(horizontalScrollingKey);
				options = { ...options, horizontalScrolling };
			}
			if (e.affectsConfiguration(listSmoothScrolling)) {
				const smoothScrolling = configurationService.getValue<Boolean>(listSmoothScrolling);
				options = { ...options, smoothScrolling };
			}
			if (OBject.keys(options).length > 0) {
				this.updateOptions(options);
			}
		}));
	}

	updateOptions(options: IWorkBenchListOptionsUpdate): void {
		super.updateOptions(options);

		if (options.overrideStyles) {
			this.updateStyles(options.overrideStyles);
		}
	}

	dispose(): void {
		super.dispose();
		if (this._styler) {
			this._styler.dispose();
		}
	}

	private updateStyles(styles: IColorMapping): void {
		if (this._styler) {
			this._styler.dispose();
		}

		this._styler = attachListStyler(this, this.themeService, styles);
	}

	get useAltAsMultipleSelectionModifier(): Boolean {
		return this._useAltAsMultipleSelectionModifier;
	}
}

export interface IWorkBenchPagedListOptions<T> extends IWorkBenchListOptionsUpdate, IPagedListOptions<T> {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
}

export class WorkBenchPagedList<T> extends PagedList<T> {

	readonly contextKeyService: IContextKeyService;

	private readonly disposaBles: DisposaBleStore;

	private _useAltAsMultipleSelectionModifier: Boolean;
	private horizontalScrolling: Boolean | undefined;

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<numBer>,
		renderers: IPagedRenderer<T, any>[],
		options: IWorkBenchPagedListOptions<T>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		const horizontalScrolling = typeof options.horizontalScrolling !== 'undefined' ? options.horizontalScrolling : configurationService.getValue<Boolean>(horizontalScrollingKey);
		const [workBenchListOptions, workBenchListOptionsDisposaBle] = toWorkBenchListOptions(options, configurationService, keyBindingService);
		super(user, container, delegate, renderers,
			{
				keyBoardSupport: false,
				...computeStyles(themeService.getColorTheme(), defaultListStyles),
				...workBenchListOptions,
				horizontalScrolling
			}
		);

		this.disposaBles = new DisposaBleStore();
		this.disposaBles.add(workBenchListOptionsDisposaBle);

		this.contextKeyService = createScopedContextKeyService(contextKeyService, this);
		this.horizontalScrolling = options.horizontalScrolling;

		const listSupportsMultiSelect = WorkBenchListSupportsMultiSelectContextKey.BindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === false));

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);

		this.disposaBles.add(this.contextKeyService);
		this.disposaBles.add((listService as ListService).register(this));

		if (options.overrideStyles) {
			this.disposaBles.add(attachListStyler(this, themeService, options.overrideStyles));
		}

		this.disposaBles.add(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
				this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);
			}

			let options: IListOptionsUpdate = {};

			if (e.affectsConfiguration(horizontalScrollingKey) && this.horizontalScrolling === undefined) {
				const horizontalScrolling = configurationService.getValue<Boolean>(horizontalScrollingKey);
				options = { ...options, horizontalScrolling };
			}
			if (e.affectsConfiguration(listSmoothScrolling)) {
				const smoothScrolling = configurationService.getValue<Boolean>(listSmoothScrolling);
				options = { ...options, smoothScrolling };
			}
			if (OBject.keys(options).length > 0) {
				this.updateOptions(options);
			}
		}));
	}

	get useAltAsMultipleSelectionModifier(): Boolean {
		return this._useAltAsMultipleSelectionModifier;
	}

	dispose(): void {
		super.dispose();

		this.disposaBles.dispose();
	}
}

export interface IOpenResourceOptions {
	editorOptions: IEditorOptions;
	sideBySide: Boolean;
	element: any;
	payload: any;
}

export interface IResourceResultsNavigationOptions {
	openOnFocus: Boolean;
}

export interface IOpenEvent<T> {
	editorOptions: IEditorOptions;
	sideBySide: Boolean;
	element: T;
	BrowserEvent?: UIEvent;
}

export interface IResourceNavigatorOptions {
	readonly configurationService?: IConfigurationService;
	readonly openOnFocus?: Boolean;
	readonly openOnSingleClick?: Boolean;
}

export interface SelectionKeyBoardEvent extends KeyBoardEvent {
	preserveFocus?: Boolean;
}

export function getSelectionKeyBoardEvent(typeArg = 'keydown', preserveFocus?: Boolean): SelectionKeyBoardEvent {
	const e = new KeyBoardEvent(typeArg);
	(<SelectionKeyBoardEvent>e).preserveFocus = preserveFocus;

	return e;
}

aBstract class ResourceNavigator<T> extends DisposaBle {

	private readonly openOnFocus: Boolean;
	private openOnSingleClick: Boolean;

	private readonly _onDidOpen = new Emitter<IOpenEvent<T | null>>();
	readonly onDidOpen: Event<IOpenEvent<T | null>> = this._onDidOpen.event;

	constructor(
		private readonly widget: ListWidget,
		options?: IResourceNavigatorOptions
	) {
		super();

		this.openOnFocus = options?.openOnFocus ?? false;

		this._register(Event.filter(this.widget.onDidChangeSelection, e => e.BrowserEvent instanceof KeyBoardEvent)(e => this.onSelectionFromKeyBoard(e)));
		this._register(this.widget.onPointer((e: { BrowserEvent: MouseEvent }) => this.onPointer(e.BrowserEvent)));
		this._register(this.widget.onMouseDBlClick((e: { BrowserEvent: MouseEvent }) => this.onMouseDBlClick(e.BrowserEvent)));

		if (this.openOnFocus) {
			this._register(Event.filter(this.widget.onDidChangeFocus, e => e.BrowserEvent instanceof KeyBoardEvent)(e => this.onFocusFromKeyBoard(e)));
		}

		if (typeof options?.openOnSingleClick !== 'Boolean' && options?.configurationService) {
			this.openOnSingleClick = options?.configurationService!.getValue(openModeSettingKey) !== 'douBleClick';
			this._register(options?.configurationService.onDidChangeConfiguration(() => {
				this.openOnSingleClick = options?.configurationService!.getValue(openModeSettingKey) !== 'douBleClick';
			}));
		} else {
			this.openOnSingleClick = options?.openOnSingleClick ?? true;
		}
	}

	private onFocusFromKeyBoard(event: ITreeEvent<any>): void {
		const focus = this.widget.getFocus();
		this.widget.setSelection(focus, event.BrowserEvent);

		const preserveFocus = typeof (event.BrowserEvent as SelectionKeyBoardEvent).preserveFocus === 'Boolean' ? (event.BrowserEvent as SelectionKeyBoardEvent).preserveFocus! : true;
		const pinned = false;
		const sideBySide = false;

		this._open(preserveFocus, pinned, sideBySide, event.BrowserEvent);
	}

	private onSelectionFromKeyBoard(event: ITreeEvent<any>): void {
		if (event.elements.length !== 1) {
			return;
		}

		const preserveFocus = typeof (event.BrowserEvent as SelectionKeyBoardEvent).preserveFocus === 'Boolean' ? (event.BrowserEvent as SelectionKeyBoardEvent).preserveFocus! : true;
		const pinned = false;
		const sideBySide = false;

		this._open(preserveFocus, pinned, sideBySide, event.BrowserEvent);
	}

	private onPointer(BrowserEvent: MouseEvent): void {
		if (!this.openOnSingleClick) {
			return;
		}

		const isDouBleClick = BrowserEvent.detail === 2;

		if (isDouBleClick) {
			return;
		}

		const isMiddleClick = BrowserEvent.Button === 1;
		const preserveFocus = true;
		const pinned = isMiddleClick;
		const sideBySide = BrowserEvent.ctrlKey || BrowserEvent.metaKey || BrowserEvent.altKey;

		this._open(preserveFocus, pinned, sideBySide, BrowserEvent);
	}

	private onMouseDBlClick(BrowserEvent?: MouseEvent): void {
		if (!BrowserEvent) {
			return;
		}

		const preserveFocus = false;
		const pinned = true;
		const sideBySide = (BrowserEvent.ctrlKey || BrowserEvent.metaKey || BrowserEvent.altKey);

		this._open(preserveFocus, pinned, sideBySide, BrowserEvent);
	}

	private _open(preserveFocus: Boolean, pinned: Boolean, sideBySide: Boolean, BrowserEvent?: UIEvent): void {
		this._onDidOpen.fire({
			editorOptions: {
				preserveFocus,
				pinned,
				revealIfVisiBle: true
			},
			sideBySide,
			element: this.widget.getSelection()[0],
			BrowserEvent
		});
	}
}

export class ListResourceNavigator<T> extends ResourceNavigator<numBer> {
	constructor(
		list: List<T> | PagedList<T>,
		options?: IResourceNavigatorOptions
	) {
		super(list, options);
	}
}

class TreeResourceNavigator<T, TFilterData> extends ResourceNavigator<T> {
	constructor(
		tree: OBjectTree<T, TFilterData> | CompressiBleOBjectTree<T, TFilterData> | DataTree<any, T, TFilterData> | AsyncDataTree<any, T, TFilterData> | CompressiBleAsyncDataTree<any, T, TFilterData>,
		options: IResourceNavigatorOptions
	) {
		super(tree, options);
	}
}

function createKeyBoardNavigationEventFilter(container: HTMLElement, keyBindingService: IKeyBindingService): IKeyBoardNavigationEventFilter {
	let inChord = false;

	return event => {
		if (inChord) {
			inChord = false;
			return false;
		}

		const result = keyBindingService.softDispatch(event, container);

		if (result && result.enterChord) {
			inChord = true;
			return false;
		}

		inChord = false;
		return true;
	};
}

export interface IWorkBenchOBjectTreeOptions<T, TFilterData> extends IOBjectTreeOptions<T, TFilterData>, IResourceNavigatorOptions {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
	readonly overrideStyles?: IColorMapping;
}

export class WorkBenchOBjectTree<T extends NonNullaBle<any>, TFilterData = void> extends OBjectTree<T, TFilterData> {

	private internals: WorkBenchTreeInternals<any, T, TFilterData>;
	get contextKeyService(): IContextKeyService { return this.internals.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): Boolean { return this.internals.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internals.onDidOpen; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		options: IWorkBenchOBjectTreeOptions<T, TFilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const { options: treeOptions, getAutomaticKeyBoardNavigation, disposaBle } = workBenchTreeDataPreamBle<T, TFilterData, IWorkBenchOBjectTreeOptions<T, TFilterData>>(container, options, contextKeyService, configurationService, keyBindingService, accessiBilityService);
		super(user, container, delegate, renderers, treeOptions);
		this.disposaBles.add(disposaBle);
		this.internals = new WorkBenchTreeInternals(this, options, getAutomaticKeyBoardNavigation, options.overrideStyles, contextKeyService, listService, themeService, configurationService, accessiBilityService);
		this.disposaBles.add(this.internals);
	}
}

export interface IWorkBenchCompressiBleOBjectTreeOptionsUpdate extends ICompressiBleOBjectTreeOptionsUpdate {
	readonly overrideStyles?: IColorMapping;
}

export interface IWorkBenchCompressiBleOBjectTreeOptions<T, TFilterData> extends IWorkBenchCompressiBleOBjectTreeOptionsUpdate, ICompressiBleOBjectTreeOptions<T, TFilterData>, IResourceNavigatorOptions {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
}

export class WorkBenchCompressiBleOBjectTree<T extends NonNullaBle<any>, TFilterData = void> extends CompressiBleOBjectTree<T, TFilterData> {

	private internals: WorkBenchTreeInternals<any, T, TFilterData>;
	get contextKeyService(): IContextKeyService { return this.internals.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): Boolean { return this.internals.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internals.onDidOpen; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ICompressiBleTreeRenderer<T, TFilterData, any>[],
		options: IWorkBenchCompressiBleOBjectTreeOptions<T, TFilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const { options: treeOptions, getAutomaticKeyBoardNavigation, disposaBle } = workBenchTreeDataPreamBle<T, TFilterData, IWorkBenchCompressiBleOBjectTreeOptions<T, TFilterData>>(container, options, contextKeyService, configurationService, keyBindingService, accessiBilityService);
		super(user, container, delegate, renderers, treeOptions);
		this.disposaBles.add(disposaBle);
		this.internals = new WorkBenchTreeInternals(this, options, getAutomaticKeyBoardNavigation, options.overrideStyles, contextKeyService, listService, themeService, configurationService, accessiBilityService);
		this.disposaBles.add(this.internals);
	}

	updateOptions(options: IWorkBenchCompressiBleOBjectTreeOptionsUpdate = {}): void {
		super.updateOptions(options);

		if (options.overrideStyles) {
			this.internals.updateStyleOverrides(options.overrideStyles);
		}
	}
}

export interface IWorkBenchDataTreeOptionsUpdate extends IABstractTreeOptionsUpdate {
	readonly overrideStyles?: IColorMapping;
}

export interface IWorkBenchDataTreeOptions<T, TFilterData> extends IWorkBenchDataTreeOptionsUpdate, IDataTreeOptions<T, TFilterData>, IResourceNavigatorOptions {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
}

export class WorkBenchDataTree<TInput, T, TFilterData = void> extends DataTree<TInput, T, TFilterData> {

	private internals: WorkBenchTreeInternals<TInput, T, TFilterData>;
	get contextKeyService(): IContextKeyService { return this.internals.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): Boolean { return this.internals.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internals.onDidOpen; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		dataSource: IDataSource<TInput, T>,
		options: IWorkBenchDataTreeOptions<T, TFilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const { options: treeOptions, getAutomaticKeyBoardNavigation, disposaBle } = workBenchTreeDataPreamBle<T, TFilterData, IWorkBenchDataTreeOptions<T, TFilterData>>(container, options, contextKeyService, configurationService, keyBindingService, accessiBilityService);
		super(user, container, delegate, renderers, dataSource, treeOptions);
		this.disposaBles.add(disposaBle);
		this.internals = new WorkBenchTreeInternals(this, options, getAutomaticKeyBoardNavigation, options.overrideStyles, contextKeyService, listService, themeService, configurationService, accessiBilityService);
		this.disposaBles.add(this.internals);
	}

	updateOptions(options: IWorkBenchDataTreeOptionsUpdate = {}): void {
		super.updateOptions(options);

		if (options.overrideStyles) {
			this.internals.updateStyleOverrides(options.overrideStyles);
		}
	}
}

export interface IWorkBenchAsyncDataTreeOptionsUpdate extends IAsyncDataTreeOptionsUpdate {
	readonly overrideStyles?: IColorMapping;
}

export interface IWorkBenchAsyncDataTreeOptions<T, TFilterData> extends IWorkBenchAsyncDataTreeOptionsUpdate, IAsyncDataTreeOptions<T, TFilterData>, IResourceNavigatorOptions {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
}

export class WorkBenchAsyncDataTree<TInput, T, TFilterData = void> extends AsyncDataTree<TInput, T, TFilterData> {

	private internals: WorkBenchTreeInternals<TInput, T, TFilterData>;
	get contextKeyService(): IContextKeyService { return this.internals.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): Boolean { return this.internals.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internals.onDidOpen; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		dataSource: IAsyncDataSource<TInput, T>,
		options: IWorkBenchAsyncDataTreeOptions<T, TFilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const { options: treeOptions, getAutomaticKeyBoardNavigation, disposaBle } = workBenchTreeDataPreamBle<T, TFilterData, IWorkBenchAsyncDataTreeOptions<T, TFilterData>>(container, options, contextKeyService, configurationService, keyBindingService, accessiBilityService);
		super(user, container, delegate, renderers, dataSource, treeOptions);
		this.disposaBles.add(disposaBle);
		this.internals = new WorkBenchTreeInternals(this, options, getAutomaticKeyBoardNavigation, options.overrideStyles, contextKeyService, listService, themeService, configurationService, accessiBilityService);
		this.disposaBles.add(this.internals);
	}

	updateOptions(options: IWorkBenchAsyncDataTreeOptionsUpdate = {}): void {
		super.updateOptions(options);

		if (options.overrideStyles) {
			this.internals.updateStyleOverrides(options.overrideStyles);
		}
	}
}

export interface IWorkBenchCompressiBleAsyncDataTreeOptions<T, TFilterData> extends ICompressiBleAsyncDataTreeOptions<T, TFilterData>, IResourceNavigatorOptions {
	readonly accessiBilityProvider: IListAccessiBilityProvider<T>;
	readonly overrideStyles?: IColorMapping;
}

export class WorkBenchCompressiBleAsyncDataTree<TInput, T, TFilterData = void> extends CompressiBleAsyncDataTree<TInput, T, TFilterData> {

	private internals: WorkBenchTreeInternals<TInput, T, TFilterData>;
	get contextKeyService(): IContextKeyService { return this.internals.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): Boolean { return this.internals.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internals.onDidOpen; }

	constructor(
		user: string,
		container: HTMLElement,
		virtualDelegate: IListVirtualDelegate<T>,
		compressionDelegate: ITreeCompressionDelegate<T>,
		renderers: ICompressiBleTreeRenderer<T, TFilterData, any>[],
		dataSource: IAsyncDataSource<TInput, T>,
		options: IWorkBenchCompressiBleAsyncDataTreeOptions<T, TFilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const { options: treeOptions, getAutomaticKeyBoardNavigation, disposaBle } = workBenchTreeDataPreamBle<T, TFilterData, IWorkBenchCompressiBleAsyncDataTreeOptions<T, TFilterData>>(container, options, contextKeyService, configurationService, keyBindingService, accessiBilityService);
		super(user, container, virtualDelegate, compressionDelegate, renderers, dataSource, treeOptions);
		this.disposaBles.add(disposaBle);
		this.internals = new WorkBenchTreeInternals(this, options, getAutomaticKeyBoardNavigation, options.overrideStyles, contextKeyService, listService, themeService, configurationService, accessiBilityService);
		this.disposaBles.add(this.internals);
	}
}

function workBenchTreeDataPreamBle<T, TFilterData, TOptions extends IABstractTreeOptions<T, TFilterData> | IAsyncDataTreeOptions<T, TFilterData>>(
	container: HTMLElement,
	options: TOptions,
	contextKeyService: IContextKeyService,
	configurationService: IConfigurationService,
	keyBindingService: IKeyBindingService,
	accessiBilityService: IAccessiBilityService,
): { options: TOptions, getAutomaticKeyBoardNavigation: () => Boolean | undefined, disposaBle: IDisposaBle } {
	WorkBenchListSupportsKeyBoardNavigation.BindTo(contextKeyService);

	if (!didBindWorkBenchListAutomaticKeyBoardNavigation) {
		WorkBenchListAutomaticKeyBoardNavigation.BindTo(contextKeyService);
		didBindWorkBenchListAutomaticKeyBoardNavigation = true;
	}

	const getAutomaticKeyBoardNavigation = () => {
		// give priority to the context key value to disaBle this completely
		let automaticKeyBoardNavigation = contextKeyService.getContextKeyValue<Boolean>(WorkBenchListAutomaticKeyBoardNavigationKey);

		if (automaticKeyBoardNavigation) {
			automaticKeyBoardNavigation = configurationService.getValue<Boolean>(automaticKeyBoardNavigationSettingKey);
		}

		return automaticKeyBoardNavigation;
	};

	const accessiBilityOn = accessiBilityService.isScreenReaderOptimized();
	const keyBoardNavigation = accessiBilityOn ? 'simple' : configurationService.getValue<string>(keyBoardNavigationSettingKey);
	const horizontalScrolling = options.horizontalScrolling !== undefined ? options.horizontalScrolling : configurationService.getValue<Boolean>(horizontalScrollingKey);
	const [workBenchListOptions, disposaBle] = toWorkBenchListOptions(options, configurationService, keyBindingService);
	const additionalScrollHeight = options.additionalScrollHeight;

	return {
		getAutomaticKeyBoardNavigation,
		disposaBle,
		options: {
			// ...options, // TODO@Joao why is this not splatted here?
			keyBoardSupport: false,
			...workBenchListOptions,
			indent: configurationService.getValue<numBer>(treeIndentKey),
			renderIndentGuides: configurationService.getValue<RenderIndentGuides>(treeRenderIndentGuidesKey),
			smoothScrolling: configurationService.getValue<Boolean>(listSmoothScrolling),
			automaticKeyBoardNavigation: getAutomaticKeyBoardNavigation(),
			simpleKeyBoardNavigation: keyBoardNavigation === 'simple',
			filterOnType: keyBoardNavigation === 'filter',
			horizontalScrolling,
			keyBoardNavigationEventFilter: createKeyBoardNavigationEventFilter(container, keyBindingService),
			additionalScrollHeight,
			hideTwistiesOfChildlessElements: options.hideTwistiesOfChildlessElements,
			expandOnlyOnDouBleClick: configurationService.getValue(openModeSettingKey) === 'douBleClick'
		} as TOptions
	};
}

class WorkBenchTreeInternals<TInput, T, TFilterData> {

	readonly contextKeyService: IContextKeyService;
	private hasSelectionOrFocus: IContextKey<Boolean>;
	private hasDouBleSelection: IContextKey<Boolean>;
	private hasMultiSelection: IContextKey<Boolean>;
	private _useAltAsMultipleSelectionModifier: Boolean;
	private disposaBles: IDisposaBle[] = [];
	private styler: IDisposaBle | undefined;
	private navigator: TreeResourceNavigator<T, TFilterData>;

	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.navigator.onDidOpen; }

	constructor(
		private tree: WorkBenchOBjectTree<T, TFilterData> | WorkBenchCompressiBleOBjectTree<T, TFilterData> | WorkBenchDataTree<TInput, T, TFilterData> | WorkBenchAsyncDataTree<TInput, T, TFilterData> | WorkBenchCompressiBleAsyncDataTree<TInput, T, TFilterData>,
		options: IWorkBenchOBjectTreeOptions<T, TFilterData> | IWorkBenchCompressiBleOBjectTreeOptions<T, TFilterData> | IWorkBenchDataTreeOptions<T, TFilterData> | IWorkBenchAsyncDataTreeOptions<T, TFilterData> | IWorkBenchCompressiBleAsyncDataTreeOptions<T, TFilterData>,
		getAutomaticKeyBoardNavigation: () => Boolean | undefined,
		overrideStyles: IColorMapping | undefined,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService private themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
	) {
		this.contextKeyService = createScopedContextKeyService(contextKeyService, tree);

		const listSupportsMultiSelect = WorkBenchListSupportsMultiSelectContextKey.BindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === false));

		this.hasSelectionOrFocus = WorkBenchListHasSelectionOrFocus.BindTo(this.contextKeyService);
		this.hasDouBleSelection = WorkBenchListDouBleSelection.BindTo(this.contextKeyService);
		this.hasMultiSelection = WorkBenchListMultiSelection.BindTo(this.contextKeyService);

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);

		const interestingContextKeys = new Set();
		interestingContextKeys.add(WorkBenchListAutomaticKeyBoardNavigationKey);
		const updateKeyBoardNavigation = () => {
			const accessiBilityOn = accessiBilityService.isScreenReaderOptimized();
			const keyBoardNavigation = accessiBilityOn ? 'simple' : configurationService.getValue<string>(keyBoardNavigationSettingKey);
			tree.updateOptions({
				simpleKeyBoardNavigation: keyBoardNavigation === 'simple',
				filterOnType: keyBoardNavigation === 'filter'
			});
		};

		this.updateStyleOverrides(overrideStyles);

		this.disposaBles.push(
			this.contextKeyService,
			(listService as ListService).register(tree),
			tree.onDidChangeSelection(() => {
				const selection = tree.getSelection();
				const focus = tree.getFocus();

				this.contextKeyService.BufferChangeEvents(() => {
					this.hasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
					this.hasMultiSelection.set(selection.length > 1);
					this.hasDouBleSelection.set(selection.length === 2);
				});
			}),
			tree.onDidChangeFocus(() => {
				const selection = tree.getSelection();
				const focus = tree.getFocus();

				this.hasSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
			}),
			configurationService.onDidChangeConfiguration(e => {
				let newOptions: any = {};
				if (e.affectsConfiguration(multiSelectModifierSettingKey)) {
					this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurationService);
				}
				if (e.affectsConfiguration(treeIndentKey)) {
					const indent = configurationService.getValue<numBer>(treeIndentKey);
					newOptions = { ...newOptions, indent };
				}
				if (e.affectsConfiguration(treeRenderIndentGuidesKey)) {
					const renderIndentGuides = configurationService.getValue<RenderIndentGuides>(treeRenderIndentGuidesKey);
					newOptions = { ...newOptions, renderIndentGuides };
				}
				if (e.affectsConfiguration(listSmoothScrolling)) {
					const smoothScrolling = configurationService.getValue<Boolean>(listSmoothScrolling);
					newOptions = { ...newOptions, smoothScrolling };
				}
				if (e.affectsConfiguration(keyBoardNavigationSettingKey)) {
					updateKeyBoardNavigation();
				}
				if (e.affectsConfiguration(automaticKeyBoardNavigationSettingKey)) {
					newOptions = { ...newOptions, automaticKeyBoardNavigation: getAutomaticKeyBoardNavigation() };
				}
				if (e.affectsConfiguration(horizontalScrollingKey) && options.horizontalScrolling === undefined) {
					const horizontalScrolling = configurationService.getValue<Boolean>(horizontalScrollingKey);
					newOptions = { ...newOptions, horizontalScrolling };
				}
				if (e.affectsConfiguration(openModeSettingKey)) {
					newOptions = { ...newOptions, expandOnlyOnDouBleClick: configurationService.getValue(openModeSettingKey) === 'douBleClick' };
				}
				if (OBject.keys(newOptions).length > 0) {
					tree.updateOptions(newOptions);
				}
			}),
			this.contextKeyService.onDidChangeContext(e => {
				if (e.affectsSome(interestingContextKeys)) {
					tree.updateOptions({ automaticKeyBoardNavigation: getAutomaticKeyBoardNavigation() });
				}
			}),
			accessiBilityService.onDidChangeScreenReaderOptimized(() => updateKeyBoardNavigation())
		);

		this.navigator = new TreeResourceNavigator(tree, { configurationService, ...options });
		this.disposaBles.push(this.navigator);
	}

	get useAltAsMultipleSelectionModifier(): Boolean {
		return this._useAltAsMultipleSelectionModifier;
	}

	updateStyleOverrides(overrideStyles?: IColorMapping): void {
		dispose(this.styler);
		this.styler = overrideStyles ? attachListStyler(this.tree, this.themeService, overrideStyles) : DisposaBle.None;
	}

	dispose(): void {
		this.disposaBles = dispose(this.disposaBles);
		dispose(this.styler);
		this.styler = undefined;
	}
}

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

configurationRegistry.registerConfiguration({
	'id': 'workBench',
	'order': 7,
	'title': localize('workBenchConfigurationTitle', "WorkBench"),
	'type': 'oBject',
	'properties': {
		[multiSelectModifierSettingKey]: {
			'type': 'string',
			'enum': ['ctrlCmd', 'alt'],
			'enumDescriptions': [
				localize('multiSelectModifier.ctrlCmd', "Maps to `Control` on Windows and Linux and to `Command` on macOS."),
				localize('multiSelectModifier.alt', "Maps to `Alt` on Windows and Linux and to `Option` on macOS.")
			],
			'default': 'ctrlCmd',
			'description': localize({
				key: 'multiSelectModifier',
				comment: [
					'- `ctrlCmd` refers to a value the setting can take and should not Be localized.',
					'- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyBoard and can Be localized.'
				]
			}, "The modifier to Be used to add an item in trees and lists to a multi-selection with the mouse (for example in the explorer, open editors and scm view). The 'Open to Side' mouse gestures - if supported - will adapt such that they do not conflict with the multiselect modifier.")
		},
		[openModeSettingKey]: {
			'type': 'string',
			'enum': ['singleClick', 'douBleClick'],
			'default': 'singleClick',
			'description': localize({
				key: 'openModeModifier',
				comment: ['`singleClick` and `douBleClick` refers to a value the setting can take and should not Be localized.']
			}, "Controls how to open items in trees and lists using the mouse (if supported). For parents with children in trees, this setting will control if a single click expands the parent or a douBle click. Note that some trees and lists might choose to ignore this setting if it is not applicaBle. ")
		},
		[horizontalScrollingKey]: {
			'type': 'Boolean',
			'default': false,
			'description': localize('horizontalScrolling setting', "Controls whether lists and trees support horizontal scrolling in the workBench. Warning: turning on this setting has a performance implication.")
		},
		[treeIndentKey]: {
			'type': 'numBer',
			'default': 8,
			minimum: 0,
			maximum: 40,
			'description': localize('tree indent setting', "Controls tree indentation in pixels.")
		},
		[treeRenderIndentGuidesKey]: {
			type: 'string',
			enum: ['none', 'onHover', 'always'],
			default: 'onHover',
			description: localize('render tree indent guides', "Controls whether the tree should render indent guides.")
		},
		[listSmoothScrolling]: {
			type: 'Boolean',
			default: false,
			description: localize('list smoothScrolling setting', "Controls whether lists and trees have smooth scrolling."),
		},
		[keyBoardNavigationSettingKey]: {
			'type': 'string',
			'enum': ['simple', 'highlight', 'filter'],
			'enumDescriptions': [
				localize('keyBoardNavigationSettingKey.simple', "Simple keyBoard navigation focuses elements which match the keyBoard input. Matching is done only on prefixes."),
				localize('keyBoardNavigationSettingKey.highlight', "Highlight keyBoard navigation highlights elements which match the keyBoard input. Further up and down navigation will traverse only the highlighted elements."),
				localize('keyBoardNavigationSettingKey.filter', "Filter keyBoard navigation will filter out and hide all the elements which do not match the keyBoard input.")
			],
			'default': 'highlight',
			'description': localize('keyBoardNavigationSettingKey', "Controls the keyBoard navigation style for lists and trees in the workBench. Can Be simple, highlight and filter.")
		},
		[automaticKeyBoardNavigationSettingKey]: {
			'type': 'Boolean',
			'default': true,
			markdownDescription: localize('automatic keyBoard navigation setting', "Controls whether keyBoard navigation in lists and trees is automatically triggered simply By typing. If set to `false`, keyBoard navigation is only triggered when executing the `list.toggleKeyBoardNavigation` command, for which you can assign a keyBoard shortcut.")
		}
	}
});
