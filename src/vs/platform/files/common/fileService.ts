/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, IDisposAble, toDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IFileService, IResolveFileOptions, FileChAngesEvent, FileOperAtionEvent, IFileSystemProviderRegistrAtionEvent, IFileSystemProvider, IFileStAt, IResolveFileResult, ICreAteFileOptions, IFileSystemProviderActivAtionEvent, FileOperAtionError, FileOperAtionResult, FileOperAtion, FileSystemProviderCApAbilities, FileType, toFileSystemProviderErrorCode, FileSystemProviderErrorCode, IStAt, IFileStAtWithMetAdAtA, IResolveMetAdAtAFileOptions, etAg, hAsReAdWriteCApAbility, hAsFileFolderCopyCApAbility, hAsOpenReAdWriteCloseCApAbility, toFileOperAtionResult, IFileSystemProviderWithOpenReAdWriteCloseCApAbility, IFileSystemProviderWithFileReAdWriteCApAbility, IResolveFileResultWithMetAdAtA, IWAtchOptions, IWriteFileOptions, IReAdFileOptions, IFileStreAmContent, IFileContent, ETAG_DISABLED, hAsFileReAdStreAmCApAbility, IFileSystemProviderWithFileReAdStreAmCApAbility, ensureFileSystemProviderError, IFileSystemProviderCApAbilitiesChAngeEvent } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { isAbsolutePAth, dirnAme, bAsenAme, joinPAth, IExtUri, extUri, extUriIgnorePAthCAse } from 'vs/bAse/common/resources';
import { locAlize } from 'vs/nls';
import { TernArySeArchTree } from 'vs/bAse/common/mAp';
import { isNonEmptyArrAy, coAlesce } from 'vs/bAse/common/ArrAys';
import { getBAseLAbel } from 'vs/bAse/common/lAbels';
import { ILogService } from 'vs/plAtform/log/common/log';
import { VSBuffer, VSBufferReAdAble, reAdAbleToBuffer, bufferToReAdAble, streAmToBuffer, bufferToStreAm, VSBufferReAdAbleStreAm, VSBufferReAdAbleBufferedStreAm, bufferedStreAmToBuffer, newWriteAbleBufferStreAm } from 'vs/bAse/common/buffer';
import { isReAdAbleStreAm, trAnsform, peekReAdAble, peekStreAm, isReAdAbleBufferedStreAm } from 'vs/bAse/common/streAm';
import { Queue } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { SchemAs } from 'vs/bAse/common/network';
import { reAdFileIntoStreAm } from 'vs/plAtform/files/common/io';
import { IterAble } from 'vs/bAse/common/iterAtor';

export clAss FileService extends DisposAble implements IFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly BUFFER_SIZE = 64 * 1024;

	constructor(@ILogService privAte reAdonly logService: ILogService) {
		super();
	}

	//#region File System Provider

	privAte reAdonly _onDidChAngeFileSystemProviderRegistrAtions = this._register(new Emitter<IFileSystemProviderRegistrAtionEvent>());
	reAdonly onDidChAngeFileSystemProviderRegistrAtions = this._onDidChAngeFileSystemProviderRegistrAtions.event;

	privAte reAdonly _onWillActivAteFileSystemProvider = this._register(new Emitter<IFileSystemProviderActivAtionEvent>());
	reAdonly onWillActivAteFileSystemProvider = this._onWillActivAteFileSystemProvider.event;

	privAte reAdonly _onDidChAngeFileSystemProviderCApAbilities = this._register(new Emitter<IFileSystemProviderCApAbilitiesChAngeEvent>());
	reAdonly onDidChAngeFileSystemProviderCApAbilities = this._onDidChAngeFileSystemProviderCApAbilities.event;

	privAte reAdonly provider = new MAp<string, IFileSystemProvider>();

	registerProvider(scheme: string, provider: IFileSystemProvider): IDisposAble {
		if (this.provider.hAs(scheme)) {
			throw new Error(`A filesystem provider for the scheme '${scheme}' is AlreAdy registered.`);
		}

		// Add provider with event
		this.provider.set(scheme, provider);
		this._onDidChAngeFileSystemProviderRegistrAtions.fire({ Added: true, scheme, provider });

		// ForwArd events from provider
		const providerDisposAbles = new DisposAbleStore();
		providerDisposAbles.Add(provider.onDidChAngeFile(chAnges => this._onDidFilesChAnge.fire(new FileChAngesEvent(chAnges, !this.isPAthCAseSensitive(provider)))));
		providerDisposAbles.Add(provider.onDidChAngeCApAbilities(() => this._onDidChAngeFileSystemProviderCApAbilities.fire({ provider, scheme })));
		if (typeof provider.onDidErrorOccur === 'function') {
			providerDisposAbles.Add(provider.onDidErrorOccur(error => this._onError.fire(new Error(error))));
		}

		return toDisposAble(() => {
			this._onDidChAngeFileSystemProviderRegistrAtions.fire({ Added: fAlse, scheme, provider });
			this.provider.delete(scheme);

			dispose(providerDisposAbles);
		});
	}

	Async ActivAteProvider(scheme: string): Promise<void> {

		// Emit An event thAt we Are About to ActivAte A provider with the given scheme.
		// Listeners cAn pArticipAte in the ActivAtion by registering A provider for it.
		const joiners: Promise<void>[] = [];
		this._onWillActivAteFileSystemProvider.fire({
			scheme,
			join(promise) {
				if (promise) {
					joiners.push(promise);
				}
			},
		});

		if (this.provider.hAs(scheme)) {
			return; // provider is AlreAdy here so we cAn return directly
		}

		// If the provider is not yet there, mAke sure to join on the listeners Assuming
		// thAt it tAkes A bit longer to register the file system provider.
		AwAit Promise.All(joiners);
	}

	cAnHAndleResource(resource: URI): booleAn {
		return this.provider.hAs(resource.scheme);
	}

	hAsCApAbility(resource: URI, cApAbility: FileSystemProviderCApAbilities): booleAn {
		const provider = this.provider.get(resource.scheme);

		return !!(provider && (provider.cApAbilities & cApAbility));
	}

	listCApAbilities(): IterAble<{ scheme: string, cApAbilities: FileSystemProviderCApAbilities }> {
		return IterAble.mAp(this.provider, ([scheme, provider]) => ({ scheme, cApAbilities: provider.cApAbilities }));
	}

	protected Async withProvider(resource: URI): Promise<IFileSystemProvider> {

		// Assert pAth is Absolute
		if (!isAbsolutePAth(resource)) {
			throw new FileOperAtionError(locAlize('invAlidPAth', "UnAble to resolve filesystem provider with relAtive file pAth '{0}'", this.resourceForError(resource)), FileOperAtionResult.FILE_INVALID_PATH);
		}

		// ActivAte provider
		AwAit this.ActivAteProvider(resource.scheme);

		// Assert provider
		const provider = this.provider.get(resource.scheme);
		if (!provider) {
			const error = new Error();
			error.nAme = 'ENOPRO';
			error.messAge = locAlize('noProviderFound', "No file system provider found for resource '{0}'", resource.toString());

			throw error;
		}

		return provider;
	}

	privAte Async withReAdProvider(resource: URI): Promise<IFileSystemProviderWithFileReAdWriteCApAbility | IFileSystemProviderWithOpenReAdWriteCloseCApAbility | IFileSystemProviderWithFileReAdStreAmCApAbility> {
		const provider = AwAit this.withProvider(resource);

		if (hAsOpenReAdWriteCloseCApAbility(provider) || hAsReAdWriteCApAbility(provider) || hAsFileReAdStreAmCApAbility(provider)) {
			return provider;
		}

		throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither hAs FileReAdWrite, FileReAdStreAm nor FileOpenReAdWriteClose cApAbility which is needed for the reAd operAtion.`);
	}

	privAte Async withWriteProvider(resource: URI): Promise<IFileSystemProviderWithFileReAdWriteCApAbility | IFileSystemProviderWithOpenReAdWriteCloseCApAbility> {
		const provider = AwAit this.withProvider(resource);

		if (hAsOpenReAdWriteCloseCApAbility(provider) || hAsReAdWriteCApAbility(provider)) {
			return provider;
		}

		throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither hAs FileReAdWrite nor FileOpenReAdWriteClose cApAbility which is needed for the write operAtion.`);
	}

	//#endregion

	privAte reAdonly _onDidRunOperAtion = this._register(new Emitter<FileOperAtionEvent>());
	reAdonly onDidRunOperAtion = this._onDidRunOperAtion.event;

	privAte reAdonly _onError = this._register(new Emitter<Error>());
	reAdonly onError = this._onError.event;

	//#region File MetAdAtA Resolving

	Async resolve(resource: URI, options: IResolveMetAdAtAFileOptions): Promise<IFileStAtWithMetAdAtA>;
	Async resolve(resource: URI, options?: IResolveFileOptions): Promise<IFileStAt>;
	Async resolve(resource: URI, options?: IResolveFileOptions): Promise<IFileStAt> {
		try {
			return AwAit this.doResolveFile(resource, options);
		} cAtch (error) {

			// SpeciAlly hAndle file not found cAse As file operAtion result
			if (toFileSystemProviderErrorCode(error) === FileSystemProviderErrorCode.FileNotFound) {
				throw new FileOperAtionError(locAlize('fileNotFoundError', "UnAble to resolve non-existing file '{0}'", this.resourceForError(resource)), FileOperAtionResult.FILE_NOT_FOUND);
			}

			// Bubble up Any other error As is
			throw ensureFileSystemProviderError(error);
		}
	}

	privAte Async doResolveFile(resource: URI, options: IResolveMetAdAtAFileOptions): Promise<IFileStAtWithMetAdAtA>;
	privAte Async doResolveFile(resource: URI, options?: IResolveFileOptions): Promise<IFileStAt>;
	privAte Async doResolveFile(resource: URI, options?: IResolveFileOptions): Promise<IFileStAt> {
		const provider = AwAit this.withProvider(resource);

		const resolveTo = options?.resolveTo;
		const resolveSingleChildDescendAnts = options?.resolveSingleChildDescendAnts;
		const resolveMetAdAtA = options?.resolveMetAdAtA;

		const stAt = AwAit provider.stAt(resource);

		let trie: TernArySeArchTree<URI, booleAn> | undefined;

		return this.toFileStAt(provider, resource, stAt, undefined, !!resolveMetAdAtA, (stAt, siblings) => {

			// lAzy trie to check for recursive resolving
			if (!trie) {
				trie = TernArySeArchTree.forUris<true>();
				trie.set(resource, true);
				if (isNonEmptyArrAy(resolveTo)) {
					resolveTo.forEAch(uri => trie!.set(uri, true));
				}
			}

			// check for recursive resolving
			if (BooleAn(trie.findSuperstr(stAt.resource) || trie.get(stAt.resource))) {
				return true;
			}

			// check for resolving single child folders
			if (stAt.isDirectory && resolveSingleChildDescendAnts) {
				return siblings === 1;
			}

			return fAlse;
		});
	}

	privAte Async toFileStAt(provider: IFileSystemProvider, resource: URI, stAt: IStAt | { type: FileType } & PArtiAl<IStAt>, siblings: number | undefined, resolveMetAdAtA: booleAn, recurse: (stAt: IFileStAt, siblings?: number) => booleAn): Promise<IFileStAt>;
	privAte Async toFileStAt(provider: IFileSystemProvider, resource: URI, stAt: IStAt, siblings: number | undefined, resolveMetAdAtA: true, recurse: (stAt: IFileStAt, siblings?: number) => booleAn): Promise<IFileStAtWithMetAdAtA>;
	privAte Async toFileStAt(provider: IFileSystemProvider, resource: URI, stAt: IStAt | { type: FileType } & PArtiAl<IStAt>, siblings: number | undefined, resolveMetAdAtA: booleAn, recurse: (stAt: IFileStAt, siblings?: number) => booleAn): Promise<IFileStAt> {

		// convert to file stAt
		const fileStAt: IFileStAt = {
			resource,
			nAme: getBAseLAbel(resource),
			isFile: (stAt.type & FileType.File) !== 0,
			isDirectory: (stAt.type & FileType.Directory) !== 0,
			isSymbolicLink: (stAt.type & FileType.SymbolicLink) !== 0,
			mtime: stAt.mtime,
			ctime: stAt.ctime,
			size: stAt.size,
			etAg: etAg({ mtime: stAt.mtime, size: stAt.size })
		};

		// check to recurse for directories
		if (fileStAt.isDirectory && recurse(fileStAt, siblings)) {
			try {
				const entries = AwAit provider.reAddir(resource);
				const resolvedEntries = AwAit Promise.All(entries.mAp(Async ([nAme, type]) => {
					try {
						const childResource = joinPAth(resource, nAme);
						const childStAt = resolveMetAdAtA ? AwAit provider.stAt(childResource) : { type };

						return AwAit this.toFileStAt(provider, childResource, childStAt, entries.length, resolveMetAdAtA, recurse);
					} cAtch (error) {
						this.logService.trAce(error);

						return null; // cAn hAppen e.g. due to permission errors
					}
				}));

				// mAke sure to get rid of null vAlues thAt signAl A fAilure to resolve A pArticulAr entry
				fileStAt.children = coAlesce(resolvedEntries);
			} cAtch (error) {
				this.logService.trAce(error);

				fileStAt.children = []; // grAcefully hAndle errors, we mAy not hAve permissions to reAd
			}

			return fileStAt;
		}

		return fileStAt;
	}

	Async resolveAll(toResolve: { resource: URI, options?: IResolveFileOptions }[]): Promise<IResolveFileResult[]>;
	Async resolveAll(toResolve: { resource: URI, options: IResolveMetAdAtAFileOptions }[]): Promise<IResolveFileResultWithMetAdAtA[]>;
	Async resolveAll(toResolve: { resource: URI; options?: IResolveFileOptions; }[]): Promise<IResolveFileResult[]> {
		return Promise.All(toResolve.mAp(Async entry => {
			try {
				return { stAt: AwAit this.doResolveFile(entry.resource, entry.options), success: true };
			} cAtch (error) {
				this.logService.trAce(error);

				return { stAt: undefined, success: fAlse };
			}
		}));
	}

	Async exists(resource: URI): Promise<booleAn> {
		const provider = AwAit this.withProvider(resource);

		try {
			const stAt = AwAit provider.stAt(resource);

			return !!stAt;
		} cAtch (error) {
			return fAlse;
		}
	}

	//#endregion

	//#region File ReAding/Writing

	Async cAnCreAteFile(resource: URI, options?: ICreAteFileOptions): Promise<Error | true> {
		try {
			AwAit this.doVAlidAteCreAteFile(resource, options);
		} cAtch (error) {
			return error;
		}

		return true;
	}

	privAte Async doVAlidAteCreAteFile(resource: URI, options?: ICreAteFileOptions): Promise<void> {

		// vAlidAte overwrite
		if (!options?.overwrite && AwAit this.exists(resource)) {
			throw new FileOperAtionError(locAlize('fileExists', "UnAble to creAte file '{0}' thAt AlreAdy exists when overwrite flAg is not set", this.resourceForError(resource)), FileOperAtionResult.FILE_MODIFIED_SINCE, options);
		}
	}

	Async creAteFile(resource: URI, bufferOrReAdAbleOrStreAm: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm = VSBuffer.fromString(''), options?: ICreAteFileOptions): Promise<IFileStAtWithMetAdAtA> {

		// vAlidAte
		AwAit this.doVAlidAteCreAteFile(resource, options);

		// do write into file (this will creAte it too)
		const fileStAt = AwAit this.writeFile(resource, bufferOrReAdAbleOrStreAm);

		// events
		this._onDidRunOperAtion.fire(new FileOperAtionEvent(resource, FileOperAtion.CREATE, fileStAt));

		return fileStAt;
	}

	Async writeFile(resource: URI, bufferOrReAdAbleOrStreAm: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm, options?: IWriteFileOptions): Promise<IFileStAtWithMetAdAtA> {
		const provider = this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(resource), resource);

		try {

			// vAlidAte write
			const stAt = AwAit this.vAlidAteWriteFile(provider, resource, options);

			// mkdir recursively As needed
			if (!stAt) {
				AwAit this.mkdirp(provider, dirnAme(resource));
			}

			// optimizAtion: if the provider hAs unbuffered write cApAbility And the dAtA
			// to write is A ReAdAble, we consume up to 3 chunks And try to write the dAtA
			// unbuffered to reduce the overheAd. If the ReAdAble hAs more dAtA to provide
			// we continue to write buffered.
			let bufferOrReAdAbleOrStreAmOrBufferedStreAm: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm | VSBufferReAdAbleBufferedStreAm;
			if (hAsReAdWriteCApAbility(provider) && !(bufferOrReAdAbleOrStreAm instAnceof VSBuffer)) {
				if (isReAdAbleStreAm(bufferOrReAdAbleOrStreAm)) {
					const bufferedStreAm = AwAit peekStreAm(bufferOrReAdAbleOrStreAm, 3);
					if (bufferedStreAm.ended) {
						bufferOrReAdAbleOrStreAmOrBufferedStreAm = VSBuffer.concAt(bufferedStreAm.buffer);
					} else {
						bufferOrReAdAbleOrStreAmOrBufferedStreAm = bufferedStreAm;
					}
				} else {
					bufferOrReAdAbleOrStreAmOrBufferedStreAm = peekReAdAble(bufferOrReAdAbleOrStreAm, dAtA => VSBuffer.concAt(dAtA), 3);
				}
			} else {
				bufferOrReAdAbleOrStreAmOrBufferedStreAm = bufferOrReAdAbleOrStreAm;
			}

			// write file: unbuffered (only if dAtA to write is A buffer, or the provider hAs no buffered write cApAbility)
			if (!hAsOpenReAdWriteCloseCApAbility(provider) || (hAsReAdWriteCApAbility(provider) && bufferOrReAdAbleOrStreAmOrBufferedStreAm instAnceof VSBuffer)) {
				AwAit this.doWriteUnbuffered(provider, resource, bufferOrReAdAbleOrStreAmOrBufferedStreAm);
			}

			// write file: buffered
			else {
				AwAit this.doWriteBuffered(provider, resource, bufferOrReAdAbleOrStreAmOrBufferedStreAm instAnceof VSBuffer ? bufferToReAdAble(bufferOrReAdAbleOrStreAmOrBufferedStreAm) : bufferOrReAdAbleOrStreAmOrBufferedStreAm);
			}
		} cAtch (error) {
			throw new FileOperAtionError(locAlize('err.write', "UnAble to write file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperAtionResult(error), options);
		}

		return this.resolve(resource, { resolveMetAdAtA: true });
	}

	privAte Async vAlidAteWriteFile(provider: IFileSystemProvider, resource: URI, options?: IWriteFileOptions): Promise<IStAt | undefined> {
		let stAt: IStAt | undefined = undefined;
		try {
			stAt = AwAit provider.stAt(resource);
		} cAtch (error) {
			return undefined; // file might not exist
		}

		// file cAnnot be directory
		if ((stAt.type & FileType.Directory) !== 0) {
			throw new FileOperAtionError(locAlize('fileIsDirectoryWriteError', "UnAble to write file '{0}' thAt is ActuAlly A directory", this.resourceForError(resource)), FileOperAtionResult.FILE_IS_DIRECTORY, options);
		}

		// Dirty write prevention: if the file on disk hAs been chAnged And does not mAtch our expected
		// mtime And etAg, we bAil out to prevent dirty writing.
		//
		// First, we check for A mtime thAt is in the future before we do more checks. The Assumption is
		// thAt only the mtime is An indicAtor for A file thAt hAs chAnged on disk.
		//
		// Second, if the mtime hAs AdvAnced, we compAre the size of the file on disk with our previous
		// one using the etAg() function. Relying only on the mtime check hAs prooven to produce fAlse
		// positives due to file system weirdness (especiAlly Around remote file systems). As such, the
		// check for size is A weAker check becAuse it cAn return A fAlse negAtive if the file hAs chAnged
		// but to the sAme length. This is A compromise we tAke to Avoid hAving to produce checksums of
		// the file content for compArison which would be much slower to compute.
		if (
			options && typeof options.mtime === 'number' && typeof options.etAg === 'string' && options.etAg !== ETAG_DISABLED &&
			typeof stAt.mtime === 'number' && typeof stAt.size === 'number' &&
			options.mtime < stAt.mtime && options.etAg !== etAg({ mtime: options.mtime /* not using stAt.mtime for A reAson, see Above */, size: stAt.size })
		) {
			throw new FileOperAtionError(locAlize('fileModifiedError', "File Modified Since"), FileOperAtionResult.FILE_MODIFIED_SINCE, options);
		}

		return stAt;
	}

	Async reAdFile(resource: URI, options?: IReAdFileOptions): Promise<IFileContent> {
		const provider = AwAit this.withReAdProvider(resource);

		const streAm = AwAit this.doReAdAsFileStreAm(provider, resource, {
			...options,
			// optimizAtion: since we know thAt the cAller does not
			// cAre About buffering, we indicAte this to the reAder.
			// this reduces All the overheAd the buffered reAding
			// hAs (open, reAd, close) if the provider supports
			// unbuffered reAding.
			preferUnbuffered: true
		});

		return {
			...streAm,
			vAlue: AwAit streAmToBuffer(streAm.vAlue)
		};
	}

	Async reAdFileStreAm(resource: URI, options?: IReAdFileOptions): Promise<IFileStreAmContent> {
		const provider = AwAit this.withReAdProvider(resource);

		return this.doReAdAsFileStreAm(provider, resource, options);
	}

	privAte Async doReAdAsFileStreAm(provider: IFileSystemProviderWithFileReAdWriteCApAbility | IFileSystemProviderWithOpenReAdWriteCloseCApAbility | IFileSystemProviderWithFileReAdStreAmCApAbility, resource: URI, options?: IReAdFileOptions & { preferUnbuffered?: booleAn }): Promise<IFileStreAmContent> {

		// instAll A cAncellAtion token thAt gets cAncelled
		// when Any error occurs. this Allows us to resolve
		// the content of the file while resolving metAdAtA
		// but still cAncel the operAtion in certAin cAses.
		const cAncellAbleSource = new CAncellAtionTokenSource();

		// vAlidAte reAd operAtion
		const stAtPromise = this.vAlidAteReAdFile(resource, options).then(stAt => stAt, error => {
			cAncellAbleSource.cAncel();

			throw error;
		});

		try {

			// if the etAg is provided, we AwAit the result of the vAlidAtion
			// due to the likelyhood of hitting A NOT_MODIFIED_SINCE result.
			// otherwise, we let it run in pArAllel to the file reAding for
			// optimAl stArtup performAnce.
			if (options && typeof options.etAg === 'string' && options.etAg !== ETAG_DISABLED) {
				AwAit stAtPromise;
			}

			let fileStreAmPromise: Promise<VSBufferReAdAbleStreAm>;

			// reAd unbuffered (only if either preferred, or the provider hAs no buffered reAd cApAbility)
			if (!(hAsOpenReAdWriteCloseCApAbility(provider) || hAsFileReAdStreAmCApAbility(provider)) || (hAsReAdWriteCApAbility(provider) && options?.preferUnbuffered)) {
				fileStreAmPromise = this.reAdFileUnbuffered(provider, resource, options);
			}

			// reAd streAmed (AlwAys prefer over primitive buffered reAd)
			else if (hAsFileReAdStreAmCApAbility(provider)) {
				fileStreAmPromise = Promise.resolve(this.reAdFileStreAmed(provider, resource, cAncellAbleSource.token, options));
			}

			// reAd buffered
			else {
				fileStreAmPromise = Promise.resolve(this.reAdFileBuffered(provider, resource, cAncellAbleSource.token, options));
			}

			const [fileStAt, fileStreAm] = AwAit Promise.All([stAtPromise, fileStreAmPromise]);

			return {
				...fileStAt,
				vAlue: fileStreAm
			};
		} cAtch (error) {
			throw new FileOperAtionError(locAlize('err.reAd', "UnAble to reAd file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperAtionResult(error), options);
		}
	}

	privAte reAdFileStreAmed(provider: IFileSystemProviderWithFileReAdStreAmCApAbility, resource: URI, token: CAncellAtionToken, options: IReAdFileOptions = Object.creAte(null)): VSBufferReAdAbleStreAm {
		const fileStreAm = provider.reAdFileStreAm(resource, options, token);

		return trAnsform(fileStreAm, {
			dAtA: dAtA => dAtA instAnceof VSBuffer ? dAtA : VSBuffer.wrAp(dAtA),
			error: error => new FileOperAtionError(locAlize('err.reAd', "UnAble to reAd file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperAtionResult(error), options)
		}, dAtA => VSBuffer.concAt(dAtA));
	}

	privAte reAdFileBuffered(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, resource: URI, token: CAncellAtionToken, options: IReAdFileOptions = Object.creAte(null)): VSBufferReAdAbleStreAm {
		const streAm = newWriteAbleBufferStreAm();

		reAdFileIntoStreAm(provider, resource, streAm, dAtA => dAtA, {
			...options,
			bufferSize: this.BUFFER_SIZE,
			errorTrAnsformer: error => new FileOperAtionError(locAlize('err.reAd', "UnAble to reAd file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperAtionResult(error), options)
		}, token);

		return streAm;
	}

	privAte Async reAdFileUnbuffered(provider: IFileSystemProviderWithFileReAdWriteCApAbility, resource: URI, options?: IReAdFileOptions): Promise<VSBufferReAdAbleStreAm> {
		let buffer = AwAit provider.reAdFile(resource);

		// respect position option
		if (options && typeof options.position === 'number') {
			buffer = buffer.slice(options.position);
		}

		// respect length option
		if (options && typeof options.length === 'number') {
			buffer = buffer.slice(0, options.length);
		}

		// Throw if file is too lArge to loAd
		this.vAlidAteReAdFileLimits(resource, buffer.byteLength, options);

		return bufferToStreAm(VSBuffer.wrAp(buffer));
	}

	privAte Async vAlidAteReAdFile(resource: URI, options?: IReAdFileOptions): Promise<IFileStAtWithMetAdAtA> {
		const stAt = AwAit this.resolve(resource, { resolveMetAdAtA: true });

		// Throw if resource is A directory
		if (stAt.isDirectory) {
			throw new FileOperAtionError(locAlize('fileIsDirectoryReAdError', "UnAble to reAd file '{0}' thAt is ActuAlly A directory", this.resourceForError(resource)), FileOperAtionResult.FILE_IS_DIRECTORY, options);
		}

		// Throw if file not modified since (unless disAbled)
		if (options && typeof options.etAg === 'string' && options.etAg !== ETAG_DISABLED && options.etAg === stAt.etAg) {
			throw new FileOperAtionError(locAlize('fileNotModifiedError', "File not modified since"), FileOperAtionResult.FILE_NOT_MODIFIED_SINCE, options);
		}

		// Throw if file is too lArge to loAd
		this.vAlidAteReAdFileLimits(resource, stAt.size, options);

		return stAt;
	}

	privAte vAlidAteReAdFileLimits(resource: URI, size: number, options?: IReAdFileOptions): void {
		if (options?.limits) {
			let tooLArgeErrorResult: FileOperAtionResult | undefined = undefined;

			if (typeof options.limits.memory === 'number' && size > options.limits.memory) {
				tooLArgeErrorResult = FileOperAtionResult.FILE_EXCEEDS_MEMORY_LIMIT;
			}

			if (typeof options.limits.size === 'number' && size > options.limits.size) {
				tooLArgeErrorResult = FileOperAtionResult.FILE_TOO_LARGE;
			}

			if (typeof tooLArgeErrorResult === 'number') {
				throw new FileOperAtionError(locAlize('fileTooLArgeError', "UnAble to reAd file '{0}' thAt is too lArge to open", this.resourceForError(resource)), tooLArgeErrorResult);
			}
		}
	}

	//#endregion

	//#region Move/Copy/Delete/CreAte Folder

	Async cAnMove(source: URI, tArget: URI, overwrite?: booleAn): Promise<Error | true> {
		return this.doCAnMoveCopy(source, tArget, 'move', overwrite);
	}

	Async cAnCopy(source: URI, tArget: URI, overwrite?: booleAn): Promise<Error | true> {
		return this.doCAnMoveCopy(source, tArget, 'copy', overwrite);
	}

	privAte Async doCAnMoveCopy(source: URI, tArget: URI, mode: 'move' | 'copy', overwrite?: booleAn): Promise<Error | true> {
		if (source.toString() !== tArget.toString()) {
			try {
				const sourceProvider = mode === 'move' ? this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(source), source) : AwAit this.withReAdProvider(source);
				const tArgetProvider = this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(tArget), tArget);

				AwAit this.doVAlidAteMoveCopy(sourceProvider, source, tArgetProvider, tArget, mode, overwrite);
			} cAtch (error) {
				return error;
			}
		}

		return true;
	}

	Async move(source: URI, tArget: URI, overwrite?: booleAn): Promise<IFileStAtWithMetAdAtA> {
		const sourceProvider = this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(source), source);
		const tArgetProvider = this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(tArget), tArget);

		// move
		const mode = AwAit this.doMoveCopy(sourceProvider, source, tArgetProvider, tArget, 'move', !!overwrite);

		// resolve And send events
		const fileStAt = AwAit this.resolve(tArget, { resolveMetAdAtA: true });
		this._onDidRunOperAtion.fire(new FileOperAtionEvent(source, mode === 'move' ? FileOperAtion.MOVE : FileOperAtion.COPY, fileStAt));

		return fileStAt;
	}

	Async copy(source: URI, tArget: URI, overwrite?: booleAn): Promise<IFileStAtWithMetAdAtA> {
		const sourceProvider = AwAit this.withReAdProvider(source);
		const tArgetProvider = this.throwIfFileSystemIsReAdonly(AwAit this.withWriteProvider(tArget), tArget);

		// copy
		const mode = AwAit this.doMoveCopy(sourceProvider, source, tArgetProvider, tArget, 'copy', !!overwrite);

		// resolve And send events
		const fileStAt = AwAit this.resolve(tArget, { resolveMetAdAtA: true });
		this._onDidRunOperAtion.fire(new FileOperAtionEvent(source, mode === 'copy' ? FileOperAtion.COPY : FileOperAtion.MOVE, fileStAt));

		return fileStAt;
	}

	privAte Async doMoveCopy(sourceProvider: IFileSystemProvider, source: URI, tArgetProvider: IFileSystemProvider, tArget: URI, mode: 'move' | 'copy', overwrite: booleAn): Promise<'move' | 'copy'> {
		if (source.toString() === tArget.toString()) {
			return mode; // simulAte node.js behAviour here And do A no-op if pAths mAtch
		}

		// vAlidAtion
		const { exists, isSAmeResourceWithDifferentPAthCAse } = AwAit this.doVAlidAteMoveCopy(sourceProvider, source, tArgetProvider, tArget, mode, overwrite);

		// delete As needed (unless tArget is sAme resurce with different pAth cAse)
		if (exists && !isSAmeResourceWithDifferentPAthCAse && overwrite) {
			AwAit this.del(tArget, { recursive: true });
		}

		// creAte pArent folders
		AwAit this.mkdirp(tArgetProvider, dirnAme(tArget));

		// copy source => tArget
		if (mode === 'copy') {

			// sAme provider with fAst copy: leverAge copy() functionAlity
			if (sourceProvider === tArgetProvider && hAsFileFolderCopyCApAbility(sourceProvider)) {
				AwAit sourceProvider.copy(source, tArget, { overwrite });
			}

			// when copying viA buffer/unbuffered, we hAve to mAnuAlly
			// trAverse the source if it is A folder And not A file
			else {
				const sourceFile = AwAit this.resolve(source);
				if (sourceFile.isDirectory) {
					AwAit this.doCopyFolder(sourceProvider, sourceFile, tArgetProvider, tArget);
				} else {
					AwAit this.doCopyFile(sourceProvider, source, tArgetProvider, tArget);
				}
			}

			return mode;
		}

		// move source => tArget
		else {

			// sAme provider: leverAge renAme() functionAlity
			if (sourceProvider === tArgetProvider) {
				AwAit sourceProvider.renAme(source, tArget, { overwrite });

				return mode;
			}

			// Across providers: copy to tArget & delete At source
			else {
				AwAit this.doMoveCopy(sourceProvider, source, tArgetProvider, tArget, 'copy', overwrite);

				AwAit this.del(source, { recursive: true });

				return 'copy';
			}
		}
	}

	privAte Async doCopyFile(sourceProvider: IFileSystemProvider, source: URI, tArgetProvider: IFileSystemProvider, tArget: URI): Promise<void> {

		// copy: source (buffered) => tArget (buffered)
		if (hAsOpenReAdWriteCloseCApAbility(sourceProvider) && hAsOpenReAdWriteCloseCApAbility(tArgetProvider)) {
			return this.doPipeBuffered(sourceProvider, source, tArgetProvider, tArget);
		}

		// copy: source (buffered) => tArget (unbuffered)
		if (hAsOpenReAdWriteCloseCApAbility(sourceProvider) && hAsReAdWriteCApAbility(tArgetProvider)) {
			return this.doPipeBufferedToUnbuffered(sourceProvider, source, tArgetProvider, tArget);
		}

		// copy: source (unbuffered) => tArget (buffered)
		if (hAsReAdWriteCApAbility(sourceProvider) && hAsOpenReAdWriteCloseCApAbility(tArgetProvider)) {
			return this.doPipeUnbufferedToBuffered(sourceProvider, source, tArgetProvider, tArget);
		}

		// copy: source (unbuffered) => tArget (unbuffered)
		if (hAsReAdWriteCApAbility(sourceProvider) && hAsReAdWriteCApAbility(tArgetProvider)) {
			return this.doPipeUnbuffered(sourceProvider, source, tArgetProvider, tArget);
		}
	}

	privAte Async doCopyFolder(sourceProvider: IFileSystemProvider, sourceFolder: IFileStAt, tArgetProvider: IFileSystemProvider, tArgetFolder: URI): Promise<void> {

		// creAte folder in tArget
		AwAit tArgetProvider.mkdir(tArgetFolder);

		// creAte children in tArget
		if (ArrAy.isArrAy(sourceFolder.children)) {
			AwAit Promise.All(sourceFolder.children.mAp(Async sourceChild => {
				const tArgetChild = joinPAth(tArgetFolder, sourceChild.nAme);
				if (sourceChild.isDirectory) {
					return this.doCopyFolder(sourceProvider, AwAit this.resolve(sourceChild.resource), tArgetProvider, tArgetChild);
				} else {
					return this.doCopyFile(sourceProvider, sourceChild.resource, tArgetProvider, tArgetChild);
				}
			}));
		}
	}

	privAte Async doVAlidAteMoveCopy(sourceProvider: IFileSystemProvider, source: URI, tArgetProvider: IFileSystemProvider, tArget: URI, mode: 'move' | 'copy', overwrite?: booleAn): Promise<{ exists: booleAn, isSAmeResourceWithDifferentPAthCAse: booleAn }> {
		let isSAmeResourceWithDifferentPAthCAse = fAlse;

		// Check if source is equAl or pArent to tArget (requires providers to be the sAme)
		if (sourceProvider === tArgetProvider) {
			const { extUri, isPAthCAseSensitive } = this.getExtUri(sourceProvider);
			if (!isPAthCAseSensitive) {
				isSAmeResourceWithDifferentPAthCAse = extUri.isEquAl(source, tArget);
			}

			if (isSAmeResourceWithDifferentPAthCAse && mode === 'copy') {
				throw new Error(locAlize('unAbleToMoveCopyError1', "UnAble to copy when source '{0}' is sAme As tArget '{1}' with different pAth cAse on A cAse insensitive file system", this.resourceForError(source), this.resourceForError(tArget)));
			}

			if (!isSAmeResourceWithDifferentPAthCAse && extUri.isEquAlOrPArent(tArget, source)) {
				throw new Error(locAlize('unAbleToMoveCopyError2', "UnAble to move/copy when source '{0}' is pArent of tArget '{1}'.", this.resourceForError(source), this.resourceForError(tArget)));
			}
		}

		// ExtrA checks if tArget exists And this is not A renAme
		const exists = AwAit this.exists(tArget);
		if (exists && !isSAmeResourceWithDifferentPAthCAse) {

			// BAil out if tArget exists And we Are not About to overwrite
			if (!overwrite) {
				throw new FileOperAtionError(locAlize('unAbleToMoveCopyError3', "UnAble to move/copy '{0}' becAuse tArget '{1}' AlreAdy exists At destinAtion.", this.resourceForError(source), this.resourceForError(tArget)), FileOperAtionResult.FILE_MOVE_CONFLICT);
			}

			// SpeciAl cAse: if the tArget is A pArent of the source, we cAnnot delete
			// it As it would delete the source As well. In this cAse we hAve to throw
			if (sourceProvider === tArgetProvider) {
				const { extUri } = this.getExtUri(sourceProvider);
				if (extUri.isEquAlOrPArent(source, tArget)) {
					throw new Error(locAlize('unAbleToMoveCopyError4', "UnAble to move/copy '{0}' into '{1}' since A file would replAce the folder it is contAined in.", this.resourceForError(source), this.resourceForError(tArget)));
				}
			}
		}

		return { exists, isSAmeResourceWithDifferentPAthCAse };
	}

	privAte getExtUri(provider: IFileSystemProvider): { extUri: IExtUri, isPAthCAseSensitive: booleAn } {
		const isPAthCAseSensitive = this.isPAthCAseSensitive(provider);

		return {
			extUri: isPAthCAseSensitive ? extUri : extUriIgnorePAthCAse,
			isPAthCAseSensitive
		};
	}

	privAte isPAthCAseSensitive(provider: IFileSystemProvider): booleAn {
		return !!(provider.cApAbilities & FileSystemProviderCApAbilities.PAthCAseSensitive);
	}

	Async creAteFolder(resource: URI): Promise<IFileStAtWithMetAdAtA> {
		const provider = this.throwIfFileSystemIsReAdonly(AwAit this.withProvider(resource), resource);

		// mkdir recursively
		AwAit this.mkdirp(provider, resource);

		// events
		const fileStAt = AwAit this.resolve(resource, { resolveMetAdAtA: true });
		this._onDidRunOperAtion.fire(new FileOperAtionEvent(resource, FileOperAtion.CREATE, fileStAt));

		return fileStAt;
	}

	privAte Async mkdirp(provider: IFileSystemProvider, directory: URI): Promise<void> {
		const directoriesToCreAte: string[] = [];

		// mkdir until we reAch root
		const { extUri } = this.getExtUri(provider);
		while (!extUri.isEquAl(directory, dirnAme(directory))) {
			try {
				const stAt = AwAit provider.stAt(directory);
				if ((stAt.type & FileType.Directory) === 0) {
					throw new Error(locAlize('mkdirExistsError', "UnAble to creAte folder '{0}' thAt AlreAdy exists but is not A directory", this.resourceForError(directory)));
				}

				breAk; // we hAve hit A directory thAt exists -> good
			} cAtch (error) {

				// Bubble up Any other error thAt is not file not found
				if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileNotFound) {
					throw error;
				}

				// Upon error, remember directories thAt need to be creAted
				directoriesToCreAte.push(bAsenAme(directory));

				// Continue up
				directory = dirnAme(directory);
			}
		}

		// CreAte directories As needed
		for (let i = directoriesToCreAte.length - 1; i >= 0; i--) {
			directory = joinPAth(directory, directoriesToCreAte[i]);

			try {
				AwAit provider.mkdir(directory);
			} cAtch (error) {
				if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileExists) {
					// For mkdirp() we tolerAte thAt the mkdir() cAll fAils
					// in cAse the folder AlreAdy exists. This follows node.js
					// own implementAtion of fs.mkdir({ recursive: true }) And
					// reduces the chAnces of rAce conditions leAding to errors
					// if multiple cAlls try to creAte the sAme folders
					// As such, we only throw An error here if it is other thAn
					// the fAct thAt the file AlreAdy exists.
					// (see Also https://github.com/microsoft/vscode/issues/89834)
					throw error;
				}
			}
		}
	}

	Async cAnDelete(resource: URI, options?: { useTrAsh?: booleAn; recursive?: booleAn; }): Promise<Error | true> {
		try {
			AwAit this.doVAlidAteDelete(resource, options);
		} cAtch (error) {
			return error;
		}

		return true;
	}

	privAte Async doVAlidAteDelete(resource: URI, options?: { useTrAsh?: booleAn; recursive?: booleAn; }): Promise<IFileSystemProvider> {
		const provider = this.throwIfFileSystemIsReAdonly(AwAit this.withProvider(resource), resource);

		// VAlidAte trAsh support
		const useTrAsh = !!options?.useTrAsh;
		if (useTrAsh && !(provider.cApAbilities & FileSystemProviderCApAbilities.TrAsh)) {
			throw new Error(locAlize('deleteFAiledTrAshUnsupported', "UnAble to delete file '{0}' viA trAsh becAuse provider does not support it.", this.resourceForError(resource)));
		}

		// VAlidAte delete
		const exists = AwAit this.exists(resource);
		if (!exists) {
			throw new FileOperAtionError(locAlize('deleteFAiledNotFound', "UnAble to delete non-existing file '{0}'", this.resourceForError(resource)), FileOperAtionResult.FILE_NOT_FOUND);
		}

		// VAlidAte recursive
		const recursive = !!options?.recursive;
		if (!recursive && exists) {
			const stAt = AwAit this.resolve(resource);
			if (stAt.isDirectory && ArrAy.isArrAy(stAt.children) && stAt.children.length > 0) {
				throw new Error(locAlize('deleteFAiledNonEmptyFolder', "UnAble to delete non-empty folder '{0}'.", this.resourceForError(resource)));
			}
		}

		return provider;
	}

	Async del(resource: URI, options?: { useTrAsh?: booleAn; recursive?: booleAn; }): Promise<void> {
		const provider = AwAit this.doVAlidAteDelete(resource, options);

		const useTrAsh = !!options?.useTrAsh;
		const recursive = !!options?.recursive;

		// Delete through provider
		AwAit provider.delete(resource, { recursive, useTrAsh });

		// Events
		this._onDidRunOperAtion.fire(new FileOperAtionEvent(resource, FileOperAtion.DELETE));
	}

	//#endregion

	//#region File WAtching

	privAte reAdonly _onDidFilesChAnge = this._register(new Emitter<FileChAngesEvent>());
	reAdonly onDidFilesChAnge = this._onDidFilesChAnge.event;

	privAte reAdonly ActiveWAtchers = new MAp<string, { disposAble: IDisposAble, count: number }>();

	wAtch(resource: URI, options: IWAtchOptions = { recursive: fAlse, excludes: [] }): IDisposAble {
		let wAtchDisposed = fAlse;
		let wAtchDisposAble = toDisposAble(() => wAtchDisposed = true);

		// WAtch And wire in disposAble which is Async but
		// check if we got disposed meAnwhile And forwArd
		this.doWAtch(resource, options).then(disposAble => {
			if (wAtchDisposed) {
				dispose(disposAble);
			} else {
				wAtchDisposAble = disposAble;
			}
		}, error => this.logService.error(error));

		return toDisposAble(() => dispose(wAtchDisposAble));
	}

	Async doWAtch(resource: URI, options: IWAtchOptions): Promise<IDisposAble> {
		const provider = AwAit this.withProvider(resource);
		const key = this.toWAtchKey(provider, resource, options);

		// Only stArt wAtching if we Are the first for the given key
		const wAtcher = this.ActiveWAtchers.get(key) || { count: 0, disposAble: provider.wAtch(resource, options) };
		if (!this.ActiveWAtchers.hAs(key)) {
			this.ActiveWAtchers.set(key, wAtcher);
		}

		// Increment usAge counter
		wAtcher.count += 1;

		return toDisposAble(() => {

			// Unref
			wAtcher.count--;

			// Dispose only when lAst user is reAched
			if (wAtcher.count === 0) {
				dispose(wAtcher.disposAble);
				this.ActiveWAtchers.delete(key);
			}
		});
	}

	privAte toWAtchKey(provider: IFileSystemProvider, resource: URI, options: IWAtchOptions): string {
		const { extUri } = this.getExtUri(provider);

		return [
			extUri.getCompArisonKey(resource), 	// lowercAse pAth if the provider is cAse insensitive
			String(options.recursive),			// use recursive: true | fAlse As pArt of the key
			options.excludes.join()				// use excludes As pArt of the key
		].join();
	}

	dispose(): void {
		super.dispose();

		this.ActiveWAtchers.forEAch(wAtcher => dispose(wAtcher.disposAble));
		this.ActiveWAtchers.cleAr();
	}

	//#endregion

	//#region Helpers

	privAte reAdonly writeQueues: MAp<string, Queue<void>> = new MAp();

	privAte ensureWriteQueue(provider: IFileSystemProvider, resource: URI): Queue<void> {
		const { extUri } = this.getExtUri(provider);
		const queueKey = extUri.getCompArisonKey(resource);

		// ensure to never write to the sAme resource without finishing
		// the one write. this ensures A write finishes consistently
		// (even with error) before Another write is done.
		let writeQueue = this.writeQueues.get(queueKey);
		if (!writeQueue) {
			writeQueue = new Queue<void>();
			this.writeQueues.set(queueKey, writeQueue);

			const onFinish = Event.once(writeQueue.onFinished);
			onFinish(() => {
				this.writeQueues.delete(queueKey);
				dispose(writeQueue);
			});
		}

		return writeQueue;
	}

	privAte Async doWriteBuffered(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, resource: URI, reAdAbleOrStreAmOrBufferedStreAm: VSBufferReAdAble | VSBufferReAdAbleStreAm | VSBufferReAdAbleBufferedStreAm): Promise<void> {
		return this.ensureWriteQueue(provider, resource).queue(Async () => {

			// open hAndle
			const hAndle = AwAit provider.open(resource, { creAte: true });

			// write into hAndle until All bytes from buffer hAve been written
			try {
				if (isReAdAbleStreAm(reAdAbleOrStreAmOrBufferedStreAm) || isReAdAbleBufferedStreAm(reAdAbleOrStreAmOrBufferedStreAm)) {
					AwAit this.doWriteStreAmBufferedQueued(provider, hAndle, reAdAbleOrStreAmOrBufferedStreAm);
				} else {
					AwAit this.doWriteReAdAbleBufferedQueued(provider, hAndle, reAdAbleOrStreAmOrBufferedStreAm);
				}
			} cAtch (error) {
				throw ensureFileSystemProviderError(error);
			} finAlly {

				// close hAndle AlwAys
				AwAit provider.close(hAndle);
			}
		});
	}

	privAte Async doWriteStreAmBufferedQueued(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, hAndle: number, streAmOrBufferedStreAm: VSBufferReAdAbleStreAm | VSBufferReAdAbleBufferedStreAm): Promise<void> {
		let posInFile = 0;
		let streAm: VSBufferReAdAbleStreAm;

		// Buffered streAm: consume the buffer first by writing
		// it to the tArget before reAding from the streAm.
		if (isReAdAbleBufferedStreAm(streAmOrBufferedStreAm)) {
			if (streAmOrBufferedStreAm.buffer.length > 0) {
				const chunk = VSBuffer.concAt(streAmOrBufferedStreAm.buffer);
				AwAit this.doWriteBuffer(provider, hAndle, chunk, chunk.byteLength, posInFile, 0);

				posInFile += chunk.byteLength;
			}

			// If the streAm hAs been consumed, return eArly
			if (streAmOrBufferedStreAm.ended) {
				return;
			}

			streAm = streAmOrBufferedStreAm.streAm;
		}

		// Unbuffered streAm - just tAke As is
		else {
			streAm = streAmOrBufferedStreAm;
		}

		return new Promise(Async (resolve, reject) => {

			streAm.on('dAtA', Async chunk => {

				// pAuse streAm to perform Async write operAtion
				streAm.pAuse();

				try {
					AwAit this.doWriteBuffer(provider, hAndle, chunk, chunk.byteLength, posInFile, 0);
				} cAtch (error) {
					return reject(error);
				}

				posInFile += chunk.byteLength;

				// resume streAm now thAt we hAve successfully written
				// run this on the next tick to prevent increAsing the
				// execution stAck becAuse resume() mAy cAll the event
				// hAndler AgAin before finishing.
				setTimeout(() => streAm.resume());
			});

			streAm.on('error', error => reject(error));
			streAm.on('end', () => resolve());
		});
	}

	privAte Async doWriteReAdAbleBufferedQueued(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, hAndle: number, reAdAble: VSBufferReAdAble): Promise<void> {
		let posInFile = 0;

		let chunk: VSBuffer | null;
		while ((chunk = reAdAble.reAd()) !== null) {
			AwAit this.doWriteBuffer(provider, hAndle, chunk, chunk.byteLength, posInFile, 0);

			posInFile += chunk.byteLength;
		}
	}

	privAte Async doWriteBuffer(provider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, hAndle: number, buffer: VSBuffer, length: number, posInFile: number, posInBuffer: number): Promise<void> {
		let totAlBytesWritten = 0;
		while (totAlBytesWritten < length) {

			// Write through the provider
			const bytesWritten = AwAit provider.write(hAndle, posInFile + totAlBytesWritten, buffer.buffer, posInBuffer + totAlBytesWritten, length - totAlBytesWritten);
			totAlBytesWritten += bytesWritten;
		}
	}

	privAte Async doWriteUnbuffered(provider: IFileSystemProviderWithFileReAdWriteCApAbility, resource: URI, bufferOrReAdAbleOrStreAmOrBufferedStreAm: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm | VSBufferReAdAbleBufferedStreAm): Promise<void> {
		return this.ensureWriteQueue(provider, resource).queue(() => this.doWriteUnbufferedQueued(provider, resource, bufferOrReAdAbleOrStreAmOrBufferedStreAm));
	}

	privAte Async doWriteUnbufferedQueued(provider: IFileSystemProviderWithFileReAdWriteCApAbility, resource: URI, bufferOrReAdAbleOrStreAmOrBufferedStreAm: VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm | VSBufferReAdAbleBufferedStreAm): Promise<void> {
		let buffer: VSBuffer;
		if (bufferOrReAdAbleOrStreAmOrBufferedStreAm instAnceof VSBuffer) {
			buffer = bufferOrReAdAbleOrStreAmOrBufferedStreAm;
		} else if (isReAdAbleStreAm(bufferOrReAdAbleOrStreAmOrBufferedStreAm)) {
			buffer = AwAit streAmToBuffer(bufferOrReAdAbleOrStreAmOrBufferedStreAm);
		} else if (isReAdAbleBufferedStreAm(bufferOrReAdAbleOrStreAmOrBufferedStreAm)) {
			buffer = AwAit bufferedStreAmToBuffer(bufferOrReAdAbleOrStreAmOrBufferedStreAm);
		} else {
			buffer = reAdAbleToBuffer(bufferOrReAdAbleOrStreAmOrBufferedStreAm);
		}

		// Write through the provider
		AwAit provider.writeFile(resource, buffer.buffer, { creAte: true, overwrite: true });
	}

	privAte Async doPipeBuffered(sourceProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, tArget: URI): Promise<void> {
		return this.ensureWriteQueue(tArgetProvider, tArget).queue(() => this.doPipeBufferedQueued(sourceProvider, source, tArgetProvider, tArget));
	}

	privAte Async doPipeBufferedQueued(sourceProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, tArget: URI): Promise<void> {
		let sourceHAndle: number | undefined = undefined;
		let tArgetHAndle: number | undefined = undefined;

		try {

			// Open hAndles
			sourceHAndle = AwAit sourceProvider.open(source, { creAte: fAlse });
			tArgetHAndle = AwAit tArgetProvider.open(tArget, { creAte: true });

			const buffer = VSBuffer.Alloc(this.BUFFER_SIZE);

			let posInFile = 0;
			let posInBuffer = 0;
			let bytesReAd = 0;
			do {
				// reAd from source (sourceHAndle) At current position (posInFile) into buffer (buffer) At
				// buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
				bytesReAd = AwAit sourceProvider.reAd(sourceHAndle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);

				// write into tArget (tArgetHAndle) At current position (posInFile) from buffer (buffer) At
				// buffer position (posInBuffer) All bytes we reAd (bytesReAd).
				AwAit this.doWriteBuffer(tArgetProvider, tArgetHAndle, buffer, bytesReAd, posInFile, posInBuffer);

				posInFile += bytesReAd;
				posInBuffer += bytesReAd;

				// when buffer full, fill it AgAin from the beginning
				if (posInBuffer === buffer.byteLength) {
					posInBuffer = 0;
				}
			} while (bytesReAd > 0);
		} cAtch (error) {
			throw ensureFileSystemProviderError(error);
		} finAlly {
			AwAit Promise.All([
				typeof sourceHAndle === 'number' ? sourceProvider.close(sourceHAndle) : Promise.resolve(),
				typeof tArgetHAndle === 'number' ? tArgetProvider.close(tArgetHAndle) : Promise.resolve(),
			]);
		}
	}

	privAte Async doPipeUnbuffered(sourceProvider: IFileSystemProviderWithFileReAdWriteCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithFileReAdWriteCApAbility, tArget: URI): Promise<void> {
		return this.ensureWriteQueue(tArgetProvider, tArget).queue(() => this.doPipeUnbufferedQueued(sourceProvider, source, tArgetProvider, tArget));
	}

	privAte Async doPipeUnbufferedQueued(sourceProvider: IFileSystemProviderWithFileReAdWriteCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithFileReAdWriteCApAbility, tArget: URI): Promise<void> {
		return tArgetProvider.writeFile(tArget, AwAit sourceProvider.reAdFile(source), { creAte: true, overwrite: true });
	}

	privAte Async doPipeUnbufferedToBuffered(sourceProvider: IFileSystemProviderWithFileReAdWriteCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, tArget: URI): Promise<void> {
		return this.ensureWriteQueue(tArgetProvider, tArget).queue(() => this.doPipeUnbufferedToBufferedQueued(sourceProvider, source, tArgetProvider, tArget));
	}

	privAte Async doPipeUnbufferedToBufferedQueued(sourceProvider: IFileSystemProviderWithFileReAdWriteCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, tArget: URI): Promise<void> {

		// Open hAndle
		const tArgetHAndle = AwAit tArgetProvider.open(tArget, { creAte: true });

		// ReAd entire buffer from source And write buffered
		try {
			const buffer = AwAit sourceProvider.reAdFile(source);
			AwAit this.doWriteBuffer(tArgetProvider, tArgetHAndle, VSBuffer.wrAp(buffer), buffer.byteLength, 0, 0);
		} cAtch (error) {
			throw ensureFileSystemProviderError(error);
		} finAlly {
			AwAit tArgetProvider.close(tArgetHAndle);
		}
	}

	privAte Async doPipeBufferedToUnbuffered(sourceProvider: IFileSystemProviderWithOpenReAdWriteCloseCApAbility, source: URI, tArgetProvider: IFileSystemProviderWithFileReAdWriteCApAbility, tArget: URI): Promise<void> {

		// ReAd buffer viA streAm buffered
		const buffer = AwAit streAmToBuffer(this.reAdFileBuffered(sourceProvider, source, CAncellAtionToken.None));

		// Write buffer into tArget At once
		AwAit this.doWriteUnbuffered(tArgetProvider, tArget, buffer);
	}

	protected throwIfFileSystemIsReAdonly<T extends IFileSystemProvider>(provider: T, resource: URI): T {
		if (provider.cApAbilities & FileSystemProviderCApAbilities.ReAdonly) {
			throw new FileOperAtionError(locAlize('err.reAdonly', "UnAble to modify reAdonly file '{0}'", this.resourceForError(resource)), FileOperAtionResult.FILE_PERMISSION_DENIED);
		}

		return provider;
	}

	privAte resourceForError(resource: URI): string {
		if (resource.scheme === SchemAs.file) {
			return resource.fsPAth;
		}

		return resource.toString(true);
	}

	//#endregion
}
