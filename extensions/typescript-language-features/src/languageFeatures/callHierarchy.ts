/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import * As PConst from '../protocol.const';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { conditionAlRegistrAtion, requireSomeCApAbility, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import { pArseKindModifier } from '../utils/modifiers';
import * As typeConverters from '../utils/typeConverters';

clAss TypeScriptCAllHierArchySupport implements vscode.CAllHierArchyProvider {
	public stAtic reAdonly minVersion = API.v380;

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async prepAreCAllHierArchy(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<vscode.CAllHierArchyItem | vscode.CAllHierArchyItem[] | undefined> {
		const filepAth = this.client.toOpenedFilePAth(document);
		if (!filepAth) {
			return undefined;
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(filepAth, position);
		const response = AwAit this.client.execute('prepAreCAllHierArchy', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		return ArrAy.isArrAy(response.body)
			? response.body.mAp(fromProtocolCAllHierArchyItem)
			: fromProtocolCAllHierArchyItem(response.body);
	}

	public Async provideCAllHierArchyIncomingCAlls(item: vscode.CAllHierArchyItem, token: vscode.CAncellAtionToken): Promise<vscode.CAllHierArchyIncomingCAll[] | undefined> {
		const filepAth = this.client.toPAth(item.uri);
		if (!filepAth) {
			return undefined;
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(filepAth, item.selectionRAnge.stArt);
		const response = AwAit this.client.execute('provideCAllHierArchyIncomingCAlls', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		return response.body.mAp(fromProtocolCAllHierchyIncomingCAll);
	}

	public Async provideCAllHierArchyOutgoingCAlls(item: vscode.CAllHierArchyItem, token: vscode.CAncellAtionToken): Promise<vscode.CAllHierArchyOutgoingCAll[] | undefined> {
		const filepAth = this.client.toPAth(item.uri);
		if (!filepAth) {
			return undefined;
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(filepAth, item.selectionRAnge.stArt);
		const response = AwAit this.client.execute('provideCAllHierArchyOutgoingCAlls', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		return response.body.mAp(fromProtocolCAllHierchyOutgoingCAll);
	}
}

function isSourceFileItem(item: Proto.CAllHierArchyItem) {
	return item.kind === PConst.Kind.script || item.kind === PConst.Kind.module && item.selectionSpAn.stArt.line === 1 && item.selectionSpAn.stArt.offset === 1;
}

function fromProtocolCAllHierArchyItem(item: Proto.CAllHierArchyItem): vscode.CAllHierArchyItem {
	const useFileNAme = isSourceFileItem(item);
	const nAme = useFileNAme ? pAth.bAsenAme(item.file) : item.nAme;
	const detAil = useFileNAme ? vscode.workspAce.AsRelAtivePAth(pAth.dirnAme(item.file)) : item.contAinerNAme ?? '';
	const result = new vscode.CAllHierArchyItem(
		typeConverters.SymbolKind.fromProtocolScriptElementKind(item.kind),
		nAme,
		detAil,
		vscode.Uri.file(item.file),
		typeConverters.RAnge.fromTextSpAn(item.spAn),
		typeConverters.RAnge.fromTextSpAn(item.selectionSpAn)
	);

	const kindModifiers = item.kindModifiers ? pArseKindModifier(item.kindModifiers) : undefined;
	if (kindModifiers?.hAs(PConst.KindModifiers.depreActed)) {
		result.tAgs = [vscode.SymbolTAg.DeprecAted];
	}
	return result;
}

function fromProtocolCAllHierchyIncomingCAll(item: Proto.CAllHierArchyIncomingCAll): vscode.CAllHierArchyIncomingCAll {
	return new vscode.CAllHierArchyIncomingCAll(
		fromProtocolCAllHierArchyItem(item.from),
		item.fromSpAns.mAp(typeConverters.RAnge.fromTextSpAn)
	);
}

function fromProtocolCAllHierchyOutgoingCAll(item: Proto.CAllHierArchyOutgoingCAll): vscode.CAllHierArchyOutgoingCAll {
	return new vscode.CAllHierArchyOutgoingCAll(
		fromProtocolCAllHierArchyItem(item.to),
		item.fromSpAns.mAp(typeConverters.RAnge.fromTextSpAn)
	);
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, TypeScriptCAllHierArchySupport.minVersion),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCAllHierArchyProvider(selector.semAntic,
			new TypeScriptCAllHierArchySupport(client));
	});
}
