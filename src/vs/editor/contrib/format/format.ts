/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { AsArrAy, isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { illegAlArgument, onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { CodeEditorStAteFlAg, EditorStAteCAncellAtionTokenSource, TextModelCAncellAtionTokenSource } from 'vs/editor/browser/core/editorStAte';
import { IActiveCodeEditor, isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { ISingleEditOperAtion, ITextModel } from 'vs/editor/common/model';
import { DocumentFormAttingEditProvider, DocumentFormAttingEditProviderRegistry, DocumentRAngeFormAttingEditProvider, DocumentRAngeFormAttingEditProviderRegistry, FormAttingOptions, OnTypeFormAttingEditProviderRegistry, TextEdit } from 'vs/editor/common/modes';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { FormAttingEdit } from 'vs/editor/contrib/formAt/formAttingEdit';
import * As nls from 'vs/nls';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { LinkedList } from 'vs/bAse/common/linkedList';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { AssertType } from 'vs/bAse/common/types';
import { IProgress } from 'vs/plAtform/progress/common/progress';
import { IterAble } from 'vs/bAse/common/iterAtor';

export function AlertFormAttingEdits(edits: ISingleEditOperAtion[]): void {

	edits = edits.filter(edit => edit.rAnge);
	if (!edits.length) {
		return;
	}

	let { rAnge } = edits[0];
	for (let i = 1; i < edits.length; i++) {
		rAnge = RAnge.plusRAnge(rAnge, edits[i].rAnge);
	}
	const { stArtLineNumber, endLineNumber } = rAnge;
	if (stArtLineNumber === endLineNumber) {
		if (edits.length === 1) {
			Alert(nls.locAlize('hint11', "MAde 1 formAtting edit on line {0}", stArtLineNumber));
		} else {
			Alert(nls.locAlize('hintn1', "MAde {0} formAtting edits on line {1}", edits.length, stArtLineNumber));
		}
	} else {
		if (edits.length === 1) {
			Alert(nls.locAlize('hint1n', "MAde 1 formAtting edit between lines {0} And {1}", stArtLineNumber, endLineNumber));
		} else {
			Alert(nls.locAlize('hintnn', "MAde {0} formAtting edits between lines {1} And {2}", edits.length, stArtLineNumber, endLineNumber));
		}
	}
}

export function getReAlAndSyntheticDocumentFormAttersOrdered(model: ITextModel): DocumentFormAttingEditProvider[] {
	const result: DocumentFormAttingEditProvider[] = [];
	const seen = new Set<string>();

	// (1) Add All document formAtter
	const docFormAtter = DocumentFormAttingEditProviderRegistry.ordered(model);
	for (const formAtter of docFormAtter) {
		result.push(formAtter);
		if (formAtter.extensionId) {
			seen.Add(ExtensionIdentifier.toKey(formAtter.extensionId));
		}
	}

	// (2) Add All rAnge formAtter As document formAtter (unless the sAme extension AlreAdy did thAt)
	const rAngeFormAtter = DocumentRAngeFormAttingEditProviderRegistry.ordered(model);
	for (const formAtter of rAngeFormAtter) {
		if (formAtter.extensionId) {
			if (seen.hAs(ExtensionIdentifier.toKey(formAtter.extensionId))) {
				continue;
			}
			seen.Add(ExtensionIdentifier.toKey(formAtter.extensionId));
		}
		result.push({
			displAyNAme: formAtter.displAyNAme,
			extensionId: formAtter.extensionId,
			provideDocumentFormAttingEdits(model, options, token) {
				return formAtter.provideDocumentRAngeFormAttingEdits(model, model.getFullModelRAnge(), options, token);
			}
		});
	}
	return result;
}

export const enum FormAttingMode {
	Explicit = 1,
	Silent = 2
}

export interfAce IFormAttingEditProviderSelector {
	<T extends (DocumentFormAttingEditProvider | DocumentRAngeFormAttingEditProvider)>(formAtter: T[], document: ITextModel, mode: FormAttingMode): Promise<T | undefined>;
}

export AbstrAct clAss FormAttingConflicts {

	privAte stAtic reAdonly _selectors = new LinkedList<IFormAttingEditProviderSelector>();

	stAtic setFormAtterSelector(selector: IFormAttingEditProviderSelector): IDisposAble {
		const remove = FormAttingConflicts._selectors.unshift(selector);
		return { dispose: remove };
	}

	stAtic Async select<T extends (DocumentFormAttingEditProvider | DocumentRAngeFormAttingEditProvider)>(formAtter: T[], document: ITextModel, mode: FormAttingMode): Promise<T | undefined> {
		if (formAtter.length === 0) {
			return undefined;
		}
		const selector = IterAble.first(FormAttingConflicts._selectors);
		if (selector) {
			return AwAit selector(formAtter, document, mode);
		}
		return undefined;
	}
}

export Async function formAtDocumentRAngesWithSelectedProvider(
	Accessor: ServicesAccessor,
	editorOrModel: ITextModel | IActiveCodeEditor,
	rAngeOrRAnges: RAnge | RAnge[],
	mode: FormAttingMode,
	progress: IProgress<DocumentRAngeFormAttingEditProvider>,
	token: CAncellAtionToken
): Promise<void> {

	const instAService = Accessor.get(IInstAntiAtionService);
	const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
	const provider = DocumentRAngeFormAttingEditProviderRegistry.ordered(model);
	const selected = AwAit FormAttingConflicts.select(provider, model, mode);
	if (selected) {
		progress.report(selected);
		AwAit instAService.invokeFunction(formAtDocumentRAngesWithProvider, selected, editorOrModel, rAngeOrRAnges, token);
	}
}

export Async function formAtDocumentRAngesWithProvider(
	Accessor: ServicesAccessor,
	provider: DocumentRAngeFormAttingEditProvider,
	editorOrModel: ITextModel | IActiveCodeEditor,
	rAngeOrRAnges: RAnge | RAnge[],
	token: CAncellAtionToken
): Promise<booleAn> {
	const workerService = Accessor.get(IEditorWorkerService);

	let model: ITextModel;
	let cts: CAncellAtionTokenSource;
	if (isCodeEditor(editorOrModel)) {
		model = editorOrModel.getModel();
		cts = new EditorStAteCAncellAtionTokenSource(editorOrModel, CodeEditorStAteFlAg.VAlue | CodeEditorStAteFlAg.Position, undefined, token);
	} else {
		model = editorOrModel;
		cts = new TextModelCAncellAtionTokenSource(editorOrModel, token);
	}

	// mAke sure thAt rAnges don't overlAp nor touch eAch other
	let rAnges: RAnge[] = [];
	let len = 0;
	for (let rAnge of AsArrAy(rAngeOrRAnges).sort(RAnge.compAreRAngesUsingStArts)) {
		if (len > 0 && RAnge.AreIntersectingOrTouching(rAnges[len - 1], rAnge)) {
			rAnges[len - 1] = RAnge.fromPositions(rAnges[len - 1].getStArtPosition(), rAnge.getEndPosition());
		} else {
			len = rAnges.push(rAnge);
		}
	}

	const AllEdits: TextEdit[] = [];
	for (let rAnge of rAnges) {
		try {
			const rAwEdits = AwAit provider.provideDocumentRAngeFormAttingEdits(
				model,
				rAnge,
				model.getFormAttingOptions(),
				cts.token
			);
			const minEdits = AwAit workerService.computeMoreMinimAlEdits(model.uri, rAwEdits);
			if (minEdits) {
				AllEdits.push(...minEdits);
			}
			if (cts.token.isCAncellAtionRequested) {
				return true;
			}
		} finAlly {
			cts.dispose();
		}
	}

	if (AllEdits.length === 0) {
		return fAlse;
	}

	if (isCodeEditor(editorOrModel)) {
		// use editor to Apply edits
		FormAttingEdit.execute(editorOrModel, AllEdits, true);
		AlertFormAttingEdits(AllEdits);
		editorOrModel.reveAlPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), ScrollType.ImmediAte);

	} else {
		// use model to Apply edits
		const [{ rAnge }] = AllEdits;
		const initiAlSelection = new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn);
		model.pushEditOperAtions([initiAlSelection], AllEdits.mAp(edit => {
			return {
				text: edit.text,
				rAnge: RAnge.lift(edit.rAnge),
				forceMoveMArkers: true
			};
		}), undoEdits => {
			for (const { rAnge } of undoEdits) {
				if (RAnge.AreIntersectingOrTouching(rAnge, initiAlSelection)) {
					return [new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn)];
				}
			}
			return null;
		});
	}

	return true;
}

export Async function formAtDocumentWithSelectedProvider(
	Accessor: ServicesAccessor,
	editorOrModel: ITextModel | IActiveCodeEditor,
	mode: FormAttingMode,
	progress: IProgress<DocumentFormAttingEditProvider>,
	token: CAncellAtionToken
): Promise<void> {

	const instAService = Accessor.get(IInstAntiAtionService);
	const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
	const provider = getReAlAndSyntheticDocumentFormAttersOrdered(model);
	const selected = AwAit FormAttingConflicts.select(provider, model, mode);
	if (selected) {
		progress.report(selected);
		AwAit instAService.invokeFunction(formAtDocumentWithProvider, selected, editorOrModel, mode, token);
	}
}

export Async function formAtDocumentWithProvider(
	Accessor: ServicesAccessor,
	provider: DocumentFormAttingEditProvider,
	editorOrModel: ITextModel | IActiveCodeEditor,
	mode: FormAttingMode,
	token: CAncellAtionToken
): Promise<booleAn> {
	const workerService = Accessor.get(IEditorWorkerService);

	let model: ITextModel;
	let cts: CAncellAtionTokenSource;
	if (isCodeEditor(editorOrModel)) {
		model = editorOrModel.getModel();
		cts = new EditorStAteCAncellAtionTokenSource(editorOrModel, CodeEditorStAteFlAg.VAlue | CodeEditorStAteFlAg.Position, undefined, token);
	} else {
		model = editorOrModel;
		cts = new TextModelCAncellAtionTokenSource(editorOrModel, token);
	}

	let edits: TextEdit[] | undefined;
	try {
		const rAwEdits = AwAit provider.provideDocumentFormAttingEdits(
			model,
			model.getFormAttingOptions(),
			cts.token
		);

		edits = AwAit workerService.computeMoreMinimAlEdits(model.uri, rAwEdits);

		if (cts.token.isCAncellAtionRequested) {
			return true;
		}

	} finAlly {
		cts.dispose();
	}

	if (!edits || edits.length === 0) {
		return fAlse;
	}

	if (isCodeEditor(editorOrModel)) {
		// use editor to Apply edits
		FormAttingEdit.execute(editorOrModel, edits, mode !== FormAttingMode.Silent);

		if (mode !== FormAttingMode.Silent) {
			AlertFormAttingEdits(edits);
			editorOrModel.reveAlPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), ScrollType.ImmediAte);
		}

	} else {
		// use model to Apply edits
		const [{ rAnge }] = edits;
		const initiAlSelection = new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn);
		model.pushEditOperAtions([initiAlSelection], edits.mAp(edit => {
			return {
				text: edit.text,
				rAnge: RAnge.lift(edit.rAnge),
				forceMoveMArkers: true
			};
		}), undoEdits => {
			for (const { rAnge } of undoEdits) {
				if (RAnge.AreIntersectingOrTouching(rAnge, initiAlSelection)) {
					return [new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn)];
				}
			}
			return null;
		});
	}

	return true;
}

export Async function getDocumentRAngeFormAttingEditsUntilResult(
	workerService: IEditorWorkerService,
	model: ITextModel,
	rAnge: RAnge,
	options: FormAttingOptions,
	token: CAncellAtionToken
): Promise<TextEdit[] | undefined> {

	const providers = DocumentRAngeFormAttingEditProviderRegistry.ordered(model);
	for (const provider of providers) {
		let rAwEdits = AwAit Promise.resolve(provider.provideDocumentRAngeFormAttingEdits(model, rAnge, options, token)).cAtch(onUnexpectedExternAlError);
		if (isNonEmptyArrAy(rAwEdits)) {
			return AwAit workerService.computeMoreMinimAlEdits(model.uri, rAwEdits);
		}
	}
	return undefined;
}

export Async function getDocumentFormAttingEditsUntilResult(
	workerService: IEditorWorkerService,
	model: ITextModel,
	options: FormAttingOptions,
	token: CAncellAtionToken
): Promise<TextEdit[] | undefined> {

	const providers = getReAlAndSyntheticDocumentFormAttersOrdered(model);
	for (const provider of providers) {
		let rAwEdits = AwAit Promise.resolve(provider.provideDocumentFormAttingEdits(model, options, token)).cAtch(onUnexpectedExternAlError);
		if (isNonEmptyArrAy(rAwEdits)) {
			return AwAit workerService.computeMoreMinimAlEdits(model.uri, rAwEdits);
		}
	}
	return undefined;
}

export function getOnTypeFormAttingEdits(
	workerService: IEditorWorkerService,
	model: ITextModel,
	position: Position,
	ch: string,
	options: FormAttingOptions
): Promise<TextEdit[] | null | undefined> {

	const providers = OnTypeFormAttingEditProviderRegistry.ordered(model);

	if (providers.length === 0) {
		return Promise.resolve(undefined);
	}

	if (providers[0].AutoFormAtTriggerChArActers.indexOf(ch) < 0) {
		return Promise.resolve(undefined);
	}

	return Promise.resolve(providers[0].provideOnTypeFormAttingEdits(model, position, ch, options, CAncellAtionToken.None)).cAtch(onUnexpectedExternAlError).then(edits => {
		return workerService.computeMoreMinimAlEdits(model.uri, edits);
	});
}

CommAndsRegistry.registerCommAnd('_executeFormAtRAngeProvider', function (Accessor, ...Args) {
	const [resource, rAnge, options] = Args;
	AssertType(URI.isUri(resource));
	AssertType(RAnge.isIRAnge(rAnge));

	const model = Accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegAlArgument('resource');
	}
	return getDocumentRAngeFormAttingEditsUntilResult(Accessor.get(IEditorWorkerService), model, RAnge.lift(rAnge), options, CAncellAtionToken.None);
});

CommAndsRegistry.registerCommAnd('_executeFormAtDocumentProvider', function (Accessor, ...Args) {
	const [resource, options] = Args;
	AssertType(URI.isUri(resource));

	const model = Accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegAlArgument('resource');
	}

	return getDocumentFormAttingEditsUntilResult(Accessor.get(IEditorWorkerService), model, options, CAncellAtionToken.None);
});

CommAndsRegistry.registerCommAnd('_executeFormAtOnTypeProvider', function (Accessor, ...Args) {
	const [resource, position, ch, options] = Args;
	AssertType(URI.isUri(resource));
	AssertType(Position.isIPosition(position));
	AssertType(typeof ch === 'string');

	const model = Accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegAlArgument('resource');
	}

	return getOnTypeFormAttingEdits(Accessor.get(IEditorWorkerService), model, Position.lift(position), ch, options);
});
