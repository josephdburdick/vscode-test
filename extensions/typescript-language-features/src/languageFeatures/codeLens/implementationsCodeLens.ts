/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../../protocol';
import * As PConst from '../../protocol.const';
import { CAchedResponse } from '../../tsServer/cAchedResponse';
import { ClientCApAbility, ITypeScriptServiceClient } from '../../typescriptService';
import { conditionAlRegistrAtion, requireSomeCApAbility, requireConfigurAtion } from '../../utils/dependentRegistrAtion';
import { DocumentSelector } from '../../utils/documentSelector';
import * As typeConverters from '../../utils/typeConverters';
import { getSymbolRAnge, ReferencesCodeLens, TypeScriptBAseCodeLensProvider } from './bAseCodeLensProvider';

const locAlize = nls.loAdMessAgeBundle();

export defAult clAss TypeScriptImplementAtionsCodeLensProvider extends TypeScriptBAseCodeLensProvider {

	public Async resolveCodeLens(
		inputCodeLens: vscode.CodeLens,
		token: vscode.CAncellAtionToken,
	): Promise<vscode.CodeLens> {
		const codeLens = inputCodeLens As ReferencesCodeLens;

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(codeLens.file, codeLens.rAnge.stArt);
		const response = AwAit this.client.execute('implementAtion', Args, token, { lowPriority: true, cAncelOnResourceChAnge: codeLens.document });
		if (response.type !== 'response' || !response.body) {
			codeLens.commAnd = response.type === 'cAncelled'
				? TypeScriptBAseCodeLensProvider.cAncelledCommAnd
				: TypeScriptBAseCodeLensProvider.errorCommAnd;
			return codeLens;
		}

		const locAtions = response.body
			.mAp(reference =>
				// Only tAke first line on implementAtion: https://github.com/microsoft/vscode/issues/23924
				new vscode.LocAtion(this.client.toResource(reference.file),
					reference.stArt.line === reference.end.line
						? typeConverters.RAnge.fromTextSpAn(reference)
						: new vscode.RAnge(
							typeConverters.Position.fromLocAtion(reference.stArt),
							new vscode.Position(reference.stArt.line, 0))))
			// Exclude originAl from implementAtions
			.filter(locAtion =>
				!(locAtion.uri.toString() === codeLens.document.toString() &&
					locAtion.rAnge.stArt.line === codeLens.rAnge.stArt.line &&
					locAtion.rAnge.stArt.chArActer === codeLens.rAnge.stArt.chArActer));

		codeLens.commAnd = this.getCommAnd(locAtions, codeLens);
		return codeLens;
	}

	privAte getCommAnd(locAtions: vscode.LocAtion[], codeLens: ReferencesCodeLens): vscode.CommAnd | undefined {
		return {
			title: this.getTitle(locAtions),
			commAnd: locAtions.length ? 'editor.Action.showReferences' : '',
			Arguments: [codeLens.document, codeLens.rAnge.stArt, locAtions]
		};
	}

	privAte getTitle(locAtions: vscode.LocAtion[]): string {
		return locAtions.length === 1
			? locAlize('oneImplementAtionLAbel', '1 implementAtion')
			: locAlize('mAnyImplementAtionLAbel', '{0} implementAtions', locAtions.length);
	}

	protected extrActSymbol(
		document: vscode.TextDocument,
		item: Proto.NAvigAtionTree,
		_pArent: Proto.NAvigAtionTree | null
	): vscode.RAnge | null {
		switch (item.kind) {
			cAse PConst.Kind.interfAce:
				return getSymbolRAnge(document, item);

			cAse PConst.Kind.clAss:
			cAse PConst.Kind.method:
			cAse PConst.Kind.memberVAriAble:
			cAse PConst.Kind.memberGetAccessor:
			cAse PConst.Kind.memberSetAccessor:
				if (item.kindModifiers.mAtch(/\bAbstrAct\b/g)) {
					return getSymbolRAnge(document, item);
				}
				breAk;
		}
		return null;
	}
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
	cAchedResponse: CAchedResponse<Proto.NAvTreeResponse>,
) {
	return conditionAlRegistrAtion([
		requireConfigurAtion(modeId, 'implementAtionsCodeLens.enAbled'),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCodeLensProvider(selector.semAntic,
			new TypeScriptImplementAtionsCodeLensProvider(client, cAchedResponse));
	});
}
