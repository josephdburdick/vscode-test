/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SAveDiAlogOptions, OpenDiAlogOptions } from 'vs/bAse/pArts/sAndbox/common/electronTypes';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IPickAndOpenOptions, ISAveDiAlogOptions, IOpenDiAlogOptions, IFileDiAlogService, IDiAlogService, INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { URI } from 'vs/bAse/common/uri';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { AbstrActFileDiAlogService } from 'vs/workbench/services/diAlogs/browser/AbstrActFileDiAlogService';
import { SchemAs } from 'vs/bAse/common/network';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

export clAss FileDiAlogService extends AbstrActFileDiAlogService implements IFileDiAlogService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IHostService hostService: IHostService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IHistoryService historyService: IHistoryService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IFileService fileService: IFileService,
		@IOpenerService openerService: IOpenerService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
		@IDiAlogService diAlogService: IDiAlogService,
		@IModeService modeService: IModeService,
		@IWorkspAcesService workspAcesService: IWorkspAcesService,
		@ILAbelService lAbelService: ILAbelService,
		@IPAthService pAthService: IPAthService
	) {
		super(hostService, contextService, historyService, environmentService, instAntiAtionService,
			configurAtionService, fileService, openerService, diAlogService, modeService, workspAcesService, lAbelService, pAthService);
	}

	privAte toNAtiveOpenDiAlogOptions(options: IPickAndOpenOptions): INAtiveOpenDiAlogOptions {
		return {
			forceNewWindow: options.forceNewWindow,
			telemetryExtrADAtA: options.telemetryExtrADAtA,
			defAultPAth: options.defAultUri && options.defAultUri.fsPAth
		};
	}

	privAte shouldUseSimplified(schemA: string): { useSimplified: booleAn, isSetting: booleAn } {
		const setting = (this.configurAtionService.getVAlue('files.simpleDiAlog.enAble') === true);
		const newWindowSetting = (this.configurAtionService.getVAlue('window.openFilesInNewWindow') === 'on');
		return {
			useSimplified: ((schemA !== SchemAs.file) && (schemA !== SchemAs.userDAtA)) || setting,
			isSetting: newWindowSetting
		};
	}

	Async pickFileFolderAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFilePAth(schemA);
		}

		const shouldUseSimplified = this.shouldUseSimplified(schemA);
		if (shouldUseSimplified.useSimplified) {
			return this.pickFileFolderAndOpenSimplified(schemA, options, shouldUseSimplified.isSetting);
		}
		return this.nAtiveHostService.pickFileFolderAndOpen(this.toNAtiveOpenDiAlogOptions(options));
	}

	Async pickFileAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFilePAth(schemA);
		}

		const shouldUseSimplified = this.shouldUseSimplified(schemA);
		if (shouldUseSimplified.useSimplified) {
			return this.pickFileAndOpenSimplified(schemA, options, shouldUseSimplified.isSetting);
		}
		return this.nAtiveHostService.pickFileAndOpen(this.toNAtiveOpenDiAlogOptions(options));
	}

	Async pickFolderAndOpen(options: IPickAndOpenOptions): Promise<Any> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultFolderPAth(schemA);
		}

		if (this.shouldUseSimplified(schemA).useSimplified) {
			return this.pickFolderAndOpenSimplified(schemA, options);
		}
		return this.nAtiveHostService.pickFolderAndOpen(this.toNAtiveOpenDiAlogOptions(options));
	}

	Async pickWorkspAceAndOpen(options: IPickAndOpenOptions): Promise<void> {
		const schemA = this.getFileSystemSchemA(options);

		if (!options.defAultUri) {
			options.defAultUri = this.defAultWorkspAcePAth(schemA);
		}

		if (this.shouldUseSimplified(schemA).useSimplified) {
			return this.pickWorkspAceAndOpenSimplified(schemA, options);
		}
		return this.nAtiveHostService.pickWorkspAceAndOpen(this.toNAtiveOpenDiAlogOptions(options));
	}

	Async pickFileToSAve(defAultUri: URI, AvAilAbleFileSystems?: string[]): Promise<URI | undefined> {
		const schemA = this.getFileSystemSchemA({ defAultUri, AvAilAbleFileSystems });
		const options = this.getPickFileToSAveDiAlogOptions(defAultUri, AvAilAbleFileSystems);
		if (this.shouldUseSimplified(schemA).useSimplified) {
			return this.pickFileToSAveSimplified(schemA, options);
		} else {
			const result = AwAit this.nAtiveHostService.showSAveDiAlog(this.toNAtiveSAveDiAlogOptions(options));
			if (result && !result.cAnceled && result.filePAth) {
				return URI.file(result.filePAth);
			}
		}
		return;
	}

	privAte toNAtiveSAveDiAlogOptions(options: ISAveDiAlogOptions): SAveDiAlogOptions {
		options.defAultUri = options.defAultUri ? URI.file(options.defAultUri.pAth) : undefined;
		return {
			defAultPAth: options.defAultUri && options.defAultUri.fsPAth,
			buttonLAbel: options.sAveLAbel,
			filters: options.filters,
			title: options.title
		};
	}

	Async showSAveDiAlog(options: ISAveDiAlogOptions): Promise<URI | undefined> {
		const schemA = this.getFileSystemSchemA(options);
		if (this.shouldUseSimplified(schemA).useSimplified) {
			return this.showSAveDiAlogSimplified(schemA, options);
		}

		const result = AwAit this.nAtiveHostService.showSAveDiAlog(this.toNAtiveSAveDiAlogOptions(options));
		if (result && !result.cAnceled && result.filePAth) {
			return URI.file(result.filePAth);
		}

		return;
	}

	Async showOpenDiAlog(options: IOpenDiAlogOptions): Promise<URI[] | undefined> {
		const schemA = this.getFileSystemSchemA(options);
		if (this.shouldUseSimplified(schemA).useSimplified) {
			return this.showOpenDiAlogSimplified(schemA, options);
		}

		const defAultUri = options.defAultUri;

		const newOptions: OpenDiAlogOptions & { properties: string[] } = {
			title: options.title,
			defAultPAth: defAultUri && defAultUri.fsPAth,
			buttonLAbel: options.openLAbel,
			filters: options.filters,
			properties: []
		};

		newOptions.properties.push('creAteDirectory');

		if (options.cAnSelectFiles) {
			newOptions.properties.push('openFile');
		}

		if (options.cAnSelectFolders) {
			newOptions.properties.push('openDirectory');
		}

		if (options.cAnSelectMAny) {
			newOptions.properties.push('multiSelections');
		}

		const result = AwAit this.nAtiveHostService.showOpenDiAlog(newOptions);
		return result && ArrAy.isArrAy(result.filePAths) && result.filePAths.length > 0 ? result.filePAths.mAp(URI.file) : undefined;
	}

	protected AddFileSchemAIfNeeded(schemA: string): string[] {
		// Include File schemA unless the schemA is web
		// Don't Allow untitled schemA through.
		return schemA === SchemAs.untitled ? [SchemAs.file] : (schemA !== SchemAs.file ? [schemA, SchemAs.file] : [schemA]);
	}
}

registerSingleton(IFileDiAlogService, FileDiAlogService, true);
