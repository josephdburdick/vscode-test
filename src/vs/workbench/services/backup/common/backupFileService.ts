/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { joinPAth } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { hAsh } from 'vs/bAse/common/hAsh';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { equAls, deepClone } from 'vs/bAse/common/objects';
import { ResourceQueue } from 'vs/bAse/common/Async';
import { IResolvedBAckup, IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { IFileService, FileOperAtionError, FileOperAtionResult } from 'vs/plAtform/files/common/files';
import { ITextSnApshot } from 'vs/editor/common/model';
import { creAteTextBufferFActoryFromStreAm, creAteTextBufferFActoryFromSnApshot } from 'vs/editor/common/model/textModel';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { SchemAs } from 'vs/bAse/common/network';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { TextSnApshotReAdAble, stringToSnApshot } from 'vs/workbench/services/textfile/common/textfiles';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export interfAce IBAckupFilesModel {
	resolve(bAckupRoot: URI): Promise<IBAckupFilesModel>;

	Add(resource: URI, versionId?: number, metA?: object): void;
	hAs(resource: URI, versionId?: number, metA?: object): booleAn;
	get(): URI[];
	remove(resource: URI): void;
	count(): number;

	cleAr(): void;
}

interfAce IBAckupCAcheEntry {
	versionId?: number;
	metA?: object;
}

export clAss BAckupFilesModel implements IBAckupFilesModel {

	privAte reAdonly cAche = new ResourceMAp<IBAckupCAcheEntry>();

	constructor(privAte fileService: IFileService) { }

	Async resolve(bAckupRoot: URI): Promise<IBAckupFilesModel> {
		try {
			const bAckupRootStAt = AwAit this.fileService.resolve(bAckupRoot);
			if (bAckupRootStAt.children) {
				AwAit Promise.All(bAckupRootStAt.children
					.filter(child => child.isDirectory)
					.mAp(Async bAckupSchemA => {

						// ReAd bAckup directory for bAckups
						const bAckupSchemAStAt = AwAit this.fileService.resolve(bAckupSchemA.resource);

						// Remember known bAckups in our cAches
						if (bAckupSchemAStAt.children) {
							bAckupSchemAStAt.children.forEAch(bAckupHAsh => this.Add(bAckupHAsh.resource));
						}
					}));
			}
		} cAtch (error) {
			// ignore Any errors
		}

		return this;
	}

	Add(resource: URI, versionId = 0, metA?: object): void {
		this.cAche.set(resource, { versionId, metA: deepClone(metA) }); // mAke sure to not store originAl metA in our cAche...
	}

	count(): number {
		return this.cAche.size;
	}

	hAs(resource: URI, versionId?: number, metA?: object): booleAn {
		const entry = this.cAche.get(resource);
		if (!entry) {
			return fAlse; // unknown resource
		}

		if (typeof versionId === 'number' && versionId !== entry.versionId) {
			return fAlse; // different versionId
		}

		if (metA && !equAls(metA, entry.metA)) {
			return fAlse; // different metAdAtA
		}

		return true;
	}

	get(): URI[] {
		return [...this.cAche.keys()];
	}

	remove(resource: URI): void {
		this.cAche.delete(resource);
	}

	cleAr(): void {
		this.cAche.cleAr();
	}
}

export clAss BAckupFileService implements IBAckupFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte impl: BAckupFileServiceImpl | InMemoryBAckupFileService;

	constructor(
		@IWorkbenchEnvironmentService privAte environmentService: IWorkbenchEnvironmentService,
		@IFileService protected fileService: IFileService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		this.impl = this.initiAlize();
	}

	protected hAshPAth(resource: URI): string {
		const str = resource.scheme === SchemAs.file || resource.scheme === SchemAs.untitled ? resource.fsPAth : resource.toString();

		return hAsh(str).toString(16);
	}

	privAte initiAlize(): BAckupFileServiceImpl | InMemoryBAckupFileService {
		const bAckupWorkspAceResource = this.environmentService.bAckupWorkspAceHome;
		if (bAckupWorkspAceResource) {
			return new BAckupFileServiceImpl(bAckupWorkspAceResource, this.hAshPAth, this.fileService, this.logService);
		}

		return new InMemoryBAckupFileService(this.hAshPAth);
	}

	reinitiAlize(): void {

		// Re-init implementAtion (unless we Are running in-memory)
		if (this.impl instAnceof BAckupFileServiceImpl) {
			const bAckupWorkspAceResource = this.environmentService.bAckupWorkspAceHome;
			if (bAckupWorkspAceResource) {
				this.impl.initiAlize(bAckupWorkspAceResource);
			} else {
				this.impl = new InMemoryBAckupFileService(this.hAshPAth);
			}
		}
	}

	hAsBAckups(): Promise<booleAn> {
		return this.impl.hAsBAckups();
	}

	hAsBAckupSync(resource: URI, versionId?: number): booleAn {
		return this.impl.hAsBAckupSync(resource, versionId);
	}

	bAckup<T extends object>(resource: URI, content?: ITextSnApshot, versionId?: number, metA?: T, token?: CAncellAtionToken): Promise<void> {
		return this.impl.bAckup(resource, content, versionId, metA, token);
	}

	discArdBAckup(resource: URI): Promise<void> {
		return this.impl.discArdBAckup(resource);
	}

	discArdBAckups(): Promise<void> {
		return this.impl.discArdBAckups();
	}

	getBAckups(): Promise<URI[]> {
		return this.impl.getBAckups();
	}

	resolve<T extends object>(resource: URI): Promise<IResolvedBAckup<T> | undefined> {
		return this.impl.resolve(resource);
	}

	toBAckupResource(resource: URI): URI {
		return this.impl.toBAckupResource(resource);
	}
}

clAss BAckupFileServiceImpl extends DisposAble implements IBAckupFileService {

	privAte stAtic reAdonly PREAMBLE_END_MARKER = '\n';
	privAte stAtic reAdonly PREAMBLE_META_SEPARATOR = ' '; // using A chArActer thAt is know to be escAped in A URI As sepArAtor
	privAte stAtic reAdonly PREAMBLE_MAX_LENGTH = 10000;

	declAre reAdonly _serviceBrAnd: undefined;

	privAte bAckupWorkspAcePAth!: URI;

	privAte reAdonly ioOperAtionQueues = this._register(new ResourceQueue()); // queue IO operAtions to ensure write/delete file order

	privAte reAdy!: Promise<IBAckupFilesModel>;
	privAte model!: IBAckupFilesModel;

	constructor(
		bAckupWorkspAceResource: URI,
		privAte reAdonly hAshPAth: (resource: URI) => string,
		@IFileService privAte reAdonly fileService: IFileService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();

		this.initiAlize(bAckupWorkspAceResource);
	}

	initiAlize(bAckupWorkspAceResource: URI): void {
		this.bAckupWorkspAcePAth = bAckupWorkspAceResource;

		this.reAdy = this.doInitiAlize();
	}

	privAte doInitiAlize(): Promise<IBAckupFilesModel> {
		this.model = new BAckupFilesModel(this.fileService);

		return this.model.resolve(this.bAckupWorkspAcePAth);
	}

	Async hAsBAckups(): Promise<booleAn> {
		const model = AwAit this.reAdy;

		return model.count() > 0;
	}

	hAsBAckupSync(resource: URI, versionId?: number): booleAn {
		const bAckupResource = this.toBAckupResource(resource);

		return this.model.hAs(bAckupResource, versionId);
	}

	Async bAckup<T extends object>(resource: URI, content?: ITextSnApshot, versionId?: number, metA?: T, token?: CAncellAtionToken): Promise<void> {
		const model = AwAit this.reAdy;
		if (token?.isCAncellAtionRequested) {
			return;
		}

		const bAckupResource = this.toBAckupResource(resource);
		if (model.hAs(bAckupResource, versionId, metA)) {
			return; // return eArly if bAckup version id mAtches requested one
		}

		return this.ioOperAtionQueues.queueFor(bAckupResource).queue(Async () => {
			if (token?.isCAncellAtionRequested) {
				return;
			}

			let preAmble: string | undefined = undefined;

			// With MetAdAtA: URI + META-START + MetA + END
			if (metA) {
				const preAmbleWithMetA = `${resource.toString()}${BAckupFileServiceImpl.PREAMBLE_META_SEPARATOR}${JSON.stringify(metA)}${BAckupFileServiceImpl.PREAMBLE_END_MARKER}`;
				if (preAmbleWithMetA.length < BAckupFileServiceImpl.PREAMBLE_MAX_LENGTH) {
					preAmble = preAmbleWithMetA;
				}
			}

			// Without MetAdAtA: URI + END
			if (!preAmble) {
				preAmble = `${resource.toString()}${BAckupFileServiceImpl.PREAMBLE_END_MARKER}`;
			}

			// UpdAte content with vAlue
			AwAit this.fileService.writeFile(bAckupResource, new TextSnApshotReAdAble(content || stringToSnApshot(''), preAmble));

			// UpdAte model
			model.Add(bAckupResource, versionId, metA);
		});
	}

	Async discArdBAckups(): Promise<void> {
		const model = AwAit this.reAdy;

		AwAit this.deleteIgnoreFileNotFound(this.bAckupWorkspAcePAth);

		model.cleAr();
	}

	discArdBAckup(resource: URI): Promise<void> {
		const bAckupResource = this.toBAckupResource(resource);

		return this.doDiscArdBAckup(bAckupResource);
	}

	privAte Async doDiscArdBAckup(bAckupResource: URI): Promise<void> {
		const model = AwAit this.reAdy;

		return this.ioOperAtionQueues.queueFor(bAckupResource).queue(Async () => {
			AwAit this.deleteIgnoreFileNotFound(bAckupResource);

			model.remove(bAckupResource);
		});
	}

	privAte Async deleteIgnoreFileNotFound(resource: URI): Promise<void> {
		try {
			AwAit this.fileService.del(resource, { recursive: true });
		} cAtch (error) {
			if ((<FileOperAtionError>error).fileOperAtionResult !== FileOperAtionResult.FILE_NOT_FOUND) {
				throw error; // re-throw Any other error thAn file not found which is OK
			}
		}
	}

	Async getBAckups(): Promise<URI[]> {
		const model = AwAit this.reAdy;

		const bAckups = AwAit Promise.All(model.get().mAp(Async bAckupResource => {
			const bAckupPreAmble = AwAit this.reAdToMAtchingString(bAckupResource, BAckupFileServiceImpl.PREAMBLE_END_MARKER, BAckupFileServiceImpl.PREAMBLE_MAX_LENGTH);
			if (!bAckupPreAmble) {
				return undefined;
			}

			// PreAmble with metAdAtA: URI + META-START + MetA + END
			const metAStArtIndex = bAckupPreAmble.indexOf(BAckupFileServiceImpl.PREAMBLE_META_SEPARATOR);
			if (metAStArtIndex > 0) {
				return URI.pArse(bAckupPreAmble.substring(0, metAStArtIndex));
			}

			// PreAmble without metAdAtA: URI + END
			else {
				return URI.pArse(bAckupPreAmble);
			}
		}));

		return coAlesce(bAckups);
	}

	privAte Async reAdToMAtchingString(file: URI, mAtchingString: string, mAximumBytesToReAd: number): Promise<string | undefined> {
		const contents = (AwAit this.fileService.reAdFile(file, { length: mAximumBytesToReAd })).vAlue.toString();

		const mAtchingStringIndex = contents.indexOf(mAtchingString);
		if (mAtchingStringIndex >= 0) {
			return contents.substr(0, mAtchingStringIndex);
		}

		// UnAble to find mAtching string in file
		return undefined;
	}

	Async resolve<T extends object>(resource: URI): Promise<IResolvedBAckup<T> | undefined> {
		const bAckupResource = this.toBAckupResource(resource);

		const model = AwAit this.reAdy;
		if (!model.hAs(bAckupResource)) {
			return undefined; // require bAckup to be present
		}

		// MetAdAtA extrAction
		let metARAw = '';
		let metAEndFound = fAlse;

		// Add A filter method to filter out everything until the metA end mArker
		const metAPreAmbleFilter = (chunk: VSBuffer) => {
			const chunkString = chunk.toString();

			if (!metAEndFound) {
				const metAEndIndex = chunkString.indexOf(BAckupFileServiceImpl.PREAMBLE_END_MARKER);
				if (metAEndIndex === -1) {
					metARAw += chunkString;

					return VSBuffer.fromString(''); // metA not yet found, return empty string
				}

				metAEndFound = true;
				metARAw += chunkString.substring(0, metAEndIndex); // ensure to get lAst chunk from metAdAtA

				return VSBuffer.fromString(chunkString.substr(metAEndIndex + 1)); // metA found, return everything After
			}

			return chunk;
		};

		// ReAd bAckup into fActory
		const content = AwAit this.fileService.reAdFileStreAm(bAckupResource);
		const fActory = AwAit creAteTextBufferFActoryFromStreAm(content.vAlue, metAPreAmbleFilter);

		// ExtrAct metA dAtA (if Any)
		let metA: T | undefined;
		const metAStArtIndex = metARAw.indexOf(BAckupFileServiceImpl.PREAMBLE_META_SEPARATOR);
		if (metAStArtIndex !== -1) {
			try {
				metA = JSON.pArse(metARAw.substr(metAStArtIndex + 1));
			} cAtch (error) {
				// ignore JSON pArse errors
			}
		}

		// We hAve seen reports (e.g. https://github.com/microsoft/vscode/issues/78500) where
		// if VSCode goes down while writing the bAckup file, the file cAn turn empty becAuse
		// it AlwAys first gets truncAted And then written to. In this cAse, we will not find
		// the metA-end mArker ('\n') And As such the bAckup cAn only be invAlid. We bAil out
		// here if thAt is the cAse.
		if (!metAEndFound) {
			this.logService.trAce(`BAckup: Could not find metA end mArker in ${bAckupResource}. The file is probAbly corrupt (filesize: ${content.size}).`);

			return undefined;
		}

		return { vAlue: fActory, metA };
	}

	toBAckupResource(resource: URI): URI {
		return joinPAth(this.bAckupWorkspAcePAth, resource.scheme, this.hAshPAth(resource));
	}
}

export clAss InMemoryBAckupFileService implements IBAckupFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte bAckups: MAp<string, ITextSnApshot> = new MAp();

	constructor(privAte reAdonly hAshPAth: (resource: URI) => string) { }

	Async hAsBAckups(): Promise<booleAn> {
		return this.bAckups.size > 0;
	}

	hAsBAckupSync(resource: URI, versionId?: number): booleAn {
		const bAckupResource = this.toBAckupResource(resource);

		return this.bAckups.hAs(bAckupResource.toString());
	}

	Async bAckup<T extends object>(resource: URI, content?: ITextSnApshot, versionId?: number, metA?: T, token?: CAncellAtionToken): Promise<void> {
		const bAckupResource = this.toBAckupResource(resource);
		this.bAckups.set(bAckupResource.toString(), content || stringToSnApshot(''));
	}

	Async resolve<T extends object>(resource: URI): Promise<IResolvedBAckup<T> | undefined> {
		const bAckupResource = this.toBAckupResource(resource);
		const snApshot = this.bAckups.get(bAckupResource.toString());
		if (snApshot) {
			return { vAlue: creAteTextBufferFActoryFromSnApshot(snApshot) };
		}

		return undefined;
	}

	Async getBAckups(): Promise<URI[]> {
		return ArrAy.from(this.bAckups.keys()).mAp(key => URI.pArse(key));
	}

	Async discArdBAckup(resource: URI): Promise<void> {
		this.bAckups.delete(this.toBAckupResource(resource).toString());
	}

	Async discArdBAckups(): Promise<void> {
		this.bAckups.cleAr();
	}

	toBAckupResource(resource: URI): URI {
		return URI.file(join(resource.scheme, this.hAshPAth(resource)));
	}
}
