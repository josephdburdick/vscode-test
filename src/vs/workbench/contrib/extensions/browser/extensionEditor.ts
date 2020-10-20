/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/extensionEditor';
import { locAlize } from 'vs/nls';
import { creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { OS } from 'vs/bAse/common/plAtform';
import { Event, Emitter } from 'vs/bAse/common/event';
import { CAche, CAcheResult } from 'vs/bAse/common/cAche';
import { Action, IAction } from 'vs/bAse/common/Actions';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { dispose, toDisposAble, DisposAble, DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { domEvent } from 'vs/bAse/browser/event';
import { Append, $, finAlHAndler, join, hide, show, AddDisposAbleListener, EventType } from 'vs/bAse/browser/dom';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionIgnoredRecommendAtionsService, IExtensionRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { IExtensionMAnifest, IKeyBinding, IView, IViewContAiner } from 'vs/plAtform/extensions/common/extensions';
import { ResolvedKeybinding, KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { ExtensionsInput } from 'vs/workbench/contrib/extensions/common/extensionsInput';
import { IExtensionsWorkbenchService, IExtensionsViewPAneContAiner, VIEWLET_ID, IExtension, ExtensionContAiners } from 'vs/workbench/contrib/extensions/common/extensions';
import { RAtingsWidget, InstAllCountWidget, RemoteBAdgeWidget } from 'vs/workbench/contrib/extensions/browser/extensionsWidgets';
import { EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { CombinedInstAllAction, UpdAteAction, ExtensionEditorDropDownAction, ReloAdAction, MAliciousStAtusLAbelAction, IgnoreExtensionRecommendAtionAction, UndoIgnoreExtensionRecommendAtionAction, EnAbleDropDownAction, DisAbleDropDownAction, StAtusLAbelAction, SetFileIconThemeAction, SetColorThemeAction, RemoteInstAllAction, ExtensionToolTipAction, SystemDisAbledWArningAction, LocAlInstAllAction, SyncIgnoredIconAction, SetProductIconThemeAction } from 'vs/workbench/contrib/extensions/browser/extensionsActions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { IOpenerService, mAtchesScheme } from 'vs/plAtform/opener/common/opener';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { KeybindingLAbel } from 'vs/bAse/browser/ui/keybindingLAbel/keybindingLAbel';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { Color } from 'vs/bAse/common/color';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ExtensionsTree, ExtensionDAtA, ExtensionsGridView, getExtensions } from 'vs/workbench/contrib/extensions/browser/extensionsViewer';
import { ShowCurrentReleAseNotesActionId } from 'vs/workbench/contrib/updAte/common/updAte';
import { KeybindingPArser } from 'vs/bAse/common/keybindingPArser';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { getDefAultVAlue } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { isUndefined } from 'vs/bAse/common/types';
import { IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IWebviewService, Webview, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from 'vs/workbench/contrib/webview/browser/webview';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { plAtform } from 'vs/bAse/common/process';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { renderMArkdownDocument } from 'vs/workbench/contrib/mArkdown/common/mArkdownDocumentRenderer';
import { IModeService } from 'vs/editor/common/services/modeService';
import { TokenizAtionRegistry } from 'vs/editor/common/modes';
import { generAteTokensCSSForColorMAp } from 'vs/editor/common/modes/supports/tokenizAtion';
import { editorBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';

function removeEmbeddedSVGs(documentContent: string): string {
	const newDocument = new DOMPArser().pArseFromString(documentContent, 'text/html');

	// remove All inline svgs
	const AllSVGs = newDocument.documentElement.querySelectorAll('svg');
	if (AllSVGs) {
		for (let i = 0; i < AllSVGs.length; i++) {
			const svg = AllSVGs[i];
			if (svg.pArentNode) {
				svg.pArentNode.removeChild(AllSVGs[i]);
			}
		}
	}

	return newDocument.documentElement.outerHTML;
}

clAss NAvBAr extends DisposAble {

	privAte _onChAnge = this._register(new Emitter<{ id: string | null, focus: booleAn }>());
	get onChAnge(): Event<{ id: string | null, focus: booleAn }> { return this._onChAnge.event; }

	privAte _currentId: string | null = null;
	get currentId(): string | null { return this._currentId; }

	privAte Actions: Action[];
	privAte ActionbAr: ActionBAr;

	constructor(contAiner: HTMLElement) {
		super();
		const element = Append(contAiner, $('.nAvbAr'));
		this.Actions = [];
		this.ActionbAr = this._register(new ActionBAr(element, { AnimAted: fAlse }));
	}

	push(id: string, lAbel: string, tooltip: string): void {
		const Action = new Action(id, lAbel, undefined, true, () => this._updAte(id, true));

		Action.tooltip = tooltip;

		this.Actions.push(Action);
		this.ActionbAr.push(Action);

		if (this.Actions.length === 1) {
			this._updAte(id);
		}
	}

	cleAr(): void {
		this.Actions = dispose(this.Actions);
		this.ActionbAr.cleAr();
	}

	updAte(): void {
		this._updAte(this._currentId);
	}

	_updAte(id: string | null = this._currentId, focus?: booleAn): Promise<void> {
		this._currentId = id;
		this._onChAnge.fire({ id, focus: !!focus });
		this.Actions.forEAch(A => A.checked = A.id === id);
		return Promise.resolve(undefined);
	}
}

const NAvbArSection = {
	ReAdme: 'reAdme',
	Contributions: 'contributions',
	ChAngelog: 'chAngelog',
	Dependencies: 'dependencies',
};

interfAce ILAyoutPArticipAnt {
	lAyout(): void;
}

interfAce IActiveElement {
	focus(): void;
}

interfAce IExtensionEditorTemplAte {
	iconContAiner: HTMLElement;
	icon: HTMLImAgeElement;
	nAme: HTMLElement;
	identifier: HTMLElement;
	preview: HTMLElement;
	builtin: HTMLElement;
	license: HTMLElement;
	version: HTMLElement;
	publisher: HTMLElement;
	instAllCount: HTMLElement;
	rAting: HTMLElement;
	repository: HTMLElement;
	description: HTMLElement;
	extensionActionBAr: ActionBAr;
	nAvbAr: NAvBAr;
	content: HTMLElement;
	subtextContAiner: HTMLElement;
	subtext: HTMLElement;
	ignoreActionbAr: ActionBAr;
	heAder: HTMLElement;
}

export clAss ExtensionEditor extends EditorPAne {

	stAtic reAdonly ID: string = 'workbench.editor.extension';

	privAte templAte: IExtensionEditorTemplAte | undefined;

	privAte extensionReAdme: CAche<string> | null;
	privAte extensionChAngelog: CAche<string> | null;
	privAte extensionMAnifest: CAche<IExtensionMAnifest | null> | null;

	privAte lAyoutPArticipAnts: ILAyoutPArticipAnt[] = [];
	privAte reAdonly contentDisposAbles = this._register(new DisposAbleStore());
	privAte reAdonly trAnsientDisposAbles = this._register(new DisposAbleStore());
	privAte ActiveElement: IActiveElement | null = null;
	privAte editorLoAdComplete: booleAn = fAlse;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@IExtensionsWorkbenchService privAte reAdonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IThemeService protected themeService: IThemeService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IExtensionRecommendAtionsService privAte reAdonly extensionRecommendAtionsService: IExtensionRecommendAtionsService,
		@IExtensionIgnoredRecommendAtionsService privAte reAdonly extensionIgnoredRecommendAtionsService: IExtensionIgnoredRecommendAtionsService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IWorkbenchThemeService privAte reAdonly workbenchThemeService: IWorkbenchThemeService,
		@IWebviewService privAte reAdonly webviewService: IWebviewService,
		@IModeService privAte reAdonly modeService: IModeService,
	) {
		super(ExtensionEditor.ID, telemetryService, themeService, storAgeService);
		this.extensionReAdme = null;
		this.extensionChAngelog = null;
		this.extensionMAnifest = null;
	}

	creAteEditor(pArent: HTMLElement): void {
		const root = Append(pArent, $('.extension-editor'));
		root.tAbIndex = 0; // this is required for the focus trAcker on the editor
		root.style.outline = 'none';
		root.setAttribute('role', 'document');
		const heAder = Append(root, $('.heAder'));

		const iconContAiner = Append(heAder, $('.icon-contAiner'));
		const icon = Append(iconContAiner, $<HTMLImAgeElement>('img.icon', { drAggAble: fAlse }));

		const detAils = Append(heAder, $('.detAils'));
		const title = Append(detAils, $('.title'));
		const nAme = Append(title, $('spAn.nAme.clickAble', { title: locAlize('nAme', "Extension nAme"), role: 'heAding', tAbIndex: 0 }));
		const identifier = Append(title, $('spAn.identifier', { title: locAlize('extension id', "Extension identifier") }));

		const preview = Append(title, $('spAn.preview', { title: locAlize('preview', "Preview") }));
		preview.textContent = locAlize('preview', "Preview");

		const builtin = Append(title, $('spAn.builtin'));
		builtin.textContent = locAlize('builtin', "Built-in");

		const subtitle = Append(detAils, $('.subtitle'));
		const publisher = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.publisher.clickAble', { title: locAlize('publisher', "Publisher nAme"), tAbIndex: 0 }));

		const instAllCount = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.instAll', { title: locAlize('instAll count', "InstAll count"), tAbIndex: 0 }));

		const rAting = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.rAting.clickAble', { title: locAlize('rAting', "RAting"), tAbIndex: 0 }));

		const repository = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.repository.clickAble'));
		repository.textContent = locAlize('repository', 'Repository');
		repository.style.displAy = 'none';
		repository.tAbIndex = 0;

		const license = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.license.clickAble'));
		license.textContent = locAlize('license', 'License');
		license.style.displAy = 'none';
		license.tAbIndex = 0;

		const version = Append(Append(subtitle, $('.subtitle-entry')), $('spAn.version'));
		version.textContent = locAlize('version', 'Version');

		const description = Append(detAils, $('.description'));

		const extensionActions = Append(detAils, $('.Actions'));
		const extensionActionBAr = this._register(new ActionBAr(extensionActions, {
			AnimAted: fAlse,
			ActionViewItemProvider: (Action: IAction) => {
				if (Action instAnceof ExtensionEditorDropDownAction) {
					return Action.creAteActionViewItem();
				}
				return undefined;
			}
		}));

		const subtextContAiner = Append(detAils, $('.subtext-contAiner'));
		const subtext = Append(subtextContAiner, $('.subtext'));
		const ignoreActionbAr = this._register(new ActionBAr(subtextContAiner, { AnimAted: fAlse }));

		this._register(Event.chAin(extensionActionBAr.onDidRun)
			.mAp(({ error }) => error)
			.filter(error => !!error)
			.on(this.onError, this));

		this._register(Event.chAin(ignoreActionbAr.onDidRun)
			.mAp(({ error }) => error)
			.filter(error => !!error)
			.on(this.onError, this));

		const body = Append(root, $('.body'));
		const nAvbAr = new NAvBAr(body);

		const content = Append(body, $('.content'));

		this.templAte = {
			builtin,
			content,
			description,
			extensionActionBAr,
			heAder,
			icon,
			iconContAiner,
			identifier,
			version,
			ignoreActionbAr,
			instAllCount,
			license,
			nAme,
			nAvbAr,
			preview,
			publisher,
			rAting,
			repository,
			subtext,
			subtextContAiner
		};
	}

	privAte onClick(element: HTMLElement, cAllbAck: () => void): IDisposAble {
		const disposAbles: DisposAbleStore = new DisposAbleStore();
		disposAbles.Add(AddDisposAbleListener(element, EventType.CLICK, finAlHAndler(cAllbAck)));
		disposAbles.Add(AddDisposAbleListener(element, EventType.KEY_UP, e => {
			const keyboArdEvent = new StAndArdKeyboArdEvent(e);
			if (keyboArdEvent.equAls(KeyCode.SpAce) || keyboArdEvent.equAls(KeyCode.Enter)) {
				e.preventDefAult();
				e.stopPropAgAtion();
				cAllbAck();
			}
		}));
		return disposAbles;
	}

	Async setInput(input: ExtensionsInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		AwAit super.setInput(input, options, context, token);
		if (this.templAte) {
			AwAit this.updAteTemplAte(input, this.templAte, !!options?.preserveFocus);
		}
	}

	privAte Async updAteTemplAte(input: ExtensionsInput, templAte: IExtensionEditorTemplAte, preserveFocus: booleAn): Promise<void> {
		const runningExtensions = AwAit this.extensionService.getExtensions();

		this.ActiveElement = null;
		this.editorLoAdComplete = fAlse;
		const extension = input.extension;

		this.trAnsientDisposAbles.cleAr();

		this.extensionReAdme = new CAche(() => creAteCAncelAblePromise(token => extension.getReAdme(token)));
		this.extensionChAngelog = new CAche(() => creAteCAncelAblePromise(token => extension.getChAngelog(token)));
		this.extensionMAnifest = new CAche(() => creAteCAncelAblePromise(token => extension.getMAnifest(token)));

		const remoteBAdge = this.instAntiAtionService.creAteInstAnce(RemoteBAdgeWidget, templAte.iconContAiner, true);
		const onError = Event.once(domEvent(templAte.icon, 'error'));
		onError(() => templAte.icon.src = extension.iconUrlFAllbAck, null, this.trAnsientDisposAbles);
		templAte.icon.src = extension.iconUrl;

		templAte.nAme.textContent = extension.displAyNAme;
		templAte.identifier.textContent = extension.identifier.id;
		templAte.preview.style.displAy = extension.preview ? 'inherit' : 'none';
		templAte.builtin.style.displAy = extension.isBuiltin ? 'inherit' : 'none';

		templAte.publisher.textContent = extension.publisherDisplAyNAme;
		templAte.version.textContent = `v${extension.version}`;
		templAte.description.textContent = extension.description;

		const extRecommendAtions = this.extensionRecommendAtionsService.getAllRecommendAtionsWithReAson();
		let recommendAtionsDAtA = {};
		if (extRecommendAtions[extension.identifier.id.toLowerCAse()]) {
			recommendAtionsDAtA = { recommendAtionReAson: extRecommendAtions[extension.identifier.id.toLowerCAse()].reAsonId };
		}

		/* __GDPR__
		"extensionGAllery:openExtension" : {
			"recommendAtionReAson": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"${include}": [
				"${GAlleryExtensionTelemetryDAtA}"
			]
		}
		*/
		this.telemetryService.publicLog('extensionGAllery:openExtension', { ...extension.telemetryDAtA, ...recommendAtionsDAtA });

		templAte.nAme.clAssList.toggle('clickAble', !!extension.url);
		templAte.publisher.clAssList.toggle('clickAble', !!extension.url);
		templAte.rAting.clAssList.toggle('clickAble', !!extension.url);
		if (extension.url) {
			this.trAnsientDisposAbles.Add(this.onClick(templAte.nAme, () => this.openerService.open(URI.pArse(extension.url!))));
			this.trAnsientDisposAbles.Add(this.onClick(templAte.rAting, () => this.openerService.open(URI.pArse(`${extension.url}#review-detAils`))));
			this.trAnsientDisposAbles.Add(this.onClick(templAte.publisher, () => {
				this.viewletService.openViewlet(VIEWLET_ID, true)
					.then(viewlet => viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner)
					.then(viewlet => viewlet.seArch(`publisher:"${extension.publisherDisplAyNAme}"`));
			}));

			if (extension.licenseUrl) {
				this.trAnsientDisposAbles.Add(this.onClick(templAte.license, () => this.openerService.open(URI.pArse(extension.licenseUrl!))));
				templAte.license.style.displAy = 'initiAl';
			} else {
				templAte.license.style.displAy = 'none';
			}
		} else {
			templAte.license.style.displAy = 'none';
		}

		if (extension.repository) {
			this.trAnsientDisposAbles.Add(this.onClick(templAte.repository, () => this.openerService.open(URI.pArse(extension.repository!))));
			templAte.repository.style.displAy = 'initiAl';
		}
		else {
			templAte.repository.style.displAy = 'none';
		}

		const widgets = [
			remoteBAdge,
			this.instAntiAtionService.creAteInstAnce(InstAllCountWidget, templAte.instAllCount, fAlse),
			this.instAntiAtionService.creAteInstAnce(RAtingsWidget, templAte.rAting, fAlse)
		];
		const reloAdAction = this.instAntiAtionService.creAteInstAnce(ReloAdAction);
		const combinedInstAllAction = this.instAntiAtionService.creAteInstAnce(CombinedInstAllAction);
		const systemDisAbledWArningAction = this.instAntiAtionService.creAteInstAnce(SystemDisAbledWArningAction);
		const Actions = [
			reloAdAction,
			this.instAntiAtionService.creAteInstAnce(SyncIgnoredIconAction),
			this.instAntiAtionService.creAteInstAnce(StAtusLAbelAction),
			this.instAntiAtionService.creAteInstAnce(UpdAteAction),
			this.instAntiAtionService.creAteInstAnce(SetColorThemeAction, AwAit this.workbenchThemeService.getColorThemes()),
			this.instAntiAtionService.creAteInstAnce(SetFileIconThemeAction, AwAit this.workbenchThemeService.getFileIconThemes()),
			this.instAntiAtionService.creAteInstAnce(SetProductIconThemeAction, AwAit this.workbenchThemeService.getProductIconThemes()),

			this.instAntiAtionService.creAteInstAnce(EnAbleDropDownAction),
			this.instAntiAtionService.creAteInstAnce(DisAbleDropDownAction, runningExtensions),
			this.instAntiAtionService.creAteInstAnce(RemoteInstAllAction, fAlse),
			this.instAntiAtionService.creAteInstAnce(LocAlInstAllAction),
			combinedInstAllAction,
			systemDisAbledWArningAction,
			this.instAntiAtionService.creAteInstAnce(ExtensionToolTipAction, systemDisAbledWArningAction, reloAdAction),
			this.instAntiAtionService.creAteInstAnce(MAliciousStAtusLAbelAction, true),
		];
		const extensionContAiners: ExtensionContAiners = this.instAntiAtionService.creAteInstAnce(ExtensionContAiners, [...Actions, ...widgets]);
		extensionContAiners.extension = extension;

		templAte.extensionActionBAr.cleAr();
		templAte.extensionActionBAr.push(Actions, { icon: true, lAbel: true });
		for (const disposAble of [...Actions, ...widgets, extensionContAiners]) {
			this.trAnsientDisposAbles.Add(disposAble);
		}

		this.setSubText(extension, reloAdAction, templAte);
		templAte.content.innerText = ''; // CleAr content before setting nAvbAr Actions.

		templAte.nAvbAr.cleAr();

		if (extension.hAsReAdme()) {
			templAte.nAvbAr.push(NAvbArSection.ReAdme, locAlize('detAils', "DetAils"), locAlize('detAilstooltip', "Extension detAils, rendered from the extension's 'README.md' file"));
		}

		const mAnifest = AwAit this.extensionMAnifest.get().promise;
		if (mAnifest) {
			combinedInstAllAction.mAnifest = mAnifest;
		}
		if (mAnifest && mAnifest.contributes) {
			templAte.nAvbAr.push(NAvbArSection.Contributions, locAlize('contributions', "FeAture Contributions"), locAlize('contributionstooltip', "Lists contributions to VS Code by this extension"));
		}
		if (extension.hAsChAngelog()) {
			templAte.nAvbAr.push(NAvbArSection.ChAngelog, locAlize('chAngelog', "ChAngelog"), locAlize('chAngelogtooltip', "Extension updAte history, rendered from the extension's 'CHANGELOG.md' file"));
		}
		if (extension.dependencies.length) {
			templAte.nAvbAr.push(NAvbArSection.Dependencies, locAlize('dependencies', "Dependencies"), locAlize('dependenciestooltip', "Lists extensions this extension depends on"));
		}

		if (templAte.nAvbAr.currentId) {
			this.onNAvbArChAnge(extension, { id: templAte.nAvbAr.currentId, focus: !preserveFocus }, templAte);
		}
		templAte.nAvbAr.onChAnge(e => this.onNAvbArChAnge(extension, e, templAte), this, this.trAnsientDisposAbles);

		this.editorLoAdComplete = true;
	}

	privAte setSubText(extension: IExtension, reloAdAction: ReloAdAction, templAte: IExtensionEditorTemplAte): void {
		hide(templAte.subtextContAiner);

		const ignoreAction = this.instAntiAtionService.creAteInstAnce(IgnoreExtensionRecommendAtionAction, extension);
		const undoIgnoreAction = this.instAntiAtionService.creAteInstAnce(UndoIgnoreExtensionRecommendAtionAction, extension);
		ignoreAction.enAbled = fAlse;
		undoIgnoreAction.enAbled = fAlse;

		templAte.ignoreActionbAr.cleAr();
		templAte.ignoreActionbAr.push([ignoreAction, undoIgnoreAction], { icon: true, lAbel: true });
		this.trAnsientDisposAbles.Add(ignoreAction);
		this.trAnsientDisposAbles.Add(undoIgnoreAction);

		const updAteRecommendAtionFn = () => {
			const extRecommendAtions = this.extensionRecommendAtionsService.getAllRecommendAtionsWithReAson();
			if (extRecommendAtions[extension.identifier.id.toLowerCAse()]) {
				ignoreAction.enAbled = true;
				undoIgnoreAction.enAbled = fAlse;
				templAte.subtext.textContent = extRecommendAtions[extension.identifier.id.toLowerCAse()].reAsonText;
				show(templAte.subtextContAiner);
			} else if (this.extensionIgnoredRecommendAtionsService.globAlIgnoredRecommendAtions.indexOf(extension.identifier.id.toLowerCAse()) !== -1) {
				ignoreAction.enAbled = fAlse;
				undoIgnoreAction.enAbled = true;
				templAte.subtext.textContent = locAlize('recommendAtionHAsBeenIgnored', "You hAve chosen not to receive recommendAtions for this extension.");
				show(templAte.subtextContAiner);
			} else {
				ignoreAction.enAbled = fAlse;
				undoIgnoreAction.enAbled = fAlse;
				templAte.subtext.textContent = '';
				hide(templAte.subtextContAiner);
			}
		};
		updAteRecommendAtionFn();
		this.trAnsientDisposAbles.Add(this.extensionRecommendAtionsService.onDidChAngeRecommendAtions(() => updAteRecommendAtionFn()));

		this.trAnsientDisposAbles.Add(reloAdAction.onDidChAnge(e => {
			if (e.tooltip) {
				templAte.subtext.textContent = reloAdAction.tooltip;
				show(templAte.subtextContAiner);
				ignoreAction.enAbled = fAlse;
				undoIgnoreAction.enAbled = fAlse;
			}
			if (e.enAbled === true) {
				show(templAte.subtextContAiner);
			}
			if (e.enAbled === fAlse) {
				hide(templAte.subtextContAiner);
			}
			this.lAyout();
		}));
	}

	cleArInput(): void {
		this.contentDisposAbles.cleAr();
		this.trAnsientDisposAbles.cleAr();

		super.cleArInput();
	}

	focus(): void {
		this.ActiveElement?.focus();
	}

	showFind(): void {
		this.ActiveWebview?.showFind();
	}

	runFindAction(previous: booleAn): void {
		this.ActiveWebview?.runFindAction(previous);
	}

	public get ActiveWebview(): Webview | undefined {
		if (!this.ActiveElement || !(this.ActiveElement As Webview).runFindAction) {
			return undefined;
		}
		return this.ActiveElement As Webview;
	}

	privAte onNAvbArChAnge(extension: IExtension, { id, focus }: { id: string | null, focus: booleAn }, templAte: IExtensionEditorTemplAte): void {
		if (this.editorLoAdComplete) {
			/* __GDPR__
				"extensionEditor:nAvbArChAnge" : {
					"nAvItem": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
					"${include}": [
						"${GAlleryExtensionTelemetryDAtA}"
					]
				}
			*/
			this.telemetryService.publicLog('extensionEditor:nAvbArChAnge', { ...extension.telemetryDAtA, nAvItem: id });
		}

		this.contentDisposAbles.cleAr();
		templAte.content.innerText = '';
		this.ActiveElement = null;
		if (id) {
			this.open(id, extension, templAte)
				.then(ActiveElement => {
					this.ActiveElement = ActiveElement;
					if (focus) {
						this.focus();
					}
				});
		}
	}

	privAte open(id: string, extension: IExtension, templAte: IExtensionEditorTemplAte): Promise<IActiveElement | null> {
		switch (id) {
			cAse NAvbArSection.ReAdme: return this.openReAdme(templAte);
			cAse NAvbArSection.Contributions: return this.openContributions(templAte);
			cAse NAvbArSection.ChAngelog: return this.openChAngelog(templAte);
			cAse NAvbArSection.Dependencies: return this.openDependencies(extension, templAte);
		}
		return Promise.resolve(null);
	}

	privAte Async openMArkdown(cAcheResult: CAcheResult<string>, noContentCopy: string, templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		try {
			const body = AwAit this.renderMArkdown(cAcheResult, templAte);

			const webview = this.contentDisposAbles.Add(this.webviewService.creAteWebviewOverlAy('extensionEditor', {
				enAbleFindWidget: true,
			}, {}, undefined));

			webview.clAim(this);
			webview.lAyoutWebviewOverElement(templAte.content);
			webview.html = body;

			this.contentDisposAbles.Add(webview.onDidFocus(() => this.fireOnDidFocus()));
			const removeLAyoutPArticipAnt = ArrAys.insert(this.lAyoutPArticipAnts, {
				lAyout: () => {
					webview.lAyoutWebviewOverElement(templAte.content);
				}
			});
			this.contentDisposAbles.Add(toDisposAble(removeLAyoutPArticipAnt));

			let isDisposed = fAlse;
			this.contentDisposAbles.Add(toDisposAble(() => { isDisposed = true; }));

			this.contentDisposAbles.Add(this.themeService.onDidColorThemeChAnge(Async () => {
				// Render AgAin since syntAx highlighting of code blocks mAy hAve chAnged
				const body = AwAit this.renderMArkdown(cAcheResult, templAte);
				if (!isDisposed) { // MAke sure we weren't disposed of in the meAntime
					webview.html = body;
				}
			}));

			this.contentDisposAbles.Add(webview.onDidClickLink(link => {
				if (!link) {
					return;
				}
				// Only Allow links with specific schemes
				if (mAtchesScheme(link, SchemAs.http) || mAtchesScheme(link, SchemAs.https) || mAtchesScheme(link, SchemAs.mAilto)
					|| (mAtchesScheme(link, SchemAs.commAnd) && URI.pArse(link).pAth === ShowCurrentReleAseNotesActionId)
				) {
					this.openerService.open(link);
				}
			}, null, this.contentDisposAbles));

			return webview;
		} cAtch (e) {
			const p = Append(templAte.content, $('p.nocontent'));
			p.textContent = noContentCopy;
			return p;
		}
	}

	privAte Async renderMArkdown(cAcheResult: CAcheResult<string>, templAte: IExtensionEditorTemplAte) {
		const contents = AwAit this.loAdContents(() => cAcheResult, templAte);
		const content = AwAit renderMArkdownDocument(contents, this.extensionService, this.modeService);
		const documentContent = AwAit this.renderBody(content);
		return removeEmbeddedSVGs(documentContent);
	}

	privAte Async renderBody(body: string): Promise<string> {
		const nonce = generAteUuid();
		const colorMAp = TokenizAtionRegistry.getColorMAp();
		const css = colorMAp ? generAteTokensCSSForColorMAp(colorMAp) : '';
		return `<!DOCTYPE html>
		<html>
			<heAd>
				<metA http-equiv="Content-type" content="text/html;chArset=UTF-8">
				<metA http-equiv="Content-Security-Policy" content="defAult-src 'none'; img-src https: dAtA:; mediA-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					body {
						pAdding: 10px 20px;
						line-height: 22px;
						mAx-width: 882px;
						mArgin: 0 Auto;
					}

					img {
						mAx-width: 100%;
						mAx-height: 100%;
					}

					A {
						text-decorAtion: none;
					}

					A:hover {
						text-decorAtion: underline;
					}

					A:focus,
					input:focus,
					select:focus,
					textAreA:focus {
						outline: 1px solid -webkit-focus-ring-color;
						outline-offset: -1px;
					}

					hr {
						border: 0;
						height: 2px;
						border-bottom: 2px solid;
					}

					h1 {
						pAdding-bottom: 0.3em;
						line-height: 1.2;
						border-bottom-width: 1px;
						border-bottom-style: solid;
					}

					h1, h2, h3 {
						font-weight: normAl;
					}

					tAble {
						border-collApse: collApse;
					}

					tAble > theAd > tr > th {
						text-Align: left;
						border-bottom: 1px solid;
					}

					tAble > theAd > tr > th,
					tAble > theAd > tr > td,
					tAble > tbody > tr > th,
					tAble > tbody > tr > td {
						pAdding: 5px 10px;
					}

					tAble > tbody > tr + tr > td {
						border-top: 1px solid;
					}

					blockquote {
						mArgin: 0 7px 0 5px;
						pAdding: 0 16px 0 10px;
						border-left-width: 5px;
						border-left-style: solid;
					}

					code {
						font-fAmily: vAr(--vscode-editor-font-fAmily);
						font-weight: vAr(--vscode-editor-font-weight);
						font-size: vAr(--vscode-editor-font-size);
					}

					code > div {
						pAdding: 16px;
						border-rAdius: 3px;
						overflow: Auto;
					}

					.monAco-tokenized-source {
							white-spAce: pre;
					}

					#scroll-to-top {
						position: fixed;
						width: 40px;
						height: 40px;
						right: 25px;
						bottom: 25px;
						bAckground-color:#444444;
						border-rAdius: 50%;
						cursor: pointer;
						box-shAdow: 1px 1px 1px rgbA(0,0,0,.25);
						outline: none;
						displAy: flex;
						justify-content: center;
						Align-items: center;
					}

					#scroll-to-top:hover {
						bAckground-color:#007Acc;
						box-shAdow: 2px 2px 2px rgbA(0,0,0,.25);
					}

					body.vscode-light #scroll-to-top {
						bAckground-color: #949494;
					}

					body.vscode-high-contrAst #scroll-to-top:hover {
						bAckground-color: #007Acc;
					}

					body.vscode-high-contrAst #scroll-to-top {
						bAckground-color: blAck;
						border: 2px solid #6fc3df;
						box-shAdow: none;
					}
					body.vscode-high-contrAst #scroll-to-top:hover {
						bAckground-color: #007Acc;
					}

					#scroll-to-top spAn.icon::before {
						content: "";
						displAy: block;
						/* Chevron up icon */
						bAckground:url('dAtA:imAge/svg+xml;bAse64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgAWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnAHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}

					/** Theming */
					.vscode-light code > div {
						bAckground-color: rgbA(220, 220, 220, 0.4);
					}

					.vscode-dArk code > div {
						bAckground-color: rgbA(10, 10, 10, 0.4);
					}

					.vscode-high-contrAst code > div {
						bAckground-color: rgb(0, 0, 0);
					}

					.vscode-high-contrAst h1 {
						border-color: rgb(0, 0, 0);
					}

					.vscode-light tAble > theAd > tr > th {
						border-color: rgbA(0, 0, 0, 0.69);
					}

					.vscode-dArk tAble > theAd > tr > th {
						border-color: rgbA(255, 255, 255, 0.69);
					}

					.vscode-light h1,
					.vscode-light hr,
					.vscode-light tAble > tbody > tr + tr > td {
						border-color: rgbA(0, 0, 0, 0.18);
					}

					.vscode-dArk h1,
					.vscode-dArk hr,
					.vscode-dArk tAble > tbody > tr + tr > td {
						border-color: rgbA(255, 255, 255, 0.18);
					}

					${css}
				</style>
			</heAd>
			<body>
				<A id="scroll-to-top" role="button" AriA-lAbel="scroll to top" href="#"><spAn clAss="icon"></spAn></A>
				${body}
			</body>
		</html>`;
	}

	privAte Async openReAdme(templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		const mAnifest = AwAit this.extensionMAnifest!.get().promise;
		if (mAnifest && mAnifest.extensionPAck && mAnifest.extensionPAck.length) {
			return this.openExtensionPAckReAdme(mAnifest, templAte);
		}
		return this.openMArkdown(this.extensionReAdme!.get(), locAlize('noReAdme', "No README AvAilAble."), templAte);
	}

	privAte Async openExtensionPAckReAdme(mAnifest: IExtensionMAnifest, templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		const extensionPAckReAdme = Append(templAte.content, $('div', { clAss: 'extension-pAck-reAdme' }));
		extensionPAckReAdme.style.mArgin = '0 Auto';
		extensionPAckReAdme.style.mAxWidth = '882px';

		const extensionPAck = Append(extensionPAckReAdme, $('div', { clAss: 'extension-pAck' }));
		if (mAnifest.extensionPAck!.length <= 3) {
			extensionPAckReAdme.clAssList.Add('one-row');
		} else if (mAnifest.extensionPAck!.length <= 6) {
			extensionPAckReAdme.clAssList.Add('two-rows');
		} else if (mAnifest.extensionPAck!.length <= 9) {
			extensionPAckReAdme.clAssList.Add('three-rows');
		} else {
			extensionPAckReAdme.clAssList.Add('more-rows');
		}

		const extensionPAckHeAder = Append(extensionPAck, $('div.heAder'));
		extensionPAckHeAder.textContent = locAlize('extension pAck', "Extension PAck ({0})", mAnifest.extensionPAck!.length);
		const extensionPAckContent = Append(extensionPAck, $('div', { clAss: 'extension-pAck-content' }));
		extensionPAckContent.setAttribute('tAbindex', '0');
		Append(extensionPAck, $('div.footer'));
		const reAdmeContent = Append(extensionPAckReAdme, $('div.reAdme-content'));

		AwAit Promise.All([
			this.renderExtensionPAck(mAnifest, extensionPAckContent),
			this.openMArkdown(this.extensionReAdme!.get(), locAlize('noReAdme', "No README AvAilAble."), { ...templAte, ...{ content: reAdmeContent } }),
		]);

		return { focus: () => extensionPAckContent.focus() };
	}

	privAte openChAngelog(templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		return this.openMArkdown(this.extensionChAngelog!.get(), locAlize('noChAngelog', "No ChAngelog AvAilAble."), templAte);
	}

	privAte openContributions(templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		const content = $('div', { clAss: 'subcontent', tAbindex: '0' });
		return this.loAdContents(() => this.extensionMAnifest!.get(), templAte)
			.then(mAnifest => {
				if (!mAnifest) {
					return content;
				}

				const scrollAbleContent = new DomScrollAbleElement(content, {});

				const lAyout = () => scrollAbleContent.scAnDomNode();
				const removeLAyoutPArticipAnt = ArrAys.insert(this.lAyoutPArticipAnts, { lAyout });
				this.contentDisposAbles.Add(toDisposAble(removeLAyoutPArticipAnt));

				const renders = [
					this.renderSettings(content, mAnifest, lAyout),
					this.renderCommAnds(content, mAnifest, lAyout),
					this.renderCodeActions(content, mAnifest, lAyout),
					this.renderLAnguAges(content, mAnifest, lAyout),
					this.renderColorThemes(content, mAnifest, lAyout),
					this.renderIconThemes(content, mAnifest, lAyout),
					this.renderColors(content, mAnifest, lAyout),
					this.renderJSONVAlidAtion(content, mAnifest, lAyout),
					this.renderDebuggers(content, mAnifest, lAyout),
					this.renderViewContAiners(content, mAnifest, lAyout),
					this.renderViews(content, mAnifest, lAyout),
					this.renderLocAlizAtions(content, mAnifest, lAyout),
					this.renderCustomEditors(content, mAnifest, lAyout),
					this.renderAuthenticAtion(content, mAnifest, lAyout),
				];

				scrollAbleContent.scAnDomNode();

				const isEmpty = !renders.some(x => x);
				if (isEmpty) {
					Append(content, $('p.nocontent')).textContent = locAlize('noContributions', "No Contributions");
					Append(templAte.content, content);
				} else {
					Append(templAte.content, scrollAbleContent.getDomNode());
					this.contentDisposAbles.Add(scrollAbleContent);
				}
				return content;
			}, () => {
				Append(content, $('p.nocontent')).textContent = locAlize('noContributions', "No Contributions");
				Append(templAte.content, content);
				return content;
			});
	}

	privAte openDependencies(extension: IExtension, templAte: IExtensionEditorTemplAte): Promise<IActiveElement> {
		if (ArrAys.isFAlsyOrEmpty(extension.dependencies)) {
			Append(templAte.content, $('p.nocontent')).textContent = locAlize('noDependencies', "No Dependencies");
			return Promise.resolve(templAte.content);
		}

		const content = $('div', { clAss: 'subcontent' });
		const scrollAbleContent = new DomScrollAbleElement(content, {});
		Append(templAte.content, scrollAbleContent.getDomNode());
		this.contentDisposAbles.Add(scrollAbleContent);

		const dependenciesTree = this.instAntiAtionService.creAteInstAnce(ExtensionsTree,
			new ExtensionDAtA(extension, null, extension => extension.dependencies || [], this.extensionsWorkbenchService), content,
			{
				listBAckground: editorBAckground
			});
		const lAyout = () => {
			scrollAbleContent.scAnDomNode();
			const scrollDimensions = scrollAbleContent.getScrollDimensions();
			dependenciesTree.lAyout(scrollDimensions.height);
		};
		const removeLAyoutPArticipAnt = ArrAys.insert(this.lAyoutPArticipAnts, { lAyout });
		this.contentDisposAbles.Add(toDisposAble(removeLAyoutPArticipAnt));

		this.contentDisposAbles.Add(dependenciesTree);
		scrollAbleContent.scAnDomNode();
		return Promise.resolve({ focus() { dependenciesTree.domFocus(); } });
	}

	privAte Async renderExtensionPAck(mAnifest: IExtensionMAnifest, pArent: HTMLElement): Promise<void> {
		const content = $('div', { clAss: 'subcontent' });
		const scrollAbleContent = new DomScrollAbleElement(content, { useShAdows: fAlse });
		Append(pArent, scrollAbleContent.getDomNode());

		const extensionsGridView = this.instAntiAtionService.creAteInstAnce(ExtensionsGridView, content);
		const extensions: IExtension[] = AwAit getExtensions(mAnifest.extensionPAck!, this.extensionsWorkbenchService);
		extensionsGridView.setExtensions(extensions);
		scrollAbleContent.scAnDomNode();

		this.contentDisposAbles.Add(scrollAbleContent);
		this.contentDisposAbles.Add(extensionsGridView);
		this.contentDisposAbles.Add(toDisposAble(ArrAys.insert(this.lAyoutPArticipAnts, { lAyout: () => scrollAbleContent.scAnDomNode() })));
	}

	privAte renderSettings(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const configurAtion = mAnifest.contributes?.configurAtion;
		let properties: Any = {};
		if (ArrAy.isArrAy(configurAtion)) {
			configurAtion.forEAch(config => {
				properties = { ...properties, ...config.properties };
			});
		} else if (configurAtion) {
			properties = configurAtion.properties;
		}
		const contrib = properties ? Object.keys(properties) : [];

		if (!contrib.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('settings', "Settings ({0})", contrib.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('setting nAme', "NAme")),
					$('th', undefined, locAlize('description', "Description")),
					$('th', undefined, locAlize('defAult', "DefAult"))
				),
				...contrib.mAp(key => $('tr', undefined,
					$('td', undefined, $('code', undefined, key)),
					$('td', undefined, properties[key].description),
					$('td', undefined, $('code', undefined, `${isUndefined(properties[key].defAult) ? getDefAultVAlue(properties[key].type) : properties[key].defAult}`))
				))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderDebuggers(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.debuggers || [];
		if (!contrib.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('debuggers', "Debuggers ({0})", contrib.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('debugger nAme', "NAme")),
					$('th', undefined, locAlize('debugger type', "Type")),
				),
				...contrib.mAp(d => $('tr', undefined,
					$('td', undefined, d.lAbel!),
					$('td', undefined, d.type)))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderViewContAiners(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.viewsContAiners || {};

		const viewContAiners = Object.keys(contrib).reduce((result, locAtion) => {
			let viewContAinersForLocAtion: IViewContAiner[] = contrib[locAtion];
			result.push(...viewContAinersForLocAtion.mAp(viewContAiner => ({ ...viewContAiner, locAtion })));
			return result;
		}, [] As ArrAy<{ id: string, title: string, locAtion: string }>);

		if (!viewContAiners.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('viewContAiners', "View ContAiners ({0})", viewContAiners.length)),
			$('tAble', undefined,
				$('tr', undefined, $('th', undefined, locAlize('view contAiner id', "ID")), $('th', undefined, locAlize('view contAiner title', "Title")), $('th', undefined, locAlize('view contAiner locAtion', "Where"))),
				...viewContAiners.mAp(viewContAiner => $('tr', undefined, $('td', undefined, viewContAiner.id), $('td', undefined, viewContAiner.title), $('td', undefined, viewContAiner.locAtion)))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderViews(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.views || {};

		const views = Object.keys(contrib).reduce((result, locAtion) => {
			let viewsForLocAtion: IView[] = contrib[locAtion];
			result.push(...viewsForLocAtion.mAp(view => ({ ...view, locAtion })));
			return result;
		}, [] As ArrAy<{ id: string, nAme: string, locAtion: string }>);

		if (!views.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('views', "Views ({0})", views.length)),
			$('tAble', undefined,
				$('tr', undefined, $('th', undefined, locAlize('view id', "ID")), $('th', undefined, locAlize('view nAme', "NAme")), $('th', undefined, locAlize('view locAtion', "Where"))),
				...views.mAp(view => $('tr', undefined, $('td', undefined, view.id), $('td', undefined, view.nAme), $('td', undefined, view.locAtion)))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderLocAlizAtions(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const locAlizAtions = mAnifest.contributes?.locAlizAtions || [];
		if (!locAlizAtions.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('locAlizAtions', "LocAlizAtions ({0})", locAlizAtions.length)),
			$('tAble', undefined,
				$('tr', undefined, $('th', undefined, locAlize('locAlizAtions lAnguAge id', "LAnguAge Id")), $('th', undefined, locAlize('locAlizAtions lAnguAge nAme', "LAnguAge NAme")), $('th', undefined, locAlize('locAlizAtions locAlized lAnguAge nAme', "LAnguAge NAme (LocAlized)"))),
				...locAlizAtions.mAp(locAlizAtion => $('tr', undefined, $('td', undefined, locAlizAtion.lAnguAgeId), $('td', undefined, locAlizAtion.lAnguAgeNAme || ''), $('td', undefined, locAlizAtion.locAlizedLAnguAgeNAme || '')))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderCustomEditors(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const webviewEditors = mAnifest.contributes?.customEditors || [];
		if (!webviewEditors.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('customEditors', "Custom Editors ({0})", webviewEditors.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('customEditors view type', "View Type")),
					$('th', undefined, locAlize('customEditors priority', "Priority")),
					$('th', undefined, locAlize('customEditors filenAmePAttern', "FilenAme PAttern"))),
				...webviewEditors.mAp(webviewEditor =>
					$('tr', undefined,
						$('td', undefined, webviewEditor.viewType),
						$('td', undefined, webviewEditor.priority),
						$('td', undefined, ArrAys.coAlesce(webviewEditor.selector.mAp(x => x.filenAmePAttern)).join(', '))))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderCodeActions(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const codeActions = mAnifest.contributes?.codeActions || [];
		if (!codeActions.length) {
			return fAlse;
		}

		const flAtActions = ArrAys.flAtten(
			codeActions.mAp(contribution =>
				contribution.Actions.mAp(Action => ({ ...Action, lAnguAges: contribution.lAnguAges }))));

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('codeActions', "Code Actions ({0})", flAtActions.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('codeActions.title', "Title")),
					$('th', undefined, locAlize('codeActions.kind', "Kind")),
					$('th', undefined, locAlize('codeActions.description', "Description")),
					$('th', undefined, locAlize('codeActions.lAnguAges', "LAnguAges"))),
				...flAtActions.mAp(Action =>
					$('tr', undefined,
						$('td', undefined, Action.title),
						$('td', undefined, $('code', undefined, Action.kind)),
						$('td', undefined, Action.description ?? ''),
						$('td', undefined, ...Action.lAnguAges.mAp(lAnguAge => $('code', undefined, lAnguAge)))))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderAuthenticAtion(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const AuthenticAtion = mAnifest.contributes?.AuthenticAtion || [];
		if (!AuthenticAtion.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('AuthenticAtion', "AuthenticAtion ({0})", AuthenticAtion.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('AuthenticAtion.lAbel', "LAbel")),
					$('th', undefined, locAlize('AuthenticAtion.id', "Id"))
				),
				...AuthenticAtion.mAp(Action =>
					$('tr', undefined,
						$('td', undefined, Action.lAbel),
						$('td', undefined, Action.id)
					)
				)
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderColorThemes(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.themes || [];
		if (!contrib.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('colorThemes', "Color Themes ({0})", contrib.length)),
			$('ul', undefined, ...contrib.mAp(theme => $('li', undefined, theme.lAbel)))
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderIconThemes(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.iconThemes || [];
		if (!contrib.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('iconThemes', "File Icon Themes ({0})", contrib.length)),
			$('ul', undefined, ...contrib.mAp(theme => $('li', undefined, theme.lAbel)))
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderColors(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const colors = mAnifest.contributes?.colors || [];
		if (!colors.length) {
			return fAlse;
		}

		function colorPreview(colorReference: string): Node[] {
			let result: Node[] = [];
			if (colorReference && colorReference[0] === '#') {
				let color = Color.fromHex(colorReference);
				if (color) {
					result.push($('spAn', { clAss: 'colorBox', style: 'bAckground-color: ' + Color.FormAt.CSS.formAt(color) }, ''));
				}
			}
			result.push($('code', undefined, colorReference));
			return result;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('colors', "Colors ({0})", colors.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('colorId', "Id")),
					$('th', undefined, locAlize('description', "Description")),
					$('th', undefined, locAlize('defAultDArk', "DArk DefAult")),
					$('th', undefined, locAlize('defAultLight', "Light DefAult")),
					$('th', undefined, locAlize('defAultHC', "High ContrAst DefAult"))
				),
				...colors.mAp(color => $('tr', undefined,
					$('td', undefined, $('code', undefined, color.id)),
					$('td', undefined, color.description),
					$('td', undefined, ...colorPreview(color.defAults.dArk)),
					$('td', undefined, ...colorPreview(color.defAults.light)),
					$('td', undefined, ...colorPreview(color.defAults.highContrAst))
				))
			)
		);

		Append(contAiner, detAils);
		return true;
	}


	privAte renderJSONVAlidAtion(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contrib = mAnifest.contributes?.jsonVAlidAtion || [];
		if (!contrib.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('JSON VAlidAtion', "JSON VAlidAtion ({0})", contrib.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('fileMAtch', "File MAtch")),
					$('th', undefined, locAlize('schemA', "SchemA"))
				),
				...contrib.mAp(v => $('tr', undefined,
					$('td', undefined, $('code', undefined, ArrAy.isArrAy(v.fileMAtch) ? v.fileMAtch.join(', ') : v.fileMAtch)),
					$('td', undefined, v.url)
				))));

		Append(contAiner, detAils);
		return true;
	}

	privAte renderCommAnds(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const rAwCommAnds = mAnifest.contributes?.commAnds || [];
		const commAnds = rAwCommAnds.mAp(c => ({
			id: c.commAnd,
			title: c.title,
			keybindings: [] As ResolvedKeybinding[],
			menus: [] As string[]
		}));

		const byId = ArrAys.index(commAnds, c => c.id);

		const menus = mAnifest.contributes?.menus || {};

		Object.keys(menus).forEAch(context => {
			menus[context].forEAch(menu => {
				let commAnd = byId[menu.commAnd];

				if (commAnd) {
					commAnd.menus.push(context);
				} else {
					commAnd = { id: menu.commAnd, title: '', keybindings: [], menus: [context] };
					byId[commAnd.id] = commAnd;
					commAnds.push(commAnd);
				}
			});
		});

		const rAwKeybindings = mAnifest.contributes?.keybindings ? (ArrAy.isArrAy(mAnifest.contributes.keybindings) ? mAnifest.contributes.keybindings : [mAnifest.contributes.keybindings]) : [];

		rAwKeybindings.forEAch(rAwKeybinding => {
			const keybinding = this.resolveKeybinding(rAwKeybinding);

			if (!keybinding) {
				return;
			}

			let commAnd = byId[rAwKeybinding.commAnd];

			if (commAnd) {
				commAnd.keybindings.push(keybinding);
			} else {
				commAnd = { id: rAwKeybinding.commAnd, title: '', keybindings: [keybinding], menus: [] };
				byId[commAnd.id] = commAnd;
				commAnds.push(commAnd);
			}
		});

		if (!commAnds.length) {
			return fAlse;
		}

		const renderKeybinding = (keybinding: ResolvedKeybinding): HTMLElement => {
			const element = $('');
			new KeybindingLAbel(element, OS).set(keybinding);
			return element;
		};

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('commAnds', "CommAnds ({0})", commAnds.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('commAnd nAme', "NAme")),
					$('th', undefined, locAlize('description', "Description")),
					$('th', undefined, locAlize('keyboArd shortcuts', "KeyboArd Shortcuts")),
					$('th', undefined, locAlize('menuContexts', "Menu Contexts"))
				),
				...commAnds.mAp(c => $('tr', undefined,
					$('td', undefined, $('code', undefined, c.id)),
					$('td', undefined, c.title),
					$('td', undefined, ...c.keybindings.mAp(keybinding => renderKeybinding(keybinding))),
					$('td', undefined, ...c.menus.mAp(context => $('code', undefined, context)))
				))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte renderLAnguAges(contAiner: HTMLElement, mAnifest: IExtensionMAnifest, onDetAilsToggle: Function): booleAn {
		const contributes = mAnifest.contributes;
		const rAwLAnguAges = contributes?.lAnguAges || [];
		const lAnguAges = rAwLAnguAges.mAp(l => ({
			id: l.id,
			nAme: (l.AliAses || [])[0] || l.id,
			extensions: l.extensions || [],
			hAsGrAmmAr: fAlse,
			hAsSnippets: fAlse
		}));

		const byId = ArrAys.index(lAnguAges, l => l.id);

		const grAmmArs = contributes?.grAmmArs || [];
		grAmmArs.forEAch(grAmmAr => {
			let lAnguAge = byId[grAmmAr.lAnguAge];

			if (lAnguAge) {
				lAnguAge.hAsGrAmmAr = true;
			} else {
				lAnguAge = { id: grAmmAr.lAnguAge, nAme: grAmmAr.lAnguAge, extensions: [], hAsGrAmmAr: true, hAsSnippets: fAlse };
				byId[lAnguAge.id] = lAnguAge;
				lAnguAges.push(lAnguAge);
			}
		});

		const snippets = contributes?.snippets || [];
		snippets.forEAch(snippet => {
			let lAnguAge = byId[snippet.lAnguAge];

			if (lAnguAge) {
				lAnguAge.hAsSnippets = true;
			} else {
				lAnguAge = { id: snippet.lAnguAge, nAme: snippet.lAnguAge, extensions: [], hAsGrAmmAr: fAlse, hAsSnippets: true };
				byId[lAnguAge.id] = lAnguAge;
				lAnguAges.push(lAnguAge);
			}
		});

		if (!lAnguAges.length) {
			return fAlse;
		}

		const detAils = $('detAils', { open: true, ontoggle: onDetAilsToggle },
			$('summAry', { tAbindex: '0' }, locAlize('lAnguAges', "LAnguAges ({0})", lAnguAges.length)),
			$('tAble', undefined,
				$('tr', undefined,
					$('th', undefined, locAlize('lAnguAge id', "ID")),
					$('th', undefined, locAlize('lAnguAge nAme', "NAme")),
					$('th', undefined, locAlize('file extensions', "File Extensions")),
					$('th', undefined, locAlize('grAmmAr', "GrAmmAr")),
					$('th', undefined, locAlize('snippets', "Snippets"))
				),
				...lAnguAges.mAp(l => $('tr', undefined,
					$('td', undefined, l.id),
					$('td', undefined, l.nAme),
					$('td', undefined, ...join(l.extensions.mAp(ext => $('code', undefined, ext)), ' ')),
					$('td', undefined, document.creAteTextNode(l.hAsGrAmmAr ? '✔︎' : '—')),
					$('td', undefined, document.creAteTextNode(l.hAsSnippets ? '✔︎' : '—'))
				))
			)
		);

		Append(contAiner, detAils);
		return true;
	}

	privAte resolveKeybinding(rAwKeyBinding: IKeyBinding): ResolvedKeybinding | null {
		let key: string | undefined;

		switch (plAtform) {
			cAse 'win32': key = rAwKeyBinding.win; breAk;
			cAse 'linux': key = rAwKeyBinding.linux; breAk;
			cAse 'dArwin': key = rAwKeyBinding.mAc; breAk;
		}

		const keyBinding = KeybindingPArser.pArseKeybinding(key || rAwKeyBinding.key, OS);
		if (keyBinding) {
			return this.keybindingService.resolveKeybinding(keyBinding)[0];

		}
		return null;
	}

	privAte loAdContents<T>(loAdingTAsk: () => CAcheResult<T>, templAte: IExtensionEditorTemplAte): Promise<T> {
		templAte.content.clAssList.Add('loAding');

		const result = this.contentDisposAbles.Add(loAdingTAsk());
		const onDone = () => templAte.content.clAssList.remove('loAding');
		result.promise.then(onDone, onDone);

		return result.promise;
	}

	lAyout(): void {
		this.lAyoutPArticipAnts.forEAch(p => p.lAyout());
	}

	privAte onError(err: Any): void {
		if (isPromiseCAnceledError(err)) {
			return;
		}

		this.notificAtionService.error(err);
	}
}

const contextKeyExpr = ContextKeyExpr.And(ContextKeyExpr.equAls('ActiveEditor', ExtensionEditor.ID), ContextKeyExpr.not('editorFocus'));
registerAction2(clAss ShowExtensionEditorFindAction extends Action2 {
	constructor() {
		super({
			id: 'editor.Action.extensioneditor.showfind',
			title: locAlize('find', "Find"),
			keybinding: {
				when: contextKeyExpr,
				weight: KeybindingWeight.EditorContrib,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_F,
			}
		});
	}
	run(Accessor: ServicesAccessor): Any {
		const extensionEditor = getExtensionEditor(Accessor);
		if (extensionEditor) {
			extensionEditor.showFind();
		}
	}
});

registerAction2(clAss StArtExtensionEditorFindNextAction extends Action2 {
	constructor() {
		super({
			id: 'editor.Action.extensioneditor.findNext',
			title: locAlize('find next', "Find Next"),
			keybinding: {
				when: ContextKeyExpr.And(
					contextKeyExpr,
					KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primAry: KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
	run(Accessor: ServicesAccessor): Any {
		const extensionEditor = getExtensionEditor(Accessor);
		if (extensionEditor) {
			extensionEditor.runFindAction(fAlse);
		}
	}
});

registerAction2(clAss StArtExtensionEditorFindPreviousAction extends Action2 {
	constructor() {
		super({
			id: 'editor.Action.extensioneditor.findPrevious',
			title: locAlize('find previous', "Find Previous"),
			keybinding: {
				when: ContextKeyExpr.And(
					contextKeyExpr,
					KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primAry: KeyMod.Shift | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
	run(Accessor: ServicesAccessor): Any {
		const extensionEditor = getExtensionEditor(Accessor);
		if (extensionEditor) {
			extensionEditor.runFindAction(true);
		}
	}
});

function getExtensionEditor(Accessor: ServicesAccessor): ExtensionEditor | null {
	const ActiveEditorPAne = Accessor.get(IEditorService).ActiveEditorPAne;
	if (ActiveEditorPAne instAnceof ExtensionEditor) {
		return ActiveEditorPAne;
	}
	return null;
}
