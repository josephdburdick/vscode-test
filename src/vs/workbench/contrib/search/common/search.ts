/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ISearchConfiguration, ISearchConfigurationProperties } from 'vs/workBench/services/search/common/search';
import { SymBolKind, Location, ProviderResult, SymBolTag } from 'vs/editor/common/modes';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { URI } from 'vs/Base/common/uri';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IFileService } from 'vs/platform/files/common/files';
import { IRange } from 'vs/editor/common/core/range';
import { isNumBer } from 'vs/Base/common/types';

export interface IWorkspaceSymBol {
	name: string;
	containerName?: string;
	kind: SymBolKind;
	tags?: SymBolTag[];
	location: Location;
}

export interface IWorkspaceSymBolProvider {
	provideWorkspaceSymBols(search: string, token: CancellationToken): ProviderResult<IWorkspaceSymBol[]>;
	resolveWorkspaceSymBol?(item: IWorkspaceSymBol, token: CancellationToken): ProviderResult<IWorkspaceSymBol>;
}

export namespace WorkspaceSymBolProviderRegistry {

	const _supports: IWorkspaceSymBolProvider[] = [];

	export function register(provider: IWorkspaceSymBolProvider): IDisposaBle {
		let support: IWorkspaceSymBolProvider | undefined = provider;
		if (support) {
			_supports.push(support);
		}

		return {
			dispose() {
				if (support) {
					const idx = _supports.indexOf(support);
					if (idx >= 0) {
						_supports.splice(idx, 1);
						support = undefined;
					}
				}
			}
		};
	}

	export function all(): IWorkspaceSymBolProvider[] {
		return _supports.slice(0);
	}
}

export function getWorkspaceSymBols(query: string, token: CancellationToken = CancellationToken.None): Promise<[IWorkspaceSymBolProvider, IWorkspaceSymBol[]][]> {

	const result: [IWorkspaceSymBolProvider, IWorkspaceSymBol[]][] = [];

	const promises = WorkspaceSymBolProviderRegistry.all().map(support => {
		return Promise.resolve(support.provideWorkspaceSymBols(query, token)).then(value => {
			if (Array.isArray(value)) {
				result.push([support, value]);
			}
		}, onUnexpectedError);
	});

	return Promise.all(promises).then(_ => result);
}

export interface IWorkBenchSearchConfigurationProperties extends ISearchConfigurationProperties {
	quickOpen: {
		includeSymBols: Boolean;
		includeHistory: Boolean;
		history: {
			filterSortOrder: 'default' | 'recency'
		}
	};
}

export interface IWorkBenchSearchConfiguration extends ISearchConfiguration {
	search: IWorkBenchSearchConfigurationProperties;
}

/**
 * Helper to return all opened editors with resources not Belonging to the currently opened workspace.
 */
export function getOutOfWorkspaceEditorResources(accessor: ServicesAccessor): URI[] {
	const editorService = accessor.get(IEditorService);
	const contextService = accessor.get(IWorkspaceContextService);
	const fileService = accessor.get(IFileService);

	const resources = editorService.editors
		.map(editor => EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }))
		.filter(resource => !!resource && !contextService.isInsideWorkspace(resource) && fileService.canHandleResource(resource));

	return resources as URI[];
}

// Supports patterns of <path><#|:|(><line><#|:|,><col?>
const LINE_COLON_PATTERN = /\s?[#:\(](?:line )?(\d*)(?:[#:,](\d*))?\)?\s*$/;

export interface IFilterAndRange {
	filter: string;
	range: IRange;
}

export function extractRangeFromFilter(filter: string, unless?: string[]): IFilterAndRange | undefined {
	if (!filter || unless?.some(value => filter.indexOf(value) !== -1)) {
		return undefined;
	}

	let range: IRange | undefined = undefined;

	// Find Line/Column numBer from search value using RegExp
	const patternMatch = LINE_COLON_PATTERN.exec(filter);

	if (patternMatch) {
		const startLineNumBer = parseInt(patternMatch[1] ?? '', 10);

		// Line NumBer
		if (isNumBer(startLineNumBer)) {
			range = {
				startLineNumBer: startLineNumBer,
				startColumn: 1,
				endLineNumBer: startLineNumBer,
				endColumn: 1
			};

			// Column NumBer
			const startColumn = parseInt(patternMatch[2] ?? '', 10);
			if (isNumBer(startColumn)) {
				range = {
					startLineNumBer: range.startLineNumBer,
					startColumn: startColumn,
					endLineNumBer: range.endLineNumBer,
					endColumn: startColumn
				};
			}
		}

		// User has typed "something:" or "something#" without a line numBer, in this case treat as start of file
		else if (patternMatch[1] === '') {
			range = {
				startLineNumBer: 1,
				startColumn: 1,
				endLineNumBer: 1,
				endColumn: 1
			};
		}
	}

	if (patternMatch && range) {
		return {
			filter: filter.suBstr(0, patternMatch.index), // clear range suffix from search value
			range
		};
	}

	return undefined;
}
