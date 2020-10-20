/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { zoomLevelToZoomFActor } from 'vs/plAtform/windows/common/windows';
import { importEntries, mArk } from 'vs/bAse/common/performAnce';
import { Workbench } from 'vs/workbench/browser/workbench';
import { NAtiveWindow } from 'vs/workbench/electron-sAndbox/window';
import { setZoomLevel, setZoomFActor, setFullscreen } from 'vs/bAse/browser/browser';
import { domContentLoAded, AddDisposAbleListener, EventType, scheduleAtNextAnimAtionFrAme } from 'vs/bAse/browser/dom';
import { URI } from 'vs/bAse/common/uri';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { reviveWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ILogService } from 'vs/plAtform/log/common/log';
import { SchemAs } from 'vs/bAse/common/network';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IMAinProcessService, MAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { IRemoteAuthorityResolverService } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { RemoteFileSystemProvider } from 'vs/workbench/services/remote/common/remoteAgentFileSystemChAnnel';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { FileUserDAtAProvider } from 'vs/workbench/services/userDAtA/common/fileUserDAtAProvider';
import { IProductService } from 'vs/plAtform/product/common/productService';
import product from 'vs/plAtform/product/common/product';
import { IResourceIdentityService } from 'vs/workbench/services/resourceIdentity/common/resourceIdentityService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { NAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtiveHostService';
import { SimpleConfigurAtionService, simpleFileSystemProvider, SimpleLogService, SimpleRemoteAgentService, SimpleResourceIdentityService, SimpleSignService, SimpleStorAgeService, SimpleNAtiveWorkbenchEnvironmentService, SimpleWorkspAceService } from 'vs/workbench/electron-sAndbox/sAndbox.simpleservices';
import { INAtiveWorkbenchConfigurAtion, INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { RemoteAuthorityResolverService } from 'vs/plAtform/remote/electron-sAndbox/remoteAuthorityResolverService';

clAss DesktopMAin extends DisposAble {

	privAte reAdonly environmentService = new SimpleNAtiveWorkbenchEnvironmentService(this.configurAtion);

	constructor(privAte configurAtion: INAtiveWorkbenchConfigurAtion) {
		super();

		this.init();
	}

	privAte init(): void {

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

		// Logging
		services.logService.trAce('workbench configurAtion', JSON.stringify(this.configurAtion));
	}

	privAte registerListeners(workbench: Workbench, storAgeService: SimpleStorAgeService): void {

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

	privAte Async initServices(): Promise<{ serviceCollection: ServiceCollection, logService: ILogService, storAgeService: SimpleStorAgeService }> {
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
		const productService: IProductService = { _serviceBrAnd: undefined, ...product };
		serviceCollection.set(IProductService, productService);

		// Log
		const logService = new SimpleLogService();
		serviceCollection.set(ILogService, logService);

		// Remote
		const remoteAuthorityResolverService = new RemoteAuthorityResolverService();
		serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);

		// Sign
		const signService = new SimpleSignService();
		serviceCollection.set(ISignService, signService);

		// Remote Agent
		const remoteAgentService = new SimpleRemoteAgentService();
		serviceCollection.set(IRemoteAgentService, remoteAgentService);


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


		// NAtive Host
		const nAtiveHostService = new NAtiveHostService(this.configurAtion.windowId, mAinProcessService) As INAtiveHostService;
		serviceCollection.set(INAtiveHostService, nAtiveHostService);

		// Files
		const fileService = this._register(new FileService(logService));
		serviceCollection.set(IFileService, fileService);

		fileService.registerProvider(SchemAs.file, simpleFileSystemProvider);

		// User DAtA Provider
		fileService.registerProvider(SchemAs.userDAtA, new FileUserDAtAProvider(URI.file('user-home'), undefined, simpleFileSystemProvider, this.environmentService, logService));

		const connection = remoteAgentService.getConnection();
		if (connection) {
			const remoteFileSystemProvider = this._register(new RemoteFileSystemProvider(remoteAgentService));
			fileService.registerProvider(SchemAs.vscodeRemote, remoteFileSystemProvider);
		}

		const resourceIdentityService = new SimpleResourceIdentityService();
		serviceCollection.set(IResourceIdentityService, resourceIdentityService);


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


		const services = AwAit Promise.All([
			this.creAteWorkspAceService().then(service => {

				// WorkspAce
				serviceCollection.set(IWorkspAceContextService, service);

				// ConfigurAtion
				serviceCollection.set(IConfigurAtionService, new SimpleConfigurAtionService());

				return service;
			}),

			this.creAteStorAgeService().then(service => {

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

	privAte Async creAteWorkspAceService(): Promise<IWorkspAceContextService> {
		return new SimpleWorkspAceService();
	}

	privAte Async creAteStorAgeService(): Promise<SimpleStorAgeService> {
		return new SimpleStorAgeService();
	}
}

export function mAin(configurAtion: INAtiveWorkbenchConfigurAtion): Promise<void> {
	const workbench = new DesktopMAin(configurAtion);

	return workbench.open();
}
