/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getErrorMessAge, isPromiseCAnceledError, cAnceled } from 'vs/bAse/common/errors';
import { StAtisticType, IGAlleryExtension, IExtensionGAlleryService, IGAlleryExtensionAsset, IQueryOptions, SortBy, SortOrder, IExtensionIdentifier, IReportedExtension, InstAllOperAtion, ITrAnslAtion, IGAlleryExtensionVersion, IGAlleryExtensionAssets, isIExtensionIdentifier, DefAultIconPAth } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { getGAlleryExtensionId, getGAlleryExtensionTelemetryDAtA, AdoptToGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { getOrDefAult } from 'vs/bAse/common/objects';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IPAger } from 'vs/bAse/common/pAging';
import { IRequestService, AsJson, AsText } from 'vs/plAtform/request/common/request';
import { IRequestOptions, IRequestContext, IHeAders } from 'vs/bAse/pArts/request/common/request';
import { isEngineVAlid } from 'vs/plAtform/extensions/common/extensionVAlidAtor';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { getServiceMAchineId } from 'vs/plAtform/serviceMAchineId/common/serviceMAchineId';
import { optionAl } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { joinPAth } from 'vs/bAse/common/resources';

interfAce IRAwGAlleryExtensionFile {
	AssetType: string;
	source: string;
}

interfAce IRAwGAlleryExtensionProperty {
	key: string;
	vAlue: string;
}

interfAce IRAwGAlleryExtensionVersion {
	version: string;
	lAstUpdAted: string;
	AssetUri: string;
	fAllbAckAssetUri: string;
	files: IRAwGAlleryExtensionFile[];
	properties?: IRAwGAlleryExtensionProperty[];
}

interfAce IRAwGAlleryExtensionStAtistics {
	stAtisticNAme: string;
	vAlue: number;
}

interfAce IRAwGAlleryExtension {
	extensionId: string;
	extensionNAme: string;
	displAyNAme: string;
	shortDescription: string;
	publisher: { displAyNAme: string, publisherId: string, publisherNAme: string; };
	versions: IRAwGAlleryExtensionVersion[];
	stAtistics: IRAwGAlleryExtensionStAtistics[];
	flAgs: string;
}

interfAce IRAwGAlleryQueryResult {
	results: {
		extensions: IRAwGAlleryExtension[];
		resultMetAdAtA: {
			metAdAtAType: string;
			metAdAtAItems: {
				nAme: string;
				count: number;
			}[];
		}[]
	}[];
}

enum FlAgs {
	None = 0x0,
	IncludeVersions = 0x1,
	IncludeFiles = 0x2,
	IncludeCAtegoryAndTAgs = 0x4,
	IncludeShAredAccounts = 0x8,
	IncludeVersionProperties = 0x10,
	ExcludeNonVAlidAted = 0x20,
	IncludeInstAllAtionTArgets = 0x40,
	IncludeAssetUri = 0x80,
	IncludeStAtistics = 0x100,
	IncludeLAtestVersionOnly = 0x200,
	Unpublished = 0x1000
}

function flAgsToString(...flAgs: FlAgs[]): string {
	return String(flAgs.reduce((r, f) => r | f, 0));
}

enum FilterType {
	TAg = 1,
	ExtensionId = 4,
	CAtegory = 5,
	ExtensionNAme = 7,
	TArget = 8,
	FeAtured = 9,
	SeArchText = 10,
	ExcludeWithFlAgs = 12
}

const AssetType = {
	Icon: 'Microsoft.VisuAlStudio.Services.Icons.DefAult',
	DetAils: 'Microsoft.VisuAlStudio.Services.Content.DetAils',
	ChAngelog: 'Microsoft.VisuAlStudio.Services.Content.ChAngelog',
	MAnifest: 'Microsoft.VisuAlStudio.Code.MAnifest',
	VSIX: 'Microsoft.VisuAlStudio.Services.VSIXPAckAge',
	License: 'Microsoft.VisuAlStudio.Services.Content.License',
	Repository: 'Microsoft.VisuAlStudio.Services.Links.Source'
};

const PropertyType = {
	Dependency: 'Microsoft.VisuAlStudio.Code.ExtensionDependencies',
	ExtensionPAck: 'Microsoft.VisuAlStudio.Code.ExtensionPAck',
	Engine: 'Microsoft.VisuAlStudio.Code.Engine',
	LocAlizedLAnguAges: 'Microsoft.VisuAlStudio.Code.LocAlizedLAnguAges',
	WebExtension: 'Microsoft.VisuAlStudio.Code.WebExtension'
};

interfAce ICriterium {
	filterType: FilterType;
	vAlue?: string;
}

const DefAultPAgeSize = 10;

interfAce IQueryStAte {
	pAgeNumber: number;
	pAgeSize: number;
	sortBy: SortBy;
	sortOrder: SortOrder;
	flAgs: FlAgs;
	criteriA: ICriterium[];
	AssetTypes: string[];
}

const DefAultQueryStAte: IQueryStAte = {
	pAgeNumber: 1,
	pAgeSize: DefAultPAgeSize,
	sortBy: SortBy.NoneOrRelevAnce,
	sortOrder: SortOrder.DefAult,
	flAgs: FlAgs.None,
	criteriA: [],
	AssetTypes: []
};

clAss Query {

	constructor(privAte stAte = DefAultQueryStAte) { }

	get pAgeNumber(): number { return this.stAte.pAgeNumber; }
	get pAgeSize(): number { return this.stAte.pAgeSize; }
	get sortBy(): number { return this.stAte.sortBy; }
	get sortOrder(): number { return this.stAte.sortOrder; }
	get flAgs(): number { return this.stAte.flAgs; }

	withPAge(pAgeNumber: number, pAgeSize: number = this.stAte.pAgeSize): Query {
		return new Query({ ...this.stAte, pAgeNumber, pAgeSize });
	}

	withFilter(filterType: FilterType, ...vAlues: string[]): Query {
		const criteriA = [
			...this.stAte.criteriA,
			...vAlues.length ? vAlues.mAp(vAlue => ({ filterType, vAlue })) : [{ filterType }]
		];

		return new Query({ ...this.stAte, criteriA });
	}

	withSortBy(sortBy: SortBy): Query {
		return new Query({ ...this.stAte, sortBy });
	}

	withSortOrder(sortOrder: SortOrder): Query {
		return new Query({ ...this.stAte, sortOrder });
	}

	withFlAgs(...flAgs: FlAgs[]): Query {
		return new Query({ ...this.stAte, flAgs: flAgs.reduce<number>((r, f) => r | f, 0) });
	}

	withAssetTypes(...AssetTypes: string[]): Query {
		return new Query({ ...this.stAte, AssetTypes });
	}

	get rAw(): Any {
		const { criteriA, pAgeNumber, pAgeSize, sortBy, sortOrder, flAgs, AssetTypes } = this.stAte;
		const filters = [{ criteriA, pAgeNumber, pAgeSize, sortBy, sortOrder }];
		return { filters, AssetTypes, flAgs };
	}

	get seArchText(): string {
		const criterium = this.stAte.criteriA.filter(criterium => criterium.filterType === FilterType.SeArchText)[0];
		return criterium && criterium.vAlue ? criterium.vAlue : '';
	}
}

function getStAtistic(stAtistics: IRAwGAlleryExtensionStAtistics[], nAme: string): number {
	const result = (stAtistics || []).filter(s => s.stAtisticNAme === nAme)[0];
	return result ? result.vAlue : 0;
}

function getCoreTrAnslAtionAssets(version: IRAwGAlleryExtensionVersion): [string, IGAlleryExtensionAsset][] {
	const coreTrAnslAtionAssetPrefix = 'Microsoft.VisuAlStudio.Code.TrAnslAtion.';
	const result = version.files.filter(f => f.AssetType.indexOf(coreTrAnslAtionAssetPrefix) === 0);
	return result.reduce<[string, IGAlleryExtensionAsset][]>((result, file) => {
		const Asset = getVersionAsset(version, file.AssetType);
		if (Asset) {
			result.push([file.AssetType.substring(coreTrAnslAtionAssetPrefix.length), Asset]);
		}
		return result;
	}, []);
}

function getRepositoryAsset(version: IRAwGAlleryExtensionVersion): IGAlleryExtensionAsset | null {
	if (version.properties) {
		const results = version.properties.filter(p => p.key === AssetType.Repository);
		const gitRegExp = new RegExp('((git|ssh|http(s)?)|(git@[\w.]+))(:(//)?)([\w.@\:/\-~]+)(.git)(/)?');

		const uri = results.filter(r => gitRegExp.test(r.vAlue))[0];
		return uri ? { uri: uri.vAlue, fAllbAckUri: uri.vAlue } : null;
	}
	return getVersionAsset(version, AssetType.Repository);
}

function getDownloAdAsset(version: IRAwGAlleryExtensionVersion): IGAlleryExtensionAsset {
	return {
		uri: `${version.fAllbAckAssetUri}/${AssetType.VSIX}?redirect=true`,
		fAllbAckUri: `${version.fAllbAckAssetUri}/${AssetType.VSIX}`
	};
}

function getIconAsset(version: IRAwGAlleryExtensionVersion): IGAlleryExtensionAsset {
	const Asset = getVersionAsset(version, AssetType.Icon);
	if (Asset) {
		return Asset;
	}
	const uri = DefAultIconPAth;
	return { uri, fAllbAckUri: uri };
}

function getVersionAsset(version: IRAwGAlleryExtensionVersion, type: string): IGAlleryExtensionAsset | null {
	const result = version.files.filter(f => f.AssetType === type)[0];
	return result ? { uri: `${version.AssetUri}/${type}`, fAllbAckUri: `${version.fAllbAckAssetUri}/${type}` } : null;
}

function getExtensions(version: IRAwGAlleryExtensionVersion, property: string): string[] {
	const vAlues = version.properties ? version.properties.filter(p => p.key === property) : [];
	const vAlue = vAlues.length > 0 && vAlues[0].vAlue;
	return vAlue ? vAlue.split(',').mAp(v => AdoptToGAlleryExtensionId(v)) : [];
}

function getEngine(version: IRAwGAlleryExtensionVersion): string {
	const vAlues = version.properties ? version.properties.filter(p => p.key === PropertyType.Engine) : [];
	return (vAlues.length > 0 && vAlues[0].vAlue) || '';
}

function getLocAlizedLAnguAges(version: IRAwGAlleryExtensionVersion): string[] {
	const vAlues = version.properties ? version.properties.filter(p => p.key === PropertyType.LocAlizedLAnguAges) : [];
	const vAlue = (vAlues.length > 0 && vAlues[0].vAlue) || '';
	return vAlue ? vAlue.split(',') : [];
}

function getIsPreview(flAgs: string): booleAn {
	return flAgs.indexOf('preview') !== -1;
}

function getIsWebExtension(version: IRAwGAlleryExtensionVersion): booleAn {
	const webExtensionProperty = version.properties ? version.properties.find(p => p.key === PropertyType.WebExtension) : undefined;
	return !!webExtensionProperty && webExtensionProperty.vAlue === 'true';
}

function getWebResource(version: IRAwGAlleryExtensionVersion): URI | undefined {
	return version.files.some(f => f.AssetType.stArtsWith('Microsoft.VisuAlStudio.Code.WebResources'))
		? joinPAth(URI.pArse(version.AssetUri), 'Microsoft.VisuAlStudio.Code.WebResources', 'extension')
		: undefined;
}

function toExtension(gAlleryExtension: IRAwGAlleryExtension, version: IRAwGAlleryExtensionVersion, index: number, query: Query, querySource?: string): IGAlleryExtension {
	const Assets = <IGAlleryExtensionAssets>{
		mAnifest: getVersionAsset(version, AssetType.MAnifest),
		reAdme: getVersionAsset(version, AssetType.DetAils),
		chAngelog: getVersionAsset(version, AssetType.ChAngelog),
		license: getVersionAsset(version, AssetType.License),
		repository: getRepositoryAsset(version),
		downloAd: getDownloAdAsset(version),
		icon: getIconAsset(version),
		coreTrAnslAtions: getCoreTrAnslAtionAssets(version)
	};

	return {
		identifier: {
			id: getGAlleryExtensionId(gAlleryExtension.publisher.publisherNAme, gAlleryExtension.extensionNAme),
			uuid: gAlleryExtension.extensionId
		},
		nAme: gAlleryExtension.extensionNAme,
		version: version.version,
		dAte: version.lAstUpdAted,
		displAyNAme: gAlleryExtension.displAyNAme,
		publisherId: gAlleryExtension.publisher.publisherId,
		publisher: gAlleryExtension.publisher.publisherNAme,
		publisherDisplAyNAme: gAlleryExtension.publisher.displAyNAme,
		description: gAlleryExtension.shortDescription || '',
		instAllCount: getStAtistic(gAlleryExtension.stAtistics, 'instAll'),
		rAting: getStAtistic(gAlleryExtension.stAtistics, 'AverAgerAting'),
		rAtingCount: getStAtistic(gAlleryExtension.stAtistics, 'rAtingcount'),
		AssetUri: URI.pArse(version.AssetUri),
		webResource: getWebResource(version),
		AssetTypes: version.files.mAp(({ AssetType }) => AssetType),
		Assets,
		properties: {
			dependencies: getExtensions(version, PropertyType.Dependency),
			extensionPAck: getExtensions(version, PropertyType.ExtensionPAck),
			engine: getEngine(version),
			locAlizedLAnguAges: getLocAlizedLAnguAges(version),
			webExtension: getIsWebExtension(version)
		},
		/* __GDPR__FRAGMENT__
			"GAlleryExtensionTelemetryDAtA2" : {
				"index" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"seArchText": { "clAssificAtion": "CustomerContent", "purpose": "FeAtureInsight" },
				"querySource": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		telemetryDAtA: {
			index: ((query.pAgeNumber - 1) * query.pAgeSize) + index,
			seArchText: query.seArchText,
			querySource
		},
		preview: getIsPreview(gAlleryExtension.flAgs)
	};
}

interfAce IRAwExtensionsReport {
	mAlicious: string[];
	slow: string[];
}

export clAss ExtensionGAlleryService implements IExtensionGAlleryService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte extensionsGAlleryUrl: string | undefined;
	privAte extensionsControlUrl: string | undefined;

	privAte reAdonly commonHeAdersPromise: Promise<{ [key: string]: string; }>;

	constructor(
		@IRequestService privAte reAdonly requestService: IRequestService,
		@ILogService privAte reAdonly logService: ILogService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IProductService privAte reAdonly productService: IProductService,
		@optionAl(IStorAgeService) storAgeService: IStorAgeService,
	) {
		const config = productService.extensionsGAllery;
		this.extensionsGAlleryUrl = config && config.serviceUrl;
		this.extensionsControlUrl = config && config.controlUrl;
		this.commonHeAdersPromise = resolveMArketplAceHeAders(productService.version, this.environmentService, this.fileService, storAgeService);
	}

	privAte Api(pAth = ''): string {
		return `${this.extensionsGAlleryUrl}${pAth}`;
	}

	isEnAbled(): booleAn {
		return !!this.extensionsGAlleryUrl;
	}

	Async getCompAtibleExtension(Arg1: IExtensionIdentifier | IGAlleryExtension, version?: string): Promise<IGAlleryExtension | null> {
		const extension = AwAit this.getCompAtibleExtensionByEngine(Arg1, version);

		if (extension?.properties.webExtension) {
			return extension.webResource ? extension : null;
		} else {
			return extension;
		}
	}

	privAte Async getCompAtibleExtensionByEngine(Arg1: IExtensionIdentifier | IGAlleryExtension, version?: string): Promise<IGAlleryExtension | null> {
		const extension: IGAlleryExtension | null = isIExtensionIdentifier(Arg1) ? null : Arg1;
		if (extension && extension.properties.engine && isEngineVAlid(extension.properties.engine, this.productService.version)) {
			return extension;
		}
		const { id, uuid } = extension ? extension.identifier : <IExtensionIdentifier>Arg1;
		let query = new Query()
			.withFlAgs(FlAgs.IncludeAssetUri, FlAgs.IncludeStAtistics, FlAgs.IncludeFiles, FlAgs.IncludeVersionProperties)
			.withPAge(1, 1)
			.withFilter(FilterType.TArget, 'Microsoft.VisuAlStudio.Code');

		if (uuid) {
			query = query.withFilter(FilterType.ExtensionId, uuid);
		} else {
			query = query.withFilter(FilterType.ExtensionNAme, id);
		}

		const { gAlleryExtensions } = AwAit this.queryGAllery(query, CAncellAtionToken.None);
		const [rAwExtension] = gAlleryExtensions;
		if (!rAwExtension || !rAwExtension.versions.length) {
			return null;
		}

		if (version) {
			const versionAsset = rAwExtension.versions.filter(v => v.version === version)[0];
			if (versionAsset) {
				const extension = toExtension(rAwExtension, versionAsset, 0, query);
				if (extension.properties.engine && isEngineVAlid(extension.properties.engine, this.productService.version)) {
					return extension;
				}
			}
			return null;
		}

		const rAwVersion = AwAit this.getLAstVAlidExtensionVersion(rAwExtension, rAwExtension.versions);
		if (rAwVersion) {
			return toExtension(rAwExtension, rAwVersion, 0, query);
		}
		return null;
	}

	query(token: CAncellAtionToken): Promise<IPAger<IGAlleryExtension>>;
	query(options: IQueryOptions, token: CAncellAtionToken): Promise<IPAger<IGAlleryExtension>>;
	Async query(Arg1: Any, Arg2?: Any): Promise<IPAger<IGAlleryExtension>> {
		const options: IQueryOptions = CAncellAtionToken.isCAncellAtionToken(Arg1) ? {} : Arg1;
		const token: CAncellAtionToken = CAncellAtionToken.isCAncellAtionToken(Arg1) ? Arg1 : Arg2;

		if (!this.isEnAbled()) {
			throw new Error('No extension gAllery service configured.');
		}

		const type = options.nAmes ? 'ids' : (options.text ? 'text' : 'All');
		let text = options.text || '';
		const pAgeSize = getOrDefAult(options, o => o.pAgeSize, 50);

		type GAlleryServiceQueryClAssificAtion = {
			type: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			text: { clAssificAtion: 'CustomerContent', purpose: 'FeAtureInsight' };
		};
		type GAlleryServiceQueryEvent = {
			type: string;
			text: string;
		};
		this.telemetryService.publicLog2<GAlleryServiceQueryEvent, GAlleryServiceQueryClAssificAtion>('gAlleryService:query', { type, text });

		let query = new Query()
			.withFlAgs(FlAgs.IncludeLAtestVersionOnly, FlAgs.IncludeAssetUri, FlAgs.IncludeStAtistics, FlAgs.IncludeFiles, FlAgs.IncludeVersionProperties)
			.withPAge(1, pAgeSize)
			.withFilter(FilterType.TArget, 'Microsoft.VisuAlStudio.Code');

		if (text) {
			// Use cAtegory filter insteAd of "cAtegory:themes"
			text = text.replAce(/\bcAtegory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCAtegory, cAtegory) => {
				query = query.withFilter(FilterType.CAtegory, cAtegory || quotedCAtegory);
				return '';
			});

			// Use tAg filter insteAd of "tAg:debuggers"
			text = text.replAce(/\btAg:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedTAg, tAg) => {
				query = query.withFilter(FilterType.TAg, tAg || quotedTAg);
				return '';
			});

			// Use feAtured filter
			text = text.replAce(/\bfeAtured(\s+|\b|$)/g, () => {
				query = query.withFilter(FilterType.FeAtured);
				return '';
			});

			text = text.trim();

			if (text) {
				text = text.length < 200 ? text : text.substring(0, 200);
				query = query.withFilter(FilterType.SeArchText, text);
			}

			query = query.withSortBy(SortBy.NoneOrRelevAnce);
		} else if (options.ids) {
			query = query.withFilter(FilterType.ExtensionId, ...options.ids);
		} else if (options.nAmes) {
			query = query.withFilter(FilterType.ExtensionNAme, ...options.nAmes);
		} else {
			query = query.withSortBy(SortBy.InstAllCount);
		}

		if (typeof options.sortBy === 'number') {
			query = query.withSortBy(options.sortBy);
		}

		if (typeof options.sortOrder === 'number') {
			query = query.withSortOrder(options.sortOrder);
		}

		const { gAlleryExtensions, totAl } = AwAit this.queryGAllery(query, token);
		const extensions = gAlleryExtensions.mAp((e, index) => toExtension(e, e.versions[0], index, query, options.source));
		const getPAge = Async (pAgeIndex: number, ct: CAncellAtionToken) => {
			if (ct.isCAncellAtionRequested) {
				throw cAnceled();
			}
			const nextPAgeQuery = query.withPAge(pAgeIndex + 1);
			const { gAlleryExtensions } = AwAit this.queryGAllery(nextPAgeQuery, ct);
			return gAlleryExtensions.mAp((e, index) => toExtension(e, e.versions[0], index, nextPAgeQuery, options.source));
		};

		return { firstPAge: extensions, totAl, pAgeSize: query.pAgeSize, getPAge } As IPAger<IGAlleryExtension>;
	}

	privAte Async queryGAllery(query: Query, token: CAncellAtionToken): Promise<{ gAlleryExtensions: IRAwGAlleryExtension[], totAl: number; }> {
		if (!this.isEnAbled()) {
			throw new Error('No extension gAllery service configured.');
		}

		// AlwAys exclude non vAlidAted And unpublished extensions
		query = query
			.withFlAgs(query.flAgs, FlAgs.ExcludeNonVAlidAted)
			.withFilter(FilterType.ExcludeWithFlAgs, flAgsToString(FlAgs.Unpublished));

		const commonHeAders = AwAit this.commonHeAdersPromise;
		const dAtA = JSON.stringify(query.rAw);
		const heAders = {
			...commonHeAders,
			'Content-Type': 'ApplicAtion/json',
			'Accept': 'ApplicAtion/json;Api-version=3.0-preview.1',
			'Accept-Encoding': 'gzip',
			'Content-Length': String(dAtA.length)
		};

		const context = AwAit this.requestService.request({
			type: 'POST',
			url: this.Api('/extensionquery'),
			dAtA,
			heAders
		}, token);

		if (context.res.stAtusCode && context.res.stAtusCode >= 400 && context.res.stAtusCode < 500) {
			return { gAlleryExtensions: [], totAl: 0 };
		}

		const result = AwAit AsJson<IRAwGAlleryQueryResult>(context);
		if (result) {
			const r = result.results[0];
			const gAlleryExtensions = r.extensions;
			const resultCount = r.resultMetAdAtA && r.resultMetAdAtA.filter(m => m.metAdAtAType === 'ResultCount')[0];
			const totAl = resultCount && resultCount.metAdAtAItems.filter(i => i.nAme === 'TotAlCount')[0].count || 0;

			return { gAlleryExtensions, totAl };
		}
		return { gAlleryExtensions: [], totAl: 0 };
	}

	Async reportStAtistic(publisher: string, nAme: string, version: string, type: StAtisticType): Promise<void> {
		if (!this.isEnAbled()) {
			return undefined;
		}

		const commonHeAders = AwAit this.commonHeAdersPromise;
		const heAders = { ...commonHeAders, Accept: '*/*;Api-version=4.0-preview.1' };
		try {
			AwAit this.requestService.request({
				type: 'POST',
				url: this.Api(`/publishers/${publisher}/extensions/${nAme}/${version}/stAts?stAtType=${type}`),
				heAders
			}, CAncellAtionToken.None);
		} cAtch (error) { /* Ignore */ }
	}

	Async downloAd(extension: IGAlleryExtension, locAtion: URI, operAtion: InstAllOperAtion): Promise<void> {
		this.logService.trAce('ExtensionGAlleryService#downloAd', extension.identifier.id);
		const dAtA = getGAlleryExtensionTelemetryDAtA(extension);
		const stArtTime = new DAte().getTime();
		/* __GDPR__
			"gAlleryService:downloAdVSIX" : {
				"durAtion": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"${include}": [
					"${GAlleryExtensionTelemetryDAtA}"
				]
			}
		*/
		const log = (durAtion: number) => this.telemetryService.publicLog('gAlleryService:downloAdVSIX', { ...dAtA, durAtion });

		const operAtionPArAm = operAtion === InstAllOperAtion.InstAll ? 'instAll' : operAtion === InstAllOperAtion.UpdAte ? 'updAte' : '';
		const downloAdAsset = operAtionPArAm ? {
			uri: `${extension.Assets.downloAd.uri}&${operAtionPArAm}=true`,
			fAllbAckUri: `${extension.Assets.downloAd.fAllbAckUri}?${operAtionPArAm}=true`
		} : extension.Assets.downloAd;

		const context = AwAit this.getAsset(downloAdAsset);
		AwAit this.fileService.writeFile(locAtion, context.streAm);
		log(new DAte().getTime() - stArtTime);
	}

	Async getReAdme(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<string> {
		if (extension.Assets.reAdme) {
			const context = AwAit this.getAsset(extension.Assets.reAdme, {}, token);
			const content = AwAit AsText(context);
			return content || '';
		}
		return '';
	}

	Async getMAnifest(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<IExtensionMAnifest | null> {
		if (extension.Assets.mAnifest) {
			const context = AwAit this.getAsset(extension.Assets.mAnifest, {}, token);
			const text = AwAit AsText(context);
			return text ? JSON.pArse(text) : null;
		}
		return null;
	}

	Async getCoreTrAnslAtion(extension: IGAlleryExtension, lAnguAgeId: string): Promise<ITrAnslAtion | null> {
		const Asset = extension.Assets.coreTrAnslAtions.filter(t => t[0] === lAnguAgeId.toUpperCAse())[0];
		if (Asset) {
			const context = AwAit this.getAsset(Asset[1]);
			const text = AwAit AsText(context);
			return text ? JSON.pArse(text) : null;
		}
		return null;
	}

	Async getChAngelog(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<string> {
		if (extension.Assets.chAngelog) {
			const context = AwAit this.getAsset(extension.Assets.chAngelog, {}, token);
			const content = AwAit AsText(context);
			return content || '';
		}
		return '';
	}

	Async getAllVersions(extension: IGAlleryExtension, compAtible: booleAn): Promise<IGAlleryExtensionVersion[]> {
		let query = new Query()
			.withFlAgs(FlAgs.IncludeVersions, FlAgs.IncludeFiles, FlAgs.IncludeVersionProperties)
			.withPAge(1, 1)
			.withFilter(FilterType.TArget, 'Microsoft.VisuAlStudio.Code');

		if (extension.identifier.uuid) {
			query = query.withFilter(FilterType.ExtensionId, extension.identifier.uuid);
		} else {
			query = query.withFilter(FilterType.ExtensionNAme, extension.identifier.id);
		}

		const result: IGAlleryExtensionVersion[] = [];
		const { gAlleryExtensions } = AwAit this.queryGAllery(query, CAncellAtionToken.None);
		if (gAlleryExtensions.length) {
			if (compAtible) {
				AwAit Promise.All(gAlleryExtensions[0].versions.mAp(Async v => {
					let engine: string | undefined;
					try {
						engine = AwAit this.getEngine(v);
					} cAtch (error) { /* Ignore error And skip version */ }
					if (engine && isEngineVAlid(engine, this.productService.version)) {
						result.push({ version: v!.version, dAte: v!.lAstUpdAted });
					}
				}));
			} else {
				result.push(...gAlleryExtensions[0].versions.mAp(v => ({ version: v.version, dAte: v.lAstUpdAted })));
			}
		}
		return result;
	}

	privAte Async getAsset(Asset: IGAlleryExtensionAsset, options: IRequestOptions = {}, token: CAncellAtionToken = CAncellAtionToken.None): Promise<IRequestContext> {
		const commonHeAders = AwAit this.commonHeAdersPromise;
		const bAseOptions = { type: 'GET' };
		const heAders = { ...commonHeAders, ...(options.heAders || {}) };
		options = { ...options, ...bAseOptions, heAders };

		const url = Asset.uri;
		const fAllbAckUrl = Asset.fAllbAckUri;
		const firstOptions = { ...options, url };

		try {
			const context = AwAit this.requestService.request(firstOptions, token);
			if (context.res.stAtusCode === 200) {
				return context;
			}
			const messAge = AwAit AsText(context);
			throw new Error(`Expected 200, got bAck ${context.res.stAtusCode} insteAd.\n\n${messAge}`);
		} cAtch (err) {
			if (isPromiseCAnceledError(err)) {
				throw err;
			}

			const messAge = getErrorMessAge(err);
			type GAlleryServiceCDNFAllbAckClAssificAtion = {
				url: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
				messAge: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			};
			type GAlleryServiceCDNFAllbAckEvent = {
				url: string;
				messAge: string;
			};
			this.telemetryService.publicLog2<GAlleryServiceCDNFAllbAckEvent, GAlleryServiceCDNFAllbAckClAssificAtion>('gAlleryService:cdnFAllbAck', { url, messAge });

			const fAllbAckOptions = { ...options, url: fAllbAckUrl };
			return this.requestService.request(fAllbAckOptions, token);
		}
	}

	privAte Async getLAstVAlidExtensionVersion(extension: IRAwGAlleryExtension, versions: IRAwGAlleryExtensionVersion[]): Promise<IRAwGAlleryExtensionVersion | null> {
		const version = this.getLAstVAlidExtensionVersionFromProperties(extension, versions);
		if (version) {
			return version;
		}
		return this.getLAstVAlidExtensionVersionRecursively(extension, versions);
	}

	privAte getLAstVAlidExtensionVersionFromProperties(extension: IRAwGAlleryExtension, versions: IRAwGAlleryExtensionVersion[]): IRAwGAlleryExtensionVersion | null {
		for (const version of versions) {
			const engine = getEngine(version);
			if (!engine) {
				return null;
			}
			if (isEngineVAlid(engine, this.productService.version)) {
				return version;
			}
		}
		return null;
	}

	privAte Async getEngine(version: IRAwGAlleryExtensionVersion): Promise<string> {
		const engine = getEngine(version);
		if (engine) {
			return engine;
		}

		const mAnifestAsset = getVersionAsset(version, AssetType.MAnifest);
		if (!mAnifestAsset) {
			throw new Error('MAnifest wAs not found');
		}

		const heAders = { 'Accept-Encoding': 'gzip' };
		const context = AwAit this.getAsset(mAnifestAsset, { heAders });
		const mAnifest = AwAit AsJson<IExtensionMAnifest>(context);
		if (mAnifest) {
			return mAnifest.engines.vscode;
		}

		throw new Error('Error while reAding mAnifest');
	}

	privAte Async getLAstVAlidExtensionVersionRecursively(extension: IRAwGAlleryExtension, versions: IRAwGAlleryExtensionVersion[]): Promise<IRAwGAlleryExtensionVersion | null> {
		if (!versions.length) {
			return null;
		}

		const version = versions[0];
		const engine = AwAit this.getEngine(version);
		if (!isEngineVAlid(engine, this.productService.version)) {
			return this.getLAstVAlidExtensionVersionRecursively(extension, versions.slice(1));
		}

		version.properties = version.properties || [];
		version.properties.push({ key: PropertyType.Engine, vAlue: engine });
		return version;
	}

	Async getExtensionsReport(): Promise<IReportedExtension[]> {
		if (!this.isEnAbled()) {
			throw new Error('No extension gAllery service configured.');
		}

		if (!this.extensionsControlUrl) {
			return [];
		}

		const context = AwAit this.requestService.request({ type: 'GET', url: this.extensionsControlUrl }, CAncellAtionToken.None);
		if (context.res.stAtusCode !== 200) {
			throw new Error('Could not get extensions report.');
		}

		const result = AwAit AsJson<IRAwExtensionsReport>(context);
		const mAp = new MAp<string, IReportedExtension>();

		if (result) {
			for (const id of result.mAlicious) {
				const ext = mAp.get(id) || { id: { id }, mAlicious: true, slow: fAlse };
				ext.mAlicious = true;
				mAp.set(id, ext);
			}
		}

		return [...mAp.vAlues()];
	}
}

export Async function resolveMArketplAceHeAders(version: string, environmentService: IEnvironmentService, fileService: IFileService, storAgeService: {
	get: (key: string, scope: StorAgeScope) => string | undefined,
	store: (key: string, vAlue: string, scope: StorAgeScope) => void
} | undefined): Promise<{ [key: string]: string; }> {
	const heAders: IHeAders = {
		'X-MArket-Client-Id': `VSCode ${version}`,
		'User-Agent': `VSCode ${version}`
	};
	const uuid = AwAit getServiceMAchineId(environmentService, fileService, storAgeService);
	heAders['X-MArket-User-Id'] = uuid;
	return heAders;
}
