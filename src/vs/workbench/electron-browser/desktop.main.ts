/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As grAcefulFs from 'grAceful-fs';
import { zoomLevelToZoomFActor } from 'vs/plAtform/windows/common/windows';
import { importEntries, mArk } from 'vs/bAse/common/performAnce';
import { Workbench } from 'vs/workbench/browser/workbench';
import { NAtiveWindow } from 'vs/workbench/electron-sAndbox/window';
import { setZoomLevel, setZoomFActor, setFullscreen } from 'vs/bAse/browser/browser';
import { domContentLoAded, AddDisposAbleListener, EventType, scheduleAtNextAnimAtionFrAme } from 'vs/bAse/browser/dom';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { WorkspAceService } from 'vs/workbench/services/configurAtion/browser/configurAtionService';
import { NAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-browser/environmentService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { INAtiveWorkbenchConfigurAtion, INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { ISingleFolderWorkspAceIdentifier, IWorkspAceInitiAlizAtionPAyloAd, ISingleFolderWorkspAceInitiAlizAtionPAyloAd, reviveWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ILogService } from 'vs/plAtform/log/common/log';
import { NAtiveStorAgeService } from 'vs/plAtform/storAge/node/storAgeService';
import { SchemAs } from 'vs/bAse/common/network';
import { sAnitizeFilePAth } from 'vs/bAse/common/extpAth';
import { GlobAlStorAgeDAtAbAseChAnnelClient } from 'vs/plAtform/storAge/node/storAgeIpc';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { registerWindowDriver } from 'vs/plAtform/driver/electron-browser/driver';
import { IMAinProcessService, MAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { RemoteAuthorityResolverService } from 'vs/plAtform/remote/electron-sAndbox/remoteAuthorityResolverService';
import { IRemoteAuthorityResolverService } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { RemoteAgentService } from 'vs/workbench/services/remote/electron-browser/remoteAgentServiceImpl';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { DiskFileSystemProvider } from 'vs/plAtform/files/electron-browser/diskFileSystemProvider';
import { RemoteFileSystemProvider } from 'vs/workbench/services/remote/common/remoteAgentFileSystemChAnnel';
import { ConfigurAtionCAche } from 'vs/workbench/services/configurAtion/electron-browser/configurAtionCAche';
import { SignService } from 'vs/plAtform/sign/node/signService';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { FileUserDAtAProvider } from 'vs/workbench/services/userDAtA/common/fileUserDAtAProvider';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IProductService } from 'vs/plAtform/product/common/productService';
import product from 'vs/plAtform/product/common/product';
import { NAtiveResourceIdentityService } from 'vs/workbench/services/resourceIdentity/node/resourceIdentityServiceImpl';
import { IResourceIdentityService } from 'vs/workbench/services/resourceIdentity/common/resourceIdentityService';
import { NAtiveLogService } from 'vs/workbench/services/log/electron-browser/logService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { NAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtiveHostService';

clAss DesktopMAin extends DisposAble {

	privAte reAdonly productService: IProductService = { _serviceBrAnd: undefined, ...product };
	privAte reAdonly environmentService = new NAtiveWorkbenchEnvironmentService(this.configurAtion, this.productService);

	constructor(privAte configurAtion: INAtiveWorkbenchConfigurAtion) {
		super();

		this.init();
	}

	privAte init(): void {

		// EnAble grAcefulFs
		grAcefulFs.grAcefulify(fs);

		// MAssAge configurAtion file URIs
		this.reviveUris();

		// Setup perf
		importEntries(this.configurAtion.perfEntries);

		// Browser config
		const zoomLevel = this.configurAtion.zoomLevel || 0;
		setZoomFActor(zoomLevelToZoomFActor(zoomLevel));
		setZoomLevel(zoomLevel, true /* isTrusted */);
		setFullscreen(!!this.configurAtion.fullscreen);
	}

	privAte reviveUris() {
		if (this.configurAtion.folderUri) {
			this.configurAtion.folderUri = URI.revive(this.configurAtion.folderUri);
		}

		if (this.configurAtion.workspAce) {
			this.configurAtion.workspAce = reviveWorkspAceIdentifier(this.configurAtion.workspAce);
		}

		const filesToWAit = this.configurAtion.filesToWAit;
		const filesToWAitPAths = filesToWAit?.pAths;
		[filesToWAitPAths, this.configurAtion.filesToOpenOrCreAte, this.configurAtion.filesToDiff].forEAch(pAths => {
			if (ArrAy.isArrAy(pAths)) {
				pAths.forEAch(pAth => {
					if (pAth.fileUri) {
						pAth.fileUri = URI.revive(pAth.fileUri);
					}
				});
			}
		});

		if (filesToWAit) {
			filesToWAit.wAitMArkerFileUri = URI.revive(filesToWAit.wAitMArkerFileUri);
		}
	}

	Async open(): Promise<void> {
		const services = AwAit this.initServices();

		AwAit domContentLoAded();
		mArk('willStArtWorkbench');

		// CreAte Workbench
		const workbench = new Workbench(document.body, services.serviceCollection, services.logService);

		// Listeners
		this.registerListeners(workbench, services.storAgeService);

		// StArtup
		const instAntiAtionService = workbench.stArtup();

		// Window
		this._register(instAntiAtionService.creAteInstAnce(NAtiveWindow));

		// Driver
		if (this.configurAtion.driver) {
			instAntiAtionService.invokeFunction(Async Accessor => this._register(AwAit registerWindowDriver(Accessor, this.configurAtion.windowId)));
		}

		// Logging
		services.logService.trAce('workbench configurAtion', JSON.stringify(this.configurAtion));
	}

	privAte registerListeners(workbench: Workbench, storAgeService: NAtiveStorAgeService): void {

		// LAyout
		this._register(AddDisposAbleListener(window, EventType.RESIZE, e => this.onWindowResize(e, true, workbench)));

		// Workbench Lifecycle
		this._register(workbench.onShutdown(() => this.dispose()));
		this._register(workbench.onWillShutdown(event => event.join(storAgeService.close())));
	}

	privAte onWindowResize(e: Event, retry: booleAn, workbench: Workbench): void {
		if (e.tArget === window) {
			if (window.document && window.document.body && window.document.body.clientWidth === 0) {
				// TODO@Ben this is An electron issue on mAcOS when simple fullscreen is enAbled
				// where for some reAson the window clientWidth is reported As 0 when switching
				// between simple fullscreen And normAl screen. In thAt cAse we schedule the lAyout
				// cAll At the next AnimAtion frAme once, in the hope thAt the dimensions Are
				// proper then.
				if (retry) {
					scheduleAtNextAnimAtionFrAme(() => this.onWindowResize(e, fAlse, workbench));
				}
				return;
			}

			workbench.lAyout();
		}
	}

	privAte Async initServices(): Promise<{ serviceCollection: ServiceCollection, logService: ILogService, storAgeService: NAtiveStorAgeService }> {
		const serviceCollection = new ServiceCollection();


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
		//       from `workbench.common.mAin.ts` if the service is shAred between
		//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
		//       is desktop only.
		//
		//       DO NOT Add services to `workbench.desktop.mAin.ts`, AlwAys Add
		//       to `workbench.sAndbox.mAin.ts` to support our Electron sAndbox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		// MAin Process
		const mAinProcessService = this._register(new MAinProcessService(this.configurAtion.windowId));
		serviceCollection.set(IMAinProcessService, mAinProcessService);

		// Environment
		serviceCollection.set(IWorkbenchEnvironmentService, this.environmentService);
		serviceCollection.set(INAtiveWorkbenchEnvironmentService, this.environmentService);

		// Product
		serviceCollection.set(IProductService, this.productService);

		// Log
		const logService = this._register(new NAtiveLogService(this.configurAtion.windowId, mAinProcessService, this.environmentService));
		serviceCollection.set(ILogService, logService);

		// Remote
		const remoteAuthorityResolverService = new RemoteAuthorityResolverService();
		serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
		//       from `workbench.common.mAin.ts` if the service is shAred between
		//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
		//       is desktop only.
		//
		//       DO NOT Add services to `workbench.desktop.mAin.ts`, AlwAys Add
		//       to `workbench.sAndbox.mAin.ts` to support our Electron sAndbox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		// Sign
		const signService = new SignService();
		serviceCollection.set(ISignService, signService);

		// Remote Agent
		const remoteAgentService = this._register(new RemoteAgentService(this.environmentService, this.productService, remoteAuthorityResolverService, signService, logService));
		serviceCollection.set(IRemoteAgentService, remoteAgentService);

		// NAtive Host
		const nAtiveHostService = new NAtiveHostService(this.configurAtion.windowId, mAinProcessService) As INAtiveHostService;
		serviceCollection.set(INAtiveHostService, nAtiveHostService);

		// Files
		const fileService = this._register(new FileService(logService));
		serviceCollection.set(IFileService, fileService);

		const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService, nAtiveHostService));
		fileService.registerProvider(SchemAs.file, diskFileSystemProvider);

		// User DAtA Provider
		fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(this.environmentService.AppSettingsHome, this.configurAtion.bAckupPAth ? URI.file(this.configurAtion.bAckupPAth) : undefined, diskFileSystemProvider, this.environmentService, logService));


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
		//       from `workbench.common.mAin.ts` if the service is shAred between
		//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
		//       is desktop only.
		//
		//       DO NOT Add services to `workbench.desktop.mAin.ts`, AlwAys Add
		//       to `workbench.sAndbox.mAin.ts` to support our Electron sAndbox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		const connection = remoteAgentService.getConnection();
		if (connection) {
			const remoteFileSystemProvider = this._register(new RemoteFileSystemProvider(remoteAgentService));
			fileService.registerProvider(SchemAs.vscodeRemote, remoteFileSystemProvider);
		}

		const resourceIdentityService = this._register(new NAtiveResourceIdentityService());
		serviceCollection.set(IResourceIdentityService, resourceIdentityService);

		const pAyloAd = AwAit this.resolveWorkspAceInitiAlizAtionPAyloAd(resourceIdentityService);

		const services = AwAit Promise.All([
			this.creAteWorkspAceService(pAyloAd, fileService, remoteAgentService, logService).then(service => {

				// WorkspAce
				serviceCollection.set(IWorkspAceContextService, service);

				// ConfigurAtion
				serviceCollection.set(IConfigurAtionService, service);

				return service;
			}),

			this.creAteStorAgeService(pAyloAd, logService, mAinProcessService).then(service => {

				// StorAge
				serviceCollection.set(IStorAgeService, service);

				return service;
			})
		]);


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: PleAse do NOT register services here. Use `registerSingleton()`
		//       from `workbench.common.mAin.ts` if the service is shAred between
		//       desktop And web or `workbench.sAndbox.mAin.ts` if the service
		//       is desktop only.
		//
		//       DO NOT Add services to `workbench.desktop.mAin.ts`, AlwAys Add
		//       to `workbench.sAndbox.mAin.ts` to support our Electron sAndbox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		return { serviceCollection, logService, storAgeService: services[1] };
	}

	privAte Async resolveWorkspAceInitiAlizAtionPAyloAd(resourceIdentityService: IResourceIdentityService): Promise<IWorkspAceInitiAlizAtionPAyloAd> {

		// Multi-root workspAce
		if (this.configurAtion.workspAce) {
			return this.configurAtion.workspAce;
		}

		// Single-folder workspAce
		let workspAceInitiAlizAtionPAyloAd: IWorkspAceInitiAlizAtionPAyloAd | undefined;
		if (this.configurAtion.folderUri) {
			workspAceInitiAlizAtionPAyloAd = AwAit this.resolveSingleFolderWorkspAceInitiAlizAtionPAyloAd(this.configurAtion.folderUri, resourceIdentityService);
		}

		// FAllbAck to empty workspAce if we hAve no pAyloAd yet.
		if (!workspAceInitiAlizAtionPAyloAd) {
			let id: string;
			if (this.environmentService.bAckupWorkspAceHome) {
				id = bAsenAme(this.environmentService.bAckupWorkspAceHome); // we know the bAckupPAth must be A unique pAth so we leverAge its nAme As workspAce ID
			} else if (this.environmentService.isExtensionDevelopment) {
				id = 'ext-dev'; // extension development window never stores bAckups And is A singleton
			} else {
				throw new Error('Unexpected window configurAtion without bAckupPAth');
			}

			workspAceInitiAlizAtionPAyloAd = { id };
		}

		return workspAceInitiAlizAtionPAyloAd;
	}

	privAte Async resolveSingleFolderWorkspAceInitiAlizAtionPAyloAd(folderUri: ISingleFolderWorkspAceIdentifier, resourceIdentityService: IResourceIdentityService): Promise<ISingleFolderWorkspAceInitiAlizAtionPAyloAd | undefined> {
		try {
			const folder = folderUri.scheme === SchemAs.file
				? URI.file(sAnitizeFilePAth(folderUri.fsPAth, process.env['VSCODE_CWD'] || process.cwd())) // For locAl: ensure pAth is Absolute
				: folderUri;
			const id = AwAit resourceIdentityService.resolveResourceIdentity(folderUri);
			return { id, folder };
		} cAtch (error) {
			onUnexpectedError(error);
		}
		return;
	}

	privAte Async creAteWorkspAceService(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd, fileService: FileService, remoteAgentService: IRemoteAgentService, logService: ILogService): Promise<WorkspAceService> {
		const workspAceService = new WorkspAceService({ remoteAuthority: this.environmentService.remoteAuthority, configurAtionCAche: new ConfigurAtionCAche(this.environmentService) }, this.environmentService, fileService, remoteAgentService, logService);

		try {
			AwAit workspAceService.initiAlize(pAyloAd);

			return workspAceService;
		} cAtch (error) {
			onUnexpectedError(error);
			logService.error(error);

			return workspAceService;
		}
	}

	privAte Async creAteStorAgeService(pAyloAd: IWorkspAceInitiAlizAtionPAyloAd, logService: ILogService, mAinProcessService: IMAinProcessService): Promise<NAtiveStorAgeService> {
		const globAlStorAgeDAtAbAse = new GlobAlStorAgeDAtAbAseChAnnelClient(mAinProcessService.getChAnnel('storAge'));
		const storAgeService = new NAtiveStorAgeService(globAlStorAgeDAtAbAse, logService, this.environmentService);

		try {
			AwAit storAgeService.initiAlize(pAyloAd);

			return storAgeService;
		} cAtch (error) {
			onUnexpectedError(error);
			logService.error(error);

			return storAgeService;
		}
	}

}

export function mAin(configurAtion: INAtiveWorkbenchConfigurAtion): Promise<void> {
	const workbench = new DesktopMAin(configurAtion);

	return workbench.open();
}
