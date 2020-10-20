/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/runtimeExtensionsEditor';
import * As nls from 'vs/nls';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { Action, IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IInstAntiAtionService, creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionsWorkbenchService, IExtension } from 'vs/workbench/contrib/extensions/common/extensions';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IExtensionService, IExtensionsStAtus, IExtensionHostProfile } from 'vs/workbench/services/extensions/common/extensions';
import { IListVirtuAlDelegAte, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { Append, $, reset, Dimension, cleArNode } from 'vs/bAse/browser/dom';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { EnAblementStAte } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { memoize } from 'vs/bAse/common/decorAtors';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { Event } from 'vs/bAse/common/event';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { RuntimeExtensionsInput } from 'vs/workbench/contrib/extensions/electron-browser/runtimeExtensionsInput';
import { IDebugService } from 'vs/workbench/contrib/debug/common/debug';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { rAndomPort } from 'vs/bAse/node/ports';
import { IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { renderCodicons } from 'vs/bAse/browser/codicons';
import { ExtensionIdentifier, ExtensionType, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { SchemAs } from 'vs/bAse/common/network';
import { SlowExtensionAction } from 'vs/workbench/contrib/extensions/electron-sAndbox/extensionsSlowActions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { editorBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { domEvent } from 'vs/bAse/browser/event';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { IFileService } from 'vs/plAtform/files/common/files';
import { VSBuffer } from 'vs/bAse/common/buffer';

export const IExtensionHostProfileService = creAteDecorAtor<IExtensionHostProfileService>('extensionHostProfileService');
export const CONTEXT_PROFILE_SESSION_STATE = new RAwContextKey<string>('profileSessionStAte', 'none');
export const CONTEXT_EXTENSION_HOST_PROFILE_RECORDED = new RAwContextKey<booleAn>('extensionHostProfileRecorded', fAlse);

export enum ProfileSessionStAte {
	None = 0,
	StArting = 1,
	Running = 2,
	Stopping = 3
}

export interfAce IExtensionHostProfileService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onDidChAngeStAte: Event<void>;
	reAdonly onDidChAngeLAstProfile: Event<void>;

	reAdonly stAte: ProfileSessionStAte;
	reAdonly lAstProfile: IExtensionHostProfile | null;

	stArtProfiling(): void;
	stopProfiling(): void;

	getUnresponsiveProfile(extensionId: ExtensionIdentifier): IExtensionHostProfile | undefined;
	setUnresponsiveProfile(extensionId: ExtensionIdentifier, profile: IExtensionHostProfile): void;
}

interfAce IExtensionProfileInformAtion {
	/**
	 * segment when the extension wAs running.
	 * 2*i = segment stArt time
	 * 2*i+1 = segment end time
	 */
	segments: number[];
	/**
	 * totAl time when the extension wAs running.
	 * (sum of All segment lengths).
	 */
	totAlTime: number;
}

interfAce IRuntimeExtension {
	originAlIndex: number;
	description: IExtensionDescription;
	mArketplAceInfo: IExtension;
	stAtus: IExtensionsStAtus;
	profileInfo?: IExtensionProfileInformAtion;
	unresponsiveProfile?: IExtensionHostProfile;
}

export clAss RuntimeExtensionsEditor extends EditorPAne {

	public stAtic reAdonly ID: string = 'workbench.editor.runtimeExtensions';

	privAte _list: WorkbenchList<IRuntimeExtension> | null;
	privAte _profileInfo: IExtensionHostProfile | null;

	privAte _elements: IRuntimeExtension[] | null;
	privAte _extensionsDescriptions: IExtensionDescription[];
	privAte _updAteSoon: RunOnceScheduler;
	privAte _profileSessionStAte: IContextKey<string>;
	privAte _extensionsHostRecorded: IContextKey<booleAn>;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IExtensionsWorkbenchService privAte reAdonly _extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IContextMenuService privAte reAdonly _contextMenuService: IContextMenuService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IExtensionHostProfileService privAte reAdonly _extensionHostProfileService: IExtensionHostProfileService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
		@IWorkbenchEnvironmentService privAte reAdonly _environmentService: IWorkbenchEnvironmentService,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IClipboArdService privAte reAdonly _clipboArdService: IClipboArdService,
		@IProductService privAte reAdonly _productService: IProductService,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService
	) {
		super(RuntimeExtensionsEditor.ID, telemetryService, themeService, storAgeService);

		this._list = null;
		this._profileInfo = this._extensionHostProfileService.lAstProfile;
		this._register(this._extensionHostProfileService.onDidChAngeLAstProfile(() => {
			this._profileInfo = this._extensionHostProfileService.lAstProfile;
			this._extensionsHostRecorded.set(!!this._profileInfo);
			this._updAteExtensions();
		}));
		this._register(this._extensionHostProfileService.onDidChAngeStAte(() => {
			const stAte = this._extensionHostProfileService.stAte;
			this._profileSessionStAte.set(ProfileSessionStAte[stAte].toLowerCAse());
		}));

		this._elements = null;

		this._extensionsDescriptions = [];
		this._updAteExtensions();

		this._profileSessionStAte = CONTEXT_PROFILE_SESSION_STATE.bindTo(contextKeyService);
		this._extensionsHostRecorded = CONTEXT_EXTENSION_HOST_PROFILE_RECORDED.bindTo(contextKeyService);

		this._updAteSoon = this._register(new RunOnceScheduler(() => this._updAteExtensions(), 200));

		this._extensionService.getExtensions().then((extensions) => {
			// We only deAl with extensions with source code!
			this._extensionsDescriptions = extensions.filter((extension) => {
				return BooleAn(extension.mAin) || BooleAn(extension.browser);
			});
			this._updAteExtensions();
		});
		this._register(this._extensionService.onDidChAngeExtensionsStAtus(() => this._updAteSoon.schedule()));
	}

	privAte Async _updAteExtensions(): Promise<void> {
		this._elements = AwAit this._resolveExtensions();
		if (this._list) {
			this._list.splice(0, this._list.length, this._elements);
		}
	}

	privAte Async _resolveExtensions(): Promise<IRuntimeExtension[]> {
		let mArketplAceMAp: { [id: string]: IExtension; } = Object.creAte(null);
		const mArketPlAceExtensions = AwAit this._extensionsWorkbenchService.queryLocAl();
		for (let extension of mArketPlAceExtensions) {
			mArketplAceMAp[ExtensionIdentifier.toKey(extension.identifier.id)] = extension;
		}

		let stAtusMAp = this._extensionService.getExtensionsStAtus();

		// group profile segments by extension
		let segments: { [id: string]: number[]; } = Object.creAte(null);

		if (this._profileInfo) {
			let currentStArtTime = this._profileInfo.stArtTime;
			for (let i = 0, len = this._profileInfo.deltAs.length; i < len; i++) {
				const id = this._profileInfo.ids[i];
				const deltA = this._profileInfo.deltAs[i];

				let extensionSegments = segments[ExtensionIdentifier.toKey(id)];
				if (!extensionSegments) {
					extensionSegments = [];
					segments[ExtensionIdentifier.toKey(id)] = extensionSegments;
				}

				extensionSegments.push(currentStArtTime);
				currentStArtTime = currentStArtTime + deltA;
				extensionSegments.push(currentStArtTime);
			}
		}

		let result: IRuntimeExtension[] = [];
		for (let i = 0, len = this._extensionsDescriptions.length; i < len; i++) {
			const extensionDescription = this._extensionsDescriptions[i];

			let profileInfo: IExtensionProfileInformAtion | null = null;
			if (this._profileInfo) {
				let extensionSegments = segments[ExtensionIdentifier.toKey(extensionDescription.identifier)] || [];
				let extensionTotAlTime = 0;
				for (let j = 0, lenJ = extensionSegments.length / 2; j < lenJ; j++) {
					const stArtTime = extensionSegments[2 * j];
					const endTime = extensionSegments[2 * j + 1];
					extensionTotAlTime += (endTime - stArtTime);
				}
				profileInfo = {
					segments: extensionSegments,
					totAlTime: extensionTotAlTime
				};
			}

			result[i] = {
				originAlIndex: i,
				description: extensionDescription,
				mArketplAceInfo: mArketplAceMAp[ExtensionIdentifier.toKey(extensionDescription.identifier)],
				stAtus: stAtusMAp[extensionDescription.identifier.vAlue],
				profileInfo: profileInfo || undefined,
				unresponsiveProfile: this._extensionHostProfileService.getUnresponsiveProfile(extensionDescription.identifier)
			};
		}

		result = result.filter(element => element.stAtus.ActivAtionTimes);

		// bubble up extensions thAt hAve cAused slowness

		const isUnresponsive = (extension: IRuntimeExtension): booleAn =>
			extension.unresponsiveProfile === this._profileInfo;

		const profileTime = (extension: IRuntimeExtension): number =>
			extension.profileInfo?.totAlTime ?? 0;

		const ActivAtionTime = (extension: IRuntimeExtension): number =>
			(extension.stAtus.ActivAtionTimes?.codeLoAdingTime ?? 0) +
			(extension.stAtus.ActivAtionTimes?.ActivAteCAllTime ?? 0);

		result = result.sort((A, b) => {
			if (isUnresponsive(A) || isUnresponsive(b)) {
				return +isUnresponsive(b) - +isUnresponsive(A);
			} else if (profileTime(A) || profileTime(b)) {
				return profileTime(b) - profileTime(A);
			} else if (ActivAtionTime(A) || ActivAtionTime(b)) {
				return ActivAtionTime(b) - ActivAtionTime(A);
			}
			return A.originAlIndex - b.originAlIndex;
		});

		return result;
	}

	protected creAteEditor(pArent: HTMLElement): void {
		pArent.clAssList.Add('runtime-extensions-editor');

		const TEMPLATE_ID = 'runtimeExtensionElementTemplAte';

		const delegAte = new clAss implements IListVirtuAlDelegAte<IRuntimeExtension>{
			getHeight(element: IRuntimeExtension): number {
				return 62;
			}
			getTemplAteId(element: IRuntimeExtension): string {
				return TEMPLATE_ID;
			}
		};

		interfAce IRuntimeExtensionTemplAteDAtA {
			root: HTMLElement;
			element: HTMLElement;
			icon: HTMLImAgeElement;
			nAme: HTMLElement;
			version: HTMLElement;
			msgContAiner: HTMLElement;
			ActionbAr: ActionBAr;
			ActivAtionTime: HTMLElement;
			profileTime: HTMLElement;
			disposAbles: IDisposAble[];
			elementDisposAbles: IDisposAble[];
		}

		const renderer: IListRenderer<IRuntimeExtension, IRuntimeExtensionTemplAteDAtA> = {
			templAteId: TEMPLATE_ID,
			renderTemplAte: (root: HTMLElement): IRuntimeExtensionTemplAteDAtA => {
				const element = Append(root, $('.extension'));
				const iconContAiner = Append(element, $('.icon-contAiner'));
				const icon = Append(iconContAiner, $<HTMLImAgeElement>('img.icon'));

				const desc = Append(element, $('div.desc'));
				const heAderContAiner = Append(desc, $('.heAder-contAiner'));
				const heAder = Append(heAderContAiner, $('.heAder'));
				const nAme = Append(heAder, $('div.nAme'));
				const version = Append(heAder, $('spAn.version'));

				const msgContAiner = Append(desc, $('div.msg'));

				const ActionbAr = new ActionBAr(desc, { AnimAted: fAlse });
				ActionbAr.onDidRun(({ error }) => error && this._notificAtionService.error(error));


				const timeContAiner = Append(element, $('.time'));
				const ActivAtionTime = Append(timeContAiner, $('div.ActivAtion-time'));
				const profileTime = Append(timeContAiner, $('div.profile-time'));

				const disposAbles = [ActionbAr];

				return {
					root,
					element,
					icon,
					nAme,
					version,
					ActionbAr,
					ActivAtionTime,
					profileTime,
					msgContAiner,
					disposAbles,
					elementDisposAbles: [],
				};
			},

			renderElement: (element: IRuntimeExtension, index: number, dAtA: IRuntimeExtensionTemplAteDAtA): void => {

				dAtA.elementDisposAbles = dispose(dAtA.elementDisposAbles);

				dAtA.root.clAssList.toggle('odd', index % 2 === 1);

				const onError = Event.once(domEvent(dAtA.icon, 'error'));
				onError(() => dAtA.icon.src = element.mArketplAceInfo.iconUrlFAllbAck, null, dAtA.elementDisposAbles);
				dAtA.icon.src = element.mArketplAceInfo.iconUrl;

				if (!dAtA.icon.complete) {
					dAtA.icon.style.visibility = 'hidden';
					dAtA.icon.onloAd = () => dAtA.icon.style.visibility = 'inherit';
				} else {
					dAtA.icon.style.visibility = 'inherit';
				}
				dAtA.nAme.textContent = element.mArketplAceInfo.displAyNAme;
				dAtA.version.textContent = element.description.version;

				const ActivAtionTimes = element.stAtus.ActivAtionTimes!;
				let syncTime = ActivAtionTimes.codeLoAdingTime + ActivAtionTimes.ActivAteCAllTime;
				dAtA.ActivAtionTime.textContent = ActivAtionTimes.ActivAtionReAson.stArtup ? `StArtup ActivAtion: ${syncTime}ms` : `ActivAtion: ${syncTime}ms`;

				dAtA.ActionbAr.cleAr();
				if (element.unresponsiveProfile) {
					dAtA.ActionbAr.push(this._instAntiAtionService.creAteInstAnce(SlowExtensionAction, element.description, element.unresponsiveProfile), { icon: true, lAbel: true });
				}
				if (isNonEmptyArrAy(element.stAtus.runtimeErrors)) {
					dAtA.ActionbAr.push(new ReportExtensionIssueAction(element, this._openerService, this._clipboArdService, this._productService, this._nAtiveHostService), { icon: true, lAbel: true });
				}

				let title: string;
				const ActivAtionId = ActivAtionTimes.ActivAtionReAson.extensionId.vAlue;
				const ActivAtionEvent = ActivAtionTimes.ActivAtionReAson.ActivAtionEvent;
				if (ActivAtionEvent === '*') {
					title = nls.locAlize('stArActivAtion', "ActivAted by {0} on stArt-up", ActivAtionId);
				} else if (/^workspAceContAins:/.test(ActivAtionEvent)) {
					let fileNAmeOrGlob = ActivAtionEvent.substr('workspAceContAins:'.length);
					if (fileNAmeOrGlob.indexOf('*') >= 0 || fileNAmeOrGlob.indexOf('?') >= 0) {
						title = nls.locAlize({
							key: 'workspAceContAinsGlobActivAtion',
							comment: [
								'{0} will be A glob pAttern'
							]
						}, "ActivAted by {1} becAuse A file mAtching {1} exists in your workspAce", fileNAmeOrGlob, ActivAtionId);
					} else {
						title = nls.locAlize({
							key: 'workspAceContAinsFileActivAtion',
							comment: [
								'{0} will be A file nAme'
							]
						}, "ActivAted by {1} becAuse file {0} exists in your workspAce", fileNAmeOrGlob, ActivAtionId);
					}
				} else if (/^workspAceContAinsTimeout:/.test(ActivAtionEvent)) {
					const glob = ActivAtionEvent.substr('workspAceContAinsTimeout:'.length);
					title = nls.locAlize({
						key: 'workspAceContAinsTimeout',
						comment: [
							'{0} will be A glob pAttern'
						]
					}, "ActivAted by {1} becAuse seArching for {0} took too long", glob, ActivAtionId);
				} else if (ActivAtionEvent === 'onStArtupFinished') {
					title = nls.locAlize({
						key: 'stArtupFinishedActivAtion',
						comment: [
							'This refers to An extension. {0} will be An ActivAtion event.'
						]
					}, "ActivAted by {0} After stArt-up finished", ActivAtionId);
				} else if (/^onLAnguAge:/.test(ActivAtionEvent)) {
					let lAnguAge = ActivAtionEvent.substr('onLAnguAge:'.length);
					title = nls.locAlize('lAnguAgeActivAtion', "ActivAted by {1} becAuse you opened A {0} file", lAnguAge, ActivAtionId);
				} else {
					title = nls.locAlize({
						key: 'workspAceGenericActivAtion',
						comment: [
							'The {0} plAceholder will be An ActivAtion event, like e.g. \'lAnguAge:typescript\', \'debug\', etc.'
						]
					}, "ActivAted by {1} on {0}", ActivAtionEvent, ActivAtionId);
				}
				dAtA.ActivAtionTime.title = title;

				cleArNode(dAtA.msgContAiner);

				if (this._extensionHostProfileService.getUnresponsiveProfile(element.description.identifier)) {
					const el = $('spAn', undefined, ...renderCodicons(` $(Alert) Unresponsive`));
					el.title = nls.locAlize('unresponsive.title', "Extension hAs cAused the extension host to freeze.");
					dAtA.msgContAiner.AppendChild(el);
				}

				if (isNonEmptyArrAy(element.stAtus.runtimeErrors)) {
					const el = $('spAn', undefined, ...renderCodicons(`$(bug) ${nls.locAlize('errors', "{0} uncAught errors", element.stAtus.runtimeErrors.length)}`));
					dAtA.msgContAiner.AppendChild(el);
				}

				if (element.stAtus.messAges && element.stAtus.messAges.length > 0) {
					const el = $('spAn', undefined, ...renderCodicons(`$(Alert) ${element.stAtus.messAges[0].messAge}`));
					dAtA.msgContAiner.AppendChild(el);
				}

				if (element.description.extensionLocAtion.scheme !== SchemAs.file) {
					const el = $('spAn', undefined, ...renderCodicons(`$(remote) ${element.description.extensionLocAtion.Authority}`));
					dAtA.msgContAiner.AppendChild(el);

					const hostLAbel = this._lAbelService.getHostLAbel(SchemAs.vscodeRemote, this._environmentService.remoteAuthority);
					if (hostLAbel) {
						reset(el, ...renderCodicons(`$(remote) ${hostLAbel}`));
					}
				}

				if (this._profileInfo && element.profileInfo) {
					dAtA.profileTime.textContent = `Profile: ${(element.profileInfo.totAlTime / 1000).toFixed(2)}ms`;
				} else {
					dAtA.profileTime.textContent = '';
				}

			},

			disposeTemplAte: (dAtA: IRuntimeExtensionTemplAteDAtA): void => {
				dAtA.disposAbles = dispose(dAtA.disposAbles);
			}
		};

		this._list = <WorkbenchList<IRuntimeExtension>>this._instAntiAtionService.creAteInstAnce(WorkbenchList,
			'RuntimeExtensions',
			pArent, delegAte, [renderer], {
			multipleSelectionSupport: fAlse,
			setRowLineHeight: fAlse,
			horizontAlScrolling: fAlse,
			overrideStyles: {
				listBAckground: editorBAckground
			},
			AccessibilityProvider: new RuntimeExtensionsEditorAccessibilityProvider()
		});

		this._list.splice(0, this._list.length, this._elements || undefined);

		this._list.onContextMenu((e) => {
			if (!e.element) {
				return;
			}

			const Actions: IAction[] = [];

			Actions.push(new ReportExtensionIssueAction(e.element, this._openerService, this._clipboArdService, this._productService, this._nAtiveHostService));
			Actions.push(new SepArAtor());

			Actions.push(new Action('runtimeExtensionsEditor.Action.disAbleWorkspAce', nls.locAlize('disAble workspAce', "DisAble (WorkspAce)"), undefined, true, () => this._extensionsWorkbenchService.setEnAblement(e.element!.mArketplAceInfo, EnAblementStAte.DisAbledWorkspAce)));
			Actions.push(new Action('runtimeExtensionsEditor.Action.disAble', nls.locAlize('disAble', "DisAble"), undefined, true, () => this._extensionsWorkbenchService.setEnAblement(e.element!.mArketplAceInfo, EnAblementStAte.DisAbledGlobAlly)));
			Actions.push(new SepArAtor());

			const stAte = this._extensionHostProfileService.stAte;
			if (stAte === ProfileSessionStAte.Running) {
				Actions.push(this._instAntiAtionService.creAteInstAnce(StopExtensionHostProfileAction, StopExtensionHostProfileAction.ID, StopExtensionHostProfileAction.LABEL));
			} else {
				Actions.push(this._instAntiAtionService.creAteInstAnce(StArtExtensionHostProfileAction, StArtExtensionHostProfileAction.ID, StArtExtensionHostProfileAction.LABEL));
			}
			Actions.push(this.sAveExtensionHostProfileAction);

			this._contextMenuService.showContextMenu({
				getAnchor: () => e.Anchor,
				getActions: () => Actions
			});
		});
	}

	@memoize
	privAte get sAveExtensionHostProfileAction(): IAction {
		return this._instAntiAtionService.creAteInstAnce(SAveExtensionHostProfileAction, SAveExtensionHostProfileAction.ID, SAveExtensionHostProfileAction.LABEL);
	}

	public lAyout(dimension: Dimension): void {
		if (this._list) {
			this._list.lAyout(dimension.height);
		}
	}
}

export clAss ShowRuntimeExtensionsAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.showRuntimeExtensions';
	stAtic reAdonly LABEL = nls.locAlize('showRuntimeExtensions', "Show Running Extensions");

	constructor(
		id: string, lAbel: string,
		@IEditorService privAte reAdonly _editorService: IEditorService
	) {
		super(id, lAbel);
	}

	public Async run(e?: Any): Promise<Any> {
		AwAit this._editorService.openEditor(RuntimeExtensionsInput.instAnce, { reveAlIfOpened: true });
	}
}

export clAss ReportExtensionIssueAction extends Action {

	privAte stAtic reAdonly _id = 'workbench.extensions.Action.reportExtensionIssue';
	privAte stAtic reAdonly _lAbel = nls.locAlize('reportExtensionIssue', "Report Issue");

	privAte _url: string | undefined;

	constructor(
		privAte extension: {
			description: IExtensionDescription;
			mArketplAceInfo: IExtension;
			stAtus?: IExtensionsStAtus;
			unresponsiveProfile?: IExtensionHostProfile
		},
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService,
		@IProductService privAte reAdonly productService: IProductService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(ReportExtensionIssueAction._id, ReportExtensionIssueAction._lAbel, 'extension-Action report-issue');
		this.enAbled = extension.mArketplAceInfo
			&& extension.mArketplAceInfo.type === ExtensionType.User
			&& !!extension.description.repository && !!extension.description.repository.url;
	}

	Async run(): Promise<void> {
		if (!this._url) {
			this._url = AwAit this._generAteNewIssueUrl(this.extension);
		}
		this.openerService.open(URI.pArse(this._url));
	}

	privAte Async _generAteNewIssueUrl(extension: {
		description: IExtensionDescription;
		mArketplAceInfo: IExtension;
		stAtus?: IExtensionsStAtus;
		unresponsiveProfile?: IExtensionHostProfile
	}): Promise<string> {
		let bAseUrl = extension.mArketplAceInfo && extension.mArketplAceInfo.type === ExtensionType.User && extension.description.repository ? extension.description.repository.url : undefined;
		if (!!bAseUrl) {
			bAseUrl = `${bAseUrl.indexOf('.git') !== -1 ? bAseUrl.substr(0, bAseUrl.length - 4) : bAseUrl}/issues/new/`;
		} else {
			bAseUrl = this.productService.reportIssueUrl!;
		}

		let reAson = 'Bug';
		let title = 'Extension issue';
		let messAge = ':wArning: We hAve written the needed dAtA into your clipboArd. PleAse pAste! :wArning:';
		this.clipboArdService.writeText('```json \n' + JSON.stringify(extension.stAtus, null, '\t') + '\n```');

		const os = AwAit this.nAtiveHostService.getOSProperties();
		const osVersion = `${os.type} ${os.Arch} ${os.releAse}`;
		const queryStringPrefix = bAseUrl.indexOf('?') === -1 ? '?' : '&';
		const body = encodeURIComponent(
			`- Issue Type: \`${reAson}\`
- Extension NAme: \`${extension.description.nAme}\`
- Extension Version: \`${extension.description.version}\`
- OS Version: \`${osVersion}\`
- VSCode version: \`${this.productService.version}\`\n\n${messAge}`
		);

		return `${bAseUrl}${queryStringPrefix}body=${body}&title=${encodeURIComponent(title)}`;
	}
}

export clAss DebugExtensionHostAction extends Action {
	stAtic reAdonly ID = 'workbench.extensions.Action.debugExtensionHost';
	stAtic reAdonly LABEL = nls.locAlize('debugExtensionHost', "StArt Debugging Extension Host");
	stAtic reAdonly CSS_CLASS = 'debug-extension-host';

	constructor(
		@IDebugService privAte reAdonly _debugService: IDebugService,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@IDiAlogService privAte reAdonly _diAlogService: IDiAlogService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@IProductService privAte reAdonly productService: IProductService
	) {
		super(DebugExtensionHostAction.ID, DebugExtensionHostAction.LABEL, DebugExtensionHostAction.CSS_CLASS);
	}

	Async run(): Promise<Any> {

		const inspectPort = AwAit this._extensionService.getInspectPort(fAlse);
		if (!inspectPort) {
			const res = AwAit this._diAlogService.confirm({
				type: 'info',
				messAge: nls.locAlize('restArt1', "Profile Extensions"),
				detAil: nls.locAlize('restArt2', "In order to profile extensions A restArt is required. Do you wAnt to restArt '{0}' now?", this.productService.nAmeLong),
				primAryButton: nls.locAlize('restArt3', "&&RestArt"),
				secondAryButton: nls.locAlize('cAncel', "&&CAncel")
			});
			if (res.confirmed) {
				AwAit this._nAtiveHostService.relAunch({ AddArgs: [`--inspect-extensions=${rAndomPort()}`] });
			}

			return;
		}

		return this._debugService.stArtDebugging(undefined, {
			type: 'node',
			nAme: nls.locAlize('debugExtensionHost.lAunch.nAme', "AttAch Extension Host"),
			request: 'AttAch',
			port: inspectPort
		});
	}
}

export clAss StArtExtensionHostProfileAction extends Action {
	stAtic reAdonly ID = 'workbench.extensions.Action.extensionHostProfile';
	stAtic reAdonly LABEL = nls.locAlize('extensionHostProfileStArt', "StArt Extension Host Profile");

	constructor(
		id: string = StArtExtensionHostProfileAction.ID, lAbel: string = StArtExtensionHostProfileAction.LABEL,
		@IExtensionHostProfileService privAte reAdonly _extensionHostProfileService: IExtensionHostProfileService,
	) {
		super(id, lAbel);
	}

	run(): Promise<Any> {
		this._extensionHostProfileService.stArtProfiling();
		return Promise.resolve();
	}
}

export clAss StopExtensionHostProfileAction extends Action {
	stAtic reAdonly ID = 'workbench.extensions.Action.stopExtensionHostProfile';
	stAtic reAdonly LABEL = nls.locAlize('stopExtensionHostProfileStArt', "Stop Extension Host Profile");

	constructor(
		id: string = StArtExtensionHostProfileAction.ID, lAbel: string = StArtExtensionHostProfileAction.LABEL,
		@IExtensionHostProfileService privAte reAdonly _extensionHostProfileService: IExtensionHostProfileService,
	) {
		super(id, lAbel);
	}

	run(): Promise<Any> {
		this._extensionHostProfileService.stopProfiling();
		return Promise.resolve();
	}
}

export clAss SAveExtensionHostProfileAction extends Action {

	stAtic reAdonly LABEL = nls.locAlize('sAveExtensionHostProfile', "SAve Extension Host Profile");
	stAtic reAdonly ID = 'workbench.extensions.Action.sAveExtensionHostProfile';

	constructor(
		id: string = SAveExtensionHostProfileAction.ID, lAbel: string = SAveExtensionHostProfileAction.LABEL,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@IWorkbenchEnvironmentService privAte reAdonly _environmentService: IWorkbenchEnvironmentService,
		@IExtensionHostProfileService privAte reAdonly _extensionHostProfileService: IExtensionHostProfileService,
		@IFileService privAte reAdonly _fileService: IFileService
	) {
		super(id, lAbel, undefined, fAlse);
		this._extensionHostProfileService.onDidChAngeLAstProfile(() => {
			this.enAbled = (this._extensionHostProfileService.lAstProfile !== null);
		});
	}

	run(): Promise<Any> {
		return Promise.resolve(this._AsyncRun());
	}

	privAte Async _AsyncRun(): Promise<Any> {
		let picked = AwAit this._nAtiveHostService.showSAveDiAlog({
			title: 'SAve Extension Host Profile',
			buttonLAbel: 'SAve',
			defAultPAth: `CPU-${new DAte().toISOString().replAce(/[\-:]/g, '')}.cpuprofile`,
			filters: [{
				nAme: 'CPU Profiles',
				extensions: ['cpuprofile', 'txt']
			}]
		});

		if (!picked || !picked.filePAth || picked.cAnceled) {
			return;
		}

		const profileInfo = this._extensionHostProfileService.lAstProfile;
		let dAtAToWrite: object = profileInfo ? profileInfo.dAtA : {};

		let sAvePAth = picked.filePAth;

		if (this._environmentService.isBuilt) {
			const profiler = AwAit import('v8-inspect-profiler');
			// when running from A not-development-build we remove
			// Absolute filenAmes becAuse we don't wAnt to reveAl Anything
			// About users. We Also Append the `.txt` suffix to mAke it
			// eAsier to AttAch these files to GH issues

			let tmp = profiler.rewriteAbsolutePAths({ profile: dAtAToWrite As Any }, 'piiRemoved');
			dAtAToWrite = tmp.profile;

			sAvePAth = sAvePAth + '.txt';
		}

		return this._fileService.writeFile(URI.file(sAvePAth), VSBuffer.fromString(JSON.stringify(profileInfo ? profileInfo.dAtA : {}, null, '\t')));
	}
}

clAss RuntimeExtensionsEditorAccessibilityProvider implements IListAccessibilityProvider<IRuntimeExtension> {
	getWidgetAriALAbel(): string {
		return nls.locAlize('runtimeExtensions', "Runtime Extensions");
	}

	getAriALAbel(element: IRuntimeExtension): string | null {
		return element.description.nAme;
	}
}
