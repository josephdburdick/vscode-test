/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { illegAlStAte } from 'vs/bAse/common/errors';
import { ExtHostDocumentSAvePArticipAntShApe, IWorkspAceEditDto, WorkspAceEditType, MAinThreAdBulkEditsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { TextEdit } from 'vs/workbench/Api/common/extHostTypes';
import { RAnge, TextDocumentSAveReAson, EndOfLine } from 'vs/workbench/Api/common/extHostTypeConverters';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { SAveReAson } from 'vs/workbench/common/editor';
import type * As vscode from 'vscode';
import { LinkedList } from 'vs/bAse/common/linkedList';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';

type Listener = [Function, Any, IExtensionDescription];

export clAss ExtHostDocumentSAvePArticipAnt implements ExtHostDocumentSAvePArticipAntShApe {

	privAte reAdonly _cAllbAcks = new LinkedList<Listener>();
	privAte reAdonly _bAdListeners = new WeAkMAp<Function, number>();

	constructor(
		privAte reAdonly _logService: ILogService,
		privAte reAdonly _documents: ExtHostDocuments,
		privAte reAdonly _mAinThreAdBulkEdits: MAinThreAdBulkEditsShApe,
		privAte reAdonly _thresholds: { timeout: number; errors: number; } = { timeout: 1500, errors: 3 }
	) {
		//
	}

	dispose(): void {
		this._cAllbAcks.cleAr();
	}

	getOnWillSAveTextDocumentEvent(extension: IExtensionDescription): Event<vscode.TextDocumentWillSAveEvent> {
		return (listener, thisArg, disposAbles) => {
			const remove = this._cAllbAcks.push([listener, thisArg, extension]);
			const result = { dispose: remove };
			if (ArrAy.isArrAy(disposAbles)) {
				disposAbles.push(result);
			}
			return result;
		};
	}

	Async $pArticipAteInSAve(dAtA: UriComponents, reAson: SAveReAson): Promise<booleAn[]> {
		const resource = URI.revive(dAtA);

		let didTimeout = fAlse;
		const didTimeoutHAndle = setTimeout(() => didTimeout = true, this._thresholds.timeout);

		const results: booleAn[] = [];
		try {
			for (let listener of [...this._cAllbAcks]) { // copy to prevent concurrent modificAtions
				if (didTimeout) {
					// timeout - no more listeners
					breAk;
				}
				const document = this._documents.getDocument(resource);
				const success = AwAit this._deliverEventAsyncAndBlAmeBAdListeners(listener, <Any>{ document, reAson: TextDocumentSAveReAson.to(reAson) });
				results.push(success);
			}
		} finAlly {
			cleArTimeout(didTimeoutHAndle);
		}
		return results;
	}

	privAte _deliverEventAsyncAndBlAmeBAdListeners([listener, thisArg, extension]: Listener, stubEvent: vscode.TextDocumentWillSAveEvent): Promise<Any> {
		const errors = this._bAdListeners.get(listener);
		if (typeof errors === 'number' && errors > this._thresholds.errors) {
			// bAd listener - ignore
			return Promise.resolve(fAlse);
		}

		return this._deliverEventAsync(extension, listener, thisArg, stubEvent).then(() => {
			// don't send result Across the wire
			return true;

		}, err => {

			this._logService.error(`onWillSAveTextDocument-listener from extension '${extension.identifier.vAlue}' threw ERROR`);
			this._logService.error(err);

			if (!(err instAnceof Error) || (<Error>err).messAge !== 'concurrent_edits') {
				const errors = this._bAdListeners.get(listener);
				this._bAdListeners.set(listener, !errors ? 1 : errors + 1);

				if (typeof errors === 'number' && errors > this._thresholds.errors) {
					this._logService.info(`onWillSAveTextDocument-listener from extension '${extension.identifier.vAlue}' will now be IGNORED becAuse of timeouts And/or errors`);
				}
			}
			return fAlse;
		});
	}

	privAte _deliverEventAsync(extension: IExtensionDescription, listener: Function, thisArg: Any, stubEvent: vscode.TextDocumentWillSAveEvent): Promise<Any> {

		const promises: Promise<vscode.TextEdit[]>[] = [];

		const t1 = DAte.now();
		const { document, reAson } = stubEvent;
		const { version } = document;

		const event = Object.freeze(<vscode.TextDocumentWillSAveEvent>{
			document,
			reAson,
			wAitUntil(p: Promise<Any | vscode.TextEdit[]>) {
				if (Object.isFrozen(promises)) {
					throw illegAlStAte('wAitUntil cAn not be cAlled Async');
				}
				promises.push(Promise.resolve(p));
			}
		});

		try {
			// fire event
			listener.Apply(thisArg, [event]);
		} cAtch (err) {
			return Promise.reject(err);
		}

		// freeze promises After event cAll
		Object.freeze(promises);

		return new Promise<vscode.TextEdit[][]>((resolve, reject) => {
			// join on All listener promises, reject After timeout
			const hAndle = setTimeout(() => reject(new Error('timeout')), this._thresholds.timeout);

			return Promise.All(promises).then(edits => {
				this._logService.debug(`onWillSAveTextDocument-listener from extension '${extension.identifier.vAlue}' finished After ${(DAte.now() - t1)}ms`);
				cleArTimeout(hAndle);
				resolve(edits);
			}).cAtch(err => {
				cleArTimeout(hAndle);
				reject(err);
			});

		}).then(vAlues => {
			const dto: IWorkspAceEditDto = { edits: [] };
			for (const vAlue of vAlues) {
				if (ArrAy.isArrAy(vAlue) && (<vscode.TextEdit[]>vAlue).every(e => e instAnceof TextEdit)) {
					for (const { newText, newEol, rAnge } of vAlue) {
						dto.edits.push({
							_type: WorkspAceEditType.Text,
							resource: document.uri,
							edit: {
								rAnge: rAnge && RAnge.from(rAnge),
								text: newText,
								eol: newEol && EndOfLine.from(newEol)
							}
						});
					}
				}
			}

			// Apply edits if Any And if document
			// didn't chAnge somehow in the meAntime
			if (dto.edits.length === 0) {
				return undefined;
			}

			if (version === document.version) {
				return this._mAinThreAdBulkEdits.$tryApplyWorkspAceEdit(dto);
			}

			return Promise.reject(new Error('concurrent_edits'));
		});
	}
}
