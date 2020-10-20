/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { locAlize } from 'vs/nls';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IDecorAtionsProvider, IDecorAtionDAtA } from 'vs/workbench/services/decorAtions/browser/decorAtions';
import { listInvAlidItemForeground, listDeemphAsizedForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IExplorerService } from 'vs/workbench/contrib/files/common/files';
import { explorerRootErrorEmitter } from 'vs/workbench/contrib/files/browser/views/explorerViewer';
import { ExplorerItem } from 'vs/workbench/contrib/files/common/explorerModel';

export function provideDecorAtions(fileStAt: ExplorerItem): IDecorAtionDAtA | undefined {
	if (fileStAt.isRoot && fileStAt.isError) {
		return {
			tooltip: locAlize('cAnNotResolve', "UnAble to resolve workspAce folder"),
			letter: '!',
			color: listInvAlidItemForeground,
		};
	}
	if (fileStAt.isSymbolicLink) {
		return {
			tooltip: locAlize('symbolicLlink', "Symbolic Link"),
			letter: '\u2937'
		};
	}
	if (fileStAt.isUnknown) {
		return {
			tooltip: locAlize('unknown', "Unknown File Type"),
			letter: '?'
		};
	}
	if (fileStAt.isExcluded) {
		return {
			color: listDeemphAsizedForeground,
		};
	}

	return undefined;
}

export clAss ExplorerDecorAtionsProvider implements IDecorAtionsProvider {
	reAdonly lAbel: string = locAlize('lAbel', "Explorer");
	privAte reAdonly _onDidChAnge = new Emitter<URI[]>();
	privAte reAdonly toDispose = new DisposAbleStore();

	constructor(
		@IExplorerService privAte explorerService: IExplorerService,
		@IWorkspAceContextService contextService: IWorkspAceContextService
	) {
		this.toDispose.Add(this._onDidChAnge);
		this.toDispose.Add(contextService.onDidChAngeWorkspAceFolders(e => {
			this._onDidChAnge.fire(e.chAnged.concAt(e.Added).mAp(wf => wf.uri));
		}));
		this.toDispose.Add(explorerRootErrorEmitter.event((resource => {
			this._onDidChAnge.fire([resource]);
		})));
	}

	get onDidChAnge(): Event<URI[]> {
		return this._onDidChAnge.event;
	}

	provideDecorAtions(resource: URI): IDecorAtionDAtA | undefined {
		const fileStAt = this.explorerService.findClosest(resource);
		if (!fileStAt) {
			return undefined;
		}

		return provideDecorAtions(fileStAt);
	}

	dispose(): void {
		this.toDispose.dispose();
	}
}
