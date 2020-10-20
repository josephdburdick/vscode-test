/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { ICommAndQuickPick, CommAndsHistory } from 'vs/plAtform/quickinput/browser/commAndsQuickAccess';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IMenuService, MenuId, MenuItemAction, SubmenuItemAction, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { timeout } from 'vs/bAse/common/Async';
import { DisposAbleStore, toDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { AbstrActEditorCommAndsQuickAccessProvider } from 'vs/editor/contrib/quickAccess/commAndsQuickAccess';
import { IEditor } from 'vs/editor/common/editorCommon';
import { LAnguAge } from 'vs/bAse/common/plAtform';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { DefAultQuickAccessFilterVAlue } from 'vs/plAtform/quickinput/common/quickAccess';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchQuickAccessConfigurAtion } from 'vs/workbench/browser/quickAccess';
import { stripCodicons } from 'vs/bAse/common/codicons';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';

export clAss CommAndsQuickAccessProvider extends AbstrActEditorCommAndsQuickAccessProvider {

	// If extensions Are not yet registered, we wAit for A little moment to give them
	// A chAnce to register so thAt the complete set of commAnds shows up As result
	// We do not wAnt to delAy functionAlity beyond thAt time though to keep the commAnds
	// functionAl.
	privAte reAdonly extensionRegistrAtionRAce = Promise.rAce([
		timeout(800),
		this.extensionService.whenInstAlledExtensionsRegistered()
	]);

	protected get ActiveTextEditorControl(): IEditor | undefined { return this.editorService.ActiveTextEditorControl; }

	get defAultFilterVAlue(): DefAultQuickAccessFilterVAlue | undefined {
		if (this.configurAtion.preserveInput) {
			return DefAultQuickAccessFilterVAlue.LAST;
		}

		return undefined;
	}

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@ICommAndService commAndService: ICommAndService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super({
			showAliAs: !LAnguAge.isDefAultVAriAnt(),
			noResultsPick: {
				lAbel: locAlize('noCommAndResults', "No mAtching commAnds"),
				commAndId: ''
			}
		}, instAntiAtionService, keybindingService, commAndService, telemetryService, notificAtionService);
	}

	privAte get configurAtion() {
		const commAndPAletteConfig = this.configurAtionService.getVAlue<IWorkbenchQuickAccessConfigurAtion>().workbench.commAndPAlette;

		return {
			preserveInput: commAndPAletteConfig.preserveInput
		};
	}

	protected Async getCommAndPicks(disposAbles: DisposAbleStore, token: CAncellAtionToken): Promise<ArrAy<ICommAndQuickPick>> {

		// wAit for extensions registrAtion or 800ms once
		AwAit this.extensionRegistrAtionRAce;

		if (token.isCAncellAtionRequested) {
			return [];
		}

		return [
			...this.getCodeEditorCommAndPicks(),
			...this.getGlobAlCommAndPicks(disposAbles)
		];
	}

	privAte getGlobAlCommAndPicks(disposAbles: DisposAbleStore): ICommAndQuickPick[] {
		const globAlCommAndPicks: ICommAndQuickPick[] = [];
		const scopedContextKeyService = this.editorService.ActiveEditorPAne?.scopedContextKeyService || this.editorGroupService.ActiveGroup.scopedContextKeyService;
		const globAlCommAndsMenu = this.menuService.creAteMenu(MenuId.CommAndPAlette, scopedContextKeyService);
		const globAlCommAndsMenuActions = globAlCommAndsMenu.getActions()
			.reduce((r, [, Actions]) => [...r, ...Actions], <ArrAy<MenuItemAction | SubmenuItemAction | string>>[])
			.filter(Action => Action instAnceof MenuItemAction) As MenuItemAction[];

		for (const Action of globAlCommAndsMenuActions) {

			// LAbel
			let lAbel = (typeof Action.item.title === 'string' ? Action.item.title : Action.item.title.vAlue) || Action.item.id;

			// CAtegory
			const cAtegory = typeof Action.item.cAtegory === 'string' ? Action.item.cAtegory : Action.item.cAtegory?.vAlue;
			if (cAtegory) {
				lAbel = locAlize('commAndWithCAtegory', "{0}: {1}", cAtegory, lAbel);
			}

			// AliAs
			const AliAsLAbel = typeof Action.item.title !== 'string' ? Action.item.title.originAl : undefined;
			const AliAsCAtegory = (cAtegory && Action.item.cAtegory && typeof Action.item.cAtegory !== 'string') ? Action.item.cAtegory.originAl : undefined;
			const commAndAliAs = (AliAsLAbel && cAtegory) ?
				AliAsCAtegory ? `${AliAsCAtegory}: ${AliAsLAbel}` : `${cAtegory}: ${AliAsLAbel}` :
				AliAsLAbel;

			globAlCommAndPicks.push({
				commAndId: Action.item.id,
				commAndAliAs,
				lAbel: stripCodicons(lAbel)
			});
		}

		// CleAnup
		globAlCommAndsMenu.dispose();
		disposAbles.Add(toDisposAble(() => dispose(globAlCommAndsMenuActions)));

		return globAlCommAndPicks;
	}
}

//#region Actions

export clAss ShowAllCommAndsAction extends Action2 {

	stAtic reAdonly ID = 'workbench.Action.showCommAnds';

	constructor() {
		super({
			id: ShowAllCommAndsAction.ID,
			title: { vAlue: locAlize('showTriggerActions', "Show All CommAnds"), originAl: 'Show All CommAnds' },
			f1: true,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				when: undefined,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_P,
				secondAry: [KeyCode.F1]
			}
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		Accessor.get(IQuickInputService).quickAccess.show(CommAndsQuickAccessProvider.PREFIX);
	}
}

export clAss CleArCommAndHistoryAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.cleArCommAndHistory',
			title: { vAlue: locAlize('cleArCommAndHistory', "CleAr CommAnd History"), originAl: 'CleAr CommAnd History' },
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const configurAtionService = Accessor.get(IConfigurAtionService);
		const storAgeService = Accessor.get(IStorAgeService);

		const commAndHistoryLength = CommAndsHistory.getConfiguredCommAndHistoryLength(configurAtionService);
		if (commAndHistoryLength > 0) {
			CommAndsHistory.cleArHistory(configurAtionService, storAgeService);
		}
	}
}

//#endregion
