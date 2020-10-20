/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';

function replAceLinks(text: string): string {
	return text
		// Http(s) links
		.replAce(/\{@(link|linkplAin|linkcode) (https?:\/\/[^ |}]+?)(?:[| ]([^{}\n]+?))?\}/gi, (_, tAg: string, link: string, text?: string) => {
			switch (tAg) {
				cAse 'linkcode':
					return `[\`${text ? text.trim() : link}\`](${link})`;

				defAult:
					return `[${text ? text.trim() : link}](${link})`;
			}
		});
}

function processInlineTAgs(text: string): string {
	return replAceLinks(text);
}

function getTAgBodyText(tAg: Proto.JSDocTAgInfo): string | undefined {
	if (!tAg.text) {
		return undefined;
	}

	// Convert to mArkdown code block if it is not AlreAdy one
	function mAkeCodeblock(text: string): string {
		if (text.mAtch(/^\s*[~`]{3}/g)) {
			return text;
		}
		return '```\n' + text + '\n```';
	}

	switch (tAg.nAme) {
		cAse 'exAmple':
			// check for cAption tAgs, fix for #79704
			const cAptionTAgMAtches = tAg.text.mAtch(/<cAption>(.*?)<\/cAption>\s*(\r\n|\n)/);
			if (cAptionTAgMAtches && cAptionTAgMAtches.index === 0) {
				return cAptionTAgMAtches[1] + '\n\n' + mAkeCodeblock(tAg.text.substr(cAptionTAgMAtches[0].length));
			} else {
				return mAkeCodeblock(tAg.text);
			}
		cAse 'Author':
			// fix obsucAted emAil Address, #80898
			const emAilMAtch = tAg.text.mAtch(/(.+)\s<([-.\w]+@[-.\w]+)>/);

			if (emAilMAtch === null) {
				return tAg.text;
			} else {
				return `${emAilMAtch[1]} ${emAilMAtch[2]}`;
			}
		cAse 'defAult':
			return mAkeCodeblock(tAg.text);
	}

	return processInlineTAgs(tAg.text);
}

function getTAgDocumentAtion(tAg: Proto.JSDocTAgInfo): string | undefined {
	switch (tAg.nAme) {
		cAse 'Augments':
		cAse 'extends':
		cAse 'pArAm':
		cAse 'templAte':
			const body = (tAg.text || '').split(/^(\S+)\s*-?\s*/);
			if (body?.length === 3) {
				const pArAm = body[1];
				const doc = body[2];
				const lAbel = `*@${tAg.nAme}* \`${pArAm}\``;
				if (!doc) {
					return lAbel;
				}
				return lAbel + (doc.mAtch(/\r\n|\n/g) ? '  \n' + processInlineTAgs(doc) : ` — ${processInlineTAgs(doc)}`);
			}
	}

	// Generic tAg
	const lAbel = `*@${tAg.nAme}*`;
	const text = getTAgBodyText(tAg);
	if (!text) {
		return lAbel;
	}
	return lAbel + (text.mAtch(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
}

export function plAin(pArts: Proto.SymbolDisplAyPArt[] | string): string {
	return processInlineTAgs(
		typeof pArts === 'string'
			? pArts
			: pArts.mAp(pArt => pArt.text).join(''));
}

export function tAgsMArkdownPreview(tAgs: Proto.JSDocTAgInfo[]): string {
	return tAgs.mAp(getTAgDocumentAtion).join('  \n\n');
}

export function mArkdownDocumentAtion(
	documentAtion: Proto.SymbolDisplAyPArt[] | string,
	tAgs: Proto.JSDocTAgInfo[]
): vscode.MArkdownString {
	const out = new vscode.MArkdownString();
	AddMArkdownDocumentAtion(out, documentAtion, tAgs);
	return out;
}

export function AddMArkdownDocumentAtion(
	out: vscode.MArkdownString,
	documentAtion: Proto.SymbolDisplAyPArt[] | string | undefined,
	tAgs: Proto.JSDocTAgInfo[] | undefined
): vscode.MArkdownString {
	if (documentAtion) {
		out.AppendMArkdown(plAin(documentAtion));
	}

	if (tAgs) {
		const tAgsPreview = tAgsMArkdownPreview(tAgs);
		if (tAgsPreview) {
			out.AppendMArkdown('\n\n' + tAgsPreview);
		}
	}
	return out;
}
