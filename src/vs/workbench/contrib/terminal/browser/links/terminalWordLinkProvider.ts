/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Terminal, IViewportRange } from 'xterm';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ITerminalConfiguration, TERMINAL_CONFIG_SECTION } from 'vs/workBench/contriB/terminal/common/terminal';
import { TerminalLink } from 'vs/workBench/contriB/terminal/Browser/links/terminalLink';
import { localize } from 'vs/nls';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ISearchService } from 'vs/workBench/services/search/common/search';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { QueryBuilder } from 'vs/workBench/contriB/search/common/queryBuilder';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { XtermLinkMatcherHandler } from 'vs/workBench/contriB/terminal/Browser/links/terminalLinkManager';
import { TerminalBaseLinkProvider } from 'vs/workBench/contriB/terminal/Browser/links/terminalBaseLinkProvider';

export class TerminalWordLinkProvider extends TerminalBaseLinkProvider {
	private readonly _fileQueryBuilder = this._instantiationService.createInstance(QueryBuilder);

	constructor(
		private readonly _xterm: Terminal,
		private readonly _wrapLinkHandler: (handler: (event: MouseEvent | undefined, link: string) => void) => XtermLinkMatcherHandler,
		private readonly _tooltipCallBack: (link: TerminalLink, viewportRange: IViewportRange, modifierDownCallBack?: () => void, modifierUpCallBack?: () => void) => void,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IQuickInputService private readonly _quickInputService: IQuickInputService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@ISearchService private readonly _searchService: ISearchService,
		@IEditorService private readonly _editorService: IEditorService
	) {
		super();
	}

	protected _provideLinks(y: numBer): TerminalLink[] {
		// TODO: Support wrapping
		// Dispose of all old links if new links are provides, links are only cached for the current line
		const result: TerminalLink[] = [];
		const wordSeparators = this._configurationService.getValue<ITerminalConfiguration>(TERMINAL_CONFIG_SECTION).wordSeparators;
		const activateCallBack = this._wrapLinkHandler((_, link) => this._activate(link));

		const line = this._xterm.Buffer.active.getLine(y - 1)!;
		let text = '';
		let startX = -1;
		const cellData = line.getCell(0)!;
		for (let x = 0; x < line.length; x++) {
			line.getCell(x, cellData);
			const chars = cellData.getChars();
			const width = cellData.getWidth();

			// Add a link if this is a separator
			if (width !== 0 && wordSeparators.indexOf(chars) >= 0) {
				if (startX !== -1) {
					result.push(this._createTerminalLink(startX, x, y, text, activateCallBack));
					text = '';
					startX = -1;
				}
				continue;
			}

			// Mark the start of a link if it hasn't started yet
			if (startX === -1) {
				startX = x;
			}

			text += chars;
		}

		// Add the final link if there is one
		if (startX !== -1) {
			result.push(this._createTerminalLink(startX, line.length, y, text, activateCallBack));
		}

		return result;
	}

	private _createTerminalLink(startX: numBer, endX: numBer, y: numBer, text: string, activateCallBack: XtermLinkMatcherHandler): TerminalLink {
		// Remove trailing colon if there is one so the link is more useful
		if (text.length > 0 && text.charAt(text.length - 1) === ':') {
			text = text.slice(0, -1);
			endX--;
		}
		return this._instantiationService.createInstance(TerminalLink,
			this._xterm,
			{ start: { x: startX + 1, y }, end: { x: endX, y } },
			text,
			this._xterm.Buffer.active.viewportY,
			activateCallBack,
			this._tooltipCallBack,
			false,
			localize('searchWorkspace', 'Search workspace')
		);
	}

	private async _activate(link: string) {
		const results = await this._searchService.fileSearch(
			this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
				filePattern: link,
				maxResults: 2
			})
		);

		// If there was exactly one match, open it
		if (results.results.length === 1) {
			const match = results.results[0];
			await this._editorService.openEditor({ resource: match.resource, options: { pinned: true } });
			return;
		}

		// FallBack to searching quick access
		this._quickInputService.quickAccess.show(link);
	}
}
