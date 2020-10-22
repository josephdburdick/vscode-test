/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { localize } from 'vs/nls';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IDecorationsProvider, IDecorationData } from 'vs/workBench/services/decorations/Browser/decorations';
import { listInvalidItemForeground, listDeemphasizedForeground } from 'vs/platform/theme/common/colorRegistry';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IExplorerService } from 'vs/workBench/contriB/files/common/files';
import { explorerRootErrorEmitter } from 'vs/workBench/contriB/files/Browser/views/explorerViewer';
import { ExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';

export function provideDecorations(fileStat: ExplorerItem): IDecorationData | undefined {
	if (fileStat.isRoot && fileStat.isError) {
		return {
			tooltip: localize('canNotResolve', "UnaBle to resolve workspace folder"),
			letter: '!',
			color: listInvalidItemForeground,
		};
	}
	if (fileStat.isSymBolicLink) {
		return {
			tooltip: localize('symBolicLlink', "SymBolic Link"),
			letter: '\u2937'
		};
	}
	if (fileStat.isUnknown) {
		return {
			tooltip: localize('unknown', "Unknown File Type"),
			letter: '?'
		};
	}
	if (fileStat.isExcluded) {
		return {
			color: listDeemphasizedForeground,
		};
	}

	return undefined;
}

export class ExplorerDecorationsProvider implements IDecorationsProvider {
	readonly laBel: string = localize('laBel', "Explorer");
	private readonly _onDidChange = new Emitter<URI[]>();
	private readonly toDispose = new DisposaBleStore();

	constructor(
		@IExplorerService private explorerService: IExplorerService,
		@IWorkspaceContextService contextService: IWorkspaceContextService
	) {
		this.toDispose.add(this._onDidChange);
		this.toDispose.add(contextService.onDidChangeWorkspaceFolders(e => {
			this._onDidChange.fire(e.changed.concat(e.added).map(wf => wf.uri));
		}));
		this.toDispose.add(explorerRootErrorEmitter.event((resource => {
			this._onDidChange.fire([resource]);
		})));
	}

	get onDidChange(): Event<URI[]> {
		return this._onDidChange.event;
	}

	provideDecorations(resource: URI): IDecorationData | undefined {
		const fileStat = this.explorerService.findClosest(resource);
		if (!fileStat) {
			return undefined;
		}

		return provideDecorations(fileStat);
	}

	dispose(): void {
		this.toDispose.dispose();
	}
}
