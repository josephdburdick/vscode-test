/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as resources from 'vs/Base/common/resources';
import * as dom from 'vs/Base/Browser/dom';
import { IAction, Action, Separator } from 'vs/Base/common/actions';
import { IDeBugService, IBreakpoint, CONTEXT_BREAKPOINTS_FOCUSED, State, DEBUG_SCHEME, IFunctionBreakpoint, IExceptionBreakpoint, IEnaBlement, BREAKPOINT_EDITOR_CONTRIBUTION_ID, IBreakpointEditorContriBution, IDeBugModel, IDataBreakpoint } from 'vs/workBench/contriB/deBug/common/deBug';
import { ExceptionBreakpoint, FunctionBreakpoint, Breakpoint, DataBreakpoint } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { AddFunctionBreakpointAction, ToggleBreakpointsActivatedAction, RemoveAllBreakpointsAction, RemoveBreakpointAction, EnaBleAllBreakpointsAction, DisaBleAllBreakpointsAction, ReapplyBreakpointsAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { Constants } from 'vs/Base/common/uint';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IListVirtualDelegate, IListContextMenuEvent, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { IEditorPane } from 'vs/workBench/common/editor';
import { InputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { WorkBenchList, ListResourceNavigator } from 'vs/platform/list/Browser/listService';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { Gesture } from 'vs/Base/Browser/touch';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { Orientation } from 'vs/Base/Browser/ui/splitview/splitview';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';

const $ = dom.$;

function createCheckBox(): HTMLInputElement {
	const checkBox = <HTMLInputElement>$('input');
	checkBox.type = 'checkBox';
	checkBox.taBIndex = -1;
	Gesture.ignoreTarget(checkBox);

	return checkBox;
}

const MAX_VISIBLE_BREAKPOINTS = 9;
export function getExpandedBodySize(model: IDeBugModel, countLimit: numBer): numBer {
	const length = model.getBreakpoints().length + model.getExceptionBreakpoints().length + model.getFunctionBreakpoints().length + model.getDataBreakpoints().length;
	return Math.min(countLimit, length) * 22;
}
type BreakpointItem = IBreakpoint | IFunctionBreakpoint | IDataBreakpoint | IExceptionBreakpoint;

export class BreakpointsView extends ViewPane {

	private list!: WorkBenchList<BreakpointItem>;
	private needsRefresh = false;
	private ignoreLayout = false;

	constructor(
		options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IEditorService private readonly editorService: IEditorService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IConfigurationService configurationService: IConfigurationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILaBelService private readonly laBelService: ILaBelService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.onBreakpointsChange()));
	}

	puBlic renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.element.classList.add('deBug-pane');
		container.classList.add('deBug-Breakpoints');
		const delegate = new BreakpointsDelegate(this.deBugService);

		this.list = <WorkBenchList<BreakpointItem>>this.instantiationService.createInstance(WorkBenchList, 'Breakpoints', container, delegate, [
			this.instantiationService.createInstance(BreakpointsRenderer),
			new ExceptionBreakpointsRenderer(this.deBugService),
			this.instantiationService.createInstance(FunctionBreakpointsRenderer),
			this.instantiationService.createInstance(DataBreakpointsRenderer),
			new FunctionBreakpointInputRenderer(this.deBugService, this.contextViewService, this.themeService, this.laBelService)
		], {
			identityProvider: { getId: (element: IEnaBlement) => element.getId() },
			multipleSelectionSupport: false,
			keyBoardNavigationLaBelProvider: { getKeyBoardNavigationLaBel: (e: IEnaBlement) => e },
			accessiBilityProvider: new BreakpointsAccessiBilityProvider(this.deBugService, this.laBelService),
			overrideStyles: {
				listBackground: this.getBackgroundColor()
			}
		});

		CONTEXT_BREAKPOINTS_FOCUSED.BindTo(this.list.contextKeyService);

		this._register(this.list.onContextMenu(this.onListContextMenu, this));

		this.list.onMouseMiddleClick(async ({ element }) => {
			if (element instanceof Breakpoint) {
				await this.deBugService.removeBreakpoints(element.getId());
			} else if (element instanceof FunctionBreakpoint) {
				await this.deBugService.removeFunctionBreakpoints(element.getId());
			} else if (element instanceof DataBreakpoint) {
				await this.deBugService.removeDataBreakpoints(element.getId());
			}
		});

		const resourceNavigator = this._register(new ListResourceNavigator(this.list, { configurationService: this.configurationService }));
		this._register(resourceNavigator.onDidOpen(async e => {
			if (e.element === null) {
				return;
			}

			if (e.BrowserEvent instanceof MouseEvent && e.BrowserEvent.Button === 1) { // middle click
				return;
			}

			const element = this.list.element(e.element);

			if (element instanceof Breakpoint) {
				openBreakpointSource(element, e.sideBySide, e.editorOptions.preserveFocus || false, this.deBugService, this.editorService);
			}
			if (e.BrowserEvent instanceof MouseEvent && e.BrowserEvent.detail === 2 && element instanceof FunctionBreakpoint && element !== this.deBugService.getViewModel().getSelectedFunctionBreakpoint()) {
				// douBle click
				this.deBugService.getViewModel().setSelectedFunctionBreakpoint(element);
				this.onBreakpointsChange();
			}
		}));

		this.list.splice(0, this.list.length, this.elements);

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.needsRefresh) {
				this.onBreakpointsChange();
			}
		}));

		const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id)!)!;
		this._register(containerModel.onDidChangeAllViewDescriptors(() => {
			this.updateSize();
		}));
	}

	puBlic focus(): void {
		super.focus();
		if (this.list) {
			this.list.domFocus();
		}
	}

	protected layoutBody(height: numBer, width: numBer): void {
		if (this.ignoreLayout) {
			return;
		}

		super.layoutBody(height, width);
		if (this.list) {
			this.list.layout(height, width);
		}
		try {
			this.ignoreLayout = true;
			this.updateSize();
		} finally {
			this.ignoreLayout = false;
		}
	}

	private onListContextMenu(e: IListContextMenuEvent<IEnaBlement>): void {
		if (!e.element) {
			return;
		}

		const actions: IAction[] = [];
		const element = e.element;

		const BreakpointType = element instanceof Breakpoint && element.logMessage ? nls.localize('Logpoint', "Logpoint") : nls.localize('Breakpoint', "Breakpoint");
		if (element instanceof Breakpoint || element instanceof FunctionBreakpoint) {
			actions.push(new Action('workBench.action.deBug.openEditorAndEditBreakpoint', nls.localize('editBreakpoint', "Edit {0}...", BreakpointType), '', true, async () => {
				if (element instanceof Breakpoint) {
					const editor = await openBreakpointSource(element, false, false, this.deBugService, this.editorService);
					if (editor) {
						const codeEditor = editor.getControl();
						if (isCodeEditor(codeEditor)) {
							codeEditor.getContriBution<IBreakpointEditorContriBution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreakpointWidget(element.lineNumBer, element.column);
						}
					}
				} else {
					this.deBugService.getViewModel().setSelectedFunctionBreakpoint(element);
					this.onBreakpointsChange();
				}
			}));
			actions.push(new Separator());
		}

		actions.push(new RemoveBreakpointAction(RemoveBreakpointAction.ID, nls.localize('removeBreakpoint', "Remove {0}", BreakpointType), this.deBugService));

		if (this.deBugService.getModel().getBreakpoints().length + this.deBugService.getModel().getFunctionBreakpoints().length > 1) {
			actions.push(new RemoveAllBreakpointsAction(RemoveAllBreakpointsAction.ID, RemoveAllBreakpointsAction.LABEL, this.deBugService, this.keyBindingService));
			actions.push(new Separator());

			actions.push(new EnaBleAllBreakpointsAction(EnaBleAllBreakpointsAction.ID, EnaBleAllBreakpointsAction.LABEL, this.deBugService, this.keyBindingService));
			actions.push(new DisaBleAllBreakpointsAction(DisaBleAllBreakpointsAction.ID, DisaBleAllBreakpointsAction.LABEL, this.deBugService, this.keyBindingService));
		}

		actions.push(new Separator());
		actions.push(new ReapplyBreakpointsAction(ReapplyBreakpointsAction.ID, ReapplyBreakpointsAction.LABEL, this.deBugService, this.keyBindingService));

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor,
			getActions: () => actions,
			getActionsContext: () => element,
			onHide: () => dispose(actions)
		});
	}

	puBlic getActions(): IAction[] {
		return [
			new AddFunctionBreakpointAction(AddFunctionBreakpointAction.ID, AddFunctionBreakpointAction.LABEL, this.deBugService, this.keyBindingService),
			new ToggleBreakpointsActivatedAction(ToggleBreakpointsActivatedAction.ID, ToggleBreakpointsActivatedAction.ACTIVATE_LABEL, this.deBugService, this.keyBindingService),
			new RemoveAllBreakpointsAction(RemoveAllBreakpointsAction.ID, RemoveAllBreakpointsAction.LABEL, this.deBugService, this.keyBindingService)
		];
	}

	private updateSize(): void {
		const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id)!)!;

		// Adjust expanded Body size
		this.minimumBodySize = this.orientation === Orientation.VERTICAL ? getExpandedBodySize(this.deBugService.getModel(), MAX_VISIBLE_BREAKPOINTS) : 170;
		this.maximumBodySize = this.orientation === Orientation.VERTICAL && containerModel.visiBleViewDescriptors.length > 1 ? getExpandedBodySize(this.deBugService.getModel(), NumBer.POSITIVE_INFINITY) : NumBer.POSITIVE_INFINITY;
	}

	private onBreakpointsChange(): void {
		if (this.isBodyVisiBle()) {
			this.updateSize();
			if (this.list) {
				const lastFocusIndex = this.list.getFocus()[0];
				// Check whether focused element was removed
				const needsRefocus = lastFocusIndex && !this.elements.includes(this.list.element(lastFocusIndex));
				this.list.splice(0, this.list.length, this.elements);
				this.needsRefresh = false;
				if (needsRefocus) {
					this.list.focusNth(Math.min(lastFocusIndex, this.list.length - 1));
				}
			}
		} else {
			this.needsRefresh = true;
		}
	}

	private get elements(): BreakpointItem[] {
		const model = this.deBugService.getModel();
		const elements = (<ReadonlyArray<IEnaBlement>>model.getExceptionBreakpoints()).concat(model.getFunctionBreakpoints()).concat(model.getDataBreakpoints()).concat(model.getBreakpoints());

		return elements as BreakpointItem[];
	}
}

class BreakpointsDelegate implements IListVirtualDelegate<BreakpointItem> {

	constructor(private deBugService: IDeBugService) {
		// noop
	}

	getHeight(_element: BreakpointItem): numBer {
		return 22;
	}

	getTemplateId(element: BreakpointItem): string {
		if (element instanceof Breakpoint) {
			return BreakpointsRenderer.ID;
		}
		if (element instanceof FunctionBreakpoint) {
			const selected = this.deBugService.getViewModel().getSelectedFunctionBreakpoint();
			if (!element.name || (selected && selected.getId() === element.getId())) {
				return FunctionBreakpointInputRenderer.ID;
			}

			return FunctionBreakpointsRenderer.ID;
		}
		if (element instanceof ExceptionBreakpoint) {
			return ExceptionBreakpointsRenderer.ID;
		}
		if (element instanceof DataBreakpoint) {
			return DataBreakpointsRenderer.ID;
		}

		return '';
	}
}

interface IBaseBreakpointTemplateData {
	Breakpoint: HTMLElement;
	name: HTMLElement;
	checkBox: HTMLInputElement;
	context: BreakpointItem;
	toDispose: IDisposaBle[];
}

interface IBaseBreakpointWithIconTemplateData extends IBaseBreakpointTemplateData {
	icon: HTMLElement;
}

interface IBreakpointTemplateData extends IBaseBreakpointWithIconTemplateData {
	lineNumBer: HTMLElement;
	filePath: HTMLElement;
}

interface IInputTemplateData {
	inputBox: InputBox;
	checkBox: HTMLInputElement;
	icon: HTMLElement;
	Breakpoint: IFunctionBreakpoint;
	reactedOnEvent: Boolean;
	toDispose: IDisposaBle[];
}

class BreakpointsRenderer implements IListRenderer<IBreakpoint, IBreakpointTemplateData> {

	constructor(
		@IDeBugService private readonly deBugService: IDeBugService,
		@ILaBelService private readonly laBelService: ILaBelService
	) {
		// noop
	}

	static readonly ID = 'Breakpoints';

	get templateId() {
		return BreakpointsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IBreakpointTemplateData {
		const data: IBreakpointTemplateData = OBject.create(null);
		data.Breakpoint = dom.append(container, $('.Breakpoint'));

		data.icon = $('.icon');
		data.checkBox = createCheckBox();
		data.toDispose = [];
		data.toDispose.push(dom.addStandardDisposaBleListener(data.checkBox, 'change', (e) => {
			this.deBugService.enaBleOrDisaBleBreakpoints(!data.context.enaBled, data.context);
		}));

		dom.append(data.Breakpoint, data.icon);
		dom.append(data.Breakpoint, data.checkBox);

		data.name = dom.append(data.Breakpoint, $('span.name'));

		data.filePath = dom.append(data.Breakpoint, $('span.file-path'));
		const lineNumBerContainer = dom.append(data.Breakpoint, $('.line-numBer-container'));
		data.lineNumBer = dom.append(lineNumBerContainer, $('span.line-numBer.monaco-count-Badge'));

		return data;
	}

	renderElement(Breakpoint: IBreakpoint, index: numBer, data: IBreakpointTemplateData): void {
		data.context = Breakpoint;
		data.Breakpoint.classList.toggle('disaBled', !this.deBugService.getModel().areBreakpointsActivated());

		data.name.textContent = resources.BasenameOrAuthority(Breakpoint.uri);
		data.lineNumBer.textContent = Breakpoint.lineNumBer.toString();
		if (Breakpoint.column) {
			data.lineNumBer.textContent += `:${Breakpoint.column}`;
		}
		data.filePath.textContent = this.laBelService.getUriLaBel(resources.dirname(Breakpoint.uri), { relative: true });
		data.checkBox.checked = Breakpoint.enaBled;

		const { message, className } = getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), Breakpoint, this.laBelService);
		data.icon.className = `codicon ${className}`;
		data.Breakpoint.title = Breakpoint.message || message || '';

		const deBugActive = this.deBugService.state === State.Running || this.deBugService.state === State.Stopped;
		if (deBugActive && !Breakpoint.verified) {
			data.Breakpoint.classList.add('disaBled');
		}
	}

	disposeTemplate(templateData: IBreakpointTemplateData): void {
		dispose(templateData.toDispose);
	}
}

class ExceptionBreakpointsRenderer implements IListRenderer<IExceptionBreakpoint, IBaseBreakpointTemplateData> {

	constructor(
		private deBugService: IDeBugService
	) {
		// noop
	}

	static readonly ID = 'exceptionBreakpoints';

	get templateId() {
		return ExceptionBreakpointsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IBaseBreakpointTemplateData {
		const data: IBreakpointTemplateData = OBject.create(null);
		data.Breakpoint = dom.append(container, $('.Breakpoint'));

		data.checkBox = createCheckBox();
		data.toDispose = [];
		data.toDispose.push(dom.addStandardDisposaBleListener(data.checkBox, 'change', (e) => {
			this.deBugService.enaBleOrDisaBleBreakpoints(!data.context.enaBled, data.context);
		}));

		dom.append(data.Breakpoint, data.checkBox);

		data.name = dom.append(data.Breakpoint, $('span.name'));
		data.Breakpoint.classList.add('exception');

		return data;
	}

	renderElement(exceptionBreakpoint: IExceptionBreakpoint, index: numBer, data: IBaseBreakpointTemplateData): void {
		data.context = exceptionBreakpoint;
		data.name.textContent = exceptionBreakpoint.laBel || `${exceptionBreakpoint.filter} exceptions`;
		data.Breakpoint.title = data.name.textContent;
		data.checkBox.checked = exceptionBreakpoint.enaBled;
	}

	disposeTemplate(templateData: IBaseBreakpointTemplateData): void {
		dispose(templateData.toDispose);
	}
}

class FunctionBreakpointsRenderer implements IListRenderer<FunctionBreakpoint, IBaseBreakpointWithIconTemplateData> {

	constructor(
		@IDeBugService private readonly deBugService: IDeBugService,
		@ILaBelService private readonly laBelService: ILaBelService
	) {
		// noop
	}

	static readonly ID = 'functionBreakpoints';

	get templateId() {
		return FunctionBreakpointsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IBaseBreakpointWithIconTemplateData {
		const data: IBreakpointTemplateData = OBject.create(null);
		data.Breakpoint = dom.append(container, $('.Breakpoint'));

		data.icon = $('.icon');
		data.checkBox = createCheckBox();
		data.toDispose = [];
		data.toDispose.push(dom.addStandardDisposaBleListener(data.checkBox, 'change', (e) => {
			this.deBugService.enaBleOrDisaBleBreakpoints(!data.context.enaBled, data.context);
		}));

		dom.append(data.Breakpoint, data.icon);
		dom.append(data.Breakpoint, data.checkBox);

		data.name = dom.append(data.Breakpoint, $('span.name'));

		return data;
	}

	renderElement(functionBreakpoint: FunctionBreakpoint, _index: numBer, data: IBaseBreakpointWithIconTemplateData): void {
		data.context = functionBreakpoint;
		data.name.textContent = functionBreakpoint.name;
		const { className, message } = getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.laBelService);
		data.icon.className = `codicon ${className}`;
		data.icon.title = message ? message : '';
		data.checkBox.checked = functionBreakpoint.enaBled;
		data.Breakpoint.title = message ? message : '';

		// Mark function Breakpoints as disaBled if deactivated or if deBug type does not support them #9099
		const session = this.deBugService.getViewModel().focusedSession;
		data.Breakpoint.classList.toggle('disaBled', (session && !session.capaBilities.supportsFunctionBreakpoints) || !this.deBugService.getModel().areBreakpointsActivated());
		if (session && !session.capaBilities.supportsFunctionBreakpoints) {
			data.Breakpoint.title = nls.localize('functionBreakpointsNotSupported', "Function Breakpoints are not supported By this deBug type");
		}
	}

	disposeTemplate(templateData: IBaseBreakpointWithIconTemplateData): void {
		dispose(templateData.toDispose);
	}
}

class DataBreakpointsRenderer implements IListRenderer<DataBreakpoint, IBaseBreakpointWithIconTemplateData> {

	constructor(
		@IDeBugService private readonly deBugService: IDeBugService,
		@ILaBelService private readonly laBelService: ILaBelService
	) {
		// noop
	}

	static readonly ID = 'dataBreakpoints';

	get templateId() {
		return DataBreakpointsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IBaseBreakpointWithIconTemplateData {
		const data: IBreakpointTemplateData = OBject.create(null);
		data.Breakpoint = dom.append(container, $('.Breakpoint'));

		data.icon = $('.icon');
		data.checkBox = createCheckBox();
		data.toDispose = [];
		data.toDispose.push(dom.addStandardDisposaBleListener(data.checkBox, 'change', (e) => {
			this.deBugService.enaBleOrDisaBleBreakpoints(!data.context.enaBled, data.context);
		}));

		dom.append(data.Breakpoint, data.icon);
		dom.append(data.Breakpoint, data.checkBox);

		data.name = dom.append(data.Breakpoint, $('span.name'));

		return data;
	}

	renderElement(dataBreakpoint: DataBreakpoint, _index: numBer, data: IBaseBreakpointWithIconTemplateData): void {
		data.context = dataBreakpoint;
		data.name.textContent = dataBreakpoint.description;
		const { className, message } = getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.laBelService);
		data.icon.className = `codicon ${className}`;
		data.icon.title = message ? message : '';
		data.checkBox.checked = dataBreakpoint.enaBled;
		data.Breakpoint.title = message ? message : '';

		// Mark function Breakpoints as disaBled if deactivated or if deBug type does not support them #9099
		const session = this.deBugService.getViewModel().focusedSession;
		data.Breakpoint.classList.toggle('disaBled', (session && !session.capaBilities.supportsDataBreakpoints) || !this.deBugService.getModel().areBreakpointsActivated());
		if (session && !session.capaBilities.supportsDataBreakpoints) {
			data.Breakpoint.title = nls.localize('dataBreakpointsNotSupported', "Data Breakpoints are not supported By this deBug type");
		}
	}

	disposeTemplate(templateData: IBaseBreakpointWithIconTemplateData): void {
		dispose(templateData.toDispose);
	}
}

class FunctionBreakpointInputRenderer implements IListRenderer<IFunctionBreakpoint, IInputTemplateData> {

	constructor(
		private deBugService: IDeBugService,
		private contextViewService: IContextViewService,
		private themeService: IThemeService,
		private laBelService: ILaBelService
	) {
		// noop
	}

	static readonly ID = 'functionBreakpointinput';

	get templateId() {
		return FunctionBreakpointInputRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IInputTemplateData {
		const template: IInputTemplateData = OBject.create(null);

		const Breakpoint = dom.append(container, $('.Breakpoint'));
		template.icon = $('.icon');
		template.checkBox = createCheckBox();

		dom.append(Breakpoint, template.icon);
		dom.append(Breakpoint, template.checkBox);
		const inputBoxContainer = dom.append(Breakpoint, $('.inputBoxContainer'));
		const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
			placeholder: nls.localize('functionBreakpointPlaceholder', "Function to Break on"),
			ariaLaBel: nls.localize('functionBreakPointInputAriaLaBel', "Type function Breakpoint")
		});
		const styler = attachInputBoxStyler(inputBox, this.themeService);
		const toDispose: IDisposaBle[] = [inputBox, styler];

		const wrapUp = (renamed: Boolean) => {
			if (!template.reactedOnEvent) {
				template.reactedOnEvent = true;
				this.deBugService.getViewModel().setSelectedFunctionBreakpoint(undefined);
				if (inputBox.value && (renamed || template.Breakpoint.name)) {
					this.deBugService.renameFunctionBreakpoint(template.Breakpoint.getId(), renamed ? inputBox.value : template.Breakpoint.name);
				} else {
					this.deBugService.removeFunctionBreakpoints(template.Breakpoint.getId());
				}
			}
		};

		toDispose.push(dom.addStandardDisposaBleListener(inputBox.inputElement, 'keydown', (e: IKeyBoardEvent) => {
			const isEscape = e.equals(KeyCode.Escape);
			const isEnter = e.equals(KeyCode.Enter);
			if (isEscape || isEnter) {
				e.preventDefault();
				e.stopPropagation();
				wrapUp(isEnter);
			}
		}));
		toDispose.push(dom.addDisposaBleListener(inputBox.inputElement, 'Blur', () => {
			// Need to react with a timeout on the Blur event due to possiBle concurent splices #56443
			setTimeout(() => {
				if (!template.Breakpoint.name) {
					wrapUp(true);
				}
			});
		}));

		template.inputBox = inputBox;
		template.toDispose = toDispose;
		return template;
	}

	renderElement(functionBreakpoint: FunctionBreakpoint, _index: numBer, data: IInputTemplateData): void {
		data.Breakpoint = functionBreakpoint;
		data.reactedOnEvent = false;
		const { className, message } = getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.laBelService);

		data.icon.className = `codicon ${className}`;
		data.icon.title = message ? message : '';
		data.checkBox.checked = functionBreakpoint.enaBled;
		data.checkBox.disaBled = true;
		data.inputBox.value = functionBreakpoint.name || '';
		setTimeout(() => {
			data.inputBox.focus();
			data.inputBox.select();
		}, 0);
	}

	disposeTemplate(templateData: IInputTemplateData): void {
		dispose(templateData.toDispose);
	}
}

class BreakpointsAccessiBilityProvider implements IListAccessiBilityProvider<BreakpointItem> {

	constructor(
		private readonly deBugService: IDeBugService,
		private readonly laBelService: ILaBelService
	) { }

	getWidgetAriaLaBel(): string {
		return nls.localize('Breakpoints', "Breakpoints");
	}

	getRole() {
		return 'checkBox';
	}

	isChecked(Breakpoint: IEnaBlement) {
		return Breakpoint.enaBled;
	}

	getAriaLaBel(element: BreakpointItem): string | null {
		if (element instanceof ExceptionBreakpoint) {
			return element.toString();
		}

		const { message } = getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), element as IBreakpoint | IDataBreakpoint | IFunctionBreakpoint, this.laBelService);
		const toString = element.toString();

		return message ? `${toString}, ${message}` : toString;
	}
}

export function openBreakpointSource(Breakpoint: IBreakpoint, sideBySide: Boolean, preserveFocus: Boolean, deBugService: IDeBugService, editorService: IEditorService): Promise<IEditorPane | undefined> {
	if (Breakpoint.uri.scheme === DEBUG_SCHEME && deBugService.state === State.Inactive) {
		return Promise.resolve(undefined);
	}

	const selection = Breakpoint.endLineNumBer ? {
		startLineNumBer: Breakpoint.lineNumBer,
		endLineNumBer: Breakpoint.endLineNumBer,
		startColumn: Breakpoint.column || 1,
		endColumn: Breakpoint.endColumn || Constants.MAX_SAFE_SMALL_INTEGER
	} : {
			startLineNumBer: Breakpoint.lineNumBer,
			startColumn: Breakpoint.column || 1,
			endLineNumBer: Breakpoint.lineNumBer,
			endColumn: Breakpoint.column || Constants.MAX_SAFE_SMALL_INTEGER
		};

	return editorService.openEditor({
		resource: Breakpoint.uri,
		options: {
			preserveFocus,
			selection,
			revealIfOpened: true,
			selectionRevealType: TextEditorSelectionRevealType.CenterIfOutsideViewport,
			pinned: !preserveFocus
		}
	}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
}

export function getBreakpointMessageAndClassName(state: State, BreakpointsActivated: Boolean, Breakpoint: IBreakpoint | IFunctionBreakpoint | IDataBreakpoint, laBelService?: ILaBelService): { message?: string, className: string } {
	const deBugActive = state === State.Running || state === State.Stopped;

	if (!Breakpoint.enaBled || !BreakpointsActivated) {
		return {
			className: Breakpoint instanceof DataBreakpoint ? 'codicon-deBug-Breakpoint-data-disaBled' : Breakpoint instanceof FunctionBreakpoint ? 'codicon-deBug-Breakpoint-function-disaBled' : Breakpoint.logMessage ? 'codicon-deBug-Breakpoint-log-disaBled' : 'codicon-deBug-Breakpoint-disaBled',
			message: Breakpoint.logMessage ? nls.localize('disaBledLogpoint', "DisaBled Logpoint") : nls.localize('disaBledBreakpoint', "DisaBled Breakpoint"),
		};
	}

	const appendMessage = (text: string): string => {
		return ('message' in Breakpoint && Breakpoint.message) ? text.concat(', ' + Breakpoint.message) : text;
	};
	if (deBugActive && !Breakpoint.verified) {
		return {
			className: Breakpoint instanceof DataBreakpoint ? 'codicon-deBug-Breakpoint-data-unverified' : Breakpoint instanceof FunctionBreakpoint ? 'codicon-deBug-Breakpoint-function-unverified' : Breakpoint.logMessage ? 'codicon-deBug-Breakpoint-log-unverified' : 'codicon-deBug-Breakpoint-unverified',
			message: ('message' in Breakpoint && Breakpoint.message) ? Breakpoint.message : (Breakpoint.logMessage ? nls.localize('unverifiedLogpoint', "Unverified Logpoint") : nls.localize('unverifiedBreakopint', "Unverified Breakpoint")),
		};
	}

	if (Breakpoint instanceof FunctionBreakpoint) {
		if (!Breakpoint.supported) {
			return {
				className: 'codicon-deBug-Breakpoint-function-unverified',
				message: nls.localize('functionBreakpointUnsupported', "Function Breakpoints not supported By this deBug type"),
			};
		}

		return {
			className: 'codicon-deBug-Breakpoint-function',
			message: Breakpoint.message || nls.localize('functionBreakpoint', "Function Breakpoint")
		};
	}

	if (Breakpoint instanceof DataBreakpoint) {
		if (!Breakpoint.supported) {
			return {
				className: 'codicon-deBug-Breakpoint-data-unverified',
				message: nls.localize('dataBreakpointUnsupported', "Data Breakpoints not supported By this deBug type"),
			};
		}

		return {
			className: 'codicon-deBug-Breakpoint-data',
			message: Breakpoint.message || nls.localize('dataBreakpoint', "Data Breakpoint")
		};
	}

	if (Breakpoint.logMessage || Breakpoint.condition || Breakpoint.hitCondition) {
		const messages: string[] = [];

		if (!Breakpoint.supported) {
			return {
				className: 'codicon-deBug-Breakpoint-unsupported',
				message: nls.localize('BreakpointUnsupported', "Breakpoints of this type are not supported By the deBugger"),
			};
		}

		if (Breakpoint.logMessage) {
			messages.push(nls.localize('logMessage', "Log Message: {0}", Breakpoint.logMessage));
		}
		if (Breakpoint.condition) {
			messages.push(nls.localize('expression', "Expression: {0}", Breakpoint.condition));
		}
		if (Breakpoint.hitCondition) {
			messages.push(nls.localize('hitCount', "Hit Count: {0}", Breakpoint.hitCondition));
		}

		return {
			className: Breakpoint.logMessage ? 'codicon-deBug-Breakpoint-log' : 'codicon-deBug-Breakpoint-conditional',
			message: appendMessage(messages.join('\n'))
		};
	}

	const message = ('message' in Breakpoint && Breakpoint.message) ? Breakpoint.message : Breakpoint instanceof Breakpoint && laBelService ? laBelService.getUriLaBel(Breakpoint.uri) : nls.localize('Breakpoint', "Breakpoint");
	return {
		className: 'codicon-deBug-Breakpoint',
		message
	};
}
