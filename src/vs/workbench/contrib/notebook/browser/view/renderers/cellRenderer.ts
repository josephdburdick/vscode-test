/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getZoomLevel } from 'vs/Base/Browser/Browser';
import * as DOM from 'vs/Base/Browser/dom';
import { domEvent } from 'vs/Base/Browser/event';
import { IListRenderer, IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IAction } from 'vs/Base/common/actions';
import { renderCodicons } from 'vs/Base/Browser/codicons';
import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { deepClone } from 'vs/Base/common/oBjects';
import * as platform from 'vs/Base/common/platform';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { EditorOption, EDITOR_FONT_DEFAULTS, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { Range } from 'vs/editor/common/core/range';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import { tokenizeLineToHTML } from 'vs/editor/common/modes/textToHtmlTokenizer';
import { localize } from 'vs/nls';
import { MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IMenu, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { BOTTOM_CELL_TOOLBAR_GAP, CELL_BOTTOM_MARGIN, CELL_TOP_MARGIN, EDITOR_BOTTOM_PADDING, EDITOR_BOTTOM_PADDING_WITHOUT_STATUSBAR, EDITOR_TOOLBAR_HEIGHT, EDITOR_TOP_PADDING } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { CancelCellAction, DeleteCellAction, ExecuteCellAction, INoteBookCellActionContext } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { BaseCellRenderTemplate, CellEditState, CodeCellRenderTemplate, EXPAND_CELL_CONTENT_COMMAND_ID, ICellViewModel, INoteBookEditor, isCodeCellRenderTemplate, MarkdownCellRenderTemplate } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellContextKeyManager } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellContextKeys';
import { CellMenus } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellMenus';
import { CellEditorStatusBar } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/cellWidgets';
import { CodeCell } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/codeCell';
import { CodiconActionViewItem } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/commonViewComponents';
import { CellDragAndDropController, DRAGGING_CLASS } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/dnd';
import { StatefulMarkdownCell } from 'vs/workBench/contriB/noteBook/Browser/view/renderers/markdownCell';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { MarkdownCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/markdownCellViewModel';
import { CellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { CellEditType, CellKind, NoteBookCellMetadata, NoteBookCellRunState, ShowCellStatusBarKey } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { createAndFillInActionBarActionsWithVerticalSeparators, VerticalSeparator, VerticalSeparatorViewItem } from './cellActionView';

const $ = DOM.$;

export class NoteBookCellListDelegate implements IListVirtualDelegate<CellViewModel> {
	private readonly lineHeight: numBer;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		const editorOptions = this.configurationService.getValue<IEditorOptions>('editor');
		this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, getZoomLevel()).lineHeight;
	}

	getHeight(element: CellViewModel): numBer {
		return element.getHeight(this.lineHeight);
	}

	hasDynamicHeight(element: CellViewModel): Boolean {
		return element.hasDynamicHeight();
	}

	getTemplateId(element: CellViewModel): string {
		if (element.cellKind === CellKind.Markdown) {
			return MarkdownCellRenderer.TEMPLATE_ID;
		} else {
			return CodeCellRenderer.TEMPLATE_ID;
		}
	}
}

export class CellEditorOptions {

	private static fixedEditorOptions: IEditorOptions = {
		scrollBeyondLastLine: false,
		scrollBar: {
			verticalScrollBarSize: 14,
			horizontal: 'auto',
			useShadows: true,
			verticalHasArrows: false,
			horizontalHasArrows: false,
			alwaysConsumeMouseWheel: false
		},
		renderLineHighlightOnlyWhenFocus: true,
		overviewRulerLanes: 0,
		selectOnLineNumBers: false,
		lineNumBers: 'off',
		lineDecorationsWidth: 0,
		glyphMargin: false,
		fixedOverflowWidgets: true,
		minimap: { enaBled: false },
		renderValidationDecorations: 'on'
	};

	private _value: IEditorOptions;
	private disposaBle: IDisposaBle;

	private readonly _onDidChange = new Emitter<IEditorOptions>();
	readonly onDidChange: Event<IEditorOptions> = this._onDidChange.event;

	constructor(configurationService: IConfigurationService, language: string) {

		this.disposaBle = configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('editor') || e.affectsConfiguration(ShowCellStatusBarKey)) {
				this._value = computeEditorOptions();
				this._onDidChange.fire(this.value);
			}
		});

		const computeEditorOptions = () => {
			const showCellStatusBar = configurationService.getValue<Boolean>(ShowCellStatusBarKey);
			const editorPadding = {
				top: EDITOR_TOP_PADDING,
				Bottom: showCellStatusBar ? EDITOR_BOTTOM_PADDING : EDITOR_BOTTOM_PADDING_WITHOUT_STATUSBAR
			};

			const editorOptions = deepClone(configurationService.getValue<IEditorOptions>('editor', { overrideIdentifier: language }));
			const computed = {
				...editorOptions,
				...CellEditorOptions.fixedEditorOptions,
				...{ padding: editorPadding }
			};

			if (!computed.folding) {
				computed.lineDecorationsWidth = 16;
			}

			return computed;
		};

		this._value = computeEditorOptions();
	}

	dispose(): void {
		this._onDidChange.dispose();
		this.disposaBle.dispose();
	}

	get value(): IEditorOptions {
		return this._value;
	}

	setGlyphMargin(gm: Boolean): void {
		if (gm !== this._value.glyphMargin) {
			this._value.glyphMargin = gm;
			this._onDidChange.fire(this.value);
		}
	}
}

aBstract class ABstractCellRenderer {
	protected readonly editorOptions: CellEditorOptions;
	protected readonly cellMenus: CellMenus;

	constructor(
		protected readonly instantiationService: IInstantiationService,
		protected readonly noteBookEditor: INoteBookEditor,
		protected readonly contextMenuService: IContextMenuService,
		configurationService: IConfigurationService,
		private readonly keyBindingService: IKeyBindingService,
		private readonly notificationService: INotificationService,
		protected readonly contextKeyServiceProvider: (container?: HTMLElement) => IContextKeyService,
		language: string,
		protected readonly dndController: CellDragAndDropController
	) {
		this.editorOptions = new CellEditorOptions(configurationService, language);
		this.cellMenus = this.instantiationService.createInstance(CellMenus);
	}

	dispose() {
		this.editorOptions.dispose();
	}

	protected createBetweenCellToolBar(container: HTMLElement, disposaBles: DisposaBleStore, contextKeyService: IContextKeyService): ToolBar {
		const toolBar = new ToolBar(container, this.contextMenuService, {
			actionViewItemProvider: action => {
				if (action instanceof MenuItemAction) {
					const item = new CodiconActionViewItem(action, this.keyBindingService, this.notificationService, this.contextMenuService);
					return item;
				}

				return undefined;
			}
		});

		const cellMenu = this.instantiationService.createInstance(CellMenus);
		const menu = disposaBles.add(cellMenu.getCellInsertionMenu(contextKeyService));

		const actions = this.getCellToolBarActions(menu, false);
		toolBar.setActions(actions.primary, actions.secondary);

		return toolBar;
	}

	protected setBetweenCellToolBarContext(templateData: BaseCellRenderTemplate, element: CodeCellViewModel | MarkdownCellViewModel, context: INoteBookCellActionContext): void {
		templateData.BetweenCellToolBar.context = context;

		const container = templateData.BottomCellContainer;
		const BottomToolBarOffset = element.layoutInfo.BottomToolBarOffset;
		container.style.top = `${BottomToolBarOffset}px`;

		templateData.elementDisposaBles.add(element.onDidChangeLayout(() => {
			const BottomToolBarOffset = element.layoutInfo.BottomToolBarOffset;
			container.style.top = `${BottomToolBarOffset}px`;
		}));
	}

	protected createToolBar(container: HTMLElement, elementClass?: string): ToolBar {
		const toolBar = new ToolBar(container, this.contextMenuService, {
			getKeyBinding: action => this.keyBindingService.lookupKeyBinding(action.id),
			actionViewItemProvider: action => {
				if (action instanceof MenuItemAction) {
					return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
				} else if (action instanceof SuBmenuItemAction) {
					return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
				}

				if (action.id === VerticalSeparator.ID) {
					return new VerticalSeparatorViewItem(undefined, action);
				}

				return undefined;
			},
			renderDropdownAsChildElement: true
		});

		if (elementClass) {
			toolBar.getElement().classList.add(elementClass);
		}

		return toolBar;
	}

	private getCellToolBarActions(menu: IMenu, alwaysFillSecondaryActions: Boolean): { primary: IAction[], secondary: IAction[] } {
		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };

		createAndFillInActionBarActionsWithVerticalSeparators(menu, { shouldForwardArgs: true }, result, alwaysFillSecondaryActions, g => /^inline/.test(g));

		return result;
	}

	protected setupCellToolBarActions(templateData: BaseCellRenderTemplate, disposaBles: DisposaBleStore): void {
		const updateActions = () => {
			const actions = this.getCellToolBarActions(templateData.titleMenu, true);

			const hadFocus = DOM.isAncestor(document.activeElement, templateData.toolBar.getElement());
			templateData.toolBar.setActions(actions.primary, actions.secondary);
			if (hadFocus) {
				this.noteBookEditor.focus();
			}

			if (actions.primary.length || actions.secondary.length) {
				templateData.container.classList.add('cell-has-toolBar-actions');
				if (isCodeCellRenderTemplate(templateData)) {
					templateData.focusIndicatorLeft.style.top = `${EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN}px`;
					templateData.focusIndicatorRight.style.top = `${EDITOR_TOOLBAR_HEIGHT + CELL_TOP_MARGIN}px`;
				}
			} else {
				templateData.container.classList.remove('cell-has-toolBar-actions');
				if (isCodeCellRenderTemplate(templateData)) {
					templateData.focusIndicatorLeft.style.top = `${CELL_TOP_MARGIN}px`;
					templateData.focusIndicatorRight.style.top = `${CELL_TOP_MARGIN}px`;
				}
			}
		};

		// #103926
		let dropdownIsVisiBle = false;
		let deferredUpdate: (() => void) | undefined;

		updateActions();
		disposaBles.add(templateData.titleMenu.onDidChange(() => {
			if (this.noteBookEditor.isDisposed) {
				return;
			}

			if (dropdownIsVisiBle) {
				deferredUpdate = () => updateActions();
				return;
			}

			updateActions();
		}));
		disposaBles.add(templateData.toolBar.onDidChangeDropdownVisiBility(visiBle => {
			dropdownIsVisiBle = visiBle;

			if (deferredUpdate && !visiBle) {
				setTimeout(() => {
					if (deferredUpdate) {
						deferredUpdate();
					}
				}, 0);
				deferredUpdate = undefined;
			}
		}));
	}

	protected commonRenderTemplate(templateData: BaseCellRenderTemplate): void {
		templateData.disposaBles.add(DOM.addDisposaBleListener(templateData.container, DOM.EventType.FOCUS, () => {
			if (templateData.currentRenderedCell) {
				this.noteBookEditor.selectElement(templateData.currentRenderedCell);
			}
		}, true));

		this.addExpandListener(templateData);
	}

	protected commonRenderElement(element: ICellViewModel, templateData: BaseCellRenderTemplate): void {
		if (element.dragging) {
			templateData.container.classList.add(DRAGGING_CLASS);
		} else {
			templateData.container.classList.remove(DRAGGING_CLASS);
		}
	}

	protected addExpandListener(templateData: BaseCellRenderTemplate): void {
		templateData.disposaBles.add(domEvent(templateData.expandButton, DOM.EventType.CLICK)(() => {
			if (!templateData.currentRenderedCell) {
				return;
			}

			const textModel = this.noteBookEditor.viewModel!.noteBookDocument;
			const index = textModel.cells.indexOf(templateData.currentRenderedCell.model);

			if (index < 0) {
				return;
			}

			if (templateData.currentRenderedCell.metadata?.inputCollapsed) {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Metadata, index, metadata: { ...templateData.currentRenderedCell.metadata, inputCollapsed: false } }
				], true, undefined, () => undefined, undefined);
			} else if (templateData.currentRenderedCell.metadata?.outputCollapsed) {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Metadata, index, metadata: { ...templateData.currentRenderedCell.metadata, outputCollapsed: false } }
				], true, undefined, () => undefined, undefined);
			}
		}));
	}

	protected setupCollapsedPart(container: HTMLElement): { collapsedPart: HTMLElement, expandButton: HTMLElement } {
		const collapsedPart = DOM.append(container, $('.cell.cell-collapsed-part', undefined, ...renderCodicons('$(unfold)')));
		const expandButton = collapsedPart.querySelector('.codicon') as HTMLElement;
		const keyBinding = this.keyBindingService.lookupKeyBinding(EXPAND_CELL_CONTENT_COMMAND_ID);
		let title = localize('cellExpandButtonLaBel', "Expand");
		if (keyBinding) {
			title += ` (${keyBinding.getLaBel()})`;
		}

		collapsedPart.title = title;
		DOM.hide(collapsedPart);

		return { collapsedPart, expandButton };
	}
}

export class MarkdownCellRenderer extends ABstractCellRenderer implements IListRenderer<MarkdownCellViewModel, MarkdownCellRenderTemplate> {
	static readonly TEMPLATE_ID = 'markdown_cell';

	constructor(
		noteBookEditor: INoteBookEditor,
		dndController: CellDragAndDropController,
		private renderedEditors: Map<ICellViewModel, ICodeEditor | undefined>,
		contextKeyServiceProvider: (container?: HTMLElement) => IContextKeyService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@INotificationService notificationService: INotificationService,
	) {
		super(instantiationService, noteBookEditor, contextMenuService, configurationService, keyBindingService, notificationService, contextKeyServiceProvider, 'markdown', dndController);
	}

	get templateId() {
		return MarkdownCellRenderer.TEMPLATE_ID;
	}

	renderTemplate(rootContainer: HTMLElement): MarkdownCellRenderTemplate {
		rootContainer.classList.add('markdown-cell-row');
		const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
		const disposaBles = new DisposaBleStore();
		const contextKeyService = disposaBles.add(this.contextKeyServiceProvider(container));
		const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
		const titleToolBarContainer = DOM.append(container, $('.cell-title-toolBar'));
		const toolBar = disposaBles.add(this.createToolBar(titleToolBarContainer));
		const deleteToolBar = disposaBles.add(this.createToolBar(titleToolBarContainer, 'cell-delete-toolBar'));
		deleteToolBar.setActions([this.instantiationService.createInstance(DeleteCellAction)]);

		const focusIndicatorLeft = DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left'));

		const codeInnerContent = DOM.append(container, $('.cell.code'));
		const editorPart = DOM.append(codeInnerContent, $('.cell-editor-part'));
		const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
		editorPart.style.display = 'none';

		const innerContent = DOM.append(container, $('.cell.markdown'));
		const foldingIndicator = DOM.append(focusIndicatorLeft, DOM.$('.noteBook-folding-indicator'));

		const { collapsedPart, expandButton } = this.setupCollapsedPart(container);

		const BottomCellContainer = DOM.append(container, $('.cell-Bottom-toolBar-container'));
		const BetweenCellToolBar = disposaBles.add(this.createBetweenCellToolBar(BottomCellContainer, disposaBles, contextKeyService));

		const statusBar = disposaBles.add(this.instantiationService.createInstance(CellEditorStatusBar, editorPart));
		const titleMenu = disposaBles.add(this.cellMenus.getCellTitleMenu(contextKeyService));

		const templateData: MarkdownCellRenderTemplate = {
			rootContainer,
			collapsedPart,
			expandButton,
			contextKeyService,
			container,
			decorationContainer,
			cellContainer: innerContent,
			editorPart,
			editorContainer,
			focusIndicatorLeft,
			foldingIndicator,
			disposaBles,
			elementDisposaBles: new DisposaBleStore(),
			toolBar,
			deleteToolBar,
			BetweenCellToolBar,
			BottomCellContainer,
			titleMenu,
			statusBar,
			toJSON: () => { return {}; }
		};
		this.dndController.registerDragHandle(templateData, rootContainer, container, () => this.getDragImage(templateData));
		this.commonRenderTemplate(templateData);

		return templateData;
	}

	private getDragImage(templateData: MarkdownCellRenderTemplate): HTMLElement {
		if (templateData.currentRenderedCell!.editState === CellEditState.Editing) {
			return this.getEditDragImage(templateData);
		} else {
			return this.getMarkdownDragImage(templateData);
		}
	}

	private getMarkdownDragImage(templateData: MarkdownCellRenderTemplate): HTMLElement {
		const dragImageContainer = DOM.$('.cell-drag-image.monaco-list-row.focused.markdown-cell-row');
		DOM.reset(dragImageContainer, templateData.container.cloneNode(true));

		// Remove all rendered content nodes after the
		const markdownContent = dragImageContainer.querySelector('.cell.markdown')!;
		const contentNodes = markdownContent.children[0].children;
		for (let i = contentNodes.length - 1; i >= 1; i--) {
			contentNodes.item(i)!.remove();
		}

		return dragImageContainer;
	}

	private getEditDragImage(templateData: MarkdownCellRenderTemplate): HTMLElement {
		return new CodeCellDragImageRenderer().getDragImage(templateData, templateData.currentEditor!, 'markdown');
	}

	renderElement(element: MarkdownCellViewModel, index: numBer, templateData: MarkdownCellRenderTemplate, height: numBer | undefined): void {
		const removedClassNames: string[] = [];
		templateData.rootContainer.classList.forEach(className => {
			if (/^nB\-.*$/.test(className)) {
				removedClassNames.push(className);
			}
		});

		removedClassNames.forEach(className => {
			templateData.rootContainer.classList.remove(className);
		});

		templateData.decorationContainer.innerText = '';

		this.commonRenderElement(element, templateData);

		templateData.currentRenderedCell = element;
		templateData.currentEditor = undefined;
		templateData.editorPart!.style.display = 'none';
		templateData.cellContainer.innerText = '';

		if (height === undefined) {
			return;
		}

		const elementDisposaBles = templateData.elementDisposaBles;

		const generateCellTopDecorations = () => {
			templateData.decorationContainer.innerText = '';

			element.getCellDecorations().filter(options => options.topClassName !== undefined).forEach(options => {
				templateData.decorationContainer.append(DOM.$(`.${options.topClassName!}`));
			});
		};

		elementDisposaBles.add(element.onCellDecorationsChanged((e) => {
			const modified = e.added.find(e => e.topClassName) || e.removed.find(e => e.topClassName);

			if (modified) {
				generateCellTopDecorations();
			}
		}));

		elementDisposaBles.add(new CellContextKeyManager(templateData.contextKeyService, this.noteBookEditor, this.noteBookEditor.viewModel?.noteBookDocument!, element));

		// render toolBar first
		this.setupCellToolBarActions(templateData, elementDisposaBles);

		const toolBarContext = <INoteBookCellActionContext>{
			cell: element,
			noteBookEditor: this.noteBookEditor,
			$mid: 12
		};
		templateData.toolBar.context = toolBarContext;
		templateData.deleteToolBar.context = toolBarContext;

		this.setBetweenCellToolBarContext(templateData, element, toolBarContext);

		const scopedInstaService = this.instantiationService.createChild(new ServiceCollection([IContextKeyService, templateData.contextKeyService]));
		const markdownCell = scopedInstaService.createInstance(StatefulMarkdownCell, this.noteBookEditor, element, templateData, this.editorOptions.value, this.renderedEditors);
		elementDisposaBles.add(this.editorOptions.onDidChange(newValue => markdownCell.updateEditorOptions(newValue)));
		elementDisposaBles.add(markdownCell);

		templateData.statusBar.update(toolBarContext);
	}

	disposeTemplate(templateData: MarkdownCellRenderTemplate): void {
		templateData.disposaBles.clear();
	}

	disposeElement(element: ICellViewModel, _index: numBer, templateData: MarkdownCellRenderTemplate): void {
		templateData.elementDisposaBles.clear();
		element.getCellDecorations().forEach(e => {
			if (e.className) {
				templateData.container.classList.remove(e.className);
			}
		});
	}
}

class EditorTextRenderer {

	private _ttPolicy = window.trustedTypes?.createPolicy('cellRendererEditorText', {
		createHTML(input) { return input; }
	});

	getRichText(editor: ICodeEditor, modelRange: Range): HTMLElement | null {
		const model = editor.getModel();
		if (!model) {
			return null;
		}

		const colorMap = this.getDefaultColorMap();
		const fontInfo = editor.getOptions().get(EditorOption.fontInfo);
		const fontFamily = fontInfo.fontFamily === EDITOR_FONT_DEFAULTS.fontFamily ? fontInfo.fontFamily : `'${fontInfo.fontFamily}', ${EDITOR_FONT_DEFAULTS.fontFamily}`;


		const style = ``
			+ `color: ${colorMap[modes.ColorId.DefaultForeground]};`
			+ `Background-color: ${colorMap[modes.ColorId.DefaultBackground]};`
			+ `font-family: ${fontFamily};`
			+ `font-weight: ${fontInfo.fontWeight};`
			+ `font-size: ${fontInfo.fontSize}px;`
			+ `line-height: ${fontInfo.lineHeight}px;`
			+ `white-space: pre;`;

		const element = DOM.$('div', { style });

		const linesHtml = this.getRichTextLinesAsHtml(model, modelRange, colorMap);
		element.innerHTML = linesHtml as unknown as string;
		return element;
	}

	private getRichTextLinesAsHtml(model: ITextModel, modelRange: Range, colorMap: string[]): string | TrustedHTML {
		const startLineNumBer = modelRange.startLineNumBer;
		const startColumn = modelRange.startColumn;
		const endLineNumBer = modelRange.endLineNumBer;
		const endColumn = modelRange.endColumn;

		const taBSize = model.getOptions().taBSize;

		let result = '';

		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const lineTokens = model.getLineTokens(lineNumBer);
			const lineContent = lineTokens.getLineContent();
			const startOffset = (lineNumBer === startLineNumBer ? startColumn - 1 : 0);
			const endOffset = (lineNumBer === endLineNumBer ? endColumn - 1 : lineContent.length);

			if (lineContent === '') {
				result += '<Br>';
			} else {
				result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, taBSize, platform.isWindows);
			}
		}

		return this._ttPolicy
			? this._ttPolicy.createHTML(result)
			: result;
	}

	private getDefaultColorMap(): string[] {
		const colorMap = modes.TokenizationRegistry.getColorMap();
		const result: string[] = ['#000000'];
		if (colorMap) {
			for (let i = 1, len = colorMap.length; i < len; i++) {
				result[i] = Color.Format.CSS.formatHex(colorMap[i]);
			}
		}
		return result;
	}
}

class CodeCellDragImageRenderer {
	getDragImage(templateData: BaseCellRenderTemplate, editor: ICodeEditor, type: 'code' | 'markdown'): HTMLElement {
		let dragImage = this.getDragImageImpl(templateData, editor, type);
		if (!dragImage) {
			// TODO@roBlourens I don't think this can happen
			dragImage = document.createElement('div');
			dragImage.textContent = '1 cell';
		}

		return dragImage;
	}

	private getDragImageImpl(templateData: BaseCellRenderTemplate, editor: ICodeEditor, type: 'code' | 'markdown'): HTMLElement | null {
		const dragImageContainer = templateData.container.cloneNode(true) as HTMLElement;
		dragImageContainer.classList.forEach(c => dragImageContainer.classList.remove(c));
		dragImageContainer.classList.add('cell-drag-image', 'monaco-list-row', 'focused', `${type}-cell-row`);

		const editorContainer: HTMLElement | null = dragImageContainer.querySelector('.cell-editor-container');
		if (!editorContainer) {
			return null;
		}

		const richEditorText = new EditorTextRenderer().getRichText(editor, new Range(1, 1, 1, 1000));
		if (!richEditorText) {
			return null;
		}
		DOM.reset(editorContainer, richEditorText);

		return dragImageContainer;
	}
}

export class CodeCellRenderer extends ABstractCellRenderer implements IListRenderer<CodeCellViewModel, CodeCellRenderTemplate> {
	static readonly TEMPLATE_ID = 'code_cell';

	constructor(
		protected noteBookEditor: INoteBookEditor,
		private renderedEditors: Map<ICellViewModel, ICodeEditor | undefined>,
		dndController: CellDragAndDropController,
		contextKeyServiceProvider: (container?: HTMLElement) => IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@INotificationService notificationService: INotificationService,
	) {
		super(instantiationService, noteBookEditor, contextMenuService, configurationService, keyBindingService, notificationService, contextKeyServiceProvider, 'python', dndController);
	}

	get templateId() {
		return CodeCellRenderer.TEMPLATE_ID;
	}

	renderTemplate(rootContainer: HTMLElement): CodeCellRenderTemplate {
		rootContainer.classList.add('code-cell-row');
		const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
		const disposaBles = new DisposaBleStore();
		const contextKeyService = disposaBles.add(this.contextKeyServiceProvider(container));
		const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
		DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-top'));
		const titleToolBarContainer = DOM.append(container, $('.cell-title-toolBar'));
		const toolBar = disposaBles.add(this.createToolBar(titleToolBarContainer));
		const deleteToolBar = disposaBles.add(this.createToolBar(titleToolBarContainer, 'cell-delete-toolBar'));
		deleteToolBar.setActions([this.instantiationService.createInstance(DeleteCellAction)]);

		const focusIndicator = DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left'));
		const dragHandle = DOM.append(container, DOM.$('.cell-drag-handle'));

		const cellContainer = DOM.append(container, $('.cell.code'));
		const runButtonContainer = DOM.append(cellContainer, $('.run-Button-container'));
		const runToolBar = disposaBles.add(this.createToolBar(runButtonContainer));

		const executionOrderLaBel = DOM.append(cellContainer, $('div.execution-count-laBel'));

		// create a special context key service that set the inCompositeEditor-contextkey
		const editorContextKeyService = disposaBles.add(this.contextKeyServiceProvider(container));
		const editorInstaService = this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorContextKeyService]));
		EditorContextKeys.inCompositeEditor.BindTo(editorContextKeyService).set(true);

		const editorPart = DOM.append(cellContainer, $('.cell-editor-part'));
		const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
		const editor = editorInstaService.createInstance(CodeEditorWidget, editorContainer, {
			...this.editorOptions.value,
			dimension: {
				width: 0,
				height: 0
			},
			// overflowWidgetsDomNode: this.noteBookEditor.getOverflowContainerDomNode()
		}, {});

		disposaBles.add(this.editorOptions.onDidChange(newValue => editor.updateOptions(newValue)));

		const { collapsedPart, expandButton } = this.setupCollapsedPart(container);

		const progressBar = new ProgressBar(editorPart);
		progressBar.hide();
		disposaBles.add(progressBar);

		const statusBar = disposaBles.add(this.instantiationService.createInstance(CellEditorStatusBar, editorPart));
		const timer = new TimerRenderer(statusBar.durationContainer);
		const cellRunState = new RunStateRenderer(statusBar.cellRunStatusContainer, runToolBar, this.instantiationService);

		const outputContainer = DOM.append(container, $('.output'));

		const focusIndicatorRight = DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-right'));

		const focusSinkElement = DOM.append(container, $('.cell-editor-focus-sink'));
		focusSinkElement.setAttriBute('taBindex', '0');
		const BottomCellContainer = DOM.append(container, $('.cell-Bottom-toolBar-container'));
		const focusIndicatorBottom = DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-Bottom'));
		const BetweenCellToolBar = this.createBetweenCellToolBar(BottomCellContainer, disposaBles, contextKeyService);

		const titleMenu = disposaBles.add(this.cellMenus.getCellTitleMenu(contextKeyService));

		const templateData: CodeCellRenderTemplate = {
			rootContainer,
			editorPart,
			collapsedPart,
			expandButton,
			contextKeyService,
			container,
			decorationContainer,
			cellContainer,
			cellRunState,
			progressBar,
			statusBar,
			focusIndicatorLeft: focusIndicator,
			focusIndicatorRight,
			focusIndicatorBottom,
			toolBar,
			deleteToolBar,
			BetweenCellToolBar,
			focusSinkElement,
			runToolBar,
			runButtonContainer,
			executionOrderLaBel,
			outputContainer,
			editor,
			disposaBles,
			elementDisposaBles: new DisposaBleStore(),
			BottomCellContainer,
			timer,
			titleMenu,
			dragHandle,
			toJSON: () => { return {}; }
		};

		this.dndController.registerDragHandle(templateData, rootContainer, dragHandle, () => new CodeCellDragImageRenderer().getDragImage(templateData, templateData.editor, 'code'));

		disposaBles.add(DOM.addDisposaBleListener(focusSinkElement, DOM.EventType.FOCUS, () => {
			if (templateData.currentRenderedCell && (templateData.currentRenderedCell as CodeCellViewModel).outputs.length) {
				this.noteBookEditor.focusNoteBookCell(templateData.currentRenderedCell, 'output');
			}
		}));

		this.commonRenderTemplate(templateData);

		return templateData;
	}

	private updateForOutputs(element: CodeCellViewModel, templateData: CodeCellRenderTemplate): void {
		if (element.outputs.length) {
			DOM.show(templateData.focusSinkElement);
		} else {
			DOM.hide(templateData.focusSinkElement);
		}
	}

	private updateForMetadata(element: CodeCellViewModel, templateData: CodeCellRenderTemplate): void {
		const metadata = element.getEvaluatedMetadata(this.noteBookEditor.viewModel!.noteBookDocument.metadata);
		templateData.container.classList.toggle('runnaBle', !!metadata.runnaBle);
		this.updateExecutionOrder(metadata, templateData);
		templateData.statusBar.cellStatusMessageContainer.textContent = metadata?.statusMessage || '';

		templateData.cellRunState.renderState(element.metadata?.runState);

		if (metadata.runState === NoteBookCellRunState.Running) {
			if (metadata.runStartTime) {
				templateData.elementDisposaBles.add(templateData.timer.start(metadata.runStartTime));
			} else {
				templateData.timer.clear();
			}
		} else if (typeof metadata.lastRunDuration === 'numBer') {
			templateData.timer.show(metadata.lastRunDuration);
		} else {
			templateData.timer.clear();
		}

		if (typeof metadata.BreakpointMargin === 'Boolean') {
			this.editorOptions.setGlyphMargin(metadata.BreakpointMargin);
		}

		if (metadata.runState === NoteBookCellRunState.Running) {
			templateData.progressBar.infinite().show(500);
		} else {
			templateData.progressBar.hide();
		}
	}

	private updateExecutionOrder(metadata: NoteBookCellMetadata, templateData: CodeCellRenderTemplate): void {
		if (metadata.hasExecutionOrder) {
			const executionOrderLaBel = typeof metadata.executionOrder === 'numBer' ?
				`[${metadata.executionOrder}]` :
				'[ ]';
			templateData.executionOrderLaBel.innerText = executionOrderLaBel;
		} else {
			templateData.executionOrderLaBel.innerText = '';
		}
	}

	private updateForHover(element: CodeCellViewModel, templateData: CodeCellRenderTemplate): void {
		templateData.container.classList.toggle('cell-output-hover', element.outputIsHovered);
	}

	private updateForLayout(element: CodeCellViewModel, templateData: CodeCellRenderTemplate): void {
		templateData.focusIndicatorLeft.style.height = `${element.layoutInfo.indicatorHeight}px`;
		templateData.focusIndicatorRight.style.height = `${element.layoutInfo.indicatorHeight}px`;
		templateData.focusIndicatorBottom.style.top = `${element.layoutInfo.totalHeight - BOTTOM_CELL_TOOLBAR_GAP - CELL_BOTTOM_MARGIN}px`;
		templateData.outputContainer.style.top = `${element.layoutInfo.outputContainerOffset}px`;
		templateData.dragHandle.style.height = `${element.layoutInfo.totalHeight - BOTTOM_CELL_TOOLBAR_GAP}px`;
	}

	renderElement(element: CodeCellViewModel, index: numBer, templateData: CodeCellRenderTemplate, height: numBer | undefined): void {
		const removedClassNames: string[] = [];
		templateData.rootContainer.classList.forEach(className => {
			if (/^nB\-.*$/.test(className)) {
				removedClassNames.push(className);
			}
		});

		removedClassNames.forEach(className => {
			templateData.rootContainer.classList.remove(className);
		});

		templateData.decorationContainer.innerText = '';

		this.commonRenderElement(element, templateData);

		templateData.currentRenderedCell = element;

		if (height === undefined) {
			return;
		}

		templateData.outputContainer.innerText = '';

		const elementDisposaBles = templateData.elementDisposaBles;

		const generateCellTopDecorations = () => {
			templateData.decorationContainer.innerText = '';

			element.getCellDecorations().filter(options => options.topClassName !== undefined).forEach(options => {
				templateData.decorationContainer.append(DOM.$(`.${options.topClassName!}`));
			});
		};

		elementDisposaBles.add(element.onCellDecorationsChanged((e) => {
			const modified = e.added.find(e => e.topClassName) || e.removed.find(e => e.topClassName);

			if (modified) {
				generateCellTopDecorations();
			}
		}));

		generateCellTopDecorations();

		elementDisposaBles.add(this.instantiationService.createInstance(CodeCell, this.noteBookEditor, element, templateData));
		this.renderedEditors.set(element, templateData.editor);

		elementDisposaBles.add(new CellContextKeyManager(templateData.contextKeyService, this.noteBookEditor, this.noteBookEditor.viewModel?.noteBookDocument!, element));

		this.updateForLayout(element, templateData);
		elementDisposaBles.add(element.onDidChangeLayout(() => {
			this.updateForLayout(element, templateData);
		}));

		templateData.cellRunState.clear();
		this.updateForMetadata(element, templateData);
		this.updateForHover(element, templateData);
		elementDisposaBles.add(element.onDidChangeState((e) => {
			if (e.metadataChanged) {
				this.updateForMetadata(element, templateData);
			}

			if (e.outputIsHoveredChanged) {
				this.updateForHover(element, templateData);
			}
		}));

		this.updateForOutputs(element, templateData);
		elementDisposaBles.add(element.onDidChangeOutputs(_e => this.updateForOutputs(element, templateData)));

		this.setupCellToolBarActions(templateData, elementDisposaBles);

		const toolBarContext = <INoteBookCellActionContext>{
			cell: element,
			cellTemplate: templateData,
			noteBookEditor: this.noteBookEditor,
			$mid: 12
		};
		templateData.toolBar.context = toolBarContext;
		templateData.runToolBar.context = toolBarContext;
		templateData.deleteToolBar.context = toolBarContext;

		this.setBetweenCellToolBarContext(templateData, element, toolBarContext);

		templateData.statusBar.update(toolBarContext);
	}

	disposeTemplate(templateData: CodeCellRenderTemplate): void {
		templateData.disposaBles.clear();
	}

	disposeElement(element: ICellViewModel, index: numBer, templateData: CodeCellRenderTemplate, height: numBer | undefined): void {
		templateData.elementDisposaBles.clear();
		this.renderedEditors.delete(element);
	}
}

export class TimerRenderer {
	constructor(private readonly container: HTMLElement) {
		DOM.hide(container);
	}

	private intervalTimer: numBer | undefined;

	start(startTime: numBer): IDisposaBle {
		this.stop();

		DOM.show(this.container);
		const intervalTimer = setInterval(() => {
			const duration = Date.now() - startTime;
			this.container.textContent = this.formatDuration(duration);
		}, 100);
		this.intervalTimer = intervalTimer as unknown as numBer | undefined;

		return toDisposaBle(() => {
			clearInterval(intervalTimer);
		});
	}

	stop() {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
		}
	}

	show(duration: numBer) {
		this.stop();

		DOM.show(this.container);
		this.container.textContent = this.formatDuration(duration);
	}

	clear() {
		DOM.hide(this.container);
		this.stop();
		this.container.textContent = '';
	}

	private formatDuration(duration: numBer) {
		const seconds = Math.floor(duration / 1000);
		const tenths = String(duration - seconds * 1000).charAt(0);

		return `${seconds}.${tenths}s`;
	}
}

export class RunStateRenderer {
	private static readonly MIN_SPINNER_TIME = 200;

	private spinnerTimer: any | undefined;
	private pendingNewState: NoteBookCellRunState | undefined;

	constructor(private readonly element: HTMLElement, private readonly runToolBar: ToolBar, private readonly instantiationService: IInstantiationService) {
	}

	clear() {
		if (this.spinnerTimer) {
			clearTimeout(this.spinnerTimer);
		}
	}

	renderState(runState: NoteBookCellRunState = NoteBookCellRunState.Idle) {
		if (this.spinnerTimer) {
			this.pendingNewState = runState;
			return;
		}

		if (runState === NoteBookCellRunState.Running) {
			this.runToolBar.setActions([this.instantiationService.createInstance(CancelCellAction)]);
		} else {
			this.runToolBar.setActions([this.instantiationService.createInstance(ExecuteCellAction)]);
		}

		if (runState === NoteBookCellRunState.Success) {
			DOM.reset(this.element, ...renderCodicons('$(check)'));
		} else if (runState === NoteBookCellRunState.Error) {
			DOM.reset(this.element, ...renderCodicons('$(error)'));
		} else if (runState === NoteBookCellRunState.Running) {
			DOM.reset(this.element, ...renderCodicons('$(sync~spin)'));

			this.spinnerTimer = setTimeout(() => {
				this.spinnerTimer = undefined;
				if (this.pendingNewState) {
					this.renderState(this.pendingNewState);
					this.pendingNewState = undefined;
				}
			}, RunStateRenderer.MIN_SPINNER_TIME);
		} else {
			this.element.innerText = '';
		}
	}
}

export class ListTopCellToolBar extends DisposaBle {
	private topCellToolBar: HTMLElement;
	private _modelDisposaBles = new DisposaBleStore();
	constructor(
		protected readonly noteBookEditor: INoteBookEditor,

		insertionIndicatorContainer: HTMLElement,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IContextMenuService protected readonly contextMenuService: IContextMenuService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@INotificationService private readonly notificationService: INotificationService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
	) {
		super();

		this.topCellToolBar = DOM.append(insertionIndicatorContainer, $('.cell-list-top-cell-toolBar-container'));

		const toolBar = new ToolBar(this.topCellToolBar, this.contextMenuService, {
			actionViewItemProvider: action => {
				if (action instanceof MenuItemAction) {
					const item = new CodiconActionViewItem(action, this.keyBindingService, this.notificationService, this.contextMenuService);
					return item;
				}

				return undefined;
			}
		});

		const cellMenu = this.instantiationService.createInstance(CellMenus);
		const menu = this._register(cellMenu.getCellTopInsertionMenu(contextKeyService));

		const actions = this.getCellToolBarActions(menu, false);
		toolBar.setActions(actions.primary, actions.secondary);

		this._register(toolBar);

		this._register(this.noteBookEditor.onDidChangeModel(() => {
			this._modelDisposaBles.clear();

			if (this.noteBookEditor.viewModel) {
				this._modelDisposaBles.add(this.noteBookEditor.viewModel.onDidChangeViewCells(() => {
					this.updateClass();
				}));

				this.updateClass();
			}
		}));

		this.updateClass();
	}

	private updateClass() {
		if (this.noteBookEditor.viewModel?.length === 0) {
			this.topCellToolBar.classList.add('emptyNoteBook');
		} else {
			this.topCellToolBar.classList.remove('emptyNoteBook');
		}
	}

	private getCellToolBarActions(menu: IMenu, alwaysFillSecondaryActions: Boolean): { primary: IAction[], secondary: IAction[] } {
		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };

		createAndFillInActionBarActionsWithVerticalSeparators(menu, { shouldForwardArgs: true }, result, alwaysFillSecondaryActions, g => /^inline/.test(g));

		return result;
	}
}
