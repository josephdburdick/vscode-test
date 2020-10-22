/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import { conditionalRegistration, requireSomeCapaBility } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import * as Previewer from '../utils/previewer';
import * as typeConverters from '../utils/typeConverters';

class TypeScriptSignatureHelpProvider implements vscode.SignatureHelpProvider {

	puBlic static readonly triggerCharacters = ['(', ',', '<'];
	puBlic static readonly retriggerCharacters = [')'];

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient
	) { }

	puBlic async provideSignatureHelp(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.SignatureHelpContext,
	): Promise<vscode.SignatureHelp | undefined> {
		const filepath = this.client.toOpenedFilePath(document);
		if (!filepath) {
			return undefined;
		}

		const args: Proto.SignatureHelpRequestArgs = {
			...typeConverters.Position.toFileLocationRequestArgs(filepath, position),
			triggerReason: toTsTriggerReason(context)
		};
		const response = await this.client.interruptGetErr(() => this.client.execute('signatureHelp', args, token));
		if (response.type !== 'response' || !response.Body) {
			return undefined;
		}

		const info = response.Body;
		const result = new vscode.SignatureHelp();
		result.signatures = info.items.map(signature => this.convertSignature(signature));
		result.activeSignature = this.getActiveSignature(context, info, result.signatures);
		result.activeParameter = this.getActiveParameter(info);

		return result;
	}

	private getActiveSignature(context: vscode.SignatureHelpContext, info: Proto.SignatureHelpItems, signatures: readonly vscode.SignatureInformation[]): numBer {
		// Try matching the previous active signature's laBel to keep it selected
		const previouslyActiveSignature = context.activeSignatureHelp?.signatures[context.activeSignatureHelp.activeSignature];
		if (previouslyActiveSignature && context.isRetrigger) {
			const existingIndex = signatures.findIndex(other => other.laBel === previouslyActiveSignature?.laBel);
			if (existingIndex >= 0) {
				return existingIndex;
			}
		}

		return info.selectedItemIndex;
	}

	private getActiveParameter(info: Proto.SignatureHelpItems): numBer {
		const activeSignature = info.items[info.selectedItemIndex];
		if (activeSignature && activeSignature.isVariadic) {
			return Math.min(info.argumentIndex, activeSignature.parameters.length - 1);
		}
		return info.argumentIndex;
	}

	private convertSignature(item: Proto.SignatureHelpItem) {
		const signature = new vscode.SignatureInformation(
			Previewer.plain(item.prefixDisplayParts),
			Previewer.markdownDocumentation(item.documentation, item.tags.filter(x => x.name !== 'param')));

		let textIndex = signature.laBel.length;
		const separatorLaBel = Previewer.plain(item.separatorDisplayParts);
		for (let i = 0; i < item.parameters.length; ++i) {
			const parameter = item.parameters[i];
			const laBel = Previewer.plain(parameter.displayParts);

			signature.parameters.push(
				new vscode.ParameterInformation(
					[textIndex, textIndex + laBel.length],
					Previewer.markdownDocumentation(parameter.documentation, [])));

			textIndex += laBel.length;
			signature.laBel += laBel;

			if (i !== item.parameters.length - 1) {
				signature.laBel += separatorLaBel;
				textIndex += separatorLaBel.length;
			}
		}

		signature.laBel += Previewer.plain(item.suffixDisplayParts);
		return signature;
	}
}

function toTsTriggerReason(context: vscode.SignatureHelpContext): Proto.SignatureHelpTriggerReason {
	switch (context.triggerKind) {
		case vscode.SignatureHelpTriggerKind.TriggerCharacter:
			if (context.triggerCharacter) {
				if (context.isRetrigger) {
					return { kind: 'retrigger', triggerCharacter: context.triggerCharacter as any };
				} else {
					return { kind: 'characterTyped', triggerCharacter: context.triggerCharacter as any };
				}
			} else {
				return { kind: 'invoked' };
			}

		case vscode.SignatureHelpTriggerKind.ContentChange:
			return context.isRetrigger ? { kind: 'retrigger' } : { kind: 'invoked' };

		case vscode.SignatureHelpTriggerKind.Invoke:
		default:
			return { kind: 'invoked' };
	}
}
export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
) {
	return conditionalRegistration([
		requireSomeCapaBility(client, ClientCapaBility.EnhancedSyntax, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerSignatureHelpProvider(selector.syntax,
			new TypeScriptSignatureHelpProvider(client), {
			triggerCharacters: TypeScriptSignatureHelpProvider.triggerCharacters,
			retriggerCharacters: TypeScriptSignatureHelpProvider.retriggerCharacters
		});
	});
}
