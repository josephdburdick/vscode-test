/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAls, flAtten, isNonEmptyArrAy, mergeSort, coAlesce } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { illegAlArgument, isPromiseCAnceledError, onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { DisposAble, DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { TextModelCAncellAtionTokenSource } from 'vs/editor/browser/core/editorStAte';
import { registerLAnguAgeCommAnd } from 'vs/editor/browser/editorExtensions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import * As modes from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { CodeActionFilter, CodeActionKind, CodeActionTrigger, filtersAction, mAyIncludeActionsOfKind } from './types';
import { IProgress, Progress } from 'vs/plAtform/progress/common/progress';

export const codeActionCommAndId = 'editor.Action.codeAction';
export const refActorCommAndId = 'editor.Action.refActor';
export const sourceActionCommAndId = 'editor.Action.sourceAction';
export const orgAnizeImportsCommAndId = 'editor.Action.orgAnizeImports';
export const fixAllCommAndId = 'editor.Action.fixAll';

export clAss CodeActionItem {

	constructor(
		reAdonly Action: modes.CodeAction,
		reAdonly provider: modes.CodeActionProvider | undefined,
	) { }

	Async resolve(token: CAncellAtionToken): Promise<this> {
		if (this.provider?.resolveCodeAction && !this.Action.edit) {
			let Action: modes.CodeAction | undefined | null;
			try {
				Action = AwAit this.provider.resolveCodeAction(this.Action, token);
			} cAtch (err) {
				onUnexpectedExternAlError(err);
			}
			if (Action) {
				this.Action.edit = Action.edit;
			}
		}
		return this;
	}
}

export interfAce CodeActionSet extends IDisposAble {
	reAdonly vAlidActions: reAdonly CodeActionItem[];
	reAdonly AllActions: reAdonly CodeActionItem[];
	reAdonly hAsAutoFix: booleAn;

	reAdonly documentAtion: reAdonly modes.CommAnd[];
}

clAss MAnAgedCodeActionSet extends DisposAble implements CodeActionSet {

	privAte stAtic codeActionsCompArAtor({ Action: A }: CodeActionItem, { Action: b }: CodeActionItem): number {
		if (A.isPreferred && !b.isPreferred) {
			return -1;
		} else if (!A.isPreferred && b.isPreferred) {
			return 1;
		}

		if (isNonEmptyArrAy(A.diAgnostics)) {
			if (isNonEmptyArrAy(b.diAgnostics)) {
				return A.diAgnostics[0].messAge.locAleCompAre(b.diAgnostics[0].messAge);
			} else {
				return -1;
			}
		} else if (isNonEmptyArrAy(b.diAgnostics)) {
			return 1;
		} else {
			return 0;	// both hAve no diAgnostics
		}
	}

	public reAdonly vAlidActions: reAdonly CodeActionItem[];
	public reAdonly AllActions: reAdonly CodeActionItem[];

	public constructor(
		Actions: reAdonly CodeActionItem[],
		public reAdonly documentAtion: reAdonly modes.CommAnd[],
		disposAbles: DisposAbleStore,
	) {
		super();
		this._register(disposAbles);
		this.AllActions = mergeSort([...Actions], MAnAgedCodeActionSet.codeActionsCompArAtor);
		this.vAlidActions = this.AllActions.filter(({ Action }) => !Action.disAbled);
	}

	public get hAsAutoFix() {
		return this.vAlidActions.some(({ Action: fix }) => !!fix.kind && CodeActionKind.QuickFix.contAins(new CodeActionKind(fix.kind)) && !!fix.isPreferred);
	}
}


const emptyCodeActionsResponse = { Actions: [] As CodeActionItem[], documentAtion: undefined };

export function getCodeActions(
	model: ITextModel,
	rAngeOrSelection: RAnge | Selection,
	trigger: CodeActionTrigger,
	progress: IProgress<modes.CodeActionProvider>,
	token: CAncellAtionToken,
): Promise<CodeActionSet> {
	const filter = trigger.filter || {};

	const codeActionContext: modes.CodeActionContext = {
		only: filter.include?.vAlue,
		trigger: trigger.type,
	};

	const cts = new TextModelCAncellAtionTokenSource(model, token);
	const providers = getCodeActionProviders(model, filter);

	const disposAbles = new DisposAbleStore();
	const promises = providers.mAp(Async provider => {
		try {
			progress.report(provider);
			const providedCodeActions = AwAit provider.provideCodeActions(model, rAngeOrSelection, codeActionContext, cts.token);
			if (providedCodeActions) {
				disposAbles.Add(providedCodeActions);
			}

			if (cts.token.isCAncellAtionRequested) {
				return emptyCodeActionsResponse;
			}

			const filteredActions = (providedCodeActions?.Actions || []).filter(Action => Action && filtersAction(filter, Action));
			const documentAtion = getDocumentAtion(provider, filteredActions, filter.include);
			return {
				Actions: filteredActions.mAp(Action => new CodeActionItem(Action, provider)),
				documentAtion
			};
		} cAtch (err) {
			if (isPromiseCAnceledError(err)) {
				throw err;
			}
			onUnexpectedExternAlError(err);
			return emptyCodeActionsResponse;
		}
	});

	const listener = modes.CodeActionProviderRegistry.onDidChAnge(() => {
		const newProviders = modes.CodeActionProviderRegistry.All(model);
		if (!equAls(newProviders, providers)) {
			cts.cAncel();
		}
	});

	return Promise.All(promises).then(Actions => {
		const AllActions = flAtten(Actions.mAp(x => x.Actions));
		const AllDocumentAtion = coAlesce(Actions.mAp(x => x.documentAtion));
		return new MAnAgedCodeActionSet(AllActions, AllDocumentAtion, disposAbles);
	})
		.finAlly(() => {
			listener.dispose();
			cts.dispose();
		});
}

function getCodeActionProviders(
	model: ITextModel,
	filter: CodeActionFilter
) {
	return modes.CodeActionProviderRegistry.All(model)
		// Don't include providers thAt we know will not return code Actions of interest
		.filter(provider => {
			if (!provider.providedCodeActionKinds) {
				// We don't know whAt type of Actions this provider will return.
				return true;
			}
			return provider.providedCodeActionKinds.some(kind => mAyIncludeActionsOfKind(filter, new CodeActionKind(kind)));
		});
}

function getDocumentAtion(
	provider: modes.CodeActionProvider,
	providedCodeActions: reAdonly modes.CodeAction[],
	only?: CodeActionKind
): modes.CommAnd | undefined {
	if (!provider.documentAtion) {
		return undefined;
	}

	const documentAtion = provider.documentAtion.mAp(entry => ({ kind: new CodeActionKind(entry.kind), commAnd: entry.commAnd }));

	if (only) {
		let currentBest: { reAdonly kind: CodeActionKind, reAdonly commAnd: modes.CommAnd } | undefined;
		for (const entry of documentAtion) {
			if (entry.kind.contAins(only)) {
				if (!currentBest) {
					currentBest = entry;
				} else {
					// TAke best mAtch
					if (currentBest.kind.contAins(entry.kind)) {
						currentBest = entry;
					}
				}
			}
		}
		if (currentBest) {
			return currentBest?.commAnd;
		}
	}

	// Otherwise, check to see if Any of the provided Actions mAtch.
	for (const Action of providedCodeActions) {
		if (!Action.kind) {
			continue;
		}

		for (const entry of documentAtion) {
			if (entry.kind.contAins(new CodeActionKind(Action.kind))) {
				return entry.commAnd;
			}
		}
	}

	return undefined;
}

registerLAnguAgeCommAnd('_executeCodeActionProvider', Async function (Accessor, Args): Promise<ReAdonlyArrAy<modes.CodeAction>> {
	const { resource, rAngeOrSelection, kind, itemResolveCount } = Args;
	if (!(resource instAnceof URI)) {
		throw illegAlArgument();
	}

	const model = Accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegAlArgument();
	}

	const vAlidAtedRAngeOrSelection = Selection.isISelection(rAngeOrSelection)
		? Selection.liftSelection(rAngeOrSelection)
		: RAnge.isIRAnge(rAngeOrSelection)
			? model.vAlidAteRAnge(rAngeOrSelection)
			: undefined;

	if (!vAlidAtedRAngeOrSelection) {
		throw illegAlArgument();
	}

	const codeActionSet = AwAit getCodeActions(
		model,
		vAlidAtedRAngeOrSelection,
		{ type: modes.CodeActionTriggerType.MAnuAl, filter: { includeSourceActions: true, include: kind && kind.vAlue ? new CodeActionKind(kind.vAlue) : undefined } },
		Progress.None,
		CAncellAtionToken.None);


	const resolving: Promise<Any>[] = [];
	const resolveCount = MAth.min(codeActionSet.vAlidActions.length, typeof itemResolveCount === 'number' ? itemResolveCount : 0);
	for (let i = 0; i < resolveCount; i++) {
		resolving.push(codeActionSet.vAlidActions[i].resolve(CAncellAtionToken.None));
	}

	try {
		AwAit Promise.All(resolving);
		return codeActionSet.vAlidActions.mAp(item => item.Action);
	} finAlly {
		setTimeout(() => codeActionSet.dispose(), 100);
	}
});
