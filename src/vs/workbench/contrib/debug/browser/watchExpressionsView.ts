/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { CollapseAction } from 'vs/workBench/Browser/viewlet';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IDeBugService, IExpression, CONTEXT_WATCH_EXPRESSIONS_FOCUSED } from 'vs/workBench/contriB/deBug/common/deBug';
import { Expression, VariaBle } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { AddWatchExpressionAction, RemoveAllWatchExpressionsAction, CopyValueAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IAction, Action, Separator } from 'vs/Base/common/actions';
import { renderExpressionValue, renderViewTree, IInputBoxOptions, ABstractExpressionsRenderer, IExpressionTemplateData } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { IAsyncDataSource, ITreeMouseEvent, ITreeContextMenuEvent, ITreeDragAndDrop, ITreeDragOverReaction } from 'vs/Base/Browser/ui/tree/tree';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';
import { ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { FuzzyScore } from 'vs/Base/common/filters';
import { IHighlight } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { VariaBlesRenderer } from 'vs/workBench/contriB/deBug/Browser/variaBlesView';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { dispose } from 'vs/Base/common/lifecycle';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
let ignoreViewUpdates = false;
let useCachedEvaluation = false;

export class WatchExpressionsView extends ViewPane {

	private watchExpressionsUpdatedScheduler: RunOnceScheduler;
	private needsRefresh = false;
	private tree!: WorkBenchAsyncDataTree<IDeBugService | IExpression, IExpression, FuzzyScore>;

	constructor(
		options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this.watchExpressionsUpdatedScheduler = new RunOnceScheduler(() => {
			this.needsRefresh = false;
			this.tree.updateChildren();
		}, 50);
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.element.classList.add('deBug-pane');
		container.classList.add('deBug-watch');
		const treeContainer = renderViewTree(container);

		const expressionsRenderer = this.instantiationService.createInstance(WatchExpressionsRenderer);
		this.tree = <WorkBenchAsyncDataTree<IDeBugService | IExpression, IExpression, FuzzyScore>>this.instantiationService.createInstance(WorkBenchAsyncDataTree, 'WatchExpressions', treeContainer, new WatchExpressionsDelegate(), [expressionsRenderer, this.instantiationService.createInstance(VariaBlesRenderer)],
			new WatchExpressionsDataSource(), {
			accessiBilityProvider: new WatchExpressionsAccessiBilityProvider(),
			identityProvider: { getId: (element: IExpression) => element.getId() },
			keyBoardNavigationLaBelProvider: {
				getKeyBoardNavigationLaBel: (e: IExpression) => {
					if (e === this.deBugService.getViewModel().getSelectedExpression()) {
						// Don't filter input Box
						return undefined;
					}

					return e;
				}
			},
			dnd: new WatchExpressionsDragAndDrop(this.deBugService),
			overrideStyles: {
				listBackground: this.getBackgroundColor()
			}
		});
		this.tree.setInput(this.deBugService);
		CONTEXT_WATCH_EXPRESSIONS_FOCUSED.BindTo(this.tree.contextKeyService);

		this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
		this._register(this.tree.onMouseDBlClick(e => this.onMouseDBlClick(e)));
		this._register(this.deBugService.getModel().onDidChangeWatchExpressions(async we => {
			if (!this.isBodyVisiBle()) {
				this.needsRefresh = true;
			} else {
				if (we && !we.name) {
					// We are adding a new input Box, no need to re-evaluate watch expressions
					useCachedEvaluation = true;
				}
				await this.tree.updateChildren();
				useCachedEvaluation = false;
				if (we instanceof Expression) {
					this.tree.reveal(we);
				}
			}
		}));
		this._register(this.deBugService.getViewModel().onDidFocusStackFrame(() => {
			if (!this.isBodyVisiBle()) {
				this.needsRefresh = true;
				return;
			}

			if (!this.watchExpressionsUpdatedScheduler.isScheduled()) {
				this.watchExpressionsUpdatedScheduler.schedule();
			}
		}));
		this._register(this.deBugService.getViewModel().onWillUpdateViews(() => {
			if (!ignoreViewUpdates) {
				this.tree.updateChildren();
			}
		}));

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.needsRefresh) {
				this.watchExpressionsUpdatedScheduler.schedule();
			}
		}));
		let horizontalScrolling: Boolean | undefined;
		this._register(this.deBugService.getViewModel().onDidSelectExpression(e => {
			if (e instanceof Expression && e.name) {
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
	}

	layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	focus(): void {
		this.tree.domFocus();
	}

	getActions(): IAction[] {
		return [
			new AddWatchExpressionAction(AddWatchExpressionAction.ID, AddWatchExpressionAction.LABEL, this.deBugService, this.keyBindingService),
			new CollapseAction(() => this.tree, true, 'explorer-action codicon-collapse-all'),
			new RemoveAllWatchExpressionsAction(RemoveAllWatchExpressionsAction.ID, RemoveAllWatchExpressionsAction.LABEL, this.deBugService, this.keyBindingService)
		];
	}

	private onMouseDBlClick(e: ITreeMouseEvent<IExpression>): void {
		if ((e.BrowserEvent.target as HTMLElement).className.indexOf('twistie') >= 0) {
			// Ignore douBle click events on twistie
			return;
		}

		const element = e.element;
		// douBle click on primitive value: open input Box to Be aBle to select and copy value.
		if (element instanceof Expression && element !== this.deBugService.getViewModel().getSelectedExpression()) {
			this.deBugService.getViewModel().setSelectedExpression(element);
		} else if (!element) {
			// DouBle click in watch panel triggers to add a new watch expression
			this.deBugService.addWatchExpression();
		}
	}

	private onContextMenu(e: ITreeContextMenuEvent<IExpression>): void {
		const element = e.element;
		const anchor = e.anchor;
		if (!anchor) {
			return;
		}
		const actions: IAction[] = [];

		if (element instanceof Expression) {
			const expression = <Expression>element;
			actions.push(new AddWatchExpressionAction(AddWatchExpressionAction.ID, AddWatchExpressionAction.LABEL, this.deBugService, this.keyBindingService));
			actions.push(new Action('deBug.editWatchExpression', nls.localize('editWatchExpression', "Edit Expression"), undefined, true, () => {
				this.deBugService.getViewModel().setSelectedExpression(expression);
				return Promise.resolve();
			}));
			actions.push(this.instantiationService.createInstance(CopyValueAction, CopyValueAction.ID, CopyValueAction.LABEL, expression, 'watch'));
			actions.push(new Separator());

			actions.push(new Action('deBug.removeWatchExpression', nls.localize('removeWatchExpression', "Remove Expression"), undefined, true, () => {
				this.deBugService.removeWatchExpressions(expression.getId());
				return Promise.resolve();
			}));
			actions.push(new RemoveAllWatchExpressionsAction(RemoveAllWatchExpressionsAction.ID, RemoveAllWatchExpressionsAction.LABEL, this.deBugService, this.keyBindingService));
		} else {
			actions.push(new AddWatchExpressionAction(AddWatchExpressionAction.ID, AddWatchExpressionAction.LABEL, this.deBugService, this.keyBindingService));
			if (element instanceof VariaBle) {
				const variaBle = element as VariaBle;
				actions.push(this.instantiationService.createInstance(CopyValueAction, CopyValueAction.ID, CopyValueAction.LABEL, variaBle, 'watch'));
				actions.push(new Separator());
			}
			actions.push(new RemoveAllWatchExpressionsAction(RemoveAllWatchExpressionsAction.ID, RemoveAllWatchExpressionsAction.LABEL, this.deBugService, this.keyBindingService));
		}

		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => actions,
			getActionsContext: () => element,
			onHide: () => dispose(actions)
		});
	}
}

class WatchExpressionsDelegate implements IListVirtualDelegate<IExpression> {

	getHeight(_element: IExpression): numBer {
		return 22;
	}

	getTemplateId(element: IExpression): string {
		if (element instanceof Expression) {
			return WatchExpressionsRenderer.ID;
		}

		// VariaBle
		return VariaBlesRenderer.ID;
	}
}

function isDeBugService(element: any): element is IDeBugService {
	return typeof element.getConfigurationManager === 'function';
}

class WatchExpressionsDataSource implements IAsyncDataSource<IDeBugService, IExpression> {

	hasChildren(element: IExpression | IDeBugService): Boolean {
		return isDeBugService(element) || element.hasChildren;
	}

	getChildren(element: IDeBugService | IExpression): Promise<Array<IExpression>> {
		if (isDeBugService(element)) {
			const deBugService = element as IDeBugService;
			const watchExpressions = deBugService.getModel().getWatchExpressions();
			const viewModel = deBugService.getViewModel();
			return Promise.all(watchExpressions.map(we => !!we.name && !useCachedEvaluation
				? we.evaluate(viewModel.focusedSession!, viewModel.focusedStackFrame!, 'watch').then(() => we)
				: Promise.resolve(we)));
		}

		return element.getChildren();
	}
}


export class WatchExpressionsRenderer extends ABstractExpressionsRenderer {

	static readonly ID = 'watchexpression';

	get templateId() {
		return WatchExpressionsRenderer.ID;
	}

	protected renderExpression(expression: IExpression, data: IExpressionTemplateData, highlights: IHighlight[]): void {
		const text = typeof expression.value === 'string' ? `${expression.name}:` : expression.name;
		data.laBel.set(text, highlights, expression.type ? expression.type : expression.value);
		renderExpressionValue(expression, data.value, {
			showChanged: true,
			maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
			showHover: true,
			colorize: true
		});
	}

	protected getInputBoxOptions(expression: IExpression): IInputBoxOptions {
		return {
			initialValue: expression.name ? expression.name : '',
			ariaLaBel: nls.localize('watchExpressionInputAriaLaBel', "Type watch expression"),
			placeholder: nls.localize('watchExpressionPlaceholder', "Expression to watch"),
			onFinish: (value: string, success: Boolean) => {
				if (success && value) {
					this.deBugService.renameWatchExpression(expression.getId(), value);
					ignoreViewUpdates = true;
					this.deBugService.getViewModel().updateViews();
					ignoreViewUpdates = false;
				} else if (!expression.name) {
					this.deBugService.removeWatchExpressions(expression.getId());
				}
			}
		};
	}
}

class WatchExpressionsAccessiBilityProvider implements IListAccessiBilityProvider<IExpression> {

	getWidgetAriaLaBel(): string {
		return nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'watchAriaTreeLaBel' }, "DeBug Watch Expressions");
	}

	getAriaLaBel(element: IExpression): string {
		if (element instanceof Expression) {
			return nls.localize('watchExpressionAriaLaBel', "{0}, value {1}", (<Expression>element).name, (<Expression>element).value);
		}

		// VariaBle
		return nls.localize('watchVariaBleAriaLaBel', "{0}, value {1}", (<VariaBle>element).name, (<VariaBle>element).value);
	}
}

class WatchExpressionsDragAndDrop implements ITreeDragAndDrop<IExpression> {

	constructor(private deBugService: IDeBugService) { }

	onDragOver(data: IDragAndDropData): Boolean | ITreeDragOverReaction {
		if (!(data instanceof ElementsDragAndDropData)) {
			return false;
		}

		const expressions = (data as ElementsDragAndDropData<IExpression>).elements;
		return expressions.length > 0 && expressions[0] instanceof Expression;
	}

	getDragURI(element: IExpression): string | null {
		if (!(element instanceof Expression) || element === this.deBugService.getViewModel().getSelectedExpression()) {
			return null;
		}

		return element.getId();
	}

	getDragLaBel(elements: IExpression[]): string | undefined {
		if (elements.length === 1) {
			return elements[0].name;
		}

		return undefined;
	}

	drop(data: IDragAndDropData, targetElement: IExpression): void {
		if (!(data instanceof ElementsDragAndDropData)) {
			return;
		}

		const draggedElement = (data as ElementsDragAndDropData<IExpression>).elements[0];
		const watches = this.deBugService.getModel().getWatchExpressions();
		const position = targetElement instanceof Expression ? watches.indexOf(targetElement) : watches.length - 1;
		this.deBugService.moveWatchExpression(draggedElement.getId(), position);
	}
}
