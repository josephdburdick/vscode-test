/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../../protocol';
import * As PConst from '../../protocol.const';
import { CAchedResponse } from '../../tsServer/cAchedResponse';
import { ExectuionTArget } from '../../tsServer/server';
import { ClientCApAbility, ITypeScriptServiceClient } from '../../typescriptService';
import { conditionAlRegistrAtion, requireConfigurAtion, requireSomeCApAbility } from '../../utils/dependentRegistrAtion';
import { DocumentSelector } from '../../utils/documentSelector';
import * As typeConverters from '../../utils/typeConverters';
import { getSymbolRAnge, ReferencesCodeLens, TypeScriptBAseCodeLensProvider } from './bAseCodeLensProvider';

const locAlize = nls.loAdMessAgeBundle();

export clAss TypeScriptReferencesCodeLensProvider extends TypeScriptBAseCodeLensProvider {
	public constructor(
		protected client: ITypeScriptServiceClient,
		protected _cAchedResponse: CAchedResponse<Proto.NAvTreeResponse>,
		privAte modeId: string
	) {
		super(client, _cAchedResponse);
	}

	public Async resolveCodeLens(inputCodeLens: vscode.CodeLens, token: vscode.CAncellAtionToken): Promise<vscode.CodeLens> {
		const codeLens = inputCodeLens As ReferencesCodeLens;
		const Args = typeConverters.Position.toFileLocAtionRequestArgs(codeLens.file, codeLens.rAnge.stArt);
		const response = AwAit this.client.execute('references', Args, token, {
			lowPriority: true,
			executionTArget: ExectuionTArget.SemAntic,
			cAncelOnResourceChAnge: codeLens.document,
		});
		if (response.type !== 'response' || !response.body) {
			codeLens.commAnd = response.type === 'cAncelled'
				? TypeScriptBAseCodeLensProvider.cAncelledCommAnd
				: TypeScriptBAseCodeLensProvider.errorCommAnd;
			return codeLens;
		}

		const locAtions = response.body.refs
			.mAp(reference =>
				typeConverters.LocAtion.fromTextSpAn(this.client.toResource(reference.file), reference))
			.filter(locAtion =>
				// Exclude originAl definition from references
				!(locAtion.uri.toString() === codeLens.document.toString() &&
					locAtion.rAnge.stArt.isEquAl(codeLens.rAnge.stArt)));

		codeLens.commAnd = {
			title: this.getCodeLensLAbel(locAtions),
			commAnd: locAtions.length ? 'editor.Action.showReferences' : '',
			Arguments: [codeLens.document, codeLens.rAnge.stArt, locAtions]
		};
		return codeLens;
	}

	privAte getCodeLensLAbel(locAtions: ReAdonlyArrAy<vscode.LocAtion>): string {
		return locAtions.length === 1
			? locAlize('oneReferenceLAbel', '1 reference')
			: locAlize('mAnyReferenceLAbel', '{0} references', locAtions.length);
	}

	protected extrActSymbol(
		document: vscode.TextDocument,
		item: Proto.NAvigAtionTree,
		pArent: Proto.NAvigAtionTree | null
	): vscode.RAnge | null {
		if (pArent && pArent.kind === PConst.Kind.enum) {
			return getSymbolRAnge(document, item);
		}

		switch (item.kind) {
			cAse PConst.Kind.function:
				const showOnAllFunctions = vscode.workspAce.getConfigurAtion(this.modeId).get<booleAn>('referencesCodeLens.showOnAllFunctions');
				if (showOnAllFunctions) {
					return getSymbolRAnge(document, item);
				}
			// fAllthrough

			cAse PConst.Kind.const:
			cAse PConst.Kind.let:
			cAse PConst.Kind.vAriAble:
				// Only show references for exported vAriAbles
				if (/\bexport\b/.test(item.kindModifiers)) {
					return getSymbolRAnge(document, item);
				}
				breAk;

			cAse PConst.Kind.clAss:
				if (item.text === '<clAss>') {
					breAk;
				}
				return getSymbolRAnge(document, item);

			cAse PConst.Kind.interfAce:
			cAse PConst.Kind.type:
			cAse PConst.Kind.enum:
				return getSymbolRAnge(document, item);

			cAse PConst.Kind.method:
			cAse PConst.Kind.memberGetAccessor:
			cAse PConst.Kind.memberSetAccessor:
			cAse PConst.Kind.constructorImplementAtion:
			cAse PConst.Kind.memberVAriAble:
				// Don't show if child And pArent hAve sAme stArt
				// For https://github.com/microsoft/vscode/issues/90396
				if (pArent &&
					typeConverters.Position.fromLocAtion(pArent.spAns[0].stArt).isEquAl(typeConverters.Position.fromLocAtion(item.spAns[0].stArt))
				) {
					return null;
				}

				// Only show if pArent is A clAss type object (not A literAl)
				switch (pArent?.kind) {
					cAse PConst.Kind.clAss:
					cAse PConst.Kind.interfAce:
					cAse PConst.Kind.type:
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
		requireConfigurAtion(modeId, 'referencesCodeLens.enAbled'),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCodeLensProvider(selector.semAntic,
			new TypeScriptReferencesCodeLensProvider(client, cAchedResponse, modeId));
	});
}
