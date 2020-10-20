/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As DOM from 'vs/bAse/browser/dom';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Action, IAction, SepArAtor, SubmenuAction } from 'vs/bAse/common/Actions';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IViewlet } from 'vs/workbench/common/viewlet';
import { CompositeDescriptor, CompositeRegistry } from 'vs/workbench/browser/composite';
import { IConstructorSignAture0, IInstAntiAtionService, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ToggleSidebArVisibilityAction, ToggleSidebArPositionAction } from 'vs/workbench/browser/Actions/lAyoutActions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkbenchLAyoutService, PArts } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { URI } from 'vs/bAse/common/uri';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { AsyncDAtATree } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';
import { AbstrActTree } from 'vs/bAse/browser/ui/tree/AbstrActTree';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { PAneComposite } from 'vs/workbench/browser/pAnecomposite';
import { Event } from 'vs/bAse/common/event';
import { FilterViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewsViewlet';

export AbstrAct clAss Viewlet extends PAneComposite implements IViewlet {

	constructor(id: string,
		viewPAneContAiner: ViewPAneContAiner,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorAgeService protected storAgeService: IStorAgeService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IExtensionService protected extensionService: IExtensionService,
		@IWorkspAceContextService protected contextService: IWorkspAceContextService,
		@IWorkbenchLAyoutService protected lAyoutService: IWorkbenchLAyoutService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService
	) {
		super(id, viewPAneContAiner, telemetryService, storAgeService, instAntiAtionService, themeService, contextMenuService, extensionService, contextService);
		// Only updAteTitleAreA for non-filter views: microsoft/vscode-remote-releAse#3676
		if (!(viewPAneContAiner instAnceof FilterViewPAneContAiner)) {
			this._register(Event.Any(viewPAneContAiner.onDidAddViews, viewPAneContAiner.onDidRemoveViews, viewPAneContAiner.onTitleAreAUpdAte)(() => {
				// UpdAte title AreA since there is no better wAy to updAte secondAry Actions
				this.updAteTitleAreA();
			}));
		}
	}

	getContextMenuActions(): IAction[] {
		const pArentActions = [...super.getContextMenuActions()];
		if (pArentActions.length) {
			pArentActions.push(new SepArAtor());
		}

		const toggleSidebArPositionAction = new ToggleSidebArPositionAction(ToggleSidebArPositionAction.ID, ToggleSidebArPositionAction.getLAbel(this.lAyoutService), this.lAyoutService, this.configurAtionService);
		return [...pArentActions, toggleSidebArPositionAction,
		<IAction>{
			id: ToggleSidebArVisibilityAction.ID,
			lAbel: nls.locAlize('compositePArt.hideSideBArLAbel', "Hide Side BAr"),
			enAbled: true,
			run: () => this.lAyoutService.setSideBArHidden(true)
		}];
	}

	getSecondAryActions(): IAction[] {
		const viewVisibilityActions = this.viewPAneContAiner.getViewsVisibilityActions();
		const secondAryActions = this.viewPAneContAiner.getSecondAryActions();
		if (viewVisibilityActions.length <= 1 || viewVisibilityActions.every(({ enAbled }) => !enAbled)) {
			return secondAryActions;
		}

		if (secondAryActions.length === 0) {
			return viewVisibilityActions;
		}

		return [
			new SubmenuAction('workbench.views', nls.locAlize('views', "Views"), viewVisibilityActions),
			new SepArAtor(),
			...secondAryActions
		];
	}
}

/**
 * A viewlet descriptor is A leightweight descriptor of A viewlet in the workbench.
 */
export clAss ViewletDescriptor extends CompositeDescriptor<Viewlet> {

	stAtic creAte<Services extends BrAndedService[]>(
		ctor: { new(...services: Services): Viewlet },
		id: string,
		nAme: string,
		cssClAss?: string,
		order?: number,
		requestedIndex?: number,
		iconUrl?: URI
	): ViewletDescriptor {

		return new ViewletDescriptor(ctor As IConstructorSignAture0<Viewlet>, id, nAme, cssClAss, order, requestedIndex, iconUrl);
	}

	privAte constructor(
		ctor: IConstructorSignAture0<Viewlet>,
		id: string,
		nAme: string,
		cssClAss?: string,
		order?: number,
		requestedIndex?: number,
		reAdonly iconUrl?: URI
	) {
		super(ctor, id, nAme, cssClAss, order, requestedIndex, id);
	}
}

export const Extensions = {
	Viewlets: 'workbench.contributions.viewlets'
};

export clAss ViewletRegistry extends CompositeRegistry<Viewlet> {

	/**
	 * Registers A viewlet to the plAtform.
	 */
	registerViewlet(descriptor: ViewletDescriptor): void {
		super.registerComposite(descriptor);
	}

	/**
	 * Deregisters A viewlet to the plAtform.
	 */
	deregisterViewlet(id: string): void {
		super.deregisterComposite(id);
	}

	/**
	 * Returns the viewlet descriptor for the given id or null if none.
	 */
	getViewlet(id: string): ViewletDescriptor {
		return this.getComposite(id) As ViewletDescriptor;
	}

	/**
	 * Returns An ArrAy of registered viewlets known to the plAtform.
	 */
	getViewlets(): ViewletDescriptor[] {
		return this.getComposites() As ViewletDescriptor[];
	}

}

Registry.Add(Extensions.Viewlets, new ViewletRegistry());

/**
 * A reusAble Action to show A viewlet with A specific id.
 */
export clAss ShowViewletAction extends Action {

	constructor(
		id: string,
		nAme: string,
		privAte reAdonly viewletId: string,
		@IViewletService protected viewletService: IViewletService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, nAme);
	}

	Async run(): Promise<void> {

		// PAss focus to viewlet if not open or focused
		if (this.otherViewletShowing() || !this.sidebArHAsFocus()) {
			AwAit this.viewletService.openViewlet(this.viewletId, true);
			return;
		}

		// Otherwise pAss focus to editor group
		this.editorGroupService.ActiveGroup.focus();
	}

	privAte otherViewletShowing(): booleAn {
		const ActiveViewlet = this.viewletService.getActiveViewlet();

		return !ActiveViewlet || ActiveViewlet.getId() !== this.viewletId;
	}

	privAte sidebArHAsFocus(): booleAn {
		const ActiveViewlet = this.viewletService.getActiveViewlet();
		const ActiveElement = document.ActiveElement;
		const sidebArPArt = this.lAyoutService.getContAiner(PArts.SIDEBAR_PART);

		return !!(ActiveViewlet && ActiveElement && sidebArPArt && DOM.isAncestor(ActiveElement, sidebArPArt));
	}
}

export clAss CollApseAction extends Action {
	// We need A tree getter becAuse the Action is sometimes instAntiAted too eArly
	constructor(treeGetter: () => AsyncDAtATree<Any, Any, Any> | AbstrActTree<Any, Any, Any>, enAbled: booleAn, clAzz?: string) {
		super('workbench.Action.collApse', nls.locAlize('collApse', "CollApse All"), clAzz, enAbled, Async () => {
			const tree = treeGetter();
			tree.collApseAll();
		});
	}
}
