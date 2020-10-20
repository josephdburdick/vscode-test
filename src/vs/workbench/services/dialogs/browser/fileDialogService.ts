/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPickAndOpenOptions, ISAveDiAlogOptions, IOpenDiAlogOptions, IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { AbstrActFileDiAlogService } from 'vs/workbench/services/diAlogs/browser/AbstrActFileDiAlogService';
import { SchemAs } from 'vs/bAse/common/network';

export clAss FileDiAlogService extends AbstrActFileDiAlogService implements IFileDiAlogService {

	Async pickFileFolderAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFilePAth(schemA);
		}

		return this.pickFileFolderAndOpenSimplified(schemA, options, fAlse);
	}

	Async pickFileAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFilePAth(schemA);
		}

		return this.pickFileAndOpenSimplified(schemA, options, fAlse);
	}

	Async pickFolderAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFolderPAth(schemA);
		}

		return this.pickFolderAndOpenSimplified(schemA, options);
	}

	Async pickWorkspAceAndOpen(options: IPickAndOpenOptions): Promise<void> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultWorkspAcePAth(schemA);
		}

		return this.pickWorkspAceAndOpenSimplified(schemA, options);
	}

	Async pickFileToSAve(defAultUri: URI, AvAilAbleFileSystems?: string[]): Promise<URI | undefined> {
		const schemA = this.getFileSystemSchemA({ defAultUri, AvAilAbleFileSystems });
		return this.pickFileToSAveSimplified(schemA, this.getPickFileToSAveDiAlogOptions(defAultUri, AvAilAbleFileSystems));
	}

	Async showSAveDiAlog(options: ISAveDiAlogOptions): Promise<URI | undefined> {
		const schemA = this.getFileSystemSchemA(options);
		return this.showSAveDiAlogSimplified(schemA, options);
	}

	Async showOpenDiAlog(options: IOpenDiAlogOptions): Promise<URI[] | undefined> {
		const schemA = this.getFileSystemSchemA(options);
		return this.showOpenDiAlogSimplified(schemA, options);
	}

	protected AddFileSchemAIfNeeded(schemA: string): string[] {
		return schemA === SchemAs.untitled ? [SchemAs.file] : [schemA];
	}
}

registerSingleton(IFileDiAlogService, FileDiAlogService, true);
