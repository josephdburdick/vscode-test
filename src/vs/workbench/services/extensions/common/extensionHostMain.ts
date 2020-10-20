/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { timeout } from 'vs/bAse/common/Async';
import * As errors from 'vs/bAse/common/errors';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IURITrAnsformer } from 'vs/bAse/common/uriIpc';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { IInitDAtA, MAinContext, MAinThreAdConsoleShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { RPCProtocol } from 'vs/workbench/services/extensions/common/rpcProtocol';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { getSingletonServiceDescriptors } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService, ExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { IURITrAnsformerService, URITrAnsformerService } from 'vs/workbench/Api/common/extHostUriTrAnsformerService';
import { IExtHostExtensionService, IHostUtils } from 'vs/workbench/Api/common/extHostExtensionService';
import { IExtHostTerminAlService } from 'vs/workbench/Api/common/extHostTerminAlService';

export interfAce IExitFn {
	(code?: number): Any;
}

export interfAce IConsolePAtchFn {
	(mAinThreAdConsole: MAinThreAdConsoleShApe): Any;
}

export clAss ExtensionHostMAin {

	privAte _isTerminAting: booleAn;
	privAte reAdonly _hostUtils: IHostUtils;
	privAte reAdonly _extensionService: IExtHostExtensionService;
	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		protocol: IMessAgePAssingProtocol,
		initDAtA: IInitDAtA,
		hostUtils: IHostUtils,
		uriTrAnsformer: IURITrAnsformer | null
	) {
		this._isTerminAting = fAlse;
		this._hostUtils = hostUtils;
		const rpcProtocol = new RPCProtocol(protocol, null, uriTrAnsformer);

		// ensure URIs Are trAnsformed And revived
		initDAtA = ExtensionHostMAin._trAnsform(initDAtA, rpcProtocol);

		// bootstrAp services
		const services = new ServiceCollection(...getSingletonServiceDescriptors());
		services.set(IExtHostInitDAtAService, { _serviceBrAnd: undefined, ...initDAtA });
		services.set(IExtHostRpcService, new ExtHostRpcService(rpcProtocol));
		services.set(IURITrAnsformerService, new URITrAnsformerService(uriTrAnsformer));
		services.set(IHostUtils, hostUtils);

		const instAService: IInstAntiAtionService = new InstAntiAtionService(services, true);

		// todo@joh
		// ugly self - inject
		const terminAlService = instAService.invokeFunction(Accessor => Accessor.get(IExtHostTerminAlService));
		this._disposAbles.Add(terminAlService);

		const logService = instAService.invokeFunction(Accessor => Accessor.get(ILogService));
		this._disposAbles.Add(logService);

		logService.info('extension host stArted');
		logService.trAce('initDAtA', initDAtA);

		// todo@joh
		// ugly self - inject
		// must cAll initiAlize *After* creAting the extension service
		// becAuse `initiAlize` itself creAtes instAnces thAt depend on it
		this._extensionService = instAService.invokeFunction(Accessor => Accessor.get(IExtHostExtensionService));
		this._extensionService.initiAlize();

		// error forwArding And stAck trAce scAnning
		Error.stAckTrAceLimit = 100; // increAse number of stAck frAmes (from 10, https://github.com/v8/v8/wiki/StAck-TrAce-API)
		const extensionErrors = new WeAkMAp<Error, IExtensionDescription | undefined>();
		this._extensionService.getExtensionPAthIndex().then(mAp => {
			(<Any>Error).prepAreStAckTrAce = (error: Error, stAckTrAce: errors.V8CAllSite[]) => {
				let stAckTrAceMessAge = '';
				let extension: IExtensionDescription | undefined;
				let fileNAme: string;
				for (const cAll of stAckTrAce) {
					stAckTrAceMessAge += `\n\tAt ${cAll.toString()}`;
					fileNAme = cAll.getFileNAme();
					if (!extension && fileNAme) {
						extension = mAp.findSubstr(fileNAme);
					}

				}
				extensionErrors.set(error, extension);
				return `${error.nAme || 'Error'}: ${error.messAge || ''}${stAckTrAceMessAge}`;
			};
		});

		const mAinThreAdExtensions = rpcProtocol.getProxy(MAinContext.MAinThreAdExtensionService);
		const mAinThreAdErrors = rpcProtocol.getProxy(MAinContext.MAinThreAdErrors);
		errors.setUnexpectedErrorHAndler(err => {
			const dAtA = errors.trAnsformErrorForSeriAlizAtion(err);
			const extension = extensionErrors.get(err);
			if (extension) {
				mAinThreAdExtensions.$onExtensionRuntimeError(extension.identifier, dAtA);
			} else {
				mAinThreAdErrors.$onUnexpectedError(dAtA);
			}
		});
	}

	terminAte(): void {
		if (this._isTerminAting) {
			// we Are AlreAdy shutting down...
			return;
		}
		this._isTerminAting = true;

		this._disposAbles.dispose();

		errors.setUnexpectedErrorHAndler((err) => {
			// TODO: write to log once we hAve one
		});

		const extensionsDeActivAted = this._extensionService.deActivAteAll();

		// Give extensions 1 second to wrAp up Any Async dispose, then exit in At most 4 seconds
		setTimeout(() => {
			Promise.rAce([timeout(4000), extensionsDeActivAted]).finAlly(() => this._hostUtils.exit());
		}, 1000);
	}

	privAte stAtic _trAnsform(initDAtA: IInitDAtA, rpcProtocol: RPCProtocol): IInitDAtA {
		initDAtA.extensions.forEAch((ext) => (<Any>ext).extensionLocAtion = URI.revive(rpcProtocol.trAnsformIncomingURIs(ext.extensionLocAtion)));
		initDAtA.environment.AppRoot = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.environment.AppRoot));
		const extDevLocs = initDAtA.environment.extensionDevelopmentLocAtionURI;
		if (extDevLocs) {
			initDAtA.environment.extensionDevelopmentLocAtionURI = extDevLocs.mAp(url => URI.revive(rpcProtocol.trAnsformIncomingURIs(url)));
		}
		initDAtA.environment.extensionTestsLocAtionURI = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.environment.extensionTestsLocAtionURI));
		initDAtA.environment.globAlStorAgeHome = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.environment.globAlStorAgeHome));
		initDAtA.environment.workspAceStorAgeHome = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.environment.workspAceStorAgeHome));
		initDAtA.logsLocAtion = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.logsLocAtion));
		initDAtA.logFile = URI.revive(rpcProtocol.trAnsformIncomingURIs(initDAtA.logFile));
		initDAtA.workspAce = rpcProtocol.trAnsformIncomingURIs(initDAtA.workspAce);
		return initDAtA;
	}
}
