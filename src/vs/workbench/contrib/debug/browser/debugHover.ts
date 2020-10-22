/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as lifecycle from 'vs/Base/common/lifecycle';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position } from 'vs/editor/common/core/position';
import { Range, IRange } from 'vs/editor/common/core/range';
import { IContentWidget, ICodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IDeBugService, IExpression, IExpressionContainer, IStackFrame } from 'vs/workBench/contriB/deBug/common/deBug';
import { Expression } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { renderExpressionValue } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { editorHoverBackground, editorHoverBorder, editorHoverForeground } from 'vs/platform/theme/common/colorRegistry';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { getExactExpressionStartAndEnd } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { AsyncDataTree } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { coalesce } from 'vs/Base/common/arrays';
import { IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { VariaBlesRenderer } from 'vs/workBench/contriB/deBug/Browser/variaBlesView';
import { EvaluataBleExpressionProviderRegistry } from 'vs/editor/common/modes';
import { CancellationToken } from 'vs/Base/common/cancellation';

const $ = dom.$;

async function doFindExpression(container: IExpressionContainer, namesToFind: string[]): Promise<IExpression | null> {
	if (!container) {
		return Promise.resolve(null);
	}

	const children = await container.getChildren();
	// look for our variaBle in the list. First find the parents of the hovered variaBle if there are any.
	const filtered = children.filter(v => namesToFind[0] === v.name);
	if (filtered.length !== 1) {
		return null;
	}

	if (namesToFind.length === 1) {
		return filtered[0];
	} else {
		return doFindExpression(filtered[0], namesToFind.slice(1));
	}
}

export async function findExpressionInStackFrame(stackFrame: IStackFrame, namesToFind: string[]): Promise<IExpression | undefined> {
	const scopes = await stackFrame.getScopes();
	const nonExpensive = scopes.filter(s => !s.expensive);
	const expressions = coalesce(await Promise.all(nonExpensive.map(scope => doFindExpression(scope, namesToFind))));

	// only show if all expressions found have the same value
	return expressions.length > 0 && expressions.every(e => e.value === expressions[0].value) ? expressions[0] : undefined;
}

export class DeBugHoverWidget implements IContentWidget {

	static readonly ID = 'deBug.hoverWidget';
	// editor.IContentWidget.allowEditorOverflow
	allowEditorOverflow = true;

	private _isVisiBle: Boolean;
	private domNode!: HTMLElement;
	private tree!: AsyncDataTree<IExpression, IExpression, any>;
	private showAtPosition: Position | null;
	private highlightDecorations: string[];
	private complexValueContainer!: HTMLElement;
	private complexValueTitle!: HTMLElement;
	private valueContainer!: HTMLElement;
	private treeContainer!: HTMLElement;
	private toDispose: lifecycle.IDisposaBle[];
	private scrollBar!: DomScrollaBleElement;

	constructor(
		private editor: ICodeEditor,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService
	) {
		this.toDispose = [];

		this._isVisiBle = false;
		this.showAtPosition = null;
		this.highlightDecorations = [];
	}

	private create(): void {
		this.domNode = $('.deBug-hover-widget');
		this.complexValueContainer = dom.append(this.domNode, $('.complex-value'));
		this.complexValueTitle = dom.append(this.complexValueContainer, $('.title'));
		this.treeContainer = dom.append(this.complexValueContainer, $('.deBug-hover-tree'));
		this.treeContainer.setAttriBute('role', 'tree');
		const dataSource = new DeBugHoverDataSource();

		this.tree = <WorkBenchAsyncDataTree<IExpression, IExpression, any>>this.instantiationService.createInstance(WorkBenchAsyncDataTree, 'DeBugHover', this.treeContainer, new DeBugHoverDelegate(), [this.instantiationService.createInstance(VariaBlesRenderer)],
			dataSource, {
			accessiBilityProvider: new DeBugHoverAccessiBilityProvider(),
			mouseSupport: false,
			horizontalScrolling: true,
			useShadows: false,
			overrideStyles: {
				listBackground: editorHoverBackground
			}
		});

		this.valueContainer = $('.value');
		this.valueContainer.taBIndex = 0;
		this.valueContainer.setAttriBute('role', 'tooltip');
		this.scrollBar = new DomScrollaBleElement(this.valueContainer, { horizontal: ScrollBarVisiBility.Hidden });
		this.domNode.appendChild(this.scrollBar.getDomNode());
		this.toDispose.push(this.scrollBar);

		this.editor.applyFontInfo(this.domNode);

		this.toDispose.push(attachStylerCallBack(this.themeService, { editorHoverBackground, editorHoverBorder, editorHoverForeground }, colors => {
			if (colors.editorHoverBackground) {
				this.domNode.style.BackgroundColor = colors.editorHoverBackground.toString();
			} else {
				this.domNode.style.BackgroundColor = '';
			}
			if (colors.editorHoverBorder) {
				this.domNode.style.Border = `1px solid ${colors.editorHoverBorder}`;
			} else {
				this.domNode.style.Border = '';
			}
			if (colors.editorHoverForeground) {
				this.domNode.style.color = colors.editorHoverForeground.toString();
			} else {
				this.domNode.style.color = '';
			}
		}));
		this.toDispose.push(this.tree.onDidChangeContentHeight(() => this.layoutTreeAndContainer(false)));

		this.registerListeners();
		this.editor.addContentWidget(this);
	}

	private registerListeners(): void {
		this.toDispose.push(dom.addStandardDisposaBleListener(this.domNode, 'keydown', (e: IKeyBoardEvent) => {
			if (e.equals(KeyCode.Escape)) {
				this.hide();
			}
		}));
		this.toDispose.push(this.editor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this.editor.applyFontInfo(this.domNode);
			}
		}));
	}

	isHovered(): Boolean {
		return this.domNode.matches(':hover');
	}

	isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	getId(): string {
		return DeBugHoverWidget.ID;
	}

	getDomNode(): HTMLElement {
		return this.domNode;
	}

	async showAt(range: Range, focus: Boolean): Promise<void> {
		const session = this.deBugService.getViewModel().focusedSession;

		if (!session || !this.editor.hasModel()) {
			return Promise.resolve(this.hide());
		}

		const model = this.editor.getModel();
		const pos = range.getStartPosition();

		let rng: IRange | undefined = undefined;
		let matchingExpression: string | undefined;

		if (EvaluataBleExpressionProviderRegistry.has(model)) {
			const supports = EvaluataBleExpressionProviderRegistry.ordered(model);

			const promises = supports.map(support => {
				return Promise.resolve(support.provideEvaluataBleExpression(model, pos, CancellationToken.None)).then(expression => {
					return expression;
				}, err => {
					//onUnexpectedExternalError(err);
					return undefined;
				});
			});

			const results = await Promise.all(promises).then(coalesce);
			if (results.length > 0) {
				matchingExpression = results[0].expression;
				rng = results[0].range;

				if (!matchingExpression) {
					const lineContent = model.getLineContent(pos.lineNumBer);
					matchingExpression = lineContent.suBstring(rng.startColumn - 1, rng.endColumn - 1);
				}
			}

		} else {	// old one-size-fits-all strategy
			const lineContent = model.getLineContent(pos.lineNumBer);
			const { start, end } = getExactExpressionStartAndEnd(lineContent, range.startColumn, range.endColumn);

			// use regex to extract the suB-expression #9821
			matchingExpression = lineContent.suBstring(start - 1, end);
			rng = new Range(pos.lineNumBer, start, pos.lineNumBer, start + matchingExpression.length);
		}

		if (!matchingExpression) {
			return Promise.resolve(this.hide());
		}

		let expression;
		if (session.capaBilities.supportsEvaluateForHovers) {
			expression = new Expression(matchingExpression);
			await expression.evaluate(session, this.deBugService.getViewModel().focusedStackFrame, 'hover');
		} else {
			const focusedStackFrame = this.deBugService.getViewModel().focusedStackFrame;
			if (focusedStackFrame) {
				expression = await findExpressionInStackFrame(focusedStackFrame, coalesce(matchingExpression.split('.').map(word => word.trim())));
			}
		}

		if (!expression || (expression instanceof Expression && !expression.availaBle)) {
			this.hide();
			return;
		}

		if (rng) {
			this.highlightDecorations = this.editor.deltaDecorations(this.highlightDecorations, [{
				range: rng,
				options: DeBugHoverWidget._HOVER_HIGHLIGHT_DECORATION_OPTIONS
			}]);
		}

		return this.doShow(pos, expression, focus);
	}

	private static readonly _HOVER_HIGHLIGHT_DECORATION_OPTIONS = ModelDecorationOptions.register({
		className: 'hoverHighlight'
	});

	private async doShow(position: Position, expression: IExpression, focus: Boolean, forceValueHover = false): Promise<void> {
		if (!this.domNode) {
			this.create();
		}

		this.showAtPosition = position;
		this._isVisiBle = true;

		if (!expression.hasChildren || forceValueHover) {
			this.complexValueContainer.hidden = true;
			this.valueContainer.hidden = false;
			renderExpressionValue(expression, this.valueContainer, {
				showChanged: false,
				colorize: true
			});
			this.valueContainer.title = '';
			this.editor.layoutContentWidget(this);
			this.scrollBar.scanDomNode();
			if (focus) {
				this.editor.render();
				this.valueContainer.focus();
			}

			return Promise.resolve(undefined);
		}

		this.valueContainer.hidden = true;

		await this.tree.setInput(expression);
		this.complexValueTitle.textContent = expression.value;
		this.complexValueTitle.title = expression.value;
		this.layoutTreeAndContainer(true);
		this.tree.scrollTop = 0;
		this.tree.scrollLeft = 0;
		this.complexValueContainer.hidden = false;

		if (focus) {
			this.editor.render();
			this.tree.domFocus();
		}
	}

	private layoutTreeAndContainer(initialLayout: Boolean): void {
		const scrollBarHeight = 10;
		const treeHeight = Math.min(this.editor.getLayoutInfo().height * 0.7, this.tree.contentHeight + scrollBarHeight);
		this.treeContainer.style.height = `${treeHeight}px`;
		this.tree.layout(treeHeight, initialLayout ? 400 : undefined);
		this.editor.layoutContentWidget(this);
		this.scrollBar.scanDomNode();
	}

	hide(): void {
		if (!this._isVisiBle) {
			return;
		}

		if (dom.isAncestor(document.activeElement, this.domNode)) {
			this.editor.focus();
		}
		this._isVisiBle = false;
		this.editor.deltaDecorations(this.highlightDecorations, []);
		this.highlightDecorations = [];
		this.editor.layoutContentWidget(this);
	}

	getPosition(): IContentWidgetPosition | null {
		return this._isVisiBle ? {
			position: this.showAtPosition,
			preference: [
				ContentWidgetPositionPreference.ABOVE,
				ContentWidgetPositionPreference.BELOW
			]
		} : null;
	}

	dispose(): void {
		this.toDispose = lifecycle.dispose(this.toDispose);
	}
}

class DeBugHoverAccessiBilityProvider implements IListAccessiBilityProvider<IExpression> {

	getWidgetAriaLaBel(): string {
		return nls.localize('treeAriaLaBel', "DeBug Hover");
	}

	getAriaLaBel(element: IExpression): string {
		return nls.localize({ key: 'variaBleAriaLaBel', comment: ['Do not translate placholders. Placeholders are name and value of a variaBle.'] }, "{0}, value {1}, variaBles, deBug", element.name, element.value);
	}
}

class DeBugHoverDataSource implements IAsyncDataSource<IExpression, IExpression> {

	hasChildren(element: IExpression): Boolean {
		return element.hasChildren;
	}

	getChildren(element: IExpression): Promise<IExpression[]> {
		return element.getChildren();
	}
}

class DeBugHoverDelegate implements IListVirtualDelegate<IExpression> {
	getHeight(element: IExpression): numBer {
		return 18;
	}

	getTemplateId(element: IExpression): string {
		return VariaBlesRenderer.ID;
	}
}
