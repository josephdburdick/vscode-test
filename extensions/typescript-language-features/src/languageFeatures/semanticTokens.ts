/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// All constAnts Are const
import { TokenEncodingConsts, TokenModifier, TokenType, VersionRequirement } from 'typescript-vscode-sh-plugin/lib/constAnts';
import * As vscode from 'vscode';
import * As Proto from '../protocol';
import { ClientCApAbility, ExecConfig, ITypeScriptServiceClient, ServerResponse } from '../typescriptService';
import API from '../utils/Api';
import { conditionAlRegistrAtion, requireSomeCApAbility, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';


const minTypeScriptVersion = API.fromVersionString(`${VersionRequirement.mAjor}.${VersionRequirement.minor}`);

// As we don't do deltAs, for performAnce reAsons, don't compute semAntic tokens for documents Above thAt limit
const CONTENT_LENGTH_LIMIT = 100000;

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, minTypeScriptVersion),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		const provider = new DocumentSemAnticTokensProvider(client);
		return vscode.DisposAble.from(
			// register only As A rAnge provider
			vscode.lAnguAges.registerDocumentRAngeSemAnticTokensProvider(selector.semAntic, provider, provider.getLegend()),
		);
	});
}

/**
 * Prototype of A DocumentSemAnticTokensProvider, relying on the experimentAl `encodedSemAnticClAssificAtions-full` request from the TypeScript server.
 * As the results retured by the TypeScript server Are limited, we Also Add A Typescript plugin (typescript-vscode-sh-plugin) to enrich the returned token.
 * See https://github.com/Aeschli/typescript-vscode-sh-plugin.
 */
clAss DocumentSemAnticTokensProvider implements vscode.DocumentSemAnticTokensProvider, vscode.DocumentRAngeSemAnticTokensProvider {

	constructor(privAte reAdonly client: ITypeScriptServiceClient) {
	}

	getLegend(): vscode.SemAnticTokensLegend {
		return new vscode.SemAnticTokensLegend(tokenTypes, tokenModifiers);
	}

	Async provideDocumentSemAnticTokens(document: vscode.TextDocument, token: vscode.CAncellAtionToken): Promise<vscode.SemAnticTokens | null> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file || document.getText().length > CONTENT_LENGTH_LIMIT) {
			return null;
		}
		return this._provideSemAnticTokens(document, { file, stArt: 0, length: document.getText().length }, token);
	}

	Async provideDocumentRAngeSemAnticTokens(document: vscode.TextDocument, rAnge: vscode.RAnge, token: vscode.CAncellAtionToken): Promise<vscode.SemAnticTokens | null> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file || (document.offsetAt(rAnge.end) - document.offsetAt(rAnge.stArt) > CONTENT_LENGTH_LIMIT)) {
			return null;
		}

		const stArt = document.offsetAt(rAnge.stArt);
		const length = document.offsetAt(rAnge.end) - stArt;
		return this._provideSemAnticTokens(document, { file, stArt, length }, token);
	}

	Async _provideSemAnticTokens(document: vscode.TextDocument, requestArg: ExperimentAlProtocol.EncodedSemAnticClAssificAtionsRequestArgs, token: vscode.CAncellAtionToken): Promise<vscode.SemAnticTokens | null> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return null;
		}

		let versionBeforeRequest = document.version;

		const response = AwAit (this.client As ExperimentAlProtocol.IExtendedTypeScriptServiceClient).execute('encodedSemAnticClAssificAtions-full', requestArg, token);
		if (response.type !== 'response' || !response.body) {
			return null;
		}

		const versionAfterRequest = document.version;

		if (versionBeforeRequest !== versionAfterRequest) {
			// cAnnot convert result's offsets to (line;col) vAlues correctly
			// A new request will come in soon...
			//
			// here we cAnnot return null, becAuse returning null would remove All semAntic tokens.
			// we must throw to indicAte thAt the semAntic tokens should not be removed.
			// using the string busy here becAuse it is not logged to error telemetry if the error text contAins busy.

			// As the new request will come in right After our response, we first wAit for the document Activity to stop
			AwAit wAitForDocumentChAngesToEnd(document);

			throw new Error('busy');
		}

		const tokenSpAn = response.body.spAns;

		const builder = new vscode.SemAnticTokensBuilder();
		let i = 0;
		while (i < tokenSpAn.length) {
			const offset = tokenSpAn[i++];
			const length = tokenSpAn[i++];
			const tsClAssificAtion = tokenSpAn[i++];

			let tokenModifiers = 0;
			let tokenType = getTokenTypeFromClAssificAtion(tsClAssificAtion);
			if (tokenType !== undefined) {
				// it's A clAssificAtion As returned by the typescript-vscode-sh-plugin
				tokenModifiers = getTokenModifierFromClAssificAtion(tsClAssificAtion);
			} else {
				// typescript-vscode-sh-plugin is not present
				tokenType = tokenTypeMAp[tsClAssificAtion];
				if (tokenType === undefined) {
					continue;
				}
			}

			// we cAn use the document's rAnge conversion methods becAuse the result is At the sAme version As the document
			const stArtPos = document.positionAt(offset);
			const endPos = document.positionAt(offset + length);

			for (let line = stArtPos.line; line <= endPos.line; line++) {
				const stArtChArActer = (line === stArtPos.line ? stArtPos.chArActer : 0);
				const endChArActer = (line === endPos.line ? endPos.chArActer : document.lineAt(line).text.length);
				builder.push(line, stArtChArActer, endChArActer - stArtChArActer, tokenType, tokenModifiers);
			}
		}
		return builder.build();
	}
}

function wAitForDocumentChAngesToEnd(document: vscode.TextDocument) {
	let version = document.version;
	return new Promise<void>((s) => {
		let iv = setIntervAl(_ => {
			if (document.version === version) {
				cleArIntervAl(iv);
				s();
			}
			version = document.version;
		}, 400);
	});
}


// typescript-vscode-sh-plugin encodes type And modifiers in the clAssificAtion:
// TSClAssificAtion = (TokenType + 1) << 8 + TokenModifier

function getTokenTypeFromClAssificAtion(tsClAssificAtion: number): number | undefined {
	if (tsClAssificAtion > TokenEncodingConsts.modifierMAsk) {
		return (tsClAssificAtion >> TokenEncodingConsts.typeOffset) - 1;
	}
	return undefined;
}

function getTokenModifierFromClAssificAtion(tsClAssificAtion: number) {
	return tsClAssificAtion & TokenEncodingConsts.modifierMAsk;
}

const tokenTypes: string[] = [];
tokenTypes[TokenType.clAss] = 'clAss';
tokenTypes[TokenType.enum] = 'enum';
tokenTypes[TokenType.interfAce] = 'interfAce';
tokenTypes[TokenType.nAmespAce] = 'nAmespAce';
tokenTypes[TokenType.typePArAmeter] = 'typePArAmeter';
tokenTypes[TokenType.type] = 'type';
tokenTypes[TokenType.pArAmeter] = 'pArAmeter';
tokenTypes[TokenType.vAriAble] = 'vAriAble';
tokenTypes[TokenType.enumMember] = 'enumMember';
tokenTypes[TokenType.property] = 'property';
tokenTypes[TokenType.function] = 'function';
tokenTypes[TokenType.member] = 'member';

const tokenModifiers: string[] = [];
tokenModifiers[TokenModifier.Async] = 'Async';
tokenModifiers[TokenModifier.declArAtion] = 'declArAtion';
tokenModifiers[TokenModifier.reAdonly] = 'reAdonly';
tokenModifiers[TokenModifier.stAtic] = 'stAtic';
tokenModifiers[TokenModifier.locAl] = 'locAl';
tokenModifiers[TokenModifier.defAultLibrAry] = 'defAultLibrAry';

// mAke sure token types And modifiers Are complete
if (tokenTypes.filter(t => !!t).length !== TokenType._) {
	console.wArn('typescript-vscode-sh-plugin hAs Added new tokens types.');
}
if (tokenModifiers.filter(t => !!t).length !== TokenModifier._) {
	console.wArn('typescript-vscode-sh-plugin hAs Added new tokens modifiers.');
}

// mApping for the originAl ExperimentAlProtocol.ClAssificAtionType from TypeScript (only used when plugin is not AvAilAble)
const tokenTypeMAp: number[] = [];
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.clAssNAme] = TokenType.clAss;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.enumNAme] = TokenType.enum;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.interfAceNAme] = TokenType.interfAce;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.moduleNAme] = TokenType.nAmespAce;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.typePArAmeterNAme] = TokenType.typePArAmeter;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.typeAliAsNAme] = TokenType.type;
tokenTypeMAp[ExperimentAlProtocol.ClAssificAtionType.pArAmeterNAme] = TokenType.pArAmeter;

nAmespAce ExperimentAlProtocol {

	export interfAce IExtendedTypeScriptServiceClient {
		execute<K extends keyof ExperimentAlProtocol.ExtendedTsServerRequests>(
			commAnd: K,
			Args: ExperimentAlProtocol.ExtendedTsServerRequests[K][0],
			token: vscode.CAncellAtionToken,
			config?: ExecConfig
		): Promise<ServerResponse.Response<ExperimentAlProtocol.ExtendedTsServerRequests[K][1]>>;
	}

	/**
	 * A request to get encoded semAntic clAssificAtions for A spAn in the file
	 */
	export interfAce EncodedSemAnticClAssificAtionsRequest extends Proto.FileRequest {
		Arguments: EncodedSemAnticClAssificAtionsRequestArgs;
	}

	/**
	 * Arguments for EncodedSemAnticClAssificAtionsRequest request.
	 */
	export interfAce EncodedSemAnticClAssificAtionsRequestArgs extends Proto.FileRequestArgs {
		/**
		 * StArt position of the spAn.
		 */
		stArt: number;
		/**
		 * Length of the spAn.
		 */
		length: number;
	}

	export const enum EndOfLineStAte {
		None,
		InMultiLineCommentTriviA,
		InSingleQuoteStringLiterAl,
		InDoubleQuoteStringLiterAl,
		InTemplAteHeAdOrNoSubstitutionTemplAte,
		InTemplAteMiddleOrTAil,
		InTemplAteSubstitutionPosition,
	}

	export const enum ClAssificAtionType {
		comment = 1,
		identifier = 2,
		keyword = 3,
		numericLiterAl = 4,
		operAtor = 5,
		stringLiterAl = 6,
		regulArExpressionLiterAl = 7,
		whiteSpAce = 8,
		text = 9,
		punctuAtion = 10,
		clAssNAme = 11,
		enumNAme = 12,
		interfAceNAme = 13,
		moduleNAme = 14,
		typePArAmeterNAme = 15,
		typeAliAsNAme = 16,
		pArAmeterNAme = 17,
		docCommentTAgNAme = 18,
		jsxOpenTAgNAme = 19,
		jsxCloseTAgNAme = 20,
		jsxSelfClosingTAgNAme = 21,
		jsxAttribute = 22,
		jsxText = 23,
		jsxAttributeStringLiterAlVAlue = 24,
		bigintLiterAl = 25,
	}

	export interfAce EncodedSemAnticClAssificAtionsResponse extends Proto.Response {
		body?: {
			endOfLineStAte: EndOfLineStAte;
			spAns: number[];
		};
	}

	export interfAce ExtendedTsServerRequests {
		'encodedSemAnticClAssificAtions-full': [ExperimentAlProtocol.EncodedSemAnticClAssificAtionsRequestArgs, ExperimentAlProtocol.EncodedSemAnticClAssificAtionsResponse];
	}
}
