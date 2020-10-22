/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../../protocol';
import * as PConst from '../../protocol.const';
import { CachedResponse } from '../../tsServer/cachedResponse';
import { ClientCapaBility, ITypeScriptServiceClient } from '../../typescriptService';
import { conditionalRegistration, requireSomeCapaBility, requireConfiguration } from '../../utils/dependentRegistration';
import { DocumentSelector } from '../../utils/documentSelector';
import * as typeConverters from '../../utils/typeConverters';
import { getSymBolRange, ReferencesCodeLens, TypeScriptBaseCodeLensProvider } from './BaseCodeLensProvider';

const localize = nls.loadMessageBundle();

export default class TypeScriptImplementationsCodeLensProvider extends TypeScriptBaseCodeLensProvider {

	puBlic async resolveCodeLens(
		inputCodeLens: vscode.CodeLens,
		token: vscode.CancellationToken,
	): Promise<vscode.CodeLens> {
		const codeLens = inputCodeLens as ReferencesCodeLens;

		const args = typeConverters.Position.toFileLocationRequestArgs(codeLens.file, codeLens.range.start);
		const response = await this.client.execute('implementation', args, token, { lowPriority: true, cancelOnResourceChange: codeLens.document });
		if (response.type !== 'response' || !response.Body) {
			codeLens.command = response.type === 'cancelled'
				? TypeScriptBaseCodeLensProvider.cancelledCommand
				: TypeScriptBaseCodeLensProvider.errorCommand;
			return codeLens;
		}

		const locations = response.Body
			.map(reference =>
				// Only take first line on implementation: https://githuB.com/microsoft/vscode/issues/23924
				new vscode.Location(this.client.toResource(reference.file),
					reference.start.line === reference.end.line
						? typeConverters.Range.fromTextSpan(reference)
						: new vscode.Range(
							typeConverters.Position.fromLocation(reference.start),
							new vscode.Position(reference.start.line, 0))))
			// Exclude original from implementations
			.filter(location =>
				!(location.uri.toString() === codeLens.document.toString() &&
					location.range.start.line === codeLens.range.start.line &&
					location.range.start.character === codeLens.range.start.character));

		codeLens.command = this.getCommand(locations, codeLens);
		return codeLens;
	}

	private getCommand(locations: vscode.Location[], codeLens: ReferencesCodeLens): vscode.Command | undefined {
		return {
			title: this.getTitle(locations),
			command: locations.length ? 'editor.action.showReferences' : '',
			arguments: [codeLens.document, codeLens.range.start, locations]
		};
	}

	private getTitle(locations: vscode.Location[]): string {
		return locations.length === 1
			? localize('oneImplementationLaBel', '1 implementation')
			: localize('manyImplementationLaBel', '{0} implementations', locations.length);
	}

	protected extractSymBol(
		document: vscode.TextDocument,
		item: Proto.NavigationTree,
		_parent: Proto.NavigationTree | null
	): vscode.Range | null {
		switch (item.kind) {
			case PConst.Kind.interface:
				return getSymBolRange(document, item);

			case PConst.Kind.class:
			case PConst.Kind.method:
			case PConst.Kind.memBerVariaBle:
			case PConst.Kind.memBerGetAccessor:
			case PConst.Kind.memBerSetAccessor:
				if (item.kindModifiers.match(/\BaBstract\B/g)) {
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
		requireConfiguration(modeId, 'implementationsCodeLens.enaBled'),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerCodeLensProvider(selector.semantic,
			new TypeScriptImplementationsCodeLensProvider(client, cachedResponse));
	});
}
