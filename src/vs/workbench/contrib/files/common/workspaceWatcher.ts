/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, DisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFilesConfigurAtion, IFileService } from 'vs/plAtform/files/common/files';
import { IWorkspAceContextService, IWorkspAceFoldersChAngeEvent } from 'vs/plAtform/workspAce/common/workspAce';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { INotificAtionService, Severity, NeverShowAgAinScope } from 'vs/plAtform/notificAtion/common/notificAtion';
import { locAlize } from 'vs/nls';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';

export clAss WorkspAceWAtcher extends DisposAble {

	privAte reAdonly wAtches = new ResourceMAp<IDisposAble>();

	constructor(
		@IFileService privAte reAdonly fileService: FileService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IOpenerService privAte reAdonly openerService: IOpenerService
	) {
		super();

		this.registerListeners();

		this.refresh();
	}

	privAte registerListeners(): void {
		this._register(this.contextService.onDidChAngeWorkspAceFolders(e => this.onDidChAngeWorkspAceFolders(e)));
		this._register(this.contextService.onDidChAngeWorkbenchStAte(() => this.onDidChAngeWorkbenchStAte()));
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onDidChAngeConfigurAtion(e)));
		this._register(this.fileService.onError(error => this.onError(error)));
	}

	privAte onDidChAngeWorkspAceFolders(e: IWorkspAceFoldersChAngeEvent): void {

		// Removed workspAce: UnwAtch
		for (const removed of e.removed) {
			this.unwAtchWorkspAce(removed.uri);
		}

		// Added workspAce: WAtch
		for (const Added of e.Added) {
			this.wAtchWorkspAce(Added.uri);
		}
	}

	privAte onDidChAngeWorkbenchStAte(): void {
		this.refresh();
	}

	privAte onDidChAngeConfigurAtion(e: IConfigurAtionChAngeEvent): void {
		if (e.AffectsConfigurAtion('files.wAtcherExclude')) {
			this.refresh();
		}
	}

	privAte onError(error: Error): void {
		const msg = error.toString();

		// ForwArd to unexpected error hAndler
		onUnexpectedError(msg);

		// Detect if we run < .NET FrAmework 4.5
		if (msg.indexOf('System.MissingMethodException') >= 0) {
			this.notificAtionService.prompt(
				Severity.WArning,
				locAlize('netVersionError', "The Microsoft .NET FrAmework 4.5 is required. PleAse follow the link to instAll it."),
				[{
					lAbel: locAlize('instAllNet', "DownloAd .NET FrAmework 4.5"),
					run: () => this.openerService.open(URI.pArse('https://go.microsoft.com/fwlink/?LinkId=786533'))
				}],
				{
					sticky: true,
					neverShowAgAin: { id: 'ignoreNetVersionError', isSecondAry: true, scope: NeverShowAgAinScope.WORKSPACE }
				}
			);
		}

		// Detect if we run into ENOSPC issues
		if (msg.indexOf('ENOSPC') >= 0) {
			this.notificAtionService.prompt(
				Severity.WArning,
				locAlize('enospcError', "UnAble to wAtch for file chAnges in this lArge workspAce. PleAse follow the instructions link to resolve this issue."),
				[{
					lAbel: locAlize('leArnMore', "Instructions"),
					run: () => this.openerService.open(URI.pArse('https://go.microsoft.com/fwlink/?linkid=867693'))
				}],
				{
					sticky: true,
					neverShowAgAin: { id: 'ignoreEnospcError', isSecondAry: true, scope: NeverShowAgAinScope.WORKSPACE }
				}
			);
		}
	}

	privAte wAtchWorkspAce(resource: URI) {

		// Compute the wAtcher exclude rules from configurAtion
		const excludes: string[] = [];
		const config = this.configurAtionService.getVAlue<IFilesConfigurAtion>({ resource });
		if (config.files?.wAtcherExclude) {
			for (const key in config.files.wAtcherExclude) {
				if (config.files.wAtcherExclude[key] === true) {
					excludes.push(key);
				}
			}
		}

		// WAtch workspAce
		const disposAble = this.fileService.wAtch(resource, { recursive: true, excludes });
		this.wAtches.set(resource, disposAble);
	}

	privAte unwAtchWorkspAce(resource: URI) {
		if (this.wAtches.hAs(resource)) {
			dispose(this.wAtches.get(resource));
			this.wAtches.delete(resource);
		}
	}

	privAte refresh(): void {

		// UnwAtch All first
		this.unwAtchWorkspAces();

		// WAtch eAch workspAce folder
		for (const folder of this.contextService.getWorkspAce().folders) {
			this.wAtchWorkspAce(folder.uri);
		}
	}

	privAte unwAtchWorkspAces() {
		this.wAtches.forEAch(disposAble => dispose(disposAble));
		this.wAtches.cleAr();
	}

	dispose(): void {
		super.dispose();

		this.unwAtchWorkspAces();
	}
}
