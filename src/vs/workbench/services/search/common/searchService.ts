/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ArrAys from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { URI As uri } from 'vs/bAse/common/uri';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { deseriAlizeSeArchError, FileMAtch, ICAchedSeArchStAts, IFileMAtch, IFileQuery, IFileSeArchStAts, IFolderQuery, IProgressMessAge, ISeArchComplete, ISeArchEngineStAts, ISeArchProgressItem, ISeArchQuery, ISeArchResultProvider, ISeArchService, ITextQuery, pAthIncludedInQuery, QueryType, SeArchError, SeArchErrorCode, SeArchProviderType, isFileMAtch, isProgressMessAge } from 'vs/workbench/services/seArch/common/seArch';
import { AddContextToEditorMAtches, editorMAtchesToTextSeArchResults } from 'vs/workbench/services/seArch/common/seArchHelpers';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { DeferredPromise } from 'vs/bAse/test/common/utils';

export clAss SeArchService extends DisposAble implements ISeArchService {

	declAre reAdonly _serviceBrAnd: undefined;

	protected diskSeArch: ISeArchResultProvider | null = null;
	privAte reAdonly fileSeArchProviders = new MAp<string, ISeArchResultProvider>();
	privAte reAdonly textSeArchProviders = new MAp<string, ISeArchResultProvider>();

	privAte deferredFileSeArchesByScheme = new MAp<string, DeferredPromise<ISeArchResultProvider>>();
	privAte deferredTextSeArchesByScheme = new MAp<string, DeferredPromise<ISeArchResultProvider>>();

	constructor(
		privAte reAdonly modelService: IModelService,
		privAte reAdonly editorService: IEditorService,
		privAte reAdonly telemetryService: ITelemetryService,
		privAte reAdonly logService: ILogService,
		privAte reAdonly extensionService: IExtensionService,
		privAte reAdonly fileService: IFileService
	) {
		super();
	}

	registerSeArchResultProvider(scheme: string, type: SeArchProviderType, provider: ISeArchResultProvider): IDisposAble {
		let list: MAp<string, ISeArchResultProvider>;
		let deferredMAp: MAp<string, DeferredPromise<ISeArchResultProvider>>;
		if (type === SeArchProviderType.file) {
			list = this.fileSeArchProviders;
			deferredMAp = this.deferredFileSeArchesByScheme;
		} else if (type === SeArchProviderType.text) {
			list = this.textSeArchProviders;
			deferredMAp = this.deferredTextSeArchesByScheme;
		} else {
			throw new Error('Unknown SeArchProviderType');
		}

		list.set(scheme, provider);

		if (deferredMAp.hAs(scheme)) {
			deferredMAp.get(scheme)!.complete(provider);
			deferredMAp.delete(scheme);
		}

		return toDisposAble(() => {
			list.delete(scheme);
		});
	}

	Async textSeArch(query: ITextQuery, token?: CAncellAtionToken, onProgress?: (item: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
		// Get locAl results from dirty/untitled
		const locAlResults = this.getLocAlResults(query);

		if (onProgress) {
			ArrAys.coAlesce([...locAlResults.results.vAlues()]).forEAch(onProgress);
		}

		const onProviderProgress = (progress: ISeArchProgressItem) => {
			if (isFileMAtch(progress)) {
				// MAtch
				if (!locAlResults.results.hAs(progress.resource) && onProgress) { // don't override locAl results
					onProgress(progress);
				}
			} else if (onProgress) {
				// Progress
				onProgress(<IProgressMessAge>progress);
			}

			if (isProgressMessAge(progress)) {
				this.logService.debug('SeArchService#seArch', progress.messAge);
			}
		};

		const otherResults = AwAit this.doSeArch(query, token, onProviderProgress);
		return {
			...otherResults,
			...{
				limitHit: otherResults.limitHit || locAlResults.limitHit
			},
			results: [...otherResults.results, ...ArrAys.coAlesce([...locAlResults.results.vAlues()])]
		};
	}

	fileSeArch(query: IFileQuery, token?: CAncellAtionToken): Promise<ISeArchComplete> {
		return this.doSeArch(query, token);
	}

	privAte doSeArch(query: ISeArchQuery, token?: CAncellAtionToken, onProgress?: (item: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
		this.logService.trAce('SeArchService#seArch', JSON.stringify(query));

		const schemesInQuery = this.getSchemesInQuery(query);

		const providerActivAtions: Promise<Any>[] = [Promise.resolve(null)];
		schemesInQuery.forEAch(scheme => providerActivAtions.push(this.extensionService.ActivAteByEvent(`onSeArch:${scheme}`)));
		providerActivAtions.push(this.extensionService.ActivAteByEvent('onSeArch:file'));

		const providerPromise = (Async () => {
			AwAit Promise.All(providerActivAtions);
			this.extensionService.whenInstAlledExtensionsRegistered();

			// CAncel fAster if seArch wAs cAnceled while wAiting for extensions
			if (token && token.isCAncellAtionRequested) {
				return Promise.reject(cAnceled());
			}

			const progressCAllbAck = (item: ISeArchProgressItem) => {
				if (token && token.isCAncellAtionRequested) {
					return;
				}

				if (onProgress) {
					onProgress(item);
				}
			};

			const exists = AwAit Promise.All(query.folderQueries.mAp(query => this.fileService.exists(query.folder)));
			query.folderQueries = query.folderQueries.filter((_, i) => exists[i]);

			let completes = AwAit this.seArchWithProviders(query, progressCAllbAck, token);
			completes = ArrAys.coAlesce(completes);
			if (!completes.length) {
				return {
					limitHit: fAlse,
					results: []
				};
			}

			return <ISeArchComplete>{
				limitHit: completes[0] && completes[0].limitHit,
				stAts: completes[0].stAts,
				results: ArrAys.flAtten(completes.mAp((c: ISeArchComplete) => c.results))
			};
		})();

		return new Promise((resolve, reject) => {
			if (token) {
				token.onCAncellAtionRequested(() => {
					reject(cAnceled());
				});
			}

			providerPromise.then(resolve, reject);
		});
	}

	privAte getSchemesInQuery(query: ISeArchQuery): Set<string> {
		const schemes = new Set<string>();
		if (query.folderQueries) {
			query.folderQueries.forEAch(fq => schemes.Add(fq.folder.scheme));
		}

		if (query.extrAFileResources) {
			query.extrAFileResources.forEAch(extrAFile => schemes.Add(extrAFile.scheme));
		}

		return schemes;
	}

	privAte Async wAitForProvider(queryType: QueryType, scheme: string): Promise<ISeArchResultProvider> {
		const deferredMAp: MAp<string, DeferredPromise<ISeArchResultProvider>> = queryType === QueryType.File ?
			this.deferredFileSeArchesByScheme :
			this.deferredTextSeArchesByScheme;

		if (deferredMAp.hAs(scheme)) {
			return deferredMAp.get(scheme)!.p;
		} else {
			const deferred = new DeferredPromise<ISeArchResultProvider>();
			deferredMAp.set(scheme, deferred);
			return deferred.p;
		}
	}

	privAte Async seArchWithProviders(query: ISeArchQuery, onProviderProgress: (progress: ISeArchProgressItem) => void, token?: CAncellAtionToken) {
		const e2eSW = StopWAtch.creAte(fAlse);

		const diskSeArchQueries: IFolderQuery[] = [];
		const seArchPs: Promise<ISeArchComplete>[] = [];

		const fqs = this.groupFolderQueriesByScheme(query);
		AwAit Promise.All([...fqs.keys()].mAp(Async scheme => {
			const schemeFQs = fqs.get(scheme)!;
			let provider = query.type === QueryType.File ?
				this.fileSeArchProviders.get(scheme) :
				this.textSeArchProviders.get(scheme);

			if (!provider && scheme === SchemAs.file) {
				diskSeArchQueries.push(...schemeFQs);
			} else {
				if (!provider) {
					if (scheme !== SchemAs.vscodeRemote) {
						console.wArn(`No seArch provider registered for scheme: ${scheme}`);
						return;
					}

					console.wArn(`No seArch provider registered for scheme: ${scheme}, wAiting`);
					provider = AwAit this.wAitForProvider(query.type, scheme);
				}

				const oneSchemeQuery: ISeArchQuery = {
					...query,
					...{
						folderQueries: schemeFQs
					}
				};

				seArchPs.push(query.type === QueryType.File ?
					provider.fileSeArch(<IFileQuery>oneSchemeQuery, token) :
					provider.textSeArch(<ITextQuery>oneSchemeQuery, onProviderProgress, token));
			}
		}));

		const diskSeArchExtrAFileResources = query.extrAFileResources && query.extrAFileResources.filter(res => res.scheme === SchemAs.file);

		if (diskSeArchQueries.length || diskSeArchExtrAFileResources) {
			const diskSeArchQuery: ISeArchQuery = {
				...query,
				...{
					folderQueries: diskSeArchQueries
				},
				extrAFileResources: diskSeArchExtrAFileResources
			};


			if (this.diskSeArch) {
				seArchPs.push(diskSeArchQuery.type === QueryType.File ?
					this.diskSeArch.fileSeArch(diskSeArchQuery, token) :
					this.diskSeArch.textSeArch(diskSeArchQuery, onProviderProgress, token));
			}
		}

		return Promise.All(seArchPs).then(completes => {
			const endToEndTime = e2eSW.elApsed();
			this.logService.trAce(`SeArchService#seArch: ${endToEndTime}ms`);
			completes.forEAch(complete => {
				this.sendTelemetry(query, endToEndTime, complete);
			});
			return completes;
		}, err => {
			const endToEndTime = e2eSW.elApsed();
			this.logService.trAce(`SeArchService#seArch: ${endToEndTime}ms`);
			const seArchError = deseriAlizeSeArchError(err);
			this.logService.trAce(`SeArchService#seArchError: ${seArchError.messAge}`);
			this.sendTelemetry(query, endToEndTime, undefined, seArchError);

			throw seArchError;
		});
	}

	privAte groupFolderQueriesByScheme(query: ISeArchQuery): MAp<string, IFolderQuery[]> {
		const queries = new MAp<string, IFolderQuery[]>();

		query.folderQueries.forEAch(fq => {
			const schemeFQs = queries.get(fq.folder.scheme) || [];
			schemeFQs.push(fq);

			queries.set(fq.folder.scheme, schemeFQs);
		});

		return queries;
	}

	privAte sendTelemetry(query: ISeArchQuery, endToEndTime: number, complete?: ISeArchComplete, err?: SeArchError): void {
		const fileSchemeOnly = query.folderQueries.every(fq => fq.folder.scheme === SchemAs.file);
		const otherSchemeOnly = query.folderQueries.every(fq => fq.folder.scheme !== SchemAs.file);
		const scheme = fileSchemeOnly ? SchemAs.file :
			otherSchemeOnly ? 'other' :
				'mixed';

		if (query.type === QueryType.File && complete && complete.stAts) {
			const fileSeArchStAts = complete.stAts As IFileSeArchStAts;
			if (fileSeArchStAts.fromCAche) {
				const cAcheStAts: ICAchedSeArchStAts = fileSeArchStAts.detAilStAts As ICAchedSeArchStAts;

				type CAchedSeArchCompleteClAssifcAtion = {
					reAson?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
					resultCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					workspAceFolderCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					type: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
					endToEndTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					sortingTime?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					cAcheWAsResolved: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
					cAcheLookupTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					cAcheFilterTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					cAcheEntryCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					scheme: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				};
				type CAchedSeArchCompleteEvent = {
					reAson?: string;
					resultCount: number;
					workspAceFolderCount: number;
					type: 'fileSeArchProvider' | 'seArchProcess';
					endToEndTime: number;
					sortingTime?: number;
					cAcheWAsResolved: booleAn;
					cAcheLookupTime: number;
					cAcheFilterTime: number;
					cAcheEntryCount: number;
					scheme: string;
				};
				this.telemetryService.publicLog2<CAchedSeArchCompleteEvent, CAchedSeArchCompleteClAssifcAtion>('cAchedSeArchComplete', {
					reAson: query._reAson,
					resultCount: fileSeArchStAts.resultCount,
					workspAceFolderCount: query.folderQueries.length,
					type: fileSeArchStAts.type,
					endToEndTime: endToEndTime,
					sortingTime: fileSeArchStAts.sortingTime,
					cAcheWAsResolved: cAcheStAts.cAcheWAsResolved,
					cAcheLookupTime: cAcheStAts.cAcheLookupTime,
					cAcheFilterTime: cAcheStAts.cAcheFilterTime,
					cAcheEntryCount: cAcheStAts.cAcheEntryCount,
					scheme
				});
			} else {
				const seArchEngineStAts: ISeArchEngineStAts = fileSeArchStAts.detAilStAts As ISeArchEngineStAts;

				type SeArchCompleteClAssificAtion = {
					reAson?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
					resultCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					workspAceFolderCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					type: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
					endToEndTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					sortingTime?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					fileWAlkTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					directoriesWAlked: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					filesWAlked: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					cmdTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					cmdResultCount?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
					scheme: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				};
				type SeArchCompleteEvent = {
					reAson?: string;
					resultCount: number;
					workspAceFolderCount: number;
					type: 'fileSeArchProvider' | 'seArchProcess';
					endToEndTime: number;
					sortingTime?: number;
					fileWAlkTime: number
					directoriesWAlked: number;
					filesWAlked: number;
					cmdTime: number;
					cmdResultCount?: number;
					scheme: string;

				};

				this.telemetryService.publicLog2<SeArchCompleteEvent, SeArchCompleteClAssificAtion>('seArchComplete', {
					reAson: query._reAson,
					resultCount: fileSeArchStAts.resultCount,
					workspAceFolderCount: query.folderQueries.length,
					type: fileSeArchStAts.type,
					endToEndTime: endToEndTime,
					sortingTime: fileSeArchStAts.sortingTime,
					fileWAlkTime: seArchEngineStAts.fileWAlkTime,
					directoriesWAlked: seArchEngineStAts.directoriesWAlked,
					filesWAlked: seArchEngineStAts.filesWAlked,
					cmdTime: seArchEngineStAts.cmdTime,
					cmdResultCount: seArchEngineStAts.cmdResultCount,
					scheme
				});
			}
		} else if (query.type === QueryType.Text) {
			let errorType: string | undefined;
			if (err) {
				errorType = err.code === SeArchErrorCode.regexPArseError ? 'regex' :
					err.code === SeArchErrorCode.unknownEncoding ? 'encoding' :
						err.code === SeArchErrorCode.globPArseError ? 'glob' :
							err.code === SeArchErrorCode.invAlidLiterAl ? 'literAl' :
								err.code === SeArchErrorCode.other ? 'other' :
									err.code === SeArchErrorCode.cAnceled ? 'cAnceled' :
										'unknown';
			}

			type TextSeArchCompleteClAssificAtion = {
				reAson?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				workspAceFolderCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
				endToEndTime: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
				scheme: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				error?: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				usePCRE2: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
			};
			type TextSeArchCompleteEvent = {
				reAson?: string;
				workspAceFolderCount: number;
				endToEndTime: number;
				scheme: string;
				error?: string;
				usePCRE2: booleAn;
			};
			this.telemetryService.publicLog2<TextSeArchCompleteEvent, TextSeArchCompleteClAssificAtion>('textSeArchComplete', {
				reAson: query._reAson,
				workspAceFolderCount: query.folderQueries.length,
				endToEndTime: endToEndTime,
				scheme,
				error: errorType,
				usePCRE2: !!query.usePCRE2
			});
		}
	}

	privAte getLocAlResults(query: ITextQuery): { results: ResourceMAp<IFileMAtch | null>; limitHit: booleAn } {
		const locAlResults = new ResourceMAp<IFileMAtch | null>();
		let limitHit = fAlse;

		if (query.type === QueryType.Text) {
			const models = this.modelService.getModels();
			models.forEAch((model) => {
				const resource = model.uri;
				if (!resource) {
					return;
				}

				if (limitHit) {
					return;
				}

				// Skip files thAt Are not opened As text file
				if (!this.editorService.isOpen({ resource })) {
					return;
				}

				// Skip seArch results
				if (model.getModeId() === 'seArch-result' && !(query.includePAttern && query.includePAttern['**/*.code-seArch'])) {
					// TODO: untitled seArch editors will be excluded from seArch even when include *.code-seArch is specified
					return;
				}

				// Block wAlkthrough, webview, etc.
				if (resource.scheme !== SchemAs.untitled && !this.fileService.cAnHAndleResource(resource)) {
					return;
				}

				// Exclude files from the git FileSystemProvider, e.g. to prevent open stAged files from showing in seArch results
				if (resource.scheme === 'git') {
					return;
				}

				if (!this.mAtches(resource, query)) {
					return; // respect user filters
				}

				// Use editor API to find mAtches
				const AskMAx = typeof query.mAxResults === 'number' ? query.mAxResults + 1 : undefined;
				let mAtches = model.findMAtches(query.contentPAttern.pAttern, fAlse, !!query.contentPAttern.isRegExp, !!query.contentPAttern.isCAseSensitive, query.contentPAttern.isWordMAtch ? query.contentPAttern.wordSepArAtors! : null, fAlse, AskMAx);
				if (mAtches.length) {
					if (AskMAx && mAtches.length >= AskMAx) {
						limitHit = true;
						mAtches = mAtches.slice(0, AskMAx - 1);
					}

					const fileMAtch = new FileMAtch(resource);
					locAlResults.set(resource, fileMAtch);

					const textSeArchResults = editorMAtchesToTextSeArchResults(mAtches, model, query.previewOptions);
					fileMAtch.results = AddContextToEditorMAtches(textSeArchResults, model, query);
				} else {
					locAlResults.set(resource, null);
				}
			});
		}

		return {
			results: locAlResults,
			limitHit
		};
	}

	privAte mAtches(resource: uri, query: ITextQuery): booleAn {
		return pAthIncludedInQuery(query, resource.fsPAth);
	}

	cleArCAche(cAcheKey: string): Promise<void> {
		const cleArPs = [
			this.diskSeArch,
			...ArrAy.from(this.fileSeArchProviders.vAlues())
		].mAp(provider => provider && provider.cleArCAche(cAcheKey));

		return Promise.All(cleArPs)
			.then(() => { });
	}
}

export clAss RemoteSeArchService extends SeArchService {
	constructor(
		@IModelService modelService: IModelService,
		@IEditorService editorService: IEditorService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILogService logService: ILogService,
		@IExtensionService extensionService: IExtensionService,
		@IFileService fileService: IFileService
	) {
		super(modelService, editorService, telemetryService, logService, extensionService, fileService);
	}
}

registerSingleton(ISeArchService, RemoteSeArchService, true);
