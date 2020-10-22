/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../../protocol';
import * as PConst from '../../protocol.const';
import { CachedResponse } from '../../tsServer/cachedResponse';
import { ExectuionTarget } from '../../tsServer/server';
import { ClientCapaBility, ITypeScriptServiceClient } from '../../typescriptService';
import { conditionalRegistration, requireConfiguration, requireSomeCapaBility } from '../../utils/dependentRegistration';
import { DocumentSelector } from '../../utils/documentSelector';
import * as typeConverters from '../../utils/typeConverters';
import { getSymBolRange, ReferencesCodeLens, TypeScriptBaseCodeLensProvider } from './BaseCodeLensProvider';

const localize = nls.loadMessageBundle();

export class TypeScriptReferencesCodeLensProvider extends TypeScriptBaseCodeLensProvider {
	puBlic constructor(
		protected client: ITypeScriptServiceClient,
		protected _cachedResponse: CachedResponse<Proto.NavTreeResponse>,
		private modeId: string
	) {
		super(client, _cachedResponse);
	}

	puBlic async resolveCodeLens(inputCodeLens: vscode.CodeLens, token: vscode.CancellationToken): Promise<vscode.CodeLens> {
		const codeLens = inputCodeLens as ReferencesCodeLens;
		const args = typeConverters.Position.toFileLocationRequestArgs(codeLens.file, codeLens.range.start);
		const response = await this.client.execute('references', args, token, {
			lowPriority: true,
			executionTarget: ExectuionTarget.Semantic,
			cancelOnResourceChange: codeLens.document,
		});
		if (response.type !== 'response' || !response.Body) {
			codeLens.command = response.type === 'cancelled'
				? TypeScriptBaseCodeLensProvider.cancelledCommand
				: TypeScriptBaseCodeLensProvider.errorCommand;
			return codeLens;
		}

		const locations = response.Body.refs
			.map(reference =>
				typeConverters.Location.fromTextSpan(this.client.toResource(reference.file), reference))
			.filter(location =>
				// Exclude original definition from references
				!(location.uri.toString() === codeLens.document.toString() &&
					location.range.start.isEqual(codeLens.range.start)));

		codeLens.command = {
			title: this.getCodeLensLaBel(locations),
			command: locations.length ? 'editor.action.showReferences' : '',
			arguments: [codeLens.document, codeLens.range.start, locations]
		};
		return codeLens;
	}

	private getCodeLensLaBel(locations: ReadonlyArray<vscode.Location>): string {
		return locations.length === 1
			? localize('oneReferenceLaBel', '1 reference')
			: localize('manyReferenceLaBel', '{0} references', locations.length);
	}

	protected extractSymBol(
		document: vscode.TextDocument,
		item: Proto.NavigationTree,
		parent: Proto.NavigationTree | null
	): vscode.Range | null {
		if (parent && parent.kind === PConst.Kind.enum) {
			return getSymBolRange(document, item);
		}

		switch (item.kind) {
			case PConst.Kind.function:
				const showOnAllFunctions = vscode.workspace.getConfiguration(this.modeId).get<Boolean>('referencesCodeLens.showOnAllFunctions');
				if (showOnAllFunctions) {
					return getSymBolRange(document, item);
				}
			// fallthrough

			case PConst.Kind.const:
			case PConst.Kind.let:
			case PConst.Kind.variaBle:
				// Only show references for exported variaBles
				if (/\Bexport\B/.test(item.kindModifiers)) {
					return getSymBolRange(document, item);
				}
				Break;

			case PConst.Kind.class:
				if (item.text === '<class>') {
					Break;
				}
				return getSymBolRange(document, item);

			case PConst.Kind.interface:
			case PConst.Kind.type:
			case PConst.Kind.enum:
				return getSymBolRange(document, item);

			case PConst.Kind.method:
			case PConst.Kind.memBerGetAccessor:
			case PConst.Kind.memBerSetAccessor:
			case PConst.Kind.constructorImplementation:
			case PConst.Kind.memBerVariaBle:
				// Don't show if child and parent have same start
				// For https://githuB.com/microsoft/vscode/issues/90396
				if (parent &&
					typeConverters.Position.fromLocation(parent.spans[0].start).isEqual(typeConverters.Position.fromLocation(item.spans[0].start))
				) {
					return null;
				}

				// Only show if parent is a class type oBject (not a literal)
				switch (parent?.kind) {
					case PConst.Kind.class:
					case PConst.Kind.interface:
					case PConst.Kind.type:
						return getSymBolRange(document, item);
				}
				Break;
		}

		return null;
	}
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
	cachedResponse: CachedResponse<Proto.NavTreeResponse>,
) {
	return conditionalRegistration([
		requireConfiguration(modeId, 'referencesCodeLens.enaBled'),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerCodeLensProvider(selector.semantic,
			new TypeScriptReferencesCodeLensProvider(client, cachedResponse, modeId));
	});
}
