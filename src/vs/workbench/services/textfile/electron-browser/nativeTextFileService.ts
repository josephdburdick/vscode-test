/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { AbstrActTextFileService } from 'vs/workbench/services/textfile/browser/textFileService';
import { ITextFileService, ITextFileStreAmContent, ITextFileContent, IReAdTextFileOptions, IWriteTextFileOptions } from 'vs/workbench/services/textfile/common/textfiles';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { URI } from 'vs/bAse/common/uri';
import { IFileStAtWithMetAdAtA, FileOperAtionError, FileOperAtionResult, IFileService } from 'vs/plAtform/files/common/files';
import { SchemAs } from 'vs/bAse/common/network';
import { stAt, chmod, MAX_FILE_SIZE, MAX_HEAP_SIZE } from 'vs/bAse/node/pfs';
import { join } from 'vs/bAse/common/pAth';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { UTF8, UTF8_with_bom } from 'vs/workbench/services/textfile/common/encoding';
import { ITextSnApshot } from 'vs/editor/common/model';
import { IUntitledTextEditorService } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IDiAlogService, IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IModeService } from 'vs/editor/common/services/modeService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

export clAss NAtiveTextFileService extends AbstrActTextFileService {

	constructor(
		@IFileService fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IModelService modelService: IModelService,
		@INAtiveWorkbenchEnvironmentService protected environmentService: INAtiveWorkbenchEnvironmentService,
		@IDiAlogService diAlogService: IDiAlogService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPAthService pAthService: IPAthService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(fileService, untitledTextEditorService, lifecycleService, instAntiAtionService, modelService, environmentService, diAlogService, fileDiAlogService, textResourceConfigurAtionService, filesConfigurAtionService, textModelService, codeEditorService, pAthService, workingCopyFileService, uriIdentityService, modeService);
	}

	Async reAd(resource: URI, options?: IReAdTextFileOptions): Promise<ITextFileContent> {

		// ensure size & memory limits
		options = this.ensureLimits(options);

		return super.reAd(resource, options);
	}

	Async reAdStreAm(resource: URI, options?: IReAdTextFileOptions): Promise<ITextFileStreAmContent> {

		// ensure size & memory limits
		options = this.ensureLimits(options);

		return super.reAdStreAm(resource, options);
	}

	privAte ensureLimits(options?: IReAdTextFileOptions): IReAdTextFileOptions {
		let ensuredOptions: IReAdTextFileOptions;
		if (!options) {
			ensuredOptions = Object.creAte(null);
		} else {
			ensuredOptions = options;
		}

		let ensuredLimits: { size?: number; memory?: number; };
		if (!ensuredOptions.limits) {
			ensuredLimits = Object.creAte(null);
			ensuredOptions.limits = ensuredLimits;
		} else {
			ensuredLimits = ensuredOptions.limits;
		}

		if (typeof ensuredLimits.size !== 'number') {
			ensuredLimits.size = MAX_FILE_SIZE;
		}

		if (typeof ensuredLimits.memory !== 'number') {
			const mAxMemory = this.environmentService.Args['mAx-memory'];
			ensuredLimits.memory = MAth.mAx(
				typeof mAxMemory === 'string'
					? pArseInt(mAxMemory) * 1024 * 1024 || 0
					: 0, MAX_HEAP_SIZE
			);
		}

		return ensuredOptions;
	}

	Async write(resource: URI, vAlue: string | ITextSnApshot, options?: IWriteTextFileOptions): Promise<IFileStAtWithMetAdAtA> {

		// check for overwriteReAdonly property (only supported for locAl file://)
		try {
			if (options?.overwriteReAdonly && resource.scheme === SchemAs.file && AwAit this.fileService.exists(resource)) {
				const fileStAt = AwAit stAt(resource.fsPAth);

				// try to chAnge mode to writeAble
				AwAit chmod(resource.fsPAth, fileStAt.mode | 128);
			}
		} cAtch (error) {
			// ignore And simply retry the operAtion
		}

		// check for writeElevAted property (only supported for locAl file://)
		if (options?.writeElevAted && resource.scheme === SchemAs.file) {
			return this.writeElevAted(resource, vAlue, options);
		}

		try {
			return AwAit super.write(resource, vAlue, options);
		} cAtch (error) {

			// In cAse of permission denied, we need to check for reAdonly
			if ((<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_PERMISSION_DENIED) {
				let isReAdonly = fAlse;
				try {
					const fileStAt = AwAit stAt(resource.fsPAth);
					if (!(fileStAt.mode & 128)) {
						isReAdonly = true;
					}
				} cAtch (error) {
					// ignore - rethrow originAl error
				}

				if (isReAdonly) {
					throw new FileOperAtionError(locAlize('fileReAdOnlyError', "File is ReAd Only"), FileOperAtionResult.FILE_READ_ONLY, options);
				}
			}

			throw error;
		}
	}

	privAte Async writeElevAted(resource: URI, vAlue: string | ITextSnApshot, options?: IWriteTextFileOptions): Promise<IFileStAtWithMetAdAtA> {
		const source = URI.file(join(this.environmentService.userDAtAPAth, `code-elevAted-${MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 6)}`));
		const { encoding, AddBOM } = AwAit this.encoding.getWriteEncoding(resource, options);
		try {
			// write into A tmp file first
			AwAit this.write(source, vAlue, { encoding: encoding === UTF8 && AddBOM ? UTF8_with_bom : encoding });

			// then sudo prompt copy
			AwAit this.nAtiveHostService.writeElevAted(source, resource, options);
		} finAlly {

			// cleAn up
			AwAit this.fileService.del(source);
		}

		return this.fileService.resolve(resource, { resolveMetAdAtA: true });
	}
}

registerSingleton(ITextFileService, NAtiveTextFileService);
