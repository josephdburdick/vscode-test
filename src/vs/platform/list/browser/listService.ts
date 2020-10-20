/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteStyleSheet } from 'vs/bAse/browser/dom';
import { IListMouseEvent, IListTouchEvent, IListRenderer, IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { IPAgedRenderer, PAgedList, IPAgedListOptions } from 'vs/bAse/browser/ui/list/listPAging';
import { DefAultStyleController, IListOptions, IMultipleSelectionController, isSelectionRAngeChAngeEvent, isSelectionSingleChAngeEvent, List, IListAccessibilityProvider, IListOptionsUpdAte } from 'vs/bAse/browser/ui/list/listWidget';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, dispose, IDisposAble, toDisposAble, DisposAbleStore, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { locAlize } from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { Extensions As ConfigurAtionExtensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { ContextKeyExpr, IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IEditorOptions } from 'vs/plAtform/editor/common/editor';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { AttAchListStyler, computeStyles, defAultListStyles, IColorMApping } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { InputFocusedContextKey } from 'vs/plAtform/contextkey/common/contextkeys';
import { ObjectTree, IObjectTreeOptions, ICompressibleTreeRenderer, CompressibleObjectTree, ICompressibleObjectTreeOptions, ICompressibleObjectTreeOptionsUpdAte } from 'vs/bAse/browser/ui/tree/objectTree';
import { ITreeRenderer, IAsyncDAtASource, IDAtASource, ITreeEvent } from 'vs/bAse/browser/ui/tree/tree';
import { AsyncDAtATree, IAsyncDAtATreeOptions, CompressibleAsyncDAtATree, ITreeCompressionDelegAte, ICompressibleAsyncDAtATreeOptions, IAsyncDAtATreeOptionsUpdAte } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { DAtATree, IDAtATreeOptions } from 'vs/bAse/browser/ui/tree/dAtATree';
import { IKeyboArdNAvigAtionEventFilter, IAbstrActTreeOptions, RenderIndentGuides, IAbstrActTreeOptionsUpdAte } from 'vs/bAse/browser/ui/tree/AbstrActTree';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';

export type ListWidget = List<Any> | PAgedList<Any> | ObjectTree<Any, Any> | DAtATree<Any, Any, Any> | AsyncDAtATree<Any, Any, Any>;
export type WorkbenchListWidget = WorkbenchList<Any> | WorkbenchPAgedList<Any> | WorkbenchObjectTree<Any, Any> | WorkbenchCompressibleObjectTree<Any, Any> | WorkbenchDAtATree<Any, Any, Any> | WorkbenchAsyncDAtATree<Any, Any, Any> | WorkbenchCompressibleAsyncDAtATree<Any, Any, Any>;

export const IListService = creAteDecorAtor<IListService>('listService');

export interfAce IListService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Returns the currently focused list widget if Any.
	 */
	reAdonly lAstFocusedList: WorkbenchListWidget | undefined;
}

interfAce IRegisteredList {
	widget: WorkbenchListWidget;
	extrAContextKeys?: (IContextKey<booleAn>)[];
}

export clAss ListService implements IListService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte disposAbles = new DisposAbleStore();
	privAte lists: IRegisteredList[] = [];
	privAte _lAstFocusedWidget: WorkbenchListWidget | undefined = undefined;
	privAte _hAsCreAtedStyleController: booleAn = fAlse;

	get lAstFocusedList(): WorkbenchListWidget | undefined {
		return this._lAstFocusedWidget;
	}

	constructor(@IThemeService privAte reAdonly _themeService: IThemeService) {
	}

	register(widget: WorkbenchListWidget, extrAContextKeys?: (IContextKey<booleAn>)[]): IDisposAble {
		if (!this._hAsCreAtedStyleController) {
			this._hAsCreAtedStyleController = true;
			// creAte A shAred defAult tree style sheet for performAnce reAsons
			const styleController = new DefAultStyleController(creAteStyleSheet(), '');
			this.disposAbles.Add(AttAchListStyler(styleController, this._themeService));
		}

		if (this.lists.some(l => l.widget === widget)) {
			throw new Error('CAnnot register the sAme widget multiple times');
		}

		// Keep in our lists list
		const registeredList: IRegisteredList = { widget, extrAContextKeys };
		this.lists.push(registeredList);

		// Check for currently being focused
		if (widget.getHTMLElement() === document.ActiveElement) {
			this._lAstFocusedWidget = widget;
		}

		return combinedDisposAble(
			widget.onDidFocus(() => this._lAstFocusedWidget = widget),
			toDisposAble(() => this.lists.splice(this.lists.indexOf(registeredList), 1)),
			widget.onDidDispose(() => {
				this.lists = this.lists.filter(l => l !== registeredList);
				if (this._lAstFocusedWidget === widget) {
					this._lAstFocusedWidget = undefined;
				}
			})
		);
	}

	dispose(): void {
		this.disposAbles.dispose();
	}
}

const RAwWorkbenchListFocusContextKey = new RAwContextKey<booleAn>('listFocus', true);
export const WorkbenchListSupportsMultiSelectContextKey = new RAwContextKey<booleAn>('listSupportsMultiselect', true);
export const WorkbenchListFocusContextKey = ContextKeyExpr.And(RAwWorkbenchListFocusContextKey, ContextKeyExpr.not(InputFocusedContextKey));
export const WorkbenchListHAsSelectionOrFocus = new RAwContextKey<booleAn>('listHAsSelectionOrFocus', fAlse);
export const WorkbenchListDoubleSelection = new RAwContextKey<booleAn>('listDoubleSelection', fAlse);
export const WorkbenchListMultiSelection = new RAwContextKey<booleAn>('listMultiSelection', fAlse);
export const WorkbenchListSupportsKeyboArdNAvigAtion = new RAwContextKey<booleAn>('listSupportsKeyboArdNAvigAtion', true);
export const WorkbenchListAutomAticKeyboArdNAvigAtionKey = 'listAutomAticKeyboArdNAvigAtion';
export const WorkbenchListAutomAticKeyboArdNAvigAtion = new RAwContextKey<booleAn>(WorkbenchListAutomAticKeyboArdNAvigAtionKey, true);
export let didBindWorkbenchListAutomAticKeyboArdNAvigAtion = fAlse;

function creAteScopedContextKeyService(contextKeyService: IContextKeyService, widget: ListWidget): IContextKeyService {
	const result = contextKeyService.creAteScoped(widget.getHTMLElement());
	RAwWorkbenchListFocusContextKey.bindTo(result);
	return result;
}

export const multiSelectModifierSettingKey = 'workbench.list.multiSelectModifier';
export const openModeSettingKey = 'workbench.list.openMode';
export const horizontAlScrollingKey = 'workbench.list.horizontAlScrolling';
export const keyboArdNAvigAtionSettingKey = 'workbench.list.keyboArdNAvigAtion';
export const AutomAticKeyboArdNAvigAtionSettingKey = 'workbench.list.AutomAticKeyboArdNAvigAtion';
const treeIndentKey = 'workbench.tree.indent';
const treeRenderIndentGuidesKey = 'workbench.tree.renderIndentGuides';
const listSmoothScrolling = 'workbench.list.smoothScrolling';

function useAltAsMultipleSelectionModifier(configurAtionService: IConfigurAtionService): booleAn {
	return configurAtionService.getVAlue(multiSelectModifierSettingKey) === 'Alt';
}

clAss MultipleSelectionController<T> extends DisposAble implements IMultipleSelectionController<T> {
	privAte useAltAsMultipleSelectionModifier: booleAn;

	constructor(privAte configurAtionService: IConfigurAtionService) {
		super();

		this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(multiSelectModifierSettingKey)) {
				this.useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(this.configurAtionService);
			}
		}));
	}

	isSelectionSingleChAngeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): booleAn {
		if (this.useAltAsMultipleSelectionModifier) {
			return event.browserEvent.AltKey;
		}

		return isSelectionSingleChAngeEvent(event);
	}

	isSelectionRAngeChAngeEvent(event: IListMouseEvent<T> | IListTouchEvent<T>): booleAn {
		return isSelectionRAngeChAngeEvent(event);
	}
}

function toWorkbenchListOptions<T>(options: IListOptions<T>, configurAtionService: IConfigurAtionService, keybindingService: IKeybindingService): [IListOptions<T>, IDisposAble] {
	const disposAbles = new DisposAbleStore();
	const result = { ...options };

	if (options.multipleSelectionSupport !== fAlse && !options.multipleSelectionController) {
		const multipleSelectionController = new MultipleSelectionController(configurAtionService);
		result.multipleSelectionController = multipleSelectionController;
		disposAbles.Add(multipleSelectionController);
	}

	result.keyboArdNAvigAtionDelegAte = {
		mightProducePrintAbleChArActer(e) {
			return keybindingService.mightProducePrintAbleChArActer(e);
		}
	};

	result.smoothScrolling = configurAtionService.getVAlue<booleAn>(listSmoothScrolling);

	return [result, disposAbles];
}

export interfAce IWorkbenchListOptionsUpdAte extends IListOptionsUpdAte {
	reAdonly overrideStyles?: IColorMApping;
}

export interfAce IWorkbenchListOptions<T> extends IWorkbenchListOptionsUpdAte, IListOptions<T> {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
}

export clAss WorkbenchList<T> extends List<T> {

	reAdonly contextKeyService: IContextKeyService;
	privAte reAdonly themeService: IThemeService;

	privAte listHAsSelectionOrFocus: IContextKey<booleAn>;
	privAte listDoubleSelection: IContextKey<booleAn>;
	privAte listMultiSelection: IContextKey<booleAn>;
	privAte horizontAlScrolling: booleAn | undefined;

	privAte _styler: IDisposAble | undefined;
	privAte _useAltAsMultipleSelectionModifier: booleAn;

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: IListRenderer<T, Any>[],
		options: IWorkbenchListOptions<T>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		const horizontAlScrolling = typeof options.horizontAlScrolling !== 'undefined' ? options.horizontAlScrolling : configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
		const [workbenchListOptions, workbenchListOptionsDisposAble] = toWorkbenchListOptions(options, configurAtionService, keybindingService);

		super(user, contAiner, delegAte, renderers,
			{
				keyboArdSupport: fAlse,
				...computeStyles(themeService.getColorTheme(), defAultListStyles),
				...workbenchListOptions,
				horizontAlScrolling
			}
		);

		this.disposAbles.Add(workbenchListOptionsDisposAble);

		this.contextKeyService = creAteScopedContextKeyService(contextKeyService, this);
		this.themeService = themeService;

		const listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === fAlse));

		this.listHAsSelectionOrFocus = WorkbenchListHAsSelectionOrFocus.bindTo(this.contextKeyService);
		this.listDoubleSelection = WorkbenchListDoubleSelection.bindTo(this.contextKeyService);
		this.listMultiSelection = WorkbenchListMultiSelection.bindTo(this.contextKeyService);
		this.horizontAlScrolling = options.horizontAlScrolling;

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);

		this.disposAbles.Add(this.contextKeyService);
		this.disposAbles.Add((listService As ListService).register(this));

		if (options.overrideStyles) {
			this.updAteStyles(options.overrideStyles);
		}

		this.disposAbles.Add(this.onDidChAngeSelection(() => {
			const selection = this.getSelection();
			const focus = this.getFocus();

			this.contextKeyService.bufferChAngeEvents(() => {
				this.listHAsSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
				this.listMultiSelection.set(selection.length > 1);
				this.listDoubleSelection.set(selection.length === 2);
			});
		}));
		this.disposAbles.Add(this.onDidChAngeFocus(() => {
			const selection = this.getSelection();
			const focus = this.getFocus();

			this.listHAsSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
		}));
		this.disposAbles.Add(configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(multiSelectModifierSettingKey)) {
				this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);
			}

			let options: IListOptionsUpdAte = {};

			if (e.AffectsConfigurAtion(horizontAlScrollingKey) && this.horizontAlScrolling === undefined) {
				const horizontAlScrolling = configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
				options = { ...options, horizontAlScrolling };
			}
			if (e.AffectsConfigurAtion(listSmoothScrolling)) {
				const smoothScrolling = configurAtionService.getVAlue<booleAn>(listSmoothScrolling);
				options = { ...options, smoothScrolling };
			}
			if (Object.keys(options).length > 0) {
				this.updAteOptions(options);
			}
		}));
	}

	updAteOptions(options: IWorkbenchListOptionsUpdAte): void {
		super.updAteOptions(options);

		if (options.overrideStyles) {
			this.updAteStyles(options.overrideStyles);
		}
	}

	dispose(): void {
		super.dispose();
		if (this._styler) {
			this._styler.dispose();
		}
	}

	privAte updAteStyles(styles: IColorMApping): void {
		if (this._styler) {
			this._styler.dispose();
		}

		this._styler = AttAchListStyler(this, this.themeService, styles);
	}

	get useAltAsMultipleSelectionModifier(): booleAn {
		return this._useAltAsMultipleSelectionModifier;
	}
}

export interfAce IWorkbenchPAgedListOptions<T> extends IWorkbenchListOptionsUpdAte, IPAgedListOptions<T> {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
}

export clAss WorkbenchPAgedList<T> extends PAgedList<T> {

	reAdonly contextKeyService: IContextKeyService;

	privAte reAdonly disposAbles: DisposAbleStore;

	privAte _useAltAsMultipleSelectionModifier: booleAn;
	privAte horizontAlScrolling: booleAn | undefined;

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<number>,
		renderers: IPAgedRenderer<T, Any>[],
		options: IWorkbenchPAgedListOptions<T>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		const horizontAlScrolling = typeof options.horizontAlScrolling !== 'undefined' ? options.horizontAlScrolling : configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
		const [workbenchListOptions, workbenchListOptionsDisposAble] = toWorkbenchListOptions(options, configurAtionService, keybindingService);
		super(user, contAiner, delegAte, renderers,
			{
				keyboArdSupport: fAlse,
				...computeStyles(themeService.getColorTheme(), defAultListStyles),
				...workbenchListOptions,
				horizontAlScrolling
			}
		);

		this.disposAbles = new DisposAbleStore();
		this.disposAbles.Add(workbenchListOptionsDisposAble);

		this.contextKeyService = creAteScopedContextKeyService(contextKeyService, this);
		this.horizontAlScrolling = options.horizontAlScrolling;

		const listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === fAlse));

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);

		this.disposAbles.Add(this.contextKeyService);
		this.disposAbles.Add((listService As ListService).register(this));

		if (options.overrideStyles) {
			this.disposAbles.Add(AttAchListStyler(this, themeService, options.overrideStyles));
		}

		this.disposAbles.Add(configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(multiSelectModifierSettingKey)) {
				this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);
			}

			let options: IListOptionsUpdAte = {};

			if (e.AffectsConfigurAtion(horizontAlScrollingKey) && this.horizontAlScrolling === undefined) {
				const horizontAlScrolling = configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
				options = { ...options, horizontAlScrolling };
			}
			if (e.AffectsConfigurAtion(listSmoothScrolling)) {
				const smoothScrolling = configurAtionService.getVAlue<booleAn>(listSmoothScrolling);
				options = { ...options, smoothScrolling };
			}
			if (Object.keys(options).length > 0) {
				this.updAteOptions(options);
			}
		}));
	}

	get useAltAsMultipleSelectionModifier(): booleAn {
		return this._useAltAsMultipleSelectionModifier;
	}

	dispose(): void {
		super.dispose();

		this.disposAbles.dispose();
	}
}

export interfAce IOpenResourceOptions {
	editorOptions: IEditorOptions;
	sideBySide: booleAn;
	element: Any;
	pAyloAd: Any;
}

export interfAce IResourceResultsNAvigAtionOptions {
	openOnFocus: booleAn;
}

export interfAce IOpenEvent<T> {
	editorOptions: IEditorOptions;
	sideBySide: booleAn;
	element: T;
	browserEvent?: UIEvent;
}

export interfAce IResourceNAvigAtorOptions {
	reAdonly configurAtionService?: IConfigurAtionService;
	reAdonly openOnFocus?: booleAn;
	reAdonly openOnSingleClick?: booleAn;
}

export interfAce SelectionKeyboArdEvent extends KeyboArdEvent {
	preserveFocus?: booleAn;
}

export function getSelectionKeyboArdEvent(typeArg = 'keydown', preserveFocus?: booleAn): SelectionKeyboArdEvent {
	const e = new KeyboArdEvent(typeArg);
	(<SelectionKeyboArdEvent>e).preserveFocus = preserveFocus;

	return e;
}

AbstrAct clAss ResourceNAvigAtor<T> extends DisposAble {

	privAte reAdonly openOnFocus: booleAn;
	privAte openOnSingleClick: booleAn;

	privAte reAdonly _onDidOpen = new Emitter<IOpenEvent<T | null>>();
	reAdonly onDidOpen: Event<IOpenEvent<T | null>> = this._onDidOpen.event;

	constructor(
		privAte reAdonly widget: ListWidget,
		options?: IResourceNAvigAtorOptions
	) {
		super();

		this.openOnFocus = options?.openOnFocus ?? fAlse;

		this._register(Event.filter(this.widget.onDidChAngeSelection, e => e.browserEvent instAnceof KeyboArdEvent)(e => this.onSelectionFromKeyboArd(e)));
		this._register(this.widget.onPointer((e: { browserEvent: MouseEvent }) => this.onPointer(e.browserEvent)));
		this._register(this.widget.onMouseDblClick((e: { browserEvent: MouseEvent }) => this.onMouseDblClick(e.browserEvent)));

		if (this.openOnFocus) {
			this._register(Event.filter(this.widget.onDidChAngeFocus, e => e.browserEvent instAnceof KeyboArdEvent)(e => this.onFocusFromKeyboArd(e)));
		}

		if (typeof options?.openOnSingleClick !== 'booleAn' && options?.configurAtionService) {
			this.openOnSingleClick = options?.configurAtionService!.getVAlue(openModeSettingKey) !== 'doubleClick';
			this._register(options?.configurAtionService.onDidChAngeConfigurAtion(() => {
				this.openOnSingleClick = options?.configurAtionService!.getVAlue(openModeSettingKey) !== 'doubleClick';
			}));
		} else {
			this.openOnSingleClick = options?.openOnSingleClick ?? true;
		}
	}

	privAte onFocusFromKeyboArd(event: ITreeEvent<Any>): void {
		const focus = this.widget.getFocus();
		this.widget.setSelection(focus, event.browserEvent);

		const preserveFocus = typeof (event.browserEvent As SelectionKeyboArdEvent).preserveFocus === 'booleAn' ? (event.browserEvent As SelectionKeyboArdEvent).preserveFocus! : true;
		const pinned = fAlse;
		const sideBySide = fAlse;

		this._open(preserveFocus, pinned, sideBySide, event.browserEvent);
	}

	privAte onSelectionFromKeyboArd(event: ITreeEvent<Any>): void {
		if (event.elements.length !== 1) {
			return;
		}

		const preserveFocus = typeof (event.browserEvent As SelectionKeyboArdEvent).preserveFocus === 'booleAn' ? (event.browserEvent As SelectionKeyboArdEvent).preserveFocus! : true;
		const pinned = fAlse;
		const sideBySide = fAlse;

		this._open(preserveFocus, pinned, sideBySide, event.browserEvent);
	}

	privAte onPointer(browserEvent: MouseEvent): void {
		if (!this.openOnSingleClick) {
			return;
		}

		const isDoubleClick = browserEvent.detAil === 2;

		if (isDoubleClick) {
			return;
		}

		const isMiddleClick = browserEvent.button === 1;
		const preserveFocus = true;
		const pinned = isMiddleClick;
		const sideBySide = browserEvent.ctrlKey || browserEvent.metAKey || browserEvent.AltKey;

		this._open(preserveFocus, pinned, sideBySide, browserEvent);
	}

	privAte onMouseDblClick(browserEvent?: MouseEvent): void {
		if (!browserEvent) {
			return;
		}

		const preserveFocus = fAlse;
		const pinned = true;
		const sideBySide = (browserEvent.ctrlKey || browserEvent.metAKey || browserEvent.AltKey);

		this._open(preserveFocus, pinned, sideBySide, browserEvent);
	}

	privAte _open(preserveFocus: booleAn, pinned: booleAn, sideBySide: booleAn, browserEvent?: UIEvent): void {
		this._onDidOpen.fire({
			editorOptions: {
				preserveFocus,
				pinned,
				reveAlIfVisible: true
			},
			sideBySide,
			element: this.widget.getSelection()[0],
			browserEvent
		});
	}
}

export clAss ListResourceNAvigAtor<T> extends ResourceNAvigAtor<number> {
	constructor(
		list: List<T> | PAgedList<T>,
		options?: IResourceNAvigAtorOptions
	) {
		super(list, options);
	}
}

clAss TreeResourceNAvigAtor<T, TFilterDAtA> extends ResourceNAvigAtor<T> {
	constructor(
		tree: ObjectTree<T, TFilterDAtA> | CompressibleObjectTree<T, TFilterDAtA> | DAtATree<Any, T, TFilterDAtA> | AsyncDAtATree<Any, T, TFilterDAtA> | CompressibleAsyncDAtATree<Any, T, TFilterDAtA>,
		options: IResourceNAvigAtorOptions
	) {
		super(tree, options);
	}
}

function creAteKeyboArdNAvigAtionEventFilter(contAiner: HTMLElement, keybindingService: IKeybindingService): IKeyboArdNAvigAtionEventFilter {
	let inChord = fAlse;

	return event => {
		if (inChord) {
			inChord = fAlse;
			return fAlse;
		}

		const result = keybindingService.softDispAtch(event, contAiner);

		if (result && result.enterChord) {
			inChord = true;
			return fAlse;
		}

		inChord = fAlse;
		return true;
	};
}

export interfAce IWorkbenchObjectTreeOptions<T, TFilterDAtA> extends IObjectTreeOptions<T, TFilterDAtA>, IResourceNAvigAtorOptions {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
	reAdonly overrideStyles?: IColorMApping;
}

export clAss WorkbenchObjectTree<T extends NonNullAble<Any>, TFilterDAtA = void> extends ObjectTree<T, TFilterDAtA> {

	privAte internAls: WorkbenchTreeInternAls<Any, T, TFilterDAtA>;
	get contextKeyService(): IContextKeyService { return this.internAls.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): booleAn { return this.internAls.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internAls.onDidOpen; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		options: IWorkbenchObjectTreeOptions<T, TFilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const { options: treeOptions, getAutomAticKeyboArdNAvigAtion, disposAble } = workbenchTreeDAtAPreAmble<T, TFilterDAtA, IWorkbenchObjectTreeOptions<T, TFilterDAtA>>(contAiner, options, contextKeyService, configurAtionService, keybindingService, AccessibilityService);
		super(user, contAiner, delegAte, renderers, treeOptions);
		this.disposAbles.Add(disposAble);
		this.internAls = new WorkbenchTreeInternAls(this, options, getAutomAticKeyboArdNAvigAtion, options.overrideStyles, contextKeyService, listService, themeService, configurAtionService, AccessibilityService);
		this.disposAbles.Add(this.internAls);
	}
}

export interfAce IWorkbenchCompressibleObjectTreeOptionsUpdAte extends ICompressibleObjectTreeOptionsUpdAte {
	reAdonly overrideStyles?: IColorMApping;
}

export interfAce IWorkbenchCompressibleObjectTreeOptions<T, TFilterDAtA> extends IWorkbenchCompressibleObjectTreeOptionsUpdAte, ICompressibleObjectTreeOptions<T, TFilterDAtA>, IResourceNAvigAtorOptions {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
}

export clAss WorkbenchCompressibleObjectTree<T extends NonNullAble<Any>, TFilterDAtA = void> extends CompressibleObjectTree<T, TFilterDAtA> {

	privAte internAls: WorkbenchTreeInternAls<Any, T, TFilterDAtA>;
	get contextKeyService(): IContextKeyService { return this.internAls.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): booleAn { return this.internAls.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internAls.onDidOpen; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ICompressibleTreeRenderer<T, TFilterDAtA, Any>[],
		options: IWorkbenchCompressibleObjectTreeOptions<T, TFilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const { options: treeOptions, getAutomAticKeyboArdNAvigAtion, disposAble } = workbenchTreeDAtAPreAmble<T, TFilterDAtA, IWorkbenchCompressibleObjectTreeOptions<T, TFilterDAtA>>(contAiner, options, contextKeyService, configurAtionService, keybindingService, AccessibilityService);
		super(user, contAiner, delegAte, renderers, treeOptions);
		this.disposAbles.Add(disposAble);
		this.internAls = new WorkbenchTreeInternAls(this, options, getAutomAticKeyboArdNAvigAtion, options.overrideStyles, contextKeyService, listService, themeService, configurAtionService, AccessibilityService);
		this.disposAbles.Add(this.internAls);
	}

	updAteOptions(options: IWorkbenchCompressibleObjectTreeOptionsUpdAte = {}): void {
		super.updAteOptions(options);

		if (options.overrideStyles) {
			this.internAls.updAteStyleOverrides(options.overrideStyles);
		}
	}
}

export interfAce IWorkbenchDAtATreeOptionsUpdAte extends IAbstrActTreeOptionsUpdAte {
	reAdonly overrideStyles?: IColorMApping;
}

export interfAce IWorkbenchDAtATreeOptions<T, TFilterDAtA> extends IWorkbenchDAtATreeOptionsUpdAte, IDAtATreeOptions<T, TFilterDAtA>, IResourceNAvigAtorOptions {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
}

export clAss WorkbenchDAtATree<TInput, T, TFilterDAtA = void> extends DAtATree<TInput, T, TFilterDAtA> {

	privAte internAls: WorkbenchTreeInternAls<TInput, T, TFilterDAtA>;
	get contextKeyService(): IContextKeyService { return this.internAls.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): booleAn { return this.internAls.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internAls.onDidOpen; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		dAtASource: IDAtASource<TInput, T>,
		options: IWorkbenchDAtATreeOptions<T, TFilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const { options: treeOptions, getAutomAticKeyboArdNAvigAtion, disposAble } = workbenchTreeDAtAPreAmble<T, TFilterDAtA, IWorkbenchDAtATreeOptions<T, TFilterDAtA>>(contAiner, options, contextKeyService, configurAtionService, keybindingService, AccessibilityService);
		super(user, contAiner, delegAte, renderers, dAtASource, treeOptions);
		this.disposAbles.Add(disposAble);
		this.internAls = new WorkbenchTreeInternAls(this, options, getAutomAticKeyboArdNAvigAtion, options.overrideStyles, contextKeyService, listService, themeService, configurAtionService, AccessibilityService);
		this.disposAbles.Add(this.internAls);
	}

	updAteOptions(options: IWorkbenchDAtATreeOptionsUpdAte = {}): void {
		super.updAteOptions(options);

		if (options.overrideStyles) {
			this.internAls.updAteStyleOverrides(options.overrideStyles);
		}
	}
}

export interfAce IWorkbenchAsyncDAtATreeOptionsUpdAte extends IAsyncDAtATreeOptionsUpdAte {
	reAdonly overrideStyles?: IColorMApping;
}

export interfAce IWorkbenchAsyncDAtATreeOptions<T, TFilterDAtA> extends IWorkbenchAsyncDAtATreeOptionsUpdAte, IAsyncDAtATreeOptions<T, TFilterDAtA>, IResourceNAvigAtorOptions {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
}

export clAss WorkbenchAsyncDAtATree<TInput, T, TFilterDAtA = void> extends AsyncDAtATree<TInput, T, TFilterDAtA> {

	privAte internAls: WorkbenchTreeInternAls<TInput, T, TFilterDAtA>;
	get contextKeyService(): IContextKeyService { return this.internAls.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): booleAn { return this.internAls.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internAls.onDidOpen; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		dAtASource: IAsyncDAtASource<TInput, T>,
		options: IWorkbenchAsyncDAtATreeOptions<T, TFilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const { options: treeOptions, getAutomAticKeyboArdNAvigAtion, disposAble } = workbenchTreeDAtAPreAmble<T, TFilterDAtA, IWorkbenchAsyncDAtATreeOptions<T, TFilterDAtA>>(contAiner, options, contextKeyService, configurAtionService, keybindingService, AccessibilityService);
		super(user, contAiner, delegAte, renderers, dAtASource, treeOptions);
		this.disposAbles.Add(disposAble);
		this.internAls = new WorkbenchTreeInternAls(this, options, getAutomAticKeyboArdNAvigAtion, options.overrideStyles, contextKeyService, listService, themeService, configurAtionService, AccessibilityService);
		this.disposAbles.Add(this.internAls);
	}

	updAteOptions(options: IWorkbenchAsyncDAtATreeOptionsUpdAte = {}): void {
		super.updAteOptions(options);

		if (options.overrideStyles) {
			this.internAls.updAteStyleOverrides(options.overrideStyles);
		}
	}
}

export interfAce IWorkbenchCompressibleAsyncDAtATreeOptions<T, TFilterDAtA> extends ICompressibleAsyncDAtATreeOptions<T, TFilterDAtA>, IResourceNAvigAtorOptions {
	reAdonly AccessibilityProvider: IListAccessibilityProvider<T>;
	reAdonly overrideStyles?: IColorMApping;
}

export clAss WorkbenchCompressibleAsyncDAtATree<TInput, T, TFilterDAtA = void> extends CompressibleAsyncDAtATree<TInput, T, TFilterDAtA> {

	privAte internAls: WorkbenchTreeInternAls<TInput, T, TFilterDAtA>;
	get contextKeyService(): IContextKeyService { return this.internAls.contextKeyService; }
	get useAltAsMultipleSelectionModifier(): booleAn { return this.internAls.useAltAsMultipleSelectionModifier; }
	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.internAls.onDidOpen; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		virtuAlDelegAte: IListVirtuAlDelegAte<T>,
		compressionDelegAte: ITreeCompressionDelegAte<T>,
		renderers: ICompressibleTreeRenderer<T, TFilterDAtA, Any>[],
		dAtASource: IAsyncDAtASource<TInput, T>,
		options: IWorkbenchCompressibleAsyncDAtATreeOptions<T, TFilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const { options: treeOptions, getAutomAticKeyboArdNAvigAtion, disposAble } = workbenchTreeDAtAPreAmble<T, TFilterDAtA, IWorkbenchCompressibleAsyncDAtATreeOptions<T, TFilterDAtA>>(contAiner, options, contextKeyService, configurAtionService, keybindingService, AccessibilityService);
		super(user, contAiner, virtuAlDelegAte, compressionDelegAte, renderers, dAtASource, treeOptions);
		this.disposAbles.Add(disposAble);
		this.internAls = new WorkbenchTreeInternAls(this, options, getAutomAticKeyboArdNAvigAtion, options.overrideStyles, contextKeyService, listService, themeService, configurAtionService, AccessibilityService);
		this.disposAbles.Add(this.internAls);
	}
}

function workbenchTreeDAtAPreAmble<T, TFilterDAtA, TOptions extends IAbstrActTreeOptions<T, TFilterDAtA> | IAsyncDAtATreeOptions<T, TFilterDAtA>>(
	contAiner: HTMLElement,
	options: TOptions,
	contextKeyService: IContextKeyService,
	configurAtionService: IConfigurAtionService,
	keybindingService: IKeybindingService,
	AccessibilityService: IAccessibilityService,
): { options: TOptions, getAutomAticKeyboArdNAvigAtion: () => booleAn | undefined, disposAble: IDisposAble } {
	WorkbenchListSupportsKeyboArdNAvigAtion.bindTo(contextKeyService);

	if (!didBindWorkbenchListAutomAticKeyboArdNAvigAtion) {
		WorkbenchListAutomAticKeyboArdNAvigAtion.bindTo(contextKeyService);
		didBindWorkbenchListAutomAticKeyboArdNAvigAtion = true;
	}

	const getAutomAticKeyboArdNAvigAtion = () => {
		// give priority to the context key vAlue to disAble this completely
		let AutomAticKeyboArdNAvigAtion = contextKeyService.getContextKeyVAlue<booleAn>(WorkbenchListAutomAticKeyboArdNAvigAtionKey);

		if (AutomAticKeyboArdNAvigAtion) {
			AutomAticKeyboArdNAvigAtion = configurAtionService.getVAlue<booleAn>(AutomAticKeyboArdNAvigAtionSettingKey);
		}

		return AutomAticKeyboArdNAvigAtion;
	};

	const AccessibilityOn = AccessibilityService.isScreenReAderOptimized();
	const keyboArdNAvigAtion = AccessibilityOn ? 'simple' : configurAtionService.getVAlue<string>(keyboArdNAvigAtionSettingKey);
	const horizontAlScrolling = options.horizontAlScrolling !== undefined ? options.horizontAlScrolling : configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
	const [workbenchListOptions, disposAble] = toWorkbenchListOptions(options, configurAtionService, keybindingService);
	const AdditionAlScrollHeight = options.AdditionAlScrollHeight;

	return {
		getAutomAticKeyboArdNAvigAtion,
		disposAble,
		options: {
			// ...options, // TODO@JoAo why is this not splAtted here?
			keyboArdSupport: fAlse,
			...workbenchListOptions,
			indent: configurAtionService.getVAlue<number>(treeIndentKey),
			renderIndentGuides: configurAtionService.getVAlue<RenderIndentGuides>(treeRenderIndentGuidesKey),
			smoothScrolling: configurAtionService.getVAlue<booleAn>(listSmoothScrolling),
			AutomAticKeyboArdNAvigAtion: getAutomAticKeyboArdNAvigAtion(),
			simpleKeyboArdNAvigAtion: keyboArdNAvigAtion === 'simple',
			filterOnType: keyboArdNAvigAtion === 'filter',
			horizontAlScrolling,
			keyboArdNAvigAtionEventFilter: creAteKeyboArdNAvigAtionEventFilter(contAiner, keybindingService),
			AdditionAlScrollHeight,
			hideTwistiesOfChildlessElements: options.hideTwistiesOfChildlessElements,
			expAndOnlyOnDoubleClick: configurAtionService.getVAlue(openModeSettingKey) === 'doubleClick'
		} As TOptions
	};
}

clAss WorkbenchTreeInternAls<TInput, T, TFilterDAtA> {

	reAdonly contextKeyService: IContextKeyService;
	privAte hAsSelectionOrFocus: IContextKey<booleAn>;
	privAte hAsDoubleSelection: IContextKey<booleAn>;
	privAte hAsMultiSelection: IContextKey<booleAn>;
	privAte _useAltAsMultipleSelectionModifier: booleAn;
	privAte disposAbles: IDisposAble[] = [];
	privAte styler: IDisposAble | undefined;
	privAte nAvigAtor: TreeResourceNAvigAtor<T, TFilterDAtA>;

	get onDidOpen(): Event<IOpenEvent<T | null>> { return this.nAvigAtor.onDidOpen; }

	constructor(
		privAte tree: WorkbenchObjectTree<T, TFilterDAtA> | WorkbenchCompressibleObjectTree<T, TFilterDAtA> | WorkbenchDAtATree<TInput, T, TFilterDAtA> | WorkbenchAsyncDAtATree<TInput, T, TFilterDAtA> | WorkbenchCompressibleAsyncDAtATree<TInput, T, TFilterDAtA>,
		options: IWorkbenchObjectTreeOptions<T, TFilterDAtA> | IWorkbenchCompressibleObjectTreeOptions<T, TFilterDAtA> | IWorkbenchDAtATreeOptions<T, TFilterDAtA> | IWorkbenchAsyncDAtATreeOptions<T, TFilterDAtA> | IWorkbenchCompressibleAsyncDAtATreeOptions<T, TFilterDAtA>,
		getAutomAticKeyboArdNAvigAtion: () => booleAn | undefined,
		overrideStyles: IColorMApping | undefined,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService privAte themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
	) {
		this.contextKeyService = creAteScopedContextKeyService(contextKeyService, tree);

		const listSupportsMultiSelect = WorkbenchListSupportsMultiSelectContextKey.bindTo(this.contextKeyService);
		listSupportsMultiSelect.set(!(options.multipleSelectionSupport === fAlse));

		this.hAsSelectionOrFocus = WorkbenchListHAsSelectionOrFocus.bindTo(this.contextKeyService);
		this.hAsDoubleSelection = WorkbenchListDoubleSelection.bindTo(this.contextKeyService);
		this.hAsMultiSelection = WorkbenchListMultiSelection.bindTo(this.contextKeyService);

		this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);

		const interestingContextKeys = new Set();
		interestingContextKeys.Add(WorkbenchListAutomAticKeyboArdNAvigAtionKey);
		const updAteKeyboArdNAvigAtion = () => {
			const AccessibilityOn = AccessibilityService.isScreenReAderOptimized();
			const keyboArdNAvigAtion = AccessibilityOn ? 'simple' : configurAtionService.getVAlue<string>(keyboArdNAvigAtionSettingKey);
			tree.updAteOptions({
				simpleKeyboArdNAvigAtion: keyboArdNAvigAtion === 'simple',
				filterOnType: keyboArdNAvigAtion === 'filter'
			});
		};

		this.updAteStyleOverrides(overrideStyles);

		this.disposAbles.push(
			this.contextKeyService,
			(listService As ListService).register(tree),
			tree.onDidChAngeSelection(() => {
				const selection = tree.getSelection();
				const focus = tree.getFocus();

				this.contextKeyService.bufferChAngeEvents(() => {
					this.hAsSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
					this.hAsMultiSelection.set(selection.length > 1);
					this.hAsDoubleSelection.set(selection.length === 2);
				});
			}),
			tree.onDidChAngeFocus(() => {
				const selection = tree.getSelection();
				const focus = tree.getFocus();

				this.hAsSelectionOrFocus.set(selection.length > 0 || focus.length > 0);
			}),
			configurAtionService.onDidChAngeConfigurAtion(e => {
				let newOptions: Any = {};
				if (e.AffectsConfigurAtion(multiSelectModifierSettingKey)) {
					this._useAltAsMultipleSelectionModifier = useAltAsMultipleSelectionModifier(configurAtionService);
				}
				if (e.AffectsConfigurAtion(treeIndentKey)) {
					const indent = configurAtionService.getVAlue<number>(treeIndentKey);
					newOptions = { ...newOptions, indent };
				}
				if (e.AffectsConfigurAtion(treeRenderIndentGuidesKey)) {
					const renderIndentGuides = configurAtionService.getVAlue<RenderIndentGuides>(treeRenderIndentGuidesKey);
					newOptions = { ...newOptions, renderIndentGuides };
				}
				if (e.AffectsConfigurAtion(listSmoothScrolling)) {
					const smoothScrolling = configurAtionService.getVAlue<booleAn>(listSmoothScrolling);
					newOptions = { ...newOptions, smoothScrolling };
				}
				if (e.AffectsConfigurAtion(keyboArdNAvigAtionSettingKey)) {
					updAteKeyboArdNAvigAtion();
				}
				if (e.AffectsConfigurAtion(AutomAticKeyboArdNAvigAtionSettingKey)) {
					newOptions = { ...newOptions, AutomAticKeyboArdNAvigAtion: getAutomAticKeyboArdNAvigAtion() };
				}
				if (e.AffectsConfigurAtion(horizontAlScrollingKey) && options.horizontAlScrolling === undefined) {
					const horizontAlScrolling = configurAtionService.getVAlue<booleAn>(horizontAlScrollingKey);
					newOptions = { ...newOptions, horizontAlScrolling };
				}
				if (e.AffectsConfigurAtion(openModeSettingKey)) {
					newOptions = { ...newOptions, expAndOnlyOnDoubleClick: configurAtionService.getVAlue(openModeSettingKey) === 'doubleClick' };
				}
				if (Object.keys(newOptions).length > 0) {
					tree.updAteOptions(newOptions);
				}
			}),
			this.contextKeyService.onDidChAngeContext(e => {
				if (e.AffectsSome(interestingContextKeys)) {
					tree.updAteOptions({ AutomAticKeyboArdNAvigAtion: getAutomAticKeyboArdNAvigAtion() });
				}
			}),
			AccessibilityService.onDidChAngeScreenReAderOptimized(() => updAteKeyboArdNAvigAtion())
		);

		this.nAvigAtor = new TreeResourceNAvigAtor(tree, { configurAtionService, ...options });
		this.disposAbles.push(this.nAvigAtor);
	}

	get useAltAsMultipleSelectionModifier(): booleAn {
		return this._useAltAsMultipleSelectionModifier;
	}

	updAteStyleOverrides(overrideStyles?: IColorMApping): void {
		dispose(this.styler);
		this.styler = overrideStyles ? AttAchListStyler(this.tree, this.themeService, overrideStyles) : DisposAble.None;
	}

	dispose(): void {
		this.disposAbles = dispose(this.disposAbles);
		dispose(this.styler);
		this.styler = undefined;
	}
}

const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

configurAtionRegistry.registerConfigurAtion({
	'id': 'workbench',
	'order': 7,
	'title': locAlize('workbenchConfigurAtionTitle', "Workbench"),
	'type': 'object',
	'properties': {
		[multiSelectModifierSettingKey]: {
			'type': 'string',
			'enum': ['ctrlCmd', 'Alt'],
			'enumDescriptions': [
				locAlize('multiSelectModifier.ctrlCmd', "MAps to `Control` on Windows And Linux And to `CommAnd` on mAcOS."),
				locAlize('multiSelectModifier.Alt', "MAps to `Alt` on Windows And Linux And to `Option` on mAcOS.")
			],
			'defAult': 'ctrlCmd',
			'description': locAlize({
				key: 'multiSelectModifier',
				comment: [
					'- `ctrlCmd` refers to A vAlue the setting cAn tAke And should not be locAlized.',
					'- `Control` And `CommAnd` refer to the modifier keys Ctrl or Cmd on the keyboArd And cAn be locAlized.'
				]
			}, "The modifier to be used to Add An item in trees And lists to A multi-selection with the mouse (for exAmple in the explorer, open editors And scm view). The 'Open to Side' mouse gestures - if supported - will AdApt such thAt they do not conflict with the multiselect modifier.")
		},
		[openModeSettingKey]: {
			'type': 'string',
			'enum': ['singleClick', 'doubleClick'],
			'defAult': 'singleClick',
			'description': locAlize({
				key: 'openModeModifier',
				comment: ['`singleClick` And `doubleClick` refers to A vAlue the setting cAn tAke And should not be locAlized.']
			}, "Controls how to open items in trees And lists using the mouse (if supported). For pArents with children in trees, this setting will control if A single click expAnds the pArent or A double click. Note thAt some trees And lists might choose to ignore this setting if it is not ApplicAble. ")
		},
		[horizontAlScrollingKey]: {
			'type': 'booleAn',
			'defAult': fAlse,
			'description': locAlize('horizontAlScrolling setting', "Controls whether lists And trees support horizontAl scrolling in the workbench. WArning: turning on this setting hAs A performAnce implicAtion.")
		},
		[treeIndentKey]: {
			'type': 'number',
			'defAult': 8,
			minimum: 0,
			mAximum: 40,
			'description': locAlize('tree indent setting', "Controls tree indentAtion in pixels.")
		},
		[treeRenderIndentGuidesKey]: {
			type: 'string',
			enum: ['none', 'onHover', 'AlwAys'],
			defAult: 'onHover',
			description: locAlize('render tree indent guides', "Controls whether the tree should render indent guides.")
		},
		[listSmoothScrolling]: {
			type: 'booleAn',
			defAult: fAlse,
			description: locAlize('list smoothScrolling setting', "Controls whether lists And trees hAve smooth scrolling."),
		},
		[keyboArdNAvigAtionSettingKey]: {
			'type': 'string',
			'enum': ['simple', 'highlight', 'filter'],
			'enumDescriptions': [
				locAlize('keyboArdNAvigAtionSettingKey.simple', "Simple keyboArd nAvigAtion focuses elements which mAtch the keyboArd input. MAtching is done only on prefixes."),
				locAlize('keyboArdNAvigAtionSettingKey.highlight', "Highlight keyboArd nAvigAtion highlights elements which mAtch the keyboArd input. Further up And down nAvigAtion will trAverse only the highlighted elements."),
				locAlize('keyboArdNAvigAtionSettingKey.filter', "Filter keyboArd nAvigAtion will filter out And hide All the elements which do not mAtch the keyboArd input.")
			],
			'defAult': 'highlight',
			'description': locAlize('keyboArdNAvigAtionSettingKey', "Controls the keyboArd nAvigAtion style for lists And trees in the workbench. CAn be simple, highlight And filter.")
		},
		[AutomAticKeyboArdNAvigAtionSettingKey]: {
			'type': 'booleAn',
			'defAult': true,
			mArkdownDescription: locAlize('AutomAtic keyboArd nAvigAtion setting', "Controls whether keyboArd nAvigAtion in lists And trees is AutomAticAlly triggered simply by typing. If set to `fAlse`, keyboArd nAvigAtion is only triggered when executing the `list.toggleKeyboArdNAvigAtion` commAnd, for which you cAn Assign A keyboArd shortcut.")
		}
	}
});
