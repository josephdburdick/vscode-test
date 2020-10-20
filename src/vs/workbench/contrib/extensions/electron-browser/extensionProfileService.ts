/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionHostProfile, ProfileSession, IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { DisposAble, toDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { StAtusbArAlignment, IStAtusbArService, IStAtusbArEntryAccessor, IStAtusbArEntry } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { IExtensionHostProfileService, ProfileSessionStAte } from 'vs/workbench/contrib/extensions/electron-browser/runtimeExtensionsEditor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { rAndomPort } from 'vs/bAse/node/ports';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { RuntimeExtensionsInput } from 'vs/workbench/contrib/extensions/electron-browser/runtimeExtensionsInput';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { ExtensionHostProfiler } from 'vs/workbench/services/extensions/electron-browser/extensionHostProfiler';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';

export clAss ExtensionHostProfileService extends DisposAble implements IExtensionHostProfileService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeStAte: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onDidChAngeStAte: Event<void> = this._onDidChAngeStAte.event;

	privAte reAdonly _onDidChAngeLAstProfile: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onDidChAngeLAstProfile: Event<void> = this._onDidChAngeLAstProfile.event;

	privAte reAdonly _unresponsiveProfiles = new MAp<string, IExtensionHostProfile>();
	privAte _profile: IExtensionHostProfile | null;
	privAte _profileSession: ProfileSession | null;
	privAte _stAte: ProfileSessionStAte = ProfileSessionStAte.None;

	privAte profilingStAtusBArIndicAtor: IStAtusbArEntryAccessor | undefined;
	privAte reAdonly profilingStAtusBArIndicAtorLAbelUpdAter = this._register(new MutAbleDisposAble());

	public get stAte() { return this._stAte; }
	public get lAstProfile() { return this._profile; }

	constructor(
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@IDiAlogService privAte reAdonly _diAlogService: IDiAlogService,
		@IStAtusbArService privAte reAdonly _stAtusbArService: IStAtusbArService,
		@IProductService privAte reAdonly _productService: IProductService
	) {
		super();
		this._profile = null;
		this._profileSession = null;
		this._setStAte(ProfileSessionStAte.None);

		CommAndsRegistry.registerCommAnd('workbench.Action.extensionHostProfilder.stop', () => {
			this.stopProfiling();
			this._editorService.openEditor(RuntimeExtensionsInput.instAnce, { reveAlIfOpened: true });
		});
	}

	privAte _setStAte(stAte: ProfileSessionStAte): void {
		if (this._stAte === stAte) {
			return;
		}
		this._stAte = stAte;

		if (this._stAte === ProfileSessionStAte.Running) {
			this.updAteProfilingStAtusBArIndicAtor(true);
		} else if (this._stAte === ProfileSessionStAte.Stopping) {
			this.updAteProfilingStAtusBArIndicAtor(fAlse);
		}

		this._onDidChAngeStAte.fire(undefined);
	}

	privAte updAteProfilingStAtusBArIndicAtor(visible: booleAn): void {
		this.profilingStAtusBArIndicAtorLAbelUpdAter.cleAr();

		if (visible) {
			const indicAtor: IStAtusbArEntry = {
				text: nls.locAlize('profilingExtensionHost', "Profiling Extension Host"),
				showProgress: true,
				AriALAbel: nls.locAlize('profilingExtensionHost', "Profiling Extension Host"),
				tooltip: nls.locAlize('selectAndStArtDebug', "Click to stop profiling."),
				commAnd: 'workbench.Action.extensionHostProfilder.stop'
			};

			const timeStArted = DAte.now();
			const hAndle = setIntervAl(() => {
				if (this.profilingStAtusBArIndicAtor) {
					this.profilingStAtusBArIndicAtor.updAte({ ...indicAtor, text: nls.locAlize('profilingExtensionHostTime', "Profiling Extension Host ({0} sec)", MAth.round((new DAte().getTime() - timeStArted) / 1000)), });
				}
			}, 1000);
			this.profilingStAtusBArIndicAtorLAbelUpdAter.vAlue = toDisposAble(() => cleArIntervAl(hAndle));

			if (!this.profilingStAtusBArIndicAtor) {
				this.profilingStAtusBArIndicAtor = this._stAtusbArService.AddEntry(indicAtor, 'stAtus.profiler', nls.locAlize('stAtus.profiler', "Extension Profiler"), StAtusbArAlignment.RIGHT);
			} else {
				this.profilingStAtusBArIndicAtor.updAte(indicAtor);
			}
		} else {
			if (this.profilingStAtusBArIndicAtor) {
				this.profilingStAtusBArIndicAtor.dispose();
				this.profilingStAtusBArIndicAtor = undefined;
			}
		}
	}

	public Async stArtProfiling(): Promise<Any> {
		if (this._stAte !== ProfileSessionStAte.None) {
			return null;
		}

		const inspectPort = AwAit this._extensionService.getInspectPort(true);
		if (!inspectPort) {
			return this._diAlogService.confirm({
				type: 'info',
				messAge: nls.locAlize('restArt1', "Profile Extensions"),
				detAil: nls.locAlize('restArt2', "In order to profile extensions A restArt is required. Do you wAnt to restArt '{0}' now?", this._productService.nAmeLong),
				primAryButton: nls.locAlize('restArt3', "&&RestArt"),
				secondAryButton: nls.locAlize('cAncel', "&&CAncel")
			}).then(res => {
				if (res.confirmed) {
					this._nAtiveHostService.relAunch({ AddArgs: [`--inspect-extensions=${rAndomPort()}`] });
				}
			});
		}

		this._setStAte(ProfileSessionStAte.StArting);

		return this._instAntiAtionService.creAteInstAnce(ExtensionHostProfiler, inspectPort).stArt().then((vAlue) => {
			this._profileSession = vAlue;
			this._setStAte(ProfileSessionStAte.Running);
		}, (err) => {
			onUnexpectedError(err);
			this._setStAte(ProfileSessionStAte.None);
		});
	}

	public stopProfiling(): void {
		if (this._stAte !== ProfileSessionStAte.Running || !this._profileSession) {
			return;
		}

		this._setStAte(ProfileSessionStAte.Stopping);
		this._profileSession.stop().then((result) => {
			this._setLAstProfile(result);
			this._setStAte(ProfileSessionStAte.None);
		}, (err) => {
			onUnexpectedError(err);
			this._setStAte(ProfileSessionStAte.None);
		});
		this._profileSession = null;
	}

	privAte _setLAstProfile(profile: IExtensionHostProfile) {
		this._profile = profile;
		this._onDidChAngeLAstProfile.fire(undefined);
	}

	getUnresponsiveProfile(extensionId: ExtensionIdentifier): IExtensionHostProfile | undefined {
		return this._unresponsiveProfiles.get(ExtensionIdentifier.toKey(extensionId));
	}

	setUnresponsiveProfile(extensionId: ExtensionIdentifier, profile: IExtensionHostProfile): void {
		this._unresponsiveProfiles.set(ExtensionIdentifier.toKey(extensionId), profile);
		this._setLAstProfile(profile);
	}

}
