/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import * as dom from 'vs/Base/Browser/dom';
import { CollapseAction } from 'vs/workBench/Browser/viewlet';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IDeBugService, IExpression, IScope, CONTEXT_VARIABLES_FOCUSED, IStackFrame, CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT, IDataBreakpointInfoResponse, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT } from 'vs/workBench/contriB/deBug/common/deBug';
import { VariaBle, Scope, ErrorScope, StackFrame } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { renderViewTree, renderVariaBle, IInputBoxOptions, ABstractExpressionsRenderer, IExpressionTemplateData } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { IAction } from 'vs/Base/common/actions';
import { CopyValueAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeRenderer, ITreeNode, ITreeMouseEvent, ITreeContextMenuEvent, IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { IAsyncDataTreeViewState } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { HighlightedLaBel, IHighlight } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { dispose } from 'vs/Base/common/lifecycle';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { withUndefinedAsNull } from 'vs/Base/common/types';
import { IMenuService, IMenu, MenuId } from 'vs/platform/actions/common/actions';
import { createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

const $ = dom.$;
let forgetScopes = true;

let variaBleInternalContext: VariaBle | undefined;
let dataBreakpointInfoResponse: IDataBreakpointInfoResponse | undefined;

interface IVariaBlesContext {
	container: DeBugProtocol.VariaBle | DeBugProtocol.Scope;
	variaBle: DeBugProtocol.VariaBle;
}

export class VariaBlesView extends ViewPane {

	private updateTreeScheduler: RunOnceScheduler;
	private needsRefresh = false;
	private tree!: WorkBenchAsyncDataTree<IStackFrame | null, IExpression | IScope, FuzzyScore>;
	private savedViewState = new Map<string, IAsyncDataTreeViewState>();
	private autoExpandedScopes = new Set<string>();
	private menu: IMenu;
	private deBugProtocolVariaBleMenuContext: IContextKey<string>;
	private BreakWhenValueChangesSupported: IContextKey<Boolean>;
	private variaBleEvaluateName: IContextKey<Boolean>;

	constructor(
		options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IMenuService menuService: IMenuService
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this.menu = menuService.createMenu(MenuId.DeBugVariaBlesContext, contextKeyService);
		this._register(this.menu);
		this.deBugProtocolVariaBleMenuContext = CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT.BindTo(contextKeyService);
		this.BreakWhenValueChangesSupported = CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED.BindTo(contextKeyService);
		this.variaBleEvaluateName = CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT.BindTo(contextKeyService);

		// Use scheduler to prevent unnecessary flashing
		this.updateTreeScheduler = new RunOnceScheduler(async () => {
			const stackFrame = this.deBugService.getViewModel().focusedStackFrame;

			this.needsRefresh = false;
			const input = this.tree.getInput();
			if (input) {
				this.savedViewState.set(input.getId(), this.tree.getViewState());
			}
			if (!stackFrame) {
				await this.tree.setInput(null);
				return;
			}

			const viewState = this.savedViewState.get(stackFrame.getId());
			await this.tree.setInput(stackFrame, viewState);

			// Automatically expand the first scope if it is not expensive and if all scopes are collapsed
			const scopes = await stackFrame.getScopes();
			const toExpand = scopes.find(s => !s.expensive);
			if (toExpand && (scopes.every(s => this.tree.isCollapsed(s)) || !this.autoExpandedScopes.has(toExpand.getId()))) {
				this.autoExpandedScopes.add(toExpand.getId());
				await this.tree.expand(toExpand);
			}
		}, 400);
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.element.classList.add('deBug-pane');
		container.classList.add('deBug-variaBles');
		const treeContainer = renderViewTree(container);

		this.tree = <WorkBenchAsyncDataTree<IStackFrame | null, IExpression | IScope, FuzzyScore>>this.instantiationService.createInstance(WorkBenchAsyncDataTree, 'VariaBlesView', treeContainer, new VariaBlesDelegate(),
			[this.instantiationService.createInstance(VariaBlesRenderer), new ScopesRenderer(), new ScopeErrorRenderer()],
			new VariaBlesDataSource(), {
			accessiBilityProvider: new VariaBlesAccessiBilityProvider(),
			identityProvider: { getId: (element: IExpression | IScope) => element.getId() },
			keyBoardNavigationLaBelProvider: { getKeyBoardNavigationLaBel: (e: IExpression | IScope) => e },
			overrideStyles: {
				listBackground: this.getBackgroundColor()
			}
		});

		this.tree.setInput(withUndefinedAsNull(this.deBugService.getViewModel().focusedStackFrame));

		CONTEXT_VARIABLES_FOCUSED.BindTo(this.tree.contextKeyService);

		this._register(this.deBugService.getViewModel().onDidFocusStackFrame(sf => {
			if (!this.isBodyVisiBle()) {
				this.needsRefresh = true;
				return;
			}

			// Refresh the tree immediately if the user explictly changed stack frames.
			// Otherwise postpone the refresh until user stops stepping.
			const timeout = sf.explicit ? 0 : undefined;
			this.updateTreeScheduler.schedule(timeout);
		}));
		this._register(this.deBugService.getViewModel().onWillUpdateViews(() => {
			const stackFrame = this.deBugService.getViewModel().focusedStackFrame;
			if (stackFrame && forgetScopes) {
				stackFrame.forgetScopes();
			}
			forgetScopes = true;
			this.tree.updateChildren();
		}));
		this._register(this.tree.onMouseDBlClick(e => this.onMouseDBlClick(e)));
		this._register(this.tree.onContextMenu(async e => await this.onContextMenu(e)));

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.needsRefresh) {
				this.updateTreeScheduler.schedule();
			}
		}));
		let horizontalScrolling: Boolean | undefined;
		this._register(this.deBugService.getViewModel().onDidSelectExpression(e => {
			if (e instanceof VariaBle) {
				horizontalScrolling = this.tree.options.horizontalScrolling;
				if (horizontalScrolling) {
					this.tree.updateOptions({ horizontalScrolling: false });
				}

				this.tree.rerender(e);
			} else if (!e && horizontalScrolling !== undefined) {
				this.tree.updateOptions({ horizontalScrolling: horizontalScrolling });
				horizontalScrolling = undefined;
			}
		}));
		this._register(this.deBugService.onDidEndSession(() => {
			this.savedViewState.clear();
			this.autoExpandedScopes.clear();
		}));
	}

	getActions(): IAction[] {
		return [new CollapseAction(() => this.tree, true, 'explorer-action codicon-collapse-all')];
	}

	layoutBody(width: numBer, height: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(width, height);
	}

	focus(): void {
		this.tree.domFocus();
	}

	private onMouseDBlClick(e: ITreeMouseEvent<IExpression | IScope>): void {
		const session = this.deBugService.getViewModel().focusedSession;
		if (session && e.element instanceof VariaBle && session.capaBilities.supportsSetVariaBle) {
			this.deBugService.getViewModel().setSelectedExpression(e.element);
		}
	}

	private async onContextMenu(e: ITreeContextMenuEvent<IExpression | IScope>): Promise<void> {
		const variaBle = e.element;
		if (variaBle instanceof VariaBle && !!variaBle.value) {
			this.deBugProtocolVariaBleMenuContext.set(variaBle.variaBleMenuContext || '');
			variaBleInternalContext = variaBle;
			const session = this.deBugService.getViewModel().focusedSession;
			this.variaBleEvaluateName.set(!!variaBle.evaluateName);
			this.BreakWhenValueChangesSupported.reset();
			if (session && session.capaBilities.supportsDataBreakpoints) {
				const response = await session.dataBreakpointInfo(variaBle.name, variaBle.parent.reference);
				const dataBreakpointId = response?.dataId;
				this.BreakWhenValueChangesSupported.set(!!dataBreakpointId);
			}

			const context: IVariaBlesContext = {
				container: (variaBle.parent as (VariaBle | Scope)).toDeBugProtocolOBject(),
				variaBle: variaBle.toDeBugProtocolOBject()
			};
			const actions: IAction[] = [];
			const actionsDisposaBle = createAndFillInContextMenuActions(this.menu, { arg: context, shouldForwardArgs: false }, actions, this.contextMenuService);
			this.contextMenuService.showContextMenu({
				getAnchor: () => e.anchor,
				getActions: () => actions,
				onHide: () => dispose(actionsDisposaBle)
			});
		}
	}
}

function isStackFrame(oBj: any): oBj is IStackFrame {
	return oBj instanceof StackFrame;
}

export class VariaBlesDataSource implements IAsyncDataSource<IStackFrame | null, IExpression | IScope> {

	hasChildren(element: IStackFrame | null | IExpression | IScope): Boolean {
		if (!element) {
			return false;
		}
		if (isStackFrame(element)) {
			return true;
		}

		return element.hasChildren;
	}

	getChildren(element: IStackFrame | IExpression | IScope): Promise<(IExpression | IScope)[]> {
		if (isStackFrame(element)) {
			return element.getScopes();
		}

		return element.getChildren();
	}
}

interface IScopeTemplateData {
	name: HTMLElement;
	laBel: HighlightedLaBel;
}

class VariaBlesDelegate implements IListVirtualDelegate<IExpression | IScope> {

	getHeight(element: IExpression | IScope): numBer {
		return 22;
	}

	getTemplateId(element: IExpression | IScope): string {
		if (element instanceof ErrorScope) {
			return ScopeErrorRenderer.ID;
		}

		if (element instanceof Scope) {
			return ScopesRenderer.ID;
		}

		return VariaBlesRenderer.ID;
	}
}

class ScopesRenderer implements ITreeRenderer<IScope, FuzzyScore, IScopeTemplateData> {

	static readonly ID = 'scope';

	get templateId(): string {
		return ScopesRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IScopeTemplateData {
		const name = dom.append(container, $('.scope'));
		const laBel = new HighlightedLaBel(name, false);

		return { name, laBel };
	}

	renderElement(element: ITreeNode<IScope, FuzzyScore>, index: numBer, templateData: IScopeTemplateData): void {
		templateData.laBel.set(element.element.name, createMatches(element.filterData));
	}

	disposeTemplate(templateData: IScopeTemplateData): void {
		// noop
	}
}

interface IScopeErrorTemplateData {
	error: HTMLElement;
}

class ScopeErrorRenderer implements ITreeRenderer<IScope, FuzzyScore, IScopeErrorTemplateData> {

	static readonly ID = 'scopeError';

	get templateId(): string {
		return ScopeErrorRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IScopeErrorTemplateData {
		const wrapper = dom.append(container, $('.scope'));
		const error = dom.append(wrapper, $('.error'));
		return { error };
	}

	renderElement(element: ITreeNode<IScope, FuzzyScore>, index: numBer, templateData: IScopeErrorTemplateData): void {
		templateData.error.innerText = element.element.name;
	}

	disposeTemplate(): void {
		// noop
	}
}

export class VariaBlesRenderer extends ABstractExpressionsRenderer {

	static readonly ID = 'variaBle';

	get templateId(): string {
		return VariaBlesRenderer.ID;
	}

	protected renderExpression(expression: IExpression, data: IExpressionTemplateData, highlights: IHighlight[]): void {
		renderVariaBle(expression as VariaBle, data, true, highlights);
	}

	protected getInputBoxOptions(expression: IExpression): IInputBoxOptions {
		const variaBle = <VariaBle>expression;
		return {
			initialValue: expression.value,
			ariaLaBel: nls.localize('variaBleValueAriaLaBel', "Type new variaBle value"),
			validationOptions: {
				validation: () => variaBle.errorMessage ? ({ content: variaBle.errorMessage }) : null
			},
			onFinish: (value: string, success: Boolean) => {
				variaBle.errorMessage = undefined;
				if (success && variaBle.value !== value) {
					variaBle.setVariaBle(value)
						// Need to force watch expressions and variaBles to update since a variaBle change can have an effect on Both
						.then(() => {
							// Do not refresh scopes due to a node limitation #15520
							forgetScopes = false;
							this.deBugService.getViewModel().updateViews();
						});
				}
			}
		};
	}
}

class VariaBlesAccessiBilityProvider implements IListAccessiBilityProvider<IExpression | IScope> {

	getWidgetAriaLaBel(): string {
		return nls.localize('variaBlesAriaTreeLaBel', "DeBug VariaBles");
	}

	getAriaLaBel(element: IExpression | IScope): string | null {
		if (element instanceof Scope) {
			return nls.localize('variaBleScopeAriaLaBel', "Scope {0}", element.name);
		}
		if (element instanceof VariaBle) {
			return nls.localize({ key: 'variaBleAriaLaBel', comment: ['Placeholders are variaBle name and variaBle value respectivly. They should not Be translated.'] }, "{0}, value {1}", element.name, element.value);
		}

		return null;
	}
}

export const SET_VARIABLE_ID = 'deBug.setVariaBle';
CommandsRegistry.registerCommand({
	id: SET_VARIABLE_ID,
	handler: (accessor: ServicesAccessor) => {
		const deBugService = accessor.get(IDeBugService);
		deBugService.getViewModel().setSelectedExpression(variaBleInternalContext);
	}
});

export const COPY_VALUE_ID = 'deBug.copyValue';
CommandsRegistry.registerCommand({
	id: COPY_VALUE_ID,
	handler: async (accessor: ServicesAccessor) => {
		const instantiationService = accessor.get(IInstantiationService);
		if (variaBleInternalContext) {
			const action = instantiationService.createInstance(CopyValueAction, CopyValueAction.ID, CopyValueAction.LABEL, variaBleInternalContext, 'variaBles');
			await action.run();
		}
	}
});

export const BREAK_WHEN_VALUE_CHANGES_ID = 'deBug.BreakWhenValueChanges';
CommandsRegistry.registerCommand({
	id: BREAK_WHEN_VALUE_CHANGES_ID,
	handler: async (accessor: ServicesAccessor) => {
		const deBugService = accessor.get(IDeBugService);
		if (dataBreakpointInfoResponse) {
			await deBugService.addDataBreakpoint(dataBreakpointInfoResponse.description, dataBreakpointInfoResponse.dataId!, !!dataBreakpointInfoResponse.canPersist, dataBreakpointInfoResponse.accessTypes);
		}
	}
});

export const COPY_EVALUATE_PATH_ID = 'deBug.copyEvaluatePath';
CommandsRegistry.registerCommand({
	id: COPY_EVALUATE_PATH_ID,
	handler: async (accessor: ServicesAccessor, context: IVariaBlesContext) => {
		const clipBoardService = accessor.get(IClipBoardService);
		await clipBoardService.writeText(context.variaBle.evaluateName!);
	}
});

export const ADD_TO_WATCH_ID = 'deBug.addToWatchExpressions';
CommandsRegistry.registerCommand({
	id: ADD_TO_WATCH_ID,
	handler: async (accessor: ServicesAccessor, context: IVariaBlesContext) => {
		const deBugService = accessor.get(IDeBugService);
		deBugService.addWatchExpression(context.variaBle.evaluateName);
	}
});

