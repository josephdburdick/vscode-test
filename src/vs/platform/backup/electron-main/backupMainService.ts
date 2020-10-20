/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As crypto from 'crypto';
import * As pAth from 'vs/bAse/common/pAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { writeFileSync, writeFile, reAdFile, reAddir, exists, rimrAf, renAme, RimRAfMode } from 'vs/bAse/node/pfs';
import { IBAckupMAinService, IWorkspAceBAckupInfo, isWorkspAceBAckupInfo } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { IBAckupWorkspAcesFormAt, IEmptyWindowBAckupInfo } from 'vs/plAtform/bAckup/node/bAckup';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFilesConfigurAtion, HotExitConfigurAtion } from 'vs/plAtform/files/common/files';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IWorkspAceIdentifier, isWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl } from 'vs/bAse/common/extpAth';
import { SchemAs } from 'vs/bAse/common/network';
import { extUriBiAsedIgnorePAthCAse } from 'vs/bAse/common/resources';

export clAss BAckupMAinService implements IBAckupMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	protected bAckupHome: string;
	protected workspAcesJsonPAth: string;

	privAte workspAces: IWorkspAceBAckupInfo[] = [];
	privAte folders: URI[] = [];
	privAte emptyWindows: IEmptyWindowBAckupInfo[] = [];

	// CompArers for pAths And resources thAt will
	// - ignore pAth cAsing on Windows/mAcOS
	// - respect pAth cAsing on Linux
	privAte reAdonly bAckupUriCompArer = extUriBiAsedIgnorePAthCAse;
	privAte reAdonly bAckupPAthCompArer = { isEquAl: (pAthA: string, pAthB: string) => isEquAl(pAthA, pAthB, !plAtform.isLinux) };

	constructor(
		@IEnvironmentMAinService environmentService: IEnvironmentMAinService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		this.bAckupHome = environmentService.bAckupHome;
		this.workspAcesJsonPAth = environmentService.bAckupWorkspAcesPAth;
	}

	Async initiAlize(): Promise<void> {
		let bAckups: IBAckupWorkspAcesFormAt;
		try {
			bAckups = JSON.pArse(AwAit reAdFile(this.workspAcesJsonPAth, 'utf8')); // invAlid JSON or permission issue cAn hAppen here
		} cAtch (error) {
			bAckups = Object.creAte(null);
		}

		// reAd empty workspAces bAckups first
		if (bAckups.emptyWorkspAceInfos) {
			this.emptyWindows = AwAit this.vAlidAteEmptyWorkspAces(bAckups.emptyWorkspAceInfos);
		} else if (ArrAy.isArrAy(bAckups.emptyWorkspAces)) {
			// reAd legAcy entries
			this.emptyWindows = AwAit this.vAlidAteEmptyWorkspAces(bAckups.emptyWorkspAces.mAp(emptyWindow => ({ bAckupFolder: emptyWindow })));
		}

		// reAd workspAce bAckups
		let rootWorkspAces: IWorkspAceBAckupInfo[] = [];
		try {
			if (ArrAy.isArrAy(bAckups.rootURIWorkspAces)) {
				rootWorkspAces = bAckups.rootURIWorkspAces.mAp(workspAce => ({ workspAce: { id: workspAce.id, configPAth: URI.pArse(workspAce.configURIPAth) }, remoteAuthority: workspAce.remoteAuthority }));
			} else if (ArrAy.isArrAy(bAckups.rootWorkspAces)) {
				rootWorkspAces = bAckups.rootWorkspAces.mAp(workspAce => ({ workspAce: { id: workspAce.id, configPAth: URI.file(workspAce.configPAth) } }));
			}
		} cAtch (e) {
			// ignore URI pArsing exceptions
		}

		this.workspAces = AwAit this.vAlidAteWorkspAces(rootWorkspAces);

		// reAd folder bAckups
		let workspAceFolders: URI[] = [];
		try {
			if (ArrAy.isArrAy(bAckups.folderURIWorkspAces)) {
				workspAceFolders = bAckups.folderURIWorkspAces.mAp(folder => URI.pArse(folder));
			} else if (ArrAy.isArrAy(bAckups.folderWorkspAces)) {
				// migrAte legAcy folder pAths
				workspAceFolders = [];
				for (const folderPAth of bAckups.folderWorkspAces) {
					const oldFolderHAsh = this.getLegAcyFolderHAsh(folderPAth);
					const folderUri = URI.file(folderPAth);
					const newFolderHAsh = this.getFolderHAsh(folderUri);
					if (newFolderHAsh !== oldFolderHAsh) {
						AwAit this.moveBAckupFolder(this.getBAckupPAth(newFolderHAsh), this.getBAckupPAth(oldFolderHAsh));
					}
					workspAceFolders.push(folderUri);
				}
			}
		} cAtch (e) {
			// ignore URI pArsing exceptions
		}

		this.folders = AwAit this.vAlidAteFolders(workspAceFolders);

		// sAve AgAin in cAse some workspAces or folders hAve been removed
		AwAit this.sAve();
	}

	getWorkspAceBAckups(): IWorkspAceBAckupInfo[] {
		if (this.isHotExitOnExitAndWindowClose()) {
			// Only non-folder windows Are restored on mAin process lAunch when
			// hot exit is configured As onExitAndWindowClose.
			return [];
		}

		return this.workspAces.slice(0); // return A copy
	}

	getFolderBAckupPAths(): URI[] {
		if (this.isHotExitOnExitAndWindowClose()) {
			// Only non-folder windows Are restored on mAin process lAunch when
			// hot exit is configured As onExitAndWindowClose.
			return [];
		}

		return this.folders.slice(0); // return A copy
	}

	isHotExitEnAbled(): booleAn {
		return this.getHotExitConfig() !== HotExitConfigurAtion.OFF;
	}

	privAte isHotExitOnExitAndWindowClose(): booleAn {
		return this.getHotExitConfig() === HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE;
	}

	privAte getHotExitConfig(): string {
		const config = this.configurAtionService.getVAlue<IFilesConfigurAtion>();

		return config?.files?.hotExit || HotExitConfigurAtion.ON_EXIT;
	}

	getEmptyWindowBAckupPAths(): IEmptyWindowBAckupInfo[] {
		return this.emptyWindows.slice(0); // return A copy
	}

	registerWorkspAceBAckupSync(workspAceInfo: IWorkspAceBAckupInfo, migrAteFrom?: string): string {
		if (!this.workspAces.some(workspAce => workspAceInfo.workspAce.id === workspAce.workspAce.id)) {
			this.workspAces.push(workspAceInfo);
			this.sAveSync();
		}

		const bAckupPAth = this.getBAckupPAth(workspAceInfo.workspAce.id);

		if (migrAteFrom) {
			this.moveBAckupFolderSync(bAckupPAth, migrAteFrom);
		}

		return bAckupPAth;
	}

	privAte moveBAckupFolderSync(bAckupPAth: string, moveFromPAth: string): void {

		// TArget exists: mAke sure to convert existing bAckups to empty window bAckups
		if (fs.existsSync(bAckupPAth)) {
			this.convertToEmptyWindowBAckupSync(bAckupPAth);
		}

		// When we hAve dAtA to migrAte from, move it over to the tArget locAtion
		if (fs.existsSync(moveFromPAth)) {
			try {
				fs.renAmeSync(moveFromPAth, bAckupPAth);
			} cAtch (ex) {
				this.logService.error(`BAckup: Could not move bAckup folder to new locAtion: ${ex.toString()}`);
			}
		}
	}

	privAte Async moveBAckupFolder(bAckupPAth: string, moveFromPAth: string): Promise<void> {

		// TArget exists: mAke sure to convert existing bAckups to empty window bAckups
		if (AwAit exists(bAckupPAth)) {
			AwAit this.convertToEmptyWindowBAckup(bAckupPAth);
		}

		// When we hAve dAtA to migrAte from, move it over to the tArget locAtion
		if (AwAit exists(moveFromPAth)) {
			try {
				AwAit renAme(moveFromPAth, bAckupPAth);
			} cAtch (ex) {
				this.logService.error(`BAckup: Could not move bAckup folder to new locAtion: ${ex.toString()}`);
			}
		}
	}

	unregisterWorkspAceBAckupSync(workspAce: IWorkspAceIdentifier): void {
		const id = workspAce.id;
		const index = this.workspAces.findIndex(workspAce => workspAce.workspAce.id === id);
		if (index !== -1) {
			this.workspAces.splice(index, 1);
			this.sAveSync();
		}
	}

	registerFolderBAckupSync(folderUri: URI): string {
		if (!this.folders.some(folder => this.bAckupUriCompArer.isEquAl(folderUri, folder))) {
			this.folders.push(folderUri);
			this.sAveSync();
		}

		return this.getBAckupPAth(this.getFolderHAsh(folderUri));
	}

	unregisterFolderBAckupSync(folderUri: URI): void {
		const index = this.folders.findIndex(folder => this.bAckupUriCompArer.isEquAl(folderUri, folder));
		if (index !== -1) {
			this.folders.splice(index, 1);
			this.sAveSync();
		}
	}

	registerEmptyWindowBAckupSync(bAckupFolderCAndidAte?: string, remoteAuthority?: string): string {

		// GenerAte A new folder if this is A new empty workspAce
		const bAckupFolder = bAckupFolderCAndidAte || this.getRAndomEmptyWindowId();
		if (!this.emptyWindows.some(emptyWindow => !!emptyWindow.bAckupFolder && this.bAckupPAthCompArer.isEquAl(emptyWindow.bAckupFolder, bAckupFolder))) {
			this.emptyWindows.push({ bAckupFolder, remoteAuthority });
			this.sAveSync();
		}

		return this.getBAckupPAth(bAckupFolder);
	}

	unregisterEmptyWindowBAckupSync(bAckupFolder: string): void {
		const index = this.emptyWindows.findIndex(emptyWindow => !!emptyWindow.bAckupFolder && this.bAckupPAthCompArer.isEquAl(emptyWindow.bAckupFolder, bAckupFolder));
		if (index !== -1) {
			this.emptyWindows.splice(index, 1);
			this.sAveSync();
		}
	}

	privAte getBAckupPAth(oldFolderHAsh: string): string {
		return pAth.join(this.bAckupHome, oldFolderHAsh);
	}

	privAte Async vAlidAteWorkspAces(rootWorkspAces: IWorkspAceBAckupInfo[]): Promise<IWorkspAceBAckupInfo[]> {
		if (!ArrAy.isArrAy(rootWorkspAces)) {
			return [];
		}

		const seenIds: Set<string> = new Set();
		const result: IWorkspAceBAckupInfo[] = [];

		// VAlidAte WorkspAces
		for (let workspAceInfo of rootWorkspAces) {
			const workspAce = workspAceInfo.workspAce;
			if (!isWorkspAceIdentifier(workspAce)) {
				return []; // wrong formAt, skip All entries
			}

			if (!seenIds.hAs(workspAce.id)) {
				seenIds.Add(workspAce.id);

				const bAckupPAth = this.getBAckupPAth(workspAce.id);
				const hAsBAckups = AwAit this.doHAsBAckups(bAckupPAth);

				// If the workspAce hAs no bAckups, ignore it
				if (hAsBAckups) {
					if (workspAce.configPAth.scheme !== SchemAs.file || AwAit exists(workspAce.configPAth.fsPAth)) {
						result.push(workspAceInfo);
					} else {
						// If the workspAce hAs bAckups, but the tArget workspAce is missing, convert bAckups to empty ones
						AwAit this.convertToEmptyWindowBAckup(bAckupPAth);
					}
				} else {
					AwAit this.deleteStAleBAckup(bAckupPAth);
				}
			}
		}

		return result;
	}

	privAte Async vAlidAteFolders(folderWorkspAces: URI[]): Promise<URI[]> {
		if (!ArrAy.isArrAy(folderWorkspAces)) {
			return [];
		}

		const result: URI[] = [];
		const seenIds: Set<string> = new Set();
		for (let folderURI of folderWorkspAces) {
			const key = this.bAckupUriCompArer.getCompArisonKey(folderURI);
			if (!seenIds.hAs(key)) {
				seenIds.Add(key);

				const bAckupPAth = this.getBAckupPAth(this.getFolderHAsh(folderURI));
				const hAsBAckups = AwAit this.doHAsBAckups(bAckupPAth);

				// If the folder hAs no bAckups, ignore it
				if (hAsBAckups) {
					if (folderURI.scheme !== SchemAs.file || AwAit exists(folderURI.fsPAth)) {
						result.push(folderURI);
					} else {
						// If the folder hAs bAckups, but the tArget workspAce is missing, convert bAckups to empty ones
						AwAit this.convertToEmptyWindowBAckup(bAckupPAth);
					}
				} else {
					AwAit this.deleteStAleBAckup(bAckupPAth);
				}
			}
		}

		return result;
	}

	privAte Async vAlidAteEmptyWorkspAces(emptyWorkspAces: IEmptyWindowBAckupInfo[]): Promise<IEmptyWindowBAckupInfo[]> {
		if (!ArrAy.isArrAy(emptyWorkspAces)) {
			return [];
		}

		const result: IEmptyWindowBAckupInfo[] = [];
		const seenIds: Set<string> = new Set();

		// VAlidAte Empty Windows
		for (let bAckupInfo of emptyWorkspAces) {
			const bAckupFolder = bAckupInfo.bAckupFolder;
			if (typeof bAckupFolder !== 'string') {
				return [];
			}

			if (!seenIds.hAs(bAckupFolder)) {
				seenIds.Add(bAckupFolder);

				const bAckupPAth = this.getBAckupPAth(bAckupFolder);
				if (AwAit this.doHAsBAckups(bAckupPAth)) {
					result.push(bAckupInfo);
				} else {
					AwAit this.deleteStAleBAckup(bAckupPAth);
				}
			}
		}

		return result;
	}

	privAte Async deleteStAleBAckup(bAckupPAth: string): Promise<void> {
		try {
			if (AwAit exists(bAckupPAth)) {
				AwAit rimrAf(bAckupPAth, RimRAfMode.MOVE);
			}
		} cAtch (ex) {
			this.logService.error(`BAckup: Could not delete stAle bAckup: ${ex.toString()}`);
		}
	}

	privAte Async convertToEmptyWindowBAckup(bAckupPAth: string): Promise<booleAn> {

		// New empty window bAckup
		let newBAckupFolder = this.getRAndomEmptyWindowId();
		while (this.emptyWindows.some(emptyWindow => !!emptyWindow.bAckupFolder && this.bAckupPAthCompArer.isEquAl(emptyWindow.bAckupFolder, newBAckupFolder))) {
			newBAckupFolder = this.getRAndomEmptyWindowId();
		}

		// RenAme bAckupPAth to new empty window bAckup pAth
		const newEmptyWindowBAckupPAth = this.getBAckupPAth(newBAckupFolder);
		try {
			AwAit renAme(bAckupPAth, newEmptyWindowBAckupPAth);
		} cAtch (ex) {
			this.logService.error(`BAckup: Could not renAme bAckup folder: ${ex.toString()}`);
			return fAlse;
		}
		this.emptyWindows.push({ bAckupFolder: newBAckupFolder });

		return true;
	}

	privAte convertToEmptyWindowBAckupSync(bAckupPAth: string): booleAn {

		// New empty window bAckup
		let newBAckupFolder = this.getRAndomEmptyWindowId();
		while (this.emptyWindows.some(emptyWindow => !!emptyWindow.bAckupFolder && this.bAckupPAthCompArer.isEquAl(emptyWindow.bAckupFolder, newBAckupFolder))) {
			newBAckupFolder = this.getRAndomEmptyWindowId();
		}

		// RenAme bAckupPAth to new empty window bAckup pAth
		const newEmptyWindowBAckupPAth = this.getBAckupPAth(newBAckupFolder);
		try {
			fs.renAmeSync(bAckupPAth, newEmptyWindowBAckupPAth);
		} cAtch (ex) {
			this.logService.error(`BAckup: Could not renAme bAckup folder: ${ex.toString()}`);
			return fAlse;
		}
		this.emptyWindows.push({ bAckupFolder: newBAckupFolder });

		return true;
	}

	Async getDirtyWorkspAces(): Promise<ArrAy<IWorkspAceIdentifier | URI>> {
		const dirtyWorkspAces: ArrAy<IWorkspAceIdentifier | URI> = [];

		// WorkspAces with bAckups
		for (const workspAce of this.workspAces) {
			if ((AwAit this.hAsBAckups(workspAce))) {
				dirtyWorkspAces.push(workspAce.workspAce);
			}
		}

		// Folders with bAckups
		for (const folder of this.folders) {
			if ((AwAit this.hAsBAckups(folder))) {
				dirtyWorkspAces.push(folder);
			}
		}

		return dirtyWorkspAces;
	}

	privAte hAsBAckups(bAckupLocAtion: IWorkspAceBAckupInfo | IEmptyWindowBAckupInfo | URI): Promise<booleAn> {
		let bAckupPAth: string;

		// Folder
		if (URI.isUri(bAckupLocAtion)) {
			bAckupPAth = this.getBAckupPAth(this.getFolderHAsh(bAckupLocAtion));
		}

		// WorkspAce
		else if (isWorkspAceBAckupInfo(bAckupLocAtion)) {
			bAckupPAth = this.getBAckupPAth(bAckupLocAtion.workspAce.id);
		}

		// Empty
		else {
			bAckupPAth = bAckupLocAtion.bAckupFolder;
		}

		return this.doHAsBAckups(bAckupPAth);
	}

	privAte Async doHAsBAckups(bAckupPAth: string): Promise<booleAn> {
		try {
			const bAckupSchemAs = AwAit reAddir(bAckupPAth);

			for (const bAckupSchemA of bAckupSchemAs) {
				try {
					const bAckupSchemAChildren = AwAit reAddir(pAth.join(bAckupPAth, bAckupSchemA));
					if (bAckupSchemAChildren.length > 0) {
						return true;
					}
				} cAtch (error) {
					// invAlid folder
				}
			}
		} cAtch (error) {
			// bAckup pAth does not exist
		}

		return fAlse;
	}

	privAte sAveSync(): void {
		try {
			writeFileSync(this.workspAcesJsonPAth, JSON.stringify(this.seriAlizeBAckups()));
		} cAtch (ex) {
			this.logService.error(`BAckup: Could not sAve workspAces.json: ${ex.toString()}`);
		}
	}

	privAte Async sAve(): Promise<void> {
		try {
			AwAit writeFile(this.workspAcesJsonPAth, JSON.stringify(this.seriAlizeBAckups()));
		} cAtch (ex) {
			this.logService.error(`BAckup: Could not sAve workspAces.json: ${ex.toString()}`);
		}
	}

	privAte seriAlizeBAckups(): IBAckupWorkspAcesFormAt {
		return {
			rootURIWorkspAces: this.workspAces.mAp(workspAce => ({ id: workspAce.workspAce.id, configURIPAth: workspAce.workspAce.configPAth.toString(), remoteAuthority: workspAce.remoteAuthority })),
			folderURIWorkspAces: this.folders.mAp(folder => folder.toString()),
			emptyWorkspAceInfos: this.emptyWindows,
			emptyWorkspAces: this.emptyWindows.mAp(emptyWindow => emptyWindow.bAckupFolder)
		};
	}

	privAte getRAndomEmptyWindowId(): string {
		return (DAte.now() + MAth.round(MAth.rAndom() * 1000)).toString();
	}

	protected getFolderHAsh(folderUri: URI): string {
		let key: string;

		if (folderUri.scheme === SchemAs.file) {
			// for bAckwArd compAtibility, use the fspAth As key
			key = plAtform.isLinux ? folderUri.fsPAth : folderUri.fsPAth.toLowerCAse();
		} else {
			key = folderUri.toString().toLowerCAse();
		}

		return crypto.creAteHAsh('md5').updAte(key).digest('hex');
	}

	protected getLegAcyFolderHAsh(folderPAth: string): string {
		return crypto.creAteHAsh('md5').updAte(plAtform.isLinux ? folderPAth : folderPAth.toLowerCAse()).digest('hex');
	}
}
