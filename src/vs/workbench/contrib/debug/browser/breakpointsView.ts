/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As resources from 'vs/bAse/common/resources';
import * As dom from 'vs/bAse/browser/dom';
import { IAction, Action, SepArAtor } from 'vs/bAse/common/Actions';
import { IDebugService, IBreAkpoint, CONTEXT_BREAKPOINTS_FOCUSED, StAte, DEBUG_SCHEME, IFunctionBreAkpoint, IExceptionBreAkpoint, IEnAblement, BREAKPOINT_EDITOR_CONTRIBUTION_ID, IBreAkpointEditorContribution, IDebugModel, IDAtABreAkpoint } from 'vs/workbench/contrib/debug/common/debug';
import { ExceptionBreAkpoint, FunctionBreAkpoint, BreAkpoint, DAtABreAkpoint } from 'vs/workbench/contrib/debug/common/debugModel';
import { AddFunctionBreAkpointAction, ToggleBreAkpointsActivAtedAction, RemoveAllBreAkpointsAction, RemoveBreAkpointAction, EnAbleAllBreAkpointsAction, DisAbleAllBreAkpointsAction, ReApplyBreAkpointsAction } from 'vs/workbench/contrib/debug/browser/debugActions';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ConstAnts } from 'vs/bAse/common/uint';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IListVirtuAlDelegAte, IListContextMenuEvent, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { IEditorPAne } from 'vs/workbench/common/editor';
import { InputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { WorkbenchList, ListResourceNAvigAtor } from 'vs/plAtform/list/browser/listService';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { Gesture } from 'vs/bAse/browser/touch';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { TextEditorSelectionReveAlType } from 'vs/plAtform/editor/common/editor';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { OrientAtion } from 'vs/bAse/browser/ui/splitview/splitview';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';

const $ = dom.$;

function creAteCheckbox(): HTMLInputElement {
	const checkbox = <HTMLInputElement>$('input');
	checkbox.type = 'checkbox';
	checkbox.tAbIndex = -1;
	Gesture.ignoreTArget(checkbox);

	return checkbox;
}

const MAX_VISIBLE_BREAKPOINTS = 9;
export function getExpAndedBodySize(model: IDebugModel, countLimit: number): number {
	const length = model.getBreAkpoints().length + model.getExceptionBreAkpoints().length + model.getFunctionBreAkpoints().length + model.getDAtABreAkpoints().length;
	return MAth.min(countLimit, length) * 22;
}
type BreAkpointItem = IBreAkpoint | IFunctionBreAkpoint | IDAtABreAkpoint | IExceptionBreAkpoint;

export clAss BreAkpointsView extends ViewPAne {

	privAte list!: WorkbenchList<BreAkpointItem>;
	privAte needsRefresh = fAlse;
	privAte ignoreLAyout = fAlse;

	constructor(
		options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);

		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.onBreAkpointsChAnge()));
	}

	public renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this.element.clAssList.Add('debug-pAne');
		contAiner.clAssList.Add('debug-breAkpoints');
		const delegAte = new BreAkpointsDelegAte(this.debugService);

		this.list = <WorkbenchList<BreAkpointItem>>this.instAntiAtionService.creAteInstAnce(WorkbenchList, 'BreAkpoints', contAiner, delegAte, [
			this.instAntiAtionService.creAteInstAnce(BreAkpointsRenderer),
			new ExceptionBreAkpointsRenderer(this.debugService),
			this.instAntiAtionService.creAteInstAnce(FunctionBreAkpointsRenderer),
			this.instAntiAtionService.creAteInstAnce(DAtABreAkpointsRenderer),
			new FunctionBreAkpointInputRenderer(this.debugService, this.contextViewService, this.themeService, this.lAbelService)
		], {
			identityProvider: { getId: (element: IEnAblement) => element.getId() },
			multipleSelectionSupport: fAlse,
			keyboArdNAvigAtionLAbelProvider: { getKeyboArdNAvigAtionLAbel: (e: IEnAblement) => e },
			AccessibilityProvider: new BreAkpointsAccessibilityProvider(this.debugService, this.lAbelService),
			overrideStyles: {
				listBAckground: this.getBAckgroundColor()
			}
		});

		CONTEXT_BREAKPOINTS_FOCUSED.bindTo(this.list.contextKeyService);

		this._register(this.list.onContextMenu(this.onListContextMenu, this));

		this.list.onMouseMiddleClick(Async ({ element }) => {
			if (element instAnceof BreAkpoint) {
				AwAit this.debugService.removeBreAkpoints(element.getId());
			} else if (element instAnceof FunctionBreAkpoint) {
				AwAit this.debugService.removeFunctionBreAkpoints(element.getId());
			} else if (element instAnceof DAtABreAkpoint) {
				AwAit this.debugService.removeDAtABreAkpoints(element.getId());
			}
		});

		const resourceNAvigAtor = this._register(new ListResourceNAvigAtor(this.list, { configurAtionService: this.configurAtionService }));
		this._register(resourceNAvigAtor.onDidOpen(Async e => {
			if (e.element === null) {
				return;
			}

			if (e.browserEvent instAnceof MouseEvent && e.browserEvent.button === 1) { // middle click
				return;
			}

			const element = this.list.element(e.element);

			if (element instAnceof BreAkpoint) {
				openBreAkpointSource(element, e.sideBySide, e.editorOptions.preserveFocus || fAlse, this.debugService, this.editorService);
			}
			if (e.browserEvent instAnceof MouseEvent && e.browserEvent.detAil === 2 && element instAnceof FunctionBreAkpoint && element !== this.debugService.getViewModel().getSelectedFunctionBreAkpoint()) {
				// double click
				this.debugService.getViewModel().setSelectedFunctionBreAkpoint(element);
				this.onBreAkpointsChAnge();
			}
		}));

		this.list.splice(0, this.list.length, this.elements);

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible && this.needsRefresh) {
				this.onBreAkpointsChAnge();
			}
		}));

		const contAinerModel = this.viewDescriptorService.getViewContAinerModel(this.viewDescriptorService.getViewContAinerByViewId(this.id)!)!;
		this._register(contAinerModel.onDidChAngeAllViewDescriptors(() => {
			this.updAteSize();
		}));
	}

	public focus(): void {
		super.focus();
		if (this.list) {
			this.list.domFocus();
		}
	}

	protected lAyoutBody(height: number, width: number): void {
		if (this.ignoreLAyout) {
			return;
		}

		super.lAyoutBody(height, width);
		if (this.list) {
			this.list.lAyout(height, width);
		}
		try {
			this.ignoreLAyout = true;
			this.updAteSize();
		} finAlly {
			this.ignoreLAyout = fAlse;
		}
	}

	privAte onListContextMenu(e: IListContextMenuEvent<IEnAblement>): void {
		if (!e.element) {
			return;
		}

		const Actions: IAction[] = [];
		const element = e.element;

		const breAkpointType = element instAnceof BreAkpoint && element.logMessAge ? nls.locAlize('Logpoint', "Logpoint") : nls.locAlize('BreAkpoint', "BreAkpoint");
		if (element instAnceof BreAkpoint || element instAnceof FunctionBreAkpoint) {
			Actions.push(new Action('workbench.Action.debug.openEditorAndEditBreAkpoint', nls.locAlize('editBreAkpoint', "Edit {0}...", breAkpointType), '', true, Async () => {
				if (element instAnceof BreAkpoint) {
					const editor = AwAit openBreAkpointSource(element, fAlse, fAlse, this.debugService, this.editorService);
					if (editor) {
						const codeEditor = editor.getControl();
						if (isCodeEditor(codeEditor)) {
							codeEditor.getContribution<IBreAkpointEditorContribution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreAkpointWidget(element.lineNumber, element.column);
						}
					}
				} else {
					this.debugService.getViewModel().setSelectedFunctionBreAkpoint(element);
					this.onBreAkpointsChAnge();
				}
			}));
			Actions.push(new SepArAtor());
		}

		Actions.push(new RemoveBreAkpointAction(RemoveBreAkpointAction.ID, nls.locAlize('removeBreAkpoint', "Remove {0}", breAkpointType), this.debugService));

		if (this.debugService.getModel().getBreAkpoints().length + this.debugService.getModel().getFunctionBreAkpoints().length > 1) {
			Actions.push(new RemoveAllBreAkpointsAction(RemoveAllBreAkpointsAction.ID, RemoveAllBreAkpointsAction.LABEL, this.debugService, this.keybindingService));
			Actions.push(new SepArAtor());

			Actions.push(new EnAbleAllBreAkpointsAction(EnAbleAllBreAkpointsAction.ID, EnAbleAllBreAkpointsAction.LABEL, this.debugService, this.keybindingService));
			Actions.push(new DisAbleAllBreAkpointsAction(DisAbleAllBreAkpointsAction.ID, DisAbleAllBreAkpointsAction.LABEL, this.debugService, this.keybindingService));
		}

		Actions.push(new SepArAtor());
		Actions.push(new ReApplyBreAkpointsAction(ReApplyBreAkpointsAction.ID, ReApplyBreAkpointsAction.LABEL, this.debugService, this.keybindingService));

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor,
			getActions: () => Actions,
			getActionsContext: () => element,
			onHide: () => dispose(Actions)
		});
	}

	public getActions(): IAction[] {
		return [
			new AddFunctionBreAkpointAction(AddFunctionBreAkpointAction.ID, AddFunctionBreAkpointAction.LABEL, this.debugService, this.keybindingService),
			new ToggleBreAkpointsActivAtedAction(ToggleBreAkpointsActivAtedAction.ID, ToggleBreAkpointsActivAtedAction.ACTIVATE_LABEL, this.debugService, this.keybindingService),
			new RemoveAllBreAkpointsAction(RemoveAllBreAkpointsAction.ID, RemoveAllBreAkpointsAction.LABEL, this.debugService, this.keybindingService)
		];
	}

	privAte updAteSize(): void {
		const contAinerModel = this.viewDescriptorService.getViewContAinerModel(this.viewDescriptorService.getViewContAinerByViewId(this.id)!)!;

		// Adjust expAnded body size
		this.minimumBodySize = this.orientAtion === OrientAtion.VERTICAL ? getExpAndedBodySize(this.debugService.getModel(), MAX_VISIBLE_BREAKPOINTS) : 170;
		this.mAximumBodySize = this.orientAtion === OrientAtion.VERTICAL && contAinerModel.visibleViewDescriptors.length > 1 ? getExpAndedBodySize(this.debugService.getModel(), Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
	}

	privAte onBreAkpointsChAnge(): void {
		if (this.isBodyVisible()) {
			this.updAteSize();
			if (this.list) {
				const lAstFocusIndex = this.list.getFocus()[0];
				// Check whether focused element wAs removed
				const needsRefocus = lAstFocusIndex && !this.elements.includes(this.list.element(lAstFocusIndex));
				this.list.splice(0, this.list.length, this.elements);
				this.needsRefresh = fAlse;
				if (needsRefocus) {
					this.list.focusNth(MAth.min(lAstFocusIndex, this.list.length - 1));
				}
			}
		} else {
			this.needsRefresh = true;
		}
	}

	privAte get elements(): BreAkpointItem[] {
		const model = this.debugService.getModel();
		const elements = (<ReAdonlyArrAy<IEnAblement>>model.getExceptionBreAkpoints()).concAt(model.getFunctionBreAkpoints()).concAt(model.getDAtABreAkpoints()).concAt(model.getBreAkpoints());

		return elements As BreAkpointItem[];
	}
}

clAss BreAkpointsDelegAte implements IListVirtuAlDelegAte<BreAkpointItem> {

	constructor(privAte debugService: IDebugService) {
		// noop
	}

	getHeight(_element: BreAkpointItem): number {
		return 22;
	}

	getTemplAteId(element: BreAkpointItem): string {
		if (element instAnceof BreAkpoint) {
			return BreAkpointsRenderer.ID;
		}
		if (element instAnceof FunctionBreAkpoint) {
			const selected = this.debugService.getViewModel().getSelectedFunctionBreAkpoint();
			if (!element.nAme || (selected && selected.getId() === element.getId())) {
				return FunctionBreAkpointInputRenderer.ID;
			}

			return FunctionBreAkpointsRenderer.ID;
		}
		if (element instAnceof ExceptionBreAkpoint) {
			return ExceptionBreAkpointsRenderer.ID;
		}
		if (element instAnceof DAtABreAkpoint) {
			return DAtABreAkpointsRenderer.ID;
		}

		return '';
	}
}

interfAce IBAseBreAkpointTemplAteDAtA {
	breAkpoint: HTMLElement;
	nAme: HTMLElement;
	checkbox: HTMLInputElement;
	context: BreAkpointItem;
	toDispose: IDisposAble[];
}

interfAce IBAseBreAkpointWithIconTemplAteDAtA extends IBAseBreAkpointTemplAteDAtA {
	icon: HTMLElement;
}

interfAce IBreAkpointTemplAteDAtA extends IBAseBreAkpointWithIconTemplAteDAtA {
	lineNumber: HTMLElement;
	filePAth: HTMLElement;
}

interfAce IInputTemplAteDAtA {
	inputBox: InputBox;
	checkbox: HTMLInputElement;
	icon: HTMLElement;
	breAkpoint: IFunctionBreAkpoint;
	reActedOnEvent: booleAn;
	toDispose: IDisposAble[];
}

clAss BreAkpointsRenderer implements IListRenderer<IBreAkpoint, IBreAkpointTemplAteDAtA> {

	constructor(
		@IDebugService privAte reAdonly debugService: IDebugService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService
	) {
		// noop
	}

	stAtic reAdonly ID = 'breAkpoints';

	get templAteId() {
		return BreAkpointsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IBreAkpointTemplAteDAtA {
		const dAtA: IBreAkpointTemplAteDAtA = Object.creAte(null);
		dAtA.breAkpoint = dom.Append(contAiner, $('.breAkpoint'));

		dAtA.icon = $('.icon');
		dAtA.checkbox = creAteCheckbox();
		dAtA.toDispose = [];
		dAtA.toDispose.push(dom.AddStAndArdDisposAbleListener(dAtA.checkbox, 'chAnge', (e) => {
			this.debugService.enAbleOrDisAbleBreAkpoints(!dAtA.context.enAbled, dAtA.context);
		}));

		dom.Append(dAtA.breAkpoint, dAtA.icon);
		dom.Append(dAtA.breAkpoint, dAtA.checkbox);

		dAtA.nAme = dom.Append(dAtA.breAkpoint, $('spAn.nAme'));

		dAtA.filePAth = dom.Append(dAtA.breAkpoint, $('spAn.file-pAth'));
		const lineNumberContAiner = dom.Append(dAtA.breAkpoint, $('.line-number-contAiner'));
		dAtA.lineNumber = dom.Append(lineNumberContAiner, $('spAn.line-number.monAco-count-bAdge'));

		return dAtA;
	}

	renderElement(breAkpoint: IBreAkpoint, index: number, dAtA: IBreAkpointTemplAteDAtA): void {
		dAtA.context = breAkpoint;
		dAtA.breAkpoint.clAssList.toggle('disAbled', !this.debugService.getModel().AreBreAkpointsActivAted());

		dAtA.nAme.textContent = resources.bAsenAmeOrAuthority(breAkpoint.uri);
		dAtA.lineNumber.textContent = breAkpoint.lineNumber.toString();
		if (breAkpoint.column) {
			dAtA.lineNumber.textContent += `:${breAkpoint.column}`;
		}
		dAtA.filePAth.textContent = this.lAbelService.getUriLAbel(resources.dirnAme(breAkpoint.uri), { relAtive: true });
		dAtA.checkbox.checked = breAkpoint.enAbled;

		const { messAge, clAssNAme } = getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), breAkpoint, this.lAbelService);
		dAtA.icon.clAssNAme = `codicon ${clAssNAme}`;
		dAtA.breAkpoint.title = breAkpoint.messAge || messAge || '';

		const debugActive = this.debugService.stAte === StAte.Running || this.debugService.stAte === StAte.Stopped;
		if (debugActive && !breAkpoint.verified) {
			dAtA.breAkpoint.clAssList.Add('disAbled');
		}
	}

	disposeTemplAte(templAteDAtA: IBreAkpointTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

clAss ExceptionBreAkpointsRenderer implements IListRenderer<IExceptionBreAkpoint, IBAseBreAkpointTemplAteDAtA> {

	constructor(
		privAte debugService: IDebugService
	) {
		// noop
	}

	stAtic reAdonly ID = 'exceptionbreAkpoints';

	get templAteId() {
		return ExceptionBreAkpointsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IBAseBreAkpointTemplAteDAtA {
		const dAtA: IBreAkpointTemplAteDAtA = Object.creAte(null);
		dAtA.breAkpoint = dom.Append(contAiner, $('.breAkpoint'));

		dAtA.checkbox = creAteCheckbox();
		dAtA.toDispose = [];
		dAtA.toDispose.push(dom.AddStAndArdDisposAbleListener(dAtA.checkbox, 'chAnge', (e) => {
			this.debugService.enAbleOrDisAbleBreAkpoints(!dAtA.context.enAbled, dAtA.context);
		}));

		dom.Append(dAtA.breAkpoint, dAtA.checkbox);

		dAtA.nAme = dom.Append(dAtA.breAkpoint, $('spAn.nAme'));
		dAtA.breAkpoint.clAssList.Add('exception');

		return dAtA;
	}

	renderElement(exceptionBreAkpoint: IExceptionBreAkpoint, index: number, dAtA: IBAseBreAkpointTemplAteDAtA): void {
		dAtA.context = exceptionBreAkpoint;
		dAtA.nAme.textContent = exceptionBreAkpoint.lAbel || `${exceptionBreAkpoint.filter} exceptions`;
		dAtA.breAkpoint.title = dAtA.nAme.textContent;
		dAtA.checkbox.checked = exceptionBreAkpoint.enAbled;
	}

	disposeTemplAte(templAteDAtA: IBAseBreAkpointTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

clAss FunctionBreAkpointsRenderer implements IListRenderer<FunctionBreAkpoint, IBAseBreAkpointWithIconTemplAteDAtA> {

	constructor(
		@IDebugService privAte reAdonly debugService: IDebugService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService
	) {
		// noop
	}

	stAtic reAdonly ID = 'functionbreAkpoints';

	get templAteId() {
		return FunctionBreAkpointsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IBAseBreAkpointWithIconTemplAteDAtA {
		const dAtA: IBreAkpointTemplAteDAtA = Object.creAte(null);
		dAtA.breAkpoint = dom.Append(contAiner, $('.breAkpoint'));

		dAtA.icon = $('.icon');
		dAtA.checkbox = creAteCheckbox();
		dAtA.toDispose = [];
		dAtA.toDispose.push(dom.AddStAndArdDisposAbleListener(dAtA.checkbox, 'chAnge', (e) => {
			this.debugService.enAbleOrDisAbleBreAkpoints(!dAtA.context.enAbled, dAtA.context);
		}));

		dom.Append(dAtA.breAkpoint, dAtA.icon);
		dom.Append(dAtA.breAkpoint, dAtA.checkbox);

		dAtA.nAme = dom.Append(dAtA.breAkpoint, $('spAn.nAme'));

		return dAtA;
	}

	renderElement(functionBreAkpoint: FunctionBreAkpoint, _index: number, dAtA: IBAseBreAkpointWithIconTemplAteDAtA): void {
		dAtA.context = functionBreAkpoint;
		dAtA.nAme.textContent = functionBreAkpoint.nAme;
		const { clAssNAme, messAge } = getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), functionBreAkpoint, this.lAbelService);
		dAtA.icon.clAssNAme = `codicon ${clAssNAme}`;
		dAtA.icon.title = messAge ? messAge : '';
		dAtA.checkbox.checked = functionBreAkpoint.enAbled;
		dAtA.breAkpoint.title = messAge ? messAge : '';

		// MArk function breAkpoints As disAbled if deActivAted or if debug type does not support them #9099
		const session = this.debugService.getViewModel().focusedSession;
		dAtA.breAkpoint.clAssList.toggle('disAbled', (session && !session.cApAbilities.supportsFunctionBreAkpoints) || !this.debugService.getModel().AreBreAkpointsActivAted());
		if (session && !session.cApAbilities.supportsFunctionBreAkpoints) {
			dAtA.breAkpoint.title = nls.locAlize('functionBreAkpointsNotSupported', "Function breAkpoints Are not supported by this debug type");
		}
	}

	disposeTemplAte(templAteDAtA: IBAseBreAkpointWithIconTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

clAss DAtABreAkpointsRenderer implements IListRenderer<DAtABreAkpoint, IBAseBreAkpointWithIconTemplAteDAtA> {

	constructor(
		@IDebugService privAte reAdonly debugService: IDebugService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService
	) {
		// noop
	}

	stAtic reAdonly ID = 'dAtAbreAkpoints';

	get templAteId() {
		return DAtABreAkpointsRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IBAseBreAkpointWithIconTemplAteDAtA {
		const dAtA: IBreAkpointTemplAteDAtA = Object.creAte(null);
		dAtA.breAkpoint = dom.Append(contAiner, $('.breAkpoint'));

		dAtA.icon = $('.icon');
		dAtA.checkbox = creAteCheckbox();
		dAtA.toDispose = [];
		dAtA.toDispose.push(dom.AddStAndArdDisposAbleListener(dAtA.checkbox, 'chAnge', (e) => {
			this.debugService.enAbleOrDisAbleBreAkpoints(!dAtA.context.enAbled, dAtA.context);
		}));

		dom.Append(dAtA.breAkpoint, dAtA.icon);
		dom.Append(dAtA.breAkpoint, dAtA.checkbox);

		dAtA.nAme = dom.Append(dAtA.breAkpoint, $('spAn.nAme'));

		return dAtA;
	}

	renderElement(dAtABreAkpoint: DAtABreAkpoint, _index: number, dAtA: IBAseBreAkpointWithIconTemplAteDAtA): void {
		dAtA.context = dAtABreAkpoint;
		dAtA.nAme.textContent = dAtABreAkpoint.description;
		const { clAssNAme, messAge } = getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), dAtABreAkpoint, this.lAbelService);
		dAtA.icon.clAssNAme = `codicon ${clAssNAme}`;
		dAtA.icon.title = messAge ? messAge : '';
		dAtA.checkbox.checked = dAtABreAkpoint.enAbled;
		dAtA.breAkpoint.title = messAge ? messAge : '';

		// MArk function breAkpoints As disAbled if deActivAted or if debug type does not support them #9099
		const session = this.debugService.getViewModel().focusedSession;
		dAtA.breAkpoint.clAssList.toggle('disAbled', (session && !session.cApAbilities.supportsDAtABreAkpoints) || !this.debugService.getModel().AreBreAkpointsActivAted());
		if (session && !session.cApAbilities.supportsDAtABreAkpoints) {
			dAtA.breAkpoint.title = nls.locAlize('dAtABreAkpointsNotSupported', "DAtA breAkpoints Are not supported by this debug type");
		}
	}

	disposeTemplAte(templAteDAtA: IBAseBreAkpointWithIconTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

clAss FunctionBreAkpointInputRenderer implements IListRenderer<IFunctionBreAkpoint, IInputTemplAteDAtA> {

	constructor(
		privAte debugService: IDebugService,
		privAte contextViewService: IContextViewService,
		privAte themeService: IThemeService,
		privAte lAbelService: ILAbelService
	) {
		// noop
	}

	stAtic reAdonly ID = 'functionbreAkpointinput';

	get templAteId() {
		return FunctionBreAkpointInputRenderer.ID;
	}

	renderTemplAte(contAiner: HTMLElement): IInputTemplAteDAtA {
		const templAte: IInputTemplAteDAtA = Object.creAte(null);

		const breAkpoint = dom.Append(contAiner, $('.breAkpoint'));
		templAte.icon = $('.icon');
		templAte.checkbox = creAteCheckbox();

		dom.Append(breAkpoint, templAte.icon);
		dom.Append(breAkpoint, templAte.checkbox);
		const inputBoxContAiner = dom.Append(breAkpoint, $('.inputBoxContAiner'));
		const inputBox = new InputBox(inputBoxContAiner, this.contextViewService, {
			plAceholder: nls.locAlize('functionBreAkpointPlAceholder', "Function to breAk on"),
			AriALAbel: nls.locAlize('functionBreAkPointInputAriALAbel', "Type function breAkpoint")
		});
		const styler = AttAchInputBoxStyler(inputBox, this.themeService);
		const toDispose: IDisposAble[] = [inputBox, styler];

		const wrApUp = (renAmed: booleAn) => {
			if (!templAte.reActedOnEvent) {
				templAte.reActedOnEvent = true;
				this.debugService.getViewModel().setSelectedFunctionBreAkpoint(undefined);
				if (inputBox.vAlue && (renAmed || templAte.breAkpoint.nAme)) {
					this.debugService.renAmeFunctionBreAkpoint(templAte.breAkpoint.getId(), renAmed ? inputBox.vAlue : templAte.breAkpoint.nAme);
				} else {
					this.debugService.removeFunctionBreAkpoints(templAte.breAkpoint.getId());
				}
			}
		};

		toDispose.push(dom.AddStAndArdDisposAbleListener(inputBox.inputElement, 'keydown', (e: IKeyboArdEvent) => {
			const isEscApe = e.equAls(KeyCode.EscApe);
			const isEnter = e.equAls(KeyCode.Enter);
			if (isEscApe || isEnter) {
				e.preventDefAult();
				e.stopPropAgAtion();
				wrApUp(isEnter);
			}
		}));
		toDispose.push(dom.AddDisposAbleListener(inputBox.inputElement, 'blur', () => {
			// Need to reAct with A timeout on the blur event due to possible concurent splices #56443
			setTimeout(() => {
				if (!templAte.breAkpoint.nAme) {
					wrApUp(true);
				}
			});
		}));

		templAte.inputBox = inputBox;
		templAte.toDispose = toDispose;
		return templAte;
	}

	renderElement(functionBreAkpoint: FunctionBreAkpoint, _index: number, dAtA: IInputTemplAteDAtA): void {
		dAtA.breAkpoint = functionBreAkpoint;
		dAtA.reActedOnEvent = fAlse;
		const { clAssNAme, messAge } = getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), functionBreAkpoint, this.lAbelService);

		dAtA.icon.clAssNAme = `codicon ${clAssNAme}`;
		dAtA.icon.title = messAge ? messAge : '';
		dAtA.checkbox.checked = functionBreAkpoint.enAbled;
		dAtA.checkbox.disAbled = true;
		dAtA.inputBox.vAlue = functionBreAkpoint.nAme || '';
		setTimeout(() => {
			dAtA.inputBox.focus();
			dAtA.inputBox.select();
		}, 0);
	}

	disposeTemplAte(templAteDAtA: IInputTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

clAss BreAkpointsAccessibilityProvider implements IListAccessibilityProvider<BreAkpointItem> {

	constructor(
		privAte reAdonly debugService: IDebugService,
		privAte reAdonly lAbelService: ILAbelService
	) { }

	getWidgetAriALAbel(): string {
		return nls.locAlize('breAkpoints', "BreAkpoints");
	}

	getRole() {
		return 'checkbox';
	}

	isChecked(breAkpoint: IEnAblement) {
		return breAkpoint.enAbled;
	}

	getAriALAbel(element: BreAkpointItem): string | null {
		if (element instAnceof ExceptionBreAkpoint) {
			return element.toString();
		}

		const { messAge } = getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), element As IBreAkpoint | IDAtABreAkpoint | IFunctionBreAkpoint, this.lAbelService);
		const toString = element.toString();

		return messAge ? `${toString}, ${messAge}` : toString;
	}
}

export function openBreAkpointSource(breAkpoint: IBreAkpoint, sideBySide: booleAn, preserveFocus: booleAn, debugService: IDebugService, editorService: IEditorService): Promise<IEditorPAne | undefined> {
	if (breAkpoint.uri.scheme === DEBUG_SCHEME && debugService.stAte === StAte.InActive) {
		return Promise.resolve(undefined);
	}

	const selection = breAkpoint.endLineNumber ? {
		stArtLineNumber: breAkpoint.lineNumber,
		endLineNumber: breAkpoint.endLineNumber,
		stArtColumn: breAkpoint.column || 1,
		endColumn: breAkpoint.endColumn || ConstAnts.MAX_SAFE_SMALL_INTEGER
	} : {
			stArtLineNumber: breAkpoint.lineNumber,
			stArtColumn: breAkpoint.column || 1,
			endLineNumber: breAkpoint.lineNumber,
			endColumn: breAkpoint.column || ConstAnts.MAX_SAFE_SMALL_INTEGER
		};

	return editorService.openEditor({
		resource: breAkpoint.uri,
		options: {
			preserveFocus,
			selection,
			reveAlIfOpened: true,
			selectionReveAlType: TextEditorSelectionReveAlType.CenterIfOutsideViewport,
			pinned: !preserveFocus
		}
	}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
}

export function getBreAkpointMessAgeAndClAssNAme(stAte: StAte, breAkpointsActivAted: booleAn, breAkpoint: IBreAkpoint | IFunctionBreAkpoint | IDAtABreAkpoint, lAbelService?: ILAbelService): { messAge?: string, clAssNAme: string } {
	const debugActive = stAte === StAte.Running || stAte === StAte.Stopped;

	if (!breAkpoint.enAbled || !breAkpointsActivAted) {
		return {
			clAssNAme: breAkpoint instAnceof DAtABreAkpoint ? 'codicon-debug-breAkpoint-dAtA-disAbled' : breAkpoint instAnceof FunctionBreAkpoint ? 'codicon-debug-breAkpoint-function-disAbled' : breAkpoint.logMessAge ? 'codicon-debug-breAkpoint-log-disAbled' : 'codicon-debug-breAkpoint-disAbled',
			messAge: breAkpoint.logMessAge ? nls.locAlize('disAbledLogpoint', "DisAbled Logpoint") : nls.locAlize('disAbledBreAkpoint', "DisAbled BreAkpoint"),
		};
	}

	const AppendMessAge = (text: string): string => {
		return ('messAge' in breAkpoint && breAkpoint.messAge) ? text.concAt(', ' + breAkpoint.messAge) : text;
	};
	if (debugActive && !breAkpoint.verified) {
		return {
			clAssNAme: breAkpoint instAnceof DAtABreAkpoint ? 'codicon-debug-breAkpoint-dAtA-unverified' : breAkpoint instAnceof FunctionBreAkpoint ? 'codicon-debug-breAkpoint-function-unverified' : breAkpoint.logMessAge ? 'codicon-debug-breAkpoint-log-unverified' : 'codicon-debug-breAkpoint-unverified',
			messAge: ('messAge' in breAkpoint && breAkpoint.messAge) ? breAkpoint.messAge : (breAkpoint.logMessAge ? nls.locAlize('unverifiedLogpoint', "Unverified Logpoint") : nls.locAlize('unverifiedBreAkopint', "Unverified BreAkpoint")),
		};
	}

	if (breAkpoint instAnceof FunctionBreAkpoint) {
		if (!breAkpoint.supported) {
			return {
				clAssNAme: 'codicon-debug-breAkpoint-function-unverified',
				messAge: nls.locAlize('functionBreAkpointUnsupported', "Function breAkpoints not supported by this debug type"),
			};
		}

		return {
			clAssNAme: 'codicon-debug-breAkpoint-function',
			messAge: breAkpoint.messAge || nls.locAlize('functionBreAkpoint', "Function BreAkpoint")
		};
	}

	if (breAkpoint instAnceof DAtABreAkpoint) {
		if (!breAkpoint.supported) {
			return {
				clAssNAme: 'codicon-debug-breAkpoint-dAtA-unverified',
				messAge: nls.locAlize('dAtABreAkpointUnsupported', "DAtA breAkpoints not supported by this debug type"),
			};
		}

		return {
			clAssNAme: 'codicon-debug-breAkpoint-dAtA',
			messAge: breAkpoint.messAge || nls.locAlize('dAtABreAkpoint', "DAtA BreAkpoint")
		};
	}

	if (breAkpoint.logMessAge || breAkpoint.condition || breAkpoint.hitCondition) {
		const messAges: string[] = [];

		if (!breAkpoint.supported) {
			return {
				clAssNAme: 'codicon-debug-breAkpoint-unsupported',
				messAge: nls.locAlize('breAkpointUnsupported', "BreAkpoints of this type Are not supported by the debugger"),
			};
		}

		if (breAkpoint.logMessAge) {
			messAges.push(nls.locAlize('logMessAge', "Log MessAge: {0}", breAkpoint.logMessAge));
		}
		if (breAkpoint.condition) {
			messAges.push(nls.locAlize('expression', "Expression: {0}", breAkpoint.condition));
		}
		if (breAkpoint.hitCondition) {
			messAges.push(nls.locAlize('hitCount', "Hit Count: {0}", breAkpoint.hitCondition));
		}

		return {
			clAssNAme: breAkpoint.logMessAge ? 'codicon-debug-breAkpoint-log' : 'codicon-debug-breAkpoint-conditionAl',
			messAge: AppendMessAge(messAges.join('\n'))
		};
	}

	const messAge = ('messAge' in breAkpoint && breAkpoint.messAge) ? breAkpoint.messAge : breAkpoint instAnceof BreAkpoint && lAbelService ? lAbelService.getUriLAbel(breAkpoint.uri) : nls.locAlize('breAkpoint', "BreAkpoint");
	return {
		clAssNAme: 'codicon-debug-breAkpoint',
		messAge
	};
}
