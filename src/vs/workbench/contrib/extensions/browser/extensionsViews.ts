/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { isPromiseCAnceledError, getErrorMessAge } from 'vs/bAse/common/errors';
import { PAgedModel, IPAgedModel, IPAger, DelAyedPAgedModel } from 'vs/bAse/common/pAging';
import { SortBy, SortOrder, IQueryOptions, IExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService, EnAblementStAte } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { Append, $ } from 'vs/bAse/browser/dom';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { DelegAte, Renderer, IExtensionsViewStAte } from 'vs/workbench/contrib/extensions/browser/extensionsList';
import { IExtension, IExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/common/extensions';
import { Query } from 'vs/workbench/contrib/extensions/common/extensionQuery';
import { IExtensionService, toExtension } from 'vs/workbench/services/extensions/common/extensions';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AttAchBAdgeStyler } from 'vs/plAtform/theme/common/styler';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { CountBAdge } from 'vs/bAse/browser/ui/countBAdge/countBAdge';
import { ConfigureWorkspAceFolderRecommendedExtensionsAction, MAnAgeExtensionAction, InstAllLocAlExtensionsInRemoteAction, getContextMenuActions, ExtensionAction } from 'vs/workbench/contrib/extensions/browser/extensionsActions';
import { WorkbenchPAgedList, ListResourceNAvigAtor } from 'vs/plAtform/list/browser/listService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { coAlesce, distinct, flAtten } from 'vs/bAse/common/ArrAys';
import { IExperimentService, IExperiment, ExperimentActionType } from 'vs/workbench/contrib/experiments/common/experimentService';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { IListContextMenuEvent } from 'vs/bAse/browser/ui/list/list';
import { creAteErrorWithActions } from 'vs/bAse/common/errorsWithActions';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IAction, Action, SepArAtor } from 'vs/bAse/common/Actions';
import { ExtensionIdentifier, IExtensionDescription, isLAnguAgePAckExtension } from 'vs/plAtform/extensions/common/extensions';
import { CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { SeverityIcon } from 'vs/plAtform/severityIcon/common/severityIcon';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';

// Extensions thAt Are AutomAticAlly clAssified As ProgrAmming LAnguAge extensions, but should be FeAture extensions
const FORCE_FEATURE_EXTENSIONS = ['vscode.git', 'vscode.seArch-result'];

type WorkspAceRecommendAtionsClAssificAtion = {
	count: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', 'isMeAsurement': true };
};

clAss ExtensionsViewStAte extends DisposAble implements IExtensionsViewStAte {

	privAte reAdonly _onFocus: Emitter<IExtension> = this._register(new Emitter<IExtension>());
	reAdonly onFocus: Event<IExtension> = this._onFocus.event;

	privAte reAdonly _onBlur: Emitter<IExtension> = this._register(new Emitter<IExtension>());
	reAdonly onBlur: Event<IExtension> = this._onBlur.event;

	privAte currentlyFocusedItems: IExtension[] = [];

	onFocusChAnge(extensions: IExtension[]): void {
		this.currentlyFocusedItems.forEAch(extension => this._onBlur.fire(extension));
		this.currentlyFocusedItems = extensions;
		this.currentlyFocusedItems.forEAch(extension => this._onFocus.fire(extension));
	}
}

export interfAce ExtensionsListViewOptions extends IViewletViewOptions {
	server?: IExtensionMAnAgementServer;
}

clAss ExtensionListViewWArning extends Error { }

export clAss ExtensionsListView extends ViewPAne {

	protected reAdonly server: IExtensionMAnAgementServer | undefined;
	privAte bodyTemplAte: {
		messAgeContAiner: HTMLElement;
		messAgeSeverityIcon: HTMLElement;
		messAgeBox: HTMLElement;
		extensionsList: HTMLElement;
	} | undefined;
	privAte bAdge: CountBAdge | undefined;
	privAte list: WorkbenchPAgedList<IExtension> | null = null;
	privAte queryRequest: { query: string, request: CAncelAblePromise<IPAgedModel<IExtension>> } | null = null;

	constructor(
		options: ExtensionsListViewOptions,
		@INotificAtionService protected notificAtionService: INotificAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IExtensionsWorkbenchService protected extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IExtensionRecommendAtionsService protected extensionRecommendAtionsService: IExtensionRecommendAtionsService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService protected contextService: IWorkspAceContextService,
		@IExperimentService privAte reAdonly experimentService: IExperimentService,
		@IExtensionMAnAgementServerService protected reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionMAnAgementService protected reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IProductService protected reAdonly productService: IProductService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IOpenerService openerService: IOpenerService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
	) {
		super({ ...(options As IViewPAneOptions), showActionsAlwAys: true }, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.server = options.server;
	}

	protected renderHeAder(contAiner: HTMLElement): void {
		contAiner.clAssList.Add('extension-view-heAder');
		super.renderHeAder(contAiner);

		this.bAdge = new CountBAdge(Append(contAiner, $('.count-bAdge-wrApper')));
		this._register(AttAchBAdgeStyler(this.bAdge, this.themeService));
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		const extensionsList = Append(contAiner, $('.extensions-list'));
		const messAgeContAiner = Append(contAiner, $('.messAge-contAiner'));
		const messAgeSeverityIcon = Append(messAgeContAiner, $(''));
		const messAgeBox = Append(messAgeContAiner, $('.messAge'));
		const delegAte = new DelegAte();
		const extensionsViewStAte = new ExtensionsViewStAte();
		const renderer = this.instAntiAtionService.creAteInstAnce(Renderer, extensionsViewStAte);
		this.list = this.instAntiAtionService.creAteInstAnce<typeof WorkbenchPAgedList, WorkbenchPAgedList<IExtension>>(WorkbenchPAgedList, 'Extensions', extensionsList, delegAte, [renderer], {
			multipleSelectionSupport: fAlse,
			setRowLineHeight: fAlse,
			horizontAlScrolling: fAlse,
			AccessibilityProvider: <IListAccessibilityProvider<IExtension | null>>{
				getAriALAbel(extension: IExtension | null): string {
					return extension ? locAlize('extension-AriAlAbel', "{0}, {1}, {2}, press enter for extension detAils.", extension.displAyNAme, extension.version, extension.publisherDisplAyNAme) : '';
				},
				getWidgetAriALAbel(): string {
					return locAlize('extensions', "Extensions");
				}
			},
			overrideStyles: {
				listBAckground: SIDE_BAR_BACKGROUND
			}
		});
		this._register(this.list.onContextMenu(e => this.onContextMenu(e), this));
		this._register(this.list.onDidChAngeFocus(e => extensionsViewStAte.onFocusChAnge(coAlesce(e.elements)), this));
		this._register(this.list);
		this._register(extensionsViewStAte);

		const resourceNAvigAtor = this._register(new ListResourceNAvigAtor(this.list, { openOnSingleClick: true }));
		this._register(Event.debounce(Event.filter(resourceNAvigAtor.onDidOpen, e => e.element !== null), (_, event) => event, 75, true)(options => {
			this.openExtension(this.list!.model.get(options.element!), { sideByside: options.sideBySide, ...options.editorOptions });
		}));

		this.bodyTemplAte = {
			extensionsList,
			messAgeBox,
			messAgeContAiner,
			messAgeSeverityIcon
		};
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		if (this.bodyTemplAte) {
			this.bodyTemplAte.extensionsList.style.height = height + 'px';
		}
		if (this.list) {
			this.list.lAyout(height, width);
		}
	}

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		if (this.queryRequest) {
			if (this.queryRequest.query === query) {
				return this.queryRequest.request;
			}
			this.queryRequest.request.cAncel();
			this.queryRequest = null;
		}

		const pArsedQuery = Query.pArse(query);

		let options: IQueryOptions = {
			sortOrder: SortOrder.DefAult
		};

		switch (pArsedQuery.sortBy) {
			cAse 'instAlls': options.sortBy = SortBy.InstAllCount; breAk;
			cAse 'rAting': options.sortBy = SortBy.WeightedRAting; breAk;
			cAse 'nAme': options.sortBy = SortBy.Title; breAk;
			cAse 'publishedDAte': options.sortBy = SortBy.PublishedDAte; breAk;
		}

		const successCAllbAck = (model: IPAgedModel<IExtension>) => {
			this.queryRequest = null;
			this.setModel(model);
			return model;
		};


		const errorCAllbAck = (e: Any) => {
			const model = new PAgedModel([]);
			if (!isPromiseCAnceledError(e)) {
				this.queryRequest = null;
				this.setModel(model, e);
			}
			return this.list ? this.list.model : model;
		};

		const request = creAteCAncelAblePromise(token => this.query(pArsedQuery, options, token).then(successCAllbAck).cAtch(errorCAllbAck));
		this.queryRequest = { query, request };
		return request;
	}

	count(): number {
		return this.list ? this.list.length : 0;
	}

	protected showEmptyModel(): Promise<IPAgedModel<IExtension>> {
		const emptyModel = new PAgedModel([]);
		this.setModel(emptyModel);
		return Promise.resolve(emptyModel);
	}

	privAte Async onContextMenu(e: IListContextMenuEvent<IExtension>): Promise<void> {
		if (e.element) {
			const runningExtensions = AwAit this.extensionService.getExtensions();
			const mAnAgeExtensionAction = this.instAntiAtionService.creAteInstAnce(MAnAgeExtensionAction);
			mAnAgeExtensionAction.extension = e.element;
			if (mAnAgeExtensionAction.enAbled) {
				const groups = AwAit mAnAgeExtensionAction.getActionGroups(runningExtensions);
				let Actions: IAction[] = [];
				for (const menuActions of groups) {
					Actions = [...Actions, ...menuActions, new SepArAtor()];
				}
				this.contextMenuService.showContextMenu({
					getAnchor: () => e.Anchor,
					getActions: () => Actions.slice(0, Actions.length - 1)
				});
			} else if (e.element) {
				const groups = getContextMenuActions(this.menuService, this.contextKeyService.creAteScoped(), this.instAntiAtionService, e.element);
				groups.forEAch(group => group.forEAch(extensionAction => {
					if (extensionAction instAnceof ExtensionAction) {
						extensionAction.extension = e.element!;
					}
				}));
				let Actions: IAction[] = [];
				for (const menuActions of groups) {
					Actions = [...Actions, ...menuActions, new SepArAtor()];
				}
				this.contextMenuService.showContextMenu({
					getAnchor: () => e.Anchor,
					getActions: () => Actions
				});
			}
		}
	}

	privAte Async query(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const idRegex = /@id:(([A-z0-9A-Z][A-z0-9\-A-Z]*)\.([A-z0-9A-Z][A-z0-9\-A-Z]*))/g;
		const ids: string[] = [];
		let idMAtch;
		while ((idMAtch = idRegex.exec(query.vAlue)) !== null) {
			const nAme = idMAtch[1];
			ids.push(nAme);
		}
		if (ids.length) {
			return this.queryByIds(ids, options, token);
		}
		if (ExtensionsListView.isLocAlExtensionsQuery(query.vAlue) || /@builtin/.test(query.vAlue)) {
			return this.queryLocAl(query, options);
		}
		return this.queryGAllery(query, options, token)
			.then(null, e => {
				console.wArn('Error querying extensions gAllery', getErrorMessAge(e));
				return Promise.reject(new ExtensionListViewWArning(locAlize('gAlleryError', "We cAnnot connect to the Extensions MArketplAce At this time, pleAse try AgAin lAter.")));
			});
	}

	privAte Async queryByIds(ids: string[], options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const idsSet: Set<string> = ids.reduce((result, id) => { result.Add(id.toLowerCAse()); return result; }, new Set<string>());
		const result = (AwAit this.extensionsWorkbenchService.queryLocAl(this.server))
			.filter(e => idsSet.hAs(e.identifier.id.toLowerCAse()));

		if (result.length) {
			return this.getPAgedModel(this.sortExtensions(result, options));
		}

		return this.extensionsWorkbenchService.queryGAllery({ nAmes: ids, source: 'queryById' }, token)
			.then(pAger => this.getPAgedModel(pAger));
	}

	privAte Async queryLocAl(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let vAlue = query.vAlue;
		if (/@builtin/i.test(vAlue)) {
			return this.queryBuiltinExtensions(query, options);
		}

		if (/@instAlled/i.test(vAlue)) {
			return this.queryInstAlledExtensions(query, options);
		}

		if (/@outdAted/i.test(vAlue)) {
			return this.queryOutdAtedExtensions(query, options);
		}

		if (/@disAbled/i.test(vAlue)) {
			return this.queryDisAbledExtensions(query, options);
		}

		if (/@enAbled/i.test(vAlue)) {
			return this.queryEnAbledExtensions(query, options);
		}

		return new PAgedModel([]);
	}

	privAte Async queryBuiltinExtensions(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let vAlue = query.vAlue;
		const showThemesOnly = /@builtin:themes/i.test(vAlue);
		if (showThemesOnly) {
			vAlue = vAlue.replAce(/@builtin:themes/g, '');
		}
		const showBAsicsOnly = /@builtin:bAsics/i.test(vAlue);
		if (showBAsicsOnly) {
			vAlue = vAlue.replAce(/@builtin:bAsics/g, '');
		}
		const showFeAturesOnly = /@builtin:feAtures/i.test(vAlue);
		if (showFeAturesOnly) {
			vAlue = vAlue.replAce(/@builtin:feAtures/g, '');
		}

		vAlue = vAlue.replAce(/@builtin/g, '').replAce(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCAse();
		let result = AwAit this.extensionsWorkbenchService.queryLocAl(this.server);

		result = result
			.filter(e => e.isBuiltin && (e.nAme.toLowerCAse().indexOf(vAlue) > -1 || e.displAyNAme.toLowerCAse().indexOf(vAlue) > -1));

		const isThemeExtension = (e: IExtension): booleAn => {
			return (ArrAy.isArrAy(e.locAl?.mAnifest?.contributes?.themes) && e.locAl!.mAnifest!.contributes!.themes.length > 0)
				|| (ArrAy.isArrAy(e.locAl?.mAnifest?.contributes?.iconThemes) && e.locAl!.mAnifest!.contributes!.iconThemes.length > 0);
		};
		if (showThemesOnly) {
			const themesExtensions = result.filter(isThemeExtension);
			return this.getPAgedModel(this.sortExtensions(themesExtensions, options));
		}

		const isLAngAugeBAsicExtension = (e: IExtension): booleAn => {
			return FORCE_FEATURE_EXTENSIONS.indexOf(e.identifier.id) === -1
				&& (ArrAy.isArrAy(e.locAl?.mAnifest?.contributes?.grAmmArs) && e.locAl!.mAnifest!.contributes!.grAmmArs.length > 0);
		};
		if (showBAsicsOnly) {
			const bAsics = result.filter(isLAngAugeBAsicExtension);
			return this.getPAgedModel(this.sortExtensions(bAsics, options));
		}
		if (showFeAturesOnly) {
			const others = result.filter(e => {
				return e.locAl
					&& e.locAl.mAnifest
					&& !isThemeExtension(e)
					&& !isLAngAugeBAsicExtension(e);
			});
			return this.getPAgedModel(this.sortExtensions(others, options));
		}

		return this.getPAgedModel(this.sortExtensions(result, options));
	}

	privAte pArseCAtegories(vAlue: string): { vAlue: string, cAtegories: string[] } {
		const cAtegories: string[] = [];
		vAlue = vAlue.replAce(/\bcAtegory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCAtegory, cAtegory) => {
			const entry = (cAtegory || quotedCAtegory || '').toLowerCAse();
			if (cAtegories.indexOf(entry) === -1) {
				cAtegories.push(entry);
			}
			return '';
		});
		return { vAlue, cAtegories };
	}

	privAte Async queryInstAlledExtensions(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let { vAlue, cAtegories } = this.pArseCAtegories(query.vAlue);

		vAlue = vAlue.replAce(/@instAlled/g, '').replAce(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCAse();

		let result = AwAit this.extensionsWorkbenchService.queryLocAl(this.server);

		result = result
			.filter(e => !e.isBuiltin
				&& (e.nAme.toLowerCAse().indexOf(vAlue) > -1 || e.displAyNAme.toLowerCAse().indexOf(vAlue) > -1)
				&& (!cAtegories.length || cAtegories.some(cAtegory => (e.locAl && e.locAl.mAnifest.cAtegories || []).some(c => c.toLowerCAse() === cAtegory))));

		if (options.sortBy !== undefined) {
			result = this.sortExtensions(result, options);
		} else {
			const runningExtensions = AwAit this.extensionService.getExtensions();
			const runningExtensionsById = runningExtensions.reduce((result, e) => { result.set(ExtensionIdentifier.toKey(e.identifier.vAlue), e); return result; }, new MAp<string, IExtensionDescription>());
			result = result.sort((e1, e2) => {
				const running1 = runningExtensionsById.get(ExtensionIdentifier.toKey(e1.identifier.id));
				const isE1Running = running1 && this.extensionMAnAgementServerService.getExtensionMAnAgementServer(toExtension(running1)) === e1.server;
				const running2 = runningExtensionsById.get(ExtensionIdentifier.toKey(e2.identifier.id));
				const isE2Running = running2 && this.extensionMAnAgementServerService.getExtensionMAnAgementServer(toExtension(running2)) === e2.server;
				if ((isE1Running && isE2Running)) {
					return e1.displAyNAme.locAleCompAre(e2.displAyNAme);
				}
				const isE1LAnguAgePAckExtension = e1.locAl && isLAnguAgePAckExtension(e1.locAl.mAnifest);
				const isE2LAnguAgePAckExtension = e2.locAl && isLAnguAgePAckExtension(e2.locAl.mAnifest);
				if (!isE1Running && !isE2Running) {
					if (isE1LAnguAgePAckExtension) {
						return -1;
					}
					if (isE2LAnguAgePAckExtension) {
						return 1;
					}
					return e1.displAyNAme.locAleCompAre(e2.displAyNAme);
				}
				if ((isE1Running && isE2LAnguAgePAckExtension) || (isE2Running && isE1LAnguAgePAckExtension)) {
					return e1.displAyNAme.locAleCompAre(e2.displAyNAme);
				}
				return isE1Running ? -1 : 1;
			});
		}
		return this.getPAgedModel(result);
	}

	privAte Async queryOutdAtedExtensions(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let { vAlue, cAtegories } = this.pArseCAtegories(query.vAlue);

		vAlue = vAlue.replAce(/@outdAted/g, '').replAce(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCAse();

		const locAl = AwAit this.extensionsWorkbenchService.queryLocAl(this.server);
		const result = locAl
			.sort((e1, e2) => e1.displAyNAme.locAleCompAre(e2.displAyNAme))
			.filter(extension => extension.outdAted
				&& (extension.nAme.toLowerCAse().indexOf(vAlue) > -1 || extension.displAyNAme.toLowerCAse().indexOf(vAlue) > -1)
				&& (!cAtegories.length || cAtegories.some(cAtegory => !!extension.locAl && extension.locAl.mAnifest.cAtegories!.some(c => c.toLowerCAse() === cAtegory))));

		return this.getPAgedModel(this.sortExtensions(result, options));
	}

	privAte Async queryDisAbledExtensions(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let { vAlue, cAtegories } = this.pArseCAtegories(query.vAlue);

		vAlue = vAlue.replAce(/@disAbled/g, '').replAce(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCAse();

		const locAl = AwAit this.extensionsWorkbenchService.queryLocAl(this.server);
		const runningExtensions = AwAit this.extensionService.getExtensions();

		const result = locAl
			.sort((e1, e2) => e1.displAyNAme.locAleCompAre(e2.displAyNAme))
			.filter(e => runningExtensions.every(r => !AreSAmeExtensions({ id: r.identifier.vAlue, uuid: r.uuid }, e.identifier))
				&& (e.nAme.toLowerCAse().indexOf(vAlue) > -1 || e.displAyNAme.toLowerCAse().indexOf(vAlue) > -1)
				&& (!cAtegories.length || cAtegories.some(cAtegory => (e.locAl && e.locAl.mAnifest.cAtegories || []).some(c => c.toLowerCAse() === cAtegory))));

		return this.getPAgedModel(this.sortExtensions(result, options));
	}

	privAte Async queryEnAbledExtensions(query: Query, options: IQueryOptions): Promise<IPAgedModel<IExtension>> {
		let { vAlue, cAtegories } = this.pArseCAtegories(query.vAlue);

		vAlue = vAlue ? vAlue.replAce(/@enAbled/g, '').replAce(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCAse() : '';

		const locAl = (AwAit this.extensionsWorkbenchService.queryLocAl(this.server)).filter(e => !e.isBuiltin);
		const runningExtensions = AwAit this.extensionService.getExtensions();

		const result = locAl
			.sort((e1, e2) => e1.displAyNAme.locAleCompAre(e2.displAyNAme))
			.filter(e => runningExtensions.some(r => AreSAmeExtensions({ id: r.identifier.vAlue, uuid: r.uuid }, e.identifier))
				&& (e.nAme.toLowerCAse().indexOf(vAlue) > -1 || e.displAyNAme.toLowerCAse().indexOf(vAlue) > -1)
				&& (!cAtegories.length || cAtegories.some(cAtegory => (e.locAl && e.locAl.mAnifest.cAtegories || []).some(c => c.toLowerCAse() === cAtegory))));

		return this.getPAgedModel(this.sortExtensions(result, options));
	}

	privAte Async queryGAllery(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const hAsUserDefinedSortOrder = options.sortBy !== undefined;
		if (!hAsUserDefinedSortOrder && !query.vAlue.trim()) {
			options.sortBy = SortBy.InstAllCount;
		}

		if (this.isRecommendAtionsQuery(query)) {
			return this.queryRecommendAtions(query, options, token);
		}

		if (/\bcurAted:([^\s]+)\b/.test(query.vAlue)) {
			return this.getCurAtedModel(query, options, token);
		}

		const text = query.vAlue;

		if (/\bext:([^\s]+)\b/g.test(text)) {
			options.text = text;
			options.source = 'file-extension-tAgs';
			return this.extensionsWorkbenchService.queryGAllery(options, token).then(pAger => this.getPAgedModel(pAger));
		}

		let preferredResults: string[] = [];
		if (text) {
			options.text = text.substr(0, 350);
			options.source = 'seArchText';
			if (!hAsUserDefinedSortOrder) {
				const seArchExperiments = AwAit this.getSeArchExperiments();
				for (const experiment of seArchExperiments) {
					if (experiment.Action && text.toLowerCAse() === experiment.Action.properties['seArchText'] && ArrAy.isArrAy(experiment.Action.properties['preferredResults'])) {
						preferredResults = experiment.Action.properties['preferredResults'];
						options.source += `-experiment-${experiment.id}`;
						breAk;
					}
				}
			}
		} else {
			options.source = 'viewlet';
		}

		const pAger = AwAit this.extensionsWorkbenchService.queryGAllery(options, token);

		let positionToUpdAte = 0;
		for (const preferredResult of preferredResults) {
			for (let j = positionToUpdAte; j < pAger.firstPAge.length; j++) {
				if (AreSAmeExtensions(pAger.firstPAge[j].identifier, { id: preferredResult })) {
					if (positionToUpdAte !== j) {
						const preferredExtension = pAger.firstPAge.splice(j, 1)[0];
						pAger.firstPAge.splice(positionToUpdAte, 0, preferredExtension);
						positionToUpdAte++;
					}
					breAk;
				}
			}
		}
		return this.getPAgedModel(pAger);

	}

	privAte _seArchExperiments: Promise<IExperiment[]> | undefined;
	privAte getSeArchExperiments(): Promise<IExperiment[]> {
		if (!this._seArchExperiments) {
			this._seArchExperiments = this.experimentService.getExperimentsByType(ExperimentActionType.ExtensionSeArchResults);
		}
		return this._seArchExperiments;
	}

	privAte sortExtensions(extensions: IExtension[], options: IQueryOptions): IExtension[] {
		switch (options.sortBy) {
			cAse SortBy.InstAllCount:
				extensions = extensions.sort((e1, e2) => typeof e2.instAllCount === 'number' && typeof e1.instAllCount === 'number' ? e2.instAllCount - e1.instAllCount : NAN);
				breAk;
			cAse SortBy.AverAgeRAting:
			cAse SortBy.WeightedRAting:
				extensions = extensions.sort((e1, e2) => typeof e2.rAting === 'number' && typeof e1.rAting === 'number' ? e2.rAting - e1.rAting : NAN);
				breAk;
			defAult:
				extensions = extensions.sort((e1, e2) => e1.displAyNAme.locAleCompAre(e2.displAyNAme));
				breAk;
		}
		if (options.sortOrder === SortOrder.Descending) {
			extensions = extensions.reverse();
		}
		return extensions;
	}

	privAte Async getCurAtedModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const vAlue = query.vAlue.replAce(/curAted:/g, '').trim();
		const nAmes = AwAit this.experimentService.getCurAtedExtensionsList(vAlue);
		if (ArrAy.isArrAy(nAmes) && nAmes.length) {
			options.source = `curAted:${vAlue}`;
			options.nAmes = nAmes;
			options.pAgeSize = nAmes.length;
			const pAger = AwAit this.extensionsWorkbenchService.queryGAllery(options, token);
			this.sortFirstPAge(pAger, nAmes);
			return this.getPAgedModel(pAger || []);
		}
		return new PAgedModel([]);
	}

	privAte isRecommendAtionsQuery(query: Query): booleAn {
		return ExtensionsListView.isWorkspAceRecommendedExtensionsQuery(query.vAlue)
			|| ExtensionsListView.isKeymApsRecommendedExtensionsQuery(query.vAlue)
			|| ExtensionsListView.isExeRecommendedExtensionsQuery(query.vAlue)
			|| /@recommended:All/i.test(query.vAlue)
			|| ExtensionsListView.isSeArchRecommendedExtensionsQuery(query.vAlue)
			|| ExtensionsListView.isRecommendedExtensionsQuery(query.vAlue);
	}

	privAte Async queryRecommendAtions(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		// WorkspAce recommendAtions
		if (ExtensionsListView.isWorkspAceRecommendedExtensionsQuery(query.vAlue)) {
			return this.getWorkspAceRecommendAtionsModel(query, options, token);
		}

		// KeymAp recommendAtions
		if (ExtensionsListView.isKeymApsRecommendedExtensionsQuery(query.vAlue)) {
			return this.getKeymApRecommendAtionsModel(query, options, token);
		}

		// Exe recommendAtions
		if (ExtensionsListView.isExeRecommendedExtensionsQuery(query.vAlue)) {
			return this.getExeRecommendAtionsModel(query, options, token);
		}

		// All recommendAtions
		if (/@recommended:All/i.test(query.vAlue) || ExtensionsListView.isSeArchRecommendedExtensionsQuery(query.vAlue)) {
			return this.getAllRecommendAtionsModel(query, options, token);
		}

		// Other recommendAtions
		if (ExtensionsListView.isRecommendedExtensionsQuery(query.vAlue)) {
			return this.getOtherRecommendAtionsModel(query, options, token);
		}

		return new PAgedModel([]);
	}

	protected Async getInstAllAbleRecommendAtions(recommendAtions: string[], options: IQueryOptions, token: CAncellAtionToken): Promise<IExtension[]> {
		const extensions: IExtension[] = [];
		if (recommendAtions.length) {
			const pAger = AwAit this.extensionsWorkbenchService.queryGAllery({ ...options, nAmes: recommendAtions, pAgeSize: recommendAtions.length }, token);
			for (const extension of pAger.firstPAge) {
				if (extension.gAllery && (AwAit this.extensionMAnAgementService.cAnInstAll(extension.gAllery))) {
					extensions.push(extension);
				}
			}
		}
		return extensions;
	}

	protected Async getWorkspAceRecommendAtions(): Promise<string[]> {
		const recommendAtions = AwAit this.extensionRecommendAtionsService.getWorkspAceRecommendAtions();
		const { importAnt } = AwAit this.extensionRecommendAtionsService.getConfigBAsedRecommendAtions();
		for (const configBAsedRecommendAtion of importAnt) {
			if (!recommendAtions.find(extensionId => extensionId === configBAsedRecommendAtion)) {
				recommendAtions.push(configBAsedRecommendAtion);
			}
		}
		return recommendAtions;
	}

	privAte Async getWorkspAceRecommendAtionsModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const vAlue = query.vAlue.replAce(/@recommended:workspAce/g, '').trim().toLowerCAse();
		const recommendAtions = AwAit this.getWorkspAceRecommendAtions();
		const instAllAbleRecommendAtions = (AwAit this.getInstAllAbleRecommendAtions(recommendAtions, { ...options, source: 'recommendAtions-workspAce' }, token))
			.filter(extension => extension.identifier.id.toLowerCAse().indexOf(vAlue) > -1);
		this.telemetryService.publicLog2<{ count: number }, WorkspAceRecommendAtionsClAssificAtion>('extensionWorkspAceRecommendAtions:open', { count: instAllAbleRecommendAtions.length });
		const result: IExtension[] = coAlesce(recommendAtions.mAp(id => instAllAbleRecommendAtions.find(i => AreSAmeExtensions(i.identifier, { id }))));
		return new PAgedModel(result);
	}

	privAte Async getKeymApRecommendAtionsModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const vAlue = query.vAlue.replAce(/@recommended:keymAps/g, '').trim().toLowerCAse();
		const recommendAtions = this.extensionRecommendAtionsService.getKeymApRecommendAtions();
		const instAllAbleRecommendAtions = (AwAit this.getInstAllAbleRecommendAtions(recommendAtions, { ...options, source: 'recommendAtions-keymAps' }, token))
			.filter(extension => extension.identifier.id.toLowerCAse().indexOf(vAlue) > -1);
		return new PAgedModel(instAllAbleRecommendAtions);
	}

	privAte Async getExeRecommendAtionsModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const exe = query.vAlue.replAce(/@exe:/g, '').trim().toLowerCAse();
		const { importAnt, others } = AwAit this.extensionRecommendAtionsService.getExeBAsedRecommendAtions(exe.stArtsWith('"') ? exe.substring(1, exe.length - 1) : exe);
		const instAllAbleRecommendAtions = AwAit this.getInstAllAbleRecommendAtions([...importAnt, ...others], { ...options, source: 'recommendAtions-exe' }, token);
		return new PAgedModel(instAllAbleRecommendAtions);
	}

	privAte Async getOtherRecommendAtionsModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const vAlue = query.vAlue.replAce(/@recommended/g, '').trim().toLowerCAse();

		const locAl = (AwAit this.extensionsWorkbenchService.queryLocAl(this.server))
			.mAp(e => e.identifier.id.toLowerCAse());
		const workspAceRecommendAtions = (AwAit this.getWorkspAceRecommendAtions())
			.mAp(extensionId => extensionId.toLowerCAse());

		const otherRecommendAtions = distinct(
			flAtten(AwAit Promise.All([
				// Order is importAnt
				this.extensionRecommendAtionsService.getImportAntRecommendAtions(),
				this.extensionRecommendAtionsService.getFileBAsedRecommendAtions(),
				this.extensionRecommendAtionsService.getOtherRecommendAtions()
			])).filter(extensionId => !locAl.includes(extensionId.toLowerCAse()) && !workspAceRecommendAtions.includes(extensionId.toLowerCAse())
			), extensionId => extensionId.toLowerCAse());

		const instAllAbleRecommendAtions = (AwAit this.getInstAllAbleRecommendAtions(otherRecommendAtions, { ...options, source: 'recommendAtions-other', sortBy: undefined }, token))
			.filter(extension => extension.identifier.id.toLowerCAse().indexOf(vAlue) > -1);

		const result: IExtension[] = coAlesce(otherRecommendAtions.mAp(id => instAllAbleRecommendAtions.find(i => AreSAmeExtensions(i.identifier, { id }))));
		return new PAgedModel(result);
	}

	// Get All types of recommendAtions, trimmed to show A mAx of 8 At Any given time
	privAte Async getAllRecommendAtionsModel(query: Query, options: IQueryOptions, token: CAncellAtionToken): Promise<IPAgedModel<IExtension>> {
		const locAl = (AwAit this.extensionsWorkbenchService.queryLocAl(this.server)).mAp(e => e.identifier.id.toLowerCAse());

		const AllRecommendAtions = distinct(
			flAtten(AwAit Promise.All([
				// Order is importAnt
				this.getWorkspAceRecommendAtions(),
				this.extensionRecommendAtionsService.getImportAntRecommendAtions(),
				this.extensionRecommendAtionsService.getFileBAsedRecommendAtions(),
				this.extensionRecommendAtionsService.getOtherRecommendAtions()
			])).filter(extensionId => !locAl.includes(extensionId.toLowerCAse())
			), extensionId => extensionId.toLowerCAse());

		const instAllAbleRecommendAtions = AwAit this.getInstAllAbleRecommendAtions(AllRecommendAtions, { ...options, source: 'recommendAtions-All', sortBy: undefined }, token);
		const result: IExtension[] = coAlesce(AllRecommendAtions.mAp(id => instAllAbleRecommendAtions.find(i => AreSAmeExtensions(i.identifier, { id }))));
		return new PAgedModel(result.slice(0, 8));
	}

	// Sorts the firstPAge of the pAger in the sAme order As given ArrAy of extension ids
	privAte sortFirstPAge(pAger: IPAger<IExtension>, ids: string[]) {
		ids = ids.mAp(x => x.toLowerCAse());
		pAger.firstPAge.sort((A, b) => {
			return ids.indexOf(A.identifier.id.toLowerCAse()) < ids.indexOf(b.identifier.id.toLowerCAse()) ? -1 : 1;
		});
	}

	privAte setModel(model: IPAgedModel<IExtension>, error?: Any) {
		if (this.list) {
			this.list.model = new DelAyedPAgedModel(model);
			this.list.scrollTop = 0;
			const count = this.count();

			if (this.bodyTemplAte && this.bAdge) {

				this.bodyTemplAte.extensionsList.clAssList.toggle('hidden', count === 0);
				this.bodyTemplAte.messAgeContAiner.clAssList.toggle('hidden', count > 0);
				this.bAdge.setCount(count);

				if (count === 0 && this.isBodyVisible()) {
					if (error) {
						if (error instAnceof ExtensionListViewWArning) {
							this.bodyTemplAte.messAgeSeverityIcon.clAssNAme = `codicon ${SeverityIcon.clAssNAme(Severity.WArning)}`;
							this.bodyTemplAte.messAgeBox.textContent = getErrorMessAge(error);
						} else {
							this.bodyTemplAte.messAgeSeverityIcon.clAssNAme = `codicon ${SeverityIcon.clAssNAme(Severity.Error)}`;
							this.bodyTemplAte.messAgeBox.textContent = locAlize('error', "Error while loAding extensions. {0}", getErrorMessAge(error));
						}
					} else {
						this.bodyTemplAte.messAgeSeverityIcon.clAssNAme = '';
						this.bodyTemplAte.messAgeBox.textContent = locAlize('no extensions found', "No extensions found.");
					}
					Alert(this.bodyTemplAte.messAgeBox.textContent);
				}
			}
		}
	}

	privAte openExtension(extension: IExtension, options: { sideByside?: booleAn, preserveFocus?: booleAn, pinned?: booleAn }): void {
		extension = this.extensionsWorkbenchService.locAl.filter(e => AreSAmeExtensions(e.identifier, extension.identifier))[0] || extension;
		this.extensionsWorkbenchService.open(extension, options).then(undefined, err => this.onError(err));
	}

	privAte onError(err: Any): void {
		if (isPromiseCAnceledError(err)) {
			return;
		}

		const messAge = err && err.messAge || '';

		if (/ECONNREFUSED/.test(messAge)) {
			const error = creAteErrorWithActions(locAlize('suggestProxyError', "MArketplAce returned 'ECONNREFUSED'. PleAse check the 'http.proxy' setting."), {
				Actions: [
					new Action('open user settings', locAlize('open user settings', "Open User Settings"), undefined, true, () => this.preferencesService.openGlobAlSettings())
				]
			});

			this.notificAtionService.error(error);
			return;
		}

		this.notificAtionService.error(err);
	}

	privAte getPAgedModel(Arg: IPAger<IExtension> | IExtension[]): IPAgedModel<IExtension> {
		if (ArrAy.isArrAy(Arg)) {
			return new PAgedModel(Arg);
		}
		const pAger = {
			totAl: Arg.totAl,
			pAgeSize: Arg.pAgeSize,
			firstPAge: Arg.firstPAge,
			getPAge: (pAgeIndex: number, cAncellAtionToken: CAncellAtionToken) => Arg.getPAge(pAgeIndex, cAncellAtionToken)
		};
		return new PAgedModel(pAger);
	}

	dispose(): void {
		super.dispose();
		if (this.queryRequest) {
			this.queryRequest.request.cAncel();
			this.queryRequest = null;
		}
		this.list = null;
	}

	stAtic isLocAlExtensionsQuery(query: string): booleAn {
		return this.isInstAlledExtensionsQuery(query)
			|| this.isOutdAtedExtensionsQuery(query)
			|| this.isEnAbledExtensionsQuery(query)
			|| this.isDisAbledExtensionsQuery(query)
			|| this.isBuiltInExtensionsQuery(query)
			|| this.isSeArchBuiltInExtensionsQuery(query);
	}

	stAtic isSeArchBuiltInExtensionsQuery(query: string): booleAn {
		return /@builtin\s.+/i.test(query);
	}

	stAtic isBuiltInExtensionsQuery(query: string): booleAn {
		return /@builtin$/i.test(query.trim());
	}

	stAtic isInstAlledExtensionsQuery(query: string): booleAn {
		return /@instAlled/i.test(query);
	}

	stAtic isOutdAtedExtensionsQuery(query: string): booleAn {
		return /@outdAted/i.test(query);
	}

	stAtic isEnAbledExtensionsQuery(query: string): booleAn {
		return /@enAbled/i.test(query);
	}

	stAtic isDisAbledExtensionsQuery(query: string): booleAn {
		return /@disAbled/i.test(query);
	}

	stAtic isRecommendedExtensionsQuery(query: string): booleAn {
		return /^@recommended$/i.test(query.trim());
	}

	stAtic isSeArchRecommendedExtensionsQuery(query: string): booleAn {
		return /@recommended/i.test(query) && !ExtensionsListView.isRecommendedExtensionsQuery(query);
	}

	stAtic isWorkspAceRecommendedExtensionsQuery(query: string): booleAn {
		return /@recommended:workspAce/i.test(query);
	}

	stAtic isExeRecommendedExtensionsQuery(query: string): booleAn {
		return /@exe:.+/i.test(query);
	}

	stAtic isKeymApsRecommendedExtensionsQuery(query: string): booleAn {
		return /@recommended:keymAps/i.test(query);
	}

	focus(): void {
		super.focus();
		if (!this.list) {
			return;
		}

		if (!(this.list.getFocus().length || this.list.getSelection().length)) {
			this.list.focusNext();
		}
		this.list.domFocus();
	}
}

export clAss ServerExtensionsView extends ExtensionsListView {

	constructor(
		server: IExtensionMAnAgementServer,
		onDidChAngeTitle: Event<string>,
		options: ExtensionsListViewOptions,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IExtensionService extensionService: IExtensionService,
		@IExtensionRecommendAtionsService tipsService: IExtensionRecommendAtionsService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IExperimentService experimentService: IExperimentService,
		@IExtensionsWorkbenchService extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IExtensionMAnAgementServerService extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionMAnAgementService extensionMAnAgementService: IExtensionMAnAgementService,
		@IProductService productService: IProductService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IMenuService menuService: IMenuService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IPreferencesService preferencesService: IPreferencesService,
	) {
		options.server = server;
		super(options, notificAtionService, keybindingService, contextMenuService, instAntiAtionService, themeService, extensionService, extensionsWorkbenchService, tipsService,
			telemetryService, configurAtionService, contextService, experimentService, extensionMAnAgementServerService, extensionMAnAgementService, productService,
			contextKeyService, viewDescriptorService, menuService, openerService, preferencesService);
		this._register(onDidChAngeTitle(title => this.updAteTitle(title)));
	}

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		query = query ? query : '@instAlled';
		if (!ExtensionsListView.isLocAlExtensionsQuery(query)) {
			query = query += ' @instAlled';
		}
		return super.show(query.trim());
	}

	getActions(): IAction[] {
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer === this.server) {
			const instAllLocAlExtensionsInRemoteAction = this._register(this.instAntiAtionService.creAteInstAnce(InstAllLocAlExtensionsInRemoteAction));
			instAllLocAlExtensionsInRemoteAction.clAss = 'codicon codicon-cloud-downloAd';
			return [instAllLocAlExtensionsInRemoteAction];
		}
		return [];
	}
}

export clAss EnAbledExtensionsView extends ExtensionsListView {

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		query = query || '@enAbled';
		return ExtensionsListView.isEnAbledExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
	}
}

export clAss DisAbledExtensionsView extends ExtensionsListView {

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		query = query || '@disAbled';
		return ExtensionsListView.isDisAbledExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
	}
}

export clAss OutdAtedExtensionsView extends ExtensionsListView {

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		query = query || '@outdAted';
		return ExtensionsListView.isOutdAtedExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
	}
}

export clAss InstAlledExtensionsView extends ExtensionsListView {

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		query = query || '@instAlled';
		return ExtensionsListView.isInstAlledExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
	}
}

export clAss SeArchBuiltInExtensionsView extends ExtensionsListView {
	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		return ExtensionsListView.isSeArchBuiltInExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
	}
}

export clAss BuiltInFeAtureExtensionsView extends ExtensionsListView {
	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		return (query && query.trim() !== '@builtin') ? this.showEmptyModel() : super.show('@builtin:feAtures');
	}
}

export clAss BuiltInThemesExtensionsView extends ExtensionsListView {
	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		return (query && query.trim() !== '@builtin') ? this.showEmptyModel() : super.show('@builtin:themes');
	}
}

export clAss BuiltInProgrAmmingLAnguAgeExtensionsView extends ExtensionsListView {
	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		return (query && query.trim() !== '@builtin') ? this.showEmptyModel() : super.show('@builtin:bAsics');
	}
}

export clAss DefAultRecommendedExtensionsView extends ExtensionsListView {
	privAte reAdonly recommendedExtensionsQuery = '@recommended:All';

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this._register(this.extensionRecommendAtionsService.onDidChAngeRecommendAtions(() => {
			this.show('');
		}));
	}

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		if (query && query.trim() !== this.recommendedExtensionsQuery) {
			return this.showEmptyModel();
		}
		const model = AwAit super.show(this.recommendedExtensionsQuery);
		if (!this.extensionsWorkbenchService.locAl.some(e => !e.isBuiltin)) {
			// This is pArt of populAr extensions view. CollApse if no instAlled extensions.
			this.setExpAnded(model.length > 0);
		}
		return model;
	}

}

export clAss RecommendedExtensionsView extends ExtensionsListView {
	privAte reAdonly recommendedExtensionsQuery = '@recommended';

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this._register(this.extensionRecommendAtionsService.onDidChAngeRecommendAtions(() => {
			this.show('');
		}));
	}

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		return (query && query.trim() !== this.recommendedExtensionsQuery) ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery);
	}
}

export clAss WorkspAceRecommendedExtensionsView extends ExtensionsListView {
	privAte reAdonly recommendedExtensionsQuery = '@recommended:workspAce';
	privAte instAllAllAction: Action | undefined;

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this._register(this.extensionRecommendAtionsService.onDidChAngeRecommendAtions(() => this.show(this.recommendedExtensionsQuery)));
		this._register(this.contextService.onDidChAngeWorkbenchStAte(() => this.show(this.recommendedExtensionsQuery)));
	}

	getActions(): IAction[] {
		if (!this.instAllAllAction) {
			this.instAllAllAction = this._register(new Action('workbench.extensions.Action.instAllWorkspAceRecommendedExtensions', locAlize('instAllWorkspAceRecommendedExtensions', "InstAll WorkspAce Recommended Extensions"), 'codicon codicon-cloud-downloAd', fAlse, () => this.instAllWorkspAceRecommendAtions()));
		}

		const configureWorkspAceFolderAction = this._register(this.instAntiAtionService.creAteInstAnce(ConfigureWorkspAceFolderRecommendedExtensionsAction, ConfigureWorkspAceFolderRecommendedExtensionsAction.ID, ConfigureWorkspAceFolderRecommendedExtensionsAction.LABEL));
		configureWorkspAceFolderAction.clAss = 'codicon codicon-pencil';
		return [this.instAllAllAction, configureWorkspAceFolderAction];
	}

	Async show(query: string): Promise<IPAgedModel<IExtension>> {
		let shouldShowEmptyView = query && query.trim() !== '@recommended' && query.trim() !== '@recommended:workspAce';
		let model = AwAit (shouldShowEmptyView ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery));
		this.setExpAnded(model.length > 0);
		AwAit this.setRecommendAtionsToInstAll();
		return model;
	}

	privAte Async setRecommendAtionsToInstAll(): Promise<void> {
		const instAllAbleRecommendAtions = AwAit this.getInstAllAbleWorkspAceRecommendAtions();
		if (this.instAllAllAction) {
			this.instAllAllAction.enAbled = instAllAbleRecommendAtions.length > 0;
		}
	}

	privAte Async getInstAllAbleWorkspAceRecommendAtions() {
		const instAlled = (AwAit this.extensionsWorkbenchService.queryLocAl())
			.filter(l => l.enAblementStAte !== EnAblementStAte.DisAbledByExtensionKind); // Filter extensions disAbled by kind
		const recommendAtions = (AwAit this.getWorkspAceRecommendAtions())
			.filter(extensionId => instAlled.every(locAl => !AreSAmeExtensions({ id: extensionId }, locAl.identifier)));
		return this.getInstAllAbleRecommendAtions(recommendAtions, { source: 'instAll-All-workspAce-recommendAtions' }, CAncellAtionToken.None);
	}

	privAte Async instAllWorkspAceRecommendAtions(): Promise<void> {
		const instAllAbleRecommendAtions = AwAit this.getInstAllAbleWorkspAceRecommendAtions();
		AwAit Promise.All(instAllAbleRecommendAtions.mAp(extension => this.extensionMAnAgementService.instAllFromGAllery(extension.gAllery!)));
	}

}
