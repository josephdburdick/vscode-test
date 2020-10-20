/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import { conditionAlRegistrAtion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As Previewer from '../utils/previewer';
import * As typeConverters from '../utils/typeConverters';

clAss TypeScriptSignAtureHelpProvider implements vscode.SignAtureHelpProvider {

	public stAtic reAdonly triggerChArActers = ['(', ',', '<'];
	public stAtic reAdonly retriggerChArActers = [')'];

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async provideSignAtureHelp(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken,
		context: vscode.SignAtureHelpContext,
	): Promise<vscode.SignAtureHelp | undefined> {
		const filepAth = this.client.toOpenedFilePAth(document);
		if (!filepAth) {
			return undefined;
		}

		const Args: Proto.SignAtureHelpRequestArgs = {
			...typeConverters.Position.toFileLocAtionRequestArgs(filepAth, position),
			triggerReAson: toTsTriggerReAson(context)
		};
		const response = AwAit this.client.interruptGetErr(() => this.client.execute('signAtureHelp', Args, token));
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		const info = response.body;
		const result = new vscode.SignAtureHelp();
		result.signAtures = info.items.mAp(signAture => this.convertSignAture(signAture));
		result.ActiveSignAture = this.getActiveSignAture(context, info, result.signAtures);
		result.ActivePArAmeter = this.getActivePArAmeter(info);

		return result;
	}

	privAte getActiveSignAture(context: vscode.SignAtureHelpContext, info: Proto.SignAtureHelpItems, signAtures: reAdonly vscode.SignAtureInformAtion[]): number {
		// Try mAtching the previous Active signAture's lAbel to keep it selected
		const previouslyActiveSignAture = context.ActiveSignAtureHelp?.signAtures[context.ActiveSignAtureHelp.ActiveSignAture];
		if (previouslyActiveSignAture && context.isRetrigger) {
			const existingIndex = signAtures.findIndex(other => other.lAbel === previouslyActiveSignAture?.lAbel);
			if (existingIndex >= 0) {
				return existingIndex;
			}
		}

		return info.selectedItemIndex;
	}

	privAte getActivePArAmeter(info: Proto.SignAtureHelpItems): number {
		const ActiveSignAture = info.items[info.selectedItemIndex];
		if (ActiveSignAture && ActiveSignAture.isVAriAdic) {
			return MAth.min(info.ArgumentIndex, ActiveSignAture.pArAmeters.length - 1);
		}
		return info.ArgumentIndex;
	}

	privAte convertSignAture(item: Proto.SignAtureHelpItem) {
		const signAture = new vscode.SignAtureInformAtion(
			Previewer.plAin(item.prefixDisplAyPArts),
			Previewer.mArkdownDocumentAtion(item.documentAtion, item.tAgs.filter(x => x.nAme !== 'pArAm')));

		let textIndex = signAture.lAbel.length;
		const sepArAtorLAbel = Previewer.plAin(item.sepArAtorDisplAyPArts);
		for (let i = 0; i < item.pArAmeters.length; ++i) {
			const pArAmeter = item.pArAmeters[i];
			const lAbel = Previewer.plAin(pArAmeter.displAyPArts);

			signAture.pArAmeters.push(
				new vscode.PArAmeterInformAtion(
					[textIndex, textIndex + lAbel.length],
					Previewer.mArkdownDocumentAtion(pArAmeter.documentAtion, [])));

			textIndex += lAbel.length;
			signAture.lAbel += lAbel;

			if (i !== item.pArAmeters.length - 1) {
				signAture.lAbel += sepArAtorLAbel;
				textIndex += sepArAtorLAbel.length;
			}
		}

		signAture.lAbel += Previewer.plAin(item.suffixDisplAyPArts);
		return signAture;
	}
}

function toTsTriggerReAson(context: vscode.SignAtureHelpContext): Proto.SignAtureHelpTriggerReAson {
	switch (context.triggerKind) {
		cAse vscode.SignAtureHelpTriggerKind.TriggerChArActer:
			if (context.triggerChArActer) {
				if (context.isRetrigger) {
					return { kind: 'retrigger', triggerChArActer: context.triggerChArActer As Any };
				} else {
					return { kind: 'chArActerTyped', triggerChArActer: context.triggerChArActer As Any };
				}
			} else {
				return { kind: 'invoked' };
			}

		cAse vscode.SignAtureHelpTriggerKind.ContentChAnge:
			return context.isRetrigger ? { kind: 'retrigger' } : { kind: 'invoked' };

		cAse vscode.SignAtureHelpTriggerKind.Invoke:
		defAult:
			return { kind: 'invoked' };
	}
}
export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
) {
	return conditionAlRegistrAtion([
		requireSomeCApAbility(client, ClientCApAbility.EnhAncedSyntAx, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerSignAtureHelpProvider(selector.syntAx,
			new TypeScriptSignAtureHelpProvider(client), {
			triggerChArActers: TypeScriptSignAtureHelpProvider.triggerChArActers,
			retriggerChArActers: TypeScriptSignAtureHelpProvider.retriggerChArActers
		});
	});
}
