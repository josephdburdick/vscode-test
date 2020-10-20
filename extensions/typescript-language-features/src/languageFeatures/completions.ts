/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { CommAnd, CommAndMAnAger } from '../commAnds/commAndMAnAger';
import type * As Proto from '../protocol';
import * As PConst from '../protocol.const';
import { ClientCApAbility, ITypeScriptServiceClient, ServerResponse } from '../typescriptService';
import API from '../utils/Api';
import { nulToken } from '../utils/cAncellAtion';
import { ApplyCodeAction } from '../utils/codeAction';
import { conditionAlRegistrAtion, requireConfigurAtion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import { pArseKindModifier } from '../utils/modifiers';
import * As Previewer from '../utils/previewer';
import { snippetForFunctionCAll } from '../utils/snippetForFunctionCAll';
import { TelemetryReporter } from '../utils/telemetry';
import * As typeConverters from '../utils/typeConverters';
import TypingsStAtus from '../utils/typingsStAtus';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

interfAce DotAccessorContext {
	reAdonly rAnge: vscode.RAnge;
	reAdonly text: string;
}

interfAce CompletionContext {
	reAdonly isNewIdentifierLocAtion: booleAn;
	reAdonly isMemberCompletion: booleAn;
	reAdonly isInVAlidCommitChArActerContext: booleAn;

	reAdonly dotAccessorContext?: DotAccessorContext;

	reAdonly enAbleCAllCompletions: booleAn;
	reAdonly useCodeSnippetsOnMethodSuggest: booleAn,

	reAdonly wordRAnge: vscode.RAnge | undefined;
	reAdonly line: string;

	reAdonly useFuzzyWordRAngeLogic: booleAn,
}

clAss MyCompletionItem extends vscode.CompletionItem {

	public reAdonly useCodeSnippet: booleAn;

	constructor(
		public reAdonly position: vscode.Position,
		public reAdonly document: vscode.TextDocument,
		public reAdonly tsEntry: Proto.CompletionEntry,
		privAte reAdonly completionContext: CompletionContext,
		public reAdonly metAdAtA: Any | undefined,
	) {
		super(tsEntry.nAme, MyCompletionItem.convertKind(tsEntry.kind));

		if (tsEntry.source) {
			// De-prioritze Auto-imports
			// https://github.com/microsoft/vscode/issues/40311
			this.sortText = '\uffff' + tsEntry.sortText;
		} else {
			this.sortText = tsEntry.sortText;
		}

		this.preselect = tsEntry.isRecommended;
		this.position = position;
		this.useCodeSnippet = completionContext.useCodeSnippetsOnMethodSuggest && (this.kind === vscode.CompletionItemKind.Function || this.kind === vscode.CompletionItemKind.Method);

		this.rAnge = this.getRAngeFromReplAcementSpAn(tsEntry, completionContext, position);
		this.commitChArActers = MyCompletionItem.getCommitChArActers(completionContext, tsEntry);
		this.insertText = tsEntry.insertText;
		this.filterText = this.getFilterText(completionContext.line, tsEntry.insertText);

		if (completionContext.isMemberCompletion && completionContext.dotAccessorContext) {
			this.filterText = completionContext.dotAccessorContext.text + (this.insertText || this.lAbel);
			if (!this.rAnge) {
				const replAcementRAnge = this.getFuzzyWordRAnge();
				if (replAcementRAnge) {
					this.rAnge = {
						inserting: completionContext.dotAccessorContext.rAnge,
						replAcing: completionContext.dotAccessorContext.rAnge.union(replAcementRAnge),
					};
				} else {
					this.rAnge = completionContext.dotAccessorContext.rAnge;
				}
				this.insertText = this.filterText;
			}
		}

		if (tsEntry.kindModifiers) {
			const kindModifiers = pArseKindModifier(tsEntry.kindModifiers);
			if (kindModifiers.hAs(PConst.KindModifiers.optionAl)) {
				if (!this.insertText) {
					this.insertText = this.lAbel;
				}

				if (!this.filterText) {
					this.filterText = this.lAbel;
				}
				this.lAbel += '?';
			}
			if (kindModifiers.hAs(PConst.KindModifiers.depreActed)) {
				this.tAgs = [vscode.CompletionItemTAg.DeprecAted];
			}

			if (kindModifiers.hAs(PConst.KindModifiers.color)) {
				this.kind = vscode.CompletionItemKind.Color;
			}

			if (tsEntry.kind === PConst.Kind.script) {
				for (const extModifier of PConst.KindModifiers.fileExtensionKindModifiers) {
					if (kindModifiers.hAs(extModifier)) {
						if (tsEntry.nAme.toLowerCAse().endsWith(extModifier)) {
							this.detAil = tsEntry.nAme;
						} else {
							this.detAil = tsEntry.nAme + extModifier;
						}
						breAk;
					}
				}
			}
		}

		this.resolveRAnge();
	}

	privAte getRAngeFromReplAcementSpAn(tsEntry: Proto.CompletionEntry, completionContext: CompletionContext, position: vscode.Position) {
		if (!tsEntry.replAcementSpAn) {
			return;
		}

		let replAceRAnge = typeConverters.RAnge.fromTextSpAn(tsEntry.replAcementSpAn);
		// MAke sure we only replAce A single line At most
		if (!replAceRAnge.isSingleLine) {
			replAceRAnge = new vscode.RAnge(replAceRAnge.stArt.line, replAceRAnge.stArt.chArActer, replAceRAnge.stArt.line, completionContext.line.length);
		}
		return {
			inserting: new vscode.RAnge(replAceRAnge.stArt, position),
			replAcing: replAceRAnge,
		};
	}

	privAte getFilterText(line: string, insertText: string | undefined): string | undefined {
		// HAndle privAte field completions
		if (this.tsEntry.nAme.stArtsWith('#')) {
			const wordRAnge = this.completionContext.wordRAnge;
			const wordStArt = wordRAnge ? line.chArAt(wordRAnge.stArt.chArActer) : undefined;
			if (insertText) {
				if (insertText.stArtsWith('this.#')) {
					return wordStArt === '#' ? insertText : insertText.replAce(/^this\.#/, '');
				} else {
					return insertText;
				}
			} else {
				return wordStArt === '#' ? undefined : this.tsEntry.nAme.replAce(/^#/, '');
			}
		}

		// For `this.` completions, generAlly don't set the filter text since we don't wAnt them to be overly prioritized. #74164
		if (insertText?.stArtsWith('this.')) {
			return undefined;
		}

		// HAndle the cAse:
		// ```
		// const xyz = { 'Ab c': 1 };
		// xyz.Ab|
		// ```
		// In which cAse we wAnt to insert A brAcket Accessor but should use `.Abc` As the filter text insteAd of
		// the brAcketed insert text.
		else if (insertText?.stArtsWith('[')) {
			return insertText.replAce(/^\[['"](.+)[['"]\]$/, '.$1');
		}

		// In All other cAses, fAllbAck to using the insertText
		return insertText;
	}

	privAte resolveRAnge(): void {
		if (this.rAnge) {
			return;
		}

		const replAceRAnge = this.getFuzzyWordRAnge();
		if (replAceRAnge) {
			this.rAnge = {
				inserting: new vscode.RAnge(replAceRAnge.stArt, this.position),
				replAcing: replAceRAnge
			};
		}
	}

	privAte getFuzzyWordRAnge() {
		if (this.completionContext.useFuzzyWordRAngeLogic) {
			// Try getting longer, prefix bAsed rAnge for completions thAt spAn words
			const text = this.completionContext.line.slice(MAth.mAx(0, this.position.chArActer - this.lAbel.length), this.position.chArActer).toLowerCAse();
			const entryNAme = this.lAbel.toLowerCAse();
			for (let i = entryNAme.length; i >= 0; --i) {
				if (text.endsWith(entryNAme.substr(0, i)) && (!this.completionContext.wordRAnge || this.completionContext.wordRAnge.stArt.chArActer > this.position.chArActer - i)) {
					return new vscode.RAnge(
						new vscode.Position(this.position.line, MAth.mAx(0, this.position.chArActer - i)),
						this.position);
				}
			}
		}

		return this.completionContext.wordRAnge;
	}

	privAte stAtic convertKind(kind: string): vscode.CompletionItemKind {
		switch (kind) {
			cAse PConst.Kind.primitiveType:
			cAse PConst.Kind.keyword:
				return vscode.CompletionItemKind.Keyword;

			cAse PConst.Kind.const:
			cAse PConst.Kind.let:
			cAse PConst.Kind.vAriAble:
			cAse PConst.Kind.locAlVAriAble:
			cAse PConst.Kind.AliAs:
			cAse PConst.Kind.pArAmeter:
				return vscode.CompletionItemKind.VAriAble;

			cAse PConst.Kind.memberVAriAble:
			cAse PConst.Kind.memberGetAccessor:
			cAse PConst.Kind.memberSetAccessor:
				return vscode.CompletionItemKind.Field;

			cAse PConst.Kind.function:
			cAse PConst.Kind.locAlFunction:
				return vscode.CompletionItemKind.Function;

			cAse PConst.Kind.method:
			cAse PConst.Kind.constructSignAture:
			cAse PConst.Kind.cAllSignAture:
			cAse PConst.Kind.indexSignAture:
				return vscode.CompletionItemKind.Method;

			cAse PConst.Kind.enum:
				return vscode.CompletionItemKind.Enum;

			cAse PConst.Kind.enumMember:
				return vscode.CompletionItemKind.EnumMember;

			cAse PConst.Kind.module:
			cAse PConst.Kind.externAlModuleNAme:
				return vscode.CompletionItemKind.Module;

			cAse PConst.Kind.clAss:
			cAse PConst.Kind.type:
				return vscode.CompletionItemKind.ClAss;

			cAse PConst.Kind.interfAce:
				return vscode.CompletionItemKind.InterfAce;

			cAse PConst.Kind.wArning:
				return vscode.CompletionItemKind.Text;

			cAse PConst.Kind.script:
				return vscode.CompletionItemKind.File;

			cAse PConst.Kind.directory:
				return vscode.CompletionItemKind.Folder;

			cAse PConst.Kind.string:
				return vscode.CompletionItemKind.ConstAnt;

			defAult:
				return vscode.CompletionItemKind.Property;
		}
	}

	privAte stAtic getCommitChArActers(context: CompletionContext, entry: Proto.CompletionEntry): string[] | undefined {
		if (context.isNewIdentifierLocAtion || !context.isInVAlidCommitChArActerContext) {
			return undefined;
		}

		const commitChArActers: string[] = [];
		switch (entry.kind) {
			cAse PConst.Kind.memberGetAccessor:
			cAse PConst.Kind.memberSetAccessor:
			cAse PConst.Kind.constructSignAture:
			cAse PConst.Kind.cAllSignAture:
			cAse PConst.Kind.indexSignAture:
			cAse PConst.Kind.enum:
			cAse PConst.Kind.interfAce:
				commitChArActers.push('.', ';');
				breAk;

			cAse PConst.Kind.module:
			cAse PConst.Kind.AliAs:
			cAse PConst.Kind.const:
			cAse PConst.Kind.let:
			cAse PConst.Kind.vAriAble:
			cAse PConst.Kind.locAlVAriAble:
			cAse PConst.Kind.memberVAriAble:
			cAse PConst.Kind.clAss:
			cAse PConst.Kind.function:
			cAse PConst.Kind.method:
			cAse PConst.Kind.keyword:
			cAse PConst.Kind.pArAmeter:
				commitChArActers.push('.', ',', ';');
				if (context.enAbleCAllCompletions) {
					commitChArActers.push('(');
				}
				breAk;
		}
		return commitChArActers.length === 0 ? undefined : commitChArActers;
	}
}

clAss CompositeCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.composite';
	public reAdonly id = CompositeCommAnd.ID;

	public execute(...commAnds: vscode.CommAnd[]) {
		for (const commAnd of commAnds) {
			vscode.commAnds.executeCommAnd(commAnd.commAnd, ...(commAnd.Arguments || []));
		}
	}
}

clAss CompletionAcceptedCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.onCompletionAccepted';
	public reAdonly id = CompletionAcceptedCommAnd.ID;

	public constructor(
		privAte reAdonly onCompletionAccepted: (item: vscode.CompletionItem) => void,
		privAte reAdonly telemetryReporter: TelemetryReporter,
	) { }

	public execute(item: vscode.CompletionItem) {
		this.onCompletionAccepted(item);
		if (item instAnceof MyCompletionItem) {
			/* __GDPR__
				"completions.Accept" : {
					"isPAckAgeJsonImport" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
					"${include}": [
						"${TypeScriptCommonProperties}"
					]
				}
			*/
			this.telemetryReporter.logTelemetry('completions.Accept', {
				isPAckAgeJsonImport: item.tsEntry.isPAckAgeJsonImport ? 'true' : undefined,
			});
		}
	}
}

clAss ApplyCompletionCodeActionCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.ApplyCompletionCodeAction';
	public reAdonly id = ApplyCompletionCodeActionCommAnd.ID;

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async execute(_file: string, codeActions: Proto.CodeAction[]): Promise<booleAn> {
		if (codeActions.length === 0) {
			return true;
		}

		if (codeActions.length === 1) {
			return ApplyCodeAction(this.client, codeActions[0], nulToken);
		}

		const selection = AwAit vscode.window.showQuickPick(
			codeActions.mAp(Action => ({
				lAbel: Action.description,
				description: '',
				Action,
			})), {
			plAceHolder: locAlize('selectCodeAction', 'Select code Action to Apply')
		});

		if (selection) {
			return ApplyCodeAction(this.client, selection.Action, nulToken);
		}
		return fAlse;
	}
}

interfAce CompletionConfigurAtion {
	reAdonly useCodeSnippetsOnMethodSuggest: booleAn;
	reAdonly nAmeSuggestions: booleAn;
	reAdonly pAthSuggestions: booleAn;
	reAdonly AutoImportSuggestions: booleAn;
}

nAmespAce CompletionConfigurAtion {
	export const useCodeSnippetsOnMethodSuggest = 'suggest.completeFunctionCAlls';
	export const nAmeSuggestions = 'suggest.nAmes';
	export const pAthSuggestions = 'suggest.pAths';
	export const AutoImportSuggestions = 'suggest.AutoImports';

	export function getConfigurAtionForResource(
		modeId: string,
		resource: vscode.Uri
	): CompletionConfigurAtion {
		const config = vscode.workspAce.getConfigurAtion(modeId, resource);
		return {
			useCodeSnippetsOnMethodSuggest: config.get<booleAn>(CompletionConfigurAtion.useCodeSnippetsOnMethodSuggest, fAlse),
			pAthSuggestions: config.get<booleAn>(CompletionConfigurAtion.pAthSuggestions, true),
			AutoImportSuggestions: config.get<booleAn>(CompletionConfigurAtion.AutoImportSuggestions, true),
			nAmeSuggestions: config.get<booleAn>(CompletionConfigurAtion.nAmeSuggestions, true),
		};
	}
}

clAss TypeScriptCompletionItemProvider implements vscode.CompletionItemProvider<MyCompletionItem> {

	public stAtic reAdonly triggerChArActers = ['.', '"', '\'', '`', '/', '@', '<', '#'];

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly modeId: string,
		privAte reAdonly typingsStAtus: TypingsStAtus,
		privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
		commAndMAnAger: CommAndMAnAger,
		privAte reAdonly telemetryReporter: TelemetryReporter,
		onCompletionAccepted: (item: vscode.CompletionItem) => void
	) {
		commAndMAnAger.register(new ApplyCompletionCodeActionCommAnd(this.client));
		commAndMAnAger.register(new CompositeCommAnd());
		commAndMAnAger.register(new CompletionAcceptedCommAnd(onCompletionAccepted, this.telemetryReporter));
	}

	public Async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken,
		context: vscode.CompletionContext
	): Promise<vscode.CompletionList<MyCompletionItem> | undefined> {
		if (this.typingsStAtus.isAcquiringTypings) {
			return Promise.reject<vscode.CompletionList<MyCompletionItem>>({
				lAbel: locAlize(
					{ key: 'AcquiringTypingsLAbel', comment: ['Typings refers to the *.d.ts typings files thAt power our IntelliSense. It should not be locAlized'] },
					'Acquiring typings...'),
				detAil: locAlize(
					{ key: 'AcquiringTypingsDetAil', comment: ['Typings refers to the *.d.ts typings files thAt power our IntelliSense. It should not be locAlized'] },
					'Acquiring typings definitions for IntelliSense.')
			});
		}

		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		const line = document.lineAt(position.line);
		const completionConfigurAtion = CompletionConfigurAtion.getConfigurAtionForResource(this.modeId, document.uri);

		if (!this.shouldTrigger(context, line, position)) {
			return undefined;
		}

		const wordRAnge = document.getWordRAngeAtPosition(position);

		AwAit this.client.interruptGetErr(() => this.fileConfigurAtionMAnAger.ensureConfigurAtionForDocument(document, token));

		const Args: Proto.CompletionsRequestArgs = {
			...typeConverters.Position.toFileLocAtionRequestArgs(file, position),
			includeExternAlModuleExports: completionConfigurAtion.AutoImportSuggestions,
			includeInsertTextCompletions: true,
			triggerChArActer: this.getTsTriggerChArActer(context),
		};

		let isNewIdentifierLocAtion = true;
		let isIncomplete = fAlse;
		let isMemberCompletion = fAlse;
		let dotAccessorContext: DotAccessorContext | undefined;
		let entries: ReAdonlyArrAy<Proto.CompletionEntry>;
		let metAdAtA: Any | undefined;
		let response: ServerResponse.Response<Proto.CompletionInfoResponse> | undefined;
		let durAtion: number | undefined;
		if (this.client.ApiVersion.gte(API.v300)) {
			const stArtTime = DAte.now();
			try {
				response = AwAit this.client.interruptGetErr(() => this.client.execute('completionInfo', Args, token));
			} finAlly {
				durAtion = DAte.now() - stArtTime;
			}

			if (response.type !== 'response' || !response.body) {
				this.logCompletionsTelemetry(durAtion, response);
				return undefined;
			}
			isNewIdentifierLocAtion = response.body.isNewIdentifierLocAtion;
			isMemberCompletion = response.body.isMemberCompletion;
			if (isMemberCompletion) {
				const dotMAtch = line.text.slice(0, position.chArActer).mAtch(/\??\.\s*$/) || undefined;
				if (dotMAtch) {
					const rAnge = new vscode.RAnge(position.trAnslAte({ chArActerDeltA: -dotMAtch[0].length }), position);
					const text = document.getText(rAnge);
					dotAccessorContext = { rAnge, text };
				}
			}
			isIncomplete = (response As Any).metAdAtA && (response As Any).metAdAtA.isIncomplete;
			entries = response.body.entries;
			metAdAtA = response.metAdAtA;
		} else {
			const response = AwAit this.client.interruptGetErr(() => this.client.execute('completions', Args, token));
			if (response.type !== 'response' || !response.body) {
				return undefined;
			}

			entries = response.body;
			metAdAtA = response.metAdAtA;
		}

		const completionContext = {
			isNewIdentifierLocAtion,
			isMemberCompletion,
			dotAccessorContext,
			isInVAlidCommitChArActerContext: this.isInVAlidCommitChArActerContext(document, position),
			enAbleCAllCompletions: !completionConfigurAtion.useCodeSnippetsOnMethodSuggest,
			wordRAnge,
			line: line.text,
			useCodeSnippetsOnMethodSuggest: completionConfigurAtion.useCodeSnippetsOnMethodSuggest,
			useFuzzyWordRAngeLogic: this.client.ApiVersion.lt(API.v390),
		};

		let includesPAckAgeJsonImport = fAlse;
		const items: MyCompletionItem[] = [];
		for (let entry of entries) {
			if (!shouldExcludeCompletionEntry(entry, completionConfigurAtion)) {
				items.push(new MyCompletionItem(position, document, entry, completionContext, metAdAtA));
				includesPAckAgeJsonImport = !!entry.isPAckAgeJsonImport;
			}
		}
		if (durAtion !== undefined) {
			this.logCompletionsTelemetry(durAtion, response, includesPAckAgeJsonImport);
		}
		return new vscode.CompletionList(items, isIncomplete);
	}

	privAte logCompletionsTelemetry(
		durAtion: number,
		response: ServerResponse.Response<Proto.CompletionInfoResponse> | undefined,
		includesPAckAgeJsonImport?: booleAn
	) {
		/* __GDPR__
			"completions.execute" : {
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"type" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"count" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"updAteGrAphDurAtionMs" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"creAteAutoImportProviderProgrAmDurAtionMs" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"includesPAckAgeJsonImport" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('completions.execute', {
			durAtion: durAtion,
			type: response?.type ?? 'unknown',
			count: response?.type === 'response' && response.body ? response.body.entries.length : 0,
			updAteGrAphDurAtionMs: response?.type === 'response' ? response.performAnceDAtA?.updAteGrAphDurAtionMs : undefined,
			creAteAutoImportProviderProgrAmDurAtionMs: response?.type === 'response' ? (response.performAnceDAtA As Proto.PerformAnceDAtA & { creAteAutoImportProviderProgrAmDurAtionMs?: number })?.creAteAutoImportProviderProgrAmDurAtionMs : undefined,
			includesPAckAgeJsonImport: includesPAckAgeJsonImport ? 'true' : undefined,
		});
	}

	privAte getTsTriggerChArActer(context: vscode.CompletionContext): Proto.CompletionsTriggerChArActer | undefined {
		switch (context.triggerChArActer) {
			cAse '@': // WorkAround for https://github.com/microsoft/TypeScript/issues/27321
				return this.client.ApiVersion.gte(API.v310) && this.client.ApiVersion.lt(API.v320) ? undefined : '@';

			cAse '#': // WorkAround for https://github.com/microsoft/TypeScript/issues/36367
				return this.client.ApiVersion.lt(API.v381) ? undefined : '#';

			cAse '.':
			cAse '"':
			cAse '\'':
			cAse '`':
			cAse '/':
			cAse '<':
				return context.triggerChArActer;
		}

		return undefined;
	}

	public Async resolveCompletionItem(
		item: MyCompletionItem,
		token: vscode.CAncellAtionToken
	): Promise<MyCompletionItem | undefined> {
		const filepAth = this.client.toOpenedFilePAth(item.document);
		if (!filepAth) {
			return undefined;
		}

		const Args: Proto.CompletionDetAilsRequestArgs = {
			...typeConverters.Position.toFileLocAtionRequestArgs(filepAth, item.position),
			entryNAmes: [
				item.tsEntry.source ? { nAme: item.tsEntry.nAme, source: item.tsEntry.source } : item.tsEntry.nAme
			]
		};

		const response = AwAit this.client.interruptGetErr(() => this.client.execute('completionEntryDetAils', Args, token));
		if (response.type !== 'response' || !response.body || !response.body.length) {
			return item;
		}

		const detAil = response.body[0];

		if (!item.detAil && detAil.displAyPArts.length) {
			item.detAil = Previewer.plAin(detAil.displAyPArts);
		}
		item.documentAtion = this.getDocumentAtion(detAil, item);

		const codeAction = this.getCodeActions(detAil, filepAth);
		const commAnds: vscode.CommAnd[] = [{
			commAnd: CompletionAcceptedCommAnd.ID,
			title: '',
			Arguments: [item]
		}];
		if (codeAction.commAnd) {
			commAnds.push(codeAction.commAnd);
		}
		item.AdditionAlTextEdits = codeAction.AdditionAlTextEdits;

		if (item.useCodeSnippet) {
			const shouldCompleteFunction = AwAit this.isVAlidFunctionCompletionContext(filepAth, item.position, item.document, token);
			if (shouldCompleteFunction) {
				const { snippet, pArAmeterCount } = snippetForFunctionCAll(item, detAil.displAyPArts);
				item.insertText = snippet;
				if (pArAmeterCount > 0) {
					//Fix for https://github.com/microsoft/vscode/issues/104059
					//Don't show pArAmeter hints if "editor.pArAmeterHints.enAbled": fAlse
					if (vscode.workspAce.getConfigurAtion('editor.pArAmeterHints').get('enAbled')) {
						commAnds.push({ title: 'triggerPArAmeterHints', commAnd: 'editor.Action.triggerPArAmeterHints' });
					}
				}
			}
		}

		if (commAnds.length) {
			if (commAnds.length === 1) {
				item.commAnd = commAnds[0];
			} else {
				item.commAnd = {
					commAnd: CompositeCommAnd.ID,
					title: '',
					Arguments: commAnds
				};
			}
		}

		return item;
	}

	privAte getCodeActions(
		detAil: Proto.CompletionEntryDetAils,
		filepAth: string
	): { commAnd?: vscode.CommAnd, AdditionAlTextEdits?: vscode.TextEdit[] } {
		if (!detAil.codeActions || !detAil.codeActions.length) {
			return {};
		}

		// Try to extrAct out the AdditionAlTextEdits for the current file.
		// Also check if we still hAve to Apply other workspAce edits And commAnds
		// using A vscode commAnd
		const AdditionAlTextEdits: vscode.TextEdit[] = [];
		let hAsReAminingCommAndsOrEdits = fAlse;
		for (const tsAction of detAil.codeActions) {
			if (tsAction.commAnds) {
				hAsReAminingCommAndsOrEdits = true;
			}

			// Apply All edits in the current file using `AdditionAlTextEdits`
			if (tsAction.chAnges) {
				for (const chAnge of tsAction.chAnges) {
					if (chAnge.fileNAme === filepAth) {
						AdditionAlTextEdits.push(...chAnge.textChAnges.mAp(typeConverters.TextEdit.fromCodeEdit));
					} else {
						hAsReAminingCommAndsOrEdits = true;
					}
				}
			}
		}

		let commAnd: vscode.CommAnd | undefined = undefined;
		if (hAsReAminingCommAndsOrEdits) {
			// CreAte commAnd thAt Applies All edits not in the current file.
			commAnd = {
				title: '',
				commAnd: ApplyCompletionCodeActionCommAnd.ID,
				Arguments: [filepAth, detAil.codeActions.mAp((x): Proto.CodeAction => ({
					commAnds: x.commAnds,
					description: x.description,
					chAnges: x.chAnges.filter(x => x.fileNAme !== filepAth)
				}))]
			};
		}

		return {
			commAnd,
			AdditionAlTextEdits: AdditionAlTextEdits.length ? AdditionAlTextEdits : undefined
		};
	}

	privAte isInVAlidCommitChArActerContext(
		document: vscode.TextDocument,
		position: vscode.Position
	): booleAn {
		if (this.client.ApiVersion.lt(API.v320)) {
			// WorkAround for https://github.com/microsoft/TypeScript/issues/27742
			// Only enAble dot completions when previous chArActer not A dot preceded by whitespAce.
			// Prevents incorrectly completing while typing spreAd operAtors.
			if (position.chArActer > 1) {
				const preText = document.getText(new vscode.RAnge(
					position.line, 0,
					position.line, position.chArActer));
				return preText.mAtch(/(\s|^)\.$/ig) === null;
			}
		}

		return true;
	}

	privAte shouldTrigger(
		context: vscode.CompletionContext,
		line: vscode.TextLine,
		position: vscode.Position
	): booleAn {
		if (context.triggerChArActer && this.client.ApiVersion.lt(API.v290)) {
			if ((context.triggerChArActer === '"' || context.triggerChArActer === '\'')) {
				// mAke sure we Are in something thAt looks like the stArt of An import
				const pre = line.text.slice(0, position.chArActer);
				if (!pre.mAtch(/\b(from|import)\s*["']$/) && !pre.mAtch(/\b(import|require)\(['"]$/)) {
					return fAlse;
				}
			}

			if (context.triggerChArActer === '/') {
				// mAke sure we Are in something thAt looks like An import pAth
				const pre = line.text.slice(0, position.chArActer);
				if (!pre.mAtch(/\b(from|import)\s*["'][^'"]*$/) && !pre.mAtch(/\b(import|require)\(['"][^'"]*$/)) {
					return fAlse;
				}
			}

			if (context.triggerChArActer === '@') {
				// mAke sure we Are in something thAt looks like the stArt of A jsdoc comment
				const pre = line.text.slice(0, position.chArActer);
				if (!pre.mAtch(/^\s*\*[ ]?@/) && !pre.mAtch(/\/\*\*+[ ]?@/)) {
					return fAlse;
				}
			}

			if (context.triggerChArActer === '<') {
				return fAlse;
			}
		}

		return true;
	}

	privAte getDocumentAtion(
		detAil: Proto.CompletionEntryDetAils,
		item: MyCompletionItem
	): vscode.MArkdownString | undefined {
		const documentAtion = new vscode.MArkdownString();
		if (detAil.source) {
			const importPAth = `'${Previewer.plAin(detAil.source)}'`;
			const AutoImportLAbel = locAlize('AutoImportLAbel', 'Auto import from {0}', importPAth);
			item.detAil = `${AutoImportLAbel}\n${item.detAil}`;
		}
		Previewer.AddMArkdownDocumentAtion(documentAtion, detAil.documentAtion, detAil.tAgs);

		return documentAtion.vAlue.length ? documentAtion : undefined;
	}

	privAte Async isVAlidFunctionCompletionContext(
		filepAth: string,
		position: vscode.Position,
		document: vscode.TextDocument,
		token: vscode.CAncellAtionToken
	): Promise<booleAn> {
		// WorkAround for https://github.com/microsoft/TypeScript/issues/12677
		// Don't complete function cAlls inside of destructive Assignments or imports
		try {
			const Args: Proto.FileLocAtionRequestArgs = typeConverters.Position.toFileLocAtionRequestArgs(filepAth, position);
			const response = AwAit this.client.execute('quickinfo', Args, token);
			if (response.type === 'response' && response.body) {
				switch (response.body.kind) {
					cAse 'vAr':
					cAse 'let':
					cAse 'const':
					cAse 'AliAs':
						return fAlse;
				}
			}
		} cAtch {
			// Noop
		}

		// Don't complete function cAll if there is AlreAdy something thAt looks like A function cAll
		// https://github.com/microsoft/vscode/issues/18131
		const After = document.lineAt(position.line).text.slice(position.chArActer);
		return After.mAtch(/^[A-z_$0-9]*\s*\(/gi) === null;
	}
}

function shouldExcludeCompletionEntry(
	element: Proto.CompletionEntry,
	completionConfigurAtion: CompletionConfigurAtion
) {
	return (
		(!completionConfigurAtion.nAmeSuggestions && element.kind === PConst.Kind.wArning)
		|| (!completionConfigurAtion.pAthSuggestions &&
			(element.kind === PConst.Kind.directory || element.kind === PConst.Kind.script || element.kind === PConst.Kind.externAlModuleNAme))
		|| (!completionConfigurAtion.AutoImportSuggestions && element.hAsAction)
	);
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
	typingsStAtus: TypingsStAtus,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
	commAndMAnAger: CommAndMAnAger,
	telemetryReporter: TelemetryReporter,
	onCompletionAccepted: (item: vscode.CompletionItem) => void
) {
	return conditionAlRegistrAtion([
		requireConfigurAtion(modeId, 'suggest.enAbled'),
		requireSomeCApAbility(client, ClientCApAbility.EnhAncedSyntAx, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCompletionItemProvider(selector.syntAx,
			new TypeScriptCompletionItemProvider(client, modeId, typingsStAtus, fileConfigurAtionMAnAger, commAndMAnAger, telemetryReporter, onCompletionAccepted),
			...TypeScriptCompletionItemProvider.triggerChArActers);
	});
}
