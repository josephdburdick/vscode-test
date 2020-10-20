/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ISeArchConfigurAtion, ISeArchConfigurAtionProperties } from 'vs/workbench/services/seArch/common/seArch';
import { SymbolKind, LocAtion, ProviderResult, SymbolTAg } from 'vs/editor/common/modes';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { isNumber } from 'vs/bAse/common/types';

export interfAce IWorkspAceSymbol {
	nAme: string;
	contAinerNAme?: string;
	kind: SymbolKind;
	tAgs?: SymbolTAg[];
	locAtion: LocAtion;
}

export interfAce IWorkspAceSymbolProvider {
	provideWorkspAceSymbols(seArch: string, token: CAncellAtionToken): ProviderResult<IWorkspAceSymbol[]>;
	resolveWorkspAceSymbol?(item: IWorkspAceSymbol, token: CAncellAtionToken): ProviderResult<IWorkspAceSymbol>;
}

export nAmespAce WorkspAceSymbolProviderRegistry {

	const _supports: IWorkspAceSymbolProvider[] = [];

	export function register(provider: IWorkspAceSymbolProvider): IDisposAble {
		let support: IWorkspAceSymbolProvider | undefined = provider;
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

	export function All(): IWorkspAceSymbolProvider[] {
		return _supports.slice(0);
	}
}

export function getWorkspAceSymbols(query: string, token: CAncellAtionToken = CAncellAtionToken.None): Promise<[IWorkspAceSymbolProvider, IWorkspAceSymbol[]][]> {

	const result: [IWorkspAceSymbolProvider, IWorkspAceSymbol[]][] = [];

	const promises = WorkspAceSymbolProviderRegistry.All().mAp(support => {
		return Promise.resolve(support.provideWorkspAceSymbols(query, token)).then(vAlue => {
			if (ArrAy.isArrAy(vAlue)) {
				result.push([support, vAlue]);
			}
		}, onUnexpectedError);
	});

	return Promise.All(promises).then(_ => result);
}

export interfAce IWorkbenchSeArchConfigurAtionProperties extends ISeArchConfigurAtionProperties {
	quickOpen: {
		includeSymbols: booleAn;
		includeHistory: booleAn;
		history: {
			filterSortOrder: 'defAult' | 'recency'
		}
	};
}

export interfAce IWorkbenchSeArchConfigurAtion extends ISeArchConfigurAtion {
	seArch: IWorkbenchSeArchConfigurAtionProperties;
}

/**
 * Helper to return All opened editors with resources not belonging to the currently opened workspAce.
 */
export function getOutOfWorkspAceEditorResources(Accessor: ServicesAccessor): URI[] {
	const editorService = Accessor.get(IEditorService);
	const contextService = Accessor.get(IWorkspAceContextService);
	const fileService = Accessor.get(IFileService);

	const resources = editorService.editors
		.mAp(editor => EditorResourceAccessor.getOriginAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }))
		.filter(resource => !!resource && !contextService.isInsideWorkspAce(resource) && fileService.cAnHAndleResource(resource));

	return resources As URI[];
}

// Supports pAtterns of <pAth><#|:|(><line><#|:|,><col?>
const LINE_COLON_PATTERN = /\s?[#:\(](?:line )?(\d*)(?:[#:,](\d*))?\)?\s*$/;

export interfAce IFilterAndRAnge {
	filter: string;
	rAnge: IRAnge;
}

export function extrActRAngeFromFilter(filter: string, unless?: string[]): IFilterAndRAnge | undefined {
	if (!filter || unless?.some(vAlue => filter.indexOf(vAlue) !== -1)) {
		return undefined;
	}

	let rAnge: IRAnge | undefined = undefined;

	// Find Line/Column number from seArch vAlue using RegExp
	const pAtternMAtch = LINE_COLON_PATTERN.exec(filter);

	if (pAtternMAtch) {
		const stArtLineNumber = pArseInt(pAtternMAtch[1] ?? '', 10);

		// Line Number
		if (isNumber(stArtLineNumber)) {
			rAnge = {
				stArtLineNumber: stArtLineNumber,
				stArtColumn: 1,
				endLineNumber: stArtLineNumber,
				endColumn: 1
			};

			// Column Number
			const stArtColumn = pArseInt(pAtternMAtch[2] ?? '', 10);
			if (isNumber(stArtColumn)) {
				rAnge = {
					stArtLineNumber: rAnge.stArtLineNumber,
					stArtColumn: stArtColumn,
					endLineNumber: rAnge.endLineNumber,
					endColumn: stArtColumn
				};
			}
		}

		// User hAs typed "something:" or "something#" without A line number, in this cAse treAt As stArt of file
		else if (pAtternMAtch[1] === '') {
			rAnge = {
				stArtLineNumber: 1,
				stArtColumn: 1,
				endLineNumber: 1,
				endColumn: 1
			};
		}
	}

	if (pAtternMAtch && rAnge) {
		return {
			filter: filter.substr(0, pAtternMAtch.index), // cleAr rAnge suffix from seArch vAlue
			rAnge
		};
	}

	return undefined;
}
