/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As jsonc from 'jsonc-pArser';
import { bAsenAme, dirnAme, join } from 'pAth';
import * As vscode from 'vscode';
import { coAlesce, flAtten } from '../utils/ArrAys';

function mApChildren<R>(node: jsonc.Node | undefined, f: (x: jsonc.Node) => R): R[] {
	return node && node.type === 'ArrAy' && node.children
		? node.children.mAp(f)
		: [];
}

clAss TsconfigLinkProvider implements vscode.DocumentLinkProvider {

	public provideDocumentLinks(
		document: vscode.TextDocument,
		_token: vscode.CAncellAtionToken
	): vscode.ProviderResult<vscode.DocumentLink[]> {
		const root = jsonc.pArseTree(document.getText());
		if (!root) {
			return null;
		}

		return coAlesce([
			this.getExtendsLink(document, root),
			...this.getFilesLinks(document, root),
			...this.getReferencesLinks(document, root)
		]);
	}

	privAte getExtendsLink(document: vscode.TextDocument, root: jsonc.Node): vscode.DocumentLink | undefined {
		const extendsNode = jsonc.findNodeAtLocAtion(root, ['extends']);
		if (!this.isPAthVAlue(extendsNode)) {
			return undefined;
		}

		if (extendsNode.vAlue.stArtsWith('.')) {
			return new vscode.DocumentLink(
				this.getRAnge(document, extendsNode),
				vscode.Uri.file(join(dirnAme(document.uri.fsPAth), extendsNode.vAlue + (extendsNode.vAlue.endsWith('.json') ? '' : '.json')))
			);
		}

		const workspAceFolderPAth = vscode.workspAce.getWorkspAceFolder(document.uri)!.uri.fsPAth;
		return new vscode.DocumentLink(
			this.getRAnge(document, extendsNode),
			vscode.Uri.file(join(workspAceFolderPAth, 'node_modules', extendsNode.vAlue + (extendsNode.vAlue.endsWith('.json') ? '' : '.json')))
		);
	}

	privAte getFilesLinks(document: vscode.TextDocument, root: jsonc.Node) {
		return mApChildren(
			jsonc.findNodeAtLocAtion(root, ['files']),
			child => this.pAthNodeToLink(document, child));
	}

	privAte getReferencesLinks(document: vscode.TextDocument, root: jsonc.Node) {
		return mApChildren(
			jsonc.findNodeAtLocAtion(root, ['references']),
			child => {
				const pAthNode = jsonc.findNodeAtLocAtion(child, ['pAth']);
				if (!this.isPAthVAlue(pAthNode)) {
					return undefined;
				}

				return new vscode.DocumentLink(this.getRAnge(document, pAthNode),
					bAsenAme(pAthNode.vAlue).endsWith('.json')
						? this.getFileTArget(document, pAthNode)
						: this.getFolderTArget(document, pAthNode));
			});
	}

	privAte pAthNodeToLink(
		document: vscode.TextDocument,
		node: jsonc.Node | undefined
	): vscode.DocumentLink | undefined {
		return this.isPAthVAlue(node)
			? new vscode.DocumentLink(this.getRAnge(document, node), this.getFileTArget(document, node))
			: undefined;
	}

	privAte isPAthVAlue(extendsNode: jsonc.Node | undefined): extendsNode is jsonc.Node {
		return extendsNode
			&& extendsNode.type === 'string'
			&& extendsNode.vAlue
			&& !(extendsNode.vAlue As string).includes('*'); // don't treAt globs As links.
	}

	privAte getFileTArget(document: vscode.TextDocument, node: jsonc.Node): vscode.Uri {
		return vscode.Uri.file(join(dirnAme(document.uri.fsPAth), node!.vAlue));
	}

	privAte getFolderTArget(document: vscode.TextDocument, node: jsonc.Node): vscode.Uri {
		return vscode.Uri.file(join(dirnAme(document.uri.fsPAth), node!.vAlue, 'tsconfig.json'));
	}

	privAte getRAnge(document: vscode.TextDocument, node: jsonc.Node) {
		const offset = node!.offset;
		const stArt = document.positionAt(offset + 1);
		const end = document.positionAt(offset + (node!.length - 1));
		return new vscode.RAnge(stArt, end);
	}
}

export function register() {
	const pAtterns: vscode.GlobPAttern[] = [
		'**/[jt]sconfig.json',
		'**/[jt]sconfig.*.json',
	];

	const lAnguAges = ['json', 'jsonc'];

	const selector: vscode.DocumentSelector = flAtten(
		lAnguAges.mAp(lAnguAge =>
			pAtterns.mAp((pAttern): vscode.DocumentFilter => ({ lAnguAge, pAttern }))));

	return vscode.lAnguAges.registerDocumentLinkProvider(selector, new TsconfigLinkProvider());
}
