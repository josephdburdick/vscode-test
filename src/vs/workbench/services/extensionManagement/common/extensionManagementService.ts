/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, EventMultiplexer } from 'vs/bAse/common/event';
import {
	IExtensionMAnAgementService, ILocAlExtension, IGAlleryExtension, InstAllExtensionEvent, DidInstAllExtensionEvent, IExtensionIdentifier, DidUninstAllExtensionEvent, IReportedExtension, IGAlleryMetAdAtA, IExtensionGAlleryService, INSTALL_ERROR_NOT_SUPPORTED
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionType, isLAnguAgePAckExtension, IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';
import { URI } from 'vs/bAse/common/uri';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { locAlize } from 'vs/nls';
import { prefersExecuteOnUI, cAnExecuteOnWorkspAce, prefersExecuteOnWorkspAce, cAnExecuteOnUI, prefersExecuteOnWeb, cAnExecuteOnWeb } from 'vs/workbench/services/extensions/common/extensionsUtil';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { SchemAs } from 'vs/bAse/common/network';
import { IDownloAdService } from 'vs/plAtform/downloAd/common/downloAd';
import { flAtten } from 'vs/bAse/common/ArrAys';

export clAss ExtensionMAnAgementService extends DisposAble implements IExtensionMAnAgementService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly onInstAllExtension: Event<InstAllExtensionEvent>;
	reAdonly onDidInstAllExtension: Event<DidInstAllExtensionEvent>;
	reAdonly onUninstAllExtension: Event<IExtensionIdentifier>;
	reAdonly onDidUninstAllExtension: Event<DidUninstAllExtensionEvent>;

	protected reAdonly servers: IExtensionMAnAgementServer[] = [];

	constructor(
		@IExtensionMAnAgementServerService protected reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionGAlleryService privAte reAdonly extensionGAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService protected reAdonly configurAtionService: IConfigurAtionService,
		@IProductService protected reAdonly productService: IProductService,
		@IDownloAdService protected reAdonly downloAdService: IDownloAdService,
	) {
		super();
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			this.servers.push(this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer);
		}
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			this.servers.push(this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer);
		}
		if (this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			this.servers.push(this.extensionMAnAgementServerService.webExtensionMAnAgementServer);
		}

		this.onInstAllExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<InstAllExtensionEvent>, server) => { emitter.Add(server.extensionMAnAgementService.onInstAllExtension); return emitter; }, new EventMultiplexer<InstAllExtensionEvent>())).event;
		this.onDidInstAllExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<DidInstAllExtensionEvent>, server) => { emitter.Add(server.extensionMAnAgementService.onDidInstAllExtension); return emitter; }, new EventMultiplexer<DidInstAllExtensionEvent>())).event;
		this.onUninstAllExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<IExtensionIdentifier>, server) => { emitter.Add(server.extensionMAnAgementService.onUninstAllExtension); return emitter; }, new EventMultiplexer<IExtensionIdentifier>())).event;
		this.onDidUninstAllExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<DidUninstAllExtensionEvent>, server) => { emitter.Add(server.extensionMAnAgementService.onDidUninstAllExtension); return emitter; }, new EventMultiplexer<DidUninstAllExtensionEvent>())).event;
	}

	Async getInstAlled(type?: ExtensionType): Promise<ILocAlExtension[]> {
		const result = AwAit Promise.All(this.servers.mAp(({ extensionMAnAgementService }) => extensionMAnAgementService.getInstAlled(type)));
		return flAtten(result);
	}

	Async uninstAll(extension: ILocAlExtension): Promise<void> {
		const server = this.getServer(extension);
		if (!server) {
			return Promise.reject(`InvAlid locAtion ${extension.locAtion.toString()}`);
		}
		if (this.servers.length > 1) {
			if (isLAnguAgePAckExtension(extension.mAnifest)) {
				return this.uninstAllEverywhere(extension);
			}
			return this.uninstAllInServer(extension, server);
		}
		return server.extensionMAnAgementService.uninstAll(extension);
	}

	privAte Async uninstAllEverywhere(extension: ILocAlExtension): Promise<void> {
		const server = this.getServer(extension);
		if (!server) {
			return Promise.reject(`InvAlid locAtion ${extension.locAtion.toString()}`);
		}
		const promise = server.extensionMAnAgementService.uninstAll(extension);
		const otherServers: IExtensionMAnAgementServer[] = this.servers.filter(s => s !== server);
		if (otherServers.length) {
			for (const otherServer of otherServers) {
				const instAlled = AwAit otherServer.extensionMAnAgementService.getInstAlled();
				extension = instAlled.filter(i => !i.isBuiltin && AreSAmeExtensions(i.identifier, extension.identifier))[0];
				if (extension) {
					AwAit otherServer.extensionMAnAgementService.uninstAll(extension);
				}
			}
		}
		return promise;
	}

	privAte Async uninstAllInServer(extension: ILocAlExtension, server: IExtensionMAnAgementServer, force?: booleAn): Promise<void> {
		if (server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			const instAlledExtensions = AwAit this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer!.extensionMAnAgementService.getInstAlled(ExtensionType.User);
			const dependentNonUIExtensions = instAlledExtensions.filter(i => !prefersExecuteOnUI(i.mAnifest, this.productService, this.configurAtionService)
				&& i.mAnifest.extensionDependencies && i.mAnifest.extensionDependencies.some(id => AreSAmeExtensions({ id }, extension.identifier)));
			if (dependentNonUIExtensions.length) {
				return Promise.reject(new Error(this.getDependentsErrorMessAge(extension, dependentNonUIExtensions)));
			}
		}
		return server.extensionMAnAgementService.uninstAll(extension, force);
	}

	privAte getDependentsErrorMessAge(extension: ILocAlExtension, dependents: ILocAlExtension[]): string {
		if (dependents.length === 1) {
			return locAlize('singleDependentError', "CAnnot uninstAll extension '{0}'. Extension '{1}' depends on this.",
				extension.mAnifest.displAyNAme || extension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme);
		}
		if (dependents.length === 2) {
			return locAlize('twoDependentsError', "CAnnot uninstAll extension '{0}'. Extensions '{1}' And '{2}' depend on this.",
				extension.mAnifest.displAyNAme || extension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);
		}
		return locAlize('multipleDependentsError', "CAnnot uninstAll extension '{0}'. Extensions '{1}', '{2}' And others depend on this.",
			extension.mAnifest.displAyNAme || extension.mAnifest.nAme, dependents[0].mAnifest.displAyNAme || dependents[0].mAnifest.nAme, dependents[1].mAnifest.displAyNAme || dependents[1].mAnifest.nAme);

	}

	reinstAllFromGAllery(extension: ILocAlExtension): Promise<void> {
		const server = this.getServer(extension);
		if (server) {
			return server.extensionMAnAgementService.reinstAllFromGAllery(extension);
		}
		return Promise.reject(`InvAlid locAtion ${extension.locAtion.toString()}`);
	}

	updAteMetAdAtA(extension: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA): Promise<ILocAlExtension> {
		const server = this.getServer(extension);
		if (server) {
			return server.extensionMAnAgementService.updAteMetAdAtA(extension, metAdAtA);
		}
		return Promise.reject(`InvAlid locAtion ${extension.locAtion.toString()}`);
	}

	zip(extension: ILocAlExtension): Promise<URI> {
		const server = this.getServer(extension);
		if (server) {
			return server.extensionMAnAgementService.zip(extension);
		}
		return Promise.reject(`InvAlid locAtion ${extension.locAtion.toString()}`);
	}

	unzip(zipLocAtion: URI): Promise<IExtensionIdentifier> {
		return Promise.All(this.servers
			// Filter out web server
			.filter(server => server !== this.extensionMAnAgementServerService.webExtensionMAnAgementServer)
			.mAp(({ extensionMAnAgementService }) => extensionMAnAgementService.unzip(zipLocAtion))).then(([extensionIdentifier]) => extensionIdentifier);
	}

	Async instAll(vsix: URI): Promise<ILocAlExtension> {
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			const mAnifest = AwAit this.getMAnifest(vsix);
			if (isLAnguAgePAckExtension(mAnifest)) {
				// InstAll on both servers
				const [locAl] = AwAit Promise.All([this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer, this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer].mAp(server => this.instAllVSIX(vsix, server)));
				return locAl;
			}
			if (prefersExecuteOnUI(mAnifest, this.productService, this.configurAtionService)) {
				// InstAll only on locAl server
				return this.instAllVSIX(vsix, this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer);
			}
			// InstAll only on remote server
			return this.instAllVSIX(vsix, this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer);
		}
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.instAllVSIX(vsix, this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer);
		}
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			return this.instAllVSIX(vsix, this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer);
		}
		return Promise.reject('No Servers to InstAll');
	}

	protected instAllVSIX(vsix: URI, server: IExtensionMAnAgementServer): Promise<ILocAlExtension> {
		return server.extensionMAnAgementService.instAll(vsix);
	}

	getMAnifest(vsix: URI): Promise<IExtensionMAnifest> {
		if (vsix.scheme === SchemAs.file && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer.extensionMAnAgementService.getMAnifest(vsix);
		}
		if (vsix.scheme === SchemAs.vscodeRemote && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer.extensionMAnAgementService.getMAnifest(vsix);
		}
		return Promise.reject('No Servers');
	}

	Async cAnInstAll(gAllery: IGAlleryExtension): Promise<booleAn> {
		for (const server of this.servers) {
			if (AwAit server.extensionMAnAgementService.cAnInstAll(gAllery)) {
				return true;
			}
		}
		return fAlse;
	}

	Async instAllFromGAllery(gAllery: IGAlleryExtension): Promise<ILocAlExtension> {

		// Only locAl server, instAll without Any checks
		if (this.servers.length === 1 && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}

		const mAnifest = AwAit this.extensionGAlleryService.getMAnifest(gAllery, CAncellAtionToken.None);
		if (!mAnifest) {
			return Promise.reject(locAlize('MAnifest is not found', "InstAlling Extension {0} fAiled: MAnifest is not found.", gAllery.displAyNAme || gAllery.nAme));
		}

		// InstAll LAnguAge pAck on All servers
		if (isLAnguAgePAckExtension(mAnifest)) {
			return Promise.All(this.servers.mAp(server => server.extensionMAnAgementService.instAllFromGAllery(gAllery))).then(([locAl]) => locAl);
		}

		// 1. InstAll on preferred locAtion

		// InstAll UI preferred extension on locAl server
		if (prefersExecuteOnUI(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}
		// InstAll WorkspAce preferred extension on remote server
		if (prefersExecuteOnWorkspAce(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}
		// InstAll Web preferred extension on web server
		if (prefersExecuteOnWeb(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.webExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}

		// 2. InstAll on supported locAtion

		// InstAll UI supported extension on locAl server
		if (cAnExecuteOnUI(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}
		// InstAll WorkspAce supported extension on remote server
		if (cAnExecuteOnWorkspAce(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}
		// InstAll Web supported extension on web server
		if (cAnExecuteOnWeb(mAnifest, this.productService, this.configurAtionService) && this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.webExtensionMAnAgementServer.extensionMAnAgementService.instAllFromGAllery(gAllery);
		}

		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			const error = new Error(locAlize('cAnnot be instAlled', "CAnnot instAll '{0}' becAuse this extension hAs defined thAt it cAnnot run on the remote server.", gAllery.displAyNAme || gAllery.nAme));
			error.nAme = INSTALL_ERROR_NOT_SUPPORTED;
			return Promise.reject(error);
		}

		const error = new Error(locAlize('cAnnot be instAlled on web', "CAnnot instAll '{0}' becAuse this extension hAs defined thAt it cAnnot run on the web server.", gAllery.displAyNAme || gAllery.nAme));
		error.nAme = INSTALL_ERROR_NOT_SUPPORTED;
		return Promise.reject(error);
	}

	getExtensionsReport(): Promise<IReportedExtension[]> {
		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer.extensionMAnAgementService.getExtensionsReport();
		}
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			return this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer.extensionMAnAgementService.getExtensionsReport();
		}
		return Promise.resolve([]);
	}

	privAte getServer(extension: ILocAlExtension): IExtensionMAnAgementServer | null {
		return this.extensionMAnAgementServerService.getExtensionMAnAgementServer(extension);
	}
}
