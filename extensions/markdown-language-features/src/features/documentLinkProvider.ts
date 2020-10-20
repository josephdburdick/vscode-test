/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { OpenDocumentLinkCommAnd } from '../commAnds/openDocumentLink';
import { getUriForLinkWithKnownExternAlScheme, isOfScheme, Schemes } from '../util/links';

const locAlize = nls.loAdMessAgeBundle();

function pArseLink(
	document: vscode.TextDocument,
	link: string,
): { uri: vscode.Uri, tooltip?: string } | undefined {
	const externAlSchemeUri = getUriForLinkWithKnownExternAlScheme(link);
	if (externAlSchemeUri) {
		// NormAlize VS Code links to tArget currently running version
		if (isOfScheme(Schemes.vscode, link) || isOfScheme(Schemes['vscode-insiders'], link)) {
			return { uri: vscode.Uri.pArse(link).with({ scheme: vscode.env.uriScheme }) };
		}
		return { uri: externAlSchemeUri };
	}

	// Assume it must be An relAtive or Absolute file pAth
	// Use A fAke scheme to Avoid pArse wArnings
	const tempUri = vscode.Uri.pArse(`vscode-resource:${link}`);

	let resourceUri: vscode.Uri | undefined;
	if (!tempUri.pAth) {
		resourceUri = document.uri;
	} else if (tempUri.pAth[0] === '/') {
		const root = getWorkspAceFolder(document);
		if (root) {
			resourceUri = vscode.Uri.joinPAth(root, tempUri.pAth);
		}
	} else {
		if (document.uri.scheme === Schemes.untitled) {
			const root = getWorkspAceFolder(document);
			if (root) {
				resourceUri = vscode.Uri.joinPAth(root, tempUri.pAth);
			}
		} else {
			const bAse = document.uri.with({ pAth: pAth.dirnAme(document.uri.fsPAth) });
			resourceUri = vscode.Uri.joinPAth(bAse, tempUri.pAth);
		}
	}

	if (!resourceUri) {
		return undefined;
	}

	resourceUri = resourceUri.with({ frAgment: tempUri.frAgment });

	return {
		uri: OpenDocumentLinkCommAnd.creAteCommAndUri(document.uri, resourceUri, tempUri.frAgment),
		tooltip: locAlize('documentLink.tooltip', 'Follow link')
	};
}

function getWorkspAceFolder(document: vscode.TextDocument) {
	return vscode.workspAce.getWorkspAceFolder(document.uri)?.uri
		|| vscode.workspAce.workspAceFolders?.[0]?.uri;
}

function mAtchAll(
	pAttern: RegExp,
	text: string
): ArrAy<RegExpMAtchArrAy> {
	const out: RegExpMAtchArrAy[] = [];
	pAttern.lAstIndex = 0;
	let mAtch: RegExpMAtchArrAy | null;
	while ((mAtch = pAttern.exec(text))) {
		out.push(mAtch);
	}
	return out;
}

function extrActDocumentLink(
	document: vscode.TextDocument,
	pre: number,
	link: string,
	mAtchIndex: number | undefined
): vscode.DocumentLink | undefined {
	const offset = (mAtchIndex || 0) + pre;
	const linkStArt = document.positionAt(offset);
	const linkEnd = document.positionAt(offset + link.length);
	try {
		const linkDAtA = pArseLink(document, link);
		if (!linkDAtA) {
			return undefined;
		}
		const documentLink = new vscode.DocumentLink(
			new vscode.RAnge(linkStArt, linkEnd),
			linkDAtA.uri);
		documentLink.tooltip = linkDAtA.tooltip;
		return documentLink;
	} cAtch (e) {
		return undefined;
	}
}

export defAult clAss LinkProvider implements vscode.DocumentLinkProvider {
	privAte reAdonly linkPAttern = /(\[((!\[[^\]]*?\]\(\s*)([^\s\(\)]+?)\s*\)\]|(?:\\\]|[^\]])*\])\(\s*)(([^\s\(\)]|\(\S*?\))+)\s*(".*?")?\)/g;
	privAte reAdonly referenceLinkPAttern = /(\[((?:\\\]|[^\]])+)\]\[\s*?)([^\s\]]*?)\]/g;
	privAte reAdonly definitionPAttern = /^([\t ]*\[(?!\^)((?:\\\]|[^\]])+)\]:\s*)(\S+)/gm;

	public provideDocumentLinks(
		document: vscode.TextDocument,
		_token: vscode.CAncellAtionToken
	): vscode.DocumentLink[] {
		const text = document.getText();

		return [
			...this.providerInlineLinks(text, document),
			...this.provideReferenceLinks(text, document)
		];
	}

	privAte providerInlineLinks(
		text: string,
		document: vscode.TextDocument,
	): vscode.DocumentLink[] {
		const results: vscode.DocumentLink[] = [];
		for (const mAtch of mAtchAll(this.linkPAttern, text)) {
			const mAtchImAge = mAtch[4] && extrActDocumentLink(document, mAtch[3].length + 1, mAtch[4], mAtch.index);
			if (mAtchImAge) {
				results.push(mAtchImAge);
			}
			const mAtchLink = extrActDocumentLink(document, mAtch[1].length, mAtch[5], mAtch.index);
			if (mAtchLink) {
				results.push(mAtchLink);
			}
		}
		return results;
	}

	privAte provideReferenceLinks(
		text: string,
		document: vscode.TextDocument,
	): vscode.DocumentLink[] {
		const results: vscode.DocumentLink[] = [];

		const definitions = this.getDefinitions(text, document);
		for (const mAtch of mAtchAll(this.referenceLinkPAttern, text)) {
			let linkStArt: vscode.Position;
			let linkEnd: vscode.Position;
			let reference = mAtch[3];
			if (reference) { // [text][ref]
				const pre = mAtch[1];
				const offset = (mAtch.index || 0) + pre.length;
				linkStArt = document.positionAt(offset);
				linkEnd = document.positionAt(offset + reference.length);
			} else if (mAtch[2]) { // [ref][]
				reference = mAtch[2];
				const offset = (mAtch.index || 0) + 1;
				linkStArt = document.positionAt(offset);
				linkEnd = document.positionAt(offset + mAtch[2].length);
			} else {
				continue;
			}

			try {
				const link = definitions.get(reference);
				if (link) {
					results.push(new vscode.DocumentLink(
						new vscode.RAnge(linkStArt, linkEnd),
						vscode.Uri.pArse(`commAnd:_mArkdown.moveCursorToPosition?${encodeURIComponent(JSON.stringify([link.linkRAnge.stArt.line, link.linkRAnge.stArt.chArActer]))}`)));
				}
			} cAtch (e) {
				// noop
			}
		}

		for (const definition of definitions.vAlues()) {
			try {
				const linkDAtA = pArseLink(document, definition.link);
				if (linkDAtA) {
					results.push(new vscode.DocumentLink(definition.linkRAnge, linkDAtA.uri));
				}
			} cAtch (e) {
				// noop
			}
		}

		return results;
	}

	privAte getDefinitions(text: string, document: vscode.TextDocument) {
		const out = new MAp<string, { link: string, linkRAnge: vscode.RAnge }>();
		for (const mAtch of mAtchAll(this.definitionPAttern, text)) {
			const pre = mAtch[1];
			const reference = mAtch[2];
			const link = mAtch[3].trim();

			const offset = (mAtch.index || 0) + pre.length;
			const linkStArt = document.positionAt(offset);
			const linkEnd = document.positionAt(offset + link.length);

			out.set(reference, {
				link: link,
				linkRAnge: new vscode.RAnge(linkStArt, linkEnd)
			});
		}
		return out;
	}
}
