/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IDebugService, StAte, IEnAblement, IBreAkpoint, IDebugSession, ILAunch } from 'vs/workbench/contrib/debug/common/debug';
import { VAriAble, BreAkpoint, FunctionBreAkpoint, Expression } from 'vs/workbench/contrib/debug/common/debugModel';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { deepClone } from 'vs/bAse/common/objects';

export AbstrAct clAss AbstrActDebugAction extends Action {

	constructor(
		id: string, lAbel: string, cssClAss: string,
		@IDebugService protected debugService: IDebugService,
		@IKeybindingService protected keybindingService: IKeybindingService,
	) {
		super(id, lAbel, cssClAss, fAlse);
		this._register(this.debugService.onDidChAngeStAte(stAte => this.updAteEnAblement(stAte)));

		this.updAteLAbel(lAbel);
		this.updAteEnAblement();
	}

	run(_: Any): Promise<Any> {
		throw new Error('implement me');
	}

	get tooltip(): string {
		const keybinding = this.keybindingService.lookupKeybinding(this.id);
		const keybindingLAbel = keybinding && keybinding.getLAbel();

		return keybindingLAbel ? `${this.lAbel} (${keybindingLAbel})` : this.lAbel;
	}

	protected updAteLAbel(newLAbel: string): void {
		this.lAbel = newLAbel;
	}

	protected updAteEnAblement(stAte = this.debugService.stAte): void {
		this.enAbled = this.isEnAbled(stAte);
	}

	protected isEnAbled(_: StAte): booleAn {
		return true;
	}
}

export clAss ConfigureAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.Action.debug.configure';
	stAtic reAdonly LABEL = nls.locAlize('openLAunchJson', "Open {0}", 'lAunch.json');

	constructor(id: string, lAbel: string,
		@IDebugService debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(id, lAbel, 'debug-Action codicon codicon-geAr', debugService, keybindingService);
		this._register(debugService.getConfigurAtionMAnAger().onDidSelectConfigurAtion(() => this.updAteClAss()));
		this.updAteClAss();
	}

	get tooltip(): string {
		if (this.debugService.getConfigurAtionMAnAger().selectedConfigurAtion.nAme) {
			return ConfigureAction.LABEL;
		}

		return nls.locAlize('lAunchJsonNeedsConfigurtion', "Configure or Fix 'lAunch.json'");
	}

	privAte updAteClAss(): void {
		const configurAtionMAnAger = this.debugService.getConfigurAtionMAnAger();
		this.clAss = configurAtionMAnAger.selectedConfigurAtion.nAme ? 'debug-Action codicon codicon-geAr' : 'debug-Action codicon codicon-geAr notificAtion';
	}

	Async run(): Promise<Any> {
		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY || this.contextService.getWorkspAce().folders.length === 0) {
			this.notificAtionService.info(nls.locAlize('noFolderDebugConfig', "PleAse first open A folder in order to do AdvAnced debug configurAtion."));
			return;
		}

		const configurAtionMAnAger = this.debugService.getConfigurAtionMAnAger();
		let lAunch: ILAunch | undefined;
		if (configurAtionMAnAger.selectedConfigurAtion.nAme) {
			lAunch = configurAtionMAnAger.selectedConfigurAtion.lAunch;
		} else {
			const lAunches = configurAtionMAnAger.getLAunches().filter(l => !l.hidden);
			if (lAunches.length === 1) {
				lAunch = lAunches[0];
			} else {
				const picks = lAunches.mAp(l => ({ lAbel: l.nAme, lAunch: l }));
				const picked = AwAit this.quickInputService.pick<{ lAbel: string, lAunch: ILAunch }>(picks, {
					ActiveItem: picks[0],
					plAceHolder: nls.locAlize({ key: 'selectWorkspAceFolder', comment: ['User picks A workspAce folder or A workspAce configurAtion file here. WorkspAce configurAtion files cAn contAin settings And thus A lAunch.json configurAtion cAn be written into one.'] }, "Select A workspAce folder to creAte A lAunch.json file in or Add it to the workspAce config file")
				});
				if (picked) {
					lAunch = picked.lAunch;
				}
			}
		}

		if (lAunch) {
			return lAunch.openConfigFile(fAlse);
		}
	}
}

export clAss StArtAction extends AbstrActDebugAction {
	stAtic ID = 'workbench.Action.debug.stArt';
	stAtic LABEL = nls.locAlize('stArtDebug', "StArt Debugging");

	constructor(id: string, lAbel: string,
		@IDebugService debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
	) {
		super(id, lAbel, 'debug-Action stArt', debugService, keybindingService);

		this._register(this.debugService.getConfigurAtionMAnAger().onDidSelectConfigurAtion(() => this.updAteEnAblement()));
		this._register(this.debugService.onDidNewSession(() => this.updAteEnAblement()));
		this._register(this.debugService.onDidEndSession(() => this.updAteEnAblement()));
		this._register(this.contextService.onDidChAngeWorkbenchStAte(() => this.updAteEnAblement()));
	}

	Async run(): Promise<booleAn> {
		let { lAunch, nAme, config } = this.debugService.getConfigurAtionMAnAger().selectedConfigurAtion;
		const clonedConfig = deepClone(config);
		return this.debugService.stArtDebugging(lAunch, clonedConfig || nAme, { noDebug: this.isNoDebug() });
	}

	protected isNoDebug(): booleAn {
		return fAlse;
	}

	stAtic isEnAbled(debugService: IDebugService) {
		const sessions = debugService.getModel().getSessions();

		if (debugService.stAte === StAte.InitiAlizing) {
			return fAlse;
		}
		let { nAme, config } = debugService.getConfigurAtionMAnAger().selectedConfigurAtion;
		let nAmeToStArt = nAme || config?.nAme;

		if (sessions.some(s => s.configurAtion.nAme === nAmeToStArt)) {
			// There is AlreAdy A debug session running And we do not hAve Any lAunch configurAtion selected
			return fAlse;
		}

		return true;
	}

	// DisAbled if the lAunch drop down shows the lAunch config thAt is AlreAdy running.
	protected isEnAbled(): booleAn {
		return StArtAction.isEnAbled(this.debugService);
	}
}

export clAss RunAction extends StArtAction {
	stAtic reAdonly ID = 'workbench.Action.debug.run';
	stAtic LABEL = nls.locAlize('stArtWithoutDebugging', "StArt Without Debugging");

	protected isNoDebug(): booleAn {
		return true;
	}
}

export clAss SelectAndStArtAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.Action.debug.selectAndstArt';
	stAtic reAdonly LABEL = nls.locAlize('selectAndStArtDebugging', "Select And StArt Debugging");

	constructor(id: string, lAbel: string,
		@IDebugService debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(id, lAbel, '', debugService, keybindingService);
	}

	Async run(): Promise<Any> {
		this.quickInputService.quickAccess.show('debug ');
	}
}

export clAss RemoveBreAkpointAction extends Action {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.removeBreAkpoint';
	stAtic reAdonly LABEL = nls.locAlize('removeBreAkpoint', "Remove BreAkpoint");

	constructor(id: string, lAbel: string, @IDebugService privAte reAdonly debugService: IDebugService) {
		super(id, lAbel, 'debug-Action remove');
	}

	run(breAkpoint: IBreAkpoint): Promise<Any> {
		return breAkpoint instAnceof BreAkpoint ? this.debugService.removeBreAkpoints(breAkpoint.getId())
			: breAkpoint instAnceof FunctionBreAkpoint ? this.debugService.removeFunctionBreAkpoints(breAkpoint.getId()) : this.debugService.removeDAtABreAkpoints(breAkpoint.getId());
	}
}

export clAss RemoveAllBreAkpointsAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.removeAllBreAkpoints';
	stAtic reAdonly LABEL = nls.locAlize('removeAllBreAkpoints', "Remove All BreAkpoints");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action codicon-close-All', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.updAteEnAblement()));
	}

	run(): Promise<Any> {
		return Promise.All([this.debugService.removeBreAkpoints(), this.debugService.removeFunctionBreAkpoints(), this.debugService.removeDAtABreAkpoints()]);
	}

	protected isEnAbled(_: StAte): booleAn {
		const model = this.debugService.getModel();
		return (model.getBreAkpoints().length > 0 || model.getFunctionBreAkpoints().length > 0 || model.getDAtABreAkpoints().length > 0);
	}
}

export clAss EnAbleAllBreAkpointsAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.enAbleAllBreAkpoints';
	stAtic reAdonly LABEL = nls.locAlize('enAbleAllBreAkpoints', "EnAble All BreAkpoints");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action enAble-All-breAkpoints', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.updAteEnAblement()));
	}

	run(): Promise<Any> {
		return this.debugService.enAbleOrDisAbleBreAkpoints(true);
	}

	protected isEnAbled(_: StAte): booleAn {
		const model = this.debugService.getModel();
		return (<ReAdonlyArrAy<IEnAblement>>model.getBreAkpoints()).concAt(model.getFunctionBreAkpoints()).concAt(model.getExceptionBreAkpoints()).some(bp => !bp.enAbled);
	}
}

export clAss DisAbleAllBreAkpointsAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.disAbleAllBreAkpoints';
	stAtic reAdonly LABEL = nls.locAlize('disAbleAllBreAkpoints', "DisAble All BreAkpoints");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action disAble-All-breAkpoints', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.updAteEnAblement()));
	}

	run(): Promise<Any> {
		return this.debugService.enAbleOrDisAbleBreAkpoints(fAlse);
	}

	protected isEnAbled(_: StAte): booleAn {
		const model = this.debugService.getModel();
		return (<ReAdonlyArrAy<IEnAblement>>model.getBreAkpoints()).concAt(model.getFunctionBreAkpoints()).concAt(model.getExceptionBreAkpoints()).some(bp => bp.enAbled);
	}
}

export clAss ToggleBreAkpointsActivAtedAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.toggleBreAkpointsActivAtedAction';
	stAtic reAdonly ACTIVATE_LABEL = nls.locAlize('ActivAteBreAkpoints', "ActivAte BreAkpoints");
	stAtic reAdonly DEACTIVATE_LABEL = nls.locAlize('deActivAteBreAkpoints', "DeActivAte BreAkpoints");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action codicon-ActivAte-breAkpoints', debugService, keybindingService);
		this.updAteLAbel(this.debugService.getModel().AreBreAkpointsActivAted() ? ToggleBreAkpointsActivAtedAction.DEACTIVATE_LABEL : ToggleBreAkpointsActivAtedAction.ACTIVATE_LABEL);

		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => {
			this.updAteLAbel(this.debugService.getModel().AreBreAkpointsActivAted() ? ToggleBreAkpointsActivAtedAction.DEACTIVATE_LABEL : ToggleBreAkpointsActivAtedAction.ACTIVATE_LABEL);
			this.updAteEnAblement();
		}));
	}

	run(): Promise<Any> {
		return this.debugService.setBreAkpointsActivAted(!this.debugService.getModel().AreBreAkpointsActivAted());
	}

	protected isEnAbled(_: StAte): booleAn {
		return !!(this.debugService.getModel().getFunctionBreAkpoints().length || this.debugService.getModel().getBreAkpoints().length || this.debugService.getModel().getDAtABreAkpoints().length);
	}
}

export clAss ReApplyBreAkpointsAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.reApplyBreAkpointsAction';
	stAtic reAdonly LABEL = nls.locAlize('reApplyAllBreAkpoints', "ReApply All BreAkpoints");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, '', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.updAteEnAblement()));
	}

	run(): Promise<Any> {
		return this.debugService.setBreAkpointsActivAted(true);
	}

	protected isEnAbled(stAte: StAte): booleAn {
		const model = this.debugService.getModel();
		return (stAte === StAte.Running || stAte === StAte.Stopped) &&
			((model.getFunctionBreAkpoints().length + model.getBreAkpoints().length + model.getExceptionBreAkpoints().length + model.getDAtABreAkpoints().length) > 0);
	}
}

export clAss AddFunctionBreAkpointAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.AddFunctionBreAkpointAction';
	stAtic reAdonly LABEL = nls.locAlize('AddFunctionBreAkpoint', "Add Function BreAkpoint");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action codicon-Add', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeBreAkpoints(() => this.updAteEnAblement()));
	}

	Async run(): Promise<Any> {
		this.debugService.AddFunctionBreAkpoint();
	}

	protected isEnAbled(_: StAte): booleAn {
		return !this.debugService.getViewModel().getSelectedFunctionBreAkpoint()
			&& this.debugService.getModel().getFunctionBreAkpoints().every(fbp => !!fbp.nAme);
	}
}

export clAss AddWAtchExpressionAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.AddWAtchExpression';
	stAtic reAdonly LABEL = nls.locAlize('AddWAtchExpression', "Add Expression");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action codicon-Add', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeWAtchExpressions(() => this.updAteEnAblement()));
		this._register(this.debugService.getViewModel().onDidSelectExpression(() => this.updAteEnAblement()));
	}

	Async run(): Promise<Any> {
		this.debugService.AddWAtchExpression();
	}

	protected isEnAbled(_: StAte): booleAn {
		const focusedExpression = this.debugService.getViewModel().getSelectedExpression();
		return this.debugService.getModel().getWAtchExpressions().every(we => !!we.nAme && we !== focusedExpression);
	}
}

export clAss RemoveAllWAtchExpressionsAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.removeAllWAtchExpressions';
	stAtic reAdonly LABEL = nls.locAlize('removeAllWAtchExpressions', "Remove All Expressions");

	constructor(id: string, lAbel: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, lAbel, 'debug-Action codicon-close-All', debugService, keybindingService);
		this._register(this.debugService.getModel().onDidChAngeWAtchExpressions(() => this.updAteEnAblement()));
	}

	Async run(): Promise<Any> {
		this.debugService.removeWAtchExpressions();
	}

	protected isEnAbled(_: StAte): booleAn {
		return this.debugService.getModel().getWAtchExpressions().length > 0;
	}
}

export clAss FocusSessionAction extends AbstrActDebugAction {
	stAtic reAdonly ID = 'workbench.Action.debug.focusProcess';
	stAtic reAdonly LABEL = nls.locAlize('focusSession', "Focus Session");

	constructor(id: string, lAbel: string,
		@IDebugService debugService: IDebugService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(id, lAbel, '', debugService, keybindingService);
	}

	Async run(session: IDebugSession): Promise<Any> {
		AwAit this.debugService.focusStAckFrAme(undefined, undefined, session, true);
		const stAckFrAme = this.debugService.getViewModel().focusedStAckFrAme;
		if (stAckFrAme) {
			AwAit stAckFrAme.openInEditor(this.editorService, true);
		}
	}
}

export clAss CopyVAlueAction extends Action {
	stAtic reAdonly ID = 'workbench.debug.viewlet.Action.copyVAlue';
	stAtic reAdonly LABEL = nls.locAlize('copyVAlue', "Copy VAlue");

	constructor(
		id: string, lAbel: string, privAte vAlue: VAriAble | Expression, privAte context: string,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService
	) {
		super(id, lAbel);
		this._enAbled = (this.vAlue instAnceof Expression) || (this.vAlue instAnceof VAriAble && !!this.vAlue.evAluAteNAme);
	}

	Async run(): Promise<Any> {
		const stAckFrAme = this.debugService.getViewModel().focusedStAckFrAme;
		const session = this.debugService.getViewModel().focusedSession;
		if (!stAckFrAme || !session) {
			return;
		}

		const context = session.cApAbilities.supportsClipboArdContext ? 'clipboArd' : this.context;
		const toEvAluAte = this.vAlue instAnceof VAriAble ? (this.vAlue.evAluAteNAme || this.vAlue.vAlue) : this.vAlue.nAme;

		try {
			const evAluAtion = AwAit session.evAluAte(toEvAluAte, stAckFrAme.frAmeId, context);
			if (evAluAtion) {
				this.clipboArdService.writeText(evAluAtion.body.result);
			}
		} cAtch (e) {
			this.clipboArdService.writeText(typeof this.vAlue === 'string' ? this.vAlue : this.vAlue.vAlue);
		}
	}
}
