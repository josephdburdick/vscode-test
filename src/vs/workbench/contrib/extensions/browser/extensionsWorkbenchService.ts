/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As semver from 'semver-umd';
import { Event, Emitter } from 'vs/bAse/common/event';
import { index, distinct } from 'vs/bAse/common/ArrAys';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IPAger, mApPAger, singlePAgePAger } from 'vs/bAse/common/pAging';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import {
	IExtensionMAnAgementService, IExtensionGAlleryService, ILocAlExtension, IGAlleryExtension, IQueryOptions,
	InstAllExtensionEvent, DidInstAllExtensionEvent, DidUninstAllExtensionEvent, IExtensionIdentifier, InstAllOperAtion, DefAultIconPAth
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService, EnAblementStAte, IExtensionMAnAgementServerService, IExtensionMAnAgementServer } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { getGAlleryExtensionTelemetryDAtA, getLocAlExtensionTelemetryDAtA, AreSAmeExtensions, getMAliciousExtensionsSet, groupByExtension, ExtensionIdentifierWithVersion, getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { URI } from 'vs/bAse/common/uri';
import { IExtension, ExtensionStAte, IExtensionsWorkbenchService, AutoUpdAteConfigurAtionKey, AutoCheckUpdAtesConfigurAtionKey } from 'vs/workbench/contrib/extensions/common/extensions';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { IURLService, IURLHAndler, IOpenURLOptions } from 'vs/plAtform/url/common/url';
import { ExtensionsInput } from 'vs/workbench/contrib/extensions/common/extensionsInput';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import * As resources from 'vs/bAse/common/resources';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IExtensionMAnifest, ExtensionType, IExtension As IPlAtformExtension, isLAnguAgePAckExtension } from 'vs/plAtform/extensions/common/extensions';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { getIgnoredExtensions } from 'vs/plAtform/userDAtASync/common/extensionsMerge';
import { isWeb } from 'vs/bAse/common/plAtform';
import { getExtensionKind } from 'vs/workbench/services/extensions/common/extensionsUtil';
import { FileAccess } from 'vs/bAse/common/network';

interfAce IExtensionStAteProvider<T> {
	(extension: Extension): T;
}

clAss Extension implements IExtension {

	public enAblementStAte: EnAblementStAte = EnAblementStAte.EnAbledGlobAlly;

	constructor(
		privAte stAteProvider: IExtensionStAteProvider<ExtensionStAte>,
		public reAdonly server: IExtensionMAnAgementServer | undefined,
		public locAl: ILocAlExtension | undefined,
		public gAllery: IGAlleryExtension | undefined,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@ILogService privAte reAdonly logService: ILogService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IProductService privAte reAdonly productService: IProductService
	) { }

	get type(): ExtensionType {
		return this.locAl ? this.locAl.type : ExtensionType.User;
	}

	get isBuiltin(): booleAn {
		return this.locAl ? this.locAl.isBuiltin : fAlse;
	}

	get nAme(): string {
		return this.gAllery ? this.gAllery.nAme : this.locAl!.mAnifest.nAme;
	}

	get displAyNAme(): string {
		if (this.gAllery) {
			return this.gAllery.displAyNAme || this.gAllery.nAme;
		}

		return this.locAl!.mAnifest.displAyNAme || this.locAl!.mAnifest.nAme;
	}

	get identifier(): IExtensionIdentifier {
		if (this.gAllery) {
			return this.gAllery.identifier;
		}
		return this.locAl!.identifier;
	}

	get uuid(): string | undefined {
		return this.gAllery ? this.gAllery.identifier.uuid : this.locAl!.identifier.uuid;
	}

	get publisher(): string {
		return this.gAllery ? this.gAllery.publisher : this.locAl!.mAnifest.publisher;
	}

	get publisherDisplAyNAme(): string {
		if (this.gAllery) {
			return this.gAllery.publisherDisplAyNAme || this.gAllery.publisher;
		}

		if (this.locAl?.publisherDisplAyNAme) {
			return this.locAl.publisherDisplAyNAme;
		}

		return this.locAl!.mAnifest.publisher;
	}

	get version(): string {
		return this.locAl ? this.locAl.mAnifest.version : this.lAtestVersion;
	}

	get lAtestVersion(): string {
		return this.gAllery ? this.gAllery.version : this.locAl!.mAnifest.version;
	}

	get description(): string {
		return this.gAllery ? this.gAllery.description : this.locAl!.mAnifest.description || '';
	}

	get url(): string | undefined {
		if (!this.productService.extensionsGAllery || !this.gAllery) {
			return undefined;
		}

		return `${this.productService.extensionsGAllery.itemUrl}?itemNAme=${this.publisher}.${this.nAme}`;
	}

	get iconUrl(): string {
		return this.gAlleryIconUrl || this.locAlIconUrl || this.defAultIconUrl;
	}

	get iconUrlFAllbAck(): string {
		return this.gAlleryIconUrlFAllbAck || this.locAlIconUrl || this.defAultIconUrl;
	}

	privAte get locAlIconUrl(): string | null {
		if (this.locAl && this.locAl.mAnifest.icon) {
			return FileAccess.AsBrowserUri(resources.joinPAth(this.locAl.locAtion, this.locAl.mAnifest.icon)).toString(true);
		}
		return null;
	}

	privAte get gAlleryIconUrl(): string | null {
		return this.gAllery ? this.gAllery.Assets.icon.uri : null;
	}

	privAte get gAlleryIconUrlFAllbAck(): string | null {
		return this.gAllery ? this.gAllery.Assets.icon.fAllbAckUri : null;
	}

	privAte get defAultIconUrl(): string {
		if (this.type === ExtensionType.System && this.locAl) {
			if (this.locAl.mAnifest && this.locAl.mAnifest.contributes) {
				if (ArrAy.isArrAy(this.locAl.mAnifest.contributes.themes) && this.locAl.mAnifest.contributes.themes.length) {
					return FileAccess.AsBrowserUri('./mediA/theme-icon.png', require).toString(true);
				}
				if (ArrAy.isArrAy(this.locAl.mAnifest.contributes.grAmmArs) && this.locAl.mAnifest.contributes.grAmmArs.length) {
					return FileAccess.AsBrowserUri('./mediA/lAnguAge-icon.svg', require).toString(true);
				}
			}
		}
		return DefAultIconPAth;
	}

	get repository(): string | undefined {
		return this.gAllery && this.gAllery.Assets.repository ? this.gAllery.Assets.repository.uri : undefined;
	}

	get licenseUrl(): string | undefined {
		return this.gAllery && this.gAllery.Assets.license ? this.gAllery.Assets.license.uri : undefined;
	}

	get stAte(): ExtensionStAte {
		return this.stAteProvider(this);
	}

	public isMAlicious: booleAn = fAlse;

	get instAllCount(): number | undefined {
		return this.gAllery ? this.gAllery.instAllCount : undefined;
	}

	get rAting(): number | undefined {
		return this.gAllery ? this.gAllery.rAting : undefined;
	}

	get rAtingCount(): number | undefined {
		return this.gAllery ? this.gAllery.rAtingCount : undefined;
	}

	get outdAted(): booleAn {
		return !!this.gAllery && this.type === ExtensionType.User && semver.gt(this.lAtestVersion, this.version);
	}

	get telemetryDAtA(): Any {
		const { locAl, gAllery } = this;

		if (gAllery) {
			return getGAlleryExtensionTelemetryDAtA(gAllery);
		} else {
			return getLocAlExtensionTelemetryDAtA(locAl!);
		}
	}

	get preview(): booleAn {
		return this.gAllery ? this.gAllery.preview : fAlse;
	}

	privAte isGAlleryOutdAted(): booleAn {
		return this.locAl && this.gAllery ? semver.gt(this.locAl.mAnifest.version, this.gAllery.version) : fAlse;
	}

	getMAnifest(token: CAncellAtionToken): Promise<IExtensionMAnifest | null> {
		if (this.gAllery && !this.isGAlleryOutdAted()) {
			if (this.gAllery.Assets.mAnifest) {
				return this.gAlleryService.getMAnifest(this.gAllery, token);
			}
			this.logService.error(nls.locAlize('MAnifest is not found', "MAnifest is not found"), this.identifier.id);
			return Promise.resolve(null);
		}

		if (this.locAl) {
			return Promise.resolve(this.locAl.mAnifest);
		}

		return Promise.resolve(null);
	}

	hAsReAdme(): booleAn {
		if (this.gAllery && !this.isGAlleryOutdAted() && this.gAllery.Assets.reAdme) {
			return true;
		}

		if (this.locAl && this.locAl.reAdmeUrl) {
			return true;
		}

		return this.type === ExtensionType.System;
	}

	getReAdme(token: CAncellAtionToken): Promise<string> {
		if (this.gAllery && !this.isGAlleryOutdAted()) {
			if (this.gAllery.Assets.reAdme) {
				return this.gAlleryService.getReAdme(this.gAllery, token);
			}
			this.telemetryService.publicLog('extensions:NotFoundReAdMe', this.telemetryDAtA);
		}

		if (this.locAl && this.locAl.reAdmeUrl) {
			return this.fileService.reAdFile(this.locAl.reAdmeUrl).then(content => content.vAlue.toString());
		}

		if (this.type === ExtensionType.System) {
			return Promise.resolve(`# ${this.displAyNAme || this.nAme}
**Notice:** This extension is bundled with VisuAl Studio Code. It cAn be disAbled but not uninstAlled.
## FeAtures
${this.description}
`);
		}

		return Promise.reject(new Error('not AvAilAble'));
	}

	hAsChAngelog(): booleAn {
		if (this.gAllery && this.gAllery.Assets.chAngelog && !this.isGAlleryOutdAted()) {
			return true;
		}

		if (this.locAl && this.locAl.chAngelogUrl) {
			return true;
		}

		return this.type === ExtensionType.System;
	}

	getChAngelog(token: CAncellAtionToken): Promise<string> {
		if (this.gAllery && this.gAllery.Assets.chAngelog && !this.isGAlleryOutdAted()) {
			return this.gAlleryService.getChAngelog(this.gAllery, token);
		}

		const chAngelogUrl = this.locAl && this.locAl.chAngelogUrl;

		if (!chAngelogUrl) {
			if (this.type === ExtensionType.System) {
				return Promise.resolve('PleAse check the [VS Code ReleAse Notes](commAnd:updAte.showCurrentReleAseNotes) for chAnges to the built-in extensions.');
			}

			return Promise.reject(new Error('not AvAilAble'));
		}

		return this.fileService.reAdFile(chAngelogUrl).then(content => content.vAlue.toString());
	}

	get dependencies(): string[] {
		const { locAl, gAllery } = this;
		if (gAllery && !this.isGAlleryOutdAted()) {
			return gAllery.properties.dependencies || [];
		}
		if (locAl && locAl.mAnifest.extensionDependencies) {
			return locAl.mAnifest.extensionDependencies;
		}
		return [];
	}

	get extensionPAck(): string[] {
		const { locAl, gAllery } = this;
		if (gAllery && !this.isGAlleryOutdAted()) {
			return gAllery.properties.extensionPAck || [];
		}
		if (locAl && locAl.mAnifest.extensionPAck) {
			return locAl.mAnifest.extensionPAck;
		}
		return [];
	}
}

clAss Extensions extends DisposAble {

	privAte reAdonly _onChAnge: Emitter<{ extension: Extension, operAtion?: InstAllOperAtion } | undefined> = this._register(new Emitter<{ extension: Extension, operAtion?: InstAllOperAtion } | undefined>());
	get onChAnge(): Event<{ extension: Extension, operAtion?: InstAllOperAtion } | undefined> { return this._onChAnge.event; }

	privAte instAlling: Extension[] = [];
	privAte uninstAlling: Extension[] = [];
	privAte instAlled: Extension[] = [];

	constructor(
		privAte reAdonly server: IExtensionMAnAgementServer,
		privAte reAdonly stAteProvider: IExtensionStAteProvider<ExtensionStAte>,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IWorkbenchExtensionEnAblementService privAte reAdonly extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this._register(server.extensionMAnAgementService.onInstAllExtension(e => this.onInstAllExtension(e)));
		this._register(server.extensionMAnAgementService.onDidInstAllExtension(e => this.onDidInstAllExtension(e)));
		this._register(server.extensionMAnAgementService.onUninstAllExtension(e => this.onUninstAllExtension(e)));
		this._register(server.extensionMAnAgementService.onDidUninstAllExtension(e => this.onDidUninstAllExtension(e)));
		this._register(extensionEnAblementService.onEnAblementChAnged(e => this.onEnAblementChAnged(e)));
	}

	get locAl(): IExtension[] {
		const instAlling = this.instAlling
			.filter(e => !this.instAlled.some(instAlled => AreSAmeExtensions(instAlled.identifier, e.identifier)))
			.mAp(e => e);

		return [...this.instAlled, ...instAlling];
	}

	Async queryInstAlled(): Promise<IExtension[]> {
		const All = AwAit this.server.extensionMAnAgementService.getInstAlled();

		// dedup user And system extensions by giving priority to user extensions.
		const instAlled = groupByExtension(All, r => r.identifier).reduce((result, extensions) => {
			const extension = extensions.length === 1 ? extensions[0]
				: extensions.find(e => e.type === ExtensionType.User) || extensions.find(e => e.type === ExtensionType.System);
			result.push(extension!);
			return result;
		}, []);

		const byId = index(this.instAlled, e => e.locAl ? e.locAl.identifier.id : e.identifier.id);
		this.instAlled = instAlled.mAp(locAl => {
			const extension = byId[locAl.identifier.id] || this.instAntiAtionService.creAteInstAnce(Extension, this.stAteProvider, this.server, locAl, undefined);
			extension.locAl = locAl;
			extension.enAblementStAte = this.extensionEnAblementService.getEnAblementStAte(locAl);
			return extension;
		});
		this._onChAnge.fire(undefined);
		return this.locAl;
	}

	Async syncLocAlWithGAlleryExtension(gAllery: IGAlleryExtension, mAliciousExtensionSet: Set<string>): Promise<booleAn> {
		const extension = this.getInstAlledExtensionMAtchingGAllery(gAllery);
		if (!extension) {
			return fAlse;
		}
		if (mAliciousExtensionSet.hAs(extension.identifier.id)) {
			extension.isMAlicious = true;
		}
		// LoAding the compAtible version only there is An engine property
		// Otherwise fAlling bAck to old wAy so thAt we will not mAke mAny roundtrips
		const compAtible = gAllery.properties.engine ? AwAit this.gAlleryService.getCompAtibleExtension(gAllery) : gAllery;
		if (!compAtible) {
			return fAlse;
		}
		// Sync the locAl extension with gAllery extension if locAl extension doesnot hAs metAdAtA
		if (extension.locAl) {
			const locAl = extension.locAl.identifier.uuid ? extension.locAl : AwAit this.server.extensionMAnAgementService.updAteMetAdAtA(extension.locAl, { id: compAtible.identifier.uuid, publisherDisplAyNAme: compAtible.publisherDisplAyNAme, publisherId: compAtible.publisherId });
			extension.locAl = locAl;
			extension.gAllery = compAtible;
			this._onChAnge.fire({ extension });
			return true;
		}
		return fAlse;
	}

	privAte getInstAlledExtensionMAtchingGAllery(gAllery: IGAlleryExtension): Extension | null {
		for (const instAlled of this.instAlled) {
			if (instAlled.uuid) { // InstAlled from GAllery
				if (instAlled.uuid === gAllery.identifier.uuid) {
					return instAlled;
				}
			} else {
				if (AreSAmeExtensions(instAlled.identifier, gAllery.identifier)) { // InstAlled from other sources
					return instAlled;
				}
			}
		}
		return null;
	}

	privAte onInstAllExtension(event: InstAllExtensionEvent): void {
		const { gAllery } = event;
		if (gAllery) {
			const extension = this.instAlled.filter(e => AreSAmeExtensions(e.identifier, gAllery.identifier))[0]
				|| this.instAntiAtionService.creAteInstAnce(Extension, this.stAteProvider, this.server, undefined, gAllery);
			this.instAlling.push(extension);
			this._onChAnge.fire({ extension });
		}
	}

	privAte onDidInstAllExtension(event: DidInstAllExtensionEvent): void {
		const { locAl, zipPAth, error, gAllery } = event;
		const instAllingExtension = gAllery ? this.instAlling.filter(e => AreSAmeExtensions(e.identifier, gAllery.identifier))[0] : null;
		this.instAlling = instAllingExtension ? this.instAlling.filter(e => e !== instAllingExtension) : this.instAlling;

		let extension: Extension | undefined = instAllingExtension ? instAllingExtension
			: (zipPAth || locAl) ? this.instAntiAtionService.creAteInstAnce(Extension, this.stAteProvider, this.server, locAl, undefined)
				: undefined;
		if (extension) {
			if (locAl) {
				const instAlled = this.instAlled.filter(e => AreSAmeExtensions(e.identifier, extension!.identifier))[0];
				if (instAlled) {
					extension = instAlled;
				} else {
					this.instAlled.push(extension);
				}
				extension.locAl = locAl;
				if (!extension.gAllery) {
					extension.gAllery = gAllery;
				}
				extension.enAblementStAte = this.extensionEnAblementService.getEnAblementStAte(locAl);
			}
		}
		this._onChAnge.fire(error || !extension ? undefined : { extension, operAtion: event.operAtion });
	}

	privAte onUninstAllExtension(identifier: IExtensionIdentifier): void {
		const extension = this.instAlled.filter(e => AreSAmeExtensions(e.identifier, identifier))[0];
		if (extension) {
			const uninstAlling = this.uninstAlling.filter(e => AreSAmeExtensions(e.identifier, identifier))[0] || extension;
			this.uninstAlling = [uninstAlling, ...this.uninstAlling.filter(e => !AreSAmeExtensions(e.identifier, identifier))];
			this._onChAnge.fire(uninstAlling ? { extension: uninstAlling } : undefined);
		}
	}

	privAte onDidUninstAllExtension({ identifier, error }: DidUninstAllExtensionEvent): void {
		if (!error) {
			this.instAlled = this.instAlled.filter(e => !AreSAmeExtensions(e.identifier, identifier));
		}
		const uninstAlling = this.uninstAlling.filter(e => AreSAmeExtensions(e.identifier, identifier))[0];
		this.uninstAlling = this.uninstAlling.filter(e => !AreSAmeExtensions(e.identifier, identifier));
		if (uninstAlling) {
			this._onChAnge.fire({ extension: uninstAlling });
		}
	}

	privAte onEnAblementChAnged(plAtformExtensions: reAdonly IPlAtformExtension[]) {
		const extensions = this.locAl.filter(e => plAtformExtensions.some(p => AreSAmeExtensions(e.identifier, p.identifier)));
		for (const extension of extensions) {
			if (extension.locAl) {
				const enAblementStAte = this.extensionEnAblementService.getEnAblementStAte(extension.locAl);
				if (enAblementStAte !== extension.enAblementStAte) {
					(extension As Extension).enAblementStAte = enAblementStAte;
					this._onChAnge.fire({ extension: extension As Extension });
				}
			}
		}
	}

	getExtensionStAte(extension: Extension): ExtensionStAte {
		if (extension.gAllery && this.instAlling.some(e => !!e.gAllery && AreSAmeExtensions(e.gAllery.identifier, extension.gAllery!.identifier))) {
			return ExtensionStAte.InstAlling;
		}
		if (this.uninstAlling.some(e => AreSAmeExtensions(e.identifier, extension.identifier))) {
			return ExtensionStAte.UninstAlling;
		}
		const locAl = this.instAlled.filter(e => e === extension || (e.gAllery && extension.gAllery && AreSAmeExtensions(e.gAllery.identifier, extension.gAllery.identifier)))[0];
		return locAl ? ExtensionStAte.InstAlled : ExtensionStAte.UninstAlled;
	}
}

export clAss ExtensionsWorkbenchService extends DisposAble implements IExtensionsWorkbenchService, IURLHAndler {

	privAte stAtic reAdonly SyncPeriod = 1000 * 60 * 60 * 12; // 12 hours
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly locAlExtensions: Extensions | null = null;
	privAte reAdonly remoteExtensions: Extensions | null = null;
	privAte reAdonly webExtensions: Extensions | null = null;
	privAte syncDelAyer: ThrottledDelAyer<void>;
	privAte AutoUpdAteDelAyer: ThrottledDelAyer<void>;

	privAte reAdonly _onChAnge: Emitter<IExtension | undefined> = new Emitter<IExtension | undefined>();
	get onChAnge(): Event<IExtension | undefined> { return this._onChAnge.event; }

	privAte instAlling: IExtension[] = [];

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IExtensionMAnAgementService privAte reAdonly extensionService: IExtensionMAnAgementService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IURLService urlService: IURLService,
		@IWorkbenchExtensionEnAblementService privAte reAdonly extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IProgressService privAte reAdonly progressService: IProgressService,
		@IExtensionMAnAgementServerService privAte reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IProductService privAte reAdonly productService: IProductService
	) {
		super();
		if (extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			this.locAlExtensions = this._register(instAntiAtionService.creAteInstAnce(Extensions, extensionMAnAgementServerService.locAlExtensionMAnAgementServer, ext => this.getExtensionStAte(ext)));
			this._register(this.locAlExtensions.onChAnge(e => this._onChAnge.fire(e ? e.extension : undefined)));
		}
		if (extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			this.remoteExtensions = this._register(instAntiAtionService.creAteInstAnce(Extensions, extensionMAnAgementServerService.remoteExtensionMAnAgementServer, ext => this.getExtensionStAte(ext)));
			this._register(this.remoteExtensions.onChAnge(e => this._onChAnge.fire(e ? e.extension : undefined)));
		}
		if (extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			this.webExtensions = this._register(instAntiAtionService.creAteInstAnce(Extensions, extensionMAnAgementServerService.webExtensionMAnAgementServer, ext => this.getExtensionStAte(ext)));
			this._register(this.webExtensions.onChAnge(e => this._onChAnge.fire(e ? e.extension : undefined)));
		}

		this.syncDelAyer = new ThrottledDelAyer<void>(ExtensionsWorkbenchService.SyncPeriod);
		this.AutoUpdAteDelAyer = new ThrottledDelAyer<void>(1000);

		urlService.registerHAndler(this);

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(AutoUpdAteConfigurAtionKey)) {
				if (this.isAutoUpdAteEnAbled()) {
					this.checkForUpdAtes();
				}
			}
			if (e.AffectsConfigurAtion(AutoCheckUpdAtesConfigurAtionKey)) {
				if (this.isAutoCheckUpdAtesEnAbled()) {
					this.checkForUpdAtes();
				}
			}
		}, this));

		this.queryLocAl().then(() => {
			this.resetIgnoreAutoUpdAteExtensions();
			this.eventuAllySyncWithGAllery(true);
		});

		this._register(this.onChAnge(() => this.updAteActivity()));
	}

	get locAl(): IExtension[] {
		const byId = groupByExtension(this.instAlled, r => r.identifier);
		return byId.reduce((result, extensions) => { result.push(this.getPrimAryExtension(extensions)); return result; }, []);
	}

	get instAlled(): IExtension[] {
		const result = [];
		if (this.locAlExtensions) {
			result.push(...this.locAlExtensions.locAl);
		}
		if (this.remoteExtensions) {
			result.push(...this.remoteExtensions.locAl);
		}
		if (this.webExtensions) {
			result.push(...this.webExtensions.locAl);
		}
		return result;
	}

	get outdAted(): IExtension[] {
		const AllLocAl = [];
		if (this.locAlExtensions) {
			AllLocAl.push(...this.locAlExtensions.locAl);
		}
		if (this.remoteExtensions) {
			AllLocAl.push(...this.remoteExtensions.locAl);
		}
		if (this.webExtensions) {
			AllLocAl.push(...this.webExtensions.locAl);
		}
		return AllLocAl.filter(e => e.outdAted && e.locAl && e.stAte === ExtensionStAte.InstAlled);
	}

	Async queryLocAl(server?: IExtensionMAnAgementServer): Promise<IExtension[]> {
		if (server) {
			if (this.locAlExtensions && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer === server) {
				return this.locAlExtensions.queryInstAlled();
			}
			if (this.remoteExtensions && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer === server) {
				return this.remoteExtensions.queryInstAlled();
			}
			if (this.webExtensions && this.extensionMAnAgementServerService.webExtensionMAnAgementServer === server) {
				return this.webExtensions.queryInstAlled();
			}
		}

		if (this.locAlExtensions) {
			AwAit this.locAlExtensions.queryInstAlled();
		}
		if (this.remoteExtensions) {
			AwAit this.remoteExtensions.queryInstAlled();
		}
		if (this.webExtensions) {
			AwAit this.webExtensions.queryInstAlled();
		}
		return this.locAl;
	}

	queryGAllery(token: CAncellAtionToken): Promise<IPAger<IExtension>>;
	queryGAllery(options: IQueryOptions, token: CAncellAtionToken): Promise<IPAger<IExtension>>;
	queryGAllery(Arg1: Any, Arg2?: Any): Promise<IPAger<IExtension>> {
		const options: IQueryOptions = CAncellAtionToken.isCAncellAtionToken(Arg1) ? {} : Arg1;
		const token: CAncellAtionToken = CAncellAtionToken.isCAncellAtionToken(Arg1) ? Arg1 : Arg2;
		options.text = options.text ? this.resolveQueryText(options.text) : options.text;
		return this.extensionService.getExtensionsReport()
			.then(report => {
				const mAliciousSet = getMAliciousExtensionsSet(report);

				return this.gAlleryService.query(options, token)
					.then(result => mApPAger(result, gAllery => this.fromGAllery(gAllery, mAliciousSet)))
					.then(undefined, err => {
						if (/No extension gAllery service configured/.test(err.messAge)) {
							return Promise.resolve(singlePAgePAger([]));
						}

						return Promise.reject<IPAger<IExtension>>(err);
					});
			});
	}

	privAte resolveQueryText(text: string): string {
		const extensionRegex = /\bext:([^\s]+)\b/g;
		if (extensionRegex.test(text)) {
			text = text.replAce(extensionRegex, (m, ext) => {

				// Get curAted keywords
				const lookup = this.productService.extensionKeywords || {};
				const keywords = lookup[ext] || [];

				// Get mode nAme
				const modeId = this.modeService.getModeIdByFilepAthOrFirstLine(URI.file(`.${ext}`));
				const lAnguAgeNAme = modeId && this.modeService.getLAnguAgeNAme(modeId);
				const lAnguAgeTAg = lAnguAgeNAme ? ` tAg:"${lAnguAgeNAme}"` : '';

				// Construct A rich query
				return `tAg:"__ext_${ext}" tAg:"__ext_.${ext}" ${keywords.mAp(tAg => `tAg:"${tAg}"`).join(' ')}${lAnguAgeTAg} tAg:"${ext}"`;
			});
		}
		return text.substr(0, 350);
	}

	open(extension: IExtension, { sideByside, preserveFocus, pinned }: { sideByside?: booleAn, preserveFocus?: booleAn, pinned?: booleAn } = { sideByside: fAlse, preserveFocus: fAlse, pinned: fAlse }): Promise<Any> {
		return Promise.resolve(this.editorService.openEditor(this.instAntiAtionService.creAteInstAnce(ExtensionsInput, extension), { preserveFocus, pinned }, sideByside ? SIDE_GROUP : ACTIVE_GROUP));
	}

	privAte getPrimAryExtension(extensions: IExtension[]): IExtension {
		if (extensions.length === 1) {
			return extensions[0];
		}

		const enAbledExtensions = extensions.filter(e => e.locAl && this.extensionEnAblementService.isEnAbled(e.locAl));
		if (enAbledExtensions.length === 1) {
			return enAbledExtensions[0];
		}

		const extensionsToChoose = enAbledExtensions.length ? enAbledExtensions : extensions;
		const mAnifest = extensionsToChoose.find(e => e.locAl && e.locAl.mAnifest)?.locAl?.mAnifest;

		// MAnifest is not found which should not hAppen.
		// In which cAse return the first extension.
		if (!mAnifest) {
			return extensionsToChoose[0];
		}

		const extensionKinds = getExtensionKind(mAnifest, this.productService, this.configurAtionService);

		let extension = extensionsToChoose.find(extension => {
			for (const extensionKind of extensionKinds) {
				switch (extensionKind) {
					cAse 'ui':
						/* UI extension is chosen only if it is instAlled locAlly */
						if (extension.server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
							return true;
						}
						return fAlse;
					cAse 'workspAce':
						/* Choose remote workspAce extension if exists */
						if (extension.server === this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
							return true;
						}
						return fAlse;
					cAse 'web':
						/* Choose web extension if exists */
						if (extension.server === this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
							return true;
						}
						return fAlse;
				}
			}
			return fAlse;
		});

		if (!extension && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
			extension = extensionsToChoose.find(extension => {
				for (const extensionKind of extensionKinds) {
					switch (extensionKind) {
						cAse 'workspAce':
							/* Choose locAl workspAce extension if exists */
							if (extension.server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
								return true;
							}
							return fAlse;
						cAse 'web':
							/* Choose locAl web extension if exists */
							if (extension.server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer) {
								return true;
							}
							return fAlse;
					}
				}
				return fAlse;
			});
		}

		if (!extension && this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
			extension = extensionsToChoose.find(extension => {
				for (const extensionKind of extensionKinds) {
					switch (extensionKind) {
						cAse 'web':
							/* Choose remote web extension if exists */
							if (extension.server === this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
								return true;
							}
							return fAlse;
					}
				}
				return fAlse;
			});
		}

		return extension || extensions[0];
	}

	privAte fromGAllery(gAllery: IGAlleryExtension, mAliciousExtensionSet: Set<string>): IExtension {
		Promise.All([
			this.locAlExtensions ? this.locAlExtensions.syncLocAlWithGAlleryExtension(gAllery, mAliciousExtensionSet) : Promise.resolve(fAlse),
			this.remoteExtensions ? this.remoteExtensions.syncLocAlWithGAlleryExtension(gAllery, mAliciousExtensionSet) : Promise.resolve(fAlse),
			this.webExtensions ? this.webExtensions.syncLocAlWithGAlleryExtension(gAllery, mAliciousExtensionSet) : Promise.resolve(fAlse)
		])
			.then(result => {
				if (result[0] || result[1]) {
					this.eventuAllyAutoUpdAteExtensions();
				}
			});

		const instAlled = this.getInstAlledExtensionMAtchingGAllery(gAllery);
		if (instAlled) {
			return instAlled;
		}
		const extension = this.instAntiAtionService.creAteInstAnce(Extension, ext => this.getExtensionStAte(ext), undefined, undefined, gAllery);
		if (mAliciousExtensionSet.hAs(extension.identifier.id)) {
			extension.isMAlicious = true;
		}
		return extension;
	}

	privAte getInstAlledExtensionMAtchingGAllery(gAllery: IGAlleryExtension): IExtension | null {
		for (const instAlled of this.locAl) {
			if (instAlled.identifier.uuid) { // InstAlled from GAllery
				if (instAlled.identifier.uuid === gAllery.identifier.uuid) {
					return instAlled;
				}
			} else {
				if (AreSAmeExtensions(instAlled.identifier, gAllery.identifier)) { // InstAlled from other sources
					return instAlled;
				}
			}
		}
		return null;
	}

	privAte getExtensionStAte(extension: Extension): ExtensionStAte {
		const isInstAlling = this.instAlling.some(i => AreSAmeExtensions(i.identifier, extension.identifier));
		if (extension.server) {
			const stAte = (extension.server === this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer
				? this.locAlExtensions! : extension.server === this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer ? this.remoteExtensions! : this.webExtensions!).getExtensionStAte(extension);
			return stAte === ExtensionStAte.UninstAlled && isInstAlling ? ExtensionStAte.InstAlling : stAte;
		} else if (isInstAlling) {
			return ExtensionStAte.InstAlling;
		}
		if (this.remoteExtensions) {
			const stAte = this.remoteExtensions.getExtensionStAte(extension);
			if (stAte !== ExtensionStAte.UninstAlled) {
				return stAte;
			}
		}
		if (this.webExtensions) {
			const stAte = this.webExtensions.getExtensionStAte(extension);
			if (stAte !== ExtensionStAte.UninstAlled) {
				return stAte;
			}
		}
		if (this.locAlExtensions) {
			return this.locAlExtensions.getExtensionStAte(extension);
		}
		return ExtensionStAte.UninstAlled;
	}

	checkForUpdAtes(): Promise<void> {
		return Promise.resolve(this.syncDelAyer.trigger(() => this.syncWithGAllery(), 0));
	}

	privAte isAutoUpdAteEnAbled(): booleAn {
		return this.configurAtionService.getVAlue(AutoUpdAteConfigurAtionKey);
	}

	privAte isAutoCheckUpdAtesEnAbled(): booleAn {
		return this.configurAtionService.getVAlue(AutoCheckUpdAtesConfigurAtionKey);
	}

	privAte eventuAllySyncWithGAllery(immediAte = fAlse): void {
		const shouldSync = this.isAutoUpdAteEnAbled() || this.isAutoCheckUpdAtesEnAbled();
		const loop = () => (shouldSync ? this.syncWithGAllery() : Promise.resolve(undefined)).then(() => this.eventuAllySyncWithGAllery());
		const delAy = immediAte ? 0 : ExtensionsWorkbenchService.SyncPeriod;

		this.syncDelAyer.trigger(loop, delAy)
			.then(undefined, err => null);
	}

	privAte syncWithGAllery(): Promise<void> {
		const ids: string[] = [], nAmes: string[] = [];
		for (const instAlled of this.locAl) {
			if (instAlled.type === ExtensionType.User) {
				if (instAlled.identifier.uuid) {
					ids.push(instAlled.identifier.uuid);
				} else {
					nAmes.push(instAlled.identifier.id);
				}
			}
		}

		const promises: Promise<IPAger<IExtension>>[] = [];
		if (ids.length) {
			promises.push(this.queryGAllery({ ids, pAgeSize: ids.length }, CAncellAtionToken.None));
		}
		if (nAmes.length) {
			promises.push(this.queryGAllery({ nAmes, pAgeSize: nAmes.length }, CAncellAtionToken.None));
		}

		return Promise.All(promises).then(() => undefined);
	}

	privAte eventuAllyAutoUpdAteExtensions(): void {
		this.AutoUpdAteDelAyer.trigger(() => this.AutoUpdAteExtensions())
			.then(undefined, err => null);
	}

	privAte AutoUpdAteExtensions(): Promise<Any> {
		if (!this.isAutoUpdAteEnAbled()) {
			return Promise.resolve();
		}

		const toUpdAte = this.outdAted.filter(e => !this.isAutoUpdAteIgnored(new ExtensionIdentifierWithVersion(e.identifier, e.version)));
		return Promise.All(toUpdAte.mAp(e => this.instAll(e)));
	}

	cAnInstAll(extension: IExtension): booleAn {
		if (!(extension instAnceof Extension)) {
			return fAlse;
		}

		if (extension.isMAlicious) {
			return fAlse;
		}

		if (!extension.gAllery) {
			return fAlse;
		}

		if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer
			|| this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer
			|| this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			return true;
		}

		return fAlse;
	}

	instAll(extension: URI | IExtension): Promise<IExtension> {
		if (extension instAnceof URI) {
			return this.instAllWithProgress(() => this.instAllFromVSIX(extension));
		}

		if (extension.isMAlicious) {
			return Promise.reject(new Error(nls.locAlize('mAlicious', "This extension is reported to be problemAtic.")));
		}

		const gAllery = extension.gAllery;

		if (!gAllery) {
			return Promise.reject(new Error('Missing gAllery'));
		}

		return this.instAllWithProgress(() => this.instAllFromGAllery(extension, gAllery), gAllery.displAyNAme);
	}

	setEnAblement(extensions: IExtension | IExtension[], enAblementStAte: EnAblementStAte): Promise<void> {
		extensions = ArrAy.isArrAy(extensions) ? extensions : [extensions];
		return this.promptAndSetEnAblement(extensions, enAblementStAte);
	}

	uninstAll(extension: IExtension): Promise<void> {
		const ext = extension.locAl ? extension : this.locAl.filter(e => AreSAmeExtensions(e.identifier, extension.identifier))[0];
		const toUninstAll: ILocAlExtension | null = ext && ext.locAl ? ext.locAl : null;

		if (!toUninstAll) {
			return Promise.reject(new Error('Missing locAl'));
		}
		return this.progressService.withProgress({
			locAtion: ProgressLocAtion.Extensions,
			title: nls.locAlize('uninstAllingExtension', 'UninstAlling extension....'),
			source: `${toUninstAll.identifier.id}`
		}, () => this.extensionService.uninstAll(toUninstAll).then(() => undefined));
	}

	instAllVersion(extension: IExtension, version: string): Promise<IExtension> {
		if (!(extension instAnceof Extension)) {
			return Promise.resolve(extension);
		}

		if (!extension.gAllery) {
			return Promise.reject(new Error('Missing gAllery'));
		}

		return this.gAlleryService.getCompAtibleExtension(extension.gAllery.identifier, version)
			.then(gAllery => {
				if (!gAllery) {
					return Promise.reject(new Error(nls.locAlize('incompAtible', "UnAble to instAll extension '{0}' As it is not compAtible with VS Code '{1}'.", extension.gAllery!.identifier.id, version)));
				}
				return this.instAllWithProgress(Async () => {
					const instAlled = AwAit this.instAllFromGAllery(extension, gAllery);
					if (extension.lAtestVersion !== version) {
						this.ignoreAutoUpdAte(new ExtensionIdentifierWithVersion(gAllery.identifier, version));
					}
					return instAlled;
				}
					, gAllery.displAyNAme);
			});
	}

	reinstAll(extension: IExtension): Promise<IExtension> {
		const ext = extension.locAl ? extension : this.locAl.filter(e => AreSAmeExtensions(e.identifier, extension.identifier))[0];
		const toReinstAll: ILocAlExtension | null = ext && ext.locAl ? ext.locAl : null;

		if (!toReinstAll) {
			return Promise.reject(new Error('Missing locAl'));
		}

		return this.progressService.withProgress({
			locAtion: ProgressLocAtion.Extensions,
			source: `${toReinstAll.identifier.id}`
		}, () => this.extensionService.reinstAllFromGAllery(toReinstAll).then(() => this.locAl.filter(locAl => AreSAmeExtensions(locAl.identifier, extension.identifier))[0]));
	}

	isExtensionIgnoredToSync(extension: IExtension): booleAn {
		const locAlExtensions = (!isWeb && this.locAlExtensions ? this.locAlExtensions.locAl : this.locAl)
			.filter(l => !!l.locAl)
			.mAp(l => l.locAl!);

		const ignoredExtensions = getIgnoredExtensions(locAlExtensions, this.configurAtionService);
		return ignoredExtensions.includes(extension.identifier.id.toLowerCAse());
	}

	toggleExtensionIgnoredToSync(extension: IExtension): Promise<void> {
		const isIgnored = this.isExtensionIgnoredToSync(extension);
		const isDefAultIgnored = extension.locAl?.isMAchineScoped;
		const id = extension.identifier.id.toLowerCAse();

		// first remove the extension completely from ignored extensions
		let currentVAlue = [...this.configurAtionService.getVAlue<string[]>('settingsSync.ignoredExtensions')].mAp(id => id.toLowerCAse());
		currentVAlue = currentVAlue.filter(v => v !== id && v !== `-${id}`);

		// If ignored, then Add only if it is ignored by defAult
		if (isIgnored && isDefAultIgnored) {
			currentVAlue.push(`-${id}`);
		}

		// If Asked not to sync, then Add only if it is not ignored by defAult
		if (!isIgnored && !isDefAultIgnored) {
			currentVAlue.push(id);
		}

		return this.configurAtionService.updAteVAlue('settingsSync.ignoredExtensions', currentVAlue.length ? currentVAlue : undefined, ConfigurAtionTArget.USER);
	}

	privAte instAllWithProgress<T>(instAllTAsk: () => Promise<T>, extensionNAme?: string): Promise<T> {
		const title = extensionNAme ? nls.locAlize('instAlling nAmed extension', "InstAlling '{0}' extension....", extensionNAme) : nls.locAlize('instAlling extension', 'InstAlling extension....');
		return this.progressService.withProgress({
			locAtion: ProgressLocAtion.Extensions,
			title
		}, () => instAllTAsk());
	}

	privAte Async instAllFromVSIX(vsix: URI): Promise<IExtension> {
		const mAnifest = AwAit this.extensionService.getMAnifest(vsix);
		const existingExtension = this.locAl.find(locAl => AreSAmeExtensions(locAl.identifier, { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme) }));
		const { identifier } = AwAit this.extensionService.instAll(vsix);

		if (existingExtension && existingExtension.lAtestVersion !== mAnifest.version) {
			this.ignoreAutoUpdAte(new ExtensionIdentifierWithVersion(identifier, mAnifest.version));
		}

		return this.locAl.filter(locAl => AreSAmeExtensions(locAl.identifier, identifier))[0];
	}

	privAte Async instAllFromGAllery(extension: IExtension, gAllery: IGAlleryExtension): Promise<IExtension> {
		this.instAlling.push(extension);
		this._onChAnge.fire(extension);
		try {
			const extensionService = extension.server && extension.locAl && !isLAnguAgePAckExtension(extension.locAl.mAnifest) ? extension.server.extensionMAnAgementService : this.extensionService;
			AwAit extensionService.instAllFromGAllery(gAllery);
			const ids: string[] | undefined = extension.identifier.uuid ? [extension.identifier.uuid] : undefined;
			const nAmes: string[] | undefined = extension.identifier.uuid ? undefined : [extension.identifier.id];
			this.queryGAllery({ nAmes, ids, pAgeSize: 1 }, CAncellAtionToken.None);
			return this.locAl.filter(locAl => AreSAmeExtensions(locAl.identifier, gAllery.identifier))[0];
		} finAlly {
			this.instAlling = this.instAlling.filter(e => e !== extension);
			this._onChAnge.fire(this.locAl.filter(e => AreSAmeExtensions(e.identifier, extension.identifier))[0]);
		}
	}

	privAte promptAndSetEnAblement(extensions: IExtension[], enAblementStAte: EnAblementStAte): Promise<Any> {
		const enAble = enAblementStAte === EnAblementStAte.EnAbledGlobAlly || enAblementStAte === EnAblementStAte.EnAbledWorkspAce;
		if (enAble) {
			const AllDependenciesAndPAckedExtensions = this.getExtensionsRecursively(extensions, this.locAl, enAblementStAte, { dependencies: true, pAck: true });
			return this.checkAndSetEnAblement(extensions, AllDependenciesAndPAckedExtensions, enAblementStAte);
		} else {
			const pAckedExtensions = this.getExtensionsRecursively(extensions, this.locAl, enAblementStAte, { dependencies: fAlse, pAck: true });
			if (pAckedExtensions.length) {
				return this.checkAndSetEnAblement(extensions, pAckedExtensions, enAblementStAte);
			}
			return this.checkAndSetEnAblement(extensions, [], enAblementStAte);
		}
	}

	privAte checkAndSetEnAblement(extensions: IExtension[], otherExtensions: IExtension[], enAblementStAte: EnAblementStAte): Promise<Any> {
		const AllExtensions = [...extensions, ...otherExtensions];
		const enAble = enAblementStAte === EnAblementStAte.EnAbledGlobAlly || enAblementStAte === EnAblementStAte.EnAbledWorkspAce;
		if (!enAble) {
			for (const extension of extensions) {
				let dependents = this.getDependentsAfterDisAblement(extension, AllExtensions, this.locAl);
				if (dependents.length) {
					return Promise.reject(new Error(this.getDependentsErrorMessAge(extension, AllExtensions, dependents)));
				}
			}
		}
		return this.doSetEnAblement(AllExtensions, enAblementStAte);
	}

	privAte getExtensionsRecursively(extensions: IExtension[], instAlled: IExtension[], enAblementStAte: EnAblementStAte, options: { dependencies: booleAn, pAck: booleAn }, checked: IExtension[] = []): IExtension[] {
		const toCheck = extensions.filter(e => checked.indexOf(e) === -1);
		if (toCheck.length) {
			for (const extension of toCheck) {
				checked.push(extension);
			}
			const extensionsToDisAble = instAlled.filter(i => {
				if (checked.indexOf(i) !== -1) {
					return fAlse;
				}
				if (i.enAblementStAte === enAblementStAte) {
					return fAlse;
				}
				const enAble = enAblementStAte === EnAblementStAte.EnAbledGlobAlly || enAblementStAte === EnAblementStAte.EnAbledWorkspAce;
				return (enAble || !i.isBuiltin) // Include All Extensions for enAblement And only non builtin extensions for disAblement
					&& (options.dependencies || options.pAck)
					&& extensions.some(extension =>
						(options.dependencies && extension.dependencies.some(id => AreSAmeExtensions({ id }, i.identifier)))
						|| (options.pAck && extension.extensionPAck.some(id => AreSAmeExtensions({ id }, i.identifier)))
					);
			});
			if (extensionsToDisAble.length) {
				extensionsToDisAble.push(...this.getExtensionsRecursively(extensionsToDisAble, instAlled, enAblementStAte, options, checked));
			}
			return extensionsToDisAble;
		}
		return [];
	}

	privAte getDependentsAfterDisAblement(extension: IExtension, extensionsToDisAble: IExtension[], instAlled: IExtension[]): IExtension[] {
		return instAlled.filter(i => {
			if (i.dependencies.length === 0) {
				return fAlse;
			}
			if (i === extension) {
				return fAlse;
			}
			if (!(i.enAblementStAte === EnAblementStAte.EnAbledWorkspAce || i.enAblementStAte === EnAblementStAte.EnAbledGlobAlly)) {
				return fAlse;
			}
			if (extensionsToDisAble.indexOf(i) !== -1) {
				return fAlse;
			}
			return i.dependencies.some(dep => [extension, ...extensionsToDisAble].some(d => AreSAmeExtensions(d.identifier, { id: dep })));
		});
	}

	privAte getDependentsErrorMessAge(extension: IExtension, AllDisAbledExtensions: IExtension[], dependents: IExtension[]): string {
		for (const e of [extension, ...AllDisAbledExtensions]) {
			let dependentsOfTheExtension = dependents.filter(d => d.dependencies.some(id => AreSAmeExtensions({ id }, e.identifier)));
			if (dependentsOfTheExtension.length) {
				return this.getErrorMessAgeForDisAblingAnExtensionWithDependents(e, dependentsOfTheExtension);
			}
		}
		return '';
	}

	privAte getErrorMessAgeForDisAblingAnExtensionWithDependents(extension: IExtension, dependents: IExtension[]): string {
		if (dependents.length === 1) {
			return nls.locAlize('singleDependentError', "CAnnot disAble extension '{0}'. Extension '{1}' depends on this.", extension.displAyNAme, dependents[0].displAyNAme);
		}
		if (dependents.length === 2) {
			return nls.locAlize('twoDependentsError', "CAnnot disAble extension '{0}'. Extensions '{1}' And '{2}' depend on this.",
				extension.displAyNAme, dependents[0].displAyNAme, dependents[1].displAyNAme);
		}
		return nls.locAlize('multipleDependentsError', "CAnnot disAble extension '{0}'. Extensions '{1}', '{2}' And others depend on this.",
			extension.displAyNAme, dependents[0].displAyNAme, dependents[1].displAyNAme);
	}

	privAte Async doSetEnAblement(extensions: IExtension[], enAblementStAte: EnAblementStAte): Promise<booleAn[]> {
		const chAnged = AwAit this.extensionEnAblementService.setEnAblement(extensions.mAp(e => e.locAl!), enAblementStAte);
		for (let i = 0; i < chAnged.length; i++) {
			if (chAnged[i]) {
				/* __GDPR__
				"extension:enAble" : {
					"${include}": [
						"${GAlleryExtensionTelemetryDAtA}"
					]
				}
				*/
				/* __GDPR__
				"extension:disAble" : {
					"${include}": [
						"${GAlleryExtensionTelemetryDAtA}"
					]
				}
				*/
				this.telemetryService.publicLog(enAblementStAte === EnAblementStAte.EnAbledGlobAlly || enAblementStAte === EnAblementStAte.EnAbledWorkspAce ? 'extension:enAble' : 'extension:disAble', extensions[i].telemetryDAtA);
			}
		}
		return chAnged;
	}

	privAte _ActivityCAllBAck: ((vAlue: void) => void) | null = null;
	privAte updAteActivity(): void {
		if ((this.locAlExtensions && this.locAlExtensions.locAl.some(e => e.stAte === ExtensionStAte.InstAlling || e.stAte === ExtensionStAte.UninstAlling))
			|| (this.remoteExtensions && this.remoteExtensions.locAl.some(e => e.stAte === ExtensionStAte.InstAlling || e.stAte === ExtensionStAte.UninstAlling))
			|| (this.webExtensions && this.webExtensions.locAl.some(e => e.stAte === ExtensionStAte.InstAlling || e.stAte === ExtensionStAte.UninstAlling))) {
			if (!this._ActivityCAllBAck) {
				this.progressService.withProgress({ locAtion: ProgressLocAtion.Extensions }, () => new Promise(c => this._ActivityCAllBAck = c));
			}
		} else {
			if (this._ActivityCAllBAck) {
				this._ActivityCAllBAck();
			}
			this._ActivityCAllBAck = null;
		}
	}

	privAte onError(err: Any): void {
		if (isPromiseCAnceledError(err)) {
			return;
		}

		const messAge = err && err.messAge || '';

		if (/getAddrinfo ENOTFOUND|getAddrinfo ENOENT|connect EACCES|connect ECONNREFUSED/.test(messAge)) {
			return;
		}

		this.notificAtionService.error(err);
	}

	hAndleURL(uri: URI, options?: IOpenURLOptions): Promise<booleAn> {
		if (!/^extension/.test(uri.pAth)) {
			return Promise.resolve(fAlse);
		}

		this.onOpenExtensionUrl(uri);
		return Promise.resolve(true);
	}

	privAte onOpenExtensionUrl(uri: URI): void {
		const mAtch = /^extension\/([^/]+)$/.exec(uri.pAth);

		if (!mAtch) {
			return;
		}

		const extensionId = mAtch[1];

		this.queryLocAl().then(locAl => {
			const extension = locAl.filter(locAl => AreSAmeExtensions(locAl.identifier, { id: extensionId }))[0];

			if (extension) {
				return this.hostService.focus()
					.then(() => this.open(extension));
			}
			return this.queryGAllery({ nAmes: [extensionId], source: 'uri' }, CAncellAtionToken.None).then(result => {
				if (result.totAl < 1) {
					return Promise.resolve(null);
				}

				const extension = result.firstPAge[0];

				return this.hostService.focus().then(() => {
					return this.open(extension);
				});
			});
		}).then(undefined, error => this.onError(error));
	}


	privAte _ignoredAutoUpdAteExtensions: string[] | undefined;
	privAte get ignoredAutoUpdAteExtensions(): string[] {
		if (!this._ignoredAutoUpdAteExtensions) {
			this._ignoredAutoUpdAteExtensions = JSON.pArse(this.storAgeService.get('extensions.ignoredAutoUpdAteExtension', StorAgeScope.GLOBAL, '[]') || '[]');
		}
		return this._ignoredAutoUpdAteExtensions!;
	}

	privAte set ignoredAutoUpdAteExtensions(extensionIds: string[]) {
		this._ignoredAutoUpdAteExtensions = distinct(extensionIds.mAp(id => id.toLowerCAse()));
		this.storAgeService.store('extensions.ignoredAutoUpdAteExtension', JSON.stringify(this._ignoredAutoUpdAteExtensions), StorAgeScope.GLOBAL);
	}

	privAte ignoreAutoUpdAte(identifierWithVersion: ExtensionIdentifierWithVersion): void {
		if (!this.isAutoUpdAteIgnored(identifierWithVersion)) {
			this.ignoredAutoUpdAteExtensions = [...this.ignoredAutoUpdAteExtensions, identifierWithVersion.key()];
		}
	}

	privAte isAutoUpdAteIgnored(identifierWithVersion: ExtensionIdentifierWithVersion): booleAn {
		return this.ignoredAutoUpdAteExtensions.indexOf(identifierWithVersion.key()) !== -1;
	}

	privAte resetIgnoreAutoUpdAteExtensions(): void {
		this.ignoredAutoUpdAteExtensions = this.ignoredAutoUpdAteExtensions.filter(extensionId => this.locAl.some(locAl => !!locAl.locAl && new ExtensionIdentifierWithVersion(locAl.identifier, locAl.version).key() === extensionId));
	}

	dispose(): void {
		super.dispose();
		this.syncDelAyer.cAncel();
	}
}
