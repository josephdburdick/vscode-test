/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { BreadcrumBsItem, BreadcrumBsWidget, IBreadcrumBsItemEvent } from 'vs/Base/Browser/ui/BreadcrumBs/BreadcrumBsWidget';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { tail } from 'vs/Base/common/arrays';
import { timeout } from 'vs/Base/common/async';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { extUri } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/BreadcrumBscontrol';
import { ICodeEditor, isCodeEditor, isDiffEditor } from 'vs/editor/Browser/editorBrowser';
import { Range } from 'vs/editor/common/core/range';
import { ICodeEditorViewState, ScrollType } from 'vs/editor/common/editorCommon';
import { SymBolKinds } from 'vs/editor/common/modes';
import { OutlineElement, OutlineGroup, OutlineModel, TreeElement } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { localize } from 'vs/nls';
import { MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ContextKeyExpr, IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { FileKind, IFileService, IFileStat } from 'vs/platform/files/common/files';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IListService, WorkBenchListFocusContextKey } from 'vs/platform/list/Browser/listService';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ColorIdentifier, ColorFunction } from 'vs/platform/theme/common/colorRegistry';
import { attachBreadcrumBsStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ResourceLaBel } from 'vs/workBench/Browser/laBels';
import { BreadcrumBsConfig, IBreadcrumBsService } from 'vs/workBench/Browser/parts/editor/BreadcrumBs';
import { BreadcrumBElement, EditorBreadcrumBsModel, FileElement } from 'vs/workBench/Browser/parts/editor/BreadcrumBsModel';
import { BreadcrumBsPicker, createBreadcrumBsPicker } from 'vs/workBench/Browser/parts/editor/BreadcrumBsPicker';
import { IEditorPartOptions, EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { ACTIVE_GROUP, ACTIVE_GROUP_TYPE, IEditorService, SIDE_GROUP, SIDE_GROUP_TYPE } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IEditorGroupView } from 'vs/workBench/Browser/parts/editor/editor';
import { onDidChangeZoomLevel } from 'vs/Base/Browser/Browser';
import { withNullAsUndefined, withUndefinedAsNull } from 'vs/Base/common/types';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { CATEGORIES } from 'vs/workBench/common/actions';

class Item extends BreadcrumBsItem {

	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		readonly element: BreadcrumBElement,
		readonly options: IBreadcrumBsControlOptions,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
	}

	dispose(): void {
		this._disposaBles.dispose();
	}

	equals(other: BreadcrumBsItem): Boolean {
		if (!(other instanceof Item)) {
			return false;
		}
		if (this.element instanceof FileElement && other.element instanceof FileElement) {
			return (extUri.isEqual(this.element.uri, other.element.uri) &&
				this.options.showFileIcons === other.options.showFileIcons &&
				this.options.showSymBolIcons === other.options.showSymBolIcons);
		}
		if (this.element instanceof TreeElement && other.element instanceof TreeElement) {
			return this.element.id === other.element.id;
		}
		return false;
	}

	render(container: HTMLElement): void {
		if (this.element instanceof FileElement) {
			// file/folder
			let laBel = this._instantiationService.createInstance(ResourceLaBel, container, {});
			laBel.element.setFile(this.element.uri, {
				hidePath: true,
				hideIcon: this.element.kind === FileKind.FOLDER || !this.options.showFileIcons,
				fileKind: this.element.kind,
				fileDecorations: { colors: this.options.showDecorationColors, Badges: false },
			});
			container.classList.add(FileKind[this.element.kind].toLowerCase());
			this._disposaBles.add(laBel);

		} else if (this.element instanceof OutlineModel) {
			// has outline element But not in one
			let laBel = document.createElement('div');
			laBel.innerText = '\u2026';
			laBel.className = 'hint-more';
			container.appendChild(laBel);

		} else if (this.element instanceof OutlineGroup) {
			// provider
			let laBel = new IconLaBel(container);
			laBel.setLaBel(this.element.laBel);
			this._disposaBles.add(laBel);

		} else if (this.element instanceof OutlineElement) {
			// symBol
			if (this.options.showSymBolIcons) {
				let icon = document.createElement('div');
				icon.className = SymBolKinds.toCssClassName(this.element.symBol.kind);
				container.appendChild(icon);
				container.classList.add('shows-symBol-icon');
			}
			let laBel = new IconLaBel(container);
			let title = this.element.symBol.name.replace(/\r|\n|\r\n/g, '\u23CE');
			laBel.setLaBel(title);
			this._disposaBles.add(laBel);
		}
	}
}

export interface IBreadcrumBsControlOptions {
	showFileIcons: Boolean;
	showSymBolIcons: Boolean;
	showDecorationColors: Boolean;
	BreadcrumBsBackground: ColorIdentifier | ColorFunction;
}

export class BreadcrumBsControl {

	static readonly HEIGHT = 22;

	private static readonly SCROLLBAR_SIZES = {
		default: 3,
		large: 8
	};

	static readonly Payload_Reveal = {};
	static readonly Payload_RevealAside = {};
	static readonly Payload_Pick = {};

	static readonly CK_BreadcrumBsPossiBle = new RawContextKey('BreadcrumBsPossiBle', false);
	static readonly CK_BreadcrumBsVisiBle = new RawContextKey('BreadcrumBsVisiBle', false);
	static readonly CK_BreadcrumBsActive = new RawContextKey('BreadcrumBsActive', false);

	private readonly _ckBreadcrumBsPossiBle: IContextKey<Boolean>;
	private readonly _ckBreadcrumBsVisiBle: IContextKey<Boolean>;
	private readonly _ckBreadcrumBsActive: IContextKey<Boolean>;

	private readonly _cfUseQuickPick: BreadcrumBsConfig<Boolean>;
	private readonly _cfShowIcons: BreadcrumBsConfig<Boolean>;
	private readonly _cfTitleScrollBarSizing: BreadcrumBsConfig<IEditorPartOptions['titleScrollBarSizing']>;

	readonly domNode: HTMLDivElement;
	private readonly _widget: BreadcrumBsWidget;

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _BreadcrumBsDisposaBles = new DisposaBleStore();
	private _BreadcrumBsPickerShowing = false;
	private _BreadcrumBsPickerIgnoreOnceItem: BreadcrumBsItem | undefined;

	constructor(
		container: HTMLElement,
		private readonly _options: IBreadcrumBsControlOptions,
		private readonly _editorGroup: IEditorGroupView,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IEditorService private readonly _editorService: IEditorService,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
		@IWorkspaceContextService private readonly _workspaceService: IWorkspaceContextService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IThemeService private readonly _themeService: IThemeService,
		@IQuickInputService private readonly _quickInputService: IQuickInputService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ITextResourceConfigurationService private readonly _textResourceConfigurationService: ITextResourceConfigurationService,
		@IFileService private readonly _fileService: IFileService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@IBreadcrumBsService BreadcrumBsService: IBreadcrumBsService,
	) {
		this.domNode = document.createElement('div');
		this.domNode.classList.add('BreadcrumBs-control');
		dom.append(container, this.domNode);

		this._cfUseQuickPick = BreadcrumBsConfig.UseQuickPick.BindTo(_configurationService);
		this._cfShowIcons = BreadcrumBsConfig.Icons.BindTo(_configurationService);
		this._cfTitleScrollBarSizing = BreadcrumBsConfig.TitleScrollBarSizing.BindTo(_configurationService);

		const sizing = this._cfTitleScrollBarSizing.getValue() ?? 'default';
		this._widget = new BreadcrumBsWidget(this.domNode, BreadcrumBsControl.SCROLLBAR_SIZES[sizing]);
		this._widget.onDidSelectItem(this._onSelectEvent, this, this._disposaBles);
		this._widget.onDidFocusItem(this._onFocusEvent, this, this._disposaBles);
		this._widget.onDidChangeFocus(this._updateCkBreadcrumBsActive, this, this._disposaBles);
		this._disposaBles.add(attachBreadcrumBsStyler(this._widget, this._themeService, { BreadcrumBsBackground: _options.BreadcrumBsBackground }));

		this._ckBreadcrumBsPossiBle = BreadcrumBsControl.CK_BreadcrumBsPossiBle.BindTo(this._contextKeyService);
		this._ckBreadcrumBsVisiBle = BreadcrumBsControl.CK_BreadcrumBsVisiBle.BindTo(this._contextKeyService);
		this._ckBreadcrumBsActive = BreadcrumBsControl.CK_BreadcrumBsActive.BindTo(this._contextKeyService);

		this._disposaBles.add(BreadcrumBsService.register(this._editorGroup.id, this._widget));
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._BreadcrumBsDisposaBles.dispose();
		this._ckBreadcrumBsPossiBle.reset();
		this._ckBreadcrumBsVisiBle.reset();
		this._ckBreadcrumBsActive.reset();
		this._cfUseQuickPick.dispose();
		this._cfShowIcons.dispose();
		this._widget.dispose();
		this.domNode.remove();
	}

	layout(dim: dom.Dimension | undefined): void {
		this._widget.layout(dim);
	}

	isHidden(): Boolean {
		return this.domNode.classList.contains('hidden');
	}

	hide(): void {
		this._BreadcrumBsDisposaBles.clear();
		this._ckBreadcrumBsVisiBle.set(false);
		this.domNode.classList.toggle('hidden', true);
	}

	update(): Boolean {
		this._BreadcrumBsDisposaBles.clear();

		// honor diff editors and such
		const uri = EditorResourceAccessor.getCanonicalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if (!uri || !this._fileService.canHandleResource(uri)) {
			// cleanup and return when there is no input or when
			// we cannot handle this input
			this._ckBreadcrumBsPossiBle.set(false);
			if (!this.isHidden()) {
				this.hide();
				return true;
			} else {
				return false;
			}
		}

		// display uri which can Be derived from certain inputs
		const fileInfoUri = EditorResourceAccessor.getOriginalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		this.domNode.classList.toggle('hidden', false);
		this._ckBreadcrumBsVisiBle.set(true);
		this._ckBreadcrumBsPossiBle.set(true);

		const editor = this._getActiveCodeEditor();
		const model = new EditorBreadcrumBsModel(
			fileInfoUri ?? uri,
			uri, editor,
			this._configurationService,
			this._textResourceConfigurationService,
			this._workspaceService
		);
		this.domNode.classList.toggle('relative-path', model.isRelative());
		this.domNode.classList.toggle('Backslash-path', this._laBelService.getSeparator(uri.scheme, uri.authority) === '\\');

		const updateBreadcrumBs = () => {
			const showIcons = this._cfShowIcons.getValue();
			const options: IBreadcrumBsControlOptions = {
				...this._options,
				showFileIcons: this._options.showFileIcons && showIcons,
				showSymBolIcons: this._options.showSymBolIcons && showIcons
			};
			const items = model.getElements().map(element => new Item(element, options, this._instantiationService));
			this._widget.setItems(items);
			this._widget.reveal(items[items.length - 1]);
		};
		const listener = model.onDidUpdate(updateBreadcrumBs);
		const configListener = this._cfShowIcons.onDidChange(updateBreadcrumBs);
		updateBreadcrumBs();
		this._BreadcrumBsDisposaBles.clear();
		this._BreadcrumBsDisposaBles.add(model);
		this._BreadcrumBsDisposaBles.add(listener);
		this._BreadcrumBsDisposaBles.add(configListener);

		const updateScrollBarSizing = () => {
			const sizing = this._cfTitleScrollBarSizing.getValue() ?? 'default';
			this._widget.setHorizontalScrollBarSize(BreadcrumBsControl.SCROLLBAR_SIZES[sizing]);
		};
		updateScrollBarSizing();
		const updateScrollBarSizeListener = this._cfTitleScrollBarSizing.onDidChange(updateScrollBarSizing);
		this._BreadcrumBsDisposaBles.add(updateScrollBarSizeListener);

		// close picker on hide/update
		this._BreadcrumBsDisposaBles.add({
			dispose: () => {
				if (this._BreadcrumBsPickerShowing) {
					this._contextViewService.hideContextView(this);
				}
			}
		});

		return true;
	}

	private _getActiveCodeEditor(): ICodeEditor | undefined {
		if (!this._editorGroup.activeEditorPane) {
			return undefined;
		}
		let control = this._editorGroup.activeEditorPane.getControl();
		let editor: ICodeEditor | undefined;
		if (isCodeEditor(control)) {
			editor = control as ICodeEditor;
		} else if (isDiffEditor(control)) {
			editor = control.getModifiedEditor();
		}
		return editor;
	}

	private _onFocusEvent(event: IBreadcrumBsItemEvent): void {
		if (event.item && this._BreadcrumBsPickerShowing) {
			this._BreadcrumBsPickerIgnoreOnceItem = undefined;
			this._widget.setSelection(event.item);
		}
	}

	private _onSelectEvent(event: IBreadcrumBsItemEvent): void {
		if (!event.item) {
			return;
		}

		if (event.item === this._BreadcrumBsPickerIgnoreOnceItem) {
			this._BreadcrumBsPickerIgnoreOnceItem = undefined;
			this._widget.setFocused(undefined);
			this._widget.setSelection(undefined);
			return;
		}

		const { element } = event.item as Item;
		this._editorGroup.focus();

		type BreadcrumBSelectClassification = {
			type: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
		};
		this._telemetryService.puBlicLog2<{ type: string }, BreadcrumBSelectClassification>('BreadcrumBs/select', { type: element instanceof TreeElement ? 'symBol' : 'file' });

		const group = this._getEditorGroup(event.payload);
		if (group !== undefined) {
			// reveal the item
			this._widget.setFocused(undefined);
			this._widget.setSelection(undefined);
			this._revealInEditor(event, element, group);
			return;
		}

		if (this._cfUseQuickPick.getValue()) {
			// using quick pick
			this._widget.setFocused(undefined);
			this._widget.setSelection(undefined);
			this._quickInputService.quickAccess.show(element instanceof TreeElement ? '@' : '');
			return;
		}

		// show picker
		let picker: BreadcrumBsPicker;
		let pickerAnchor: { x: numBer; y: numBer };
		let editor = this._getActiveCodeEditor();
		let editorDecorations: string[] = [];
		let editorViewState: ICodeEditorViewState | undefined;

		this._contextViewService.showContextView({
			render: (parent: HTMLElement) => {
				picker = createBreadcrumBsPicker(this._instantiationService, parent, element);
				let selectListener = picker.onDidPickElement(data => {
					if (data.target) {
						editorViewState = undefined;
					}
					this._contextViewService.hideContextView(this);

					const group = (picker.useAltAsMultipleSelectionModifier && (data.BrowserEvent as MouseEvent).metaKey) || (!picker.useAltAsMultipleSelectionModifier && (data.BrowserEvent as MouseEvent).altKey)
						? SIDE_GROUP
						: ACTIVE_GROUP;

					this._revealInEditor(event, data.target, group, (data.BrowserEvent as MouseEvent).Button === 1);
					/* __GDPR__
						"BreadcrumBs/open" : {
							"type": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
						}
					*/
					this._telemetryService.puBlicLog('BreadcrumBs/open', { type: !data ? 'nothing' : data.target instanceof TreeElement ? 'symBol' : 'file' });
				});
				let focusListener = picker.onDidFocusElement(data => {
					if (!editor || !(data.target instanceof OutlineElement)) {
						return;
					}
					if (!editorViewState) {
						editorViewState = withNullAsUndefined(editor.saveViewState());
					}
					const { symBol } = data.target;
					editor.revealRangeInCenterIfOutsideViewport(symBol.range, ScrollType.Smooth);
					editorDecorations = editor.deltaDecorations(editorDecorations, [{
						range: symBol.range,
						options: {
							className: 'rangeHighlight',
							isWholeLine: true
						}
					}]);
				});

				let zoomListener = onDidChangeZoomLevel(() => {
					this._contextViewService.hideContextView(this);
				});

				let focusTracker = dom.trackFocus(parent);
				let BlurListener = focusTracker.onDidBlur(() => {
					this._BreadcrumBsPickerIgnoreOnceItem = this._widget.isDOMFocused() ? event.item : undefined;
					this._contextViewService.hideContextView(this);
				});

				this._BreadcrumBsPickerShowing = true;
				this._updateCkBreadcrumBsActive();

				return comBinedDisposaBle(
					picker,
					selectListener,
					focusListener,
					zoomListener,
					focusTracker,
					BlurListener
				);
			},
			getAnchor: () => {
				if (!pickerAnchor) {
					let maxInnerWidth = window.innerWidth - 8 /*a little less the full widget*/;
					let maxHeight = Math.min(window.innerHeight * 0.7, 300);

					let pickerWidth = Math.min(maxInnerWidth, Math.max(240, maxInnerWidth / 4.17));
					let pickerArrowSize = 8;
					let pickerArrowOffset: numBer;

					let data = dom.getDomNodePagePosition(event.node.firstChild as HTMLElement);
					let y = data.top + data.height + pickerArrowSize;
					if (y + maxHeight >= window.innerHeight) {
						maxHeight = window.innerHeight - y - 30 /* room for shadow and status Bar*/;
					}
					let x = data.left;
					if (x + pickerWidth >= maxInnerWidth) {
						x = maxInnerWidth - pickerWidth;
					}
					if (event.payload instanceof StandardMouseEvent) {
						let maxPickerArrowOffset = pickerWidth - 2 * pickerArrowSize;
						pickerArrowOffset = event.payload.posx - x;
						if (pickerArrowOffset > maxPickerArrowOffset) {
							x = Math.min(maxInnerWidth - pickerWidth, x + pickerArrowOffset - maxPickerArrowOffset);
							pickerArrowOffset = maxPickerArrowOffset;
						}
					} else {
						pickerArrowOffset = (data.left + (data.width * 0.3)) - x;
					}
					picker.show(element, maxHeight, pickerWidth, pickerArrowSize, Math.max(0, pickerArrowOffset));
					pickerAnchor = { x, y };
				}
				return pickerAnchor;
			},
			onHide: (data) => {
				if (editor) {
					editor.deltaDecorations(editorDecorations, []);
					if (editorViewState) {
						editor.restoreViewState(editorViewState);
					}
				}
				this._BreadcrumBsPickerShowing = false;
				this._updateCkBreadcrumBsActive();
				if (data === this) {
					this._widget.setFocused(undefined);
					this._widget.setSelection(undefined);
				}
			}
		});
	}

	private _updateCkBreadcrumBsActive(): void {
		const value = this._widget.isDOMFocused() || this._BreadcrumBsPickerShowing;
		this._ckBreadcrumBsActive.set(value);
	}

	private _revealInEditor(event: IBreadcrumBsItemEvent, element: BreadcrumBElement, group: SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE | undefined, pinned: Boolean = false): void {
		if (element instanceof FileElement) {
			if (element.kind === FileKind.FILE) {
				// open file in any editor
				this._editorService.openEditor({ resource: element.uri, options: { pinned: pinned } }, group);
			} else {
				// show next picker
				let items = this._widget.getItems();
				let idx = items.indexOf(event.item);
				this._widget.setFocused(items[idx + 1]);
				this._widget.setSelection(items[idx + 1], BreadcrumBsControl.Payload_Pick);
			}

		} else if (element instanceof OutlineElement) {
			// open symBol in code editor
			const model = OutlineModel.get(element);
			if (model) {
				this._codeEditorService.openCodeEditor({
					resource: model.uri,
					options: {
						selection: Range.collapseToStart(element.symBol.selectionRange),
						selectionRevealType: TextEditorSelectionRevealType.CenterIfOutsideViewport
					}
				}, withUndefinedAsNull(this._getActiveCodeEditor()), group === SIDE_GROUP);
			}
		}
	}

	private _getEditorGroup(data: oBject): SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE | undefined {
		if (data === BreadcrumBsControl.Payload_RevealAside) {
			return SIDE_GROUP;
		} else if (data === BreadcrumBsControl.Payload_Reveal) {
			return ACTIVE_GROUP;
		} else {
			return undefined;
		}
	}
}

//#region commands

// toggle command
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'BreadcrumBs.toggle',
		title: { value: localize('cmd.toggle', "Toggle BreadcrumBs"), original: 'Toggle BreadcrumBs' },
		category: CATEGORIES.View
	}
});
MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '5_editor',
	order: 3,
	command: {
		id: 'BreadcrumBs.toggle',
		title: localize('miShowBreadcrumBs', "Show &&BreadcrumBs"),
		toggled: ContextKeyExpr.equals('config.BreadcrumBs.enaBled', true)
	}
});
CommandsRegistry.registerCommand('BreadcrumBs.toggle', accessor => {
	let config = accessor.get(IConfigurationService);
	let value = BreadcrumBsConfig.IsEnaBled.BindTo(config).getValue();
	BreadcrumBsConfig.IsEnaBled.BindTo(config).updateValue(!value);
});

// focus/focus-and-select
function focusAndSelectHandler(accessor: ServicesAccessor, select: Boolean): void {
	// find widget and focus/select
	const groups = accessor.get(IEditorGroupsService);
	const BreadcrumBs = accessor.get(IBreadcrumBsService);
	const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
	if (widget) {
		const item = tail(widget.getItems());
		widget.setFocused(item);
		if (select) {
			widget.setSelection(item, BreadcrumBsControl.Payload_Pick);
		}
	}
}
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: 'BreadcrumBs.focusAndSelect',
		title: { value: localize('cmd.focus', "Focus BreadcrumBs"), original: 'Focus BreadcrumBs' },
		precondition: BreadcrumBsControl.CK_BreadcrumBsVisiBle
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focusAndSelect',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_DOT,
	when: BreadcrumBsControl.CK_BreadcrumBsPossiBle,
	handler: accessor => focusAndSelectHandler(accessor, true)
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focus',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SEMICOLON,
	when: BreadcrumBsControl.CK_BreadcrumBsPossiBle,
	handler: accessor => focusAndSelectHandler(accessor, false)
});

// this commands is only enaBled when BreadcrumBs are
// disaBled which it then enaBles and focuses
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.toggleToOn',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_DOT,
	when: ContextKeyExpr.not('config.BreadcrumBs.enaBled'),
	handler: async accessor => {
		const instant = accessor.get(IInstantiationService);
		const config = accessor.get(IConfigurationService);
		// check if enaBled and iff not enaBle
		const isEnaBled = BreadcrumBsConfig.IsEnaBled.BindTo(config);
		if (!isEnaBled.getValue()) {
			await isEnaBled.updateValue(true);
			await timeout(50); // hacky - the widget might not Be ready yet...
		}
		return instant.invokeFunction(focusAndSelectHandler, true);
	}
});

// navigation
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focusNext',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.RightArrow,
	secondary: [KeyMod.CtrlCmd | KeyCode.RightArrow],
	mac: {
		primary: KeyCode.RightArrow,
		secondary: [KeyMod.Alt | KeyCode.RightArrow],
	},
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.focusNext();
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focusPrevious',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.LeftArrow,
	secondary: [KeyMod.CtrlCmd | KeyCode.LeftArrow],
	mac: {
		primary: KeyCode.LeftArrow,
		secondary: [KeyMod.Alt | KeyCode.LeftArrow],
	},
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.focusPrev();
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focusNextWithPicker',
	weight: KeyBindingWeight.WorkBenchContriB + 1,
	primary: KeyMod.CtrlCmd | KeyCode.RightArrow,
	mac: {
		primary: KeyMod.Alt | KeyCode.RightArrow,
	},
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive, WorkBenchListFocusContextKey),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.focusNext();
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.focusPreviousWithPicker',
	weight: KeyBindingWeight.WorkBenchContriB + 1,
	primary: KeyMod.CtrlCmd | KeyCode.LeftArrow,
	mac: {
		primary: KeyMod.Alt | KeyCode.LeftArrow,
	},
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive, WorkBenchListFocusContextKey),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.focusPrev();
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.selectFocused',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.Enter,
	secondary: [KeyCode.DownArrow],
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.setSelection(widget.getFocused(), BreadcrumBsControl.Payload_Pick);
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.revealFocused',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyCode.Space,
	secondary: [KeyMod.CtrlCmd | KeyCode.Enter],
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.setSelection(widget.getFocused(), BreadcrumBsControl.Payload_Reveal);
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.selectEditor',
	weight: KeyBindingWeight.WorkBenchContriB + 1,
	primary: KeyCode.Escape,
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive),
	handler(accessor) {
		const groups = accessor.get(IEditorGroupsService);
		const BreadcrumBs = accessor.get(IBreadcrumBsService);
		const widget = BreadcrumBs.getWidget(groups.activeGroup.id);
		if (!widget) {
			return;
		}
		widget.setFocused(undefined);
		widget.setSelection(undefined);
		if (groups.activeGroup.activeEditorPane) {
			groups.activeGroup.activeEditorPane.focus();
		}
	}
});
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'BreadcrumBs.revealFocusedFromTreeAside',
	weight: KeyBindingWeight.WorkBenchContriB,
	primary: KeyMod.CtrlCmd | KeyCode.Enter,
	when: ContextKeyExpr.and(BreadcrumBsControl.CK_BreadcrumBsVisiBle, BreadcrumBsControl.CK_BreadcrumBsActive, WorkBenchListFocusContextKey),
	handler(accessor) {
		const editors = accessor.get(IEditorService);
		const lists = accessor.get(IListService);
		const element = lists.lastFocusedList ? <OutlineElement | IFileStat>lists.lastFocusedList.getFocus()[0] : undefined;
		if (element instanceof OutlineElement) {
			const outlineElement = OutlineModel.get(element);
			if (!outlineElement) {
				return undefined;
			}

			// open symBol in editor
			return editors.openEditor({
				resource: outlineElement.uri,
				options: { selection: Range.collapseToStart(element.symBol.selectionRange) }
			}, SIDE_GROUP);

		} else if (element && URI.isUri(element.resource)) {
			// open file in editor
			return editors.openEditor({
				resource: element.resource,
			}, SIDE_GROUP);

		} else {
			// ignore
			return undefined;
		}
	}
});
//#endregion
