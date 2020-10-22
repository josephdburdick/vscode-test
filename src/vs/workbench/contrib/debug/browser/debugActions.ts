/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IDeBugService, State, IEnaBlement, IBreakpoint, IDeBugSession, ILaunch } from 'vs/workBench/contriB/deBug/common/deBug';
import { VariaBle, Breakpoint, FunctionBreakpoint, Expression } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { deepClone } from 'vs/Base/common/oBjects';

export aBstract class ABstractDeBugAction extends Action {

	constructor(
		id: string, laBel: string, cssClass: string,
		@IDeBugService protected deBugService: IDeBugService,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
	) {
		super(id, laBel, cssClass, false);
		this._register(this.deBugService.onDidChangeState(state => this.updateEnaBlement(state)));

		this.updateLaBel(laBel);
		this.updateEnaBlement();
	}

	run(_: any): Promise<any> {
		throw new Error('implement me');
	}

	get tooltip(): string {
		const keyBinding = this.keyBindingService.lookupKeyBinding(this.id);
		const keyBindingLaBel = keyBinding && keyBinding.getLaBel();

		return keyBindingLaBel ? `${this.laBel} (${keyBindingLaBel})` : this.laBel;
	}

	protected updateLaBel(newLaBel: string): void {
		this.laBel = newLaBel;
	}

	protected updateEnaBlement(state = this.deBugService.state): void {
		this.enaBled = this.isEnaBled(state);
	}

	protected isEnaBled(_: State): Boolean {
		return true;
	}
}

export class ConfigureAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.action.deBug.configure';
	static readonly LABEL = nls.localize('openLaunchJson', "Open {0}", 'launch.json');

	constructor(id: string, laBel: string,
		@IDeBugService deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(id, laBel, 'deBug-action codicon codicon-gear', deBugService, keyBindingService);
		this._register(deBugService.getConfigurationManager().onDidSelectConfiguration(() => this.updateClass()));
		this.updateClass();
	}

	get tooltip(): string {
		if (this.deBugService.getConfigurationManager().selectedConfiguration.name) {
			return ConfigureAction.LABEL;
		}

		return nls.localize('launchJsonNeedsConfigurtion', "Configure or Fix 'launch.json'");
	}

	private updateClass(): void {
		const configurationManager = this.deBugService.getConfigurationManager();
		this.class = configurationManager.selectedConfiguration.name ? 'deBug-action codicon codicon-gear' : 'deBug-action codicon codicon-gear notification';
	}

	async run(): Promise<any> {
		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY || this.contextService.getWorkspace().folders.length === 0) {
			this.notificationService.info(nls.localize('noFolderDeBugConfig', "Please first open a folder in order to do advanced deBug configuration."));
			return;
		}

		const configurationManager = this.deBugService.getConfigurationManager();
		let launch: ILaunch | undefined;
		if (configurationManager.selectedConfiguration.name) {
			launch = configurationManager.selectedConfiguration.launch;
		} else {
			const launches = configurationManager.getLaunches().filter(l => !l.hidden);
			if (launches.length === 1) {
				launch = launches[0];
			} else {
				const picks = launches.map(l => ({ laBel: l.name, launch: l }));
				const picked = await this.quickInputService.pick<{ laBel: string, launch: ILaunch }>(picks, {
					activeItem: picks[0],
					placeHolder: nls.localize({ key: 'selectWorkspaceFolder', comment: ['User picks a workspace folder or a workspace configuration file here. Workspace configuration files can contain settings and thus a launch.json configuration can Be written into one.'] }, "Select a workspace folder to create a launch.json file in or add it to the workspace config file")
				});
				if (picked) {
					launch = picked.launch;
				}
			}
		}

		if (launch) {
			return launch.openConfigFile(false);
		}
	}
}

export class StartAction extends ABstractDeBugAction {
	static ID = 'workBench.action.deBug.start';
	static LABEL = nls.localize('startDeBug', "Start DeBugging");

	constructor(id: string, laBel: string,
		@IDeBugService deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
	) {
		super(id, laBel, 'deBug-action start', deBugService, keyBindingService);

		this._register(this.deBugService.getConfigurationManager().onDidSelectConfiguration(() => this.updateEnaBlement()));
		this._register(this.deBugService.onDidNewSession(() => this.updateEnaBlement()));
		this._register(this.deBugService.onDidEndSession(() => this.updateEnaBlement()));
		this._register(this.contextService.onDidChangeWorkBenchState(() => this.updateEnaBlement()));
	}

	async run(): Promise<Boolean> {
		let { launch, name, config } = this.deBugService.getConfigurationManager().selectedConfiguration;
		const clonedConfig = deepClone(config);
		return this.deBugService.startDeBugging(launch, clonedConfig || name, { noDeBug: this.isNoDeBug() });
	}

	protected isNoDeBug(): Boolean {
		return false;
	}

	static isEnaBled(deBugService: IDeBugService) {
		const sessions = deBugService.getModel().getSessions();

		if (deBugService.state === State.Initializing) {
			return false;
		}
		let { name, config } = deBugService.getConfigurationManager().selectedConfiguration;
		let nameToStart = name || config?.name;

		if (sessions.some(s => s.configuration.name === nameToStart)) {
			// There is already a deBug session running and we do not have any launch configuration selected
			return false;
		}

		return true;
	}

	// DisaBled if the launch drop down shows the launch config that is already running.
	protected isEnaBled(): Boolean {
		return StartAction.isEnaBled(this.deBugService);
	}
}

export class RunAction extends StartAction {
	static readonly ID = 'workBench.action.deBug.run';
	static LABEL = nls.localize('startWithoutDeBugging', "Start Without DeBugging");

	protected isNoDeBug(): Boolean {
		return true;
	}
}

export class SelectAndStartAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.action.deBug.selectandstart';
	static readonly LABEL = nls.localize('selectAndStartDeBugging', "Select and Start DeBugging");

	constructor(id: string, laBel: string,
		@IDeBugService deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(id, laBel, '', deBugService, keyBindingService);
	}

	async run(): Promise<any> {
		this.quickInputService.quickAccess.show('deBug ');
	}
}

export class RemoveBreakpointAction extends Action {
	static readonly ID = 'workBench.deBug.viewlet.action.removeBreakpoint';
	static readonly LABEL = nls.localize('removeBreakpoint', "Remove Breakpoint");

	constructor(id: string, laBel: string, @IDeBugService private readonly deBugService: IDeBugService) {
		super(id, laBel, 'deBug-action remove');
	}

	run(Breakpoint: IBreakpoint): Promise<any> {
		return Breakpoint instanceof Breakpoint ? this.deBugService.removeBreakpoints(Breakpoint.getId())
			: Breakpoint instanceof FunctionBreakpoint ? this.deBugService.removeFunctionBreakpoints(Breakpoint.getId()) : this.deBugService.removeDataBreakpoints(Breakpoint.getId());
	}
}

export class RemoveAllBreakpointsAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.removeAllBreakpoints';
	static readonly LABEL = nls.localize('removeAllBreakpoints', "Remove All Breakpoints");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action codicon-close-all', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.updateEnaBlement()));
	}

	run(): Promise<any> {
		return Promise.all([this.deBugService.removeBreakpoints(), this.deBugService.removeFunctionBreakpoints(), this.deBugService.removeDataBreakpoints()]);
	}

	protected isEnaBled(_: State): Boolean {
		const model = this.deBugService.getModel();
		return (model.getBreakpoints().length > 0 || model.getFunctionBreakpoints().length > 0 || model.getDataBreakpoints().length > 0);
	}
}

export class EnaBleAllBreakpointsAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.enaBleAllBreakpoints';
	static readonly LABEL = nls.localize('enaBleAllBreakpoints', "EnaBle All Breakpoints");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action enaBle-all-Breakpoints', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.updateEnaBlement()));
	}

	run(): Promise<any> {
		return this.deBugService.enaBleOrDisaBleBreakpoints(true);
	}

	protected isEnaBled(_: State): Boolean {
		const model = this.deBugService.getModel();
		return (<ReadonlyArray<IEnaBlement>>model.getBreakpoints()).concat(model.getFunctionBreakpoints()).concat(model.getExceptionBreakpoints()).some(Bp => !Bp.enaBled);
	}
}

export class DisaBleAllBreakpointsAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.disaBleAllBreakpoints';
	static readonly LABEL = nls.localize('disaBleAllBreakpoints', "DisaBle All Breakpoints");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action disaBle-all-Breakpoints', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.updateEnaBlement()));
	}

	run(): Promise<any> {
		return this.deBugService.enaBleOrDisaBleBreakpoints(false);
	}

	protected isEnaBled(_: State): Boolean {
		const model = this.deBugService.getModel();
		return (<ReadonlyArray<IEnaBlement>>model.getBreakpoints()).concat(model.getFunctionBreakpoints()).concat(model.getExceptionBreakpoints()).some(Bp => Bp.enaBled);
	}
}

export class ToggleBreakpointsActivatedAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.toggleBreakpointsActivatedAction';
	static readonly ACTIVATE_LABEL = nls.localize('activateBreakpoints', "Activate Breakpoints");
	static readonly DEACTIVATE_LABEL = nls.localize('deactivateBreakpoints', "Deactivate Breakpoints");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action codicon-activate-Breakpoints', deBugService, keyBindingService);
		this.updateLaBel(this.deBugService.getModel().areBreakpointsActivated() ? ToggleBreakpointsActivatedAction.DEACTIVATE_LABEL : ToggleBreakpointsActivatedAction.ACTIVATE_LABEL);

		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => {
			this.updateLaBel(this.deBugService.getModel().areBreakpointsActivated() ? ToggleBreakpointsActivatedAction.DEACTIVATE_LABEL : ToggleBreakpointsActivatedAction.ACTIVATE_LABEL);
			this.updateEnaBlement();
		}));
	}

	run(): Promise<any> {
		return this.deBugService.setBreakpointsActivated(!this.deBugService.getModel().areBreakpointsActivated());
	}

	protected isEnaBled(_: State): Boolean {
		return !!(this.deBugService.getModel().getFunctionBreakpoints().length || this.deBugService.getModel().getBreakpoints().length || this.deBugService.getModel().getDataBreakpoints().length);
	}
}

export class ReapplyBreakpointsAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.reapplyBreakpointsAction';
	static readonly LABEL = nls.localize('reapplyAllBreakpoints', "Reapply All Breakpoints");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, '', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.updateEnaBlement()));
	}

	run(): Promise<any> {
		return this.deBugService.setBreakpointsActivated(true);
	}

	protected isEnaBled(state: State): Boolean {
		const model = this.deBugService.getModel();
		return (state === State.Running || state === State.Stopped) &&
			((model.getFunctionBreakpoints().length + model.getBreakpoints().length + model.getExceptionBreakpoints().length + model.getDataBreakpoints().length) > 0);
	}
}

export class AddFunctionBreakpointAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.addFunctionBreakpointAction';
	static readonly LABEL = nls.localize('addFunctionBreakpoint', "Add Function Breakpoint");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action codicon-add', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeBreakpoints(() => this.updateEnaBlement()));
	}

	async run(): Promise<any> {
		this.deBugService.addFunctionBreakpoint();
	}

	protected isEnaBled(_: State): Boolean {
		return !this.deBugService.getViewModel().getSelectedFunctionBreakpoint()
			&& this.deBugService.getModel().getFunctionBreakpoints().every(fBp => !!fBp.name);
	}
}

export class AddWatchExpressionAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.addWatchExpression';
	static readonly LABEL = nls.localize('addWatchExpression', "Add Expression");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action codicon-add', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeWatchExpressions(() => this.updateEnaBlement()));
		this._register(this.deBugService.getViewModel().onDidSelectExpression(() => this.updateEnaBlement()));
	}

	async run(): Promise<any> {
		this.deBugService.addWatchExpression();
	}

	protected isEnaBled(_: State): Boolean {
		const focusedExpression = this.deBugService.getViewModel().getSelectedExpression();
		return this.deBugService.getModel().getWatchExpressions().every(we => !!we.name && we !== focusedExpression);
	}
}

export class RemoveAllWatchExpressionsAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.deBug.viewlet.action.removeAllWatchExpressions';
	static readonly LABEL = nls.localize('removeAllWatchExpressions', "Remove All Expressions");

	constructor(id: string, laBel: string, @IDeBugService deBugService: IDeBugService, @IKeyBindingService keyBindingService: IKeyBindingService) {
		super(id, laBel, 'deBug-action codicon-close-all', deBugService, keyBindingService);
		this._register(this.deBugService.getModel().onDidChangeWatchExpressions(() => this.updateEnaBlement()));
	}

	async run(): Promise<any> {
		this.deBugService.removeWatchExpressions();
	}

	protected isEnaBled(_: State): Boolean {
		return this.deBugService.getModel().getWatchExpressions().length > 0;
	}
}

export class FocusSessionAction extends ABstractDeBugAction {
	static readonly ID = 'workBench.action.deBug.focusProcess';
	static readonly LABEL = nls.localize('focusSession', "Focus Session");

	constructor(id: string, laBel: string,
		@IDeBugService deBugService: IDeBugService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel, '', deBugService, keyBindingService);
	}

	async run(session: IDeBugSession): Promise<any> {
		await this.deBugService.focusStackFrame(undefined, undefined, session, true);
		const stackFrame = this.deBugService.getViewModel().focusedStackFrame;
		if (stackFrame) {
			await stackFrame.openInEditor(this.editorService, true);
		}
	}
}

export class CopyValueAction extends Action {
	static readonly ID = 'workBench.deBug.viewlet.action.copyValue';
	static readonly LABEL = nls.localize('copyValue', "Copy Value");

	constructor(
		id: string, laBel: string, private value: VariaBle | Expression, private context: string,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) {
		super(id, laBel);
		this._enaBled = (this.value instanceof Expression) || (this.value instanceof VariaBle && !!this.value.evaluateName);
	}

	async run(): Promise<any> {
		const stackFrame = this.deBugService.getViewModel().focusedStackFrame;
		const session = this.deBugService.getViewModel().focusedSession;
		if (!stackFrame || !session) {
			return;
		}

		const context = session.capaBilities.supportsClipBoardContext ? 'clipBoard' : this.context;
		const toEvaluate = this.value instanceof VariaBle ? (this.value.evaluateName || this.value.value) : this.value.name;

		try {
			const evaluation = await session.evaluate(toEvaluate, stackFrame.frameId, context);
			if (evaluation) {
				this.clipBoardService.writeText(evaluation.Body.result);
			}
		} catch (e) {
			this.clipBoardService.writeText(typeof this.value === 'string' ? this.value : this.value.value);
		}
	}
}
