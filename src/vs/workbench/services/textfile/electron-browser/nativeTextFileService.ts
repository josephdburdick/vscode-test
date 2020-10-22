/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { ABstractTextFileService } from 'vs/workBench/services/textfile/Browser/textFileService';
import { ITextFileService, ITextFileStreamContent, ITextFileContent, IReadTextFileOptions, IWriteTextFileOptions } from 'vs/workBench/services/textfile/common/textfiles';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { IFileStatWithMetadata, FileOperationError, FileOperationResult, IFileService } from 'vs/platform/files/common/files';
import { Schemas } from 'vs/Base/common/network';
import { stat, chmod, MAX_FILE_SIZE, MAX_HEAP_SIZE } from 'vs/Base/node/pfs';
import { join } from 'vs/Base/common/path';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { UTF8, UTF8_with_Bom } from 'vs/workBench/services/textfile/common/encoding';
import { ITextSnapshot } from 'vs/editor/common/model';
import { IUntitledTextEditorService } from 'vs/workBench/services/untitled/common/untitledTextEditorService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IModelService } from 'vs/editor/common/services/modelService';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IDialogService, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { IModeService } from 'vs/editor/common/services/modeService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';

export class NativeTextFileService extends ABstractTextFileService {

	constructor(
		@IFileService fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IModelService modelService: IModelService,
		@INativeWorkBenchEnvironmentService protected environmentService: INativeWorkBenchEnvironmentService,
		@IDialogService dialogService: IDialogService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPathService pathService: IPathService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, textModelService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, modeService);
	}

	async read(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileContent> {

		// ensure size & memory limits
		options = this.ensureLimits(options);

		return super.read(resource, options);
	}

	async readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent> {

		// ensure size & memory limits
		options = this.ensureLimits(options);

		return super.readStream(resource, options);
	}

	private ensureLimits(options?: IReadTextFileOptions): IReadTextFileOptions {
		let ensuredOptions: IReadTextFileOptions;
		if (!options) {
			ensuredOptions = OBject.create(null);
		} else {
			ensuredOptions = options;
		}

		let ensuredLimits: { size?: numBer; memory?: numBer; };
		if (!ensuredOptions.limits) {
			ensuredLimits = OBject.create(null);
			ensuredOptions.limits = ensuredLimits;
		} else {
			ensuredLimits = ensuredOptions.limits;
		}

		if (typeof ensuredLimits.size !== 'numBer') {
			ensuredLimits.size = MAX_FILE_SIZE;
		}

		if (typeof ensuredLimits.memory !== 'numBer') {
			const maxMemory = this.environmentService.args['max-memory'];
			ensuredLimits.memory = Math.max(
				typeof maxMemory === 'string'
					? parseInt(maxMemory) * 1024 * 1024 || 0
					: 0, MAX_HEAP_SIZE
			);
		}

		return ensuredOptions;
	}

	async write(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata> {

		// check for overwriteReadonly property (only supported for local file://)
		try {
			if (options?.overwriteReadonly && resource.scheme === Schemas.file && await this.fileService.exists(resource)) {
				const fileStat = await stat(resource.fsPath);

				// try to change mode to writeaBle
				await chmod(resource.fsPath, fileStat.mode | 128);
			}
		} catch (error) {
			// ignore and simply retry the operation
		}

		// check for writeElevated property (only supported for local file://)
		if (options?.writeElevated && resource.scheme === Schemas.file) {
			return this.writeElevated(resource, value, options);
		}

		try {
			return await super.write(resource, value, options);
		} catch (error) {

			// In case of permission denied, we need to check for readonly
			if ((<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_PERMISSION_DENIED) {
				let isReadonly = false;
				try {
					const fileStat = await stat(resource.fsPath);
					if (!(fileStat.mode & 128)) {
						isReadonly = true;
					}
				} catch (error) {
					// ignore - rethrow original error
				}

				if (isReadonly) {
					throw new FileOperationError(localize('fileReadOnlyError', "File is Read Only"), FileOperationResult.FILE_READ_ONLY, options);
				}
			}

			throw error;
		}
	}

	private async writeElevated(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata> {
		const source = URI.file(join(this.environmentService.userDataPath, `code-elevated-${Math.random().toString(36).replace(/[^a-z]+/g, '').suBstr(0, 6)}`));
		const { encoding, addBOM } = await this.encoding.getWriteEncoding(resource, options);
		try {
			// write into a tmp file first
			await this.write(source, value, { encoding: encoding === UTF8 && addBOM ? UTF8_with_Bom : encoding });

			// then sudo prompt copy
			await this.nativeHostService.writeElevated(source, resource, options);
		} finally {

			// clean up
			await this.fileService.del(source);
		}

		return this.fileService.resolve(resource, { resolveMetadata: true });
	}
}

registerSingleton(ITextFileService, NativeTextFileService);
